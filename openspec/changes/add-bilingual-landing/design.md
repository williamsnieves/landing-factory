# Design: add-bilingual-landing

## Context

- Astro 7 with `output: 'static'`. Astro's i18n routing (`i18n.locales`, `defaultLocale`, `routing.prefixDefaultLocale`) maps `src/pages/<locale>/` folders to URL prefixes; `Astro.currentLocale` is the locale of the URL; `astro:i18n` has `getRelativeLocaleUrl` and `getAbsoluteLocaleUrl`. `preferredLocale` and `preferredLocaleList` exist only for on-demand rendering, so a static site cannot redirect by browser language.
- `astro:i18n` fails to resolve (`i18nNotEnabled`) when `astro.config.mjs` has no `i18n` block, and `BaseLayout` is copied into every site, including single-language ones.
- `new-site` copies the starter's paths and writes a placeholder home and a 404; `check-landing` rules read `brief.json`, `assets.json` and `dist/`; `scripts/report/legal.mjs` finds legal pages by path or `data-legal-page` and wants every page linked to them; QA discovers every `dist/**/*.html`.

## Decisions

### 1. Opt-in per site, through the config

A site is multi-locale if and only if its `astro.config.mjs` has an `i18n` block. `new-site --langs en,es` writes it; nothing else switches it on. Everything else reads that fact: the layout through a file only such sites have (Decision 3), `check-landing` through `readI18nConfig`. A single-language site gets no new file, no new line in its config (the test compares it to the starter's byte for byte) and the same build output.

- **Config shape:** `locales: ['en', 'es']`, `defaultLocale: 'en'`, `routing: { prefixDefaultLocale: false }`: the default locale at the root keeps its URLs stable if a second language is added later. Locales are lowercase tags (`pt-br`) because Astro lowercases the URL prefix and the folder must match the locale exactly; `--langs` refuses anything else, plain strings only (no `{ path, codes }`).
- **Default locale:** `--lang`, else the first of `--langs`; the default comes first in the config. `--langs` needs two or more languages; one language is `--lang`.
- **Pages:** `src/pages/index.astro` (default locale) and `src/pages/<locale>/index.astro`. The placeholder is the same file in each place; the language comes from `Astro.currentLocale`, the texts from the dictionary. The single `404.astro` stays in the default language, because a static host serves one `404.html`.

### 2. UI dictionary: typed, per site, small

`src/i18n/ui.ts` exports `locales`, `defaultLocale`, a `Dictionary` interface, `ui: Record<Locale, Dictionary>` and `t(locale)`, which returns the dictionary of the locale (the default's for an unknown one). It holds short interface strings only: skip link, switcher label, AI disclosure, photo-credits label, the placeholder text. A new key goes in the interface and then in every locale, so TypeScript catches a missing translation. Page copy is not in it: the skill writes each locale's copy as its own text in per-locale content files (same interface) or in the page.

- **Languages without built-in texts** get the English strings, marked `TODO: translate`, and a comment in the header.
- **Alternative rejected:** a library (`astro-i18next`, `paraglide`). Static pages with a handful of interface strings do not need one, and the factory avoids new dependencies.
- **Duplication:** the locale list exists in `astro.config.mjs` and `ui.ts`. Importing the config from `src/` was rejected (the config is plain Node, the dictionary is browser code); the `i18n` check fails when the two differ.

### 3. The layout finds alternates without importing `astro:i18n`

`BaseLayout` uses `import.meta.glob('../i18n/urls.ts', { eager: true })`. In a single-language site the glob matches nothing, so the layout never imports `astro:i18n`. In a multi-locale site `src/i18n/urls.ts` (written by `new-site`) re-exports `alternateLinks` from `src/components/i18n/paths.ts` and `locales`/`defaultLocale` from `ui.ts`. The layout then:

- sets `<html lang>` from `lang ?? Astro.currentLocale ?? 'en'`;
- emits one `<link rel="alternate" hreflang>` per locale plus `x-default` (the default locale) with `getAbsoluteLocaleUrl`, which returns absolute URLs when `site` is set and root-relative ones otherwise; the existing canonical already points to the page itself;
- emits nothing on `noindex` pages (placeholders and the 404);
- takes `skipLabel` so the skip link can be translated, and `localeSlugs` for pages whose slug differs per locale (`{ en: 'privacy', es: 'privacidad' }`).

`paths.ts` strips the locale prefix from the current path by matching the longest locale root, so it also works with `prefixDefaultLocale: true`.

- **Alternative rejected:** a prop on every page passing the alternates. It would put the logic in every page.
- **Alternative rejected:** the layout importing `astro:i18n` behind a condition. Vite resolves the import at build time, so it fails in single-language sites.

### 4. Language switcher: links, not scripts

`LanguageSwitcher.astro` takes `locales` (and optional `slugs`, `names`, `label`) and renders `<nav data-language-switcher>` with an `<a href hreflang lang>` per locale to the equivalent page; the active link has `aria-current`. Names default to each language's own name (`Intl.DisplayNames`), capitalized. No redirect, no cookie, no script: the visitor chooses, and `x-default` plus the alternates tell search engines the rest.

### 5. Legal pages per locale

`legal.mjs` adds, only for a multi-locale brief, `defaultLocale` and `locales: [{ locale, language, paths }]` to `legal.json` (single-language files keep exactly their keys). Paths follow the language: `/privacy/`, `/legal-notice/` for English and `/privacidad/`, `/aviso-legal/` for Spanish, under `/<locale>/` for non-default locales. The holder data is the same in every locale; only the texts differ. `LegalNotice`/`PrivacyPolicy` take an optional `locale` (default `Astro.currentLocale`, else the data's language) and `texts.ts` gets `legalPath(data, kind, locale)` for footers.

The report's `legal-pages` item, when the brief is multilingual:

- requires each required page in each locale (found by `data-legal-page` or by path with the locale prefix ignored), naming the missing locale;
- requires each page to link to the legal page of its own locale (a Spanish page linking only to `/privacy/` fails);
- keeps the holder-data and pending-marker checks per page, unchanged.

Single-language briefs follow the old code path.

### 6. Final check

`readI18nConfig` parses the `i18n` block (the file is generated; an unreadable one is itself a failure, custom path objects included) and `readUiDictionary` reads `ui.ts`. The `i18n` rule fails on:

- config problems, fewer than two locales, `ui.ts` missing or with different locales or an empty locale, a brief whose `languages` or default differ from the config;
- a locale without its home page (`dist/index.html`, `dist/<locale>/index.html`; the default is prefixed if `prefixDefaultLocale` is true);
- `<html lang>` different from the locale;
- missing alternates (every locale and `x-default`), an alternate that points to an unbuilt page, a canonical that is not the page's own alternate, alternates that are not reciprocal (every page lists the other at the address the other gives itself), disagreeing or wrong `x-default`;
- a missing switcher, links that do not match the locales or do not resolve, a current marker on the wrong link;
- a page of one locale showing a dictionary string (8 or more characters) of another locale that is not also in its own: an untranslated skip link, a pasted block.

A warning (never a failure) `i18n-absolute-urls` says alternates are relative because `site` is not set; no site has a domain yet, so a failure would block every landing. `ai-provenance` reads the home page of each locale and fails on a missing, hidden or empty disclosure, and on an English one on a non-English page. `brief-facts` keeps reading the default locale's home page for every fact and adds the business name on the other locales' home pages. Copy quality in the other locale (an untranslated heading, for example) is not detectable and is not checked.

### 7. QA and the layout signature

QA already discovers every `dist/**/*.html`, so `/es/` gets the screenshots, overflow, reduced-motion and Lighthouse checks without a change (verified end to end). `layout-signature.mjs` measures `/`, the default locale's home page, because the other locales share its components; this is documented in the script, `CLAUDE.md` and the skill.

### 8. Generation

`new-landing.sh` reads `languages` from the brief (two or more, after validation) or `--langs` and passes `--langs` to `new-site` and to the skill. The skill's multi-locale part says what the build must do: natural copy per locale (not a literal translation), the same sections in the same order, shared components, dictionary or per-locale content files, the switcher in every header, `site` set from `deploy.domain`, legal pages and the disclosure in every locale, Decisions listing the locales, and a note that a native speaker should read the copy. Nothing is machine-checked about copy quality.

## Risks

- **Two sources of locales** (config and dictionary): the `i18n` check catches a mismatch.
- **Regex parsing of generated files** (`astro.config.mjs`, `ui.ts`): they come from `new-site`; a hand edit that breaks the shape is reported as a problem, never ignored. The tests cover the generated shape, Prettier-wrapped values and quoted keys.
- **hreflang relative URLs** until the owner has a domain: a warning, and the skill sets `site` from `deploy.domain`.
- **Legal texts exist only in `en` and `es`:** other locales get English and a warning. The templates are not legal advice.
