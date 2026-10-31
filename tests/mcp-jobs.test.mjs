// Background jobs: folder, detached process group, state machine, limits, cancel, survival of a server restart,
// lost jobs, masked log tails, pruning, time and usage. A stub (tests/mcp-job-stub.mjs) stands in for every command.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { createJobs } from '../scripts/mcp/jobs.mjs';
import {
  McpClient,
  ROOT,
  STUB,
  fakeGithubToken,
  isAlive,
  makeFixtureRoot,
  waitFor,
} from './mcp-helpers.mjs';

const fixture = makeFixtureRoot();
const scratch = mkdtempSync(join(tmpdir(), 'mcp-jobs-'));
const controlFile = join(scratch, 'control.json');
const control = (data) => writeFileSync(controlFile, JSON.stringify(data));
const startedJobs = [];
const clients = [];

const secretValue = ['s3', 'cr3t', 'Value', '99'].join('-'); // an environment value that must never appear
const env = {
  ...process.env,
  STUB_CONTROL: controlFile,
  FAKE_SERVICE_TOKEN: secretValue,
};
const makeJobs = (extra = {}) => {
  const jobs = createJobs({
    root: fixture.root,
    codeRoot: ROOT,
    env,
    stub: STUB,
    graceMs: 300,
    ...extra,
  });
  const start = jobs.start;
  jobs.start = (kind, input) => {
    const job = start(kind, input);
    startedJobs.push(job);
    return job;
  };
  return jobs;
};
const settled = (
  jobs,
  id,
  states = ['passed', 'failed', 'cancelled', 'lost'],
) =>
  waitFor(
    () => {
      const job = jobs.get(id);
      return states.includes(job.state) ? job : null;
    },
    { what: `job ${id} to finish` },
  );

after(async () => {
  await Promise.all(clients.map((c) => c.close()));
  // Stop anything a failing test left running.
  const jobs = makeJobs({ limits: { generation: 9, check: 9 } });
  for (const job of jobs.list({ state: 'running' })) {
    try {
      process.kill(-job.pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }
  for (const file of ['child.pid', 'child2.pid']) {
    try {
      process.kill(
        Number(readFileSync(join(scratch, file), 'utf8')),
        'SIGKILL',
      );
    } catch {
      // already gone
    }
  }
  fixture.cleanup();
  rmSync(scratch, { recursive: true, force: true });
});

test('start returns at once; the job folder holds job.json and log.txt; running becomes passed', async () => {
  control({ sleepMs: 600, lines: ['hello from the stub'] });
  const jobs = makeJobs();
  const t0 = Date.now();
  const job = jobs.start('qa', { slug: 'alpha', skip: ['lighthouse'] });
  assert.ok(Date.now() - t0 < 400, 'start must not wait for the command');
  assert.match(job.id, /^\d{8}-\d{6}-qa-alpha-[0-9a-f]{4}$/);
  assert.equal(job.state, 'running');
  assert.equal(job.kind, 'qa');
  assert.deepEqual(job.argv, [
    'node',
    'scripts/qa.mjs',
    '--site',
    'alpha',
    '--skip',
    'lighthouse',
  ]);
  const dir = join(fixture.root, '.cache/jobs', job.id);
  assert.ok(existsSync(join(dir, 'job.json')));
  assert.ok(existsSync(join(dir, 'log.txt')));
  assert.equal(jobs.get(job.id).state, 'running');
  assert.equal(jobs.list({ state: 'running' }).length, 1);

  const done = await settled(jobs, job.id);
  assert.equal(done.state, 'passed');
  assert.equal(done.exitCode, 0);
  assert.ok(done.durationMs >= 500, `duration ${done.durationMs}`);
  assert.ok(Date.parse(done.finishedAt) >= Date.parse(done.startedAt));
  const log = readFileSync(join(dir, 'log.txt'), 'utf8');
  assert.match(log, /hello from the stub/);
  assert.match(log, /stub qa done/);
  // The record is settled on disk and no longer needs the process.
  assert.equal(
    JSON.parse(readFileSync(join(dir, 'job.json'), 'utf8')).state,
    'passed',
  );
  assert.equal(jobs.list({ state: 'running' }).length, 0);
});

test('a non-zero exit code is failed', async () => {
  control({ exit: 3 });
  const jobs = makeJobs();
  const done = await settled(jobs, jobs.start('report', { slug: 'beta' }).id);
  assert.equal(done.state, 'failed');
  assert.equal(done.exitCode, 3);
});

test('a second generation for the same landing is refused and names the running job', async () => {
  control({ sleepMs: 5000 });
  const jobs = makeJobs();
  const first = jobs.start('propose', { slug: 'newsite', niche: 'x' });
  assert.throws(
    () => jobs.start('generate', { slug: 'newsite', niche: 'x' }),
    (error) =>
      error.message.includes(first.id) && /already running/.test(error.message),
  );
  // Another landing is held back by the global limit (one generation at a time by default) ...
  assert.throws(
    () => jobs.start('propose', { slug: 'other', niche: 'x' }),
    (error) =>
      /limit 1/.test(error.message) && error.message.includes(first.id),
  );
  // ... and allowed when the limit is raised.
  const more = makeJobs({ limits: { generation: 2, check: 2 } });
  const second = more.start('propose', { slug: 'other', niche: 'x' });
  assert.equal(second.state, 'running');
  jobs.cancel(first.id);
  more.cancel(second.id);
  await settled(jobs, first.id);
  await settled(jobs, second.id);
  // Once it stopped, a new generation for the same landing is accepted.
  control({ sleepMs: 0 });
  await settled(
    jobs,
    jobs.start('propose', { slug: 'newsite', niche: 'x' }).id,
  );
});

test('QA and report jobs have their own limit (two by default) and one per kind and landing', async () => {
  control({ sleepMs: 5000 });
  const jobs = makeJobs();
  const a = jobs.start('qa', { slug: 'alpha' });
  assert.throws(() => jobs.start('qa', { slug: 'alpha' }), /already running/);
  const b = jobs.start('report', { slug: 'alpha' });
  assert.throws(() => jobs.start('qa', { slug: 'beta' }), /limit 2/);
  for (const job of [a, b]) jobs.cancel(job.id);
  await Promise.all([settled(jobs, a.id), settled(jobs, b.id)]);
});

test('MCP_MAX_JOBS sets the limits', async () => {
  const { parseLimits } = await import('../scripts/mcp/jobs.mjs');
  assert.deepEqual(parseLimits(undefined), { generation: 1, check: 2 });
  assert.deepEqual(parseLimits('3'), { generation: 3, check: 3 });
  assert.deepEqual(parseLimits('generation=2,check=4'), {
    generation: 2,
    check: 4,
  });
  assert.deepEqual(parseLimits('generation=0,check=x'), {
    generation: 1,
    check: 2,
  });
});

test('cancel stops the whole process group and the state becomes cancelled', async () => {
  const pidFile = join(scratch, 'child.pid');
  rmSync(pidFile, { force: true });
  control({ sleepMs: 60_000, child: { pidFile } });
  const jobs = makeJobs();
  const job = jobs.start('qa', { slug: 'alpha' });
  const childPid = Number(
    await waitFor(() => existsSync(pidFile) && readFileSync(pidFile, 'utf8'), {
      what: 'the stub child',
    }),
  );
  assert.ok(isAlive(childPid) && isAlive(job.pid));
  const t0 = Date.now();
  assert.equal(jobs.cancel(job.id).cancelRequested, true);
  const done = await settled(jobs, job.id);
  assert.equal(done.state, 'cancelled');
  assert.ok(typeof done.cancelledAt === 'string');
  await waitFor(() => !isAlive(childPid), { what: 'the grandchild to stop' });
  await waitFor(() => !isAlive(job.pid), {
    what: 'the job process to be gone',
  });
  assert.ok(Date.now() - t0 < 5000);
  assert.throws(() => jobs.cancel(job.id), /not running \(state cancelled\)/);
});

test('a command that ignores SIGTERM is killed after the grace period', async () => {
  control({ sleepMs: 60_000, ignoreTerm: true });
  const jobs = makeJobs({ graceMs: 400 });
  const job = jobs.start('report', { slug: 'beta' });
  await waitFor(
    () =>
      /stub report started/.test(
        readFileSync(
          join(fixture.root, '.cache/jobs', job.id, 'log.txt'),
          'utf8',
        ),
      ),
    { what: 'the stub to start' },
  );
  const t0 = Date.now();
  jobs.cancel(job.id);
  const done = await settled(jobs, job.id);
  assert.equal(done.state, 'cancelled');
  assert.ok(Date.now() - t0 >= 300, 'the grace period was honored');
  await waitFor(() => !isAlive(job.pid), {
    what: 'the job process to be gone',
  });
});

test('a job keeps running after the server is killed, finishes, and a new server reads its final state', async () => {
  control({ sleepMs: 1200, lines: ['still going'] });
  const serverEnv = {
    LANDING_FACTORY_ROOT: fixture.root,
    MCP_TEST_JOB_STUB: STUB,
    MCP_TEST_CANCEL_GRACE_MS: '300',
    STUB_CONTROL: controlFile,
    MCP_MAX_JOBS: '9',
  };
  const first = new McpClient(serverEnv);
  clients.push(first);
  await first.initialize();
  const started = await first.call('run_qa', { slug: 'beta' });
  assert.equal(started.isError, undefined, started.content?.[0]?.text);
  const { id, pid } = started.structuredContent;
  assert.equal(started.structuredContent.state, 'running');
  first.child.kill('SIGKILL');
  await first.exited;
  assert.ok(isAlive(pid), 'the job outlives its server');

  const second = new McpClient(serverEnv);
  clients.push(second);
  await second.initialize();
  const running = (await second.call('get_job', { id })).structuredContent;
  assert.equal(running.state, 'running');
  const done = await waitFor(
    async () => {
      const job = (await second.call('get_job', { id })).structuredContent;
      return job.state === 'passed' ? job : null;
    },
    { what: 'the job to finish under the new server' },
  );
  assert.equal(done.exitCode, 0);
  const tail = (await second.call('tail_job_log', { id, lines: 5 }))
    .structuredContent;
  assert.ok(tail.lines.some((l) => /stub qa done/.test(l)));
  const listed = (await second.call('list_jobs', { state: 'passed' }))
    .structuredContent.jobs;
  assert.ok(listed.some((j) => j.id === id));
});

test('a job whose process is gone with no exit recorded is lost', async () => {
  const gone = spawn(process.execPath, ['-e', '0']);
  await new Promise((done) => gone.on('exit', done));
  const id = '20260101-000000-qa-alpha-abcd';
  const dir = join(fixture.root, '.cache/jobs', id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'log.txt'), 'partial output\n');
  writeFileSync(
    join(dir, 'job.json'),
    JSON.stringify({
      id,
      kind: 'qa',
      slug: 'alpha',
      argv: ['node', 'scripts/qa.mjs', '--site', 'alpha'],
      cwd: ROOT,
      pid: gone.pid,
      pgid: gone.pid,
      startedAt: new Date().toISOString(),
      state: 'running',
    }),
  );
  const jobs = makeJobs();
  const job = jobs.get(id);
  assert.equal(job.state, 'lost');
  assert.equal(job.exitCode, null);
  assert.deepEqual(jobs.tail(id).lines, ['partial output']);
  assert.throws(() => jobs.cancel(id), /not running \(state lost\)/);
});

test('tail returns at most 200 lines and masks credentials and environment values', async () => {
  const token = fakeGithubToken();
  const lines = [
    `Authorization: ${token}`,
    `using FAKE_SERVICE_TOKEN=${secretValue} for the request`,
    `plain ${secretValue} in text`,
    'password = "hunter2hunter2"',
    ...Array.from({ length: 300 }, (_, i) => `filler ${i}`),
    `last line carries ${token}`,
  ];
  control({ lines });
  const jobs = makeJobs();
  const job = jobs.start('report', { slug: 'beta' });
  await settled(jobs, job.id);
  const full = jobs.tail(job.id, 500);
  assert.equal(full.lines.length, 200);
  assert.equal(full.truncated, true);
  assert.ok(
    full.lines.at(-2).endsWith('stub report done') ||
      full.lines.at(-1).endsWith('stub report done'),
  );
  const all = jobs.tail(job.id, 200).lines.join('\n');
  assert.ok(!all.includes(token));
  assert.match(all, /last line carries ghp_\.\.\. \(40 chars\)/);
  const raw = readFileSync(
    join(fixture.root, '.cache/jobs', job.id, 'log.txt'),
    'utf8',
  );
  assert.ok(raw.includes(token), 'the raw log is untouched');
  assert.equal(jobs.tail(job.id, 0).lines.length, 1); // clamps to at least one line
});

test('early log lines are masked too (short log)', async () => {
  const token = fakeGithubToken();
  control({
    lines: [
      `Authorization: ${token}`,
      `FAKE_SERVICE_TOKEN=${secretValue}`,
      `again ${secretValue}`,
      'password = "hunter2hunter2"',
    ],
  });
  const jobs = makeJobs();
  const job = jobs.start('report', { slug: 'beta' });
  await settled(jobs, job.id);
  const text = jobs.tail(job.id, 50).lines.join('\n');
  assert.ok(!text.includes(token));
  assert.ok(!text.includes(secretValue));
  assert.ok(!text.includes('hunter2hunter2'));
  assert.match(text, /ghp_\.\.\. \(40 chars\)/);
  assert.match(text, /s3-c\.\.\. \(\d+ chars\)/);
  // The tool layer masks as well: a structured result never carries the values.
  const client = new McpClient({
    LANDING_FACTORY_ROOT: fixture.root,
    STUB_CONTROL: controlFile,
    FAKE_SERVICE_TOKEN: secretValue,
  });
  clients.push(client);
  await client.initialize();
  const result = await client.call('tail_job_log', { id: job.id });
  const json = JSON.stringify(result);
  assert.ok(!json.includes(token) && !json.includes(secretValue));
});

test('jobs older than 30 days are pruned; recent and running ones stay', () => {
  const jobs = makeJobs();
  const make = (id, finishedAt, state = 'passed') => {
    const dir = join(fixture.root, '.cache/jobs', id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'job.json'),
      JSON.stringify({
        id,
        kind: 'qa',
        slug: 'alpha',
        argv: [],
        pid: 1,
        startedAt: finishedAt,
        finishedAt,
        state,
        settled: true,
        durationMs: 1,
      }),
    );
  };
  make('20250101-000000-qa-alpha-0001', '2025-01-01T00:00:00.000Z');
  make('20260105-000000-qa-alpha-0002', '2026-01-05T00:00:00.000Z');
  const removed = jobs.prune(new Date('2026-01-20T00:00:00.000Z'));
  assert.deepEqual(removed, ['20250101-000000-qa-alpha-0001']);
  assert.ok(
    !existsSync(
      join(fixture.root, '.cache/jobs/20250101-000000-qa-alpha-0001'),
    ),
  );
  assert.ok(
    existsSync(join(fixture.root, '.cache/jobs/20260105-000000-qa-alpha-0002')),
  );
  assert.deepEqual(jobs.prune(new Date('2026-01-20T00:00:00.000Z')), []);
});

test('a generation job records its result, phase while running, time and the usage of the run', async () => {
  const runMd = (phase, result) =>
    `# Run log: newsite\n\nResult: ${result}\n\n## Phases\n\n| Phase | Status | Started | Finished | Notes |\n| ----- | ------ | ------- | -------- | ----- |\n| brief | done | | | |\n| synthesis | ${phase} | | | |\n| build | pending | | | |\n\n## Totals\n\nx\n`;
  const site = 'sites/newsite';
  control({
    sleepMs: 1500,
    files: [
      {
        path: `${site}/RUN.md`,
        content: runMd('running', 'pending'),
        when: 'start',
      },
      {
        path: `${site}/RUN.md`,
        content: runMd('done', 'checkpoint'),
        when: 'end',
      },
      {
        path: `${site}/.run-usage.json`,
        content: JSON.stringify({
          reported: true,
          inputTokens: 1234,
          outputTokens: 567,
          cacheCreationTokens: 8900,
          cacheReadTokens: 45000,
          totalCostUsd: 0.42,
          numTurns: 12,
        }),
        when: 'end',
      },
    ],
  });
  mkdirSync(join(fixture.root, site), { recursive: true });
  writeFileSync(join(fixture.root, site, 'package.json'), '{}');
  const jobs = makeJobs();
  const job = jobs.start('propose', { slug: 'newsite', niche: 'a niche' });
  const during = await waitFor(
    () => {
      const j = jobs.get(job.id);
      return j.phase ? j : null;
    },
    { what: 'the phase' },
  );
  assert.equal(during.state, 'running');
  assert.equal(during.phase, 'synthesis');
  assert.equal(during.usage, null);
  const done = await settled(jobs, job.id);
  assert.equal(done.state, 'passed');
  assert.equal(done.result, 'checkpoint');
  assert.equal(done.usage.reported, true);
  assert.equal(done.usage.inputTokens, 1234);
  assert.equal(done.usage.outputTokens, 567);
  assert.equal(done.usage.totalCostUsd, 0.42);
  assert.ok(done.durationMs >= 1000);
  assert.equal(
    JSON.parse(
      readFileSync(
        join(fixture.root, '.cache/jobs', job.id, 'job.json'),
        'utf8',
      ),
    ).usage.inputTokens,
    1234,
  );
});

test('a generation without a usage file is "not reported"; a stale file from an earlier run is ignored', async () => {
  control({});
  const jobs = makeJobs();
  // sites/alpha has a .run-usage.json from the fixture, older than this job.
  const old = new Date(Date.now() - 3600_000);
  const { utimesSync } = await import('node:fs');
  utimesSync(join(fixture.root, 'sites/alpha/.run-usage.json'), old, old);
  const job = jobs.start('generate', { slug: 'alpha', resume: true });
  const done = await settled(jobs, job.id);
  assert.deepEqual(done.usage, { reported: false });
});

test('a revise job writes the feedback to its folder, runs revise-landing.sh on that file and reports REVISION.md', async () => {
  const site = 'sites/theta';
  mkdirSync(join(fixture.root, site), { recursive: true });
  writeFileSync(join(fixture.root, site, 'package.json'), '{}');
  writeFileSync(
    join(fixture.root, site, 'RUN.md'),
    '# Run\n\nResult: passed\n',
  );
  control({
    sleepMs: 200,
    files: [
      {
        path: `${site}/REVISION.md`,
        content: '# Revision\n\nResult: needs-rebuild\n',
        when: 'end',
      },
    ],
  });
  try {
    const jobs = makeJobs();
    const feedback = 'Make it "darker" and more editorial. $(not run)';
    const job = jobs.start('revise', { slug: 'theta', feedback });
    const dir = join(fixture.root, '.cache/jobs', job.id);
    const file = join(dir, 'feedback.txt');
    assert.deepEqual(job.argv, [
      'bash',
      'scripts/revise-landing.sh',
      'theta',
      '--feedback',
      file,
    ]);
    assert.equal(readFileSync(file, 'utf8'), feedback);
    // One generation per landing: a second round while this one runs is refused.
    assert.throws(
      () => jobs.start('revise', { slug: 'theta', feedback: 'again' }),
      /already running/,
    );
    const done = await settled(jobs, job.id);
    assert.equal(done.state, 'passed');
    assert.equal(done.result, 'needs-rebuild');
    // restyle: true reaches the job's argv, before --feedback.
    const styled = jobs.start('revise', {
      slug: 'theta',
      feedback: 'Use navy.',
      restyle: true,
    });
    assert.deepEqual(styled.argv.slice(2, 5), [
      'theta',
      '--restyle',
      '--feedback',
    ]);
    await settled(jobs, styled.id);
    assert.match(
      readFileSync(join(dir, 'log.txt'), 'utf8'),
      /stub revise started/,
    );
  } finally {
    rmSync(join(fixture.root, site), { recursive: true, force: true });
  }
});

test('a revise job for a transferred landing is refused and leaves no job folder', () => {
  const site = 'sites/iota';
  mkdirSync(join(fixture.root, site), { recursive: true });
  try {
    writeFileSync(join(fixture.root, site, 'package.json'), '{}');
    writeFileSync(join(fixture.root, site, 'RUN.md'), 'Result: passed\n');
    writeFileSync(
      join(fixture.root, site, 'EXPORTED.json'),
      JSON.stringify({
        transferredTo: 'customer',
        transferredAt: '2026-11-02T00:00:00.000Z',
      }),
    );
    const jobs = makeJobs();
    const before = jobs.list().length;
    assert.throws(
      () => jobs.start('revise', { slug: 'iota', feedback: 'x' }),
      /was transferred/,
    );
    assert.equal(jobs.list().length, before);
  } finally {
    rmSync(join(fixture.root, site), { recursive: true, force: true });
  }
});

test('QA and report jobs take their result from the verdict written after the job started; qa shows the last [qa] line', async () => {
  const report = (verdict) =>
    JSON.stringify({
      verdict,
      finishedAt: new Date(Date.now() + 5000).toISOString(),
    });
  control({
    sleepMs: 800,
    lines: ['[qa] building the site', '[qa] checking /'],
    files: [
      {
        path: 'qa/beta/latest/report.json',
        content: report('passed'),
        when: 'end',
      },
    ],
  });
  const jobs = makeJobs();
  const job = jobs.start('qa', { slug: 'beta' });
  const during = await waitFor(
    () => {
      const j = jobs.get(job.id);
      return j.phase ? j : null;
    },
    { what: 'the qa phase' },
  );
  assert.equal(during.phase, '[qa] checking /');
  const done = await settled(jobs, job.id);
  assert.equal(done.result, 'passed');
  assert.equal(done.usage, null);
});
