# Proposal

## Why

The roadmap's key principle is "extract patterns, don't clone": from 1–3 inspiration sites we produce abstract pattern sheets (sections, grid, typography, motion, libraries) that feed the synthesis. Today that analysis would be manual, inconsistent and at risk of storing third-party assets or text. A versioned skill makes it repeatable and builds the legal safeguards in by design.

## What Changes

- `/analyze-reference <url> [--focus "what we like"]` skill in `.claude/skills/analyze-reference/`.
- Pre-check of the site's `robots.txt` and text-and-data-mining (TDM) reservation; if there is a reservation, abort.
- Browser reconnaissance (adapting the recon phases of ai-website-cloner-template): temporary screenshots at 375/768/1440, DOM structure, computed styles and scroll behavior.
- Library and technique detection (GSAP, ScrollTrigger, Lenis, Locomotive, Three.js, WebGL/shaders, View Transitions…) via globals, scripts and network; REA optional when an effect is unclear.
- Output: abstract sheet `patterns/<slug>.md` with frontmatter + fixed sections, with no assets, copy or code from the site.
- Sheet template `patterns/_template.md` and validator `scripts/validate-pattern.mjs`.
- Screenshots are local working material only: stored outside the versioned area (ignored) and deleted at the end.

## Capabilities

### New Capabilities
- `reference-analysis`: turning a reference URL into an abstract pattern sheet, with compliance safeguards (robots/TDM, no assets, no copy) and a validatable format.

### Modified Capabilities
<!-- None. -->

## Impact

- New: `.claude/skills/analyze-reference/` (SKILL.md + recon scripts), `patterns/_template.md`, `scripts/validate-pattern.mjs`.
- Uses Playwright (from `setup-ai-tooling`). REA (`rea-agents`) only as an optional, non-required tool.
- Depends on `setup-astro-starter` and `setup-ai-tooling`.
- Legal note: guidance only, not legal advice (see roadmap).
