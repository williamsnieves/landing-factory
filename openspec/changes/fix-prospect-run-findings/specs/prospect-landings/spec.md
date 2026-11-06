## ADDED Requirements

### Requirement: Sales kit after every prospect build
`scripts/new-landing.sh` SHALL run `node scripts/prospect.mjs kit --site <slug>` after an auto run that ends `Result: passed` when the brief's `prospect.status` is `prospect`, and SHALL fail the run when the kit cannot be written. The kit SHALL be formatted with the repository's Prettier before it is written.

#### Scenario: Run that skipped the kit
- **WHEN** a prospect auto run ends `Result: passed` and the skill did not write `SALES.md`
- **THEN** `new-landing.sh` writes it, and `npx prettier --check sites/<slug>/SALES.md` passes

#### Scenario: Customer brief
- **WHEN** an auto run for a brief without a prospect section ends `Result: passed`
- **THEN** no `SALES.md` is written

### Requirement: Sales kit describes the built page
The kit's "What was built" section SHALL list the proposal's blend without its planned deviations and the final design the build recorded: `primary`, `display-font`, `body-font`, `hero` and `archetype` from the `landing-meta` block of `design-system/<slug>/MASTER.md` and the `Signature moment:` line of `RUN.md`, printing "not recorded" for a missing value. Its image rule SHALL name the stock and archive sources a prospect may use.

#### Scenario: Final design in the kit
- **WHEN** the kit is written for a build whose MASTER.md `landing-meta` says `primary: #7a2e3f` and whose RUN.md has a `Signature moment:` line
- **THEN** "What was built" lists that primary and the signature moment line, and does not contain the proposal's "Planned deviations" text
