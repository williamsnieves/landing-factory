# Design: add-agent-interface

## Context

- **CLIs available today:**
  - `scripts/brief.mjs`: init, validate, missing, summary, import;
  - `scripts/new-landing.sh`: wraps `claude -p "/new-landing ..."`, writes `sites/<slug>/.run.log` and `RUN.md` with a `Result:` line, and exits non-zero on failure;
  - `npm run qa -- --site <slug>`: writes `qa/<slug>/latest/report.json`;
  - `npm run report -- --site <slug>`: writes `qa/<slug>/report/latest/report.json`.
- **Libraries the tools can call in process:** `scripts/lib/brief-schema.mjs` (`validate`, `missing`, `summary`, `isAssumed`) and `scripts/lib/sites.mjs` (slug rule).
- **Generation's own limits:** it never commits, pushes or deploys. Deploys run only from CI.
- **MCP:** a JSON-RPC 2.0 protocol. Over stdio the messages are newline-delimited JSON. The lifecycle is `initialize`, then the `notifications/initialized` notification, then operation. Version negotiation: the server echoes the client's requested version if it supports it, otherwise it replies with its newest version. Revisions published so far: 2024-11-05, 2025-03-26, 2025-06-18 and 2025-11-25.
- **Owner choices (2026-10-25):** the server is local over stdio, and it offers every action except publishing.

## Goals / Non-Goals

**Goals:**

- A dependency-free MCP server that real clients accept.
- Long jobs that outlive a single call or a restart of the server.
- Safety by construction: a fixed command table, path checks, masked output, no publishing.
- Time and cost per job.

**Non-Goals:**

- HTTP transport and authentication.
- Remote hosting and multiple users.
- MCP resources, prompts and sampling. Only tools are offered.
- Opening PRs.
- Running jobs in containers.

## Decisions

### 1. Protocol layer (`scripts/mcp/protocol.mjs`)

- **Transport:** newline-delimited JSON-RPC on stdin and stdout. Logs go to stderr only.
- **Methods handled:**
  - `initialize`: supported versions are `["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]`. The server echoes the client's version if it is in the list, otherwise it returns the first one. The answer carries `capabilities: { tools: { listChanged: false } }` and `serverInfo: { name: "landing-factory", version: <package.json version> }`.
  - `notifications/initialized` is accepted. `ping` returns `{}`.
  - `tools/list` and `tools/call`.
- **Errors:**
  - Unknown methods return -32601.
  - Bad parameters return -32602.
  - A tool's own failure returns a result with `isError: true` and a text explanation, as the spec advises for tool errors, so the agent can read it.
- **Result format:** each result has `content: [{ type: "text", text }]` and `structuredContent` with the JSON. `outputSchema` is declared where the shape is stable.
- **Alternative rejected:** `@modelcontextprotocol/sdk`. It would be a new dependency, while the subset needed here (stdio, tools) is small and testable. If HTTP or resources come later, the SDK can be adopted then.

### 2. Tools (`scripts/mcp/tools.mjs`)

Every tool has a JSON Schema for its input, a one-line description and an annotation: `readOnlyHint` for readers, `destructiveHint: false` for writers.

| Tool | Input | What it does |
| --- | --- | --- |
| `list_landings` | – | `sites/*` with target, title, brief yes or no, last `Result:`, last QA and report verdicts and dates |
| `get_landing` | `slug` | Above, plus brief summary, preview URL from the last CI comment if cached (else null), `RUN.md` Totals |
| `brief_init` | `slug`, `niche?`, `lang?` | `brief.mjs init` (never `--force`) |
| `brief_validate` / `brief_missing` / `brief_summary` | `slug` | In-process library calls |
| `brief_update` | `slug`, `patch` (object), `assumed?` | Deep-merges the patch (arrays replaced) and validates. Writes only if valid, and refuses assumed identity, consent or holder fields. Returns errors or the new summary |
| `propose_landing` | `slug`, `niche?`, `refs?`, `lang?`, `model?` | Job: `new-landing.sh <slug> [--niche] [--refs] [--lang] [--model]`, which stops at the checkpoint |
| `generate_landing` | `slug`, `resume` (bool), `niche?`, `refs?`, `model?`, `maxAttempts?` | Job: `new-landing.sh <slug> --auto [--resume] ...` |
| `run_qa` | `slug`, `skip?` (enum list) | Job: `node scripts/qa.mjs --site <slug> [--skip ...]` |
| `run_report` | `slug`, `url?` (`https://` only) | Job: `node scripts/landing-report.mjs --site <slug> [--url]` |
| `get_job` / `list_jobs` / `tail_job_log` / `cancel_job` | `id`, `lines?` (max 200) | Job control (Decision 3) |
| `get_qa` / `get_report` | `slug` | Latest `report.json`, reduced to verdict, failures and items (the full path is given for more) |

- **Input checks:**
  - Slugs must match `SLUG_PATTERN`.
  - `refs` must name existing `patterns/<slug>.md` sheets.
  - `model` must match `^[a-z0-9.-]+$`.
  - Free text such as `niche` is passed as one `argv` element, never through a shell.

### 3. Jobs (`scripts/mcp/jobs.mjs`)

- **Folder:** `.cache/jobs/<id>/`, where `id` is `<UTC yyyymmdd-hhmmss>-<kind>-<slug>-<4 hex>`. It holds:
  - `job.json`: kind, slug, argv, cwd, pid, pgid, startedAt, finishedAt, state, exitCode, result, phase, durationMs, usage;
  - `log.txt`: stdout and stderr together.
- **Starting a job:**
  - The process is spawned with `detached: true` and its own process group, stdio goes to the log file, and `unref()` is called, so it outlives the server.
  - A small wrapper (`scripts/mcp/run-job.mjs`) runs the command, waits for it and writes the exit code and `finishedAt` into `job.json`. A job therefore finishes cleanly even if the server is gone.
- **State:**
  - States are `running`, `passed`, `failed` (non-zero exit), `cancelled` and `lost` (the pid is gone with no exit recorded).
  - `phase` is read from the `RUN.md` phase table (generation) or from the last `[qa]` line.
  - `result` is the `Result:` line of `RUN.md`, or the report or QA verdict.
- **Limits:**
  - One running generation per slug. A second one is refused, naming the running job.
  - A global limit of concurrent jobs comes from `MCP_MAX_JOBS` (default 1 for generations, 2 for QA and report).
- **Cancel:** sends SIGTERM to the process group, then SIGKILL after 10 seconds. The state becomes `cancelled`.
- **Tail:** returns the last N lines, run through `redact()` (Decision 5).
- **Cleanup:** jobs older than 30 days are pruned at server start. `.cache/` is already git-ignored; this is verified.

### 4. Cost per run (`new-landing.sh`)

- **Claude call:** `claude -p ... --output-format stream-json --verbose`, piped through `scripts/lib/claude-stream.mjs`. That filter:
  - writes the assistant's text and tool notes to the log in the same readable form as today;
  - takes the final `result` event (`usage`, `total_cost_usd`, `duration_ms`, `num_turns`) into `sites/<slug>/.run-usage.json`.
- **Totals:** at the end, `new-landing.sh` appends a "Usage" line to `RUN.md` Totals with input and output tokens, cache tokens, cost in USD and turns, or "not reported". The jobs layer copies it into `job.json`.
- **Fallback:** if the stream cannot be parsed, the raw lines go to the log and the run still finishes. Usage is then "not reported".
- **Tests:** the existing `NEW_LANDING_SKIP` stub harness gets a fake `claude` that emits a recorded stream.

### 5. Safety and secrets (`scripts/mcp/paths.mjs`, `redact.mjs`)

- **Paths:** every path is built with `join(ROOT, ...)` from validated parts and checked to start with `ROOT`.
- **Read-only areas:** no tool writes outside `sites/<slug>/brief.json` (brief tools) and `.cache/jobs/`. The jobs write their own outputs, as their CLIs do today.
- **Redaction:** reuses `scripts/report/mask.mjs` patterns for log excerpts and error texts. Environment values are never placed in results: there is no tool that reads the environment.
- **Permissions:** the permission entry in `.claude/settings.json` is the MCP server's tools `mcp__landing-factory__*`, with read tools and brief tools allowed and job tools left to ask. Claude Code users approve long jobs once per session.
- **No publish path:** the server has no tool that runs `deploy.mjs`, `wrangler`, `git push` or `gh`. A test asserts that no command in the table contains them.

### 6. Registration and docs

- **Registration:** `.mcp.json` gets `"landing-factory": { "command": "node", "args": ["scripts/mcp/server.mjs"] }`.
- **Guide:** `docs/agent-interface.md` covers:
  - Claude Code, which reads `.mcp.json` in the repository;
  - Claude Desktop and Cursor, which need a config snippet with the absolute path;
  - the tool table;
  - the typical flow;
  - how jobs survive and how to cancel;
  - what is not offered (publishing) and why.

## Risks / Trade-offs

- **[Hand-written protocol drifts from the spec]** → tests drive the server like a client, covering initialize with several versions, list, call, errors and a malformed line. A manual check registers it in Claude Code (`claude mcp list` shows it connected), and the tools show up in a session.
- **[Long jobs left running after the agent forgets them]** → `list_jobs` shows them, `cancel_job` stops them, and generations are limited to one per landing and one overall by default.
- **[Changing `new-landing.sh` output mode breaks the readable log]** → the filter reproduces today's readable lines, a test compares output on a recorded stream, and a fallback keeps raw lines.
- **[Agents run expensive generations]** → `generate_landing` is not auto-allowed in settings, so a person approves it. Cost is recorded per run.

## Migration Plan

Nothing changes for current flows: every CLI keeps working. To roll back, remove the `.mcp.json` entry; the scripts stay inert.
