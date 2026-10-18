# Design

## Context

See `proposal.md` — Why. Available at implementation time: starter, motion, design skills, QA, deployment and `/analyze-reference`. This change is implemented in week 3, after the first manual run; tasks will be adjusted with what was learned (editing this design and the tasks is expected).

## Goals / Non-Goals

**Goals:** one command → site that passes QA; reviewable proposal; traceable decisions and credits.

**Non-Goals:** multi-language, CMS, forms with a backend, 3D by default (only if the proposal justifies it).

## Decisions

1. **Where each site lives: `sites/<slug>/` inside this repo (monorepo with npm workspaces)**, as delivered by the `add-site-workspaces` change: each site has its own `package.json` (`site-<slug>`, same dependency ranges as the root), its own `site.config.json` and its own Cloudflare Pages project. Reason: patterns, skills and QA are shared without copying; one PR per site fits the review flow. The root starter stays where it is (reference demo and template source); it is **not** moved to `templates/site/`. This change builds on what that one provides: `npm run new-site -- <slug>` scaffolds the site, `npm run qa -- --site <slug>` is the QA verdict for it, and CI builds and deploys each changed site.
   Alternative (roadmap: "each site is a repo"): copy the starter to `../<slug>`, run `git init` and create a repo. More isolated, but duplicates skills and patterns and requires creating GitHub repos (not possible from cloud sessions without extra permissions). Decided in favor of `sites/<slug>/` (model A); the alternative would only change the output path of the scaffold.
2. **Orchestrator skill + per-phase subagents**: the skill chains phases and delegates build/QA to subagents to limit context. Each phase writes its artifact to disk (PROPOSAL.md, MASTER.md, RUN.md) so runs can resume.
3. **Automatic mode** via `claude -p "/new-landing ..." --permission-mode acceptEdits` with an allowed-tools list in `.claude/settings.json`; it can be launched from Actions with `workflow_dispatch`.
4. **QA loop**: max 5 attempts (configurable); each attempt reads `qa/latest/report.json` and prioritizes failures by type (overflow → reduced motion → a11y → performance → impeccable).
5. **Originality**: copy is checked against the visible text of the references used, using the temporary analysis material (if still available) or a fresh in-memory read of the page; that text is never stored. Comparison by 8-word n-grams.
6. **Diversity**: the brief records palette/typography/hero of existing sites in `sites/` and the synthesis must choose different values.

## Risks / Trade-offs

- [ui-ux-pro-max vs taste-skill clash on visual direction] → the skill applies the role split; if the first run shows a clash, one is removed (separate change).
- [High cost and duration] → `--dry-run` mode that only generates PROPOSAL.md + MASTER.md.
- [QA never converges on motion-heavy sites] → attempt limit and failure log; the proposal caps the number of heavy effects.
