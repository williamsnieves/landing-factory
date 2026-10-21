# Proposal

## Why

The roadmap's stack names Three.js "only when a landing needs 3D". The next landing needs it: an editorial page about the samurai (who they were, armor, swords, way of life), inspired by the 3D storytelling of crazy.studio and experience2026.funtech.inc. Today the starter has no 3D layer, QA has no rules for WebGL, `/new-landing` cannot plan a scene, and image sourcing only knows Wikimedia Commons. 3D is also the easiest way to break the quality budgets: heavy bundles, a blank canvas without JavaScript, motion that ignores reduced-motion and an LCP that waits for WebGL.

## What Changes

- **3D layer in the starter** (`src/components/three/`): a `<Scene3D />` component that renders a static poster image as real HTML, then, only when JavaScript runs, WebGL is available, reduced motion is not requested and the scene is near the viewport, lazy-loads Three.js and the site's scene module and replaces the poster with a canvas. Scenes are plain TypeScript modules (`create(ctx) → { update(progress, time), resize(), dispose() }`) built from code (geometry, materials, particles, shaders); an optional scroll link drives `progress` through ScrollTrigger. Vanilla Three.js, no React Three Fiber, to keep the bundle small.
- **Starter demo page** `/3d/` (noindex) with one small code-built scene, so the layer is covered by QA and CI.
- **QA rules for 3D**: under reduced motion and without JavaScript no canvas is created and the poster is visible; no WebGL console errors; a size budget for the 3D chunk; Lighthouse budgets unchanged (≥ 90), which forces lazy loading after first paint.
- **Museum images**: `find-images.mjs` gains public-domain open-access sources (The Met and the Art Institute of Chicago APIs) next to Commons, recorded in `assets.json` with the museum's credit line.
- **`/new-landing` support**: the proposal may plan at most one or two scenes (with a poster each); the build phase uses the 3D layer; `check-landing` checks that every scene has a poster and a credited or self-made source.
- **Validation**: a samurai landing (`sites/samurai`) generated with `new-landing.sh --auto` from pattern sheets of the two references, passing site QA, `check-landing` and deploying its preview.

## Capabilities

### New Capabilities

- `3d-scenes`: opt-in, accessible, lazy-loaded WebGL scenes with a static poster fallback and scroll linking.

### Modified Capabilities

- `quality-gates`: 3D checks (no canvas under reduced motion or without JS, poster visible, no WebGL errors, 3D chunk budget).
- `landing-generation`: proposals may plan 3D scenes; images may come from museum open-access APIs; the final check covers scene posters.

## Impact

- New: `src/components/three/`, `src/pages/3d.astro`, scene README, QA checks, museum sources in `find-images.mjs`, `sites/samurai/`, `patterns/crazy-studio.md`, `patterns/experience2026-funtech-inc.md`.
- Dependency: `three` (MIT) in the root and site dependency ranges; tree-shaken out of pages that do not use `<Scene3D />`.
- Network: the two reference sites and the museum APIs must be allowed in the cloud environment.
- Out of scope: React Three Fiber, downloaded 3D models (glTF), physics, audio, postprocessing stacks.
