# Tasks: add-reference-archetypes

## 1. Archetype sheets
- [ ] 1.1 Write `design-archetypes/chaptered-atlas.md` and `design-archetypes/dev-console.md` in our own words (front matter as in the proposal, signature ranges that fit the grammar, all body sections, the guard rails under Don't), never naming a real site. Verify: `npm run validate:archetypes`.
- [ ] 1.2 README: catalog entries and the four traits (`self-map-hero`, `chapter-color-fields`, `mono-meta-rows`, `generative-dot-field`) with their owners. Verify: `npm run validate:archetypes` (lends match the traits table).

## 2. Picker
- [ ] 2.1 `REF_RULES` keyword rules so `patterns/claude-dev.md` and `patterns/shopify-editions.md` map onto the vocabulary. Verify: tests for the two scenarios of the spec (top blend with each reference) and the fisioterapia-ribera ranking unchanged at the top (`calm-statement` first).
- [ ] 2.2 Run the picker for every existing site with a brief and record any ranking change in the PR. Verify: command output.

## 3. Docs and checks
- [ ] 3.1 CLAUDE.md ("Design archetypes": 14 sheets), `docs/status.md`.
- [ ] 3.2 `openspec validate --all --strict`, `npm run validate:archetypes`, `npm run validate:patterns`, `npx prettier --check .`, `npm run lint`, `npm test`.
