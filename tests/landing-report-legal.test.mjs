// The legal area of the landing report: rules (unit), cookies and trackers, third-party hosts, legal pages
// per market and price claims, run against the clean fixture site with mutated pages.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  classifyHost,
  classifyName,
  isEuMarket,
  rulesForMarkets,
  ruleFor,
  validateLegalConfig,
} from '../scripts/report/legal-rules.mjs';
import { htmlText } from '../scripts/report/legal.mjs';
import { LEGAL_NOTE } from '../scripts/report/legal.mjs';
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
const addToBody = (s, html, rel = 'dist/index.html') =>
  page(s, rel, (text) => text.replace('</main>', `${html}</main>`));
const addToHead = (s, html, rel = 'dist/index.html') =>
  page(s, rel, (text) => text.replace('</head>', `${html}</head>`));
const qaOf = (s) => JSON.parse(readFileSync(s.qaFile, 'utf8'));
const writeQa = (s, mutate) => {
  const qa = qaOf(s);
  mutate(qa);
  writeFileSync(s.qaFile, JSON.stringify(qa));
};
const privacy = (over = {}) => ({
  viewport: 1440,
  cookies: [],
  storage: { local: [], session: [] },
  thirdPartyHosts: [],
  ...over,
});

// --- 3.1 rules ---------------------------------------------------------------------------------------------

test('host matching: subdomains match, a privacy-enhanced domain and look-alikes do not', () => {
  assert.equal(
    classifyHost('https://www.youtube.com/embed/abc')?.category,
    'embed',
  );
  assert.equal(
    classifyHost('https://www.youtube-nocookie.com/embed/abc'),
    null,
  );
  assert.equal(classifyHost('https://notyoutube.com/x'), null);
  assert.equal(
    classifyHost('https://www.googletagmanager.com/gtag/js?id=G-1')?.category,
    'analytics',
  );
  assert.equal(
    classifyHost('//static.ads-twitter.com/uwt.js')?.category,
    'advertising',
  );
  assert.equal(
    classifyHost('https://fonts.googleapis.com/css2?family=x')?.category,
    'cdn',
  );
  assert.equal(
    classifyHost('https://plausible.io/js/script.js')?.category,
    'cookieless',
  );
  // Path rules: facebook.com/tr is a pixel, the rest of facebook.com is not a tracker load.
  assert.equal(
    classifyHost('https://www.facebook.com/tr?id=1')?.category,
    'advertising',
  );
  assert.equal(classifyHost('https://www.facebook.com/page'), null);
  assert.equal(
    classifyHost('https://www.google.com/maps/embed?pb=1')?.category,
    'embed',
  );
  assert.equal(classifyHost('https://www.google.com/search?q=x'), null);
  // Vimeo with do-not-track sets no cookie before playback.
  assert.equal(classifyHost('https://player.vimeo.com/video/1?dnt=1'), null);
  assert.equal(
    classifyHost('https://player.vimeo.com/video/1')?.category,
    'embed',
  );
  // The config extends the list and wins over the built-in one.
  assert.equal(
    classifyHost('https://stats.example.org/a.js', [
      { host: 'example.org', category: 'analytics' },
    ])?.category,
    'analytics',
  );
});

test('cookie and storage classification: known trackers, the allow list and unknown names', () => {
  for (const name of [
    '_ga',
    '_ga_ABC123',
    '_gid',
    '_fbp',
    '_hjSessionUser_1',
    'IDE',
    '_clck',
  ])
    assert.equal(classifyName(name), 'non-essential', name);
  assert.equal(
    classifyName('__cf_bm', ['__cf_bm', 'cf_clearance']),
    'essential',
  );
  assert.equal(
    classifyName('cf_clearance', ['__cf_bm', 'cf_clearance']),
    'essential',
  );
  assert.equal(classifyName('app_*', []), 'unknown');
  assert.equal(classifyName('app_theme', ['app_*']), 'essential');
  assert.equal(classifyName('theme'), 'unknown');
});

test('market rule sets: ES, EU, an EU member counted as EU, and no rule set for US', () => {
  assert.deepEqual(ruleFor('ES').pages, ['privacy', 'notice']);
  assert.ok(isEuMarket('EU') && isEuMarket('DE') && isEuMarket('ES'));
  assert.ok(!isEuMarket('US') && !isEuMarket('GB'));
  assert.deepEqual(ruleFor('DE').pages, ['privacy']);
  assert.equal(ruleFor('US'), null);
  const es = rulesForMarkets(['ES']);
  assert.deepEqual(es.pages, ['notice', 'privacy']);
  assert.deepEqual(es.holder, ['name', 'taxId', 'address', 'email']);
  const mixed = rulesForMarkets(['DE', 'US']);
  assert.deepEqual(mixed.covered, ['DE']);
  assert.deepEqual(mixed.unknown, ['US']);
  assert.equal(mixed.emailOrPrivacyContact, true);
  assert.deepEqual(rulesForMarkets(['US']).pages, []);
});

test('the legal config section validates: unknown keys and bad trackers are named', () => {
  assert.deepEqual(
    validateLegalConfig({
      essentialCookies: [],
      essentialStorageKeys: [],
      trackers: [{ host: 'x.org', category: 'analytics' }],
    }),
    [],
  );
  const errors = validateLegalConfig({
    essentialCookies: [1],
    essentialStorageKeys: [],
    trackers: [{ host: 'x.org', category: 'spy' }],
    extra: true,
  }).join('\n');
  assert.match(errors, /legal\.extra: unknown key/);
  assert.match(errors, /legal\.essentialCookies/);
  assert.match(errors, /legal\.trackers\[0\]\.category/);
});

// --- 3.2 cookies and third parties -------------------------------------------------------------------------

test('a clean page passes legal-cookies and says no banner is needed (with a fresh QA record)', async () => {
  const s = site();
  writeQa(s, (qa) => (qa.pages[0].privacy = privacy()));
  const { report, code } = await run(s);
  assert.equal(code, 0);
  assert.equal(statusOf(report, 'legal-cookies'), 'pass');
  assert.match(
    itemOf(report, 'legal-cookies').title,
    /no consent banner needed/,
  );
  assert.equal(statusOf(report, 'legal-third-party'), 'pass');
  assert.equal(statusOf(report, 'legal-price-claims'), 'pass');
});

test('an unconditional analytics script fails and names the page and the host', async () => {
  const s = site();
  addToBody(
    s,
    '<script src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script>',
  );
  const { report, code } = await run(s);
  assert.equal(code, 1);
  const item = itemOf(report, 'legal-cookies');
  assert.equal(item.status, 'fail');
  assert.ok(
    item.evidence.some(
      (e) => e.startsWith('/:') && e.includes('www.googletagmanager.com'),
    ),
  );
  assert.match(item.fix, /cookieless alternative/);
  assert.match(item.fix, /data-consent/);
});

test('an inline tag-manager snippet is found by the host in its text', async () => {
  const s = site();
  addToBody(
    s,
    `<script>(function(){var s=document.createElement('script');s.src='https://www.googletagmanager.com/gtm.js?id=GTM-X';document.head.appendChild(s)})()</script>`,
  );
  const { report } = await run(s);
  assert.equal(statusOf(report, 'legal-cookies'), 'fail');
});

test('a type="text/plain" data-consent script and a data-consent-src embed warn instead of failing', async () => {
  const s = site();
  addToBody(
    s,
    '<script type="text/plain" data-consent="analytics" src="https://www.googletagmanager.com/gtag/js?id=G-TEST"></script>' +
      '<div data-consent-src="https://www.youtube.com/embed/abc"></div>',
  );
  const { report } = await run(s);
  const item = itemOf(report, 'legal-cookies');
  assert.equal(item.status, 'warn');
  assert.ok(
    item.evidence.some(
      (e) => /inert until consent/.test(e) && e.includes('youtube.com'),
    ),
  );
  assert.match(item.fix, /consent mechanism/);
});

test('a privacy-enhanced video embed does not fail legal-cookies; a plain YouTube embed does', async () => {
  const s = site();
  addToBody(
    s,
    '<iframe src="https://www.youtube-nocookie.com/embed/abc" title="v"></iframe>',
  );
  const first = await run(s);
  assert.notEqual(statusOf(first.report, 'legal-cookies'), 'fail');
  assert.equal(statusOf(first.report, 'legal-third-party'), 'warn');
  addToBody(
    s,
    '<iframe src="https://www.youtube.com/embed/abc" title="v"></iframe>',
  );
  const second = await run(s);
  assert.equal(statusOf(second.report, 'legal-cookies'), 'fail');
});

test('a QA record with _ga at first load fails; values never appear in the report', async () => {
  const s = site();
  writeQa(
    s,
    (qa) =>
      (qa.pages[0].privacy = privacy({
        cookies: [
          {
            name: '_ga',
            domain: '.fixture.example',
            path: '/',
            session: false,
            thirdParty: false,
          },
        ],
      })),
  );
  const { report, outDir } = await run(s);
  const item = itemOf(report, 'legal-cookies');
  assert.equal(item.status, 'fail');
  assert.ok(
    item.evidence.some(
      (e) => e.includes('cookie _ga') && e.includes('before any consent'),
    ),
  );
  assert.ok(
    !readFileSync(join(outDir, 'report.json'), 'utf8').includes('COOKIEVALUE'),
  );
});

test('a storage key and a tracker host seen at runtime fail; an essential cookie passes; an unknown cookie warns', async () => {
  const s = site();
  writeQa(s, (qa) => {
    qa.pages[0].privacy = privacy({
      cookies: [
        {
          name: '__cf_bm',
          domain: '.fixture.example',
          path: '/',
          session: false,
          thirdParty: false,
        },
      ],
      storage: { local: ['amplitude_id'], session: [] },
    });
  });
  let r = await run(s);
  assert.equal(statusOf(r.report, 'legal-cookies'), 'fail');
  assert.ok(
    itemOf(r.report, 'legal-cookies').evidence.some((e) =>
      e.includes('localStorage key amplitude_id'),
    ),
  );
  assert.ok(
    !itemOf(r.report, 'legal-cookies').evidence.some((e) =>
      e.includes('__cf_bm'),
    ),
  );

  writeQa(s, (qa) => {
    qa.pages[0].privacy = privacy({
      cookies: [
        {
          name: 'sessionx',
          domain: 'fixture.example',
          path: '/',
          session: true,
          thirdParty: false,
        },
      ],
    });
  });
  r = await run(s);
  const unknown = itemOf(r.report, 'legal-cookies');
  assert.equal(unknown.status, 'warn');
  assert.ok(
    unknown.evidence.some(
      (e) => e.includes('sessionx') && /not classified/.test(e),
    ),
  );

  writeQa(s, (qa) => {
    qa.pages[0].privacy = privacy({ thirdPartyHosts: ['www.clarity.ms'] });
  });
  r = await run(s);
  assert.equal(statusOf(r.report, 'legal-cookies'), 'fail');
});

test('the config can allow a cookie and add a tracker host', async () => {
  const s = site();
  writeQa(s, (qa) => {
    qa.pages[0].privacy = privacy({
      cookies: [
        {
          name: 'sessionx',
          domain: 'fixture.example',
          path: '/',
          session: true,
          thirdParty: false,
        },
      ],
      thirdPartyHosts: ['stats.example.org'],
    });
  });
  writeFileSync(
    join(s.siteDir, 'qa.config.json'),
    JSON.stringify({
      legal: {
        essentialCookies: ['sessionx'],
        trackers: [{ host: 'example.org', category: 'analytics' }],
      },
    }),
  );
  const { report } = await run(s);
  const item = itemOf(report, 'legal-cookies');
  assert.equal(item.status, 'fail');
  assert.ok(item.evidence.some((e) => e.includes('stats.example.org')));
  assert.ok(!item.evidence.some((e) => e.includes('sessionx')));
});

test('a Google Fonts stylesheet warns about the IP address in legal-third-party', async () => {
  const s = site();
  addToHead(
    s,
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter" />',
  );
  const { report } = await run(s);
  const item = itemOf(report, 'legal-third-party');
  assert.equal(item.status, 'warn');
  assert.ok(
    item.evidence.some((e) =>
      e.startsWith('fonts.googleapis.com (font or CDN)'),
    ),
  );
  assert.match(item.fix, /Self-host/);
  assert.match(item.fix, /privacy policy/);
});

test('a stale or missing QA record makes the runtime part not run, never a pass', async () => {
  const s = site();
  writeQa(s, (qa) => {
    qa.pages[0].privacy = privacy();
    qa.finishedAt = '2000-01-01T00:00:00.000Z';
  });
  let r = await run(s);
  const item = itemOf(r.report, 'legal-cookies');
  assert.equal(item.status, 'not-run');
  assert.match(item.evidence.join('\n'), /older than the build: run QA first/);
  assert.equal(r.code, 0);

  // A fresh QA report without a privacy record is not a pass either.
  writeQa(s, (qa) => {
    delete qa.pages[0].privacy;
    qa.finishedAt = '2999-01-01T00:00:00.000Z';
  });
  r = await run(s);
  assert.equal(statusOf(r.report, 'legal-cookies'), 'not-run');
  assert.match(
    itemOf(r.report, 'legal-cookies').evidence.join('\n'),
    /no privacy record/,
  );

  // The build part still fails without a QA record.
  addToBody(s, '<script src="https://static.hotjar.com/c/hotjar.js"></script>');
  r = await run(s);
  assert.equal(statusOf(r.report, 'legal-cookies'), 'fail');
});

test('cookieless analytics passes legal-cookies and is listed for the privacy policy', async () => {
  const s = site();
  writeQa(s, (qa) => (qa.pages[0].privacy = privacy()));
  addToBody(
    s,
    '<script defer src="https://plausible.io/js/script.js"></script>',
  );
  const { report } = await run(s);
  const item = itemOf(report, 'legal-cookies');
  assert.equal(item.status, 'pass');
  assert.ok(item.evidence.some((e) => e.includes('plausible.io: cookieless')));
  assert.equal(statusOf(report, 'legal-third-party'), 'warn');
});

test('--skip legal removes the legal items; the Markdown has a Legal section with the not-legal-advice line', async () => {
  const s = site();
  const skipped = await run(s, ['--skip', 'audit,legal']);
  assert.ok(!skipped.report.items.some((i) => i.area === 'legal'));
  assert.ok(
    !readFileSync(join(skipped.outDir, 'report.md'), 'utf8').includes(
      '## Legal',
    ),
  );
  const full = await run(s);
  const ids = full.report.items
    .filter((i) => i.area === 'legal')
    .map((i) => i.id);
  assert.deepEqual(ids, [
    'legal-cookies',
    'legal-third-party',
    'legal-pages',
    'legal-price-claims',
  ]);
  const md = readFileSync(join(full.outDir, 'report.md'), 'utf8');
  assert.match(md, /## Legal/);
  assert.ok(md.includes('not legal advice'));
  assert.equal(full.report.legalNote, LEGAL_NOTE);
  // Items of the legal area carry no OWASP category.
  for (const item of full.report.items.filter((i) => i.area === 'legal'))
    assert.equal(item.owasp, null);
});

// --- 3.3 legal pages -----------------------------------------------------------------------------------------

const BRIEF = (legal = {}) => ({
  version: 1,
  language: 'es',
  business: { name: 'Taller Plantilla', description: 'x' },
  goal: { primary: { label: 'x' } },
  legal: {
    markets: ['ES'],
    holder: {
      name: 'Taller Plantilla S.L.',
      taxId: 'B00000000',
      address: 'Calle Ficticia 1, Valencia',
      email: 'hola@example.com',
      register: 'Registro Mercantil de Valencia',
    },
    privacyContact: 'privacidad@example.com',
    processing: { analytics: 'none', forms: false, embeds: [] },
    ...legal,
  },
});

const FOOTER =
  '<footer><a href="/aviso-legal/">Aviso legal</a> <a href="/privacidad/">Privacidad</a></footer>';
const noticeHtml = (extra = '') =>
  `<!doctype html><html lang="es"><head><title>Aviso legal</title></head><body><main><article data-legal-page="notice"><h1>Aviso legal</h1><dl><dd>Taller Plantilla S.L.</dd><dd>B00000000</dd><dd>Calle Ficticia 1, Valencia</dd><dd>hola@example.com</dd>${extra}</dl></article></main>${FOOTER}</body></html>`;
const privacyHtml = `<!doctype html><html lang="es"><head><title>Privacidad</title></head><body><main><article data-legal-page="privacy"><h1>Privacidad</h1><p>Taller Plantilla S.L.</p><p>privacidad@example.com</p></article></main>${FOOTER}</body></html>`;

/** A site whose pages all carry the footer and which has both legal pages, with the ES brief. */
function spanishSite(brief = BRIEF()) {
  const s = site();
  s.write('brief.json', JSON.stringify(brief));
  addToBody(s, FOOTER);
  addToBody(s, FOOTER, 'dist/about/index.html');
  s.write('dist/aviso-legal/index.html', noticeHtml());
  s.write('dist/privacidad/index.html', privacyHtml);
  return s;
}

test('ES with both pages, all data and the footer links on every page passes legal-pages', async () => {
  const s = spanishSite();
  const { report } = await run(s);
  const item = itemOf(report, 'legal-pages');
  assert.equal(item.status, 'pass', JSON.stringify(item));
  assert.match(
    item.title,
    /ES: legal notice and privacy policy present, linked from \d+ page/,
  );
});

test('ES without the legal notice fails and the fix names the generator command', async () => {
  const s = spanishSite();
  s.remove('dist/aviso-legal');
  const { report, code } = await run(s);
  const item = itemOf(report, 'legal-pages');
  assert.equal(item.status, 'fail');
  assert.equal(code, 1);
  assert.ok(item.evidence.some((e) => /no legal notice page/.test(e)));
  assert.ok(item.fix.includes('node scripts/legal.mjs --site fixture --write'));
});

test('a pending tax id fails: the brief value is empty and the pending marker is named', async () => {
  const brief = BRIEF();
  brief.legal.holder.taxId = '';
  const s = spanishSite(brief);
  s.write(
    'dist/aviso-legal/index.html',
    noticeHtml(
      '<mark data-legal-pending="holder.taxId">Pending legal review: holder.taxId</mark>',
    ),
  );
  const { report } = await run(s);
  const item = itemOf(report, 'legal-pages');
  assert.equal(item.status, 'fail');
  const evidence = item.evidence.join('\n');
  assert.match(evidence, /brief legal\.holder\.taxId is empty/);
  assert.match(
    evidence,
    /still shows the pending-review marker for holder\.taxId/,
  );
});

test('a holder value missing from the page text fails even without a marker', async () => {
  const s = spanishSite();
  s.write(
    'dist/aviso-legal/index.html',
    noticeHtml().replace('B00000000', 'XXXX'),
  );
  const { report } = await run(s);
  const item = itemOf(report, 'legal-pages');
  assert.equal(item.status, 'fail');
  assert.ok(item.evidence.some((e) => /does not show holder\.taxId/.test(e)));
});

test('a page without the footer link fails and names the page', async () => {
  const s = spanishSite();
  page(s, 'dist/about/index.html', (html) => html.replace(FOOTER, ''));
  const { report } = await run(s);
  const item = itemOf(report, 'legal-pages');
  assert.equal(item.status, 'fail');
  assert.ok(
    item.evidence.some((e) =>
      e.startsWith('/about/ has no link to the legal notice'),
    ),
  );
  assert.ok(
    item.evidence.some((e) =>
      e.startsWith('/about/ has no link to the privacy policy'),
    ),
  );
});

test('legal pages are also found by path, without the data attribute', async () => {
  const s = spanishSite();
  s.write(
    'dist/aviso-legal/index.html',
    noticeHtml().replace(' data-legal-page="notice"', ''),
  );
  s.write(
    'dist/privacidad/index.html',
    privacyHtml.replace(' data-legal-page="privacy"', ''),
  );
  const { report } = await run(s);
  assert.equal(statusOf(report, 'legal-pages'), 'pass');
});

test('no brief, no market and a market without a rule set all warn that the requirements are unknown', async () => {
  const s = site();
  let r = await run(s);
  let item = itemOf(r.report, 'legal-pages');
  assert.equal(item.status, 'warn');
  assert.match(item.title, /legal requirements of this landing are unknown/);
  assert.equal(r.code, 0);

  s.write('brief.json', JSON.stringify(BRIEF({ markets: [] })));
  r = await run(s);
  assert.equal(statusOf(r.report, 'legal-pages'), 'warn');
  assert.match(itemOf(r.report, 'legal-pages').title, /names no market/);

  s.write('brief.json', JSON.stringify(BRIEF({ markets: ['US'] })));
  r = await run(s);
  item = itemOf(r.report, 'legal-pages');
  assert.equal(item.status, 'warn');
  assert.ok(item.evidence.includes('no rule set for US'));
  assert.match(item.title, /No rule set for US/);

  s.write('brief.json', '{ not json');
  r = await run(s);
  assert.equal(statusOf(r.report, 'legal-pages'), 'warn');
  assert.match(
    itemOf(r.report, 'legal-pages').evidence.join(' '),
    /cannot read/,
  );
});

test('an EU market needs the privacy policy only; a missing register entry for ES warns', async () => {
  const eu = spanishSite(BRIEF({ markets: ['DE'] }));
  eu.remove('dist/aviso-legal');
  page(eu, 'dist/index.html', (html) =>
    html.replace('<a href="/aviso-legal/">Aviso legal</a>', ''),
  );
  page(eu, 'dist/about/index.html', (html) =>
    html.replace('<a href="/aviso-legal/">Aviso legal</a>', ''),
  );
  page(eu, 'dist/privacidad/index.html', (html) =>
    html.replace('<a href="/aviso-legal/">Aviso legal</a>', ''),
  );
  const { report } = await run(eu);
  assert.equal(
    statusOf(report, 'legal-pages'),
    'pass',
    JSON.stringify(itemOf(report, 'legal-pages')),
  );

  const brief = BRIEF();
  brief.legal.holder.register = '';
  const es = spanishSite(brief);
  const r = await run(es);
  const item = itemOf(r.report, 'legal-pages');
  assert.equal(item.status, 'warn');
  assert.ok(item.evidence.some((e) => /holder\.register is empty/.test(e)));
});

// --- 3.4 price claims --------------------------------------------------------------------------------------------

test('"50% off" next to a price warns with the page and the text; an EU market adds the 30-day rule', async () => {
  const s = site();
  addToBody(s, '<p>Pack <b>50% off</b> now 29 €</p>');
  let r = await run(s);
  let item = itemOf(r.report, 'legal-price-claims');
  assert.equal(item.status, 'warn');
  assert.ok(
    item.evidence.some((e) => e.startsWith('/: ') && e.includes('50% off')),
  );
  assert.ok(item.evidence.every((e) => e.length <= 90));
  assert.ok(
    !item.fix.includes('Article 6a'),
    'no EU market, no article reference',
  );

  s.write('brief.json', JSON.stringify(BRIEF({ markets: ['ES'] })));
  r = await run(s);
  item = itemOf(r.report, 'legal-price-claims');
  assert.equal(item.status, 'warn');
  assert.match(item.fix, /lowest price applied in the 30 days/);
  assert.match(item.fix, /Article 6a/);
});

test('<del> around a price, a Spanish discount and antes/ahora prices warn; a page with no claims passes', async () => {
  const s = site();
  addToBody(s, '<p><del>59 €</del> <ins>39 €</ins></p>');
  let r = await run(s);
  assert.ok(
    itemOf(r.report, 'legal-price-claims').evidence.some((e) =>
      e.includes('struck-through price: 59 €'),
    ),
  );

  const t = site();
  addToBody(
    t,
    '<p>Antes 59 € Ahora 39 €</p><p>Ahorra un 30%</p><p>20% de descuento</p>',
  );
  r = await run(t);
  const item = itemOf(r.report, 'legal-price-claims');
  assert.equal(item.status, 'warn');
  const text = item.evidence.join('\n');
  assert.match(text, /Antes 59 € Ahora 39 €/);
  assert.match(text, /Ahorra un 30%/);
  assert.match(text, /20% de descuento/);

  const clean = site();
  addToBody(clean, '<p>Price 29 € per month. 100% handmade.</p>');
  r = await run(clean);
  assert.equal(statusOf(r.report, 'legal-price-claims'), 'pass');
});

test('htmlText drops scripts and comments, decodes entities and joins split words', () => {
  assert.equal(
    htmlText(
      '<p>50<span>%</span>&nbsp;off &amp; more</p><script>var x="99% off"</script><!-- 10% off -->',
    ),
    '50 % off & more',
  );
});
