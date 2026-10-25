# Export a site as a standalone repository

A landing that goes to its owner should live in its own repository and deploy from there, while the factory keeps building new ones. `npm run export` turns one site of `sites/<slug>/` into a folder that is a complete repository. It does not create the GitHub repository and it does not push.

## Usage

```bash
npm run export -- --site <slug> --out <dir> [--no-brief] [--no-lockfile] [--record <https-url>] [--dry-run]
```

| Option                 | Meaning                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `--site <slug>`        | The site under `sites/` (required).                                                                                                          |
| `--out <dir>`          | The output folder (required). It must be outside the factory and absent or empty.                                                            |
| `--no-brief`           | Leave `brief.json` out, for a public repository (see "The brief").                                                                           |
| `--no-lockfile`        | Skip `npm install --package-lock-only` (offline). The command says no lockfile was written; make one before the first commit.                |
| `--record <https-url>` | After a successful export, write `sites/<slug>/EXPORTED.json` (see "The record").                                                            |
| `--dry-run`            | Print the files, the dependencies and the workflow that would be written. Nothing is written, not even `EXPORTED.json`.                      |

Exit codes: `0` done, `1` refused by a check or failed, `2` bad usage (invalid slug, missing site, `--out` inside the factory or not empty, a `--record` URL that is not `https://`).

Every check runs before the first file is written. If a later step fails (the lockfile install), the command removes what it wrote and exits 1.

## What the exported repository holds

The site sits at the root, so the scripts run in the same "root mode" the starter uses: `npm run qa`, `npm run report` and `node scripts/deploy.mjs` take no `--site`.

- **The site:** `src/`, `public/`, `astro.config.mjs`, `tsconfig.json`, `site.config.json`, `assets.json`, `CREDITS.md` and the customer's original files in `assets/`, when there are any. The site's `README.md` is replaced by a new one (setup, commands, the secrets of the target, the domain step).
- **Factory scripts:** only the scripts that QA, the landing report and the deploy need. They are found by following relative imports from `scripts/qa.mjs`, `scripts/landing-report.mjs`, `scripts/deploy.mjs`, `scripts/deploy/config.mjs` and `scripts/parse-wrangler-output.mjs`, so the list follows the code. An import that leaves `scripts/`, or an `import()` whose argument is not a string literal, stops the export. `credits.mjs` and `legal.mjs` stay in the factory: they work on `sites/<slug>/`, and an exported repository has no photo or legal pipeline.
- **Project files:** `package.json`, `package-lock.json`, `qa.config.json` (the site's own, else the factory's), `.nvmrc`, `.prettierrc.json`, `.prettierignore` and `.gitignore`.
  - `package.json` lists the site's dependencies and the tooling the scripts need (`lighthouse`, `chrome-launcher`, `playwright`, `prettier`, `prettier-plugin-astro`, `sharp`, and `wrangler` only when the site can deploy through it). Every version is the exact one the factory's `package-lock.json` resolved, so the exported build is the one QA passed. A package missing from the factory lockfile stops the export, naming it.
  - `package-lock.json` is made by `npm install --package-lock-only --ignore-scripts` in the output folder. That needs the npm registry; with no registry the export stops and says so.
  - After writing, the factory's Prettier formats the output with the copied config, so `npm run format:check` passes from the first commit.
- **CI:** `.github/workflows/ci.yml`, a one-site workflow for GitHub Actions. The `qa` job runs the format check, `astro check`, QA (`--runs 3`) and the static report, and uploads `dist/` only when they pass. The `deploy` job (`needs: qa`) reads the target with `node scripts/deploy/config.mjs --github-output`, checks that the target's secrets exist and the pull request is not from a fork (a warning and a green skip otherwise), deploys with wrangler or `scripts/deploy.mjs`, runs the live report, keeps one sticky preview comment and fails last if the live report failed. Nothing in it is specific to the site: the target, the Pages project and the secrets come from `site.config.json` at run time.
- **Docs:** `docs/deploy.md` is the deploy guide of the target. `docs/factory/` holds what the factory wrote while building the site: `PROPOSAL.md`, `RUN.md`, `CONTENT.md`, `layout-signature.json` and the design system `MASTER.md`.

## What is never copied

`dist/`, `node_modules/`, `.astro/`, `qa/`, `.run.log`, `.run-usage.json`, `.env` files (`.env.example`, `.env.sample` and `.env.template` are allowed), `.DS_Store`, `EXPORTED.json` and every dotfile or folder of the site folder that the list above does not name (for example `.taste-skill/`).

The files that come from the site are scanned with the landing report's provider secret patterns (private keys, AWS, GitHub, Slack, Stripe live, Google, OpenAI and Anthropic, npm tokens). A match stops the export with exit 1 and nothing is written. The message shows the file, the line and the masked match (four characters and the length), never the secret. A match on the generic `token = '...'` pattern only prints a warning.

## The brief

`brief.json` travels by default, because the landing report reads it for the legal checks (markets, holder, privacy contact). It holds the interview data: business, contact and legal details. Check that before the repository becomes public. `--no-brief` leaves the file out; the report's legal item then warns that the requirements are unknown. The command and the exported README both say when the brief was included.

## The record

`--record https://github.com/<owner>/<repo>` writes `sites/<slug>/EXPORTED.json` in the factory with the repository URL, the export date, the factory commit and the target. Commit it in a factory change.

From then on the factory's CI skips the site: `scripts/changed-sites.mjs` never lists a site that has `EXPORTED.json`, so a change to its folder, or to a shared path, builds and deploys nothing for it. The folder stays in the factory as the record, `npm run check:sites` still type-checks it, and `check-landing` still compares new landings against its `layout-signature.json`, so the next landing cannot copy its layout.

## First push and secrets

1. Create the empty repository on GitHub (the export does not).
2. In the exported folder: `git init -b main`, `git add .`, `git commit`, `git remote add origin <url>`, `git push -u origin main`.
3. Add the secrets of the target under Settings > Secrets and variables > Actions. The README of the exported repository lists them; they are also in `docs/deploy.md`. Without them CI still runs QA and the report, skips the deploy and says so in a warning.
4. Move the domain as `docs/deploy.md` describes. That is the owner's step, and the factory never changes DNS.

Real deploys run only from CI. Never deploy from a local machine and never commit credentials.

## Updating an exported repository

Nothing syncs later factory changes into an exported repository. To pick up a fix to QA, the report or the deploy, export the site again into a fresh folder and compare its `scripts/` (and `package.json` pins) with the repository's. Changes to the site itself are made in the exported repository from then on.

## Limits

- The export writes files only: no `git init`, no remote repository, no push.
- Only GitHub Actions is generated (no Bitbucket Pipelines).
- `check-landing`, the generation pipeline (`new-landing`, skills, the MCP server) and AI image generation are not part of an exported repository.
- The first real Vercel deploy from an exported repository is unverified until an owner's token has been used (`docs/status.md`).
