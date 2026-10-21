# Tasks

## 0. Prerequisites

- [x] 0.1 Network: the user allows `crazy.studio`, `experience2026.funtech.inc` (plus any CDN hosts recon reports), `collectionapi.metmuseum.org` and `images.metmuseum.org`; verify (done 2026-10-21: both references and the Met answer; the Art Institute of Chicago image host returns a bot challenge, so that source is dropped) with `npm run preflight` extended to the museum hosts
- [ ] 0.2 Analyze both references with `/analyze-reference` (`--focus` on 3D storytelling, scroll-linked scenes and typography) into `patterns/crazy-studio.md` and `patterns/experience2026-funtech-inc.md`; verify `npm run validate:patterns` and that `.cache/analyze/` is cleaned up. If a site disallows analysis (robots, TDM reservation), record that and continue with the other

## 1. 3D layer in the starter

- [ ] 1.1 Add `three` (MIT) to the root dependencies and to `new-site`'s shared dependency list; record it in the license notes; verify `npm ci`, and that the root home page's built JS does not include Three.js
- [ ] 1.2 `src/components/three/`: `Scene3D.astro` (poster `<Picture>`, mount point, `data-scene`, optional `data-scene-scrub`), a small runtime (`runtime.ts`: gate on JS/WebGL/reduced motion, IntersectionObserver lazy import, render loop paused off-screen and on hidden tabs, pixel-ratio cap, resize, dispose on `astro:before-swap`, poster kept on failure), token-based `theme`, and `README.md` with the scene module contract; verify with unit tests for the gating logic and a demo build
- [ ] 1.3 Scroll link: `data-scene-scrub` progress through the existing `initMotion` ScrollTrigger setup; verify on the demo page that progress goes 0→1 across the section (test reading the runtime's exposed progress)
- [ ] 1.4 Demo page `src/pages/3d.astro` (noindex) with one code-built scene and its poster (self-rendered, recorded as `source: "self"`); verify `npm run qa` passes with it, including Lighthouse ≥ 90

## 2. QA and checks

- [ ] 2.1 `scripts/qa.mjs`: the four 3D checks of design.md Decision 5, configurable budget in `qa.config.json` (`threeD.maxGzipKb`, default 200), reported in `report.json`/`report.md`; verify with failing fixtures (canvas under reduced motion, missing poster without JS, a scene that throws, an oversized chunk) and the demo page passing
- [ ] 2.2 `check-landing.mjs`: `scenes` rule (every `[data-scene]` in the built pages has a poster in `assets.json` or recorded as `source: "self"`); verify with fixtures

## 3. Images and generation

- [ ] 3.1 `find-images.mjs --source commons,met`: Met open-access search and download through the proxy, public-domain filter, museum credit lines in `assets.json`, `credits.mjs` output; verify with recorded API fixtures and one live Met search
- [ ] 3.2 `preflight.mjs`: museum hosts checked when `--sources` includes them; verify with tests
- [ ] 3.3 `/new-landing`: PROPOSAL template "3D" section, SKILL.md rules for scenes (code only, poster required, at most two, reduced-motion fallback, budget), build-phase guidance; `new-site` copies `src/components/three/`; verify a scaffolded site builds and passes QA

## 4. Validation

- [ ] 4.1 Generate `sites/samurai` with one `scripts/new-landing.sh samurai --niche "..." --refs crazy-studio,experience2026-funtech-inc --auto` command; verify site QA (including the 3D checks) and `check-landing` pass with no touch-ups
- [ ] 4.2 Review the scene on the preview on a real device (user) and record the result; verify the preview deploys on the PR
- [ ] 4.3 Update `CLAUDE.md`, `README.md`, `sites/README.md`, `scripts/README.md`, `docs/status.md`; verify the docs describe the 3D layer, its budgets and fallbacks

## Workflow follow-up

- Open PR, review and merge.
- `openspec archive add-3d-scenes` after merge.
