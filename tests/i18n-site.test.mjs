// Tests for multi-locale sites (add-bilingual-landing): `new-site --langs`, the generated config, dictionary and
// pages, and a built fixture that checks <html lang>, the hreflang alternates, the canonical and the language switcher.
// Sites are scaffolded in a temporary folder or under .cache/ (ignored by git), never in sites/.
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
  i18nConfigBlock,
  resolveLocales,
  scaffoldSite,
  uiFile,
} from '../scripts/new-site.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'i18n-site-test-'));
const cacheDir = join(ROOT, '.cache', `i18n-site-test-${process.pid}`);
after(() => {
  rmSync(tmp, { recursive: true, force: true });
  rmSync(cacheDir, { recursive: true, force: true });
});

const freshSites = () => mkdtempSync(join(tmp, 'sites-'));
const read = (...parts) => readFileSync(join(...parts), 'utf8');
const links = (html, rel) =>
  [...html.matchAll(/<link rel="alternate"[^>]*>/g)].map((m) => m[0]);
const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];

test('resolveLocales puts the default first and refuses bad input', () => {
  assert.deepEqual(resolveLocales('en,es'), ['en', 'es']);
  assert.deepEqual(resolveLocales('en, es ,fr'), ['en', 'es', 'fr']);
  assert.deepEqual(resolveLocales(['en', 'es'], 'es'), ['es', 'en']);
  assert.deepEqual(resolveLocales('en,pt-br'), ['en', 'pt-br']);
  assert.throws(() => resolveLocales('en'), /two or more languages/);
  assert.throws(() => resolveLocales('en,en'), /Duplicate --langs entry "en"/);
  assert.throws(() => resolveLocales('en,ES'), /Invalid --langs entry "ES"/);
  assert.throws(() => resolveLocales('en,es_ES'), /Invalid --langs entry/);
  assert.throws(() => resolveLocales('en,es', 'fr'), /not in --langs/);
});

test('--langs en,es writes the i18n block, keeps the security.csp block and creates a page per locale', () => {
  const sitesDir = freshSites();
  const { created } = scaffoldSite({
    slug: 'bilingue',
    sitesDir,
    langs: 'en,es',
    title: 'Ana Rivera',
  });
  const site = join(sitesDir, 'bilingue');
  for (const file of [
    'src/pages/index.astro',
    'src/pages/es/index.astro',
    'src/pages/404.astro',
    'src/i18n/ui.ts',
    'src/i18n/urls.ts',
    'src/components/i18n/LanguageSwitcher.astro',
    'src/components/i18n/paths.ts',
  ])
    assert.ok(created.includes(file), file);
  assert.ok(!created.includes('src/pages/en/index.astro'));

  const config = read(site, 'astro.config.mjs');
  assert.match(
    config,
    /i18n: \{\s*locales: \['en', 'es'\],\s*defaultLocale: 'en',\s*routing: \{\s*prefixDefaultLocale: false,\s*\},\s*\},/,
  );
  assert.match(config, /output: 'static',\n[\s\S]*i18n: \{/);
  assert.match(config, /security:\s*{\s*(\/\/[^\n]*\n\s*)*csp:/);
  assert.match(config, /styleDirective/);

  // The default locale page reads its language from Astro.currentLocale and has the switcher; es is the same file.
  const home = read(site, 'src/pages/index.astro');
  const es = read(site, 'src/pages/es/index.astro');
  assert.match(home, /t\(Astro\.currentLocale\)/);
  assert.match(home, /<LanguageSwitcher/);
  assert.match(home, /noindex/);
  assert.equal(
    es.replaceAll("'../../", "'../"),
    home,
    'the locale page differs from the root page only by its import depth',
  );

  const ui = read(site, 'src/i18n/ui.ts');
  assert.match(ui, /export const locales = \['en', 'es'\] as const;/);
  assert.match(ui, /export const defaultLocale: Locale = 'en';/);
  assert.match(ui, /export function t\(locale: string \| undefined\)/);
  assert.match(
    ui,
    /en: \{[\s\S]*Some images on this page were generated with AI\./,
  );
  assert.match(
    ui,
    /es: \{[\s\S]*Algunas imágenes de esta página se generaron con IA\./,
  );
  assert.match(read(site, 'src/i18n/urls.ts'), /alternateLinks/);

  // The single 404 page is in the default language and links home.
  const notFound = read(site, 'src/pages/404.astro');
  assert.match(notFound, /const lang = 'en'/);
  assert.ok(!existsSync(join(site, 'src/pages/es/404.astro')));
  assert.match(read(site, 'PROPOSAL.md'), /multi-locale: en, es \(default en/);
  assert.match(read(site, 'README.md'), /Languages: en, es/);
});

test('--lang picks the default locale: es first, the default page in Spanish, the other under /en/', () => {
  const sitesDir = freshSites();
  scaffoldSite({
    slug: 'espanol',
    sitesDir,
    langs: 'en,es',
    lang: 'es',
    title: 'Ana',
  });
  const site = join(sitesDir, 'espanol');
  assert.match(
    read(site, 'astro.config.mjs'),
    /locales: \['es', 'en'\],\s*defaultLocale: 'es',/,
  );
  assert.ok(existsSync(join(site, 'src/pages/en/index.astro')));
  assert.ok(!existsSync(join(site, 'src/pages/es/index.astro')));
  assert.match(read(site, 'src/pages/404.astro'), /const lang = 'es'/);
  assert.match(read(site, 'src/i18n/ui.ts'), /defaultLocale: Locale = 'es'/);
});

test('a language without built-in texts gets English strings marked to translate, with a quoted key for a hyphenated tag', () => {
  const ui = uiFile(['en', 'pt-br']);
  assert.match(ui, /'pt-br': \{\s*\/\/ TODO: translate these strings/);
  assert.match(ui, /Still to translate: pt-br\./);
  assert.match(i18nConfigBlock(['en', 'pt-br']), /locales: \['en', 'pt-br'\]/);
});

test('a single-language site is unchanged: no i18n files, no i18n block, the starter config byte for byte', () => {
  const sitesDir = freshSites();
  const { created } = scaffoldSite({ slug: 'simple', sitesDir });
  assert.ok(!created.some((file) => file.includes('i18n')), 'no i18n file');
  assert.ok(!created.some((file) => /pages\/[a-z-]+\/index/.test(file)));
  assert.equal(
    read(sitesDir, 'simple', 'astro.config.mjs'),
    read(ROOT, 'astro.config.mjs'),
  );
});

test('the CLI accepts --langs and rejects a single language, a duplicate and an uppercase tag', () => {
  const root = mkdtempSync(join(tmp, 'factory-'));
  const run = (...args) =>
    spawnSync(process.execPath, ['scripts/new-site.mjs', ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, LANDING_FACTORY_ROOT: root },
    });
  const ok = run('cli-i18n', '--langs', 'en,es');
  assert.equal(ok.status, 0, ok.stderr);
  assert.ok(existsSync(join(root, 'sites/cli-i18n/src/pages/es/index.astro')));
  for (const [langs, message] of [
    ['en', /two or more languages/],
    ['en,en', /Duplicate/],
    ['en,ES', /Invalid --langs entry "ES"/],
  ]) {
    const bad = run('cli-bad', '--langs', langs);
    assert.equal(bad.status, 1, langs);
    assert.match(bad.stderr, message);
    assert.ok(!existsSync(join(root, 'sites/cli-bad')), 'nothing created');
  }
  assert.match(run('--help').stdout, /--langs/);
});

test('a scaffolded multi-locale site is already Prettier-formatted', () => {
  const sitesDir = freshSites();
  scaffoldSite({
    slug: 'formato',
    sitesDir,
    langs: 'en,es,pt-br',
    title: 'Ana Rivera — diseño',
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
      join(sitesDir, 'formato'),
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('a built multi-locale site has lang per page, reciprocal hreflang with x-default, self-referencing canonicals and a working switcher', async () => {
  mkdirSync(cacheDir, { recursive: true });
  scaffoldSite({
    slug: 'built',
    sitesDir: cacheDir,
    langs: 'en,es,pt-br',
    title: 'Ana Rivera',
  });
  const site = join(cacheDir, 'built');
  // Placeholders are noindex (no alternates); a real landing is not, so drop it. Set `site` for absolute URLs.
  for (const page of [
    'src/pages/index.astro',
    'src/pages/es/index.astro',
    'src/pages/pt-br/index.astro',
  ]) {
    const file = join(site, page);
    writeFileSync(file, read(file).replace(/\n {2}noindex\n/, '\n'));
  }
  const config = join(site, 'astro.config.mjs');
  writeFileSync(
    config,
    read(config).replace(
      "output: 'static',",
      "output: 'static',\n  site: 'https://example.com',",
    ),
  );
  // A page whose slug differs per locale, using localeSlugs and the switcher's slugs.
  const legal = (up, locale, title) => `---
import BaseLayout from '${up}layouts/BaseLayout.astro';
import LanguageSwitcher from '${up}components/i18n/LanguageSwitcher.astro';
import { locales } from '${up}i18n/ui';
const slugs = { en: 'privacy', es: 'privacidad', 'pt-br': 'privacidade' };
---
<BaseLayout title="${title}" description="d" localeSlugs={slugs}>
  <LanguageSwitcher slot="header" locales={locales} slugs={slugs} />
  <h1>${locale}</h1>
</BaseLayout>
`;
  writeFileSync(
    join(site, 'src/pages/privacy.astro'),
    legal('../', 'en', 'Privacy'),
  );
  mkdirSync(join(site, 'src/pages/es'), { recursive: true });
  writeFileSync(
    join(site, 'src/pages/es/privacidad.astro'),
    legal('../../', 'es', 'Privacidad'),
  );
  writeFileSync(
    join(site, 'src/pages/pt-br/privacidade.astro'),
    legal('../../', 'pt-br', 'Privacidade'),
  );
  await build(site);

  const expectedHome = {
    en: 'https://example.com/',
    es: 'https://example.com/es/',
    'pt-br': 'https://example.com/pt-br/',
  };
  const pages = {
    en: 'dist/index.html',
    es: 'dist/es/index.html',
    'pt-br': 'dist/pt-br/index.html',
  };
  for (const [locale, file] of Object.entries(pages)) {
    const html = read(site, file);
    assert.match(html, new RegExp(`<html lang="${locale}"`), `${locale} lang`);
    const alternates = links(html);
    assert.deepEqual(
      alternates.map((tag) => [attr(tag, 'hreflang'), attr(tag, 'href')]),
      [
        ['en', expectedHome.en],
        ['es', expectedHome.es],
        ['pt-br', expectedHome['pt-br']],
        ['x-default', expectedHome.en],
      ],
      `${locale} alternates`,
    );
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="${expectedHome[locale]}"`),
      `${locale} canonical is self-referencing`,
    );
    // Switcher: a real link per locale, aria-current on the active one only.
    const nav = /<nav[^>]*data-language-switcher[\s\S]*?<\/nav>/.exec(html)[0];
    assert.equal((nav.match(/<a /g) ?? []).length, 3);
    assert.equal((nav.match(/aria-current/g) ?? []).length, 1);
    assert.match(
      nav,
      new RegExp(
        `<a href="[^"]*" hreflang="${locale}" lang="${locale}" aria-current="true"`,
      ),
    );
    assert.match(nav, /<a href="\/"/);
    assert.match(nav, /<a href="\/es\/"/);
    assert.match(nav, /<a href="\/pt-br\/"/);
  }

  // A page with a different slug per locale: alternates and switcher follow the slugs.
  const privacy = read(site, 'dist/privacy/index.html');
  assert.deepEqual(
    links(privacy).map((tag) => [attr(tag, 'hreflang'), attr(tag, 'href')]),
    [
      ['en', 'https://example.com/privacy/'],
      ['es', 'https://example.com/es/privacidad/'],
      ['pt-br', 'https://example.com/pt-br/privacidade/'],
      ['x-default', 'https://example.com/privacy/'],
    ],
  );
  const esPrivacy = read(site, 'dist/es/privacidad/index.html');
  assert.match(esPrivacy, /<html lang="es"/);
  assert.match(
    esPrivacy,
    /<link rel="canonical" href="https:\/\/example\.com\/es\/privacidad\/"/,
  );
  assert.match(esPrivacy, /<a href="\/privacy\/" hreflang="en"/);
  assert.match(esPrivacy, /<a href="\/pt-br\/privacidade\/" hreflang="pt-br"/);

  // One 404 page, in the default language, with no alternates and no switcher.
  const notFound = read(site, 'dist/404.html');
  assert.match(notFound, /<html lang="en"/);
  assert.equal(links(notFound).length, 0);
  assert.ok(!existsSync(join(site, 'dist/es/404.html')));
});

test('without a site URL the alternates are root-relative; the dictionary falls back to the default locale', async () => {
  mkdirSync(cacheDir, { recursive: true });
  scaffoldSite({
    slug: 'relative',
    sitesDir: cacheDir,
    langs: 'en,es',
    title: 'Ana',
  });
  const site = join(cacheDir, 'relative');
  const file = join(site, 'src/pages/index.astro');
  writeFileSync(file, read(file).replace(/\n {2}noindex\n/, '\n'));
  await build(site);
  const html = read(site, 'dist/index.html');
  assert.deepEqual(
    links(html).map((tag) => [attr(tag, 'hreflang'), attr(tag, 'href')]),
    [
      ['en', '/'],
      ['es', '/es/'],
      ['x-default', '/'],
    ],
  );
  // The placeholder stays noindex on the other locale: no alternates there.
  assert.equal(links(read(site, 'dist/es/index.html')).length, 0);
});

test('a single-language site and the starter emit no hreflang and keep the layout output', async () => {
  mkdirSync(cacheDir, { recursive: true });
  scaffoldSite({ slug: 'mono', sitesDir: cacheDir, lang: 'es', title: 'Ana' });
  const site = join(cacheDir, 'mono');
  const file = join(site, 'src/pages/index.astro');
  writeFileSync(file, read(file).replace(/\n {2}noindex\n/, '\n'));
  await build(site);
  const html = read(site, 'dist/index.html');
  assert.match(html, /<html lang="es"/);
  assert.ok(!/hreflang/.test(html));
  assert.match(html, />\s*Skip to content\s*</);
});
