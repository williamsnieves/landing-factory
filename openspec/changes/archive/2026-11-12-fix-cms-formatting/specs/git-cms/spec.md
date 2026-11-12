## ADDED Requirements

### Requirement: Pulled files follow the factory formatting
`cms.mjs pull` SHALL format every file it writes with the factory's Prettier configuration, so that the factory's `format:check` passes after a pull.

#### Scenario: Pull of a file saved by the CMS
- **WHEN** the clone holds a CMS file in the formatting Pages CMS writes
- **THEN** the pulled file in `sites/<slug>/` passes `prettier --check` and holds the same values
