# Tasks

## 0. Prerequisites

- [x] 0.1 Network: the user allows `crazy.studio`, `experience2026.funtech.inc` (plus any CDN hosts recon reports), `collectionapi.metmuseum.org` and `images.metmuseum.org`; verify (done 2026-10-21: both references and the Met answer; the Art Institute of Chicago image host returns a bot challenge, so that source is dropped) with `npm run preflight` extended to the museum hosts
- [x] 0.2 Analyze both references with `/analyze-reference` (`--focus` on 3D storytelling, scroll-linked scenes and typography) into `patterns/crazy-studio.md` and `patterns/experience2026-funtech-inc.md`; verify `npm run validate:patterns` and that `.cache/analyze/` is cleaned up. If a site disallows analysis (robots, TDM reservation), record that and continue with the other (verified: both allowed; `validate:patterns` passes; `.cache/analyze/` empty; recon captured only the first screen of each, later 3D chapters marked as not observed)

## 1. 3D layer in the starter

- [x] 1.1 Add `three` (MIT) to the root dependencies and to `new-site`'s shared dependency list; record it in the license notes; verify `npm ci`, and that the root home page's built JS does not include Three.js (verified: `three` ^0.186.1 in root and new-site shared deps, plus `@types/three`; no Three.js in the root home page chunks; tests/new-site.test.mjs)
- [x] 1.2 `src/components/three/`: `Scene3D.astro` (poster `<Picture>`, mount point, `data-scene`, optional `data-scene-scrub`), a small runtime (`runtime.ts`: gate on JS/WebGL/reduced motion, IntersectionObserver lazy import, render loop paused off-screen and on hidden tabs, pixel-ratio cap, resize, dispose on `astro:before-swap`, poster kept on failure), token-based `theme`, and `README.md` with the scene module contract; verify with unit tests for the gating logic and a demo build (verified: tests/three.test.mjs for gating, progress and pixel ratio; demo build; canvas created in headless Chromium))
- [x] 1.3 Scroll link: `data-scene-scrub` progress through the existing `initMotion` ScrollTrigger setup; verify on the demo page that progress goes 0→1 across the section (test reading the runtime's exposed progress) (verified: `data-scene-progress` read at 6 scroll positions on /3d/ rose 0 to 0.85 with `scrolltrigger` as source, and QA fails a scrub scene whose progress does not move))
- [x] 1.4 Demo page `src/pages/3d.astro` (noindex) with one code-built scene and its poster (self-rendered, recorded as `source: "self"`); verify `npm run qa` passes with it, including Lighthouse ≥ 90 (verified: `npm run qa` passes with /3d/, Lighthouse 100/100/100 mobile and desktop, 3D chunk about 138 KB gzip))

## 2. QA and checks

- [x] 2.1 `scripts/qa.mjs`: the four 3D checks of design.md Decision 5, configurable budget in `qa.config.json` (`threeD.maxGzipKb`, default 200), reported in `report.json`/`report.md`; verify with failing fixtures (canvas under reduced motion, missing poster without JS, a scene that throws, an oversized chunk) and the demo page passing (verified: tests/qa.e2e.test.mjs fixtures for canvas under reduced motion, missing poster, a scene that throws, an oversized chunk, plus the passing scene and /3d/))
- [x] 2.2 `check-landing.mjs`: `scenes` rule (every `[data-scene]` in the built pages has a poster in `assets.json` or recorded as `source: "self"`); verify with fixtures (verified: tests/check-landing.test.mjs scenes cases))

## 3. Images and generation

- [x] 3.1 `find-images.mjs --source commons,met`: Met open-access search and download through the proxy, public-domain filter, museum credit lines in `assets.json`, `credits.mjs` output; verify with recorded API fixtures and one live Met search (verified: tests on recorded Met fixtures; live `search "samurai armor" --source met --limit 3` and one live `get met:894743` into a temp site worked on 2026-10-21; the code has no AIC source, per the coordinator)
- [x] 3.2 `preflight.mjs`: museum hosts checked when `--sources` includes them; verify with tests (verified: tests/preflight.test.mjs; `--sources commons,met`; AIC dropped))
- [x] 3.3 `/new-landing`: PROPOSAL template "3D" section, SKILL.md rules for scenes (code only, poster required, at most two, reduced-motion fallback, budget), build-phase guidance; `new-site` copies `src/components/three/`; verify a scaffolded site builds and passes QA (verified: scaffolded temp site with the demo scene built, passed `astro check`, site QA incl. Lighthouse and 3D checks, and check-landing scenes; tests/new-site.test.mjs and tests/new-landing.test.mjs))

## 4. Validation

- [ ] 4.1 Generate `sites/samurai` with one `scripts/new-landing.sh samurai --niche "..." --refs crazy-studio,experience2026-funtech-inc --auto` command; verify site QA (including the 3D checks) and `check-landing` pass with no touch-ups
- [ ] 4.2 Review the scene on the preview on a real device (user) and record the result; verify the preview deploys on the PR
- [ ] 4.3 Update `CLAUDE.md`, `README.md`, `sites/README.md`, `scripts/README.md`, `docs/status.md`; verify the docs describe the 3D layer, its budgets and fallbacks

## Workflow follow-up

- Open PR, review and merge.
- `openspec archive add-3d-scenes` after merge.
