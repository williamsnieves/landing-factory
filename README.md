# landing-factory

A pipeline that, given a niche, uses Claude to generate an original Astro landing page with near-Awwwards quality, ready to deploy. See [docs/roadmap.md](docs/roadmap.md) (original roadmap, in Spanish).

## Quickstart

Requires Node 22 (`nvm use`).

```bash
npm ci            # install
npm run dev       # dev server with hot reload
npm run build     # static build into dist/
npm run preview   # serve dist/
npm run check     # type and Astro diagnostics
npm test          # unit and fixture tests for the QA script
npm run qa        # build + screenshots, overflow, reduced motion, Lighthouse, impeccable -> qa/latest/report.md
npm run setup:agent   # install/verify Claude Code tooling (MCP config, design skills); idempotent
npm run setup:verify  # fast offline check of that tooling
```

Agent rules and conventions: [CLAUDE.md](CLAUDE.md). Motion primitives: [src/components/motion/README.md](src/components/motion/README.md).

## Deployment

Every push is built and verified by [`.github/workflows/ci.yml`](.github/workflows/ci.yml). The `qa` job runs Prettier, `astro check`, the tests and `npm run qa`; only if it passes does the `deploy` job publish `dist/` to Cloudflare Pages with `wrangler pages deploy`. A failing QA never deploys.

| Event                       | Result                                                             |
| --------------------------- | ------------------------------------------------------------------ |
| Pull request / other branch | Preview deployment at `https://<branch-alias>.<project>.pages.dev` |
| Push to `main`              | Production deployment (the project's production URL)               |
| Pull request                | One comment with the preview URL, updated on every push            |

Preview URLs look like `https://<branch-alias>.<project>.pages.dev`. Pages normalizes the branch name into the alias (lowercased, `/` and other characters replaced by `-`, long names truncated), so `change/add-cloudflare-preview-deploy` becomes something like `change-add-cloudflare-preview-deploy.landing-factory.pages.dev`. Each deployment also has its own `https://<hash>.<project>.pages.dev` URL. The PR comment and the job summary list both.

### One-time setup

1. Create a free [Cloudflare account](https://dash.cloudflare.com/sign-up). You do not need to create the Pages project by hand: CI creates it (production branch `main`) on the first deploy if it does not exist. To create it yourself instead, run `npx wrangler pages project create landing-factory --production-branch main` with the two variables below exported.
2. Create an API token at **My Profile > API Tokens > Create Token > Create Custom Token** with a single permission: **Account > Cloudflare Pages > Edit**. Scope it to your account and nothing else.
3. Find your **Account ID** on the Cloudflare dashboard home (right sidebar of the account overview) or in the URL `dash.cloudflare.com/<account-id>/...`.
4. In GitHub open **Settings > Secrets and variables > Actions > New repository secret** and add:
   - `CLOUDFLARE_API_TOKEN`: the token from step 2
   - `CLOUDFLARE_ACCOUNT_ID`: the ID from step 3
5. The project name and production branch live in [`site.config.json`](site.config.json) (`cloudflare.pagesProject`, `cloudflare.productionBranch`). Change `pagesProject` for each new site. The name must be unique across Cloudflare Pages and use lowercase letters, digits and `-`.

Never commit the token or the account ID. Credentials are read only from GitHub secrets (or your shell environment locally).

### Until the secrets exist

The `deploy` job still runs but skips every deploy step: it emits a `::warning::` annotation naming the missing secret(s) and ends green, so QA keeps working on a fresh clone. Pull requests from forks are skipped the same way, because GitHub does not give forks access to secrets. Secret values are never printed.

### Headers

[`public/_headers`](public/_headers) is copied to `dist/_headers` by the build. It serves `/_astro/*` with `Cache-Control: public, max-age=31536000, immutable` and every response with `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: frame-ancestors 'self'` and a minimal `Permissions-Policy`.

## How we work: OpenSpec

Requirements live in [`openspec/`](openspec/) ([OpenSpec](https://github.com/Fission-AI/OpenSpec)):

- `openspec/specs/` — what the system does today (filled in as changes are archived).
- `openspec/changes/` — proposed work: `proposal.md` (why), `specs/` (what), `design.md` (how), `tasks.md` (steps).

Cycle per change, one PR per change:

```text
/opsx:apply <change>     # implement following tasks.md
  → PR → review → merge
/opsx:archive <change>   # merges the change's specs into openspec/specs/
```

CLI: `npm i -g @fission-ai/openspec` · `openspec list` · `openspec show <change>` · `openspec validate --all --strict`.

## Implementation order

| #   | Change                                                                                                          | Roadmap week | Depends on       |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------ | ---------------- |
| 1   | `setup-astro-starter` — Astro + Tailwind + React, motion (GSAP/Lenis), `CLAUDE.md`                              | 1            | —                |
| 2   | `setup-ai-tooling` — Astro Docs MCP, Playwright MCP, ui-ux-pro-max, taste-skill, impeccable                     | 1            | 1                |
| 3   | `add-qa-pipeline` — `npm run qa`: screenshots at 375/768/1440, overflow, reduced motion, Lighthouse, impeccable | 1–2          | 1                |
| 4   | `add-cloudflare-preview-deploy` — per-branch previews gated by QA                                               | 2            | 1, 3             |
| 5   | `add-analyze-reference-skill` — `/analyze-reference` URL → abstract pattern sheet in `patterns/`                | 2            | 1, 2             |
| —   | **First manual run** (niche + references + landing built by hand)                                               | 2            | 1–5              |
| 6   | `add-new-landing-skill` — `/new-landing` + `scripts/new-site.sh`, one command → landing                         | 3            | all of the above |
