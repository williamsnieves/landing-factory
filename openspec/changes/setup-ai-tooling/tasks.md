# Tasks

## 1. MCP

- [ ] 1.1 Create `.mcp.json` with the Astro Docs MCP (HTTP) and the Playwright MCP (pinned version, headless); verify with `claude mcp list` (or by opening a session) that both connect
- [ ] 1.2 Document in `CLAUDE.md` when to use each MCP; verify the section exists

## 2. Design skills

- [ ] 2.1 Install ui-ux-pro-max at project level; verify its `SKILL.md` exists in `.claude/skills/` and the skill shows up in a new session
- [ ] 2.2 Install taste-skill (`design-taste-frontend`) at a pinned commit; verify its `SKILL.md`
- [ ] 2.3 Install impeccable with `--providers=claude --scope=project` and disable telemetry; verify `npx impeccable detect --help` and the telemetry status
- [ ] 2.4 Review the three skills' licenses and record source, version/commit and license in `agent-tooling.lock.json`; verify the JSON is valid and complete
- [ ] 2.5 Add a "Design skills" section to `CLAUDE.md` with each skill's single role and cost warnings; verify the content

## 3. Reproducible setup

- [ ] 3.1 Write `scripts/setup-agent.sh` (`install` and `--verify` modes) and verify two consecutive runs exit 0 and leave `git status` unchanged
- [ ] 3.2 Make `--verify` fail with a clear message when a skill is missing; verify by temporarily renaming a skill folder
- [ ] 3.3 Create `.claude/settings.json` with `env.OPENSPEC_TELEMETRY=0`, permissions for npm/npx/playwright and a SessionStart hook running `--verify`; verify in a new session that the hook runs without errors

## Workflow follow-up

- Open PR, review and merge.
- `/opsx:archive setup-ai-tooling` after merge.
