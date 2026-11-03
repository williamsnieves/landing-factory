## ADDED Requirements

### Requirement: CRO and psychology skills with one role each
The `cro` and `marketing-psychology` skills from `marketingskills` SHALL be vendored at the same pinned commit as the other `marketingskills` skills, recorded in `agent-tooling.lock.json`, installed by `setup:agent` and checked by `setup:verify`. `cro` SHALL be used only as the review framework for a built page. `marketing-psychology` SHALL be used only as a reference of principles while writing the Conversion plan. Neither SHALL decide palette, fonts, the copy framework or facts.

#### Scenario: Verify after setup
- **WHEN** `npm run setup:verify` runs on a checkout with both skills installed
- **THEN** it reports `cro` and `marketing-psychology` present at the pinned commit
