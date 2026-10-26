# Proposal: add-site-export

## Why

A landing that goes to its owner should live in its own repository, deployed from there, while the factory keeps building new ones. The product plan names this step ("Export: a command turns a site into a standalone repository"). Today it is done by hand. That means copying the site, guessing which scripts QA, the report and the deploy need, and writing a new CI workflow. The first case is the owner's personal-brand landing. It moves to a new GitHub repository, deploys to Vercel and takes the williansnieves.com domain from Netlify. A reusable command makes that move repeatable for every later customer.

## What Changes

- New command `npm run export -- --site <slug> --out <dir> [--no-brief] [--record <repo-url>] [--dry-run]` (`scripts/export.mjs`, modules in `scripts/export/`). It writes a self-contained repository with the site at its root:
  - **The site:** the site's own files (sources, public files, `astro.config.mjs`, `tsconfig.json`, `site.config.json`, `assets.json`, `CREDITS.md`, `README.md`).
  - **Factory scripts:** only the scripts that QA, the landing report and the deploy need. They are found by following their imports from fixed entry points, so the list stays right when the scripts change.
  - **Project files:**
    - its own `package.json`, with the site's dependencies pinned to the versions the factory lockfile resolved and the tooling `devDependencies` QA, the report and the deploy need, plus its own `package-lock.json`;
    - `qa.config.json`, `.nvmrc`, Prettier config and `.gitignore`.
  - **CI workflow:** a one-site workflow for GitHub Actions. It runs QA, the static report, the deploy to the site's target (behind the same secrets and fork gate) and the live report, and keeps a sticky preview comment.
  - **README:** setup, the secrets of the target and the domain step.
  - **Factory history:** the planning docs (`PROPOSAL.md`, `RUN.md`, `CONTENT.md`, the design system `MASTER.md`) go under `docs/factory/`.
- **What is never copied:** `dist/`, `node_modules/`, `.astro/`, `.run.log`, `.run-usage.json`, `.env*` or any file the report's secret scan flags. A secret found in the site aborts the export, and the report prints only its masked form.
- **Refusals:**
  - an `--out` inside the factory;
  - an `--out` folder that is not empty;
  - an invalid or missing site.
- `brief.json` travels by default, because the report's legal checks read it. `--no-brief` leaves it out for a public repository, and the report then warns "requirements unknown".
- `--record <repo-url>` writes `sites/<slug>/EXPORTED.json` (repository URL, date, factory commit, target). From then on the factory's CI no longer builds or deploys that site, since it lives in its own repository. The folder stays as the record and as a comparison point for the layout diversity check.
- `scripts/lib/proxy.mjs`: the proxy helper the report imports from the `analyze-reference` skill folder moves into `scripts/lib/`, so an exported repository needs no `.claude/` folder. The skill's file re-exports it.
- **First use:** a separate site change switches `sites/personal-brand/site.config.json` to `vercel`, exports it to the owner's new GitHub repository and records it. Moving the domain is the owner's step, guided by `docs/deploy/vercel.md`.

## Capabilities

### New Capabilities

- `site-export`: turning one site workspace into a standalone repository with its own build, QA, report, deploy and CI. It covers what is copied, what is never copied, refusals, and the factory's record of an exported site.

### Modified Capabilities

- `deployment`: CI does not build or deploy a site that carries `EXPORTED.json`, even when its folder changes.

## Impact

- **New code:**
  - `scripts/export.mjs` and `scripts/export/` (import closure, package and lockfile, workflow template, README template);
  - `scripts/lib/proxy.mjs`;
  - tests `tests/export.test.mjs`.
- **Changed code:**
  - `scripts/changed-sites.mjs` (skips exported sites);
  - the five scripts that import the proxy helper;
  - `.claude/skills/analyze-reference/scripts/proxy.mjs` becomes a re-export (our own skill, not vendored);
  - `package.json` gets an `export` script;
  - `.claude/settings.json` allows `npm run export`.
- **Docs:** `CLAUDE.md` (commands, a short "Exporting a site" section), `docs/export.md`, `docs/status.md`.
- **Dependencies:** no new dependency. The export runs `npm install --package-lock-only` in the output folder, which needs the npm registry; with no registry it stops and says so.
- **Out of scope:**
  - creating the GitHub repository or pushing to it (the owner creates it; this session or the owner pushes the exported folder);
  - syncing later factory changes into an exported repository;
  - deleting the site from the factory;
  - Bitbucket Pipelines;
  - DNS changes.
