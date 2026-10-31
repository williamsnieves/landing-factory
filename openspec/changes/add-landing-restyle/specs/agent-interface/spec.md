## MODIFIED Requirements

### Requirement: Revision job
The MCP server SHALL offer a `revise_landing` job that writes the feedback (at most 4000 characters) to the job folder and runs `revise-landing.sh` through the fixed command table, with `--restyle` when the optional `restyle` argument is true, refusing a transferred site. `get_landing` SHALL include the revision count and last result, the exported repository and the transfer state. `revise_landing` SHALL NOT be allowed without a person's approval in `.claude/settings.json`, and no tool SHALL sync or transfer.

#### Scenario: Revision through the interface
- **WHEN** an agent calls `revise_landing` with a slug and feedback text
- **THEN** a job starts whose command is `revise-landing.sh <slug> --feedback <job folder>/feedback.txt`

#### Scenario: Restyle through the interface
- **WHEN** an agent calls `revise_landing` with `restyle: true`
- **THEN** the job's command is `revise-landing.sh <slug> --restyle --feedback <job folder>/feedback.txt`

#### Scenario: Transferred site
- **WHEN** `revise_landing` names a transferred site
- **THEN** the tool returns `isError: true` and starts no job
