# Proposal

## Why

The repo is empty, and the whole pipeline (analysis, generation, QA, deployment) needs a common Astro base to build on. Without a starter with a fixed stack, motion layer and rules, every generated landing would reinvent the base and quality could not be measured consistently.

## What Changes

- Astro project at the repo root with Tailwind and React islands, ready for `npm run dev` and `npm run build` (static output).
- Folder structure from the roadmap: `src/components/sections/`, `src/components/motion/`, `src/layouts/`, `src/pages/`, `patterns/`, `design-system/`, `scripts/`.
- Base layout with minimal SEO (title, description, Open Graph, `lang`), design tokens as CSS variables, and a demo page.
- Motion layer: smooth scroll with Lenis, GSAP + ScrollTrigger utilities (reveal, pin, parallax) that switch off under `prefers-reduced-motion`.
- `CLAUDE.md` with the system rules: stack, performance budget, accessibility, the "extract patterns, don't clone" principle, and a ban on third-party assets.
- Minimal quality tooling: strict TypeScript, `astro check`, Prettier.

## Capabilities

### New Capabilities
- `site-foundation`: the system's Astro base — static build, layout with SEO and accessibility, design tokens and the folder structure landings are generated on.
- `motion-system`: reusable animation utilities (smooth scroll, reveal, pin, parallax) that must respect `prefers-reduced-motion`.
- `project-guidelines`: versioned rules any agent must follow when working in the repo (stack, performance, accessibility, ethical use of references).

### Modified Capabilities
<!-- None: the repo has no existing specs. -->

## Impact

- New dependencies: `astro`, `@astrojs/react`, `react`, `react-dom`, `tailwindcss` (+ Vite integration), `gsap`, `lenis`, `typescript`, `@astrojs/check`, `prettier`.
- Requires Node 22 LTS.
- Base for every later change (`setup-ai-tooling`, `add-qa-pipeline`, `add-cloudflare-preview-deploy`, `add-analyze-reference-skill`, `add-new-landing-skill`).
