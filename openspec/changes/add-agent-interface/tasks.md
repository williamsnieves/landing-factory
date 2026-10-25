# Tasks

## 1. Protocol

- [x] 1.1 `scripts/mcp/protocol.mjs` and `scripts/mcp/server.mjs` (design Decision 1). Verify: `tests/mcp-protocol.test.mjs` spawns the server and sends newline JSON-RPC, covering:
  - `initialize` with 2025-11-25, with 2024-11-05, and with an unknown version (answered with the newest one);
  - `notifications/initialized`;
  - `ping`;
  - `tools/list`, where every tool has an input schema;
  - an unknown method (-32601);
  - bad params (-32602);
  - a malformed line, after which the server is still alive;
  - stdout carries only JSON.

## 2. Landing and brief tools

- [x] 2.1 `list_landings`, `get_landing`, `get_qa` and `get_report` (design Decision 2). Verify: tests on a temporary repository fixture with two sites, one with a brief, a `RUN.md`, and QA and report outputs. Check the fields and dates, and that a missing QA run gives null with a reason.
- [x] 2.2 `brief_init`, `brief_validate`, `brief_missing`, `brief_summary` and `brief_update`. Verify, with tests:
  - an update that validates is written;
  - an invalid update is refused and the file is byte-identical;
  - assumed `legal.holder.taxId` or `brand.aiImages` is refused;
  - arrays are replaced;
  - `brief_init` never overwrites.

## 3. Jobs

- [x] 3.1 `scripts/mcp/jobs.mjs` and `run-job.mjs`: job folder, detached process group, state machine, one generation per slug, global limits, cancel, tail with redaction, pruning (design Decisions 3 and 5). Verify, with tests using a stub command table (a node script that sleeps, prints a fake token and exits with a chosen code):
  - start returns at once;
  - the states go running, then passed or failed;
  - a second generation for the same slug is refused;
  - cancel stops the process group;
  - a job keeps running and finishes after the server process is killed, and a new server reads its final state;
  - a `lost` job is detected;
  - tail masks the fake token.
- [x] 3.2 Job tools `propose_landing`, `generate_landing`, `run_qa`, `run_report`, `get_job`, `list_jobs`, `tail_job_log` and `cancel_job`, with the fixed command table and argument validation. Verify, with tests:
  - the argv built for each tool and option is exact;
  - bad slug, unknown ref sheet, bad model, non-https URL and free text with shell characters (kept as a single argv element) are each handled;
  - no command in the table contains `deploy`, `wrangler`, `git`, `gh` or `push`.

## 4. Cost per run

- [x] 4.1 `scripts/lib/claude-stream.mjs` and the `new-landing.sh` change: stream-json output, a readable log, `.run-usage.json`, and the Usage line in `RUN.md` Totals (design Decision 4). Verify:
  - `tests/new-landing.test.mjs` with a fake `claude` emitting a recorded stream: the readable log lines match, the usage is recorded, and an unparseable stream falls back to raw lines with "not reported";
  - the job record copies the usage.

## 5. Registration, settings and docs

- [x] 5.1 Register the server:
  - add `landing-factory` to `.mcp.json`;
  - add the permission entries in `.claude/settings.json`: read and brief tools allowed, job tools not;
  - add the `mcp` npm script.

  Write the docs:
  - `docs/agent-interface.md`;
  - `CLAUDE.md` (an "Agent interface" section, plus the commands and MCP servers sections);
  - `README.md`;
  - `docs/product-plan.md` (step 7: local now, remote later);
  - `docs/status.md`.

  Verify:
  - `claude mcp list`, run from the repository, shows `landing-factory` connected, if the CLI is available;
  - `npx prettier --check .`;
  - `openspec validate add-agent-interface --strict`.

## 6. End to end and full run

- [x] 6.1 End to end through the server. Verify, all over stdio:
  - `list_landings` lists the seven sites;
  - `get_landing tupathdigital` shows its brief summary and its latest verdicts;
  - `run_report tupathdigital` (static) runs as a job, `get_job` reaches `passed`, and `get_report` returns the verdict;
  - `propose_landing` on a throwaway slug with the `NEW_LANDING_SKIP` stub reaches the checkpoint state; the throwaway site is removed afterwards.
- [ ] 6.2 Full pre-push run in a clean clone: `npm ci && npx prettier --check . && npm run check && npm run check:sites && npm run validate:patterns && npm run validate:archetypes && npm test && npm run qa`, plus `openspec validate --all --strict`. Verify: every command exits 0.

## Workflow follow-up

- First real generation through the server (a real `generate_landing` run takes 30 to 70 minutes and costs tokens): when the owner wants one.
- After the user confirms the merge: `openspec archive add-agent-interface --yes` as the first commit of the next branch.
