# Design

## Context

See `proposal.md`. The motion layer (`src/components/motion/`) already loads GSAP, ScrollTrigger and Lenis only through `<Motion />`, guards motion with the `.js-motion` class, and turns everything off under reduced motion. Sites copy the starter at creation (`new-site`), so a 3D layer in the starter reaches every new site. Image sourcing goes through `find-images.mjs` and `assets.json`; credits are generated.

User decisions (2026-10-21): 3D comes before the three-niche pilot; scenes are built in code, and pictures come from public-domain museum collections (The Met, Wikimedia Commons). Nothing is taken from the reference sites but abstract patterns.

## Goals / Non-Goals

**Goals:** one reusable, accessible 3D primitive; budgets that keep Lighthouse ≥ 90 with a scene on the page; generation can plan and build scenes; a samurai landing proves it.

**Non-Goals:** React Three Fiber, glTF model pipelines (Draco, meshopt), physics, audio, postprocessing chains, WebGPU, per-device quality tiers beyond a simple pixel-ratio cap.

## Decisions

1. **Poster first, canvas later.** `<Scene3D poster alt scene ... />` renders a `<figure>` with an optimized `<Picture>` (the LCP candidate) and a hidden mount point. A small inline module decides: JS on, `prefers-reduced-motion` not `reduce`, WebGL2 or WebGL available, and the element within one viewport (IntersectionObserver) → dynamic `import()` of `three` and the scene module → create the canvas, fade it over the poster, keep the poster in the DOM for screen readers (`alt`) and as the fallback if creation throws. Without JS, under reduced motion or on failure the poster stays.
2. **Scene modules.** `src/scenes/<name>.ts` exports `create({ canvas, three, width, height, pixelRatio, theme }) → { update(progress, timeMs), resize(w, h), dispose() }`. `theme` reads the site's CSS color tokens so scenes follow `tokens.css`. The runtime owns the render loop (`requestAnimationFrame`, paused when off-screen or the tab is hidden), caps `devicePixelRatio` at 2 (1.5 on small screens), and calls `dispose()` on `astro:before-swap`.
3. **Scroll link.** `data-scene-scrub` (plus optional `data-scene-pin`) maps the section's scroll progress (0–1) to `update(progress)` through the existing ScrollTrigger setup of `initMotion`; without it, `progress` is time-driven. Under reduced motion there is no canvas, so no scrub.
4. **Vanilla Three.js**, imported by path (`three` core plus only the addons a scene uses). Budget: the 3D chunk (Three + scene) ≤ 200 KB gzip per page, checked by QA from the build output.
5. **QA additions** (`scripts/qa.mjs`): for pages containing `[data-scene]`: (a) reduced-motion load has no `<canvas>` inside `[data-scene]` and the poster image is visible; (b) a no-JS load (JavaScript disabled) has the poster visible; (c) a normal load at 1440 px scrolled to each scene creates a canvas without console errors (`WebGL`/`THREE` errors fail); (d) the gzip size of JS chunks that import `three` is within budget. Headless Chromium renders WebGL through SwiftShader, which is enough to detect errors, not to judge looks.
6. **Museum source in `find-images.mjs`**: `--source commons,met` (default `commons`). The Met Collection API (`/public/collection/v1.1/search`, paginated; `isPublicDomain` objects, `primaryImage`) with its credit line; open-access objects are CC0. The Art Institute of Chicago was considered and dropped: its image host answers with a bot challenge, which we never bypass. Same throttling, User-Agent, manifest entries (`license: "Public domain (museum open access)"`, `credit: true` with the museum's credit line, since the museums ask for it).
7. **Generation.** The proposal template gains a "3D" section: none, or up to two scenes, each with purpose, poster image, scroll behavior and reduced-motion fallback. The design-system phase is unchanged; the build phase writes scenes from code only. `check-landing` gains a `scenes` rule: every `[data-scene]` element has a poster whose file is in `assets.json` or is a self-rendered image recorded as `source: "self"`.
8. **Validation landing.** `sites/samurai` (Spanish copy, editorial and educational, not a business): who the samurai were, armor (ō-yoroi, dō, kabuto, mempō), swords (katana, wakizashi, tachi; forging and care), way of life (bushidō in its historical context, daily life, arts), and an end to the class in the Meiji era. One hero scene (a katana built in code that turns with scroll, with ink or petal particles) and at most one more. Museum photographs of real armor and blades and ukiyo-e prints, credited. Content must be historically careful: no invented quotes, dates checked against the museum records used, myths labeled as such.

## Implementation notes (deviations)

- Scene contract: the context has no `three` namespace; scenes import `three` by name and create the renderer through `createRenderer(ctx)` (a namespace object would defeat tree-shaking and blow the budget). Demo chunk: 137.6 KB gzip.
- The runtime starts loading after `window.load` plus an idle callback, in addition to the viewport observer, to keep Three.js off the Lighthouse critical path.
- Tokens use `@theme static` so every `--color-*` variable exists at runtime for scenes (Tailwind v4 otherwise emits only the variables utilities use).
- The poster fades out under a running canvas but stays in the DOM (alt text) and comes back if the scene fails; "WebGL unavailable" is a warning, any other scene exception an error that QA catches.
- QA adds two checks beyond Decision 5: no 3D chunk is downloaded under reduced motion, and a scrubbed scene's progress changes while scrolling.
- `sharp` is declared as a root dev dependency (it resizes Met images; Astro already depends on it).

## Risks / Trade-offs

- [Lighthouse performance with WebGL] → poster is the LCP, 3D loads after first paint and only near the viewport; budget on the 3D chunk; scene work paused off-screen.
- [Headless WebGL differs from real GPUs] → QA checks errors and fallbacks, not visuals; the reviewer opens the preview on a real device.
- [References use effects we cannot or should not reproduce] → sheets record techniques abstractly; our scenes are original and code-built.
- [Museum APIs blocked or rate-limited] → Commons remains the default; the preflight names any blocked host.
- [Cultural accuracy] → the proposal lists sources (museum records), and copy avoids invented quotes and romanticized myths presented as fact.
