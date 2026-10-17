# Design

## Context

See `proposal.md` — Why. Sessions can be local or cloud (ephemeral container, Chromium preinstalled at `/opt/pw-browsers`). The three skills have different installers (`uipro`, `npx skills`, `npx impeccable`), some of them interactive.

## Goals / Non-Goals

**Goals:**
- A single non-interactive `scripts/setup-agent.sh` that leaves the environment ready.
- Pinned versions so two sessions generate with the same skills.

**Non-Goals:**
- Installing REA or the cloner (they belong to `add-analyze-reference-skill`).
- 21st.dev: a manual helper (2 free copies/day, per-author license); not automated.

## Decisions

1. **Skills vendored into `.claude/skills/` and committed**, rather than marketplace plugins. Reason: plugins install per user, not per repo, and are not versioned; the headless pipeline (`claude -p`) needs them in the repo. Install:
   - ui-ux-pro-max: `npx ui-ux-pro-max-cli init --ai claude` (pinned CLI version).
   - taste-skill: `npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend` (pinned commit).
   - impeccable: `npx impeccable install --providers=claude --scope=project`.
   The script records version/commit in `agent-tooling.lock.json`.
   Alternative: git submodules → more fragile for the agent and for Cloudflare.
2. **`.mcp.json`**: remote Astro Docs MCP (`https://mcp.docs.astro.build/mcp`, HTTP) and Playwright MCP (`npx @playwright/mcp@<pinned>` with `--headless`). In the cloud, Playwright uses the preinstalled Chromium `executablePath`.
3. **Telemetry**: `npx impeccable telemetry off` in the setup; `OPENSPEC_TELEMETRY=0` in `.claude/settings.json` → `env`.
4. **SessionStart hook** (`.claude/settings.json`) running `scripts/setup-agent.sh --verify` (fast, no network if everything is present) for cloud sessions.
5. **Roles** documented in `CLAUDE.md` ("Design skills" section). If ui-ux-pro-max and taste-skill clash on visual direction in the first run, a separate change decides which one stays.

## Risks / Trade-offs

- [Third-party skills change structure between versions] → pinned version + `--verify` checks the expected `SKILL.md` files exist.
- [Licenses: ui-ux-pro-max (see LICENSE), taste-skill MIT, impeccable Apache 2.0] → the manifest records the license; check compatibility during implementation before committing vendored code.
- [Cost: taste-skill uses hundreds of thousands of tokens per build] → documented in `CLAUDE.md`; used only in the build phase.
- [impeccable may add its own hooks to `.claude/settings.json`] → review the diff after install and keep only what is needed.
