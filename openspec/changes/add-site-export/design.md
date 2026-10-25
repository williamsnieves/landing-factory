# Design: add-site-export

## Context

- **Where sites live now.** Each landing is an npm workspace in `sites/<slug>/`. It has its own `package.json` with dependency ranges, but no lockfile and no tooling. QA, the report, the deploy and the credits are root scripts that take `--site <slug>`.
- **Root mode already exists.** Without `--site` the same scripts work on the repository root, which is how the starter is checked:
  - `resolveQaPaths` uses `<root>`, `qa.config.json` and `qa/`;
  - `deploy.mjs` reads the root `site.config.json` and `dist/`;
  - the report writes `qa/report/`.

  An exported repository can therefore put the site at its root and run the scripts unchanged.
- **Import graph today:**
  - `qa.mjs` imports `qa/*`, and `qa/config.mjs` imports `report/config.mjs` and `report/legal-rules.mjs`;
  - `landing-report.mjs` imports `qa/*`, `report/*`, `lib/brief-schema.mjs` (through `report/legal.mjs`) and `../.claude/skills/analyze-reference/scripts/proxy.mjs`;
  - `deploy.mjs` imports `deploy/*`, `lib/sites.mjs` and `report/headers.mjs` / `report/mask.mjs`;
  - `credits.mjs` imports `lib/sites.mjs`.
- **What CI does per site today.** The `site-qa-deploy` matrix job of `.github/workflows/ci.yml` (724 lines) is what an exported repository needs, minus the matrix and `--site`.
- **The first export.** `personal-brand` is a two-locale site whose brief names no market. It uses AI images recorded in `assets.json` and has a design system in `design-system/personal-brand/MASTER.md`. It goes to a new GitHub repository with target `vercel`.

## Goals / Non-Goals

**Goals:**

- One command makes a folder that is a complete repository: `npm ci && npm run build && npm run qa && npm run report` work in it and CI deploys it.
- The list of copied scripts follows the code, not a hand-kept list.
- No private, generated or secret file leaves the factory.
- The factory records the export and stops deploying the site.

**Non-Goals:**

- Creating or pushing the remote repository.
- `git init`: the command only writes files.
- Syncing factory updates into an exported repository later. A re-export into a fresh folder plus a diff is the manual path.
- Removing the site from the factory.
- `check-landing`: it compares against the factory's other sites and archetypes.
- The generation pipeline (`new-landing`, skills, MCP, AI image generation) in the exported repository.
- CI systems other than GitHub Actions.

## Decisions

1. **The site sits at the repository root, and the scripts run without `--site`.**
   - Root mode is already tested, so the copied scripts need almost no change. One change: in root mode the report now reads `brief.json` at the project root when it exists (the starter has none, so its output is unchanged); otherwise an exported brief would never reach the legal checks.
   - Alternative rejected: keeping `sites/<slug>/` inside the new repository, which would carry the factory's layout into a single-site project.

2. **The script list is the import closure of fixed entry points.**
   - **Entry points:**
     - `scripts/qa.mjs`, `scripts/landing-report.mjs`, `scripts/deploy.mjs` and `scripts/deploy/config.mjs` (CI calls it directly);
     - `scripts/parse-wrangler-output.mjs`.
   - `credits.mjs` and `legal.mjs` are not exported: both work only on `sites/<slug>/` (they require `--site`). Credits and legal data are regenerated in the factory before exporting; the exported `CREDITS.md`, `src/data/credits.json` and `src/data/legal.json` travel as they are.
   - **The walker** (`scripts/export/closure.mjs`):
     - reads static `import ... from './x'`, `export ... from './x'` and `import('./x')` with relative specifiers;
     - resolves them and recurses;
     - ignores bare package specifiers, which become dependencies (Decision 4);
     - fails when a resolved file leaves `scripts/`.
   - A test checks the closure of the real entry points against what they actually import, and the end-to-end verification runs QA and the report in an exported folder, which catches a missed dynamic path.
   - Alternative rejected: a hand-kept list, which drifts.

3. **The proxy helper moves to `scripts/lib/proxy.mjs`.**
   - `landing-report.mjs`, `check-landing.mjs`, `find-images.mjs`, `ai-images.mjs` and `preflight.mjs` import it from there.
   - `.claude/skills/analyze-reference/scripts/proxy.mjs` becomes `export * from '../../../../scripts/lib/proxy.mjs'`. It is our own skill, not a vendored one, and its scripts keep working.
   - Without this move, the closure would leave `scripts/` (Decision 2 would fail).

4. **Dependencies are pinned to the versions the factory resolved.**
   - **The site's own packages:**
     - every dependency and devDependency of the site's `package.json` is listed;
     - its version is the one the factory's `package-lock.json` resolved, read from `packages["sites/<slug>/node_modules/<name>"]` and else `packages["node_modules/<name>"]`.
   - **Tooling:** from the root `devDependencies`, the tooling the copied scripts import or run. That is `lighthouse`, `chrome-launcher`, `playwright`, `prettier`, `prettier-plugin-astro` and `sharp` (Astro's image service), plus `wrangler` only when `deploy/config.mjs` says the site can deploy through wrangler (target `cloudflare`, or `vps`/`shared` with a Cloudflare preview fallback).
   - A package missing from the lockfile stops the export, naming it.
   - **Other fields:** `engines.node` comes from the root. `npm run` scripts: `dev`, `build`, `preview`, `check`, `format`, `format:check`, `qa`, `report`, `deploy`.
   - **The lockfile:** made by `npm install --package-lock-only --ignore-scripts` in the output folder; `--no-lockfile` skips it when offline and says so.
   - Exact pins keep the exported build identical to what QA passed in the factory.

5. **What goes where in the output:**

   | Output                                                                                                                    | Source                                                                                               |
   | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
   | `src/`, `public/`, `astro.config.mjs`, `tsconfig.json`, `site.config.json`, `assets.json`, `CREDITS.md`, `README.md`      | the site folder (README regenerated, see below)                                                      |
   | `assets/` (the customer's original files)                                                                                 | the site folder, when present                                                                        |
   | `brief.json`                                                                                                              | the site folder, unless `--no-brief`                                                                 |
   | `docs/factory/` `PROPOSAL.md`, `RUN.md`, `CONTENT.md`, `MASTER.md`, `layout-signature.json`                               | the site folder and `design-system/<slug>/MASTER.md`, whichever exist                                |
   | `docs/deploy.md`                                                                                                          | `docs/deploy/<target>.md`                                                                            |
   | `scripts/...`                                                                                                             | Decision 2                                                                                           |
   | `qa.config.json`                                                                                                          | the site's own, else the root's                                                                      |
   | `.nvmrc`, `.prettierrc.json`                                                                                              | root                                                                                                 |
   | `.prettierignore`, `.gitignore`                                                                                           | written for a one-site repository (`node_modules/`, `dist/`, `.astro/`, `qa/`, `.env*`, logs)        |
   | `.github/workflows/ci.yml`                                                                                                | `scripts/export/templates/ci.yml` (Decision 6)                                                       |

   - **Never copied:**
     - `dist/`, `node_modules/`, `.astro/`, `qa/`;
     - `.run.log`, `.run-usage.json`, `.env*` (except `.example`, `.sample`, `.template`);
     - `EXPORTED.json`;
     - dotfiles not listed above.
   - **README:** written from `scripts/export/templates/README.md` with the site name, its target, the secrets of that target (from `deploy/config.mjs`), the commands, the domain step (pointing to `docs/deploy.md`) and a line saying the repository was exported from landing-factory and when.

6. **The workflow is a template, not a trimmed copy of the factory's.**
   - `scripts/export/templates/ci.yml` is one job set for a single site at the root:
     - **`qa` job:** checkout, Node from `.nvmrc`, `npm ci`, `format:check`, `astro check`, Playwright Chromium, `npm run qa -- --runs 3`, `npm run report -- --only static`, artifacts, and `dist/` uploaded only on success;
     - **`deploy` job:** `needs: qa`; it reads the target with `node scripts/deploy/config.mjs --github-output` and runs the same prerequisites gate (secret booleans only, no forks, a warning and skip when missing). It deploys with wrangler or `scripts/deploy.mjs` as the dispatch says, runs the live report, writes the sticky comment (`<!-- site-preview -->`) and fails last if the live report failed.
   - The same steps and gate as the factory, so behaviour matches.
   - The template has no placeholders beyond the comment marker. Everything site-specific is read at run time from `site.config.json`, so the file is static and a test can parse it and assert its steps.
   - Alternative rejected: deriving it from `ci.yml` by text surgery, which breaks whenever the factory workflow changes.

7. **Safety before writing.** All checks run before the first file is written:
   - slug, site, `--out` (it must resolve outside the factory root after `realpath` of its nearest existing parent, and be absent or empty);
   - the closure;
   - the lockfile versions;
   - the secret scan with `scripts/report/source-scan.mjs`' provider patterns over the files to copy, matches shown through `mask()`.

   The command then writes the folder. If a later step fails (the lockfile install), it removes what it wrote, which is safe because the folder was empty, and exits 1. Exit codes: 0 done, 1 refused by a check or failed, 2 bad usage (slug, missing site, `--out` inside the factory or not empty).

8. **The record is `sites/<slug>/EXPORTED.json`.**
   - Fields: `{ "repository": "https://...", "exportedAt": ISO, "factoryCommit": sha, "target": ... }`, written only with `--record <https-url>`.
   - `scripts/changed-sites.mjs` drops sites that have it, so the matrix runs no QA, report or deploy for them.
   - The folder stays a workspace: `check:sites` still type-checks it, and `check-landing` still compares new sites against its `layout-signature.json`, so the next landing cannot copy its layout.
   - Alternative rejected: deleting the folder, which loses the diversity reference and the history; removal can be a later owner decision.

9. **Formatting.** After writing, the command runs the factory's Prettier with the copied config on the output folder, so the exported repository passes its own `format:check` from the first commit.

10. **Tests** (`tests/export.test.mjs`, no network):
    - **Closure:** the real entry points, and a fixture that imports outside `scripts/`.
    - **Package building:** a fake lockfile.
    - **Refusals:** inside the factory, a non-empty folder, a bad slug, a missing site.
    - **Secret scan:** a fake key built at run time.
    - **A full export of a small fixture site** with `--no-lockfile`: the file list, nothing private, `docs/factory/`, a README naming the target secrets, and a parseable workflow with the gate and deploy steps.
    - **`--record`** and the `changed-sites` filter.

    A hidden `--root` is honoured only when `NODE_TEST_CONTEXT` is set (as `LANDING_FACTORY_ROOT` in the MCP tests), so tests export from a fixture factory.

## Risks / Trade-offs

- **Exported repositories drift from the factory.**
  - *Risk:* fixes to QA or the report do not reach them.
  - *Accepted for now:* `docs/export.md` explains re-exporting to a fresh folder and diffing `scripts/`.
- **A dynamic import with a computed path escapes the closure.**
  - *Risk:* a module could be missed.
  - *Mitigation:* the walker fails on any `import(` whose argument is not a string literal inside `scripts/`, and the end-to-end QA and report run in the exported folder.
- **`brief.json` in a public repository.**
  - *Risk:* it holds the interview data.
  - *Mitigation:* it travels by default because the report's legal checks need it, `--no-brief` exists, and the README and the command's summary say the brief was included.
- **Impeccable and Lighthouse need the network in the exported CI.** Same as the factory today.
- **Vercel preview protection.** Previews show a login page to the live report, as `docs/deploy/vercel.md` already explains; the README repeats it.
- **The first real Vercel deploy is unverified.** No Vercel account has deployed yet (`docs/status.md`). The first export is the first real test, run in the owner's repository with the owner's token.
