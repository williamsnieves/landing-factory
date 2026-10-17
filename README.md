# landing-factory

A pipeline that, given a niche, uses Claude to generate an original Astro landing page with near-Awwwards quality, ready to deploy. See [docs/roadmap.md](docs/roadmap.md) (original roadmap, in Spanish).

## How we work: OpenSpec

Requirements live in [`openspec/`](openspec/) ([OpenSpec](https://github.com/Fission-AI/OpenSpec)):

- `openspec/specs/` — what the system does today (filled in as changes are archived).
- `openspec/changes/` — proposed work: `proposal.md` (why), `specs/` (what), `design.md` (how), `tasks.md` (steps).

Cycle per change, one PR per change:

```text
/opsx:apply <change>     # implement following tasks.md
  → PR → review → merge
/opsx:archive <change>   # merges the change's specs into openspec/specs/
```

CLI: `npm i -g @fission-ai/openspec` · `openspec list` · `openspec show <change>` · `openspec validate --all --strict`.

## Implementation order

| # | Change | Roadmap week | Depends on |
|---|--------|--------------|------------|
| 1 | `setup-astro-starter` — Astro + Tailwind + React, motion (GSAP/Lenis), `CLAUDE.md` | 1 | — |
| 2 | `setup-ai-tooling` — Astro Docs MCP, Playwright MCP, ui-ux-pro-max, taste-skill, impeccable | 1 | 1 |
| 3 | `add-qa-pipeline` — `npm run qa`: screenshots at 375/768/1440, overflow, reduced motion, Lighthouse, impeccable | 1–2 | 1 |
| 4 | `add-cloudflare-preview-deploy` — per-branch previews gated by QA | 2 | 1, 3 |
| 5 | `add-analyze-reference-skill` — `/analyze-reference` URL → abstract pattern sheet in `patterns/` | 2 | 1, 2 |
| — | **First manual run** (niche + references + landing built by hand) | 2 | 1–5 |
| 6 | `add-new-landing-skill` — `/new-landing` + `scripts/new-site.sh`, one command → landing | 3 | all of the above |
