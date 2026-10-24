# Tasks

## 1. Brief legal fields

- [ ] 1.1 `scripts/lib/brief-schema.mjs`: `legal.markets` (format `market`), `legal.holder`, `legal.privacyContact` and `legal.processing` (design Decision 4). An `assumed` entry under `legal.holder` or `legal.privacyContact` is an error. `missing` lists the holder fields and the privacy contact when markets are named. Verify: tests in `tests/brief.test.mjs` covering:
  - a valid legal block;
  - a bad market code;
  - a bad email;
  - an assumed tax id (error);
  - `missing` with and without markets;
  - every existing brief, fixture and `sites/tupathdigital/brief.json` still validating.
- [ ] 1.2 `/brief-intake` skill: the legal step (markets, holder, processing, one line of why each is needed, never assumed). Verify: the skill test asserts the step, its order after contact, and the never-assume rule.

## 2. QA privacy record

- [ ] 2.1 `scripts/qa.mjs` and `scripts/qa/browser-checks.mjs`: `pages[].privacy` with cookie names and domains, storage keys and third-party hosts, collected during the 1440 px load after one scroll to the bottom. Values are never stored (design Decision 1). Verify:
  - a fixture page under `tests/fixtures/qa/` sets a first-party cookie and a `localStorage` key, and loads an image from a second local origin;
  - the test asserts the record holds names, keys and hosts, and that `report.json` contains neither the cookie value nor the storage value;
  - the QA verdict is unchanged.

## 3. Report legal area

- [ ] 3.1 `scripts/report/legal-rules.mjs` (tracker hosts, cookie patterns, essential allow list, market rule sets) and the `legal` section in `qa.config.json` (`essentialCookies`, `trackers` extension) (design Decisions 2 and 6). Verify: unit tests for host matching (`youtube.com` against `youtube-nocookie.com`, subdomains), cookie classification and rule-set lookup (`ES`, `EU`, `DE` counted as EU, `US` with no rule set).
- [ ] 3.2 `scripts/report/legal.mjs`, with `legal-cookies` and `legal-third-party`, using build evidence plus the QA record behind the freshness guard. `items.mjs` and `render.mjs` gain the `legal` area and the not-legal-advice line. `--skip legal` works. Verify, with fixtures:
  - a clean page passes with "no banner needed";
  - an unconditional analytics script fails;
  - a `type="text/plain" data-consent` script warns;
  - a QA record with `_ga` at first load fails;
  - an unknown cookie warns;
  - a Google Fonts stylesheet warns for IP disclosure;
  - a stale QA record gives not run.
- [ ] 3.3 `legal-pages`: required pages per market, footer links on every page, required holder data present, and no `data-legal-pending` marker. With no brief, no market or a market without a rule set it warns. Verify, with fixtures:
  - `ES` with both pages and all data passes;
  - `ES` without the notice fails;
  - a pending tax id fails;
  - one page missing the footer link fails;
  - no brief warns;
  - `US` warns "no rule set".
- [ ] 3.4 `legal-price-claims` (design Decision 3). Verify, with fixtures:
  - "50% off" next to a price warns, and with an EU market the fix names the 30-day rule;
  - `<del>` around a price warns;
  - "antes/ahora" warns;
  - a page with no claims passes.

## 4. Legal pages

- [ ] 4.1 `scripts/legal.mjs --site <slug> --write|--check` writes `src/data/legal.json` (design Decision 5). Add `npm run legal` and the allow-list entry. Verify: tests for `--write` from the brief fixture with `ES`, `--check` staleness (exit 1) and the pending list when the tax id is missing.
- [ ] 4.2 Starter components `src/components/legal/{LegalNotice,PrivacyPolicy}.astro` and `texts.ts` (`en`, `es`), with the `data-legal-page` attribute, the pending marker and the not-legal-advice source comment. `new-site` copies the folder. Verify:
  - the `new-site` test asserts the folder is copied;
  - a throwaway site from the `ES` brief fixture gets both pages and footer links, builds, and passes `npm run report -- --site <tmp>` on `legal-pages`;
  - QA passes for it (Lighthouse ≥ 90, no overflow);
  - the throwaway site is removed.
- [ ] 4.3 `/new-landing` skill: with markets, run `legal.mjs --write`, add the required pages and footer links, and list pending fields under Decisions; without markets, write "legal requirements unknown". Verify: the skill test asserts these instructions.

## 5. Existing sites and docs

- [ ] 5.1 Run `npm run qa -- --site <slug> --skip impeccable` and `npm run report -- --site <slug>` on the starter and all seven sites. Record the legal items per site. Verify: no site fails a legal item (expected: warnings for unknown market; tupathdigital warns on its "50% off" claims and on unknown market).
- [ ] 5.2 Docs:
  - `CLAUDE.md`: a "Legal compliance" section, plus the commands, brief and report sections;
  - `README.md`;
  - `scripts/README.md`;
  - `docs/status.md`: a follow-up for tupathdigital's legal pages and the "50% off" review.

  Verify: `npx prettier --check .` and `openspec validate add-legal-compliance --strict`.
- [ ] 5.3 Full pre-push run: `npm ci && npx prettier --check . && npm run check && npm run check:sites && npm run validate:patterns && npm run validate:archetypes && npm test && npm run qa`, plus `npm run qa -- --site tupathdigital`, `npm run report -- --site tupathdigital` and `openspec validate --all --strict`. Verify: every command exits 0.

## Workflow follow-up

- After the user confirms the merge: `openspec archive add-legal-compliance --yes` as the first commit of the next branch, then the tupathdigital legal follow-up (when the owner has given the holder data) or `change/add-ai-images`.
