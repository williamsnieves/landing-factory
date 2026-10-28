// Background jobs: one folder per job in <root>/.cache/jobs/<id>/ with job.json (written by the server),
// exit.json (written by run-job.mjs when the command ends) and log.txt (stdout and stderr together).
// A job runs detached in its own process group through run-job.mjs, so it outlives the server; its state is
// derived from the files and the process on every read.
import { spawn } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FEEDBACK_PLACEHOLDER, JOB_KINDS, buildCommand } from './commands.mjs';
import { CODE_ROOT, ToolError, inside, jobsDir, siteDir } from './paths.mjs';
import { redact } from './redact.mjs';

const RUN_JOB = resolve(dirname(fileURLToPath(import.meta.url)), 'run-job.mjs');
export const JOB_ID =
  /^\d{8}-\d{6}-[a-z]+-[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{4}$/;
export const MAX_TAIL_LINES = 200;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const TAIL_BYTES = 256 * 1024;

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

function writeJson(path, data) {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

/** Is the wrapper process of a job still running? */
function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
  } catch (error) {
    if (error.code !== 'EPERM') return false;
  }
  // Guard against a reused pid where /proc is available.
  try {
    const cmdline = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
    if (!cmdline.includes('run-job.mjs')) return false;
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    if (/\) Z /.test(stat)) return false; // zombie
  } catch {
    // no /proc: trust kill(0)
  }
  return true;
}

/** Parse `MCP_MAX_JOBS`: "2" (both classes) or "generation=1,check=2". */
export function parseLimits(value) {
  const limits = { generation: 1, check: 2 };
  if (!value) return limits;
  for (const part of String(value).split(',')) {
    const [name, count] = part.includes('=') ? part.split('=') : ['all', part];
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1) continue;
    if (name === 'all') {
      limits.generation = n;
      limits.check = n;
    } else if (name in limits) limits[name] = n;
  }
  return limits;
}

/** `Result:` line and phase table of a generation's RUN.md. */
export function readRunLog(root, slug) {
  let text;
  try {
    text = readFileSync(join(siteDir(root, slug), 'RUN.md'), 'utf8');
  } catch {
    return { result: null, phase: null, totals: null };
  }
  const result = /^Result: *(.*)$/m.exec(text)?.[1].trim() || null;
  let phase = null;
  const rows = [...text.matchAll(/^\|\s*([a-z-]+)\s*\|\s*([a-z-]+)\s*\|/gm)]
    .map((m) => [m[1], m[2]])
    .filter(([name]) => name !== 'phase' && !/^-+$/.test(name));
  const phases = rows.filter(([, status]) =>
    ['pending', 'done', 'running', 'in-progress', 'skipped', 'failed'].includes(
      status,
    ),
  );
  if (phases.length) {
    const active = phases.find(([, status]) =>
      ['running', 'in-progress', 'failed'].includes(status),
    );
    const next = phases.find(([, status]) => status === 'pending');
    phase =
      (active ?? next ?? [null])[0] ??
      (phases.every(([, s]) => s === 'done' || s === 'skipped')
        ? 'done'
        : null);
  }
  const totals =
    /^## Totals\s*\n([\s\S]*?)(?=\n## |\s*$)/m.exec(text)?.[1].trim() || null;
  return { result: result === 'pending' ? null : result, phase, totals };
}

/** The `Result:` line of a revision round's REVISION.md (null while there is none). */
export function readRevisionResult(root, slug) {
  try {
    const text = readFileSync(join(siteDir(root, slug), 'REVISION.md'), 'utf8');
    return /^Result: *(.*)$/m.exec(text)?.[1].trim() || null;
  } catch {
    return null;
  }
}

/** What a generation-class job reports: RUN.md for a build, REVISION.md for a revision round. */
const generationLog = (root, job) =>
  job.kind === 'revise'
    ? { result: readRevisionResult(root, job.slug), phase: null }
    : readRunLog(root, job.slug);

function qaVerdict(root, slug, kind, startedAt) {
  const path =
    kind === 'qa'
      ? join(root, 'qa', slug, 'latest', 'report.json')
      : join(root, 'qa', slug, 'report', 'latest', 'report.json');
  try {
    const report = JSON.parse(readFileSync(path, 'utf8'));
    const finished = Date.parse(report.finishedAt ?? '');
    if (Number.isFinite(finished) && finished >= Date.parse(startedAt) - 1000)
      return report.verdict ?? null;
  } catch {
    // no report yet
  }
  return null;
}

function lastLine(logPath, prefix) {
  try {
    const lines = readFileSync(logPath, 'utf8')
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean);
    const wanted = prefix ? lines.filter((l) => l.startsWith(prefix)) : lines;
    const line = wanted.at(-1);
    return line ? redact(line.slice(0, 160)) : null;
  } catch {
    return null;
  }
}

/**
 * `root`: where sites/, patterns/ and .cache/ live. `codeRoot`: the checkout whose scripts run.
 * `stub`: tests only (see server.mjs) - a node script run in place of every command, receiving `kind` and the real argv.
 */
export function createJobs({
  root,
  codeRoot = CODE_ROOT,
  env = process.env,
  stub = null,
  limits = parseLimits(env.MCP_MAX_JOBS),
  graceMs = 10_000,
  now = () => new Date(),
} = {}) {
  const base = jobsDir(root);

  const jobDir = (id) => {
    if (typeof id !== 'string' || !JOB_ID.test(id))
      throw new ToolError(`invalid job id ${JSON.stringify(id)}`);
    return inside(base, id);
  };

  /** Derive the current view of a job from its files and process. Settles finished jobs in job.json. */
  function view(id) {
    const dir = jobDir(id);
    const job = readJson(join(dir, 'job.json'));
    if (!job) return null;
    if (job.settled) return withExtras(job);
    const exit = readJson(join(dir, 'exit.json'));
    let state;
    if (exit) {
      state = job.cancelledAt
        ? 'cancelled'
        : exit.exitCode === 0
          ? 'passed'
          : 'failed';
    } else if (isAlive(job.pid)) {
      state = 'running';
    } else {
      // A cancel kills the wrapper before it can record anything.
      state = job.cancelledAt ? 'cancelled' : 'lost';
    }
    const merged = { ...job, state };
    if (state !== 'running') {
      merged.exitCode = exit?.exitCode ?? null;
      merged.signal = exit?.signal ?? null;
      merged.finishedAt =
        exit?.finishedAt ?? job.cancelledAt ?? now().toISOString();
      merged.durationMs =
        exit?.durationMs ??
        Date.parse(merged.finishedAt) - Date.parse(job.startedAt);
      const outcome = outcomeOf(merged);
      merged.result = outcome.result;
      merged.phase = outcome.phase;
      merged.usage = outcome.usage;
      merged.settled = true;
      writeJson(join(dir, 'job.json'), merged);
    }
    return withExtras(merged);
  }

  function outcomeOf(job) {
    const spec = JOB_KINDS[job.kind];
    if (spec.class === 'generation') {
      const run = generationLog(root, job);
      const usagePath = join(siteDir(root, job.slug), '.run-usage.json');
      let usage = { reported: false };
      try {
        if (statSync(usagePath).mtimeMs >= Date.parse(job.startedAt) - 1000)
          usage = readJson(usagePath) ?? usage;
      } catch {
        // no usage file: not reported
      }
      return { result: run.result, phase: run.phase, usage };
    }
    return {
      result: qaVerdict(root, job.slug, job.kind, job.startedAt),
      phase: null,
      usage: null,
    };
  }

  function withExtras(job) {
    if (job.state === 'running') {
      const dir = jobDir(job.id);
      const spec = JOB_KINDS[job.kind];
      const out = { ...job, elapsedMs: Date.now() - Date.parse(job.startedAt) };
      if (spec.class === 'generation') {
        const run = generationLog(root, job);
        out.phase = run.phase;
        out.result = run.result;
      } else {
        out.phase = lastLine(
          join(dir, 'log.txt'),
          job.kind === 'qa' ? '[qa]' : null,
        );
      }
      return out;
    }
    return { ...job, elapsedMs: job.durationMs };
  }

  const publicView = (job) => {
    if (!job) return null;
    const { cwd, pgid, settled, ...rest } = job;
    void cwd;
    void pgid;
    void settled;
    return rest;
  };

  function allIds() {
    if (!existsSync(base)) return [];
    return readdirSync(base)
      .filter((name) => JOB_ID.test(name))
      .sort()
      .reverse();
  }

  function list({ state, slug } = {}) {
    return allIds()
      .map((id) => view(id))
      .filter(Boolean)
      .filter(
        (job) =>
          (!state || job.state === state) && (!slug || job.slug === slug),
      )
      .map(publicView);
  }

  function get(id) {
    const job = view(id);
    if (!job) throw new ToolError(`no job ${id}`);
    return publicView(job);
  }

  function checkLimits(spec, kind, slug) {
    const running = list({ state: 'running' });
    if (spec.class === 'generation') {
      const same = running.find(
        (j) => JOB_KINDS[j.kind].class === 'generation' && j.slug === slug,
      );
      if (same)
        throw new ToolError(
          `a generation for ${slug} is already running: job ${same.id} (state ${same.state}); cancel it or wait`,
        );
    } else {
      const same = running.find((j) => j.kind === kind && j.slug === slug);
      if (same)
        throw new ToolError(
          `a ${kind} job for ${slug} is already running: job ${same.id}`,
        );
    }
    const inClass = running.filter(
      (j) => JOB_KINDS[j.kind].class === spec.class,
    );
    if (inClass.length >= limits[spec.class])
      throw new ToolError(
        `${inClass.length} ${spec.class} job(s) already running (limit ${limits[spec.class]}, MCP_MAX_JOBS): ${inClass.map((j) => j.id).join(', ')}`,
      );
  }

  /** Start a job from tool input. Returns at once with the job record. */
  function start(kind, input) {
    const built = buildCommand(kind, input, root);
    const { slug } = built;
    let { argv } = built;
    const spec = JOB_KINDS[kind];
    checkLimits(spec, kind, slug);
    const startedAt = now();
    const stamp = startedAt
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '-')
      .slice(0, 15);
    const id = `${stamp}-${kind}-${slug}-${Math.random().toString(16).slice(2, 6).padEnd(4, '0')}`;
    const dir = jobDir(id);
    mkdirSync(dir, { recursive: true });
    if (built.feedback !== undefined) {
      // The customer's text goes to the job folder as given; the script reads it from there.
      const feedbackPath = join(dir, 'feedback.txt');
      writeFileSync(feedbackPath, built.feedback);
      argv = argv.map((a) => (a === FEEDBACK_PLACEHOLDER ? feedbackPath : a));
    }
    const logPath = join(dir, 'log.txt');
    const command = stub ? [process.execPath, stub, kind, ...argv] : argv;
    const logFd = openSync(logPath, 'a');
    let child;
    try {
      child = spawn(
        process.execPath,
        [RUN_JOB, dir, String(graceMs), '--', ...command],
        {
          cwd: codeRoot,
          detached: true,
          stdio: ['ignore', logFd, logFd],
          env: root === codeRoot ? env : { ...env, LANDING_FACTORY_ROOT: root },
        },
      );
    } finally {
      closeSync(logFd);
    }
    child.on('error', () => {});
    child.unref();
    const record = {
      id,
      kind,
      slug,
      argv,
      cwd: codeRoot,
      pid: child.pid,
      pgid: child.pid,
      startedAt: startedAt.toISOString(),
      finishedAt: null,
      state: 'running',
      exitCode: null,
      result: null,
      phase: null,
      durationMs: null,
      usage: null,
    };
    writeJson(join(dir, 'job.json'), record);
    return publicView(withExtras(record));
  }

  /** The last `lines` lines of the log, with credentials masked. */
  function tail(id, lines = 50) {
    const dir = jobDir(id);
    const job = view(id);
    if (!job) throw new ToolError(`no job ${id}`);
    const count = Math.min(
      Math.max(Number.isInteger(lines) ? lines : 50, 1),
      MAX_TAIL_LINES,
    );
    const path = join(dir, 'log.txt');
    let text = '';
    if (existsSync(path)) {
      const size = statSync(path).size;
      const length = Math.min(size, TAIL_BYTES);
      const buffer = Buffer.alloc(length);
      const fd = openSync(path, 'r');
      try {
        readSync(fd, buffer, 0, length, size - length);
      } finally {
        closeSync(fd);
      }
      text = buffer.toString('utf8');
    }
    const all = text.split('\n');
    if (all.at(-1) === '') all.pop();
    const picked = all.slice(-count).map((line) => redact(line, env));
    return {
      id,
      state: job.state,
      lines: picked,
      truncated: all.length > picked.length,
    };
  }

  /** SIGTERM to the process group; the wrapper escalates to SIGKILL after the grace period. */
  function cancel(id) {
    const dir = jobDir(id);
    const job = view(id);
    if (!job) throw new ToolError(`no job ${id}`);
    if (job.state !== 'running')
      throw new ToolError(`job ${id} is not running (state ${job.state})`);
    const stored = readJson(join(dir, 'job.json'));
    writeJson(join(dir, 'job.json'), {
      ...stored,
      cancelledAt: now().toISOString(),
    });
    try {
      process.kill(-job.pgid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH')
        throw new ToolError(`could not signal job ${id}: ${error.message}`);
    }
    return { id, cancelRequested: true, graceMs };
  }

  /** Remove finished jobs older than 30 days. Returns the removed ids. */
  function prune(at = now()) {
    const removed = [];
    for (const id of allIds()) {
      const job = view(id);
      if (!job) {
        // No readable job.json: remove the folder once it is old.
        if (at.getTime() - statSync(jobDir(id)).mtimeMs > RETENTION_MS) {
          rmSync(jobDir(id), { recursive: true, force: true });
          removed.push(id);
        }
        continue;
      }
      if (job.state === 'running') continue;
      const finished = Date.parse(job.finishedAt ?? job.startedAt);
      if (at.getTime() - finished > RETENTION_MS) {
        rmSync(jobDir(id), { recursive: true, force: true });
        removed.push(id);
      }
    }
    return removed;
  }

  return { start, get, list, tail, cancel, prune, limits };
}
