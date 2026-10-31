// A prospect landing in a real site: scaffold with new-site, write prospect.json from the brief, build and read dist/;
// then mark it sold and rebuild. Scaffolded under .cache/ (ignored by git) so node resolves astro from the repo's
// node_modules; removed afterwards.
import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkProspect } from '../scripts/check-landing.mjs';
import { scaffoldSite } from '../scripts/new-site.mjs';
import { main as prospectMain } from '../scripts/prospect.mjs';
import { build } from '../scripts/qa/server.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const base = join(ROOT, '.cache', `prospect-site-test-${process.pid}`);
const slug = 'zz-prospect';
const siteDir = join(base, 'sites', slug);
const src = (rel) => join(siteDir, 'src', rel);
const dist = (rel) => readFileSync(join(siteDir, 'dist', rel), 'utf8');
const quiet = { log() {}, error() {} };
const prospect = (...args) => prospectMain(args, quiet, base);

const page = (title, lang) => `---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="${title}" description="Test page." lang="${lang}">
  <h1>${title}</h1>
</BaseLayout>
`;

before(() => {
  rmSync(base, { recursive: true, force: true });
  mkdirSync(siteDir, { recursive: true });
  cpSync(
    join(ROOT, 'tests/fixtures/prospect/brief.json'),
    join(siteDir, 'brief.json'),
  );
  scaffoldSite({
    slug,
    sitesDir: join(base, 'sites'),
    allowExistingDocs: true,
    title: 'Clínica Dental Alameda',
    lang: 'es',
  });
  writeFileSync(join(base, 'package-lock.json'), '{}\n');
  writeFileSync(src('pages/index.astro'), page('Clínica Dental Alameda', 'es'));
  writeFileSync(src('pages/servicios.astro'), page('Servicios', 'es'));
  writeFileSync(src('pages/en.astro'), page('Services', 'en'));
});
after(() => rmSync(base, { recursive: true, force: true }));

test('new-site copies the prospect notice and nothing else of the feature', () => {
  for (const file of ['ProspectNotice.astro', 'texts.ts'])
    assert.ok(existsSync(src(`components/prospect/${file}`)), file);
  assert.equal(existsSync(src('data/prospect.json')), false);
});

test('a site without prospect.json builds as before: indexable, no notice, no header, sitemap with its pages', async () => {
  await build(siteDir);
  assert.ok(!dist('servicios/index.html').includes('data-prospect-notice'));
  assert.doesNotMatch(dist('servicios/index.html'), /name="robots"/);
  assert.ok(!dist('_headers').includes('X-Robots-Tag'));
  assert.match(dist('sitemap.xml'), /<url>/);
});

test('a prospect site is noindex with the notice in the page language, an empty sitemap and the header', async () => {
  assert.equal(prospect('write', '--site', slug), 0);
  await build(siteDir);
  const pages = ['index.html', 'servicios/index.html', 'en/index.html'];
  for (const file of pages) {
    const html = dist(file);
    assert.match(html, /<meta name="robots" content="noindex"/, file);
    assert.match(html, /<p role="note" data-prospect-notice/, file);
    assert.match(html, /<main[^>]*>\s*<p role="note"/, file);
    assert.ok(html.includes('Clínica Dental Alameda'), file);
  }
  assert.ok(
    dist('index.html').includes(
      'Propuesta de diseño preparada para Clínica Dental Alameda. No es su web oficial.',
    ),
  );
  assert.ok(
    dist('en/index.html').includes(
      'Design proposal prepared for Clínica Dental Alameda. This is not its official website.',
    ),
  );
  assert.doesNotMatch(dist('sitemap.xml'), /<url>/);
  assert.match(dist('_headers'), /\/\*\n {2}X-Robots-Tag: noindex\n$/);
  assert.match(dist('robots.txt'), /Allow: \//);
  // the original header rules are still there
  assert.match(dist('_headers'), /X-Content-Type-Options: nosniff/);
  // the final check's page, sitemap and header rules pass on the real build
  assert.deepEqual(checkProspect(siteDir), []);
});

test('after sold and a rebuild the pages are indexable again and show no notice', async () => {
  assert.equal(prospect('sold', '--site', slug), 0);
  await build(siteDir);
  for (const file of ['index.html', 'servicios/index.html', 'en/index.html']) {
    const html = dist(file);
    assert.doesNotMatch(html, /name="robots"/, file);
    assert.ok(!html.includes('data-prospect-notice'), file);
  }
  assert.match(dist('sitemap.xml'), /<url>/);
  assert.ok(!dist('_headers').includes('X-Robots-Tag'));
  assert.deepEqual(checkProspect(siteDir), []);
});
