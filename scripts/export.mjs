#!/usr/bin/env node
// Turn one site workspace into a standalone repository (design: openspec/changes/add-site-export/design.md).
//
//   node scripts/export.mjs --site <slug> --out <dir> [--no-brief] [--record <https-url>] [--dry-run]
//
// The site sits at the root of <dir>; QA, the landing report and the deploy run there unchanged (root mode).
// Every check runs before the first file is written. Exit codes: 0 done, 1 refused by a check or failed,
// 2 bad usage (slug, missing site, --out inside the factory or not empty, bad --record URL).
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { ClosureError, importClosure } from './export/closure.mjs';
import { exportedKnipConfig, scriptsPlan, sitePlan } from './export/files.mjs';
import { PackageError, buildPackageJson } from './export/package.mjs';
import {
  readTemplate,
  renderReadme,
  singleSiteGuide,
} from './export/readme.mjs';
import { ConfigError, resolveConfig } from './deploy/config.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';
import { LAYERS, unusedLayers } from './site-layers.mjs';
import { scanTree } from './report/source-scan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Fixed entry points of the closure (design Decision 2). Credits and legal need sites/<slug>/ and stay in the factory. */
export const ENTRY_POINTS = [
  'scripts/qa.mjs',
  'scripts/landing-report.mjs',
  'scripts/deploy.mjs',
  'scripts/deploy/config.mjs',
  'scripts/parse-wrangler-output.mjs',
];

const GITIGNORE = `node_modules/
dist/
.astro/
.cache/
/qa/
.env
.env.*
!.env.example
.DS_Store
npm-debug.log*
*.log
test-results/
playwright-report/
`;

const PRETTIERIGNORE = `package-lock.json
dist/
.astro/
node_modules/
/qa/
/docs/factory/
`;

const HELP = `Usage: npm run export -- --site <slug> --out <dir> [options]

Writes a standalone repository with the site at its root: the site, the factory scripts QA, the landing report
and the deploy need, package.json pinned to the versions the factory lockfile resolved, package-lock.json,
qa.config.json, Prettier config, a one-site GitHub Actions workflow, a README and the planning documents under
docs/factory/. It never copies dist/, node_modules/, .astro/, qa/, .run.log, .run-usage.json or .env files,
and it stops when a provider secret pattern matches a file of the site.

  --site <slug>       the site under sites/ (required)
  --out <dir>         the output folder: outside the factory, absent or empty (required)
  --no-brief          leave brief.json out (for a public repository; the report then warns that the legal
                      requirements are unknown)
  --no-lockfile       skip \`npm install --package-lock-only\` (offline); package-lock.json is not written
  --record <https-url> after a successful export write sites/<slug>/EXPORTED.json (repository, date, factory
                      commit, target); the factory's CI then skips the site
  --dry-run           print the files, the dependencies and the workflow; write nothing
  --help              show this help

Exit codes: 0 done, 1 refused by a check or failed, 2 bad usage.`;

class UsageError extends Error {}
class CheckError extends Error {}

const slash = (path) => path.split('\\').join('/');

/** Resolve `out` through the real path of its nearest existing parent, so a symlink cannot hide the factory. */
function resolveOut(out) {
  const abs = resolve(out);
  let probe = abs;
  const rest = [];
  while (!existsSync(probe)) {
    rest.unshift(probe.slice(dirname(probe).length + 1));
    const parent = dirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  return join(realpathSync(probe), ...rest);
}

function checkOut(out, root) {
  const real = resolveOut(out);
  const rel = relative(realpathSync(root), real);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)))
    throw new UsageError(
      `--out ${out} is inside the factory repository; export to a folder outside it`,
    );
  if (existsSync(real)) {
    if (!statSync(real).isDirectory())
      throw new UsageError(`--out ${out} exists and is not a folder`);
    if (readdirSync(real).length)
      throw new UsageError(
        `--out ${out} is not empty; export into a new or empty folder`,
      );
  }
  return real;
}

function readJson(path, what) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new CheckError(`${what} cannot be read: ${error.message}`);
  }
}

function factoryCommit(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

/** Everything the export will write, with all checks done. Throws UsageError or CheckError. */
export function planExport({ root, slug, withBrief }) {
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(join(siteDir, 'package.json')))
    throw new UsageError(
      `No site "${slug}": sites/${slug}/package.json not found`,
    );

  // A layer the site holds without using it never leaves the factory (design Decision 6).
  const unused = unusedLayers(siteDir);
  if (unused.length)
    throw new CheckError(
      `sites/${slug} holds ${unused.map((l) => `${LAYERS[l].label} (${l})`).join(' and ')} that nothing imports; prune it first: node scripts/site-layers.mjs prune --site ${slug} (then npm install); nothing was written`,
    );

  let closure;
  try {
    closure = importClosure({ root, entries: ENTRY_POINTS });
  } catch (error) {
    if (error instanceof ClosureError) throw new CheckError(error.message);
    throw error;
  }

  const siteConfigRaw = readJson(
    join(siteDir, 'site.config.json'),
    `sites/${slug}/site.config.json`,
  );
  let config;
  try {
    config = resolveConfig(siteConfigRaw);
  } catch (error) {
    if (error instanceof ConfigError) throw new CheckError(error.message);
    throw error;
  }

  const lockPath = join(root, 'package-lock.json');
  if (!existsSync(lockPath))
    throw new CheckError('package-lock.json is missing in the factory');
  let packageJson;
  try {
    packageJson = buildPackageJson({
      slug,
      sitePackage: readJson(join(siteDir, 'package.json'), 'package.json'),
      rootPackage: readJson(join(root, 'package.json'), 'root package.json'),
      lock: readJson(lockPath, 'package-lock.json'),
      siteConfig: siteConfigRaw,
    });
  } catch (error) {
    if (error instanceof PackageError) throw new CheckError(error.message);
    throw error;
  }

  // Files that come from the site: the secret scan covers them (the scripts are the factory's own code).
  const siteEntries = sitePlan({ root, slug, withBrief });
  const scan = scanTree([
    {
      dir: siteDir,
      label: 'sites/' + slug,
      files: siteEntries.map((e) => ({
        rel: e.to,
        abs: e.from,
        size: statSync(e.from).size,
      })),
    },
  ]);
  const strong = scan.findings.filter((f) => !f.generic);
  if (strong.length)
    throw new CheckError(
      `a credential pattern matches in the site; nothing was written:\n${strong
        .map((f) => `  ${f.file}:${f.line} ${f.name} ${f.masked}`)
        .join('\n')}`,
    );
  const warnings = scan.findings
    .filter((f) => f.generic)
    .map((f) => `${f.file}:${f.line} ${f.name} ${f.masked}`);

  const brief = withBrief ? existsSync(join(siteDir, 'brief.json')) : false;
  const briefData = brief
    ? readJson(join(siteDir, 'brief.json'), 'brief.json')
    : null;
  const astroConfig = readFileSync(join(siteDir, 'astro.config.mjs'), 'utf8');
  const domain = /\bsite:\s*['"]https?:\/\/([^'"/]+)/.exec(astroConfig)?.[1];
  const node = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
  const commit = factoryCommit(root);
  const date = new Date().toISOString();

  const entries = [...siteEntries];
  entries.push(...scriptsPlan({ root, files: closure }));
  const siteQa = join(siteDir, 'qa.config.json');
  entries.push({
    to: 'qa.config.json',
    from: existsSync(siteQa) ? siteQa : join(root, 'qa.config.json'),
  });
  entries.push({ to: '.nvmrc', from: join(root, '.nvmrc') });
  entries.push({
    to: 'eslint.config.mjs',
    from: join(root, 'eslint.config.mjs'),
  });
  entries.push({
    to: '.prettierrc.json',
    from: join(root, '.prettierrc.json'),
  });
  const generated = [
    {
      to: 'package.json',
      content: `${JSON.stringify(packageJson, null, 2)}\n`,
    },
    {
      to: 'knip.json',
      content: `${JSON.stringify(exportedKnipConfig(), null, 2)}\n`,
    },
    { to: '.gitignore', content: GITIGNORE },
    { to: '.prettierignore', content: PRETTIERIGNORE },
    {
      to: '.github/workflows/ci.yml',
      content: readTemplate('ci.yml'),
    },
    {
      to: 'README.md',
      content: renderReadme({
        title: briefData?.business?.name || slug,
        config,
        node,
        date: date.slice(0, 10),
        commit,
        withBrief: brief,
        domain,
      }),
    },
  ];
  const guide = join(root, 'docs', 'deploy', `${config.target}.md`);
  if (existsSync(guide))
    generated.push({
      to: 'docs/deploy.md',
      content: singleSiteGuide(readFileSync(guide, 'utf8')),
    });
  entries.push(...generated);
  entries.sort((a, b) => (a.to < b.to ? -1 : 1));
  return {
    entries,
    packageJson,
    config,
    commit,
    date,
    warnings,
    withBrief: brief,
    closure,
  };
}

function describeDependencies(pkg) {
  const lines = [];
  for (const key of ['dependencies', 'devDependencies'])
    for (const [name, version] of Object.entries(pkg[key]))
      lines.push(
        `  ${key === 'dependencies' ? 'dep    ' : 'devDep '} ${name}@${version}`,
      );
  return lines;
}

function writeEntries(out, entries) {
  for (const entry of entries) {
    const target = join(out, entry.to);
    mkdirSync(dirname(target), { recursive: true });
    if (entry.content !== undefined) writeFileSync(target, entry.content);
    else copyFileSync(entry.from, target);
  }
}

/** Format the output with the factory's Prettier and the copied config (design Decision 9). */
function formatOutput(out) {
  const bin = join(ROOT, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  execFileSync(
    process.execPath,
    [
      bin,
      '--write',
      '--log-level',
      'warn',
      '--config',
      join(ROOT, '.prettierrc.json'),
      '--ignore-path',
      join(out, '.prettierignore'),
      out,
    ],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function createLockfile(out) {
  execFileSync(
    'npm',
    [
      'install',
      '--package-lock-only',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
    ],
    { cwd: out, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function clean(out, createdFolder) {
  try {
    if (createdFolder) rmSync(out, { recursive: true, force: true });
    else
      for (const name of readdirSync(out))
        rmSync(join(out, name), { recursive: true, force: true });
  } catch {
    // Best effort: the folder was empty before, so anything left is ours.
  }
}

export function main(argv, io = console, env = process.env) {
  let args;
  try {
    args = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        out: { type: 'string' },
        'no-brief': { type: 'boolean' },
        'no-lockfile': { type: 'boolean' },
        record: { type: 'string' },
        'dry-run': { type: 'boolean' },
        root: { type: 'string' },
        help: { type: 'boolean' },
      },
    }).values;
  } catch (error) {
    io.error(`export: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (args.help) {
    io.log(HELP);
    return 0;
  }
  // The factory root can only be moved by tests (as LANDING_FACTORY_ROOT in the MCP tests).
  if (args.root && !env.NODE_TEST_CONTEXT) {
    io.error('export: --root is only available to tests');
    return 2;
  }
  const root = resolve(args.root ?? ROOT);
  const slug = args.site;
  let createdFolder = false;
  let out = '';
  try {
    if (!slug) throw new UsageError('--site <slug> is required');
    if (!SLUG_PATTERN.test(slug))
      throw new UsageError(
        `invalid site slug "${slug}": use lowercase letters, digits and hyphens`,
      );
    if (!args.out) throw new UsageError('--out <dir> is required');
    if (args.record !== undefined) {
      let url;
      try {
        url = new URL(args.record);
      } catch {
        throw new UsageError(`--record "${args.record}" is not a URL`);
      }
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new UsageError(
          '--record must be an https:// URL without credentials',
        );
    }
    out = checkOut(args.out, root);
    const plan = planExport({ root, slug, withBrief: !args['no-brief'] });

    if (args['dry-run']) {
      io.log(`export (dry run): sites/${slug} -> ${args.out}`);
      io.log(`Target: ${plan.config.target}`);
      io.log(`Files (${plan.entries.length}):`);
      for (const entry of plan.entries) io.log(`  ${entry.to}`);
      io.log('Dependencies (pinned to the factory lockfile):');
      for (const line of describeDependencies(plan.packageJson)) io.log(line);
      io.log('Workflow: .github/workflows/ci.yml (jobs: qa, deploy)');
      io.log(
        plan.withBrief
          ? 'brief.json is included (use --no-brief for a public repository).'
          : 'brief.json is not included.',
      );
      for (const w of plan.warnings) io.log(`warning: ${w}`);
      io.log('Nothing was written.');
      return 0;
    }

    createdFolder = !existsSync(out);
    mkdirSync(out, { recursive: true });
    writeEntries(out, plan.entries);
    try {
      formatOutput(out);
    } catch (error) {
      throw new CheckError(
        `Prettier failed on the output: ${String(error.stderr || error.message).trim()}`,
      );
    }
    if (args['no-lockfile'])
      io.log(
        'export: package-lock.json was not written (--no-lockfile); run `npm install --package-lock-only` before the first commit.',
      );
    else {
      try {
        createLockfile(out);
      } catch (error) {
        const detail = String(error.stderr || error.message)
          .trim()
          .split('\n')
          .slice(-3)
          .join(' | ');
        throw new CheckError(
          `could not create package-lock.json (is the npm registry reachable?): ${detail}`,
        );
      }
    }

    if (args.record) {
      const record = {
        repository: args.record,
        exportedAt: plan.date,
        factoryCommit: plan.commit,
        target: plan.config.target,
      };
      writeFileSync(
        join(root, 'sites', slug, 'EXPORTED.json'),
        `${JSON.stringify(record, null, 2)}\n`,
      );
      io.log(`export: recorded sites/${slug}/EXPORTED.json`);
    }
    for (const w of plan.warnings) io.log(`warning: ${w}`);
    io.log(
      `export: wrote ${plan.entries.length} files to ${args.out} (${plan.closure.length} scripts, target ${plan.config.target}).`,
    );
    if (plan.withBrief)
      io.log(
        'export: brief.json was included (business, contact and legal data); use --no-brief for a public repository.',
      );
    io.log(
      'Next: cd into the folder, git init, commit, create the GitHub repository, add the secrets (README, Deployment) and push.',
    );
    return 0;
  } catch (error) {
    if (out && existsSync(out) && !(error instanceof UsageError))
      clean(out, createdFolder);
    if (error instanceof UsageError) {
      io.error(`export: ${error.message}`);
      return 2;
    }
    if (error instanceof CheckError) {
      io.error(`export: ${error.message}`);
      return 1;
    }
    io.error(`export: ${error.message}`);
    return 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
