# Tasks

## 1. Brief legal fields

- [x] 1.1 `scripts/lib/brief-schema.mjs`: `legal.markets` (format `market`), `legal.holder`, `legal.privacyContact` and `legal.processing` (design Decision 4). An `assumed` entry under `legal.holder` or `legal.privacyContact` is an error. `missing` lists the holder fields and the privacy contact when markets are named. Verify: tests in `tests/brief.test.mjs` covering: (verified: tests/brief.test.mjs (valid legal block, bad market and email, assumed tax id and the other identity paths error, missing with and without markets, every sites/*/brief.json including tupathdigital validates))
  - a valid legal block;
  - a bad market code;
  - a bad email;
  - an assumed tax id (error);
  - `missing` with and without markets;
  - every existing brief, fixture and `sites/tupathdigital/brief.json` still validating.
- [x] 1.2 `/brief-intake` skill: the legal step (markets, holder, processing, one line of why each is needed, never assumed). Verify: the skill test asserts the step, its order after contact, and the never-assume rule. (verified: tests/brief.test.mjs brief-intake skill test asserts the legal step, its place after contact and before assets, the never-assume rule and the not-legal-advice line)

## 2. QA privacy record

- [x] 2.1 `scripts/qa.mjs` and `scripts/qa/browser-checks.mjs`: `pages[].privacy` with cookie names and domains, storage keys and third-party hosts, collected during the 1440 px load after one scroll to the bottom. Values are never stored (design Decision 1). Verify: (verified: tests/qa.e2e.test.mjs privacy fixture: record has `_ga` with its domain, `fx_pref`/`fx_tab` keys and the second host; report.json and report.md contain none of the cookie, localStorage or sessionStorage values; verdict passed)
  - a fixture page under `tests/fixtures/qa/` sets a first-party cookie and a `localStorage` key, and loads an image from a second local origin;
  - the test asserts the record holds names, keys and hosts, and that `report.json` contains neither the cookie value nor the storage value;
  - the QA verdict is unchanged.

## 3. Report legal area

- [x] 3.1 `scripts/report/legal-rules.mjs` (tracker hosts, cookie patterns, essential allow list, market rule sets) and the `legal` section in `qa.config.json` (`essentialCookies`, `trackers` extension) (design Decisions 2 and 6). Verify: unit tests for host matching (`youtube.com` against `youtube-nocookie.com`, subdomains), cookie classification and rule-set lookup (`ES`, `EU`, `DE` counted as EU, `US` with no rule set). (verified: tests/landing-report-legal.test.mjs unit tests for host matching (youtube.com vs youtube-nocookie.com, subdomains, path and dnt rules), cookie classification and market lookup (ES, EU, DE counted as EU, US none))
- [x] 3.2 `scripts/report/legal.mjs`, with `legal-cookies` and `legal-third-party`, using build evidence plus the QA record behind the freshness guard. `items.mjs` and `render.mjs` gain the `legal` area and the not-legal-advice line. `--skip legal` works. Verify, with fixtures: (verified: tests/landing-report-legal.test.mjs clean page passes with 'no consent banner needed'; analytics script fails; text/plain data-consent warns; `_ga` in the QA record fails; unknown cookie warns; Google Fonts warns; stale QA record gives not-run; `--skip legal` works)
  - a clean page passes with "no banner needed";
  - an unconditional analytics script fails;
  - a `type="text/plain" data-consent` script warns;
  - a QA record with `_ga` at first load fails;
  - an unknown cookie warns;
  - a Google Fonts stylesheet warns for IP disclosure;
  - a stale QA record gives not run.
- [x] 3.3 `legal-pages`: required pages per market, footer links on every page, required holder data present, and no `data-legal-pending` marker. With no brief, no market or a market without a rule set it warns. Verify, with fixtures: (verified: tests/landing-report-legal.test.mjs ES with both pages passes; ES without the notice fails naming the generator command; pending tax id fails; a page without the footer link fails; no brief and US warn)
  - `ES` with both pages and all data passes;
  - `ES` without the notice fails;
  - a pending tax id fails;
  - one page missing the footer link fails;
  - no brief warns;
  - `US` warns "no rule set".
- [x] 3.4 `legal-price-claims` (design Decision 3). Verify, with fixtures: (verified: tests/landing-report-legal.test.mjs '50% off' warns and an EU market adds the 30-day rule; `<del>` price and antes/ahora warn; a page with no claims passes)
  - "50% off" next to a price warns, and with an EU market the fix names the 30-day rule;
  - `<del>` around a price warns;
  - "antes/ahora" warns;
  - a page with no claims passes.

## 4. Legal pages

- [x] 4.1 `scripts/legal.mjs --site <slug> --write|--check` writes `src/data/legal.json` (design Decision 5). Add `npm run legal` and the allow-list entry. Verify: tests for `--write` from the brief fixture with `ES`, `--check` staleness (exit 1) and the pending list when the tax id is missing. (verified: tests/legal.test.mjs: `--write` from the ES fixture, `--check` stale then up to date, pending list without the tax id, Prettier-stable output; `npm run legal` and the allow-list entry)
- [x] 4.2 Starter components `src/components/legal/{LegalNotice,PrivacyPolicy}.astro` and `texts.ts` (`en`, `es`), with the `data-legal-page` attribute, the pending marker and the not-legal-advice source comment. `new-site` copies the folder. Verify: (verified: tests/new-site.test.mjs file list includes src/components/legal/*; tests/legal-site.test.mjs scaffolds a throwaway site from the ES fixture under .cache/, builds it and the report's legal-pages passes (pending marker fails); a hand-run throwaway site passed QA (Lighthouse 100/100/100 on three pages, no overflow, impeccable clean) and was removed)
  - the `new-site` test asserts the folder is copied;
  - a throwaway site from the `ES` brief fixture gets both pages and footer links, builds, and passes `npm run report -- --site <tmp>` on `legal-pages`;
  - QA passes for it (Lighthouse ≥ 90, no overflow);
  - the throwaway site is removed.
- [x] 4.3 `/new-landing` skill: with markets, run `legal.mjs --write`, add the required pages and footer links, and list pending fields under Decisions; without markets, write "legal requirements unknown". Verify: the skill test asserts these instructions. (verified: tests/brief.test.mjs new-landing skill test asserts the legal pages step, the generator commands, the footer links, the pending rule and 'legal requirements unknown')

## 5. Existing sites and docs

- [x] 5.1 Run `npm run qa -- --site <slug> --skip impeccable` and `npm run report -- --site <slug>` on the starter and all seven sites. Record the legal items per site. Verify: no site fails a legal item (expected: warnings for unknown market; tupathdigital warns on its "50% off" claims and on unknown market). (verified: QA passed on the starter and all seven sites (estudio-arquitectura scored 76 mobile once while other commands ran, and passed with --runs 3 on a quiet machine); no site fails a legal item. Starter, app-finanzas, clinica-dental, estudio-arquitectura, festival-electronica, panaderia, samurai: cookies pass, third-party pass, legal-pages warn (no brief), price claims pass. tupathdigital: cookies pass, third-party pass, legal-pages warn (brief names no market), price claims warn (7 '50% off' claims))
- [x] 5.2 Docs: (verified: `npx prettier --check .` and `openspec validate add-legal-compliance --strict` pass; docs/legal.md added)
  - `CLAUDE.md`: a "Legal compliance" section, plus the commands, brief and report sections;
  - `README.md`;
  - `scripts/README.md`;
  - `docs/status.md`: a follow-up for tupathdigital's legal pages and the "50% off" review.

  Verify: `npx prettier --check .` and `openspec validate add-legal-compliance --strict`.
- [x] 5.3 Full pre-push run: `npm ci && npx prettier --check . && npm run check && npm run check:sites && npm run validate:patterns && npm run validate:archetypes && npm test && npm run qa`, plus `npm run qa -- --site tupathdigital`, `npm run report -- --site tupathdigital` and `openspec validate --all --strict`. Verify: every command exits 0. (verified: prettier, check, check:sites, validate:patterns, validate:archetypes, npm test (427 pass), npm run qa, qa and report for tupathdigital, openspec validate --all --strict all exit 0 (npm ci is repeated in a clean clone by the main session))

## Workflow follow-up

- After the user confirms the merge: `openspec archive add-legal-compliance --yes` as the first commit of the next branch, then the tupathdigital legal follow-up (when the owner has given the holder data) or `change/add-ai-images`.
