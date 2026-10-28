// SEO markup in a real site: scaffold with new-site, set `site`, build, and check dist/sitemap.xml, dist/robots.txt,
// the Open Graph tags and the escaped JSON-LD block. Scaffolded under .cache/ (ignored by git) so node resolves
// astro from the repo's node_modules; removed afterwards.
import assert from 'node:assert/strict';
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { scaffoldSite } from '../scripts/new-site.mjs';
import { build } from '../scripts/qa/server.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const base = join(ROOT, '.cache', `seo-site-test-${process.pid}`);
const slug = 'zz-seo';
const siteDir = join(base, 'sites', slug);
const src = (rel) => join(siteDir, 'src', rel);
const dist = (rel) => readFileSync(join(siteDir, 'dist', rel), 'utf8');

const HOME = `---
import BaseLayout from '../layouts/BaseLayout.astro';
const jsonLd = { '@context': 'https://schema.org', '@type': 'Dentist', name: 'Clinic </script><b>x</b> & "Co"' };
---

<BaseLayout title="Clinic" description="A clinic." lang="en" jsonLd={jsonLd}>
  <h1>Clinic</h1>
</BaseLayout>
`;
const LAB = `---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Lab" description="A lab." noindex><h1>Lab</h1></BaseLayout>
`;

before(() => {
  rmSync(base, { recursive: true, force: true });
  mkdirSync(join(base, 'sites'), { recursive: true });
  scaffoldSite({ slug, sitesDir: join(base, 'sites'), title: 'Clinic' });
  writeFileSync(join(base, 'package-lock.json'), '{}\n');
  const config = join(siteDir, 'astro.config.mjs');
  writeFileSync(
    config,
    readFileSync(config, 'utf8').replace(
      "output: 'static',",
      "output: 'static',\n  site: 'https://example.com',",
    ),
  );
  writeFileSync(src('pages/index.astro'), HOME);
  writeFileSync(src('pages/lab.astro'), LAB);
  mkdirSync(src('pages/directions'), { recursive: true });
  writeFileSync(
    src('pages/directions/a.astro'),
    HOME.replace('../layouts', '../../layouts'),
  );
});
after(() => rmSync(base, { recursive: true, force: true }));

test('new-site copies robots.txt and the config that writes the sitemap', () => {
  assert.ok(existsSync(join(siteDir, 'public/robots.txt')));
  assert.match(
    readFileSync(join(siteDir, 'astro.config.mjs'), 'utf8'),
    /seoFiles\(\)/,
  );
});

test('the sitemap lists the indexable pages with absolute URLs and no noindex page, 404 or direction page', async () => {
  await build(siteDir);
  const xml = dist('sitemap.xml');
  assert.match(xml, /<loc>https:\/\/example\.com\/<\/loc>/);
  assert.ok(!xml.includes('/lab/'), 'noindex page listed');
  assert.ok(!xml.includes('404'), '404 listed');
  assert.ok(!xml.includes('/directions/'), 'direction page listed');
});

test('robots.txt keeps its rules and gets the absolute Sitemap line', () => {
  const robots = dist('robots.txt');
  assert.match(robots, /User-agent: \*\nAllow: \//);
  assert.match(robots, /^Sitemap: https:\/\/example\.com\/sitemap\.xml$/m);
});

test('Open Graph and Twitter tags are written, and JSON-LD stays inside its block', () => {
  const html = dist('index.html');
  for (const tag of [
    'og:title',
    'og:description',
    'og:url" content="https://example.com/',
    'og:type" content="website',
    'og:locale" content="en',
  ])
    assert.ok(html.includes(`property="${tag}`), tag);
  assert.match(html, /name="twitter:card" content="summary"/);
  const blocks = [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ];
  assert.equal(blocks.length, 1);
  assert.ok(!blocks[0][1].includes('<'), 'a raw < inside the block');
  const data = JSON.parse(blocks[0][1]);
  assert.equal(data.name, 'Clinic </script><b>x</b> & "Co"');
  assert.equal(data['@type'], 'Dentist');
});
