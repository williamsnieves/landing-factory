// Tests for scripts/new-site.mjs. Sites are created in a temporary folder, never in sites/.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from '../scripts/qa/server.mjs';
import {
  RUN_PHASES,
  SHARED_DEPENDENCIES,
  SHARED_DEV_DEPENDENCIES,
  jsString,
  scaffoldSite,
  stripRootOnlyCss,
  validateSlug,
} from '../scripts/new-site.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'new-site-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const freshSites = () => mkdtempSync(join(tmp, 'sites-'));
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

const EXPECTED_FILES = [
  'CREDITS.md',
  'PROPOSAL.md',
  'README.md',
  'RUN.md',
  'assets.json',
  'astro.config.mjs',
  'package.json',
  'public/_headers',
  'public/favicon.svg',
  'public/robots.txt',
  'site.config.json',
  'src/components/forms/LeadForm.astro',
  'src/components/forms/ThankYou.astro',
  'src/components/forms/client.ts',
  'src/components/forms/fields.ts',
  'src/components/forms/whatsapp.ts',
  'src/components/legal/LegalNotice.astro',
  'src/components/legal/LegalValue.astro',
  'src/components/legal/PrivacyPolicy.astro',
  'src/components/legal/texts.ts',
  'src/components/motion/Motion.astro',
  'src/components/motion/README.md',
  'src/components/motion/index.ts',
  'src/components/three/README.md',
  'src/components/three/Scene3D.astro',
  'src/components/three/gating.ts',
  'src/components/three/helpers.ts',
  'src/components/three/runtime.ts',
  'src/components/three/types.ts',
  'src/env.d.ts',
  'src/layouts/BaseLayout.astro',
  'src/layouts/README.md',
  'src/pages/404.astro',
  'src/pages/index.astro',
  'src/scenes/.gitkeep',
  'src/styles/global.css',
  'src/styles/tokens.css',
  'tsconfig.json',
];

test('valid slugs pass and invalid slugs are rejected', () => {
  for (const ok of ['panaderia', 'cafe-2', 'a', 'x1-y2-z3'])
    assert.equal(validateSlug(ok), null, ok);
  for (const bad of [
    '',
    undefined,
    'Panaderia',
    'two words',
    '-lead',
    'trail-',
    'dou--ble',
    'under_score',
    '../escape',
    'a/b',
    'ñandu',
  ])
    assert.match(validateSlug(bad) ?? '', /slug/i, String(bad));
});

test('scaffolding writes exactly the expected files and never the starter pages or sections', () => {
  const sitesDir = freshSites();
  const { created, kept } = scaffoldSite({ slug: 'cafeteria', sitesDir });
  assert.deepEqual(created, EXPECTED_FILES);
  assert.deepEqual(kept, []);
  const site = join(sitesDir, 'cafeteria');
  assert.ok(!existsSync(join(site, 'src/components/sections')));
  assert.ok(!existsSync(join(site, 'src/pages/islands.astro')));
  assert.ok(!existsSync(join(site, 'src/pages/_README.md')));
  // The 3D layer is copied, the demo scene, demo page and poster are not.
  assert.ok(existsSync(join(site, 'src/components/three/Scene3D.astro')));
  assert.ok(!existsSync(join(site, 'src/scenes/demo.ts')));
  assert.ok(!existsSync(join(site, 'src/pages/3d.astro')));
  assert.ok(!existsSync(join(site, 'src/assets')));
  const deps = readJson(join(site, 'package.json'));
  assert.ok(deps.dependencies.three, 'three is a site dependency');
  assert.ok(deps.devDependencies['@types/three']);
});

test('the planning templates follow the skill: proposal sections, one RUN.md row per phase, empty manifest', () => {
  const sitesDir = freshSites();
  scaffoldSite({ slug: 'cafeteria', sitesDir, title: 'Cafetería Sol' });
  const site = join(sitesDir, 'cafeteria');
  const proposal = readFileSync(join(site, 'PROPOSAL.md'), 'utf8');
  assert.match(proposal, /^# Proposal: Cafetería Sol/);
  for (const heading of [
    'Brief',
    'References used',
    'Page map',
    'Motion plan',
    '3D',
    'Archetype blend',
    'Visual direction',
    'SEO',
    'Quality targets',
    'Out of scope',
    'Decisions',
  ])
    assert.match(proposal, new RegExp(`^## ${heading}$`, 'm'), heading);
  assert.match(proposal, /\bsites\/cafeteria\//);
  // The synthesis fills a Signals line and the blend; the templates point to no generated site.
  assert.match(proposal, /^- \*\*Signals:\*\*/m);
  assert.match(proposal, /pick-archetypes\.mjs --site cafeteria/);
  assert.match(proposal, /Lent traits/);
  const run = readFileSync(join(site, 'RUN.md'), 'utf8');
  assert.match(run, /^# Run log: cafeteria/);
  assert.match(run, /^Result: pending$/m);
  for (const phase of RUN_PHASES)
    assert.match(run, new RegExp(`^\\| ${phase} +\\| pending `, 'm'), phase);
  for (const heading of ['Inputs', 'Phases', 'QA attempts', 'Final check'])
    assert.match(run, new RegExp(`^## ${heading}$`, 'm'), heading);
  assert.deepEqual(readJson(join(site, 'assets.json')), { images: [] });
  for (const file of ['PROPOSAL.md', 'RUN.md'])
    assert.doesNotMatch(
      readFileSync(join(site, file), 'utf8'),
      /panaderia|clinica-dental|samurai/i,
      `${file} must not anchor on another site`,
    );
  assert.match(run, /Every deviation from the chosen archetype sheets/);
});

test('the site manifest is private, named site-<slug> and pins the root versions exactly', () => {
  const sitesDir = freshSites();
  scaffoldSite({ slug: 'cafeteria', sitesDir });
  const site = readJson(join(sitesDir, 'cafeteria/package.json'));
  const root = readJson(join(ROOT, 'package.json'));
  assert.equal(site.name, 'site-cafeteria');
  assert.equal(site.private, true);
  assert.deepEqual(Object.keys(site.scripts).sort(), [
    'build',
    'check',
    'dev',
    'preview',
  ]);
  for (const name of SHARED_DEPENDENCIES)
    assert.equal(site.dependencies[name], root.dependencies[name], name);
  for (const name of SHARED_DEV_DEPENDENCIES)
    assert.equal(site.devDependencies[name], root.devDependencies[name], name);
});

test('site.config.json sets the cloudflare target and names its own Pages project on the main branch', () => {
  const sitesDir = freshSites();
  scaffoldSite({ slug: 'cafe-bar', sitesDir });
  assert.deepEqual(readJson(join(sitesDir, 'cafe-bar/site.config.json')), {
    target: 'cloudflare',
    cloudflare: { pagesProject: 'cafe-bar', productionBranch: 'main' },
  });
});

test('the placeholder page is noindex, uses the given language and escapes its text', () => {
  const sitesDir = freshSites();
  scaffoldSite({
    slug: 'cafeteria',
    sitesDir,
    title: 'Cafe "Uno" <b>',
    lang: 'es',
    message: 'En construcción.',
  });
  const page = readFileSync(
    join(sitesDir, 'cafeteria/src/pages/index.astro'),
    'utf8',
  );
  assert.match(page, /\bnoindex\b/);
  assert.match(page, /const lang = 'es';/);
  assert.match(page, /const title = 'Cafe "Uno" <b>';/);
  assert.equal(jsString("it's a \\ b"), "'it\\'s a \\\\ b'");
  assert.match(page, /En construcción\./);
});

test('the default 404 page is noindex, uses the language, links home and escapes its text', () => {
  const sitesDir = freshSites();
  scaffoldSite({ slug: 'cafeteria', sitesDir, title: 'Cafe "Uno" <b>' });
  scaffoldSite({ slug: 'cafe-es', sitesDir, lang: 'es' });
  scaffoldSite({ slug: 'cafe-fr', sitesDir, lang: 'fr' });
  const read = (slug) =>
    readFileSync(join(sitesDir, slug, 'src/pages/404.astro'), 'utf8');
  const en = read('cafeteria');
  assert.match(
    en,
    /import BaseLayout from '\.\.\/layouts\/BaseLayout\.astro';/,
  );
  assert.match(en, /\bnoindex\b/);
  assert.match(en, /const lang = 'en';/);
  assert.match(en, /const title = 'Page not found \| Cafe "Uno" <b>';/);
  assert.match(en, /href="\/"/);
  assert.match(en, /Back to the home page/);
  const es = read('cafe-es');
  assert.match(es, /const lang = 'es';/);
  assert.match(es, /Página no encontrada \| cafe-es/);
  assert.match(es, /Volver al inicio/);
  // Other language tags fall back to English text but keep the tag.
  const fr = read('cafe-fr');
  assert.match(fr, /const lang = 'fr';/);
  assert.match(fr, /Back to the home page/);
});

test('the copied stylesheet drops the root-only source exclusions', () => {
  const sitesDir = freshSites();
  scaffoldSite({ slug: 'cafeteria', sitesDir });
  const css = readFileSync(
    join(sitesDir, 'cafeteria/src/styles/global.css'),
    'utf8',
  );
  assert.ok(!css.includes('@source'));
  assert.ok(!css.includes('Root-only'));
  assert.ok(!/\n{3,}/.test(css));
  assert.equal(
    stripRootOnlyCss(
      "@import 'x';\n\n/* Root-only: a\n */\n@source not '../a';\n\nbody {}\n",
    ),
    "@import 'x';\n\nbody {}\n",
  );
});

test('an existing folder is refused and left untouched', () => {
  const sitesDir = freshSites();
  const existing = join(sitesDir, 'cafeteria');
  mkdirSync(existing);
  writeFileSync(join(existing, 'keep.txt'), 'x');
  assert.throws(
    () => scaffoldSite({ slug: 'cafeteria', sitesDir }),
    /already exists/,
  );
  assert.ok(!existsSync(join(existing, 'package.json')));
  // Even a folder with only docs is refused without the explicit flag.
  const docsOnly = join(sitesDir, 'docs-only');
  mkdirSync(docsOnly);
  writeFileSync(join(docsOnly, 'PROPOSAL.md'), 'plan');
  assert.throws(
    () => scaffoldSite({ slug: 'docs-only', sitesDir }),
    /already exists/,
  );
  assert.ok(!existsSync(join(docsOnly, 'package.json')));
});

test('an invalid slug is refused and creates nothing', () => {
  const sitesDir = freshSites();
  assert.throws(() => scaffoldSite({ slug: '../evil', sitesDir }), /slug/i);
  assert.throws(() => scaffoldSite({ slug: 'Bad Slug', sitesDir }), /slug/i);
  assert.deepEqual(
    spawnSync('ls', [sitesDir], { encoding: 'utf8' }).stdout.trim(),
    '',
  );
});

test('--allow-existing-docs scaffolds around planning docs and never overwrites them', () => {
  const sitesDir = freshSites();
  const site = join(sitesDir, 'panaderia');
  mkdirSync(site);
  writeFileSync(join(site, 'PROPOSAL.md'), 'my proposal');
  writeFileSync(join(site, 'README.md'), 'my readme');
  const { created, kept } = scaffoldSite({
    slug: 'panaderia',
    sitesDir,
    allowExistingDocs: true,
  });
  assert.deepEqual(kept, ['PROPOSAL.md', 'README.md']);
  assert.ok(created.includes('package.json'));
  assert.ok(created.includes('CREDITS.md'));
  assert.ok(!created.includes('README.md'));
  assert.equal(readFileSync(join(site, 'PROPOSAL.md'), 'utf8'), 'my proposal');
  assert.equal(readFileSync(join(site, 'README.md'), 'utf8'), 'my readme');
  // The templates that were not there are still written.
  assert.ok(created.includes('RUN.md'));
  assert.ok(created.includes('assets.json'));
});

test('--allow-existing-docs still refuses folders with anything but top-level Markdown', () => {
  const sitesDir = freshSites();
  const withCode = join(sitesDir, 'a');
  mkdirSync(withCode);
  writeFileSync(join(withCode, 'index.js'), '');
  assert.throws(
    () => scaffoldSite({ slug: 'a', sitesDir, allowExistingDocs: true }),
    /other than Markdown/,
  );
  const withDir = join(sitesDir, 'b');
  mkdirSync(join(withDir, 'src'), { recursive: true });
  assert.throws(
    () => scaffoldSite({ slug: 'b', sitesDir, allowExistingDocs: true }),
    /other than Markdown/,
  );
  assert.ok(!existsSync(join(withCode, 'package.json')));
  assert.ok(!existsSync(join(withDir, 'package.json')));
});

test('--allow-existing-docs keeps a brief.json and its assets/ folder untouched', () => {
  const sitesDir = freshSites();
  const site = join(sitesDir, 'tienda');
  mkdirSync(join(site, 'assets'), { recursive: true });
  writeFileSync(join(site, 'brief.json'), '{"keep":"me"}');
  writeFileSync(join(site, 'assets/logo.webp'), 'binary-ish');
  const { created, kept } = scaffoldSite({
    slug: 'tienda',
    sitesDir,
    allowExistingDocs: true,
  });
  assert.deepEqual(kept, ['assets/logo.webp', 'brief.json']);
  assert.ok(created.includes('package.json'));
  assert.equal(readFileSync(join(site, 'brief.json'), 'utf8'), '{"keep":"me"}');
  assert.equal(
    readFileSync(join(site, 'assets/logo.webp'), 'utf8'),
    'binary-ish',
  );
});

test('--allow-existing-docs refuses assets/ without a brief, naming it, and changes nothing', () => {
  const sitesDir = freshSites();
  const site = join(sitesDir, 'sinbrief');
  mkdirSync(join(site, 'assets'), { recursive: true });
  writeFileSync(join(site, 'assets/logo.webp'), 'x');
  assert.throws(
    () => scaffoldSite({ slug: 'sinbrief', sitesDir, allowExistingDocs: true }),
    /\(assets\)/,
  );
  assert.ok(!existsSync(join(site, 'package.json')));
  // A brief does not make other folders acceptable.
  const other = join(sitesDir, 'otro');
  mkdirSync(join(other, 'src'), { recursive: true });
  writeFileSync(join(other, 'brief.json'), '{}');
  assert.throws(
    () => scaffoldSite({ slug: 'otro', sitesDir, allowExistingDocs: true }),
    /\(src\)/,
  );
  // `assets` as a file is not the assets folder.
  const asFile = join(sitesDir, 'archivo');
  mkdirSync(asFile);
  writeFileSync(join(asFile, 'brief.json'), '{}');
  writeFileSync(join(asFile, 'assets'), 'x');
  assert.throws(
    () => scaffoldSite({ slug: 'archivo', sitesDir, allowExistingDocs: true }),
    /\(assets\)/,
  );
});

test('a scaffolded site carries the hardened starter: script CSP config, HSTS and COOP, and it builds with a CSP meta tag', async () => {
  // Scaffolded under .cache/ (ignored by git) so node resolves astro from the repo's node_modules; removed afterwards.
  const sitesDir = join(ROOT, '.cache', `new-site-test-${process.pid}`);
  mkdirSync(sitesDir, { recursive: true });
  try {
    scaffoldSite({ slug: 'hardened', sitesDir });
    const site = join(sitesDir, 'hardened');
    assert.match(
      readFileSync(join(site, 'astro.config.mjs'), 'utf8'),
      /security:\s*{\s*(\/\/[^\n]*\n\s*)*csp:/,
    );
    const headers = readFileSync(join(site, 'public/_headers'), 'utf8');
    assert.match(headers, /^\s*Strict-Transport-Security: max-age=31536000$/m);
    assert.match(headers, /^\s*Cross-Origin-Opener-Policy: same-origin$/m);
    assert.match(headers, /frame-ancestors 'self'/);
    await build(site);
    const html = readFileSync(join(site, 'dist/index.html'), 'utf8');
    const meta =
      /<meta http-equiv="content-security-policy" content="([^"]+)"/.exec(html);
    assert.ok(meta, 'the built home page has a CSP meta tag');
    assert.match(meta[1], /script-src 'self' 'sha256-/);
    assert.ok(!/script-src[^;]*'unsafe-inline'/.test(meta[1]));
    assert.match(
      readFileSync(join(site, 'dist/_headers'), 'utf8'),
      /Strict-Transport-Security/,
    );
    // The default 404 page is built (the landing report's 404 item needs dist/404.html), noindex and linking home.
    const notFound = readFileSync(join(site, 'dist/404.html'), 'utf8');
    assert.match(notFound, /<meta name="robots" content="noindex"/);
    assert.match(notFound, /<html lang="en"/);
    assert.match(notFound, /<a href="\/"/);
  } finally {
    rmSync(sitesDir, { recursive: true, force: true });
  }
});

test('the CLI exits non-zero for a bad slug and prints help with --help', () => {
  const bad = spawnSync(
    process.execPath,
    ['scripts/new-site.mjs', 'Bad Slug'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Invalid slug/);
  const help = spawnSync(process.execPath, ['scripts/new-site.mjs', '--help'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--allow-existing-docs/);
  assert.ok(!existsSync(join(ROOT, 'sites/Bad Slug')));
});

test('a scaffolded site is already Prettier-formatted', () => {
  const sitesDir = freshSites();
  scaffoldSite({
    slug: 'cafeteria',
    sitesDir,
    title: 'Café Uno — pan y café',
    lang: 'es',
    message: 'Volvemos pronto.',
  });
  const prettier = join(ROOT, 'node_modules/prettier/bin/prettier.cjs');
  const r = spawnSync(
    process.execPath,
    [
      prettier,
      '--config',
      join(ROOT, '.prettierrc.json'),
      '--check',
      join(sitesDir, 'cafeteria'),
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('LANDING_FACTORY_ROOT moves only where the site is created, never touching the real sites/', () => {
  const root = mkdtempSync(join(tmp, 'factory-'));
  const r = spawnSync(
    process.execPath,
    ['scripts/new-site.mjs', 'zz-env-root'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, LANDING_FACTORY_ROOT: root },
    },
  );
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(root, 'sites/zz-env-root/PROPOSAL.md')));
  assert.ok(existsSync(join(root, 'sites/zz-env-root/src/styles/tokens.css')));
  assert.ok(!existsSync(join(ROOT, 'sites/zz-env-root')));
});
