# {{TITLE}}

A static landing built with Astro, exported from landing-factory on {{DATE}} (factory commit `{{COMMIT}}`). This repository is self-contained: it builds, checks and deploys without the factory.

## Setup

Node {{NODE}} (see `.nvmrc`).

```bash
npm ci
npm run dev
```

## Commands

| Command                             | Purpose                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run dev`                       | Dev server with hot reload                                                                                  |
| `npm run build`                     | Static build into `dist/`                                                                                   |
| `npm run preview`                   | Serve the built `dist/`                                                                                     |
| `npm run check`                     | `astro check` (types and Astro diagnostics)                                                                 |
| `npm run format`                    | Format with Prettier (`format:check` to verify)                                                             |
| `npm run qa`                        | Build, serve and verify every page; writes `qa/latest/`. Needs Chromium (`npx playwright install chromium`) |
| `npm run report -- --only static`   | Security, performance and legal report of the build; writes `qa/report/`                                    |
| `node scripts/deploy.mjs --dry-run` | Plan of a deploy to the target below (real deploys only run in CI)                                          |

`npm run qa` and `npm run report` use the thresholds in `qa.config.json`. Never lower a threshold to get a pass.

## Deployment

Target: **{{TARGET}}** (`site.config.json`). GitHub Actions (`.github/workflows/ci.yml`) runs the format check, `astro check`, QA and the static report on every push and pull request. Only if they pass, the secrets of the target exist and the pull request is not from a fork, it deploys, runs the live report and keeps one preview comment on the pull request. Production is the `{{BRANCH}}` branch.

{{SECRETS}}

Add them under Settings > Secrets and variables > Actions. Without them CI still runs QA and the report, skips the deploy and says so in a warning. Never commit or print credentials, and never deploy from a local machine.

{{DOMAIN}}

See `docs/deploy.md` for the full guide of the target.

## What is in this repository

{{CONTENTS}}

To pick up later factory fixes, export the site again into a fresh folder and compare its `scripts/` with this repository's.
