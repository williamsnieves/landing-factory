#!/usr/bin/env node
// Pages CMS support for exported landings (design: openspec/changes/add-git-cms/design.md).
//
//   node scripts/cms.mjs check --site <slug>
//   node scripts/cms.mjs pull  --site <slug> --from <clone> [--dry-run]
//
// `check` validates sites/<slug>/.pages.yml (exit 0 valid, 1 invalid, 2 bad usage or no file). `pull` copies the
// files under the CMS paths from a clone of the site's repository into sites/<slug>/ (add, change, delete inside
// those paths only) so the factory starts from what is live; it never commits. LANDING_FACTORY_ROOT=<dir> moves
// the factory root, and --root does the same, both for tests only.
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  rmdirSync,
  statSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  Refused,
  checkClone,
  requireManagedRecord,
} from './lib/clone-check.mjs';
import {
  CMS_FILE,
  cmsFiles,
  hasCmsConfig,
  readCmsConfig,
  sameContent,
} from './lib/cms-config.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';

const CODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultRoot = () =>
  process.env.LANDING_FACTORY_ROOT
    ? resolve(process.env.LANDING_FACTORY_ROOT)
    : CODE_ROOT;

class UsageError extends Error {}

const HELP = `Usage: node scripts/cms.mjs <check|pull> --site <slug> [options]

check  Validate sites/<slug>/.pages.yml (the Pages CMS configuration). Fails when an entry's type is not
       collection or file, a path is outside src/content/ or missing, a format is not json or yaml, a path is not
       referenced in src/content.config.ts, or a media or actions key is present.
pull   Copy the files under the CMS paths from a clone of the site's repository into sites/<slug>/: files are
       added, changed and deleted inside those paths only, and listed. It never commits. Run it before a
       revision round or a sync when someone edited content through the CMS.

  --site <slug>   the site under sites/ (required)
  --from <clone>  pull: a clone of the repository in sites/<slug>/EXPORTED.json, at its root, up to date and with
                  no uncommitted changes
  --dry-run       pull: print what would change; write nothing
  --help          show this help

Pull is refused (exit 1, nothing written): no .pages.yml or EXPORTED.json, a transferred site, origin is not the
recorded repository, not a work tree root, uncommitted changes, an invalid .pages.yml.
Exit codes: 0 ok, 1 invalid or refused, 2 bad usage or no .pages.yml for check.`;

function parse(argv, env) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        site: { type: 'string' },
        from: { type: 'string' },
        'dry-run': { type: 'boolean' },
        root: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (error) {
    throw new UsageError(error.message);
  }
  const { values, positionals } = parsed;
  if (values.help) return { help: true };
  if (values.root && !env.NODE_TEST_CONTEXT)
    throw new UsageError('--root is only available to tests');
  const [command, ...extra] = positionals;
  if (!['check', 'pull'].includes(command ?? ''))
    throw new UsageError('the command must be check or pull');
  if (extra.length) throw new UsageError(`unexpected argument "${extra[0]}"`);
  if (!values.site || !SLUG_PATTERN.test(values.site))
    throw new UsageError(
      `--site needs a site slug (lowercase letters, digits, hyphens), got "${values.site ?? ''}"`,
    );
  if (command === 'check' && (values.from || values['dry-run']))
    throw new UsageError('check takes only --site');
  if (command === 'pull' && !values.from)
    throw new UsageError('pull needs --from <clone>');
  return { command, values };
}

const underOrEqual = (rel, p) => rel === p || rel.startsWith(`${p}/`);

/**
 * What copying the CMS paths of `clone` into `siteDir` does: { added, changed, deleted }. A factory file under a
 * path but absent from the clone is deleted; so is a path the clone lacks entirely.
 */
export function planPull(siteDir, clone, paths) {
  const live = new Set(cmsFiles(clone, paths));
  const mine = new Set(cmsFiles(siteDir, paths));
  const plan = { added: [], changed: [], deleted: [] };
  for (const rel of live)
    if (!mine.has(rel)) plan.added.push(rel);
    else if (!sameContent(join(clone, rel), join(siteDir, rel)))
      plan.changed.push(rel);
  for (const rel of mine) if (!live.has(rel)) plan.deleted.push(rel);
  return plan;
}

/** Format the files pull wrote with the factory's Prettier and its .prettierrc.json (json and yaml only). */
function formatPulled(files) {
  const targets = files.filter((f) => /\.(json|ya?ml)$/i.test(f));
  if (!targets.length) return;
  const bin = join(
    CODE_ROOT,
    'node_modules',
    'prettier',
    'bin',
    'prettier.cjs',
  );
  execFileSync(
    process.execPath,
    [
      bin,
      '--write',
      '--log-level',
      'warn',
      '--config',
      join(CODE_ROOT, '.prettierrc.json'),
      ...targets,
    ],
    { cwd: CODE_ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function removeEmptyDirs(stop, rel) {
  let dir = dirname(join(stop, rel));
  while (dir !== stop && dir.startsWith(stop)) {
    try {
      if (readdirSync(dir).length) return;
      rmdirSync(dir);
    } catch {
      return;
    }
    dir = dirname(dir);
  }
}

function runCheck(root, slug, io) {
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(join(siteDir, 'package.json')))
    throw new UsageError(
      `No site "${slug}": sites/${slug}/package.json not found`,
    );
  if (!hasCmsConfig(siteDir))
    throw new UsageError(`sites/${slug}/${CMS_FILE} does not exist`);
  const { paths, problems } = readCmsConfig(siteDir);
  if (problems.length) {
    for (const p of problems) io.error(`problem: ${p}`);
    io.error(`cms check: ${slug}: ${problems.length} problem(s).`);
    return 1;
  }
  io.log(
    `cms check: ${slug}: valid, ${paths.length} entr${paths.length === 1 ? 'y' : 'ies'}.`,
  );
  for (const e of paths) io.log(`  ${e.type} ${e.path} (${e.format})`);
  return 0;
}

function runPull(root, slug, from, dryRun, io) {
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(join(siteDir, 'package.json')))
    throw new UsageError(
      `No site "${slug}": sites/${slug}/package.json not found`,
    );
  if (!hasCmsConfig(siteDir))
    throw new Refused(
      `sites/${slug} has no ${CMS_FILE}: it does not use the Pages CMS`,
    );
  const record = requireManagedRecord(
    root,
    slug,
    'there is no repository to pull from; export it first (docs/handoff.md)',
  );
  const clone = resolve(from);
  checkClone(clone, record, '--from');
  const { paths, problems } = readCmsConfig(siteDir);
  if (problems.length)
    throw new Refused(
      `sites/${slug}/${CMS_FILE} is not valid (node scripts/cms.mjs check --site ${slug}):\n${problems.map((p) => `  ${p}`).join('\n')}`,
    );
  const cmsPaths = paths.map((e) => e.path);
  const plan = planPull(siteDir, clone, cmsPaths);
  const total = plan.added.length + plan.changed.length + plan.deleted.length;
  io.log(
    `cms pull${dryRun ? ' (dry run)' : ''}: ${clone} -> sites/${slug} (${cmsPaths.join(', ')})`,
  );
  for (const rel of plan.added) io.log(`  added    ${rel}`);
  for (const rel of plan.changed) io.log(`  changed  ${rel}`);
  for (const rel of plan.deleted) io.log(`  deleted  ${rel}`);
  io.log(
    `${total} file(s) ${dryRun ? 'would change' : 'changed'}: ${plan.added.length} added, ${plan.changed.length} changed, ${plan.deleted.length} deleted.`,
  );
  if (dryRun) {
    io.log('Nothing was written.');
    return 0;
  }
  const written = [];
  for (const rel of [...plan.added, ...plan.changed]) {
    if (!cmsPaths.some((p) => underOrEqual(rel, p))) continue;
    const target = join(siteDir, rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(clone, rel), target);
    written.push(target);
  }
  // The CMS owns the formatting in the repository; the factory's format:check wants its own.
  formatPulled(written);
  for (const rel of plan.deleted) {
    rmSync(join(siteDir, rel), { force: true });
    removeEmptyDirs(siteDir, rel);
  }
  io.log(
    total
      ? 'Nothing was committed. Review the change with git diff, then commit it in the factory.'
      : 'The factory already has the live content. Nothing was written.',
  );
  return 0;
}

/** Run the command. `io` has log and error. Returns the exit code. */
export function main(argv, io = console, env = process.env) {
  let args;
  try {
    args = parse(argv, env);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    io.error(`cms: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (args.help) {
    io.log(HELP);
    return 0;
  }
  const { command, values } = args;
  const root = values.root ? resolve(values.root) : defaultRoot();
  try {
    if (command === 'check') return runCheck(root, values.site, io);
    return runPull(root, values.site, values.from, values['dry-run'], io);
  } catch (error) {
    if (error instanceof UsageError) {
      io.error(`cms: ${error.message}`);
      return 2;
    }
    io.error(`cms: ${error.message}`);
    return 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
