# Tasks: fix-prospect-run-findings

## 1. Sales kit
- [x] 1.1 `writeKit` formats `SALES.md` with the repository's Prettier (markdown parser, the repo config) before writing it. Verify: a test writes a kit for a fixture prospect site and `prettier.check` on the result is true.
- [x] 1.2 "What was built": blend bullets from PROPOSAL.md without the "Planned deviations" bullet; a "Final design" list from MASTER.md `landing-meta` (`primary`, `display-font`, `body-font`, `hero`, `archetype`) and the RUN.md `Signature moment:` line; "not recorded" for missing values. Verify: unit tests on `salesKit` with and without MASTER.md and RUN.md.
- [x] 1.3 Image rule names Pixabay, imported Pexels, Wikimedia Commons and The Met (the sources used, from `assets.json`, when it lists any). Verify: unit test.
- [x] 1.4 `new-landing.sh` runs `prospect.mjs kit` after a passed auto run for a prospect brief (next to `check-landing`), and exits 1 when the kit fails. Verify: a test with a stubbed `claude` (if the existing tests have that harness) or a review of the script and a manual run of the branch with `bash -n`.

## 2. Layout signature
- [x] 2.1 Leave links and buttons whose box lies entirely outside the page out of the button measures. Verify: a fixture page with only an off-screen filled skip link and text-link calls to action measures `buttonShape: text`; a fixture without a skip link measures as before.

## 3. Report
- [x] 3.1 `parseHeadersFile` keeps each block's line number (backwards compatible for its callers).
- [x] 3.2 New static item `headers-duplicate-paths` (security, A02): warn on a repeated pattern with the pattern and lines, pass otherwise, `na` without `_headers`. Verify: report tests with a two-`/*` fixture (warn, verdict not failed) and a one-block fixture (pass).

## 4. Docs and checks
- [x] 4.1 CLAUDE.md ("Prospect landings", "Landing report"), `docs/prospect.md` and the new-landing skill line for the kit (the script now runs it too).
- [x] 4.2 Regenerate `sites/fisioterapia-ribera/SALES.md` with the new kit.
- [x] 4.3 `npm ci && npx prettier --check . && npm run lint && npm run check && npm run check:sites && npm run validate:patterns && npm run validate:archetypes && npm test && openspec validate --all --strict`, plus `npm run report -- --site fisioterapia-ribera --only static` (the new item passes) and `node scripts/layout-signature.mjs --site fisioterapia-ribera` (prints, no write) to confirm the skip link is gone from its button count.
