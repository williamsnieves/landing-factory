# landing-factory

A pipeline that, given a niche, uses Claude to generate an original Astro landing page with near-Awwwards quality, ready to deploy. See [docs/roadmap.md](docs/roadmap.md) (original roadmap, in Spanish).

## Quickstart

Requires Node 22 (`nvm use`).

```bash
npm ci            # install
npm run dev       # dev server with hot reload
npm run build     # static build into dist/
npm run preview   # serve dist/
npm run check     # type and Astro diagnostics (root starter)
npm run check:sites   # the same for every site under sites/
npm test          # unit and fixture tests (QA script, reference-analysis scripts, pattern validator)
npm run validate:patterns  # check patterns/*.md (structure, no site content)
npm run validate:archetypes  # check design-archetypes/*.md (fields, vocabularies, ranges)
npm run qa        # build + screenshots, overflow, reduced motion, Lighthouse, impeccable -> qa/latest/report.md
npm run report    # security (OWASP Top 10:2025), performance and legal report -> qa/report/latest/report.md
npm run report -- --site <slug> [--url <deployed-url>]  # the same for one site; --url adds the live checks
npm run new-site -- <slug>        # scaffold sites/<slug>/ from the starter (then `npm install`)
npm run qa -- --site <slug>       # full QA for one site -> qa/<slug>/latest/report.md
node scripts/render-poster.mjs --page /3d/ --scene demo --out src/assets/3d-demo-poster.jpg  # render a 3D scene's poster
npm run new-landing -- <slug> --niche "..."  # generate a whole landing with Claude (see "Generating a landing")
npm run setup:agent   # install/verify Claude Code tooling (MCP config, design skills); idempotent
npm run setup:verify  # fast offline check of that tooling
```

Each landing lives in its own workspace under `sites/<slug>/` with its own build, QA and Cloudflare Pages project; see [sites/README.md](sites/README.md). The root is the starter demo and the template that `new-site` copies from.

Agent rules and conventions: [CLAUDE.md](CLAUDE.md). Motion primitives: [src/components/motion/README.md](src/components/motion/README.md). 3D scenes (opt-in Three.js, poster first, QA budgets): [src/components/three/README.md](src/components/three/README.md), demo at `/3d/`.

## Landing report

`npm run report -- --site <slug>` audits a built landing for security, framed by the [OWASP Top 10:2025](https://owasp.org/Top10/2025/), and for performance, and writes `qa/<slug>/report/<timestamp>/report.md` (and `report.json`). Each item is `pass`, `warn`, `fail`, `na` or `not-run`, with the evidence and how to fix it; only a `fail` makes the command exit 1.

- Static checks (read `dist/` and the source): security headers and the Content-Security-Policy, private files in the build, secrets (always masked in the output), `npm audit` of the production dependencies, Subresource Integrity and third-party origins, mixed content, broken links, forms, and weight, images and fonts. Lighthouse detail (LCP element, CLS, TBT, requests) comes from the last `npm run qa` of the same build.
- `--url https://<site>.pages.dev` adds live checks on the deployed site (TLS, HTTP to HTTPS, response headers and HSTS, caching, private paths such as `/.git/HEAD` and `/.env` judged by their content, unknown paths answering 404). `--external-links` checks the outbound links; stores that block bots are listed as unverified, never failed.
- Thresholds for the performance warnings live in `qa.config.json` under `report`. The starter ships a script CSP, HSTS and COOP; existing sites get warnings until they opt in.

## Legal checks

The report also has a `legal` area: cookies and trackers against the consent rule, third-party hosts that receive the visitor's IP address, the legal notice and privacy policy the brief's market requires (EU, Spain), and discount claims to review. A landing that sets no cookie and loads nothing from a tracker needs no consent banner. `node scripts/legal.mjs --site <slug> --write` builds `src/data/legal.json` from the brief, and the starter's `src/components/legal/` components render the pages; a value the brief lacks shows a visible "pending legal review" marker and the report fails on it. These checks and templates support compliance and are not legal advice; a lawyer must review the result before production. Guide: [docs/legal.md](docs/legal.md).

## Deployment

Every push is built and verified by [`.github/workflows/ci.yml`](.github/workflows/ci.yml). The `qa` job runs Prettier, `astro check`, the tests, `npm run qa` and the landing report (`npm run report -- --only static`); only if it passes does the `deploy` job publish `dist/` to Cloudflare Pages with `wrangler pages deploy`. A failing QA or report never deploys. After the deploy the report's live checks run on the deployed URL.

| Event                       | Result                                                                         |
| --------------------------- | ------------------------------------------------------------------------------ |
| Pull request / other branch | Preview deployment at `https://<branch-alias>.<project>.pages.dev`             |
| Push to `main`              | Production deployment (the project's production URL)                           |
| Pull request                | One comment with the preview URL and the report verdict, updated on every push |

Preview URLs look like `https://<branch-alias>.<project>.pages.dev`. Pages normalizes the branch name into the alias (lowercased, `/` and other characters replaced by `-`, long names truncated), so `change/add-cloudflare-preview-deploy` becomes something like `change-add-cloudflare-preview-deploy.landing-factory.pages.dev`. Each deployment also has its own `https://<hash>.<project>.pages.dev` URL. The PR comment and the job summary list both.

### Sites

Landings under `sites/<slug>/` use the same pipeline per site. The `sites` job lists the sites that changed in the push or pull request (or all of them when a shared file changed), and a matrix job per site runs `astro check`, `npm run qa -- --site <slug>` and `npm run report -- --site <slug> --only static`, then deploys `sites/<slug>/dist` to the Pages project named in `sites/<slug>/site.config.json` (created on the first deploy), with the same secrets gate. Each site gets its own preview URL and its own PR comment, and the reports are uploaded as `qa-report-<slug>` and `landing-report-<slug>` (the live checks run on the preview URL after the deploy). The Cloudflare token needs no extra permission: one Pages project is created per site.

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

## Generating a landing

One command turns a niche into a site in `sites/<slug>/`: preflight, scaffold, then the [`/new-landing`](.claude/skills/new-landing/SKILL.md) skill through `claude -p` (brief, proposal, design system, build, QA loop, polish, final check). Run it from a terminal or a Claude session, not from GitHub Actions.

```bash
# 1. Proposal only: stops at the checkpoint so you can review sites/<slug>/PROPOSAL.md
scripts/new-landing.sh clinica-dental --niche "private dental clinic in Valencia" --refs sonomabakery-com
# 2. Continue after the review: design system, build, QA until it passes, polish, final check
scripts/new-landing.sh clinica-dental --niche "private dental clinic in Valencia" --resume --auto
# Everything unattended in one go:
scripts/new-landing.sh clinica-dental --niche "..." --auto [--max-attempts 5] [--model <id>]
# Check the setup cheaply: proposal + design system only
scripts/new-landing.sh clinica-dental --niche "..." --dry-run
```

The run leaves `sites/<slug>/RUN.md` (inputs, phase times, QA attempts, decisions, what to confirm before launch) and a git-ignored `.run.log`. Afterwards review the diff, commit and open a PR; CI builds, checks and deploys the preview. Helper scripts, each with `--help`: `npm run preflight` (hosts, Chromium, free slug), `npm run find-images` (licensed Commons photos, and with `--source met` public-domain Met objects, into `assets.json`), `node scripts/render-poster.mjs` (poster image of a 3D scene), `npm run ai-images -- generate <slug> --prompt "..." --as <name>` (an AI illustration through the OpenAI Images API, with provenance in `assets.json`; needs `OPENAI_API_KEY`, only when the customer allows AI images, capped per site), `npm run credits -- --site <slug>` (CREDITS.md and footer credits), `npm run legal -- --site <slug> --write` (legal data for the legal pages, from the brief), `npm run check-landing -- --site <slug>` (credits, photo reuse, tokens, diversity, layout diversity, copy originality), `node scripts/pick-archetypes.mjs --site <slug>` (archetype blends from the brief signals and reference sheets) and `node scripts/layout-signature.mjs --site <slug> --write` (measure the built layout). Each landing starts from a blend of the composition archetypes in [design-archetypes/](design-archetypes/README.md), chosen from its requirement and its references: a starting grammar, not a template. See [scripts/README.md](scripts/README.md).

## Analyzing reference sites

References are for learning patterns, never for copying. In Claude Code run:

```text
/analyze-reference https://example.com/ --focus "pinned storytelling, large serif type"
```

The skill ([`.claude/skills/analyze-reference/SKILL.md`](.claude/skills/analyze-reference/SKILL.md)) first checks `robots.txt` and text-and-data-mining reservations and aborts if access is disallowed or cannot be verified. Otherwise it runs a local Playwright reconnaissance (temporary screenshots in the git-ignored `.cache/analyze/<slug>/`), writes an abstract sheet to `patterns/<slug>.md` (no assets, copy, code, color codes or brand font names), validates it with `npm run validate:patterns` and always deletes the temporary files. See [`patterns/README.md`](patterns/README.md) and the worked example [`patterns/_example-starter-demo.md`](patterns/_example-starter-demo.md). The scripts also run standalone: `node .claude/skills/analyze-reference/scripts/check-robots.mjs <url>`, `node .claude/skills/analyze-reference/scripts/recon.mjs <url>`, each with `--help`. This is guidance, not legal advice.

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
| 6   | `add-new-landing-skill` — `/new-landing` + `scripts/new-landing.sh`, one command → landing                      | 3            | all of the above |
