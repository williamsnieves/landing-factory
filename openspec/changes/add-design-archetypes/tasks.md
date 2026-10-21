# Tasks

## 1. Archetypes

- [x] 1.1 Write `design-archetypes/` (README with the format and the signal and trait vocabularies, plus 10 sheets per design.md Decision 1), in our own words; verify with 1.2 (verified: `npm run validate:archetypes` passes on 10 sheets; tests/archetypes.test.mjs)
- [x] 1.2 `scripts/validate-archetypes.mjs` (+ npm script, CI step next to `validate:patterns`); verify with fixtures (missing field, unknown signal, undefined lent trait) and the catalog passing (verified: tests/archetypes.test.mjs (missing field, unknown signal, undefined lent trait, duplicate owner); CI step added)
- [x] 1.3 `scripts/pick-archetypes.mjs --site <slug>`: signals from the PROPOSAL `Signals:` line or `brief.json`, scoring, exclusion of used blends, reasons; verify with fixtures (ranking, exclusion, deterministic output) (verified: tests/pick-archetypes.test.mjs (ranking, exclusion, determinism, refs raising another archetype, custom outcome, errors))

## 2. Measure

- [x] 2.1 `scripts/layout-signature.mjs --site <slug> [--write]` per design.md Decision 6; verify with fixture pages that differ in one feature each, and write signatures for panaderia, clinica-dental and samurai (no change to those sites) (verified: tests/layout-signature.test.mjs (one-feature fixture pages, --write, no server left); signatures written for the three sites)
- [x] 2.2 `check-landing` diversity: layout distance and screenshot hash rule with thresholds in `qa.config.json`; verify the three existing sites are reported as close to each other (the measure sees the problem; reported as a calibration note, not a failure of this change) and fixtures pass and fail as expected; the archetype-target warning of design.md Risks (verified: tests/layout-signature.test.mjs and tests/check-landing.test.mjs; calibration in docs/status.md)

## 3. Generation

- [x] 3.1 `/new-landing` and `new-site`: remove panaderia as worked example; synthesis writes `Signals:`, runs `pick-archetypes`, chooses a blend and one requirement-driven twist, records them in PROPOSAL and `landing-meta` (`archetype`, `traits`); build follows the archetype sheets; final check writes the layout signature; verify with `tests/new-site.test.mjs`, `tests/new-landing.test.mjs` and a dry run (verified: tests/new-site.test.mjs, tests/new-landing.test.mjs (dry run); the full pipeline run belongs to task 4)
- [x] 3.2 Docs: CLAUDE.md, README.md, `sites/README.md`, `scripts/README.md`, `design-archetypes/README.md`, `docs/status.md` (verified: docs updated, prettier --check clean)

## 4. Validation (three-niche pilot)

- [ ] 4.1 Generate three landings for different niches with one `new-landing.sh --auto` command each; verify each passes site QA and `check-landing` (new diversity rule included) with no touch-ups, and that all six sites are pairwise different by the new measure
- [ ] 4.2 Record niches, blends, signatures and run times; the owner reviews the previews

## Workflow follow-up

- Open PR, review and merge.
- `openspec archive add-design-archetypes` after merge.
