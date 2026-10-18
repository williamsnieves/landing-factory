# Proposal

## Why

The factory decided on model A: every generated landing lives in this repo under `sites/<slug>/`, with its own build, QA and Cloudflare Pages project. Today the repo is a single site (the starter demo at the root), so the first pilot landing (`sites/panaderia/`, see its `PROPOSAL.md`) has nowhere to be built, checked or deployed.

## What Changes

- `sites/<slug>/` becomes a self-contained Astro site (own `package.json`, `astro.config.mjs`, `src/`, `public/`, `site.config.json`), managed as an npm workspace so dependencies are shared and pinned once.
- `npm run new-site -- <slug>` scaffolds a site from the starter: layout, motion layer, styles, headers and config, without the demo pages, plus `CREDITS.md` and a placeholder home page.
- `npm run qa -- --site <slug>` runs the full QA (build, screenshots, overflow, reduced motion, Lighthouse, impeccable) against one site.
- CI builds, checks and deploys every site that changed in a PR (and every site on `main` when its files changed), each to its own Pages project and preview URL, with one sticky preview comment per site. The root starter keeps its current pipeline.
- The root starter stays the reference demo and the template source; nothing moves.
- `add-new-landing-skill` (design decision 1) is updated to build on this instead of moving the starter into `templates/site/`.

## Capabilities

### New Capabilities
- `site-workspaces`: how a landing site is laid out, created and kept independent inside the factory repo.

### Modified Capabilities
- `quality-gates`: QA can target a single site.
- `deployment`: CI deploys each changed site to its own Pages project with its own preview comment.

## Impact

- `package.json` (workspaces, `new-site` script), `package-lock.json`, `scripts/new-site.mjs`, `scripts/qa.mjs`, `.github/workflows/ci.yml`, a small changed-sites detector script, docs (`CLAUDE.md`, `README.md`, `sites/README.md`).
- First real site: `sites/panaderia/` is scaffolded (placeholder page only) so the pipeline is exercised end to end; the landing itself is built in a later step.
- Each site creates one extra Cloudflare Pages project on its first deploy.
