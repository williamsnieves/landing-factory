# Tasks: add-stock-images

## 1. Stock sources in find-images

- [x] 1.1 Add `scripts/lib/pixabay.mjs`: search, get one photo, the manifest entry, the key mask and the 24-hour cache. Verify: unit tests with a fake fetch cover the query parameters, the hit mapping, the masked URL in an error, the cache (a second identical search makes no request) and the 429 backoff.
- [x] 1.2 Wire `pixabay` into `find-images.mjs`: `--source pixabay`, `pixabay:<id>` and page URLs, downloads only from Pixabay hosts, the manifest append, and the test-only `PIXABAY_API_URL` and `STOCK_IMAGE_HOSTS`. Verify: `tests/find-images-stock.test.mjs` against a local fake API and image host covers the search output, `get` writing the file and the entry, a foreign host exiting 1 with nothing written, a missing key exiting 1, and the fake key appearing in no output, file or cache.
- [x] 1.3 Add `find-images.mjs import ... --source pexels` (page URL check, file signature check, no overwrite, the entry). Verify: tests for a good import, a foreign page (exit 2), a non-image file and an existing target (exit 1).

## 2. Credits and check-landing

- [x] 2.1 `credits.mjs`: Pixabay and Pexels entries in the table and `credits.json`, plus one "Photos provided by" line per provider. Verify: `tests/credits.test.mjs` cases with none, one and two providers; Prettier stays clean on the generated `CREDITS.md`.
- [x] 2.2 `check-landing`: `images-credited` and `credits-in-sync` accept both sources, and `prospect` passes them. Verify: tests.
- [x] 2.3 `check-landing` rule `visual-assets`: fail when the page or its hero has no visual, warn with `visual-assets-sparse`, check each locale's home page. Verify: the fixture tests from design.md, then `node scripts/check-landing.mjs --site <slug>` for every existing site, listing the results in the PR (no site is changed in this change).

## 3. Preflight and generation script

- [x] 3.1 `preflight.mjs`: the `pixabay` host and key checks as warnings. Verify: tests with a fake host, where a missing key or an unreachable host warns and still exits 0, and the key value is never printed.
- [x] 3.2 `new-landing.sh`: `--sources` defaults to `pixabay,commons`, with the validation regex and the help text. Verify: `--dry-run` prints the sources; a bad source exits 2.

## 4. Skills

- [x] 4.1 `new-landing` skill: the source order, the Pixabay commands, imported Pexels photos, the license rules (people, endorsement, logo), the caption rule, the imagery plan with visuals for the hero and at least half of the sections, and the prospect section. Verify: existing skill tests updated for the new rules, or a review of the diff where none exist.
- [x] 4.2 `revise-landing` skill: new images follow the same order. Verify: diff review.

## 5. Docs

- [x] 5.1 Write a new `docs/images.md`, and update CLAUDE.md ("Generating a landing", "Prospect landings", "Licensing and credits", the `find-images` row of "Commands"), `docs/prospect.md` and `docs/status.md`. Verify: `npm run format:check`.

## 6. Owner checks and a real run

- [ ] 6.1 The owner reads `https://pixabay.com/api/docs/` and `https://pixabay.com/service/license-summary/` in a browser and confirms the points listed in design.md. Verify: the answer is recorded in `docs/images.md`.
- [ ] 6.2 Once the owner has created a Pixabay key and added it as `PIXABAY_API_KEY`, and `pixabay.com` is allowed in the environment, run one real `search` and one `get` into a scratch site. Verify: the photo and its entry look right, and nothing from the scratch site is committed.
- [ ] 6.3 Full checks: `openspec validate add-stock-images --strict`, `npm run format:check`, `npm run lint` and `npm test`.
