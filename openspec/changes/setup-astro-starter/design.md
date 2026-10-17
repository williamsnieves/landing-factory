# Design

## Context

Empty repo (OpenSpec only). See `proposal.md` — Why. The starter is both the template for each landing and the test bed for later changes, so it must be small, static by default and easy to copy.

## Goals / Non-Goals

**Goals:**
- A base that builds statically, passes `astro check` and is ready for the QA from `add-qa-pipeline`.
- "Awwwards-like" motion available from day 1 at no cost on pages that don't use it.
- System rules written once in `CLAUDE.md`.

**Non-Goals:**
- Final designed sections (generated per niche by `add-new-landing-skill`).
- 3D (Three.js / R3F): added on demand in a later change.
- CMS, i18n, forms with a backend.

## Decisions

1. **Astro 7 with static output (`output: 'static'`)**. Fits Cloudflare Pages with no adapter. Alternative: SSR with the Cloudflare adapter → unnecessary for landings.
2. **Tailwind v4 via `@tailwindcss/vite`** with tokens in `src/styles/tokens.css` using `@theme`. CSS variables are the single source of truth for the theme; the niche's `MASTER.md` is translated into this file. Alternative: JS `tailwind.config` → v4 favors CSS-first config.
3. **React islands (`@astrojs/react`) only when there is interaction** (`client:visible` by default). Sections in `.astro` whenever possible.
4. **Motion in vanilla TS, not React**: `src/components/motion/` exposes `initMotion()`, which reads `data-reveal`, `data-pin`, `data-parallax` attributes and creates the ScrollTriggers. A `<Motion />` component (Astro script) initializes it per page. Lenis is synced with `gsap.ticker`. This way an `.astro` section gets motion from an attribute without hydrating React. Alternative: React hooks → forces hydrating islands just to animate.
5. **Reduced motion and no-JS**: the hidden initial state of `data-reveal` applies only under a `.js-motion` class on `<html>`, added by an inline script when JS runs and `prefers-reduced-motion: reduce` is not set. Without that class everything is visible.
6. **Cleanup**: `initMotion()` returns a `destroy()` function that kills ScrollTriggers and Lenis; hooked to `astro:before-swap` when view transitions are used.
7. **Code quality**: strict TypeScript, `astro check`, Prettier with `prettier-plugin-astro`. ESLint left out to keep the MVP small.
8. **Node 22 LTS** pinned in `.nvmrc` and `engines`.

## Risks / Trade-offs

- [GSAP + Lenis add ~50 KB] → loaded only on pages that include `<Motion />`, via dynamic import.
- [Pin/parallax cause CLS or overflow on mobile] → the QA from `add-qa-pipeline` measures overflow at 375 px; primitives allow disabling pin per breakpoint (`data-pin-min="md"`).
- [Astro 7 APIs differ from what the model knows] → `setup-ai-tooling` adds the Astro Docs MCP; until then, follow the official docs.
