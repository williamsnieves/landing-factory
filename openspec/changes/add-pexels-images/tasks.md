# Tasks: add-pexels-images

## 1. Pexels client and find-images

- [ ] 1.1 Add `scripts/lib/pexels.mjs` (search, get one photo, build the manifest entry). Verify: unit tests with a fake fetch cover the query parameters, the photo object mapping, a 401 message without the key, and 429 handling.
- [ ] 1.2 Wire `pexels` into `find-images.mjs` (`--source pexels`, `pexels:<id>` and photo URLs, download only from `images.pexels.com`, the standard widths, the manifest append), and add the test-only `PEXELS_API_URL` and `PEXELS_IMAGE_HOSTS`. Verify: `tests/find-images-pexels.test.mjs` against a local fake API and image host: search output, `get` writes the file and the entry, a foreign download host exits 1 and writes nothing, and the fake key appears in no output or file.

## 2. Credits and check-landing

- [ ] 2.1 `credits.mjs`: Pexels entries in the photo table and `credits.json`, plus the "Photos provided by Pexels" line and item. Verify: `tests/credits.test.mjs` cases with and without Pexels entries; Prettier stays clean on the generated `CREDITS.md`.
- [ ] 2.2 `check-landing`: `images-credited` and `credits-in-sync` accept Pexels entries; `prospect` passes them. Verify: tests.
- [ ] 2.3 `check-landing` rule `visual-assets` (fail when the page or its hero has no visual, the warning `visual-assets-sparse`, each locale's home page). Verify: fixture tests from design.md; `node scripts/check-landing.mjs --site <slug>` for every existing site reports the result (no site is changed in this change; list any that would fail).

## 3. Preflight and generation script

- [ ] 3.1 `preflight.mjs`: `pexels` host checks as warnings. Verify: tests with fake hosts (a 401 counts as reachable; an unreachable host warns and still exits 0).
- [ ] 3.2 `new-landing.sh`: `--sources` default `pexels,commons`, the validation regex, the help text. Verify: `--dry-run` prints the sources; a bad source exits 2.

## 4. Skills

- [ ] 4.1 `new-landing` skill: source order, Pexels commands, people rule, caption rule, imagery plan with visuals for the hero and at least half of the sections, prospect section. Verify: `tests/*skills*.test.mjs` assertions on the new rules, if such tests exist for the skill; otherwise a review of the diff.
- [ ] 4.2 `revise-landing` skill: new images follow the same order. Verify: diff review.

## 5. Docs

- [ ] 5.1 New `docs/images.md`; update CLAUDE.md ("Generating a landing", "Prospect landings", "Licensing and credits", "Commands" row for `find-images`), `docs/prospect.md`, `docs/status.md`. Verify: `npm run format:check`.

## 6. Owner checks and a real run

- [ ] 6.1 The owner reads `https://www.pexels.com/license/` and the API terms in a browser and confirms the points listed in design.md (this session receives a bot challenge there). Verify: the owner's answer is recorded in `docs/images.md`.
- [ ] 6.2 With the owner's key saved for `api.pexels.com` and the host allowed in the environment, one real `search` and one `get` into a scratch site. Verify: the photo and its entry look right; nothing is committed from the scratch site.
- [ ] 6.3 Full checks: `openspec validate add-pexels-images --strict`, `npm run format:check`, `npm run lint`, `npm test`.
