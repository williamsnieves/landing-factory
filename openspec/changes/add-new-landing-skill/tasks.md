# Tasks

## 0. Prerequisite

- [x] 0.1 Complete the roadmap's first manual run (test niche + 1–3 analyzed references + landing built and deployed) and note in `design.md` which steps were repeated and what failed; verify the notes exist before continuing (pilot `sites/panaderia/`, PR #11, production https://panaderia-a3o.pages.dev; notes in `design.md` "Pilot notes" and `docs/pilot-panaderia-lessons.md`)

## 1. Site structure and scripts

- [ ] 1.1 Extend `npm run new-site` with templates for `PROPOSAL.md`, `RUN.md` and an empty `assets.json`; verify with tests that a scaffolded site has them, builds and passes `npm run qa -- --site <slug>`, and that the root still passes `npm run qa`
- [ ] 1.2 `scripts/preflight.mjs`: npm registry, Commons hosts (through the proxy when set), Chromium and a free slug; verify with tests (mocked fetch) that a missing host is named and the exit code is non-zero
- [ ] 1.3 `scripts/find-images.mjs` (search and `--get`) with proxy re-exec, throttling, 429 backoff, license filter and `assets.json` entries; verify with tests on recorded Commons API fixtures (license filter, author extraction, manifest entry) and one live search in the cloud session
- [ ] 1.4 `scripts/credits.mjs --site <slug>`: generate the photo table of `CREDITS.md` and the footer credit list from `assets.json`; verify with a fixture site that the output matches and is idempotent
- [ ] 1.5 `scripts/check-landing.mjs --site <slug> [--refs ...]`: uncredited image, CREDITS out of sync, photo used more than twice, MASTER palette/fonts missing from `tokens.css`, diversity against other sites (`landing-meta` block), 8-word n-gram copy match against references read in memory; verify each failure with a fixture (including a deliberately copied sentence) and that `sites/panaderia` passes once its `assets.json` and `landing-meta` exist
- [ ] 1.6 Backfill `sites/panaderia/assets.json` and the `landing-meta` block in `design-system/panaderia/MASTER.md` (no visual change); verify `check-landing --site panaderia` passes and site QA still passes
- [ ] 1.7 `scripts/new-landing.sh <slug> --niche ... [--refs ...] [--auto] [--dry-run] [--max-attempts N]`: preflight, `npm run new-site`, then `claude -p "/new-landing ..."`; verify `--help`, argument errors, and that `--dry-run` creates the folder, `PROPOSAL.md` and `MASTER.md` without building

## 2. /new-landing skill

- [ ] 2.1 Write `.claude/skills/new-landing/SKILL.md` with the phases brief → synthesis → checkpoint → design system → build → QA → final check, the subagent briefs per phase (one skill each), and resume rules; verify it shows up as `/new-landing`
- [ ] 2.2 Design system phase: `design-system/<slug>/MASTER.md` with ui-ux-pro-max (fed the proposal's direction line and the other sites' `landing-meta` to avoid), translated into the site's `tokens.css`; verified by `check-landing` (palette and fonts in tokens)
- [ ] 2.3 Build phase with taste-skill (art direction, `--keep palette,type`) using `find-images.mjs` and `credits.mjs`; verified by `check-landing` (credits, repetition)
- [ ] 2.4 QA loop with max attempts and the failure order of design.md, then impeccable critique/polish once; verify in the validation run that `RUN.md` records each attempt, and that an exhausted loop exits non-zero (`--max-attempts 0` on a fixture)
- [ ] 2.5 `RUN.md` log; verify its content after the validation run
- [ ] 2.6 Allowed tools for automatic mode in `.claude/settings.json` (the new scripts, `claude`-safe commands only); verify an `--auto` run needs no permission prompt

## 3. MVP validation

- [ ] 3.1 Generate `sites/clinica-dental` with a single `scripts/new-landing.sh clinica-dental --niche "..." --auto` command and verify it passes site QA and `check-landing` with no touch-ups, and its preview deploys on the PR
- [ ] 3.2 Document the flow in `README.md`, `CLAUDE.md`, `sites/README.md`, `scripts/README.md` and `docs/status.md`; verify a user can follow it end to end
- [ ] 3.3 Record in `docs/status.md` the follow-up pilot: three different niches with `new-landing.sh --auto`, checked for diversity (roadmap MVP check)

## Workflow follow-up

- Open PR, review and merge.
- `openspec archive add-new-landing-skill` after merge.
