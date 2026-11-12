## ADDED Requirements

### Requirement: Sync compares CMS files by value
`sync-export.mjs` SHALL compare a CMS-managed JSON or YAML file by its parsed value, falling back to its bytes when it does not parse, and SHALL list it as `kept (managed by the CMS)` only when the values differ or the file exists on one side only.

#### Scenario: Same content, other formatting
- **WHEN** the clone's CMS file and the factory's hold the same values with different formatting
- **THEN** sync lists no kept file for it

#### Scenario: Edited value
- **WHEN** a value in the clone's CMS file differs from the factory's
- **THEN** sync keeps the clone's file and lists it as kept
