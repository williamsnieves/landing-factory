# Design

## Context

See `proposal.md` — Why. Available at implementation time: starter, motion, design skills, QA, deployment and `/analyze-reference`. This change is implemented in week 3, after the first manual run; tasks will be adjusted with what was learned (editing this design and the tasks is expected).

## Goals / Non-Goals

**Goals:** one command → site that passes QA; reviewable proposal; traceable decisions and credits.

**Non-Goals:** multi-language, CMS, forms with a backend, 3D by default (only if the proposal justifies it).

## Decisions

1. **Where each site lives: `sites/<slug>/` inside this repo (monorepo with npm workspaces)**, each with its own `package.json` inherited from the starter and its own Cloudflare Pages project. Reason: patterns, skills and QA are shared without copying; one PR per site fits the review flow. The root starter becomes `templates/site/` during implementation.
   Alternative (roadmap: "each site is a repo"): `new-site.sh` copies the starter to `../<slug>`, runs `git init` and creates a repo. More isolated, but duplicates skills and patterns and requires creating GitHub repos (not possible from cloud sessions without extra permissions). **Open decision for the user in PR review**; changing it only affects `new-site.sh` and the output path.
2. **Orchestrator skill + per-phase subagents**: the skill chains phases and delegates build/QA to subagents to limit context. Each phase writes its artifact to disk (PROPOSAL.md, MASTER.md, RUN.md) so runs can resume.
3. **Automatic mode** via `claude -p "/new-landing ..." --permission-mode acceptEdits` with an allowed-tools list in `.claude/settings.json`; it can be launched from Actions with `workflow_dispatch`.
4. **QA loop**: max 5 attempts (configurable); each attempt reads `qa/latest/report.json` and prioritizes failures by type (overflow → reduced motion → a11y → performance → impeccable).
5. **Originality**: copy is checked against the visible text of the references used, using the temporary analysis material (if still available) or a fresh in-memory read of the page; that text is never stored. Comparison by 8-word n-grams.
6. **Diversity**: the brief records palette/typography/hero of existing sites in `sites/` and the synthesis must choose different values.

## Risks / Trade-offs

- [ui-ux-pro-max vs taste-skill clash on visual direction] → the skill applies the role split; if the first run shows a clash, one is removed (separate change).
- [High cost and duration] → `--dry-run` mode that only generates PROPOSAL.md + MASTER.md.
- [QA never converges on motion-heavy sites] → attempt limit and failure log; the proposal caps the number of heavy effects.
