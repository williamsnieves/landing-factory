# Proposal: add-bilingual-landing

## Why

The owner's personal-brand landing must be in English (the default) and Spanish, "using Astro's best practices for internationalization" (owner decision, 2026-10-25). The factory writes one language per landing, and `CLAUDE.md` "Scope discipline" lists i18n as out of scope. This change lifts that line for opt-in multi-locale landings only: a landing with two or more languages, built on Astro's built-in i18n routing with static output. Single-language landings, the starter's pages and every existing site stay as they are.

## What Changes

- **Brief.** An optional `languages` array of lowercase language tags. When filled it contains `language`, which stays the default locale; duplicates and a missing default fail validation. `brief summary` and `brief missing` follow; `/brief-intake` asks "one language or more?" and records the answer; older briefs stay valid.
- **Scaffold.** `new-site --langs en,es` (the default locale is `--lang`, else the first) writes the `i18n` block into the site's `astro.config.mjs` (`prefixDefaultLocale: false`, the `security.csp` block kept), a placeholder home page for the default locale and one under `src/pages/<locale>/` for each other, a typed UI dictionary `src/i18n/ui.ts` with a `t(locale)` helper, `src/i18n/urls.ts` (the bridge the layout loads) and the starter's `src/components/i18n/` (language switcher and URL helpers). The single 404 page stays in the default language.
- **Layout and switcher.** `BaseLayout` takes `<html lang>` from the current locale and, on a multi-locale site, emits `<link rel="alternate" hreflang>` for every locale plus `x-default` (absolute URLs when `site` is set) and a self-referencing canonical; no alternates on `noindex` pages. `LanguageSwitcher.astro` renders real links to the equivalent page with `hreflang`, `lang` and `aria-current`, and works without JavaScript. There is no redirect by browser language.
- **Legal pages per locale.** With a multi-locale brief `legal.mjs` also writes the default locale and, per locale, the paths of the pages the market requires (`/privacy/`, `/es/privacidad/`, `/legal-notice/`, `/es/aviso-legal/`); the components render in the locale's language (`en` and `es` texts exist) and the footer helper `legalPath` links a locale's own pages. The report's `legal-pages` item wants each required page in each locale, linked from that locale's pages.
- **Final check.** A new `i18n` rule (only when the site has an `i18n` block): every locale has its home page, `<html lang>` matches, hreflang alternates are complete, reciprocal and include `x-default`, the switcher links resolve and marks the current locale, config, dictionary and brief name the same locales, and no page shows another locale's UI strings. `ai-provenance` checks the AI disclosure on every locale's home page, in that locale's language; `brief-facts` reads the default locale's page and checks the business name on each locale's page. A warning says when hreflang URLs are relative because `site` is not set.
- **Generation.** `new-landing.sh` passes `--langs` (from the brief's `languages` or the flag); the `/new-landing` skill writes the copy of every locale as natural text with the same sections, shared components with strings from the dictionary or per-locale content files, the switcher in the header, and notes the locales in Decisions.
- **Docs.** `CLAUDE.md` (Sites, Customer brief, Generating a landing, Legal, Scope discipline), `docs/status.md`, `sites/README.md`, `docs/legal.md`.

## Capabilities

### Modified Capabilities

- `site-workspaces`: the multi-locale scaffold, the layout's alternates and the switcher.
- `brief-intake`: the `languages` field and the question.
- `landing-generation`: multi-locale generation and its final check.
- `legal-compliance`: legal pages in every locale.
- `ai-images`: the disclosure on every locale's page.
- `quality-gates`: QA covers every locale page.

## Impact

- **Changed code:** `scripts/new-site.mjs`, `scripts/lib/brief-schema.mjs`, `scripts/lib/i18n-site.mjs` (new), `scripts/legal.mjs`, `scripts/report/legal.mjs`, `scripts/check-landing.mjs`, `scripts/new-landing.sh`, `src/layouts/BaseLayout.astro`, `src/components/i18n/` (new), `src/components/legal/`, the skills `new-landing` and `brief-intake`, and tests for each.
- **Existing sites:** unchanged (no `i18n` block, the same build output; their copy of `BaseLayout` is theirs). A brief without `languages` stays valid; `brief missing` now lists the question.
- **Verified end to end** with a throwaway site (`new-site --langs en,es`, build, QA on `/` and `/es/`), removed afterwards.
- **No new dependencies.**
- **Out of scope:**
  - redirecting by browser language (static output cannot read `Accept-Language`; the switcher and `x-default` are the mechanism);
  - right-to-left layouts, per-locale domains, custom locale paths (`{ path, codes }`) and `prefixDefaultLocale: true`;
  - translating the copy automatically or checking its quality;
  - legal texts beyond `en` and `es`; any other locale gets the English texts and a warning;
  - translating the 404 page (one `404.html` in the default language);
  - the owner's landing itself.
