# Agent interface

A local MCP (Model Context Protocol) server lets an agent drive the landing factory: read landings, write and validate briefs, start and follow the long jobs (proposal, generation, QA, report) and read their results. It runs next to the repository over stdio. There is no public service yet.

It offers every action except publishing. Deploys stay a pull request plus CI.

## Connect a client

The server is `scripts/mcp/server.mjs` (`npm run mcp` runs the same file). It needs Node 22 and the repository checked out; it has no extra dependency.

**Claude Code.** The repository's `.mcp.json` already declares `landing-factory`. Start Claude Code in the repository and approve the server the first time it asks (project servers always need that approval). `claude mcp list` shows it as connected once approved. The read and brief tools are allowed in `.claude/settings.json`; Claude Code asks before it starts a job.

**Claude Desktop and Cursor.** Add the server with the absolute path of your checkout. Claude Desktop (`claude_desktop_config.json`) and Cursor (`.cursor/mcp.json`) use the same shape:

```json
{
  "mcpServers": {
    "landing-factory": {
      "command": "node",
      "args": ["/absolute/path/to/landing-factory/scripts/mcp/server.mjs"]
    }
  }
}
```

Jobs run `claude -p`, `node` and `bash` from the checkout, so start the client from an environment where those work (Claude Code credentials, `OPENAI_API_KEY` if AI images are allowed, `QA_CHROME_PATH` if Chromium is not in Playwright's cache). Environment variables reach the jobs but never appear in a tool result.

## Tools

| Tool                                                                         | Input                                                  | What it does                                                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `list_landings`                                                              | none                                                   | Every site with target, brief yes or no, last run result, latest QA and report verdicts                                       |
| `get_landing`                                                                | `slug`                                                 | The above plus brief summary, run phase and totals, usage, preview URL if cached                                              |
| `get_qa`, `get_report`                                                       | `slug`                                                 | Latest QA or report results (verdict, failures or items that did not pass, path of the full file). Null with a reason if none |
| `brief_init`                                                                 | `slug`, `niche?`, `lang?`                              | Empty skeleton `sites/<slug>/brief.json`; never overwrites                                                                    |
| `brief_validate`, `brief_missing`, `brief_summary`                           | `slug`                                                 | Validation errors, empty fields with a question hint, readable summary                                                        |
| `brief_update`                                                               | `slug`, `patch`, `assumed?`                            | Deep-merges the patch (arrays replaced) and saves only a result that validates                                                |
| `propose_landing`                                                            | `slug`, `niche?`, `refs?`, `lang?`, `model?`           | Job: generation up to the proposal checkpoint                                                                                 |
| `generate_landing`                                                           | `slug`, `resume?`, `niche?`, `refs?`, `model?`, `maxAttempts?` | Job: full run with `--auto`, or `resume: true` after the proposal was reviewed (30 to 70 minutes, costs tokens)       |
| `run_qa`                                                                     | `slug`, `skip?`                                        | Job: `npm run qa -- --site <slug>`                                                                                            |
| `run_report`                                                                 | `slug`, `url?` (https only)                            | Job: `npm run report -- --site <slug>`; with a URL the live checks run too                                                    |
| `get_job`, `list_jobs`, `tail_job_log`, `cancel_job`                         | `id`, `lines?` (at most 200), `state?`, `slug?`        | Follow and stop jobs                                                                                                          |

Job tools return a job id at once. A tool failure comes back as a result with `isError: true` and a text explanation; an unknown tool is a JSON-RPC error.

`brief_update` refuses to mark identity, consent or legal holder fields (`legal`, `legal.holder`, `legal.privacyContact`, `brand.aiImages`, `brand.ownerPortrait`) as assumed, as the CLI does. Ask the customer for them.

## A typical flow

1. `brief_init` for a new slug, then ask the customer what `brief_missing` lists and save the answers with `brief_update`. `/brief-intake <slug>` does the same as an interview inside Claude Code.
2. `propose_landing`, then `get_job` until it is `passed` with result `checkpoint`. Read `sites/<slug>/PROPOSAL.md`, edit it if needed.
3. `generate_landing` with `resume: true`. Follow it with `get_job` (phase and result come from `RUN.md`) and `tail_job_log`.
4. When it finishes, `get_landing` shows the result, the QA and report verdicts, time and usage. `run_qa` and `run_report` re-run them.
5. Review the diff, commit and open the pull request by hand. CI builds, checks and deploys the preview.

## Jobs

Every job is a separate process in its own process group, started through `scripts/mcp/run-job.mjs`. Its state lives in `.cache/jobs/<id>/`: `job.json` (written by the server), `exit.json` (written by the wrapper when the command ends) and `log.txt` (stdout and stderr together). The id is `<UTC yyyymmdd-hhmmss>-<kind>-<slug>-<4 hex>`.

- **They outlive the server.** Closing the client or killing the server leaves the job running. A new server reads the folder and reports the final state. Jobs older than 30 days are removed when the server starts.
- **States.** `running`, `passed` (exit code 0), `failed`, `cancelled`, and `lost` (the process is gone and no exit was recorded, for example after a reboot).
- **Phase and result.** For `propose_landing` and `generate_landing` the phase is read from the `RUN.md` phase table and the result is its `Result:` line (`checkpoint`, `passed`, `failed`). For QA and report jobs the result is the verdict of the run, and the phase is the last `[qa]` line.
- **Limits.** One generation per landing (a second request is refused and names the running job). `MCP_MAX_JOBS` sets how many run at once: `MCP_MAX_JOBS=2` for both kinds, or `MCP_MAX_JOBS=generation=1,check=2` (the defaults). A QA or report job is also refused while another of the same kind runs for the same landing.
- **Cancel.** `cancel_job` sends SIGTERM to the process group and SIGKILL after 10 seconds. The state becomes `cancelled` once the processes stopped.
- **Time and cost.** Every job records `durationMs`. A generation also records the tokens and cost Claude Code reports: `new-landing.sh` runs `claude -p` with `--output-format stream-json`, keeps the readable log, writes `sites/<slug>/.run-usage.json` and adds a `Usage:` line to `RUN.md` under Totals. The job record copies it, or says `reported: false`.

## What is not offered, and why

- **Publishing.** No tool deploys, commits, pushes or opens a pull request, and none edits `.claude/`, `CLAUDE.md`, the CI workflow or secrets. A person reviews the diff and opens the PR; CI deploys.
- **Arbitrary commands.** Each job runs one command of a fixed table (`scripts/mcp/commands.mjs`: `new-landing.sh`, `qa.mjs`, `landing-report.mjs`) with validated arguments. Slugs follow the site slug rule, reference sheets must exist, the model id matches `^[a-z0-9.-]+$`, the report URL is `https://` only. Free text such as a niche is one argument, never passed through a shell.
- **Secrets.** There is no tool that reads the environment. Log excerpts and error texts are masked: provider key patterns, values of environment variables whose names look sensitive, and `key = value` pairs.
- **Outside the repository.** Tools write only `sites/<slug>/brief.json` and `.cache/jobs/`; the jobs write what their CLIs write today.
- **Remote use.** The server speaks stdio to one local client. An HTTP API, authentication, several users and containers per job are later steps (`docs/product-plan.md`, step 7).

## Preview URLs

`get_landing` shows a preview URL only if one is cached in `.cache/preview-urls.json` (`{ "<slug>": "https://..." }`). Nothing writes that file yet; CI posts the URL in the pull request comment. It is `null` otherwise.

## Tests

`tests/mcp-protocol.test.mjs` drives the server over stdio like a client, `tests/mcp-tools.test.mjs` covers the landing, brief and job-argument rules on a fixture repository, and `tests/mcp-jobs.test.mjs` covers jobs with a stub command. They never call `claude`, deploy or reach the network. The stub command is selected with `MCP_TEST_JOB_STUB`, honored only when `NODE_TEST_CONTEXT` is set (the Node test runner sets it); no tool argument or production setting can pick a command.
