# agent-tooling Specification

## Purpose
Ensures every Claude Code session on the repo has the same tools (MCP servers and design skills), with pinned versions, clear roles and no unwanted telemetry.

## Requirements

### Requirement: Versioned MCP servers
The repo SHALL declare, in a versioned config file, an Astro documentation MCP server and a browser MCP server, available when the project is opened in Claude Code.

#### Scenario: New session
- **WHEN** the repo is opened in Claude Code and the project servers are approved
- **THEN** Astro documentation search and browser control tools are available

### Requirement: Design skills installed in the project
The ui-ux-pro-max, taste-skill and impeccable skills SHALL be available at project level, and their source and version or commit SHALL be recorded in a versioned manifest.

#### Scenario: Checking versions
- **WHEN** the tooling manifest is read
- **THEN** each skill appears with its source repository, version or commit, license and install date

### Requirement: Reproducible and idempotent setup
The repo SHALL include a setup command that installs or verifies all agent tools, and running it twice in a row MUST leave the same result with no errors.

#### Scenario: Running twice
- **WHEN** the setup runs twice on the same checkout
- **THEN** both runs exit with code 0 and the second does not modify versioned files

#### Scenario: Missing tool
- **WHEN** a skill or required binary is missing and there is no network to install it
- **THEN** the setup exits with a non-zero code naming the missing tool

### Requirement: Third-party telemetry disabled
The setup MUST disable impeccable's anonymous telemetry and OpenSpec's telemetry for this project.

#### Scenario: After setup
- **WHEN** the setup completes successfully
- **THEN** impeccable telemetry reports as disabled and the OpenSpec opt-out variable is set for the project

### Requirement: One role per skill
The project rules SHALL assign each design skill a single role: design tokens (ui-ux-pro-max), art direction and images (taste-skill), critique and polish (impeccable).

#### Scenario: Agent picks a tool
- **WHEN** an agent needs to define a niche's palette and fonts
- **THEN** the rules tell it to use ui-ux-pro-max and not the other two skills for that task

### Requirement: Several skills from one repository
`scripts/setup-agent.sh` SHALL install more than one vendored skill from the same repository and commit, each from its own subpath into its own folder.

#### Scenario: Two skills, one commit
- **WHEN** the lock lists `seo-audit` and `schema` with the same repository and commit
- **THEN** setup installs both folders and `setup:verify` reports both present

### Requirement: Copywriting skill with one role
The `copywriting` skill from `marketingskills` SHALL be vendored at the same pinned commit as `seo-audit` and `schema`, recorded in `agent-tooling.lock.json`, installed by `setup:agent` and checked by `setup:verify`. Its only role SHALL be helping to write copy: headline formulas, section copy types and avoiding AI tells. Picking the framework SHALL belong to the project's own `copy-frameworks` skill.

#### Scenario: Verify after setup
- **WHEN** `npm run setup:verify` runs on a checkout with the skill installed
- **THEN** it reports `copywriting` present at the pinned commit

#### Scenario: Agent picks a framework
- **WHEN** an agent needs to decide the persuasion structure of a landing's copy
- **THEN** the project rules point it to `copy-frameworks` and the picker, not to `copywriting`

### Requirement: CRO and psychology skills with one role each
The `cro` and `marketing-psychology` skills from `marketingskills` SHALL be vendored at the same pinned commit as the other `marketingskills` skills, recorded in `agent-tooling.lock.json`, installed by `setup:agent` and checked by `setup:verify`. `cro` SHALL be used only as the review framework for a built page. `marketing-psychology` SHALL be used only as a reference of principles while writing the Conversion plan. Neither SHALL decide palette, fonts, the copy framework or facts.

#### Scenario: Verify after setup
- **WHEN** `npm run setup:verify` runs on a checkout with both skills installed
- **THEN** it reports `cro` and `marketing-psychology` present at the pinned commit
