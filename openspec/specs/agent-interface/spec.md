# agent-interface Specification

## Purpose
Lets any MCP-capable agent drive the landing factory through one local interface: read landings, write and validate briefs, start and follow long-running generation, QA and report jobs, and read their results, without publishing anything and without running arbitrary commands.

## Requirements

### Requirement: Local MCP server over stdio
The repository SHALL provide an MCP server that speaks JSON-RPC 2.0 over stdio, answers `initialize` by echoing a requested protocol version it supports or else its newest one, lists its tools with input schemas, and answers `tools/call`; it MUST write nothing but protocol messages to stdout.

#### Scenario: Client connects
- **WHEN** a client sends `initialize` with a supported protocol version and then `tools/list`
- **THEN** the server answers with that version, its name and the tools capability, and lists every tool with its input schema

#### Scenario: Unknown tool
- **WHEN** a client calls a tool name the server does not have
- **THEN** the server answers with a JSON-RPC error and keeps running

### Requirement: Landing and brief tools
The server SHALL offer tools to list landings, describe one landing, and initialize, validate, summarize, list missing fields of and update a brief; an update SHALL be saved only when the merged brief validates, and MUST NOT mark identity, consent or legal holder fields as assumed.

#### Scenario: Invalid brief update
- **WHEN** an agent updates a brief with an email that is not an address
- **THEN** the tool returns the validation errors and the file on disk is unchanged

#### Scenario: Describe a landing
- **WHEN** an agent asks for `tupathdigital`
- **THEN** the result includes its deploy target, brief summary, last run result and the latest QA and report verdicts with their dates

### Requirement: Background jobs
Proposing and generating a landing, QA and the report SHALL run as background jobs: the tool returns a job id at once, and job state, phase, elapsed time, exit code, result and the last log lines are available by id and survive a restart of the server. At most one generation per landing runs at a time.

#### Scenario: Start and follow a generation
- **WHEN** an agent starts `generate_landing` for a landing and then asks for the job
- **THEN** it gets a job id immediately and later a state of running, then passed or failed with the exit code and the `Result:` line of the run log

#### Scenario: Second generation for the same landing
- **WHEN** a generation is running for a landing and another is requested for it
- **THEN** the tool refuses and names the running job

#### Scenario: Cancel
- **WHEN** an agent cancels a running job
- **THEN** its process group is stopped and the job state becomes cancelled

### Requirement: No publishing and no arbitrary commands
The server MUST NOT publish, commit, push or open pull requests, MUST NOT edit agent settings, project instructions, CI workflows or secrets, and SHALL build every job command from a fixed table with validated arguments; slugs must match the site slug rule and paths must stay inside the repository.

#### Scenario: Path escape
- **WHEN** an agent passes `../etc` as a slug
- **THEN** the tool refuses with the slug rule and starts nothing

### Requirement: No secrets in results
Tool results and job log excerpts MUST NOT include environment variable values; anything shaped like a credential is masked.

#### Scenario: Token in a log line
- **WHEN** a job log line contains an API key
- **THEN** the log excerpt returned by the tool shows it masked

### Requirement: Time and cost per job
Every job SHALL record its wall time, and a generation job SHALL record the token usage and cost reported by Claude Code when available, or say they were not reported.

#### Scenario: Finished generation
- **WHEN** a generation job finishes
- **THEN** its record shows the duration and the input and output tokens and cost from the run, or "not reported"
