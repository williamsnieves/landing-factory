## ADDED Requirements

### Requirement: Copywriting skill with one role
The `copywriting` skill from `marketingskills` SHALL be vendored at the same pinned commit as `seo-audit` and `schema`, recorded in `agent-tooling.lock.json`, installed by `setup:agent` and checked by `setup:verify`. Its only role SHALL be helping to write copy: headline formulas, section copy types and avoiding AI tells. Picking the framework SHALL belong to the project's own `copy-frameworks` skill.

#### Scenario: Verify after setup
- **WHEN** `npm run setup:verify` runs on a checkout with the skill installed
- **THEN** it reports `copywriting` present at the pinned commit

#### Scenario: Agent picks a framework
- **WHEN** an agent needs to decide the persuasion structure of a landing's copy
- **THEN** the project rules point it to `copy-frameworks` and the picker, not to `copywriting`
