# Design

## Context

See `proposal.md` — Why. ai-website-cloner-template (MIT) has a `clone-website` skill with recon phases (screenshots, tokens, interactions) and phases for asset download and rebuilding. We only want the former. REA is an MCP/CLI for reverse engineering; useful but heavy.

## Goals / Non-Goals

**Goals:** consistent, comparable sheets, generated in under 10 min per URL, with no risk of leaking third-party content into the repo.

**Non-Goals:** visual rebuilding, asset download, analyzing sites behind login, multi-page crawling (only the given URL, optionally 1–2 internal links if the user passes them).

## Decisions

1. **Own skill inspired by the cloner, not vendoring the whole cloner.** Only the recon instructions are rewritten (with MIT attribution in SKILL.md), adapted to "describe in the abstract". This keeps the asset-download code out of the repo.
2. **Deterministic scripts + model judgment.** `recon.mjs` (Playwright) writes a temporary JSON in `.cache/analyze/<slug>/`: section tree (landmarks, heights, order), aggregated computed styles (generic font families by classification, sizes, line-heights, grid, spacing), detected JS globals (`gsap`, `ScrollTrigger`, `Lenis`, `THREE`, `__NEXT_DATA__`…), scripts/network by domain, `<canvas>`/WebGL presence, and scroll screenshots at 3 widths. Claude reads that + the screenshots and writes the sheet. Screenshots never leave `.cache/` (in `.gitignore`) and are deleted at the end.
3. **robots/TDM**: `check-robots.mjs` evaluates `robots.txt` for generic and AI user agents (`*`, `ClaudeBot`, `anthropic-ai`, `GPTBot`), `<meta name="robots">`, the `X-Robots-Tag` header, and `tdm-reservation` (TDMRep: `/.well-known/tdmrep.json` and meta). Any reservation → abort.
4. **Validator** `scripts/validate-pattern.mjs`: required frontmatter, required sections, and heuristics for forbidden content: URLs to image/video/font files, code blocks longer than 3 lines, hex colors, long quotes (> 12 words) suggesting copy. Runs at the end of the skill and in CI on `patterns/*.md`.
5. **Optional REA**: if `recon` cannot identify the technique behind an effect flagged as interesting, the skill suggests `npx rea-agents analyze-javascript-application` and records the result only as a written conclusion.
6. **Sheet template** (`patterns/_template.md`): Summary · Section map · Hero · Grid and spacing · Typography · Palette · Density · Motion (table) · Libraries · What to take / what to avoid.

## Risks / Trade-offs

- [Copy heuristic produces false positives] → the validator allows marking our own descriptions with `> note:`; human review in the PR.
- [Sites that block headless browsers] → abort cleanly ("Unreachable URL" requirement), never try to evade.
- [Library detection via globals fails on minified bundles] → combine with signatures in file names/network and state confidence.
- Legal framework is guidance only; consult an IP lawyer before productizing (roadmap).
