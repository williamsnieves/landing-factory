# Tasks

## 0. Prerequisite

- [ ] 0.1 Complete the roadmap's first manual run (test niche + 1–3 analyzed references + landing built and deployed) and note in `design.md` which steps were repeated and what failed; verify the notes exist before continuing

## 1. Site structure

- [ ] 1.1 Build on the `sites/<slug>/` workspaces from `add-site-workspaces` (no move to `templates/`): extend the `npm run new-site` scaffold with whatever `/new-landing` needs (for example the `PROPOSAL.md`, `RUN.md` and `CREDITS.md` templates); verify a scaffolded site builds and passes `npm run qa -- --site <slug>`, and the root still builds and passes `npm run qa`
- [ ] 1.2 Implement `scripts/new-landing.sh <slug> --niche ... [--refs ...] [--auto] [--dry-run]`: runs `npm run new-site -- <slug>` to create `sites/<slug>/` and then runs Claude Code; verify with `--dry-run` that it creates the folder and the proposal without building

## 2. /new-landing skill

- [ ] 2.1 Write `.claude/skills/new-landing/SKILL.md` with the phases brief → synthesis → checkpoint → design system → build → QA, and templates for `PROPOSAL.md`, `RUN.md` and `CREDITS.md`; verify it shows up as `/new-landing`
- [ ] 2.2 Design system phase: generate `design-system/<slug>/MASTER.md` with ui-ux-pro-max and translate it into the site's `tokens.css`; verify the values match
- [ ] 2.3 Build phase with taste-skill (art direction and credited images) and the motion primitives; verify every external image appears in `CREDITS.md` with an automatic check
- [ ] 2.4 Copy originality check (n-grams) against the references used; verify a deliberately copied sentence is detected
- [ ] 2.5 QA loop with max attempts and failure prioritization, followed by impeccable critique/audit/polish; verify with a site that initially fails that the loop fixes and converges
- [ ] 2.6 `RUN.md` log with inputs, decisions, attempts and duration; verify its content after a run

## 3. MVP validation

- [ ] 3.1 Generate a site for one niche with a single command in automatic mode and verify it passes QA with no touch-ups and its preview deploys
- [ ] 3.2 Generate sites for 3 different niches and verify they differ in palette, main font and hero type
- [ ] 3.3 Document the full flow in `README.md` and `CLAUDE.md`; verify a user can follow it end to end

## Workflow follow-up

- Open PR, review and merge.
- `/opsx:archive add-new-landing-skill` after merge.
