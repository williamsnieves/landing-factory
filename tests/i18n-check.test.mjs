// check-landing for multi-locale sites (add-bilingual-landing): the `i18n` rule, the AI disclosure on every
// locale's home page and the business name on each of them. The fixture site is copied to a temp folder, given an
// `i18n` block, a dictionary written by new-site and hand-written built pages, and mutated per case.
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
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { runChecks } from '../scripts/check-landing.mjs';
import { syncCredits } from '../scripts/credits.mjs';
import {
  alternatesOf,
  canonicalOf,
  htmlLang,
  localeIndexFile,
  localeOfFile,
  readI18nConfig,
  readUiDictionary,
  switcherOf,
} from '../scripts/lib/i18n-site.mjs';
import { i18nConfigBlock, uiFile } from '../scripts/new-site.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/landing');
const BRIEF_FIXTURE = join(ROOT, 'tests/fixtures/brief');
const tmp = mkdtempSync(join(tmpdir(), 'i18n-check-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

// The brief fixture is Spanish (default), so the site is es (root) + en (/en/).
const LOCALES = ['es', 'en'];
const URLS = { es: 'https://example.com/', en: 'https://example.com/en/' };
const FILES = { es: 'dist/index.html', en: 'dist/en/index.html' };
const SKIP = { es: 'Saltar al contenido', en: 'Skip to content' };

const site = (root, file = '') => join(root, 'sites/good', file);
const read = (root, rel) => readFileSync(site(root, rel), 'utf8');
const write = (root, rel, content) => {
  mkdirSync(dirname(site(root, rel)), { recursive: true });
  writeFileSync(site(root, rel), content);
};
const edit = (root, rel, change) => write(root, rel, change(read(root, rel)));

const FACTS = `<header><a href="https://example.com/tienda/pack-notion-freelance">Comprar el pack</a></header>
<h1>Taller Plantilla</h1>
<section><h2>Pack Notion Freelance</h2><p>29 €</p></section>
<section><h2>Curso Orden en 5 días</h2><p>59,00 €</p></section>
<footer><p>Escríbenos: <a href="mailto:hola@example.com">hola@example.com</a></p></footer>`;

/** A built home page of a locale: lang, alternates, switcher, the skip link text of its dictionary and a body. */
function home(locale, o = {}) {
  const urls = o.urls ?? URLS;
  const alternates =
    o.alternates ??
    [...LOCALES, 'x-default']
      .map(
        (h) =>
          `<link rel="alternate" hreflang="${h}" href="${urls[h === 'x-default' ? 'es' : h]}">`,
      )
      .join('');
  const links = LOCALES.map(
    (l) =>
      `<li><a href="${l === 'es' ? '/' : '/en/'}" hreflang="${l}" lang="${l}"${l === locale ? ' aria-current="true"' : ''}>${l}</a></li>`,
  ).join('');
  const switcher =
    o.switcher ??
    `<nav aria-label="Language" data-language-switcher><ul>${links}</ul></nav>`;
  return `<!doctype html><html lang="${o.lang ?? locale}"><head><title>t</title>${o.canonical === false ? '' : `<link rel="canonical" href="${urls[locale]}">`}${alternates}</head><body><a href="#main">${o.skip ?? SKIP[locale]}</a>${switcher}<main id="main">${o.body ?? FACTS}</main>${o.footer ?? ''}</body></html>`;
}

/** The fixture site as a bilingual (es + en) build with a matching brief; every i18n check passes. */
function i18nRoot({ brief = true } = {}) {
  const root = mkdtempSync(join(tmp, 'root-'));
  cpSync(FIXTURE, root, { recursive: true });
  const config = readFileSync(join(ROOT, 'astro.config.mjs'), 'utf8').replace(
    "  output: 'static',\n",
    `  output: 'static',\n${i18nConfigBlock(LOCALES)}`,
  );
  write(root, 'astro.config.mjs', config);
  write(root, 'src/i18n/ui.ts', uiFile(LOCALES));
  for (const locale of LOCALES) write(root, FILES[locale], home(locale));
  if (brief) {
    const data = JSON.parse(
      readFileSync(join(BRIEF_FIXTURE, 'brief.json'), 'utf8'),
    );
    data.languages = ['es', 'en'];
    cpSync(join(BRIEF_FIXTURE, 'assets'), site(root, 'assets'), {
      recursive: true,
    });
    write(root, 'brief.json', JSON.stringify(data));
  }
  return root;
}
const run = (root) => runChecks({ slug: 'good', root });
const only = async (root, rule) =>
  (await run(root)).failures.filter((f) => f.rule === rule);
const i18nFailures = (root) => only(root, 'i18n');
const messages = (failures) => failures.map((f) => f.message).join('\n');

// --- helpers on the config, the dictionary and built markup ----------------------------------------------

test('readI18nConfig reads the block new-site writes, ignores comments and reports what it cannot read', () => {
  const root = i18nRoot();
  const config = readI18nConfig(site(root));
  assert.deepEqual(config, {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    prefixDefaultLocale: false,
    problems: [],
  });
  assert.equal(localeIndexFile(config, 'es'), 'index.html');
  assert.equal(localeIndexFile(config, 'en'), 'en/index.html');
  assert.equal(localeOfFile(config, 'en/privacy/index.html'), 'en');
  assert.equal(localeOfFile(config, 'privacidad/index.html'), 'es');
  assert.equal(localeOfFile(config, 'english/index.html'), 'es');
  assert.equal(readI18nConfig(join(FIXTURE, 'sites/good')), null);

  edit(root, 'astro.config.mjs', (t) =>
    t.replace(
      "locales: ['es', 'en']",
      "locales: [{ path: 'en', codes: ['en'] }]",
    ),
  );
  assert.match(
    readI18nConfig(site(root)).problems.join(' '),
    /custom path objects/,
  );
  edit(root, 'astro.config.mjs', (t) =>
    t.replace("defaultLocale: 'es'", "defaultLocale: 'fr'"),
  );
  assert.match(
    readI18nConfig(site(root)).problems.join(' '),
    /"fr" is not in i18n\.locales/,
  );
  edit(root, 'astro.config.mjs', (t) =>
    t.replace('prefixDefaultLocale: false', 'prefixDefaultLocale: true'),
  );
  const prefixed = readI18nConfig(site(root));
  assert.equal(prefixed.prefixDefaultLocale, true);
  assert.equal(
    localeIndexFile(prefixed, prefixed.defaultLocale),
    'fr/index.html',
  );
});

test('readUiDictionary reads the generated file, quoted keys and Prettier-wrapped values', () => {
  const root = i18nRoot();
  const ui = readUiDictionary(site(root));
  assert.deepEqual(ui.locales, ['es', 'en']);
  assert.equal(ui.strings.es.skipToContent, 'Saltar al contenido');
  assert.equal(ui.strings.en.skipToContent, 'Skip to content');
  write(root, 'src/i18n/ui.ts', uiFile(['en', 'pt-br']));
  edit(root, 'src/i18n/ui.ts', (t) =>
    t.replace(
      "skipToContent: 'Skip to content',\n    language: 'Language',",
      "skipToContent:\n      'It\\'s a very long string that Prettier wraps onto its own line',\n    language: 'Language',",
    ),
  );
  const wrapped = readUiDictionary(site(root));
  assert.deepEqual(wrapped.locales, ['en', 'pt-br']);
  assert.ok(wrapped.strings['pt-br'].aiDisclosure.startsWith('Some images'));
  assert.equal(
    wrapped.strings.en.skipToContent,
    "It's a very long string that Prettier wraps onto its own line",
  );
  assert.equal(readUiDictionary(join(FIXTURE, 'sites/good')), null);
});

test('markup readers: lang, alternates, canonical and the switcher links', () => {
  const html = home('en');
  assert.equal(htmlLang(html), 'en');
  assert.deepEqual(alternatesOf(html), [
    { hreflang: 'es', href: 'https://example.com/' },
    { hreflang: 'en', href: 'https://example.com/en/' },
    { hreflang: 'x-default', href: 'https://example.com/' },
  ]);
  assert.equal(canonicalOf(html), 'https://example.com/en/');
  assert.deepEqual(switcherOf(html), [
    { href: '/', hreflang: 'es', current: false },
    { href: '/en/', hreflang: 'en', current: true },
  ]);
  assert.equal(switcherOf('<nav>x</nav>'), null);
});

// --- the rule ----------------------------------------------------------------------------------------

test('a single-language site does not run the i18n rule', async () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  cpSync(FIXTURE, root, { recursive: true });
  const result = await run(root);
  assert.ok(!result.checks.some((c) => c.name === 'i18n'));
});

test('a consistent bilingual site passes i18n, brief-facts and the whole check; relative URLs only warn', async () => {
  const root = i18nRoot();
  const result = await run(root);
  assert.deepEqual(
    result.failures.filter((f) => f.rule === 'i18n'),
    [],
  );
  assert.ok(result.checks.some((c) => c.name === 'i18n' && c.ok));
  assert.ok(result.checks.some((c) => c.name === 'brief-facts' && c.ok));
  assert.deepEqual(
    result.warnings.filter((w) => w.rule === 'i18n-absolute-urls'),
    [],
  );

  // Without `site` BaseLayout emits root-relative alternates and no canonical: valid, with a warning.
  const relative = { es: '/', en: '/en/' };
  for (const locale of LOCALES)
    write(
      root,
      FILES[locale],
      home(locale, { urls: relative, canonical: false }),
    );
  const again = await run(root);
  assert.deepEqual(
    again.failures.filter((f) => f.rule === 'i18n'),
    [],
  );
  const warning = again.warnings.find((w) => w.rule === 'i18n-absolute-urls');
  assert.match(warning.message, /set `site`/);
});

test('a locale without its home page fails naming the file to create', async () => {
  const root = i18nRoot();
  rmSync(site(root, 'dist/en'), { recursive: true });
  const failures = await i18nFailures(root);
  const missing = failures.find((f) => f.item === 'dist/en/index.html');
  assert.match(
    missing.message,
    /locale en has no home page.*src\/pages\/en\/index\.astro/,
  );
  // The Spanish page's alternate and switcher link to the missing page fail too.
  assert.match(
    messages(failures),
    /hreflang="en" points to .*not a built page/,
  );
});

test('a wrong <html lang> fails', async () => {
  const root = i18nRoot();
  write(root, FILES.en, home('en', { lang: 'es' }));
  const failures = await i18nFailures(root);
  assert.match(
    messages(failures),
    /dist\/en\/index\.html has <html lang="es"> but it is the en page/,
  );
});

test('missing hreflang alternates or x-default fail naming them', async () => {
  const root = i18nRoot();
  write(
    root,
    FILES.es,
    home('es', {
      alternates:
        '<link rel="alternate" hreflang="es" href="https://example.com/">',
    }),
  );
  const text = messages(await i18nFailures(root));
  assert.match(
    text,
    /dist\/index\.html has no hreflang alternate for en, x-default/,
  );
  // A noindex page (no alternates at all) fails the same way.
  write(root, FILES.es, home('es', { alternates: '' }));
  assert.match(
    messages(await i18nFailures(root)),
    /no hreflang alternate for es, en, x-default/,
  );
});

test('alternates that are not reciprocal, or point at a page that was not built, fail', async () => {
  const root = i18nRoot();
  // The Spanish page says the English page is at /en (no slash) while the English page says it is at /en/.
  write(
    root,
    FILES.es,
    home('es', {
      alternates:
        '<link rel="alternate" hreflang="es" href="https://example.com/"><link rel="alternate" hreflang="en" href="https://example.com/en"><link rel="alternate" hreflang="x-default" href="https://example.com/">',
    }),
  );
  assert.match(
    messages(await i18nFailures(root)),
    /hreflang is not reciprocal: the es page links the en page at https:\/\/example\.com\/en but the en page is at https:\/\/example\.com\/en\//,
  );

  const gone = i18nRoot();
  write(
    gone,
    FILES.es,
    home('es', {
      alternates:
        '<link rel="alternate" hreflang="es" href="https://example.com/"><link rel="alternate" hreflang="en" href="https://example.com/fr/"><link rel="alternate" hreflang="x-default" href="https://example.com/">',
    }),
  );
  assert.match(
    messages(await i18nFailures(gone)),
    /hreflang="en" points to https:\/\/example\.com\/fr\/, which is not a built page/,
  );
});

test('x-default must be the default locale page on every locale, and canonicals are self-referencing', async () => {
  const root = i18nRoot();
  write(
    root,
    FILES.en,
    home('en', {
      alternates:
        '<link rel="alternate" hreflang="es" href="https://example.com/"><link rel="alternate" hreflang="en" href="https://example.com/en/"><link rel="alternate" hreflang="x-default" href="https://example.com/en/">',
    }),
  );
  assert.match(
    messages(await i18nFailures(root)),
    /disagree on hreflang="x-default"/,
  );
  // Both pages agree, but on the wrong page.
  const wrong = i18nRoot();
  for (const locale of LOCALES)
    edit(wrong, FILES[locale], (t) =>
      t.replace(
        '<link rel="alternate" hreflang="x-default" href="https://example.com/">',
        '<link rel="alternate" hreflang="x-default" href="https://example.com/en/">',
      ),
    );
  assert.match(
    messages(await i18nFailures(wrong)),
    /x-default" \(https:\/\/example\.com\/en\/\) is not the default locale page/,
  );

  const canon = i18nRoot();
  edit(canon, FILES.en, (t) =>
    t.replace(
      '<link rel="canonical" href="https://example.com/en/">',
      '<link rel="canonical" href="https://example.com/">',
    ),
  );
  assert.match(
    messages(await i18nFailures(canon)),
    /canonical \(https:\/\/example\.com\/\) is not its own hreflang alternate/,
  );
});

test('a missing, incomplete or wrongly marked language switcher fails; its links must resolve', async () => {
  const none = i18nRoot();
  write(none, FILES.es, home('es', { switcher: '' }));
  assert.match(
    messages(await i18nFailures(none)),
    /dist\/index\.html has no language switcher/,
  );

  const partial = i18nRoot();
  write(
    partial,
    FILES.es,
    home('es', {
      switcher:
        '<nav data-language-switcher><a href="/" hreflang="es" aria-current="true">es</a></nav>',
    }),
  );
  assert.match(
    messages(await i18nFailures(partial)),
    /links es, expected es, en/,
  );

  const wrong = i18nRoot();
  write(
    wrong,
    FILES.en,
    home('en', {
      switcher:
        '<nav data-language-switcher><a href="/" hreflang="es" aria-current="true">es</a><a href="/en/" hreflang="en">en</a></nav>',
    }),
  );
  assert.match(
    messages(await i18nFailures(wrong)),
    /must mark exactly the en link with aria-current \(marked: es\)/,
  );

  const broken = i18nRoot();
  write(
    broken,
    FILES.en,
    home('en', {
      switcher:
        '<nav data-language-switcher><a href="/oops/" hreflang="es">es</a><a href="/en/" hreflang="en" aria-current="true">en</a></nav>',
    }),
  );
  assert.match(
    messages(await i18nFailures(broken)),
    /links \/oops\/ \(es\), which is not a built page/,
  );
});

test('a page that shows the UI strings of another locale fails, on the home page and on inner pages', async () => {
  const root = i18nRoot();
  // The Spanish page keeps the English skip link (a default that was never translated).
  write(root, FILES.es, home('es', { skip: 'Skip to content' }));
  assert.match(
    messages(await i18nFailures(root)),
    /dist\/index\.html \(es\) shows the en UI string skipToContent: "Skip to content"/,
  );

  const inner = i18nRoot();
  write(
    inner,
    'dist/en/privacy/index.html',
    home('en', { body: '<p>Saltar al contenido</p>' }),
  );
  assert.match(
    messages(await i18nFailures(inner)),
    /dist\/en\/privacy\/index\.html \(en\) shows the es UI string skipToContent/,
  );

  // A short or shared string is not a mix: the same text in both dictionaries is fine.
  const shared = i18nRoot();
  edit(shared, 'src/i18n/ui.ts', (t) =>
    t.replace('Skip to content', 'Saltar al contenido'),
  );
  assert.deepEqual(await i18nFailures(shared), []);
});

test('config, dictionary and brief must agree on the locales', async () => {
  const dictionary = i18nRoot();
  edit(dictionary, 'src/i18n/ui.ts', (t) =>
    t.replace("['es', 'en'] as const", "['es', 'en', 'fr'] as const"),
  );
  assert.match(
    messages(await i18nFailures(dictionary)),
    /src\/i18n\/ui\.ts locales \(es, en, fr\) differ from i18n\.locales/,
  );

  const missing = i18nRoot();
  rmSync(site(missing, 'src/i18n/ui.ts'));
  assert.match(
    messages(await i18nFailures(missing)),
    /src\/i18n\/ui\.ts does not exist/,
  );

  const brief = i18nRoot();
  edit(brief, 'brief.json', (t) =>
    t.replace('["es","en"]', '["es","en","fr"]'),
  );
  assert.match(
    messages(await i18nFailures(brief)),
    /brief\.json languages \(es, en, fr; default es\) differ from astro\.config\.mjs i18n \(es, en; default es\)/,
  );

  const defaults = i18nRoot();
  edit(defaults, 'brief.json', (t) =>
    t
      .replace('"language":"es"', '"language":"en"')
      .replace('["es","en"]', '["en","es"]'),
  );
  assert.match(
    messages(await i18nFailures(defaults)),
    /differ from astro\.config\.mjs i18n/,
  );

  const custom = i18nRoot();
  edit(custom, 'astro.config.mjs', (t) =>
    t.replace(
      "locales: ['es', 'en']",
      "locales: [{ path: 'en', codes: ['en'] }]",
    ),
  );
  assert.match(messages(await i18nFailures(custom)), /custom path objects/);
});

test('an unbuilt site fails the rule with a hint to build', async () => {
  const root = i18nRoot();
  rmSync(site(root, 'dist'), { recursive: true });
  assert.match(
    messages(await i18nFailures(root)),
    /dist does not exist; build first/,
  );
});

// --- brief-facts: the name on every locale ---------------------------------------------------------------

test('brief-facts reads the default locale page and wants the business name on each locale page', async () => {
  const root = i18nRoot();
  // The facts (prices, email, link) are only on the default page; the English page needs just the name.
  write(
    root,
    FILES.en,
    home('en', { body: '<h1>Taller Plantilla</h1><p>Notion templates</p>' }),
  );
  assert.deepEqual(await only(root, 'brief-facts'), []);

  write(root, FILES.en, home('en', { body: '<h1>Some studio</h1>' }));
  const failures = await only(root, 'brief-facts');
  assert.equal(failures.length, 1);
  assert.equal(failures[0].item, 'business.name');
  assert.match(
    failures[0].message,
    /not on the en home page \(dist\/en\/index\.html\)/,
  );

  // A prefixed default locale is read from its own folder.
  const prefixed = i18nRoot();
  edit(prefixed, 'astro.config.mjs', (t) =>
    t.replace('prefixDefaultLocale: false', 'prefixDefaultLocale: true'),
  );
  assert.match(
    messages(await only(prefixed, 'brief-facts')),
    /dist\/es\/index\.html does not exist/,
  );
});

// --- ai-provenance: the disclosure on every locale -------------------------------------------------------

const AI_ENTRY = {
  file: 'glass.webp',
  title: 'Abstract glass shapes',
  source: 'ai',
  generator: 'openai',
  model: 'gpt-image-1.5',
  prompt: 'An abstract gradient of light and glass shapes',
  revisedPrompt: '',
  size: '1536x1024',
  quality: 'high',
  createdAt: '2026-10-25T10:00:00.000Z',
  terms: 'https://openai.com/policies/terms-of-use/',
  credit: false,
  note: '',
};
const DISCLOSURE = {
  es: '<footer><p data-ai-disclosure>Algunas imágenes de esta página se generaron con IA.</p></footer>',
  en: '<footer><p data-ai-disclosure>Some images on this page were generated with AI.</p></footer>',
};

function aiRoot(footers = DISCLOSURE) {
  const root = i18nRoot();
  const data = JSON.parse(read(root, 'brief.json'));
  data.brand.aiImages = 'allowed';
  write(root, 'brief.json', JSON.stringify(data));
  const manifest = JSON.parse(read(root, 'assets.json'));
  manifest.images.push(AI_ENTRY);
  write(root, 'assets.json', JSON.stringify(manifest));
  cpSync(
    site(root, 'src/assets/images/hero.jpg'),
    site(root, 'src/assets/images/glass.webp'),
  );
  syncCredits({ slug: 'good', root });
  for (const locale of LOCALES)
    write(root, FILES[locale], home(locale, { footer: footers[locale] ?? '' }));
  return root;
}
const aiFailures = (root) => only(root, 'ai-provenance');

test('ai-provenance with i18n passes when every locale home page carries the disclosure in its language', async () => {
  const root = aiRoot();
  assert.deepEqual(await aiFailures(root), []);
  assert.deepEqual(
    await i18nFailures(root),
    [],
    'the disclosure strings are not a dictionary mix either',
  );
});

test('ai-provenance with i18n fails naming the locale page that lacks the disclosure', async () => {
  const root = aiRoot({ es: DISCLOSURE.es, en: '' });
  const failures = await aiFailures(root);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].item, 'dist/en/index.html');
  assert.match(
    failures[0].message,
    /dist\/en\/index\.html has no element with data-ai-disclosure/,
  );
  assert.match(failures[0].message, /\(en, in that language\)/);

  const other = aiRoot({ es: '', en: DISCLOSURE.en });
  const esFail = await aiFailures(other);
  assert.equal(esFail[0].item, 'dist/index.html');
  assert.match(
    esFail[0].message,
    /Algunas imágenes de esta página se generaron con IA/,
  );
});

test('ai-provenance with i18n fails a disclosure left in English on a Spanish page, and a hidden or empty one', async () => {
  const english = aiRoot({ es: DISCLOSURE.en, en: DISCLOSURE.en });
  const failures = await aiFailures(english);
  assert.equal(failures.length, 1);
  assert.match(
    failures[0].message,
    /disclosure on dist\/index\.html is in English but the page is es/,
  );

  const hidden = aiRoot({
    es: '<p data-ai-disclosure hidden>Algunas imágenes se generaron con IA.</p>',
    en: DISCLOSURE.en,
  });
  assert.match((await aiFailures(hidden))[0].message, /is hidden/);
});

test('a single-language site still checks dist/index.html only', async () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  cpSync(FIXTURE, root, { recursive: true });
  const manifest = JSON.parse(read(root, 'assets.json'));
  manifest.images.push(AI_ENTRY);
  write(root, 'assets.json', JSON.stringify(manifest));
  cpSync(
    site(root, 'src/assets/images/hero.jpg'),
    site(root, 'src/assets/images/glass.webp'),
  );
  syncCredits({ slug: 'good', root });
  write(root, 'dist/index.html', `<html><body>${DISCLOSURE.en}</body></html>`);
  assert.deepEqual(await aiFailures(root), []);
  write(root, 'dist/index.html', '<html><body>none</body></html>');
  assert.match(
    (await aiFailures(root))[0].message,
    /dist\/index\.html has no element with data-ai-disclosure/,
  );
});
