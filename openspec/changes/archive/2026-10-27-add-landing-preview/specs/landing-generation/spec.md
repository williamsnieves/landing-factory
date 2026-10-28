## ADDED Requirements

### Requirement: Visual directions before the build
`scripts/new-landing.sh <slug> --directions [--count 2|3]` SHALL build 2 or 3 visual directions as `noindex` pages at `/directions/<id>/` in `sites/<slug>/`, each with a hero and one section from the brief's real copy, its own page-scoped palette and fonts from ui-ux-pro-max and a primary archetype no other direction uses. It SHALL write `directions.json` and `DIRECTIONS.md`, pass QA and stop with `Result: directions` without running the full build.

#### Scenario: Three directions
- **WHEN** a directions run finishes for a site with a valid brief
- **THEN** `dist/directions/a/`, `b/` and `c/` exist and are `noindex`, `directions.json` records a different primary archetype for each, and `RUN.md` says `Result: directions`

#### Scenario: Directions too similar
- **WHEN** `node scripts/directions.mjs check --site <slug>` runs on a record where two directions share a primary archetype
- **THEN** it exits 1 naming both directions

### Requirement: Recorded customer choice
`node scripts/directions.mjs choose --site <slug> --direction <id> [--notes "..."]` SHALL record the chosen direction, the customer's notes and the date in `directions.json`. It SHALL refuse an unknown direction and a site whose direction pages were already removed by the build.

#### Scenario: Choice with notes
- **WHEN** the owner runs `choose --direction b --notes "warmer photos"`
- **THEN** `directions.json` has `choice.direction` `b`, the notes and today's date

### Requirement: Build from the chosen direction
On `--resume`, a site with `directions.json` SHALL build only after a choice is recorded. The full build SHALL take the chosen direction's archetype blend, palette and fonts as its starting point and the customer's notes as fixed inputs, and SHALL remove the direction pages, their scoped styles and components before building. A site without `directions.json` SHALL build as before.

#### Scenario: No choice yet
- **WHEN** `new-landing.sh <slug> --resume --auto` runs on a site whose `directions.json` has no choice
- **THEN** it exits 1 naming `node scripts/directions.mjs choose`

#### Scenario: Chosen direction
- **WHEN** the build resumes after `choose --direction b`
- **THEN** the proposal's "Archetype blend" is direction `b`'s and the built site has no `/directions/` pages
