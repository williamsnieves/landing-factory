# Design

## Context

See `proposal.md` — Why. The root is an Astro project (starter demo) with QA (`scripts/qa.mjs`) and CI (`ci.yml`: `qa` then `deploy` from `site.config.json`). `sites/panaderia/` holds only `PROPOSAL.md`.

## Goals / Non-Goals

**Goals:** independent sites in one repo; reuse QA and deploy; minimal moving parts.

**Non-Goals:** a shared component package across sites (sites copy the starter at creation and may diverge), per-site custom domains, building the bakery landing itself.

## Decisions

1. **npm workspaces** with `"workspaces": ["sites/*"]`. Each site `package.json` is private, named `site-<slug>`, depends on the same versions as the root (`astro`, `@astrojs/react`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/vite`, `gsap`, `lenis`) and has `dev`, `build`, `preview`, `check` scripts. One root lockfile. Alternative: shared package for layout/motion → more coupling than the MVP needs.
2. **Scaffold by copy** (`scripts/new-site.mjs <slug>`): copies from the root `astro.config.mjs`, `tsconfig.json`, `src/layouts/`, `src/components/motion/`, `src/styles/`, `src/env.d.ts`, `public/_headers`, `public/favicon.svg`; writes a placeholder `src/pages/index.astro` (BaseLayout, `lang="es"` configurable later, `noindex` until the landing exists), `site.config.json` (`pagesProject: <slug>`, `productionBranch: main`), `CREDITS.md`, `README.md`. Slug rule: `^[a-z0-9]+(-[a-z0-9]+)*$`. Refuses existing folders. Never copies `src/pages/` or `src/components/sections/` from the root.
3. **QA per site:** `scripts/qa.mjs --site <slug>` sets the project dir to `sites/<slug>` (build with `npm run build -w site-<slug>`, preview from that dir, page discovery in its `dist/`, impeccable on its `src/`, output `qa/<slug>/<timestamp>` with `qa/<slug>/latest`). Root behavior unchanged when `--site` is absent.
4. **Changed-site detection:** `scripts/changed-sites.mjs` reads `git diff --name-only <base>...HEAD` (PR) or `HEAD^..HEAD` (push to main) and prints a JSON list: sites whose `sites/<slug>/` files changed, or all sites when shared paths changed (`package.json`, `package-lock.json`, `src/components/motion/`, `src/layouts/`, `src/styles/`, `scripts/qa.mjs`, `scripts/qa/`, `.github/workflows/`). Unit-tested.
5. **CI:** keep the existing `qa` and `deploy` jobs for the root starter. Add a `sites` job that computes the list, then a matrix job `site-qa-deploy` (`strategy.matrix.site: fromJSON(...)`, skipped when empty) that runs `npm run qa -- --site <slug>` and then deploys `sites/<slug>/dist` to the project from `sites/<slug>/site.config.json`, reusing the same secrets gate, project-create step, URL capture and sticky comment with marker `<!-- landing-factory-preview:<slug> -->`. Checkout uses `fetch-depth: 0` for the diff.
6. **Root build isolation:** the root `astro` build ignores `sites/` (it already only reads `src/`), and Prettier/`astro check` cover sites through the workspace (`npm run check --workspaces`).

## Risks / Trade-offs

- [Copied starter files drift between sites] → accepted for now; a later change can extract a shared package if drift hurts.
- [Cloudflare project name taken] → same as today: Cloudflare appends a suffix; the URL is read from wrangler output.
- [CI time grows with sites] → only changed sites run, matrix runs in parallel.
