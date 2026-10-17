# Proposal

## Why

The pipeline relies on Claude Code having, reproducibly on any machine or cloud session, current Astro docs, a controllable browser and the three design skills from the roadmap. Nothing is installed or versioned today, and every session would have to set it up by hand.

## What Changes

- Versioned `.mcp.json` with the Astro Docs MCP and the Playwright MCP.
- Project-level install (in `.claude/`) of ui-ux-pro-max, taste-skill and impeccable, with pinned version/commit and the source recorded in a manifest.
- impeccable telemetry disabled by default.
- Role split between skills documented in `CLAUDE.md`: ui-ux-pro-max → tokens; taste-skill → art direction and images; impeccable → critique and polish.
- Idempotent `scripts/setup-agent.sh` that reinstalls/verifies everything, plus a SessionStart hook for cloud sessions.
- `.claude/settings.json` with permissions for the pipeline's usual commands (npm, npx impeccable, playwright) and no destructive permissions.
- REA and the cloner are **not** installed here: they are integrated (or not) in `add-analyze-reference-skill`.

## Capabilities

### New Capabilities
- `agent-tooling`: reproducible agent environment — MCP servers, version-pinned design skills, a role for each skill, privacy (telemetry) and environment verification.

### Modified Capabilities
<!-- None. `project-guidelines` gains a roles section during implementation without changing its requirements. -->

## Impact

- New files: `.mcp.json`, `.claude/settings.json`, third-party `.claude/skills/*`, `scripts/setup-agent.sh`, `agent-tooling.lock.json` (manifest).
- Setup needs network access (npm, GitHub). Requires Chromium for Playwright and taste-skill (preinstalled in cloud sessions).
- Depends on `setup-astro-starter` (needs `package.json` and `CLAUDE.md`).
