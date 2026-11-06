# Tasks: add-calm-statement-archetype

## 1. Archetypes

- [x] 1.1 Write `design-archetypes/calm-statement.md` (front matter and body as in design.md, our own words), and add it and its two traits to the README catalog and traits table. Verify: `npm run validate:archetypes`.
- [x] 1.2 Add `impact` to the front matter of the 11 existing sheets, with the levels from the proposal; document the field in the README sheet format. Verify: `npm run validate:archetypes`.
- [x] 1.3 `validate-archetypes.mjs`: require `impact` (non-empty subset of `quiet|balanced|bold`, no duplicates). Verify: tests for missing, unknown and duplicate levels.

## 2. Brief and picker

- [x] 2.1 `brief-schema.mjs`: `brand.impact` with `IMPACT_LEVELS`, assumable, listed by `missing` (recommended), shown by `summary`. Verify: brief schema tests (unknown value, assumed, missing, summary) and that every existing `sites/*/brief.json` still validates.
- [x] 2.2 `pick-archetypes.mjs`: the impact score, `balanced` assumed by default, the level in the reasons and in `--json`. Verify: tests with the fisioterapia-ribera signals for `balanced` and `quiet`; `node scripts/pick-archetypes.mjs --site fisioterapia-ribera` prints the new ranking (record it in the PR).

## 3. Signature moment

- [x] 3.1 `new-site.mjs`: the `## Signature moment` heading and prompt after "Archetype blend" in the PROPOSAL template. Verify: the new-site template test.
- [x] 3.2 `new-landing` skill: fill the section in the synthesis (every impact level, no invented proof), build it, and record it in RUN.md "Design decisions"; use `brand.impact` in the synthesis. `brief-intake` skill: ask for the impact level without assuming. Verify: skill-text tests where they exist, else diff review.

## 4. Docs and checks

- [x] 4.1 Update CLAUDE.md ("Design archetypes": 12 sheets, the `impact` field; "Customer brief": `brand.impact`; "Generating a landing": the signature moment) and the archetype README (`docs/status.md` is left to the main session). Verify: `npm run format:check`.
- [x] 4.2 Full checks: `openspec validate add-calm-statement-archetype --strict`, `npm run validate:archetypes`, `npm run format:check`, `npm run lint`, `npm test`.
