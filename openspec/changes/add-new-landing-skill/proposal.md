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
- `scripts/new-site.sh <slug> --niche "..." [--refs a,b] [--auto]` that creates the site project from the starter and runs Claude Code non-interactively.
- Run log (`sites/<slug>/RUN.md`): decisions, QA attempts, approximate tokens/time.

## Capabilities

### New Capabilities
- `landing-generation`: generating a complete, original landing from a niche and pattern sheets, with a review checkpoint, a per-niche design system, asset credits and a QA loop until the criteria are met.

### Modified Capabilities
<!-- None. -->

## Impact

- New: `.claude/skills/new-landing/`, `scripts/new-site.sh`, site template, `sites/` (or separate repos, see design.md).
- Uses everything before it: starter, design skills, QA, deployment and pattern sheets.
- Cost: a full build with taste-skill takes 30–45 min and several hundred thousand tokens.
- Must be implemented **after** the week-1 first manual run, to encode only what worked.
