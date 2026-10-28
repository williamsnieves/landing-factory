// The seo area of the landing report (unit helpers and every item's pass, warn and fail cases), run against the
// clean fixture site with mutated pages. Fixtures are built at test time.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { GROUPS } from '../scripts/landing-report.mjs';
import { resolveReportConfig } from '../scripts/report/config.mjs';
import {
  containsKeyword,
  normalizeText,
  parseRobots,
} from '../scripts/report/seo.mjs';
import { itemOf, makeSite, runReport, statusOf } from './report-fixture.mjs';

const sites = [];
const site = () => {
  const s = makeSite();
  sites.push(s);
  return s;
};
after(() => sites.forEach((s) => s.cleanup()));

const ONLY = ['--only', 'static', '--skip', 'audit'];
const run = (s, args = []) => runReport(s, [...ONLY, ...args]);
const page = (s, rel, mutate) =>
  s.write(rel, mutate(readFileSync(join(s.siteDir, rel), 'utf8')));
const addToHead = (s, html, rel = 'dist/index.html') =>
  page(s, rel, (text) => text.replace('</head>', `${html}</head>`));
const setTitle = (s, title, rel = 'dist/index.html') =>
  page(s, rel, (text) =>
    text.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`),
  );
const setBrief = (s, brief) =>
  s.write('brief.json', JSON.stringify({ version: 1, ...brief }));
const jsonLd = (data, raw) =>
  `<script type="application/ld+json">${raw ?? JSON.stringify(data)}</script>`;

// --- helpers ----------------------------------------------------------------------------------------------

test('keyword matching ignores case and accents and accepts the long words of the phrase', () => {
  assert.equal(
    normalizeText('Valoración, de VIVIENDA!'),
    'valoracion de vivienda',
  );
  assert.ok(
    containsKeyword(
      'Valoracion de Vivienda en Valencia',
      'valoración de vivienda',
    ),
  );
  assert.ok(
    containsKeyword('Vivienda: tu valoración gratis', 'valoración de vivienda'),
  );
  assert.ok(!containsKeyword('Vender tu piso', 'valoración de vivienda'));
  assert.ok(!containsKeyword('anything', ''));
  // A phrase of short words needs the whole phrase.
  assert.ok(containsKeyword('sin ir a la web', 'ir a'));
  assert.ok(!containsKeyword('iris a', 'ir a'));
});

test('robots.txt groups: agents, rules and sitemap lines', () => {
  const { groups, sitemaps } = parseRobots(
    'User-agent: Googlebot\nUser-agent: *\nDisallow: /\n# c\nUser-agent: bad\nAllow: /\nSitemap: https://a.example/sitemap.xml\n',
  );
  assert.deepEqual(groups[0].agents, ['googlebot', '*']);
  assert.deepEqual(groups[0].rules, [['disallow', '/']]);
  assert.equal(groups.length, 2);
  assert.deepEqual(sitemaps, ['https://a.example/sitemap.xml']);
});

test('report.seo has defaults, is validated and seo is a skippable group', () => {
  assert.deepEqual(resolveReportConfig().seo, {
    titleMin: 30,
    titleMax: 60,
    descriptionMin: 70,
    descriptionMax: 160,
  });
  assert.throws(
    () =>
      resolveReportConfig({ seo: { titleMin: 70, titleMax: 60, extra: 1 } }),
    /report\.seo\.extra[\s\S]*report\.seo\.titleMin/,
  );
  assert.ok(GROUPS.includes('seo'));
});

// --- items ------------------------------------------------------------------------------------------------

test('--skip seo removes the area and the Markdown section; otherwise the section follows Legal', async () => {
  const s = site();
  const skipped = await run(s, ['--skip', 'audit,seo']);
  assert.ok(!skipped.report.items.some((i) => i.area === 'seo'));
  assert.ok(
    !readFileSync(join(skipped.outDir, 'report.md'), 'utf8').includes('## SEO'),
  );
  const full = await run(s);
  const ids = full.report.items
    .filter((i) => i.area === 'seo')
    .map((i) => i.id);
  assert.deepEqual(ids, [
    'seo-title',
    'seo-description',
    'seo-h1',
    'seo-canonical',
    'seo-open-graph',
    'seo-structured-data',
    'seo-sitemap',
    'seo-robots',
    'seo-keyword',
  ]);
  const md = readFileSync(join(full.outDir, 'report.md'), 'utf8');
  assert.ok(md.indexOf('## SEO') > md.indexOf('## Legal'));
  assert.match(
    md,
    /## SEO\n\n\d+ fail, \d+ warn, \d+ pass, \d+ n\/a over the indexable pages/,
  );
});

test('the clean fixture passes every seo item (the keyword item needs a brief) and exits 0', async () => {
  const s = site();
  const { report, code } = await run(s);
  assert.equal(code, 0);
  const seo = report.items.filter((i) => i.area === 'seo');
  assert.equal(seo.length, 9);
  for (const item of seo)
    assert.equal(
      item.status,
      item.id === 'seo-keyword' ? 'na' : 'pass',
      JSON.stringify(item),
    );
});

test('seo-title: a 75 character title warns with the length and the limit, a missing one fails', async () => {
  const s = site();
  setTitle(s, 'x'.repeat(75));
  let { report } = await run(s);
  assert.equal(statusOf(report, 'seo-title'), 'warn');
  assert.match(
    itemOf(report, 'seo-title').evidence[0],
    /75 characters, limit 30 to 60/,
  );
  setTitle(s, 'short');
  ({ report } = await run(s));
  assert.equal(statusOf(report, 'seo-title'), 'warn');
  page(s, 'dist/index.html', (t) => t.replace(/<title>[\s\S]*?<\/title>/, ''));
  ({ report } = await run(s));
  assert.equal(statusOf(report, 'seo-title'), 'fail');
  assert.match(itemOf(report, 'seo-title').evidence[0], /^\/: no title/);
});

test('seo-description: missing fails, too short or too long warns', async () => {
  const meta = (text) => `<meta name="description" content="${text}" />`;
  const status = async (value) => {
    const s = site();
    page(s, 'dist/index.html', (t) =>
      t.replace(/<meta\s+name="description"[\s\S]*?\/>/, value),
    );
    const { report } = await run(s);
    return report;
  };
  assert.equal(statusOf(await status(''), 'seo-description'), 'fail');
  assert.equal(
    statusOf(await status(meta('short')), 'seo-description'),
    'warn',
  );
  const long = await status(meta('d'.repeat(170)));
  assert.equal(statusOf(long, 'seo-description'), 'warn');
  assert.match(
    itemOf(long, 'seo-description').evidence[0],
    /170 characters, limit 70 to 160/,
  );
});

test('seo-h1: none and two both warn', async () => {
  const s = site();
  page(s, 'dist/index.html', (t) =>
    t.replace('<h1>Fixture landing</h1>', '<h1>A</h1><h1>B</h1>'),
  );
  let { report } = await run(s);
  assert.equal(statusOf(report, 'seo-h1'), 'warn');
  assert.match(itemOf(report, 'seo-h1').evidence.join('\n'), /\/: 2 h1/);
  page(s, 'dist/index.html', (t) => t.replace('<h1>A</h1><h1>B</h1>', ''));
  ({ report } = await run(s));
  assert.match(itemOf(report, 'seo-h1').evidence.join('\n'), /\/: 0 h1/);
});

test('seo-canonical: a relative canonical and a missing one warn', async () => {
  const s = site();
  page(s, 'dist/index.html', (t) =>
    t.replace('href="https://fixture.example/"', 'href="/"'),
  );
  let { report } = await run(s);
  assert.equal(statusOf(report, 'seo-canonical'), 'warn');
  assert.match(
    itemOf(report, 'seo-canonical').evidence.join('\n'),
    /relative canonical/,
  );
  page(s, 'dist/about/index.html', (t) =>
    t.replace(/<link rel="canonical"[^>]*>/, ''),
  );
  ({ report } = await run(s));
  assert.match(
    itemOf(report, 'seo-canonical').evidence.join('\n'),
    /\/about\/: no canonical link/,
  );
});

test('seo-open-graph: warns for missing tags', async () => {
  const s = site();
  page(s, 'dist/about/index.html', (t) =>
    t
      .replace(/<meta property="og:image"[^>]*>/, '')
      .replace(/<meta name="twitter:card"[^>]*>/, ''),
  );
  const { report } = await run(s);
  assert.equal(statusOf(report, 'seo-open-graph'), 'warn');
  assert.match(
    itemOf(report, 'seo-open-graph').evidence[0],
    /\/about\/: missing og:image, twitter:card/,
  );
});

const withoutJsonLd = (s) =>
  page(s, 'dist/index.html', (t) =>
    t.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ''),
  );

test('seo-structured-data: none warns, invalid JSON fails naming the page, a wrong type warns', async () => {
  const s = site();
  withoutJsonLd(s);
  let { report } = await run(s);
  assert.equal(statusOf(report, 'seo-structured-data'), 'warn');
  addToHead(s, jsonLd(null, '{"@type": "Dentist",'));
  ({ report } = await run(s));
  assert.equal(statusOf(report, 'seo-structured-data'), 'fail');
  assert.match(
    itemOf(report, 'seo-structured-data').evidence[0],
    /^\/:\d+: JSON-LD does not parse/,
  );

  const ok = site();
  setBrief(ok, { seo: { schemaType: 'Organization' } });
  ({ report } = await run(ok));
  assert.equal(statusOf(report, 'seo-structured-data'), 'pass');
  setBrief(ok, { seo: { schemaType: 'Bakery' } });
  ({ report } = await run(ok));
  assert.equal(statusOf(report, 'seo-structured-data'), 'warn');
  assert.match(itemOf(report, 'seo-structured-data').title, /Bakery/);
});

test('seo-structured-data: review or rating markup fails without reviews in the brief, nested in a graph too', async () => {
  const s = site();
  addToHead(
    s,
    jsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Dentist',
          name: 'A',
          aggregateRating: { '@type': 'AggregateRating', ratingValue: 5 },
        },
      ],
    }),
  );
  const { report, code } = await run(s);
  assert.equal(statusOf(report, 'seo-structured-data'), 'fail');
  assert.equal(code, 1);
  assert.match(
    itemOf(report, 'seo-structured-data').title,
    /Review or rating markup/,
  );
});

test('the inline script inventory and the CSP checks skip application/ld+json blocks', async () => {
  const s = site();
  withoutJsonLd(s);
  const before = (await run(s)).report;
  addToHead(s, jsonLd({ '@type': 'Dentist', name: 'A' }));
  const after_ = (await run(s)).report;
  assert.equal(
    statusOf(after_, 'inline-scripts'),
    statusOf(before, 'inline-scripts'),
  );
  assert.deepEqual(
    itemOf(after_, 'inline-scripts').evidence,
    itemOf(before, 'inline-scripts').evidence,
  );
  assert.equal(
    statusOf(after_, 'csp-scripts'),
    statusOf(before, 'csp-scripts'),
  );
});

test('seo-sitemap: missing and relative URLs warn, a noindex page listed fails', async () => {
  const s = site();
  const xml = (...locs) =>
    `<?xml version="1.0"?><urlset>${locs.map((l) => `<url><loc>${l}</loc></url>`).join('')}</urlset>`;
  s.remove('dist/sitemap.xml');
  let { report } = await run(s);
  assert.equal(statusOf(report, 'seo-sitemap'), 'warn');
  s.write('dist/sitemap.xml', xml('/', '/about/'));
  ({ report } = await run(s));
  assert.equal(statusOf(report, 'seo-sitemap'), 'warn');
  assert.match(itemOf(report, 'seo-sitemap').title, /relative/);
  s.write('dist/sitemap.xml', xml('https://fixture.example/'));
  ({ report } = await run(s));
  assert.equal(statusOf(report, 'seo-sitemap'), 'warn');
  assert.match(
    itemOf(report, 'seo-sitemap').evidence[0],
    /\/about\/ is indexable but not in sitemap/,
  );
  addToHead(
    s,
    '<meta name="robots" content="noindex" />',
    'dist/about/index.html',
  );
  s.write(
    'dist/sitemap.xml',
    xml('https://fixture.example/', 'https://fixture.example/about/'),
  );
  ({ report } = await run(s));
  assert.equal(statusOf(report, 'seo-sitemap'), 'fail');
  assert.match(
    itemOf(report, 'seo-sitemap').evidence[0],
    /\/about\/ is noindex/,
  );
});

test('noindex pages are skipped by the per-page items, and a site with only noindex pages is not applicable', async () => {
  const s = site();
  const noindex = '<meta name="robots" content="noindex" />';
  addToHead(s, noindex, 'dist/about/index.html');
  page(s, 'dist/about/index.html', (t) =>
    t.replace(/<title>[\s\S]*?<\/title>/, ''),
  );
  s.write(
    'dist/sitemap.xml',
    '<urlset><url><loc>https://fixture.example/</loc></url></urlset>',
  );
  let { report } = await run(s);
  assert.equal(statusOf(report, 'seo-title'), 'pass');
  assert.equal(statusOf(report, 'seo-sitemap'), 'pass');
  addToHead(s, noindex);
  ({ report } = await run(s));
  const seo = report.items.filter((i) => i.area === 'seo');
  assert.equal(seo.length, 9);
  assert.ok(seo.every((i) => i.status === 'na'));
});

test('seo-robots: missing warns, Disallow: / fails, no Sitemap line warns', async () => {
  const s = site();
  s.remove('dist/robots.txt');
  let { report } = await run(s);
  assert.equal(statusOf(report, 'seo-robots'), 'warn');
  s.write('dist/robots.txt', 'User-agent: *\nDisallow: /\n');
  ({ report } = await run(s));
  assert.equal(statusOf(report, 'seo-robots'), 'fail');
  s.write('dist/robots.txt', 'User-agent: *\nAllow: /\n');
  ({ report } = await run(s));
  assert.equal(statusOf(report, 'seo-robots'), 'warn');
});

test('seo-keyword: na without a brief keyword, warns when missing, passes with accents and case differences', async () => {
  const s = site();
  setBrief(s, { seo: { primaryKeyword: 'Valoración de vivienda' } });
  let { report } = await run(s);
  assert.equal(statusOf(report, 'seo-keyword'), 'warn');
  assert.match(
    itemOf(report, 'seo-keyword').title,
    /missing from the title, h1, description/,
  );
  setTitle(s, 'VALORACION de vivienda en Valencia, gratis y rapida');
  page(s, 'dist/index.html', (t) =>
    t.replace('<h1>Fixture landing</h1>', '<h1>Valoración de tu vivienda</h1>'),
  );
  page(s, 'dist/index.html', (t) =>
    t.replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      '<meta name="description" content="Conoce la valoración de tu vivienda en minutos." />',
    ),
  );
  ({ report } = await run(s));
  assert.equal(
    statusOf(report, 'seo-keyword'),
    'pass',
    JSON.stringify(itemOf(report, 'seo-keyword')),
  );
});

test('every seo item that warns or fails carries a fix naming where to change it', async () => {
  const s = site();
  s.remove('dist/robots.txt');
  s.remove('dist/sitemap.xml');
  withoutJsonLd(s);
  setTitle(s, 'x');
  const { report } = await run(s);
  const flagged = report.items.filter(
    (i) => i.area === 'seo' && ['warn', 'fail'].includes(i.status),
  );
  assert.ok(flagged.length >= 4);
  for (const item of flagged) assert.ok(item.fix, item.id);
});
