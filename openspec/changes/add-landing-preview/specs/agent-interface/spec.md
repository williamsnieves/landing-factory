## ADDED Requirements

### Requirement: Preview job and choice tool
The MCP server SHALL offer a `preview_landing` job that runs the directions form of `new-landing.sh` through the fixed command table, and a `choose_direction` tool that validates its input with the directions schema and writes only `sites/<slug>/directions.json`. `get_landing` SHALL include the directions and the choice when they exist. `preview_landing` SHALL NOT be allowed without a person's approval in `.claude/settings.json`.

#### Scenario: Choice through the interface
- **WHEN** an agent calls `choose_direction` with an existing slug and direction `a`
- **THEN** `directions.json` records the choice and no other file changes

#### Scenario: Invalid direction
- **WHEN** `choose_direction` names a direction the record does not have
- **THEN** the tool returns `isError: true` and writes nothing
