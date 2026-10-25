# Tasks

## 1. Brief

- [x] 1.1 `scripts/lib/brief-schema.mjs`: optional `languages` (lowercase tags, includes `language`, no duplicates), `briefLocales`, `missing` entry after the page language, `summary` header (design Decision 8, Context). Verify: `tests/i18n-brief.test.mjs` (valid lists, an older brief, duplicate, missing default, bad tag, non-array, `briefLocales`, `missing` until answered, `summary`), `tests/brief.test.mjs` (updated orders, every `sites/*/brief.json` still validates). (verified: both pass)
- [x] 1.2 `.claude/skills/brief-intake/SKILL.md`: "The languages question" (one language or more, recorded, never assumed, lowercase tags, default in the list). Verify: `tests/i18n-skills.test.mjs`. (verified)

## 2. Scaffold, layout and switcher

- [x] 2.1 `scripts/new-site.mjs`: `--langs` and `--lang`, `resolveLocales`, the `i18n` block in `astro.config.mjs` (security block kept), a page per locale, `src/i18n/ui.ts`, `src/i18n/urls.ts`, `src/components/i18n/`, PROPOSAL/README notes; a site without `--langs` unchanged (design Decisions 1 and 2). Verify: `tests/i18n-site.test.mjs`: `resolveLocales` cases, the written files and config for `en,es` and for `--lang es`, the CLI errors (one language, duplicate, uppercase) creating nothing, a hyphenated tag quoted with a translate note, the single-language config equal to the starter's byte for byte, Prettier-formatted output. (verified)
- [x] 2.2 `src/layouts/BaseLayout.astro` (`lang` from the current locale, hreflang alternates plus `x-default` loaded through `import.meta.glob('../i18n/urls.ts')`, `skipLabel`, `localeSlugs`), `src/components/i18n/paths.ts` and `LanguageSwitcher.astro` (design Decisions 3 and 4). Verify: `tests/i18n-site.test.mjs` builds scaffolded sites: three locales with `site` set (lang, alternates, canonical, switcher links and `aria-current`), a page with a different slug per locale, relative URLs without `site`, the 404 without alternates, a single-language site with no `hreflang`; the starter builds and `npm run check` passes. (verified)

## 3. Legal pages per locale

- [x] 3.1 `scripts/legal.mjs` (`defaultLocale`, `locales[].paths` for multi-locale briefs only, a warning per locale without texts) and `src/components/legal/` (`locale` prop, `textsFor(data, locale)`, `legalPath`) (design Decision 5). Verify: `tests/i18n-legal.test.mjs`: paths for `en,es` and an `es` default, only the required pages, the `fr` fallback warning, single-language keys unchanged, CLI `--write` and `--check` with a new locale. (verified)
- [x] 3.2 `scripts/report/legal.mjs`: `legal-pages` per locale (every required page in every locale, each page linking its own locale's pages, locale prefix ignored when finding pages). Verify: `tests/i18n-legal.test.mjs`: pass, found by path, missing page in one locale, footer linking the other language, single-language behaviour; `tests/i18n-legal-site.test.mjs`: a built bilingual site renders both languages, links its own footers, and the report passes `legal-pages`. Existing `tests/landing-report-legal.test.mjs` and `tests/legal*.test.mjs` unchanged and green. (verified)

## 4. Final check

- [x] 4.1 `scripts/lib/i18n-site.mjs` and the `i18n` rule of `scripts/check-landing.mjs` (design Decision 6): config, dictionary and brief locales, home pages, `lang`, alternates (complete, targets built, canonical, reciprocal, `x-default`), switcher, dictionary mix, the `i18n-absolute-urls` warning. Verify: `tests/i18n-check.test.mjs`: a passing site, one failing case per rule, readers for config, dictionary and markup. (verified)
- [x] 4.2 `ai-provenance` on every locale's home page (own language) and `brief-facts` (default locale page, business name on the others). Verify: `tests/i18n-check.test.mjs`: disclosure missing on one locale, left in English, hidden; single-language unchanged; business name missing on a locale page. `tests/check-landing.test.mjs` unchanged and green. (verified)

## 5. Generation

- [x] 5.1 `scripts/new-landing.sh`: `--langs`, `languages` from the brief, passed to `new-site` and the skill. Verify: `tests/i18n-new-landing.test.mjs` (bilingual brief, one language, `--langs` with `--lang`, invalid lists exit 2 and create nothing); `tests/new-landing.test.mjs` unchanged and green. (verified)
- [x] 5.2 `.claude/skills/new-landing/SKILL.md`: "Languages" and "Multi-locale landings" (natural copy per locale, same sections, dictionary or content files, switcher, `site` from the domain, legal pages and disclosure per locale, 404, signature, Decisions, native-speaker note) and the final-check line. Verify: `tests/i18n-skills.test.mjs`. (verified)

## 6. End to end

- [x] 6.1 With a throwaway site: `npm run new-site -- tmp-i18n --langs en,es`, `npm install`, indexable pages with `site` set, `npm run check -w site-tmp-i18n`, build, `dist/index.html` (lang `en`) and `dist/es/index.html` (lang `es`) with reciprocal hreflang and `x-default`, then `npm run qa -- --site tmp-i18n` (Lighthouse included) passing on `/` and `/es/`; remove `sites/tmp-i18n` and restore `package-lock.json` (no trace in `git status`). (verified: 0 type errors; QA passed with both pages in the report: three widths, reduced motion, Lighthouse 100/100/100/100)

## 7. Docs and specs

- [x] 7.1 Docs: `CLAUDE.md` (Sites, Customer brief, Generating a landing, Legal, AI images, Scope discipline, folder structure), `docs/status.md`, `docs/legal.md`, `sites/README.md`, `scripts/README.md`, `src/layouts/README.md`. Verify: `npx prettier --check .` and `openspec validate add-bilingual-landing --strict`. (verified)

## 8. Full run

- [x] 8.1 In the working tree: `npx prettier --check .`, `npm test`, `npm run check`, `npm run check:sites` (existing sites unchanged), `openspec validate --all --strict`. (verified: see the report of the implementing session)
- [ ] 8.2 Full pre-push run in a clean clone (main session): `npm ci && npx prettier --check . && npm run check && npm run check:sites && npm run validate:patterns && npm run validate:archetypes && npm test && npm run qa`, plus `openspec validate --all --strict`.

## Workflow follow-up

- After the user confirms the merge: `openspec archive add-bilingual-landing --yes` as the first commit of the next branch (the owner's personal-brand landing, which is bilingual).
