# Tasks

## 1. Scaffolding

- [x] 1.1 Create the Astro project at the root (minimal template, strict TypeScript), `.nvmrc` with Node 22 and `engines` in `package.json`; verify `npm run build` produces `dist/index.html`
- [x] 1.2 Add `@astrojs/react`, `react`, `react-dom`, `tailwindcss` and `@tailwindcss/vite`; verify a test React island with `client:visible` renders and a page without islands does not load the React runtime
- [x] 1.3 Add `@astrojs/check`, Prettier and `prettier-plugin-astro` with `check` and `format` scripts; verify `npm run check` passes with no errors
- [x] 1.4 Create `src/components/sections/`, `src/components/motion/`, `src/layouts/`, `src/pages/`, `patterns/`, `design-system/`, `scripts/`, each with a short README; verify they exist
- [x] 1.5 Extend `.gitignore` (node_modules, dist, .astro, QA screenshots) and verify with `git status` that no generated artifacts show up

## 2. Layout and tokens

- [x] 2.1 Create `src/styles/tokens.css` with `@theme` (colors, fonts, type scale, spacing, radii) and verify that changing the primary color changes the demo after the build
- [x] 2.2 Create `src/layouts/BaseLayout.astro` with `lang`, title, description, Open Graph, viewport, skip link and `<main id="main">`; verify all tags exist in `dist/index.html` and the first Tab focuses the skip link
- [x] 2.3 Create the demo page `src/pages/index.astro` with 3–4 example sections using the tokens; verify visually with `npm run dev`

## 3. Motion

- [x] 3.1 Add `gsap` and `lenis`; implement `src/components/motion/` with `initMotion()` (reveal, pin, parallax via `data-*` attributes), Lenis ↔ ScrollTrigger sync and `destroy()`; verify reveal, pin and parallax work in the demo
- [x] 3.2 Implement the `prefers-reduced-motion` and no-JS guard (`.js-motion` class); verify with reduced-motion emulation that everything is visible with no pin or smooth scroll, and with JS disabled that content is visible
- [x] 3.3 Create the `<Motion />` component that loads the motion layer via dynamic import and cleans it up on `astro:before-swap`; verify a page without `<Motion />` does not download GSAP
- [x] 3.4 Document the primitives in `src/components/motion/README.md` with copy-paste examples

## 4. System rules

- [x] 4.1 Write `CLAUDE.md`: stack, commands, structure, OpenSpec flow (`/opsx:propose` → `/opsx:apply` → `/opsx:archive`), quality budgets, the "extract patterns, don't clone" principle, licensing and credits (`CREDITS.md` per site), and "all docs and PR descriptions in English"; verify it contains the numeric thresholds and the list of what is not extracted
- [x] 4.2 Update the repo `README.md` with a quickstart (`npm ci`, `npm run dev`, `npm run build`) and verify the commands work as written

## Workflow follow-up

- Open PR, review and merge.
- `/opsx:archive setup-astro-starter` after merge.
