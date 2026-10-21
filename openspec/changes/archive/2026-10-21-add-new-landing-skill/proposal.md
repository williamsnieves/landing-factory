# Proposal

## Why

The MVP goal is that **a single command** generates, from a niche and 0–3 reference sheets, an original landing ready to deploy that passes QA with no touch-ups. The steps repeated by hand in the first manual run (synthesis, design system, build, QA) become a versioned skill here, plus a script that runs it unattended.

## What Changes

- `/new-landing` skill in `.claude/skills/new-landing/` with phases:
  1. **Brief**: niche, goal, tone, `patterns/` sheets to use.
  2. **Synthesis**: proposed page map, sections with their purpose, motion plan and pieces to use → `sites/<slug>/PROPOSAL.md`.
  3. **Checkpoint**: in interactive mode it stops for review; in automatic mode it continues and leaves the proposal in the PR.
  4. **Design system**: `design-system/<slug>/MASTER.md` with ui-ux-pro-max, translated into CSS tokens.
  5. **Build**: original sections, original copy, openly licensed images (taste-skill) with `CREDITS.md`, motion layer.
  6. **QA loop**: `npm run qa` → fix → repeat until it passes or attempts run out; then impeccable critique/audit/polish.
- `scripts/new-landing.sh <slug> --niche "..." [--refs a,b] [--auto] [--dry-run]` that runs a preflight, creates the site with `npm run new-site` (from `add-site-workspaces`) and runs Claude Code non-interactively (`claude -p`, from a terminal or a Claude session; not from GitHub Actions).
- Scripts for the steps the pilot did by hand: `preflight.mjs` (network and Chromium), `find-images.mjs` (licensed Commons images through the proxy, into `sites/<slug>/assets.json`), `credits.mjs` (CREDITS.md and footer credits from the manifest) and `check-landing.mjs` (credits, photo repetition, tokens vs MASTER.md, diversity, copy originality).
- Run log (`sites/<slug>/RUN.md`): decisions, QA attempts, approximate tokens/time.
- Validation with one generated site (`sites/clinica-dental`); the three-niche diversity run is a follow-up pilot.

## Capabilities

### New Capabilities
- `landing-generation`: generating a complete, original landing from a niche and pattern sheets, with a review checkpoint, a per-niche design system, asset credits and a QA loop until the criteria are met.

### Modified Capabilities
<!-- None. -->

## Impact

- New: `.claude/skills/new-landing/`, `scripts/new-landing.sh`, `sites/<slug>/` workspaces (see design.md).
- Uses everything before it: starter, design skills, QA, deployment and pattern sheets.
- Cost: a full build with taste-skill takes 30–45 min and several hundred thousand tokens.
- Implemented after the first manual run (pilot `sites/panaderia/`, PR #11); see design.md "Pilot notes".
