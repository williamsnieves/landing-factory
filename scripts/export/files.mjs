// What an export writes (design Decision 5): the site's own files, the copied scripts, the project files and
// the planning documents. A plan is a list of { to, from } (copy) or { to, content } (generated), with `to`
// relative to the output folder and forward slashes.
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { walkFiles } from '../report/fs-util.mjs';

/** Top-level files of the site folder that travel (README.md is regenerated). */
export const SITE_FILES = [
  'astro.config.mjs',
  'tsconfig.json',
  'site.config.json',
  'assets.json',
  'CREDITS.md',
];
/** Folders of the site that travel whole. */
export const SITE_DIRS = ['src', 'public', 'assets'];
/** Planning documents of the site that go under docs/factory/. */
export const PLANNING_FILES = [
  'PROPOSAL.md',
  'RUN.md',
  'CONTENT.md',
  'layout-signature.json',
];
/** Folders never copied, anywhere in a copied tree. */
export const NEVER_DIRS = ['node_modules', '.astro', 'dist', 'qa', '.git'];

const ENV_FILE = /(^|\/)\.env(\.[^/]+)?$/;
const ENV_SAFE = /\.(example|sample|template)$/;

/** True for a path the export must never copy. */
export function isNeverCopied(rel) {
  if (ENV_FILE.test(rel)) return !ENV_SAFE.test(rel);
  const name = rel.split('/').pop();
  return ['.DS_Store', '.run.log', '.run-usage.json', 'EXPORTED.json'].includes(
    name,
  );
}

/**
 * The site-derived copies: sources and public files, the site's top-level files, the brief when asked, the
 * planning documents and the design system.
 */
export function sitePlan({ root, slug, withBrief }) {
  const siteDir = join(root, 'sites', slug);
  const plan = [];
  const copy = (to, from) => plan.push({ to, from });
  for (const name of SITE_FILES)
    if (existsSync(join(siteDir, name))) copy(name, join(siteDir, name));
  for (const dir of SITE_DIRS) {
    const base = join(siteDir, dir);
    if (!existsSync(base) || !lstatSync(base).isDirectory()) continue;
    for (const file of walkFiles(base, { skipDirs: NEVER_DIRS })) {
      const to = `${dir}/${file.rel}`;
      if (!isNeverCopied(to)) copy(to, file.abs);
    }
  }
  if (withBrief && existsSync(join(siteDir, 'brief.json')))
    copy('brief.json', join(siteDir, 'brief.json'));
  for (const name of PLANNING_FILES)
    if (existsSync(join(siteDir, name)))
      copy(`docs/factory/${name}`, join(siteDir, name));
  const master = join(root, 'design-system', slug, 'MASTER.md');
  if (existsSync(master)) copy('docs/factory/MASTER.md', master);
  return plan;
}

/** Scripts from the closure, as copies. */
export const scriptsPlan = ({ root, files }) =>
  files.map((rel) => ({ to: rel, from: join(root, rel) }));

/** The text of a planned entry (for the secret scan and for generated files). */
export const textOf = (entry) =>
  entry.content ?? readFileSync(entry.from, 'utf8');

/**
 * `knip.json` of an exported single-site repository: the factory's root configuration for one project (no
 * workspaces). The scripts are entries, since QA, the report and the deploy use the tooling packages; the files
 * `import.meta.glob` loads are entries too; the layer folders are judged as a unit by the factory's layer check.
 */
export function exportedKnipConfig() {
  return {
    $schema: 'https://unpkg.com/knip@6/schema.json',
    entry: ['scripts/**/*.mjs', 'src/i18n/urls.ts', 'src/scenes/*.ts'],
    project: ['src/**/*.{astro,ts,tsx,css}', 'scripts/**/*.mjs'],
    ignore: ['src/components/three/**', 'src/components/legal/**'],
    ignoreDependencies: ['eslint-plugin-jsx-a11y'],
  };
}
