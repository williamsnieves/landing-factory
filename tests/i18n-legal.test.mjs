// Legal pages of a multi-locale landing (add-bilingual-landing): the data legal.mjs writes for every locale, the
// per-locale texts and paths, and the report's legal-pages item, which wants each required page in each locale.
import assert from 'node:assert/strict';
import {
  cpSync,
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

import {
  legalData,
  localePages,
  main,
  renderLegalJson,
} from '../scripts/legal.mjs';
import { localeOfPath } from '../scripts/report/legal.mjs';
import { itemOf, makeSite, runReport } from './report-fixture.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/brief');
const tmp = mkdtempSync(join(tmpdir(), 'i18n-legal-test-'));
const sites = [];
after(() => {
  rmSync(tmp, { recursive: true, force: true });
  sites.forEach((s) => s.cleanup());
});

const fixture = () =>
  JSON.parse(readFileSync(join(FIXTURE, 'brief.json'), 'utf8'));
const bilingual = (over = {}) => ({
  ...fixture(),
  language: 'en',
  languages: ['en', 'es'],
  ...over,
});

// --- legal.mjs: data for every locale --------------------------------------------------------------------

test('a bilingual brief gets the default locale and a page path per required page in each locale', () => {
  const { data, warnings } = legalData(bilingual());
  assert.equal(data.language, 'en');
  assert.equal(data.defaultLocale, 'en');
  assert.deepEqual(data.pages, ['notice', 'privacy']);
  assert.deepEqual(data.locales, [
    {
      locale: 'en',
      language: 'en',
      paths: { notice: '/legal-notice/', privacy: '/privacy/' },
    },
    {
      locale: 'es',
      language: 'es',
      paths: { notice: '/es/aviso-legal/', privacy: '/es/privacidad/' },
    },
  ]);
  assert.deepEqual(warnings, []);
});

test('a Spanish default puts the Spanish slugs at the root and the English ones under /en/', () => {
  const { data } = legalData(
    bilingual({ language: 'es', languages: ['es', 'en'] }),
  );
  assert.equal(data.defaultLocale, 'es');
  assert.deepEqual(
    data.locales.map((l) => l.paths.privacy),
    ['/privacidad/', '/en/privacy/'],
  );
  assert.deepEqual(
    data.locales.map((l) => l.paths.notice),
    ['/aviso-legal/', '/en/legal-notice/'],
  );
});

test('only the pages the market requires get a path; a locale without texts falls back to English and warns', () => {
  const eu = bilingual({ languages: ['en', 'fr'] });
  eu.legal.markets = ['DE'];
  const { data, warnings } = legalData(eu);
  assert.deepEqual(data.pages, ['privacy']);
  assert.deepEqual(data.locales[1], {
    locale: 'fr',
    language: 'en',
    paths: { privacy: '/fr/privacy/' },
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /no legal text for the page language "fr"/);
});

test('a single-language brief keeps exactly the keys it always had', () => {
  const single = legalData(fixture()).data;
  assert.ok(!('locales' in single));
  assert.ok(!('defaultLocale' in single));
  const oneEntry = legalData({ ...fixture(), languages: ['es'] }).data;
  assert.deepEqual(oneEntry, single);
  assert.deepEqual(
    localePages(['es', 'en'], 'es', ['privacy']).map((l) => l.paths),
    [{ privacy: '/privacidad/' }, { privacy: '/en/privacy/' }],
  );
});

test('legal.json is written for every locale through the CLI and --check follows the brief', () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  const siteDir = join(root, 'sites', 'bilingue');
  mkdirSync(siteDir, { recursive: true });
  cpSync(join(FIXTURE, 'assets'), join(siteDir, 'assets'), { recursive: true });
  const brief = bilingual();
  writeFileSync(join(siteDir, 'brief.json'), JSON.stringify(brief, null, 2));
  const io = { log() {}, error() {} };
  assert.equal(main(['--site', 'bilingue', '--write'], io, root), 0);
  const written = readFileSync(join(siteDir, 'src/data/legal.json'), 'utf8');
  assert.equal(written, renderLegalJson(legalData(brief).data));
  assert.equal(JSON.parse(written).locales.length, 2);
  assert.equal(main(['--site', 'bilingue', '--check'], io, root), 0);
  brief.languages = ['en', 'es', 'fr'];
  writeFileSync(join(siteDir, 'brief.json'), JSON.stringify(brief, null, 2));
  assert.equal(
    main(['--site', 'bilingue', '--check'], io, root),
    1,
    'a new locale makes it stale',
  );
});

// --- report: legal-pages per locale ----------------------------------------------------------------------

const FOOTER = {
  en: '<footer><a href="/legal-notice/">Legal notice</a> <a href="/privacy/">Privacy</a></footer>',
  es: '<footer><a href="/es/aviso-legal/">Aviso legal</a> <a href="/es/privacidad/">Privacidad</a></footer>',
};
const notice = (lang, footer) =>
  `<!doctype html><html lang="${lang}"><head><title>n</title></head><body><main><article data-legal-page="notice"><h1>x</h1><dl><dd>Taller Plantilla S.L.</dd><dd>B00000000</dd><dd>Calle Ficticia 1, Valencia</dd><dd>hola@example.com</dd></dl></article></main>${footer}</body></html>`;
const privacy = (lang, footer) =>
  `<!doctype html><html lang="${lang}"><head><title>p</title></head><body><main><article data-legal-page="privacy"><h1>x</h1><p>Taller Plantilla S.L.</p><p>privacidad@example.com</p></article></main>${footer}</body></html>`;
const BRIEF = (over = {}) => ({
  version: 1,
  language: 'en',
  languages: ['en', 'es'],
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
  },
  ...over,
});

/** A site with home pages in en (/ and /about/) and es (/es/), each with its locale's footer and legal pages. */
function bilingualSite(brief = BRIEF()) {
  const s = makeSite();
  sites.push(s);
  s.write('brief.json', JSON.stringify(brief));
  const home = s.read('dist/index.html');
  const withFooter = (html, footer) =>
    html.replace('</main>', `</main>${footer}`);
  s.write('dist/index.html', withFooter(home, FOOTER.en));
  s.write(
    'dist/about/index.html',
    withFooter(s.read('dist/about/index.html'), FOOTER.en),
  );
  s.write(
    'dist/es/index.html',
    withFooter(home.replace('<html lang="en"', '<html lang="es"'), FOOTER.es),
  );
  s.write('dist/legal-notice/index.html', notice('en', FOOTER.en));
  s.write('dist/privacy/index.html', privacy('en', FOOTER.en));
  s.write('dist/es/aviso-legal/index.html', notice('es', FOOTER.es));
  s.write('dist/es/privacidad/index.html', privacy('es', FOOTER.es));
  return s;
}
const ONLY = ['--only', 'static', '--skip', 'audit'];
const legalPages = async (s) =>
  itemOf((await runReport(s, ONLY)).report, 'legal-pages');

test('locale of a built page: a non-default locale owns its prefix, everything else is the default', () => {
  const i18n = { defaultLocale: 'en', locales: ['en', 'es'] };
  assert.equal(localeOfPath('/', i18n), 'en');
  assert.equal(localeOfPath('/privacy/', i18n), 'en');
  assert.equal(localeOfPath('/es/', i18n), 'es');
  assert.equal(localeOfPath('/es/privacidad/', i18n), 'es');
  assert.equal(
    localeOfPath('/espresso/', i18n),
    'en',
    'a prefix is a whole path segment',
  );
  assert.equal(localeOfPath('/es/privacidad/', null), null);
});

test('both locales with their pages, footers and holder data pass, naming the locales', async () => {
  const item = await legalPages(bilingualSite());
  assert.equal(item.status, 'pass', JSON.stringify(item));
  assert.match(item.title, /present in en, es, linked from \d+ page/);
});

test('the Spanish privacy policy is found by its /es/privacidad/ path without the data attribute', async () => {
  const s = bilingualSite();
  s.write(
    'dist/es/privacidad/index.html',
    privacy('es', FOOTER.es).replace(' data-legal-page="privacy"', ''),
  );
  assert.equal((await legalPages(s)).status, 'pass');
});

test('a missing legal page in one locale fails and names the locale', async () => {
  const s = bilingualSite();
  s.remove('dist/es/privacidad');
  const item = await legalPages(s);
  assert.equal(item.status, 'fail');
  assert.ok(
    item.evidence.some((e) =>
      /no privacy policy page for locale es .* under \/es\//.test(e),
    ),
    JSON.stringify(item.evidence),
  );
  assert.ok(!item.evidence.some((e) => /locale en/.test(e)));
});

test('a locale page must link to its own locale legal pages, not the other language ones', async () => {
  const s = bilingualSite();
  // The Spanish home links to the English legal pages only.
  const file = 'dist/es/index.html';
  s.write(file, s.read(file).replace(FOOTER.es, FOOTER.en));
  const item = await legalPages(s);
  assert.equal(item.status, 'fail');
  const text = item.evidence.join('\n');
  assert.match(
    text,
    /\/es\/ has no link to the legal notice \(\/es\/aviso-legal\/\)/,
  );
  assert.match(
    text,
    /\/es\/ has no link to the privacy policy \(\/es\/privacidad\/\)/,
  );
  assert.ok(!/\/about\/ has no link/.test(text), 'English pages are fine');
});

test('a single-language brief ignores locale prefixes and keeps its old behaviour', async () => {
  const s = bilingualSite(BRIEF({ languages: [] }));
  const item = await legalPages(s);
  // Without languages the es pages are just pages: the root pages are found and every page links to one of them.
  assert.equal(item.status, 'pass', JSON.stringify(item));
  assert.ok(!/ in en, es/.test(item.title));
});
