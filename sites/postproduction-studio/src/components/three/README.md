# 3D layer

Opt-in WebGL scenes with a static poster. Pages without `<Scene3D />` never download Three.js. Vanilla Three.js (`three`, MIT), no React Three Fiber, scenes built from code only (no model files).

## How it works

```astro
---
import Motion from '../components/motion/Motion.astro';
import Scene3D from '../components/three/Scene3D.astro';
import poster from '../assets/blade-poster.jpg';
---

<Motion slot="head" smooth />
<section>
  <Scene3D
    scene="blade"
    poster={poster}
    alt="A steel blade turning against a dark ground."
    scrub
    aspect="16/9"
  />
</section>
```

`<Scene3D />` renders `<figure data-scene="blade">` with the poster (an optimized `<Picture>`, the LCP candidate) and an empty mount. The runtime (`runtime.ts`) then decides, per figure:

| Condition                                     | Result                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| No JavaScript                                 | Poster only                                                                                                        |
| `prefers-reduced-motion: reduce`              | Poster only; no 3D code is downloaded                                                                              |
| No WebGL (`webgl2`/`webgl`)                   | Poster only, one `console.warn`                                                                                    |
| Otherwise, figure within one viewport (100 %) | After `load` and an idle moment: lazy `import()` of the scene module and Three.js, canvas fades in over the poster |

The poster stays in the DOM (it keeps the `alt` text for screen readers; the canvas and mount are `aria-hidden`). `data-scene-state` on the figure tells what happened: `poster` (with `data-scene-reason`: `reduced-motion`, `no-webgl`, `missing-module`, `load-failed`, `create-failed`, `runtime-error`), `idle`, `loading`, `running`.

Lifecycle: the render loop runs only while the figure is on screen and the tab is visible; the pixel ratio is capped at 2 (1.5 under 768 px wide); the canvas follows the figure's size (`ResizeObserver`); everything is disposed on `astro:before-swap`. If WebGL cannot be created the poster stays and the page logs a warning. Any other exception in a scene is a bug: it is logged with `console.error` (`[scene:<name>] ...`), the poster is restored, and QA fails on it.

## Props

| Prop       | Type            | Notes                                                                      |
| ---------- | --------------- | -------------------------------------------------------------------------- |
| `scene`    | `string`        | Module name: `src/scenes/<scene>.ts`. A missing module fails the build.    |
| `poster`   | `ImageMetadata` | Static image of the scene. Required.                                       |
| `alt`      | `string`        | Describes the poster/scene.                                                |
| `scrub`    | `boolean`       | Drive `progress` with the scroll of the enclosing `<section>` (see below). |
| `priority` | `boolean`       | Poster `loading="eager"` + `fetchpriority="high"` (hero scene only).       |
| `aspect`   | `string`        | CSS aspect ratio, `"16/9"`. Default: the poster's own ratio.               |
| `sizes`    | `string`        | Poster `sizes`, default `100vw`.                                           |
| `class`    | `string`        | Extra classes on the `<figure>`.                                           |

Optional attributes on the figure (through the motion layer): `data-scene-start` / `data-scene-end` (ScrollTrigger positions, default `top bottom` / `bottom top`), `data-scene-duration` (seconds of the looping clock without `scrub`, default 20).

## Scroll link

With `scrub`, `progress` is 0 when the enclosing `<section>` enters at the bottom of the viewport and 1 when it leaves at the top. `initMotion` (loaded by `<Motion />`) creates one ScrollTrigger per figure and writes the value to `data-scene-progress` on the figure; the runtime reads it each frame. Without `<Motion />` the runtime computes the same value from the section's bounding box. Without `scrub`, `progress` loops 0 to 1 over `data-scene-duration` seconds. Under reduced motion there is no canvas, so no scrub.

## Scene module contract

`src/scenes/<name>.ts` (found with `import.meta.glob('/src/scenes/*.ts')`, so each scene and Three.js become lazy chunks):

```ts
import { Mesh, Scene, PerspectiveCamera /* ...by name */ } from 'three';
import { createRenderer, themeColor } from '../components/three/helpers';
import type { SceneCreate } from '../components/three/types';

export const create: SceneCreate = (ctx) => {
  // ctx: { canvas, width, height, pixelRatio, theme, name }
  const renderer = createRenderer(ctx); // WebGLRenderer on ctx.canvas, sized and capped
  const ink = themeColor(ctx.theme, 'ink', '#14120f');
  // build scene, camera, meshes ...
  return {
    update(progress, timeMs) {
      // advance state from progress (0..1) / time, then render
      renderer.render(scene, camera);
    },
    resize(width, height, pixelRatio) {
      /* renderer.setPixelRatio, setSize(width, height, false), camera.aspect */
    },
    dispose() {
      /* geometry/material/texture .dispose(), renderer.dispose() */
    },
  };
};
```

Rules:

- Import from `three` by name, never `import * as THREE` (tree-shaking keeps the chunk small; QA budget: `threeD.maxGzipKb`, 200 KB gzip). The demo scene is about 140 KB.
- `create` may be async. Throw only for real bugs; do not catch WebGL context errors yourself.
- Colors come from `ctx.theme`: `--color-ink` becomes `theme.ink`, `--color-primary` becomes `theme.primary` (hex, `rgb()` or `hsl()` values; not `oklch()`). `tokens.css` uses `@theme static` so every token is emitted, not only the ones a utility uses.
- Keep the poster and the canvas visually equal: render the poster from the scene with `node scripts/render-poster.mjs`, so the swap is invisible.
- The scene decorates; it never carries the only copy of any content.
- Keep per-frame work allocation-free; use instancing for many objects; no model files, external textures or HDRIs.

## Poster

```bash
node scripts/render-poster.mjs --page /3d/ --scene demo --out src/assets/3d-demo-poster.jpg
node scripts/render-poster.mjs --site <slug> --page / --scene hero --out sites/<slug>/src/assets/hero-poster.jpg
```

It builds, serves, opens the page in Chromium (software WebGL), scrolls the scene to `--progress` (default 0.4), and saves the canvas as JPEG or PNG. With `--site` it also records the file in `assets.json` (`source: "self"`, `credit: false`). A credited museum or Commons image also works as a poster. The starter's own poster, `src/assets/3d-demo-poster.jpg`, was rendered this way from `src/scenes/demo.ts`: it is original work, and the root has no `assets.json` to record it in.

## QA

`npm run qa` checks every page containing `[data-scene]` (see CLAUDE.md, "Reading `report.json`"): no canvas and a visible poster under reduced motion and without JavaScript, a canvas and no errors on a normal load, and the 3D JavaScript within budget. `/3d/` is the starter's demo page (noindex).
