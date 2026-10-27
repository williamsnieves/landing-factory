#!/usr/bin/env node
// Carry a revised landing into the clone of its own repository
// (design: openspec/changes/add-landing-revise/design.md, Decision 5).
//
//   node scripts/sync-export.mjs --site <slug> --into <clone> [--brief | --no-brief] [--no-lockfile] [--dry-run]
//
// Re-exports the site into a scratch folder (the export's own checks run) and mirrors the result into <clone>:
// files are added, changed and deleted, except `.git` and git-ignored paths, `package-lock.json` (kept unless
// package.json changed, then regenerated) and README.md (kept when only its export line differs). It prints the
// files it changed and never commits or pushes: a person (or the landing-handoff skill) pushes a branch and opens
// a pull request in that repository.
//
// Refused (exit 1, nothing written): no EXPORTED.json, a transferred site, a clone whose origin is not the recorded
// repository, a clone that is not a work tree root or has uncommitted changes. Exit 2: bad usage, a missing site,
// a record without `noBrief` and neither --brief nor --no-brief. LANDING_FACTORY_ROOT=<dir> moves the factory root
// (tests only).
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  rmdirSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { formatOutput, planExport, writeEntries } from './export.mjs';
import {
  isTransferred,
  normalizeRepoUrl,
  readExportRecord,
} from './lib/export-record.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';
import { walkFiles } from './report/fs-util.mjs';

const CODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultRoot = () =>
  process.env.LANDING_FACTORY_ROOT
    ? resolve(process.env.LANDING_FACTORY_ROOT)
    : CODE_ROOT;

class UsageError extends Error {}
export class Refused extends Error {}

const HELP = `Usage: node scripts/sync-export.mjs --site <slug> --into <clone> [options]

Re-exports an exported (not transferred) landing and mirrors the result into a clone of its repository: files are
added, changed and deleted, and the list is printed. It never commits or pushes. Then, in the clone:
npm ci && npm run lint && npm run build, push a branch (for example revise/<n>) and open a pull request; that
repository's CI gives the preview URL. Changes made directly in the repository are overwritten by the next sync.

  --site <slug>     the site under sites/ (required)
  --into <clone>    a clone of the repository in sites/<slug>/EXPORTED.json, at its root, with no uncommitted changes
  --brief           include brief.json (needed when the record has no noBrief field and the repository is private)
  --no-brief        leave brief.json out (needed when the record has no noBrief field and the repository is public)
  --no-lockfile     do not regenerate package-lock.json when package.json changed (offline); a warning says so
  --dry-run         print what would change; write nothing
  --help            show this help

Kept as they are in the clone: .git and git-ignored paths; package-lock.json unless package.json changed (then
regenerated with npm install --package-lock-only); README.md when only its export line differs.
Refused (exit 1): no EXPORTED.json, a transferred site, origin is not the recorded repository, not a work tree root,
uncommitted changes. Exit codes: 0 done, 1 refused or failed, 2 bad usage.`;

const git = (dir, args) =>
  execFileSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

/** The README without the export line (date and factory commit), so a re-export alone does not count as a change. */
const readmeCore = (text) =>
  text.replace(
    /exported from landing-factory on \S+ \(factory commit `[^`]*`\)/,
    'exported from landing-factory',
  );

/** Throws Refused unless <clone> is the root of a clean work tree whose origin is the recorded repository. */
export function checkClone(clone, record) {
  if (!existsSync(clone) || !statSync(clone).isDirectory())
    throw new Refused(`--into ${clone} is not a folder`);
  let top;
  try {
    top = git(clone, ['rev-parse', '--show-toplevel']).trim();
  } catch {
    throw new Refused(`${clone} is not a git work tree`);
  }
  if (realpathSync(top) !== realpathSync(clone))
    throw new Refused(
      `${clone} is not the root of its work tree (the root is ${top}); pass the root of the clone`,
    );
  const wanted = normalizeRepoUrl(record.repository);
  if (!wanted)
    throw new Refused(
      `EXPORTED.json has no usable repository URL (${JSON.stringify(record.repository ?? null)})`,
    );
  let origin = '';
  try {
    origin = git(clone, ['config', '--get', 'remote.origin.url']).trim();
  } catch {
    // no origin: handled below
  }
  if (!origin)
    throw new Refused(
      `${clone} has no origin remote; expected ${record.repository}`,
    );
  if (normalizeRepoUrl(origin) !== wanted)
    throw new Refused(
      `the origin of ${clone} is ${normalizeRepoUrl(origin) ?? 'not a repository location'} but EXPORTED.json records ${wanted}; use a clone of the recorded repository`,
    );
  if (git(clone, ['status', '--porcelain']).trim())
    throw new Refused(
      `${clone} has uncommitted changes; commit, stash or discard them first`,
    );
}

const sameBytes = (a, b) => readFileSync(a).equals(readFileSync(b));

/**
 * What mirroring `scratch` into `clone` does: { added, changed, deleted, kept, packageChanged }. Pure reading;
 * `scratch` holds the fresh export (without a lockfile), `clone` is clean.
 */
export function planMirror(scratch, clone) {
  const fresh = new Map(
    walkFiles(scratch, { skipDirs: [] }).map((f) => [f.rel, f.abs]),
  );
  const tracked = new Set(
    git(clone, ['ls-files', '-z']).split('\0').filter(Boolean),
  );
  // Fresh files that are not in the clone yet but match its .gitignore stay out ("ignored paths are never touched").
  const candidates = [...fresh.keys()].filter((rel) => !tracked.has(rel));
  const ignored = new Set();
  if (candidates.length) {
    try {
      const out = execFileSync(
        'git',
        ['-C', clone, 'check-ignore', '--no-index', '--stdin', '-z'],
        {
          input: candidates.join('\0'),
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
      for (const rel of out.split('\0').filter(Boolean)) ignored.add(rel);
    } catch (error) {
      // check-ignore exits 1 when nothing matches
      if (error.status !== 1) throw error;
    }
  }
  const plan = {
    added: [],
    changed: [],
    deleted: [],
    kept: [],
    packageChanged: false,
  };
  for (const [rel, abs] of [...fresh].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (ignored.has(rel)) continue;
    const target = join(clone, rel);
    if (!tracked.has(rel) && !existsSync(target)) plan.added.push(rel);
    else if (!sameBytes(abs, target)) {
      if (
        rel === 'README.md' &&
        readmeCore(readFileSync(abs, 'utf8')) ===
          readmeCore(readFileSync(target, 'utf8'))
      )
        plan.kept.push('README.md (only the export line differs)');
      else plan.changed.push(rel);
      if (rel === 'package.json') plan.packageChanged = true;
    }
  }
  for (const rel of [...tracked].sort()) {
    if (fresh.has(rel) || rel === 'package-lock.json') continue;
    plan.deleted.push(rel);
  }
  return plan;
}

function removeEmptyDirs(clone, rel) {
  let dir = dirname(join(clone, rel));
  while (dir !== clone && dir.startsWith(clone)) {
    try {
      if (readdirSync(dir).length) return;
      rmdirSync(dir);
    } catch {
      return;
    }
    dir = dirname(dir);
  }
}

function regenerateLockfile(scratch, clone) {
  const lock = join(clone, 'package-lock.json');
  if (existsSync(lock)) copyFileSync(lock, join(scratch, 'package-lock.json'));
  execFileSync(
    'npm',
    [
      'install',
      '--package-lock-only',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
    ],
    { cwd: scratch, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return (
    !existsSync(lock) || !sameBytes(join(scratch, 'package-lock.json'), lock)
  );
}

function parse(argv, env) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        into: { type: 'string' },
        brief: { type: 'boolean' },
        'no-brief': { type: 'boolean' },
        'no-lockfile': { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        root: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (error) {
    throw new UsageError(error.message);
  }
  const values = parsed.values;
  if (values.help) return { help: true };
  if (values.root && !env.NODE_TEST_CONTEXT)
    throw new UsageError('--root is only available to tests');
  if (!values.site || !SLUG_PATTERN.test(values.site))
    throw new UsageError(
      `--site needs a site slug (lowercase letters, digits, hyphens), got "${values.site ?? ''}"`,
    );
  if (!values.into) throw new UsageError('--into <clone> is required');
  if (values.brief && values['no-brief'])
    throw new UsageError('--brief and --no-brief cannot be combined');
  return { values };
}

/** Run the command. `io` has log and error. Returns the exit code. */
export function main(argv, io = console, env = process.env) {
  let args;
  try {
    args = parse(argv, env);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    io.error(`sync-export: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (args.help) {
    io.log(HELP);
    return 0;
  }
  const { values } = args;
  const root = values.root ? resolve(values.root) : defaultRoot();
  const slug = values.site;
  const clone = resolve(values.into);
  let scratch = '';
  try {
    if (!existsSync(join(root, 'sites', slug, 'package.json')))
      throw new UsageError(
        `No site "${slug}": sites/${slug}/package.json not found`,
      );
    let record;
    try {
      record = readExportRecord(root, slug);
    } catch (error) {
      throw new Refused(error.message);
    }
    if (!record)
      throw new Refused(
        `sites/${slug} is not exported (no EXPORTED.json): there is no repository to sync into; export it first (docs/handoff.md)`,
      );
    if (isTransferred(record))
      throw new Refused(
        `sites/${slug} was transferred to ${record.transferredTo}; the factory does nothing more with it`,
      );
    checkClone(clone, record);

    let withBrief;
    if (values.brief) withBrief = true;
    else if (values['no-brief']) withBrief = false;
    else if (typeof record.noBrief === 'boolean') withBrief = !record.noBrief;
    else
      throw new UsageError(
        `sites/${slug}/EXPORTED.json does not say whether brief.json travels (no noBrief field): pass --brief (private repository) or --no-brief (public repository)`,
      );

    scratch = mkdtempSync(join(tmpdir(), `lf-sync-${slug}-`));
    let plan;
    try {
      plan = planExport({ root, slug, withBrief });
      writeEntries(scratch, plan.entries);
      formatOutput(scratch);
    } catch (error) {
      if (error instanceof Refused || error instanceof UsageError) throw error;
      throw new Refused(`the export failed: ${error.message}`);
    }
    // planExport's README and workflow come from the same factory; the lockfile is the clone's own.
    const mirror = planMirror(scratch, clone);

    let lockfile = null;
    if (mirror.packageChanged) {
      if (values['no-lockfile'] || values['dry-run']) {
        lockfile = values['dry-run']
          ? 'would be regenerated (package.json changed)'
          : 'NOT regenerated (--no-lockfile); run npm install --package-lock-only in the clone before committing';
      } else {
        // Written into the scratch folder first, so a failure leaves the clone untouched.
        try {
          if (regenerateLockfile(scratch, clone)) lockfile = 'regenerated';
          else lockfile = 'unchanged after regeneration';
        } catch (error) {
          const detail = String(error.stderr || error.message)
            .trim()
            .split('\n')
            .slice(-3)
            .join(' | ');
          throw new Refused(
            `could not regenerate package-lock.json (is the npm registry reachable? use --no-lockfile to skip): ${detail}`,
          );
        }
      }
    }

    const counts = {
      added: mirror.added.length,
      changed: mirror.changed.length + (lockfile === 'regenerated' ? 1 : 0),
      deleted: mirror.deleted.length,
    };
    const total = counts.added + counts.changed + counts.deleted;
    io.log(
      `sync-export${values['dry-run'] ? ' (dry run)' : ''}: sites/${slug} -> ${clone}`,
    );
    for (const rel of mirror.added) io.log(`  added    ${rel}`);
    for (const rel of mirror.changed) io.log(`  changed  ${rel}`);
    if (lockfile === 'regenerated') io.log('  changed  package-lock.json');
    for (const rel of mirror.deleted) io.log(`  deleted  ${rel}`);
    for (const note of mirror.kept) io.log(`  kept     ${note}`);
    if (lockfile && lockfile !== 'regenerated')
      io.log(`  lockfile package-lock.json ${lockfile}`);
    else if (!mirror.packageChanged)
      io.log('  kept     package-lock.json (package.json unchanged)');
    if (mirror.deleted.includes('brief.json'))
      io.log(
        'warning: brief.json is deleted from the repository (this sync leaves the brief out).',
      );
    io.log(
      `${total} file(s) ${values['dry-run'] ? 'would change' : 'changed'}: ${counts.added} added, ${counts.changed} changed, ${counts.deleted} deleted.`,
    );

    if (!values['dry-run']) {
      for (const rel of [...mirror.added, ...mirror.changed]) {
        const target = join(clone, rel);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(join(scratch, rel), target);
        chmodSync(target, statSync(join(scratch, rel)).mode & 0o777);
      }
      for (const rel of mirror.deleted) {
        rmSync(join(clone, rel), { force: true });
        removeEmptyDirs(clone, rel);
      }
      if (lockfile === 'regenerated')
        copyFileSync(
          join(scratch, 'package-lock.json'),
          join(clone, 'package-lock.json'),
        );
      if (total)
        io.log(
          'Nothing was committed or pushed. Next, in the clone: npm ci && npm run lint && npm run build; push a branch (for example revise/<n>) and open a pull request there.',
        );
      else io.log('The clone is already up to date. Nothing was written.');
    } else io.log('Nothing was written.');
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      io.error(`sync-export: ${error.message}`);
      return 2;
    }
    if (error instanceof Refused) {
      io.error(`sync-export: ${error.message}`);
      return 1;
    }
    io.error(`sync-export: ${error.message}`);
    return 1;
  } finally {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
