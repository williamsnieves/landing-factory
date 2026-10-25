# Proposal: add-agent-interface

## Why

Today a person drives the factory by hand: they run `/brief-intake`, then `new-landing.sh`, then `npm run qa` and `npm run report`, and read files to see where things stand. The product plan makes the factory usable by any agent, including Claude Code, Claude Desktop, Cursor or a future job runner, through one interface. The owner chose a first step (owner, 2026-10-25):

- **Where it runs:** a local MCP server next to the repository, talking over stdio. There is no public service yet.
- **What it can do:** every action except publishing, which stays a PR plus CI.

A generation takes 30 to 70 minutes, so it has to run as a background job that an agent can start, follow and stop. Recording time and token cost per run is the first step towards pricing it.

## What Changes

- **MCP server.** `scripts/mcp/server.mjs` is a Model Context Protocol server over stdio, written in the repository with no SDK dependency. It speaks JSON-RPC 2.0 and handles `initialize` with version negotiation, `tools/list` and `tools/call`. It is registered in `.mcp.json` as `landing-factory`, so a Claude Code session in the repository finds it. It offers these tools:
  - **Landings:** `list_landings`, and `get_landing` for one landing. `get_landing` returns its target, brief summary, last run result, last QA and report verdicts, and preview URL if known.
  - **Briefs:** `brief_init`, `brief_validate`, `brief_missing`, `brief_summary` and `brief_update`. `brief_update` merges answers into the brief and saves only a result that validates. It refuses to mark identity, consent or legal holder data as assumed, keeping the rules the CLI already enforces.
  - **Jobs:** `propose_landing` (generation stopping at the proposal checkpoint), `generate_landing` (full or `--resume --auto`), `run_qa` and `run_report`. Each starts a background job and returns a job id at once.
  - **Following jobs:** `get_job` returns state, phase, elapsed time, exit code and result. `list_jobs`, `tail_job_log` (the last lines, with secrets masked) and `cancel_job` complete the set.
  - **Reading results:** `get_report` and `get_qa` read the latest report or QA results as structured data.
- **Jobs.** Jobs run as separate processes and keep their state in `.cache/jobs/<id>/`: `job.json`, the log and the exit code. They survive a restart of the MCP server and are found again by their stored process id.
  - At most one generation runs per landing, and by default one at a time overall, configurable.
  - A job's command line is built from a fixed table of commands, with checked arguments. A tool never runs arbitrary shell input.
- **Cost per run.** `new-landing.sh` asks `claude -p` for its structured output and records the run's tokens and cost, as reported by Claude Code, in `RUN.md` under Totals and in the job record. The readable log stays as it is today. Wall time is recorded for every job.
- **Safety:**
  - No tool publishes, commits or pushes, or edits `.claude/`, `CLAUDE.md`, the workflow or secrets.
  - Paths are restricted to the slug pattern and the repository.
  - Tool results never include environment values.
  - The skill and permission rules of the current CLI flows still apply, because jobs run the same scripts.
- **Docs.** A section in `CLAUDE.md` and a guide, `docs/agent-interface.md`, explaining how to connect Claude Code, Claude Desktop or Cursor to the local server, with the tool list and a typical flow (brief, propose, review, generate, QA, report, open a PR by hand).

## Capabilities

### New Capabilities

- `agent-interface`: the local MCP server, its tools, background jobs with status, logs and cancellation, the safety limits (no publishing, fixed command table, path checks, masked output), and cost recording per job.

### Modified Capabilities

- `landing-generation`: the run log now also records token usage and cost when Claude Code reports them.

## Impact

- **New code:**
  - `scripts/mcp/server.mjs`, with modules `protocol`, `tools`, `jobs`, `landings`, `paths` and `redact`;
  - tests that start the server as a child process and drive it over stdio like a real client, and job tests with a stub command.
- **Changed code:**
  - `scripts/new-landing.sh`, for the structured `claude -p` output and the usage summary;
  - `.mcp.json`, to add `landing-factory`;
  - `.claude/settings.json`, to allow the server's tools;
  - `package.json`, for an `mcp` script;
  - `.gitignore`, if `.cache/jobs/` is not already ignored.
- **Docs:** `CLAUDE.md`, `README.md`, `docs/agent-interface.md`, `docs/status.md`, `docs/product-plan.md` (step 7 split into local now, remote later).
- **No new npm dependencies.**
- **Out of scope** (each a later step):
  - an HTTP API and a remote or hosted server, with authentication and multi-user isolation;
  - publishing or opening PRs from the interface;
  - job queues across machines, and containers per job;
  - billing and pricing;
  - the legal review before selling.
