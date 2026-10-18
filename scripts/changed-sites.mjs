#!/usr/bin/env node
// Print a JSON array with the slugs of the sites CI must build, check and deploy:
// sites whose sites/<slug>/ files changed, or every site when a shared path changed.
// Only folders with a package.json count as sites. Run with --help for options.
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { listSites } from './lib/sites.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Paths that affect every site. An entry ending in "/" matches everything under it;
 * any other entry matches that exact file.
 */
export const SHARED_PATHS = [
  'package.json',
  'package-lock.json',
  'src/components/motion/',
  'src/layouts/',
  'src/styles/',
  'qa.config.json',
  'scripts/qa.mjs',
  'scripts/qa/',
  'scripts/lib/',
  'scripts/parse-wrangler-output.mjs',
  '.github/workflows/',
];

const normalize = (file) =>
  file.trim().replace(/\\/g, '/').replace(/^\.\//, '');

export function isSharedPath(file) {
  const path = normalize(file);
  return SHARED_PATHS.some((entry) =>
    entry.endsWith('/') ? path.startsWith(entry) : path === entry,
  );
}

/**
 * @param {object} o
 * @param {string[]} o.files  changed file paths, relative to the repo root
 * @param {string[]} o.sites  slugs of every existing site
 * @returns {string[]} sorted slugs to build and deploy
 */
export function changedSites({ files, sites }) {
  const paths = files.map(normalize).filter(Boolean);
  if (paths.some(isSharedPath)) return [...sites].sort();
  return [...sites]
    .filter((slug) => paths.some((path) => path.startsWith(`sites/${slug}/`)))
    .sort();
}

const HELP = `Usage: node scripts/changed-sites.mjs [options]

Prints a JSON array of site slugs to build and deploy, for example ["panaderia"].

  --base <ref>   Compare \`git diff --name-only <ref>...HEAD\`. Default: BASE_REF from
                 the environment, else HEAD^ (the last commit, for pushes to main).
                 For pull requests pass origin/<base branch> (needs fetch-depth: 0).
  --all          Print every site (for manual runs).
  --root <dir>   Repo root (default: this repository).
  --help         Show this help.

If the diff cannot be computed (for example a shallow clone), every site is printed
and a warning goes to stderr, so a broken diff builds too much rather than too little.`;

function gitChangedFiles(root, base) {
  const out = execFileSync(
    'git',
    ['diff', '--name-only', `${base}...HEAD`, '--'],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return out.split('\n').filter(Boolean);
}

function main() {
  const { values } = parseArgs({
    options: {
      base: { type: 'string' },
      all: { type: 'boolean' },
      root: { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(HELP);
    return 0;
  }
  const root = resolve(values.root ?? ROOT);
  const sites = listSites(resolve(root, 'sites'));
  if (values.all) {
    console.log(JSON.stringify(sites));
    return 0;
  }
  const base = values.base || process.env.BASE_REF || 'HEAD^';
  try {
    const files = gitChangedFiles(root, base);
    console.log(JSON.stringify(changedSites({ files, sites })));
  } catch (error) {
    const detail = String(error.stderr || error.message).trim();
    console.error(
      `changed-sites: cannot diff against ${base} (${detail}); selecting every site.`,
    );
    console.log(JSON.stringify(sites));
  }
  return 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exit(main());
}
