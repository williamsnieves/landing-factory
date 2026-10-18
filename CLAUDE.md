# CLAUDE.md

Rules for any agent or person working in this repo. Keep this file current.

## Project

landing-factory turns a niche into an original, near-Awwwards-quality Astro landing page, ready to deploy. Roadmap: `docs/roadmap.md`. Current state, next steps and working agreements: `docs/status.md` (read it first in a new or compacted session). The root is the starter demo and the template source; every generated landing lives in its own workspace under `sites/<slug>/` (see "Sites").

## Language

All documentation, comments, commit messages and pull request descriptions MUST be written in English.

## Stack

- Astro 7, static output (`output: 'static'`), Node 22 (`.nvmrc`)
- Tailwind CSS v4 via `@tailwindcss/vite`; tokens as CSS variables in `src/styles/tokens.css` (`@theme`)
- React islands (`@astrojs/react`), only where interaction is needed
- Motion: GSAP + ScrollTrigger and Lenis, vanilla TypeScript, driven by `data-*` attributes
- Three.js / R3F only when a landing needs 3D (later change)
- TypeScript strict, `astro check`, Prettier (with `prettier-plugin-astro`)
- Deployment: Cloudflare Pages via GitHub Actions (`wrangler pages deploy`), per-branch previews, production from `main`

## Commands

| Command                                       | Purpose                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm ci`                                      | Install exact dependencies                                                         |
| `npm run dev`                                 | Dev server with hot reload                                                         |
| `npm run build`                               | Static build into `dist/`                                                          |
| `npm run preview`                             | Serve the built `dist/`                                                            |
| `npm run check`                               | `astro check` for the root starter (`sites/` is excluded in `tsconfig.json`)       |
| `npm run check:sites`                         | `astro check` in every site workspace                                              |
| `npm run new-site -- <slug>`                  | Scaffold `sites/<slug>/` from the starter (see "Sites")                            |
| `npm run new-landing -- <slug> --niche "..."` | Generate a whole landing with `claude -p` (see "Generating a landing")             |
| `npm run preflight`                           | Check npm and Commons reachability, Chromium and a free slug                       |
| `npm run find-images -- ...`                  | Search and download licensed Commons photos into `sites/<slug>/assets.json`        |
| `npm run credits -- --site <slug>`            | Write the photo credits (`CREDITS.md`, `src/data/credits.json`) from `assets.json` |
| `npm run check-landing -- --site <slug>`      | Final check: credits, photo reuse, tokens, diversity, copy originality             |
| `npm run format`                              | Format with Prettier (`format:check` to verify)                                    |
| `npm run setup:agent`                         | Install/verify agent tooling (design skills, telemetry opt-out)                    |
| `npm run setup:verify`                        | Fast, offline, read-only check of the agent tooling                                |
| `npm test`                                    | Unit and fixture tests (QA script, analyze-reference scripts, validator)           |
| `npm run validate:patterns`                   | Validate `patterns/*.md` sheets (structure, no site content); runs in CI           |
| `npm run qa`                                  | Build, serve and verify every page; writes `qa/latest/`; exit 0 = pass             |
| `npm run qa -- --site <slug>`                 | Same checks for one site; writes `qa/<slug>/latest/`                               |
| `npx wrangler ...`                            | Pinned Cloudflare CLI; CI uses it to deploy `dist/` (do not deploy locally)        |

## Folder structure

```text
src/components/sections/   page sections (.astro first, React islands only if interactive)
src/components/motion/     motion layer: initMotion(), <Motion />, README with primitives
src/layouts/               BaseLayout (SEO, skip link, <main id="main">)
src/pages/                 routes
src/styles/                global.css and tokens.css (single source of the theme)
sites/<slug>/              one self-contained Astro site per landing (npm workspace `site-<slug>`)
patterns/                  abstract pattern sheets from references (no assets, copy or code)
design-system/             per-niche design decisions, translated into tokens.css
scripts/                   pipeline automation (qa.mjs, new-site.mjs, new-landing.sh, preflight.mjs, find-images.mjs, credits.mjs, check-landing.mjs, changed-sites.mjs, validate-pattern.mjs, parse-wrangler-output.mjs, setup-agent.sh)
public/_headers            Cloudflare Pages cache and security headers (lands in dist/_headers)
site.config.json           per-site Cloudflare settings: Pages project name and production branch
.github/workflows/ci.yml   CI: qa job, then deploy job (needs: qa)
openspec/                  specs, changes, archive
docs/                      roadmap and project docs
```

## Sites

Each landing is a complete static Astro site in `sites/<slug>/` (slug rule `^[a-z0-9]+(-[a-z0-9]+)*$`), registered as the npm workspace `site-<slug>` through `"workspaces": ["sites/*"]` in the root `package.json`. One `npm ci` at the root installs everything; one root `package-lock.json`. Details and conventions: `sites/README.md`.

- Create: `npm run new-site -- <slug> [--title ... --lang ... --message ...]` copies `astro.config.mjs`, `tsconfig.json`, `src/layouts/`, `src/components/motion/`, `src/styles/`, `src/env.d.ts`, `public/_headers` and `public/favicon.svg` from the root, and writes `package.json` (same dependency ranges as the root), `site.config.json` (`pagesProject: <slug>`), `CREDITS.md`, `README.md`, the planning templates `PROPOSAL.md` and `RUN.md`, an empty `assets.json` (image manifest) and a `noindex` placeholder `src/pages/index.astro`. It never copies the starter's pages or sections, and refuses invalid slugs and existing folders (`--allow-existing-docs` accepts a folder holding only `*.md` planning docs such as `PROPOSAL.md` and never overwrites them). Then run `npm install` once and commit the updated `package-lock.json`.
- Build and check one site: `npm run build -w site-<slug>`, `npm run check -w site-<slug>` (`npm run check:sites` for all).
- QA one site: `npm run qa -- --site <slug>` builds and serves `sites/<slug>`, checks its pages, runs impeccable on `sites/<slug>/src` and writes `qa/<slug>/<timestamp>/` (`qa/<slug>/latest`). A `sites/<slug>/qa.config.json` overrides the root `qa.config.json` for that site; never lower a threshold to get a pass.
- Sites copy the starter at creation and may diverge; nothing is shared at runtime. The root `src/styles/global.css` excludes `sites/` and `scripts/` from Tailwind's class scan so a site never changes the starter's CSS.
- Each site has its own Cloudflare Pages project (`sites/<slug>/site.config.json`) and its own `CREDITS.md`. Do not edit another site's folder from a site change.

## Generating a landing

`scripts/new-landing.sh <slug> --niche "..." [--refs a,b] [--auto] [--dry-run] [--resume] [--max-attempts N] [--model M]` runs `scripts/preflight.mjs`, `npm run new-site`, `npm install`, then `claude -p "/new-landing ..."` (skill: `.claude/skills/new-landing/SKILL.md`) and writes `sites/<slug>/.run.log`. Phases: brief, synthesis (`PROPOSAL.md`), checkpoint (stops unless `--auto`), design system (`design-system/<slug>/MASTER.md` with a `landing-meta` block, ui-ux-pro-max only), build (design-taste-frontend for art direction, palette and type fixed), QA loop (`npm run qa -- --site <slug>` until it passes or attempts run out), impeccable polish once, final check, `RUN.md`. Outcome is the `Result:` line of `sites/<slug>/RUN.md`; the script exits non-zero on `failed`.

- Images: only `node scripts/find-images.mjs` (Commons API through the proxy, throttled, CC0 / public domain / CC BY / CC BY-SA). Each file is recorded in `sites/<slug>/assets.json`; `node scripts/credits.mjs --site <slug>` regenerates the photo table of `CREDITS.md` (between `<!-- credits:start -->` and `<!-- credits:end -->`) and `src/data/credits.json` for the footer. Do not hand-edit those. The vendored taste-skill `assets.mjs` ignores the proxy and is not used.
- Final check: `node scripts/check-landing.mjs --site <slug> [--refs urls]` fails on an uncredited image, stale credits, a source photo referenced from more than two places, a MASTER.md palette color or font missing from `tokens.css`, a site that matches another on primary color, display font and hero type, or (with `--refs`) 8 words in a row copied from a reference read in memory. Exit 0 passed, 1 failed, 2 the run broke.
- `design-system/<slug>/MASTER.md` ends with a fenced `landing-meta` block: `primary: #rrggbb`, `display-font`, optional `body-font`, `hero: full-bleed-photo|split|typographic|video|illustration|collage`.
- Auto mode runs with `--permission-mode acceptEdits`; the commands the skill needs are allowed in `.claude/settings.json`. Generation never commits, pushes or deploys.

## CI and deployment

`.github/workflows/ci.yml` (triggers: `pull_request`, push to `main`, `workflow_dispatch`) has two jobs. `qa` runs Prettier, `astro check`, `npm run validate:patterns`, Chromium install, `npm test` and `npm run qa`, uploads the `qa-report` artifact, and, only if everything passed, the `site-dist` artifact (`dist/`). `deploy` has `needs: qa`, downloads `site-dist` and runs `npx wrangler pages deploy dist --project-name <site.config.json> --branch <head_ref || ref_name>`: `main` is the Pages production branch, every other branch gets a preview at `https://<branch-alias>.<project>.pages.dev`. On PRs it posts one sticky comment (hidden marker `<!-- landing-factory-preview -->`) with the URLs. The project is created idempotently if missing. URLs are read from wrangler's `WRANGLER_OUTPUT_FILE_PATH` ND-JSON via `scripts/parse-wrangler-output.mjs`.

Sites: the `sites` job runs `scripts/changed-sites.mjs` (full history, `fetch-depth: 0`) to list the sites whose `sites/<slug>/` changed, or all of them when a shared path changed (`package.json`, `package-lock.json`, `qa.config.json`, `src/components/motion/`, `src/layouts/`, `src/styles/`, `scripts/qa.mjs`, `scripts/qa/`, `scripts/lib/`, `scripts/parse-wrangler-output.mjs`, `.github/workflows/`); manual runs build all. The `site-qa-deploy` matrix job (one per site, skipped when the list is empty) runs `astro check`, `npm run qa -- --site <slug>`, uploads the `qa-report-<slug>` artifact and, only if everything passed, deploys `sites/<slug>/dist` to the Pages project in `sites/<slug>/site.config.json` with the same secrets gate, project creation and URL capture as `deploy`. On PRs each site gets its own sticky comment (marker `<!-- landing-factory-preview:<slug> -->`). The root `qa` job also runs `npm run check:sites`.

Deploy gating: the first `deploy` step checks that the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set (never echoing them) and that the PR is not from a fork (the site jobs apply the same gate after their QA passes). If not, it emits a `::warning::` naming what is missing and skips the remaining deploy steps (job stays green). Never print, log or commit credentials; never deploy from a local machine. Docs for setup: README, "Deployment".

## Agent tooling setup

Run `npm run setup:agent` once per machine (or cloud session). It is idempotent: it reads the pins in `agent-tooling.lock.json`, restores any missing design skill under `.claude/skills/`, and turns impeccable telemetry off. `npm run setup:verify` is the fast, offline check; a SessionStart hook in `.claude/settings.json` runs it at every session start and names whatever is missing. `.claude/settings.json` also sets `OPENSPEC_TELEMETRY=0` and allows only safe pipeline commands (npm scripts, `npx astro`, `npx impeccable`, `npx playwright`, `openspec`, read-only git). Telemetry stays off: never run `npx impeccable telemetry on`.

To bump a tool, edit its pin in `agent-tooling.lock.json`, run `FORCE=1 npm run setup:agent`, review the diff and commit. Vendored skill files under `.claude/skills/{ui-ux-pro-max,design-taste-frontend,impeccable}/` are third-party content: never edit them by hand. Their license texts live in `third-party-licenses/` and must be kept.

## MCP servers

Declared in `.mcp.json` (approve them the first time Claude Code asks).

- `astro-docs` (remote, `https://mcp.docs.astro.build/mcp`): look up current Astro APIs, config and integrations before writing Astro code. Prefer it over memory, since Astro moves fast.
- `playwright` (`@playwright/mcp`, pinned, `--headless`): open the running dev server or `dist/` preview, take screenshots at 375/768/1440 px, check overflow, console errors and interactions. Use it for visual checks while building; the repeatable QA run lives in `npm run qa` (see QA loop).

`.mcp.json` is portable and does not hard-code a browser path. In a cloud session, where Chromium is preinstalled outside Playwright's default cache, register a local override instead of editing the file, for example:

```bash
claude mcp add --scope local playwright -- npx -y @playwright/mcp@0.0.83 --headless \
  --executable-path /opt/pw-browsers/chromium-1194/chrome-linux/chrome
```

(find the real path with `ls /opt/pw-browsers/chromium-*/chrome-linux/chrome`; add `--no-sandbox` only when running as root in a container). Locally, `npx playwright install chromium` is enough.

## Design skills

Three skills are vendored in `.claude/skills/`, each with one role. Do not use a skill outside its role.

| Skill (folder)                        | Single role                                                                                                    | Typical output                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `ui-ux-pro-max`                       | Design tokens per niche: palette, font pairing, spacing, style                                                 | `design-system/<slug>/MASTER.md`, then `src/styles/tokens.css` |
| `design-taste-frontend` (taste-skill) | Art direction and openly licensed images, with credits                                                         | Direction brief, images recorded in `CREDITS.md`               |
| `impeccable`                          | Critique, audit and polish of what exists; `npx impeccable@4.6.0 detect <path-or-url>` for anti-pattern checks | Findings and fixes; zero major findings before shipping        |

To define a niche's palette and fonts use ui-ux-pro-max only, not the other two. If ui-ux-pro-max and taste-skill disagree on visual direction, stop and raise it; a separate change decides which one stays.

Costs and cautions:

- taste-skill is expensive: a build takes 30-45 minutes and hundreds of thousands of tokens. Use it only in the build phase, once per landing, never for small tweaks.
- impeccable's project hooks (run on every edit and at stop) are intentionally not installed; run critique/audit/detect on demand.
- Telemetry is off (`npx impeccable telemetry off`, `OPENSPEC_TELEMETRY=0`). Provenance and licenses (MIT, MIT, Apache-2.0) are recorded in `agent-tooling.lock.json`.

## Workflow: OpenSpec

Work is organized with OpenSpec. One change = one branch `change/<name>` = one PR.

```text
/opsx:propose <name>   -> proposal, specs, design, tasks
/opsx:apply <name>     -> implement tasks.md; check a task only after its verification passed
/opsx:archive <name>   -> after merge, merge the change's specs into openspec/specs/
```

Keep changes small and reviewable. Every task states how it is verified. Validate with `openspec validate <name> --strict`.

## QA loop

`npm run qa` is the single verdict for the quality budgets below. It builds the site, serves `dist/` with `astro preview` on a free port (and always shuts it down), discovers every `dist/**/*.html` page (including noindex ones such as `/islands/`; `404.html` is excluded in `qa.config.json`), and runs:

- full-page screenshots at 375, 768 and 1440 px;
- horizontal overflow and clipped-text detection at each width;
- a `prefers-reduced-motion: reduce` load (at 1440 px): every `[data-reveal]` must be visible, `<html>` must not carry a `lenis` class, and there must be no ScrollTrigger `.pin-spacer`;
- Lighthouse on mobile and desktop (worst of the two per category); performance, accessibility and SEO must be >= 90, best-practices is only reported;
- `npx impeccable@4.6.0 detect --json src/`; findings mapped to major/minor/info in `qa.config.json`, and any major finding fails. If the detector cannot run (for example offline on first use), the check fails with the reason; it never passes silently.

Exit code: `0` all checks passed, `1` at least one check failed, `2` the run itself broke (bad config, build error, no Chromium). Options: `npm run qa -- --help` (`--dist <dir>` to skip the build and serve prebuilt HTML, `--skip lighthouse,impeccable`, `--runs 3` for the median of 3 Lighthouse runs, `--config <file>`). Chromium comes from Playwright; set `QA_CHROME_PATH` (or `CHROME_PATH`) to use another binary, for example `/opt/pw-browsers/chromium-*/chrome-linux/chrome` in a cloud session. Thresholds live in `qa.config.json`; with no file the roadmap defaults apply. Never lower a threshold to get a pass.

Output goes to `qa/<ISO-timestamp>/` (colons replaced by `-`) with `report.json`, `report.md` and `screens/<page>-<width>.png`; `qa/latest` is a symlink to the newest run. `qa/` is not committed.

### Reading `report.json`

- `verdict`: `"passed"` or `"failed"`. `skipped` lists checks that were not run.
- `failures[]`: one entry per problem. Fields: `check` (`overflow`, `clipped-text`, `reduced-motion`, `lighthouse`, `impeccable`, `page-load`), `page` (URL path, `null` for impeccable), `viewport` (width in px, or `mobile`/`desktop` for Lighthouse), `metric`, `measured`, `threshold`, `message`, plus `selector` (CSS selector of the offending element), `file` and `line` (impeccable) or `topAudits` (Lighthouse: the highest-impact failing audits).
- `pages[]`: per page, `viewports["375"|"768"|"1440"]` (`documentScrollWidth`, `overflowing[]`, `clipped[]`, `screenshot`), `reducedMotion`, and `lighthouse` (`presets[]` with scores and `topAudits`, `worst` per category).
- `impeccable`: all findings with `rule`, `severity` (raw), `level` (mapped), `file`, `line`, `snippet`.

### QA -> fix -> QA

1. `npm run qa`, then read `qa/latest/report.json` (`failures` first, `report.md` for a summary) and look at the failing `screens/*.png`.
2. Fix the cause in `src/` (use the `selector`, `file` and `line` fields), never the threshold.
3. Re-run `npm run qa` until the verdict is `passed`. Use `--skip lighthouse,impeccable` for fast layout-only iterations, but the final run must be the full one.

Clipped text that is intentional (for example a truncated card title with `text-overflow: ellipsis`) can be exempted by putting `data-qa-allow-clip` on the element or any ancestor. Use it sparingly and only for deliberate clipping, never to hide a real overflow bug. Pages that are `noindex` skip only Lighthouse's `is-crawlable` audit (`lighthouse.skipCrawlableOnNoindex`); every other SEO audit still counts.

Tests for the QA script itself live in `tests/` (`npm test`). Failing-case fixtures (overflow at 375 px, invisible `[data-reveal]`, clipped text) are tiny static pages in `tests/fixtures/qa/`, served with `--dist`; they are never part of the site build.

## Quality budgets

A landing is done only when all of these hold:

- Lighthouse >= 90 in performance, accessibility and SEO
- No horizontal overflow at 375, 768 and 1440 px
- `prefers-reduced-motion` respected: no smooth scroll, pin or parallax; reveal content is visible
- Content is visible and usable without JavaScript
- Original copy and assets; no major findings in impeccable detect

Motion rules: pages are static HTML by default; load GSAP/Lenis only through `<Motion />`; hydrate React only with an explicit `client:*` directive.

## Extract patterns, don't clone

References are for learning patterns, never for copying. From a reference site, keep only an abstract pattern sheet in `patterns/` (structure, rhythm, interaction, motion behavior in your own words).

NEVER extract, download, store, reuse or publish from a reference site:

- images or photographs
- videos
- 3D models
- logos or brand marks
- copy (headlines, body text, microcopy)
- illustrations or icons it created
- literal code (markup, CSS, JS, shaders), even if minified or lightly edited

Landings use original copy and original or properly licensed assets.

### Analyzing a reference: `/analyze-reference`

Use the `analyze-reference` skill (`.claude/skills/analyze-reference/SKILL.md`) for every reference; do not browse and take notes by hand.

```text
/analyze-reference <url> [--focus "what we like"]    # optionally 1-2 internal links of the same site
```

Pipeline: `check-robots.mjs` (robots.txt for `*`, ClaudeBot, anthropic-ai, GPTBot, `X-Robots-Tag`, meta robots, TDM reservation; any disallow, reservation or unverifiable check aborts with no sheet) -> `recon.mjs` (Playwright; writes `.cache/analyze/<slug>/recon.json` and screenshots at 375/768/1440) -> you read the JSON and look at the screenshots -> write `patterns/<slug>.md` from `patterns/_template.md` in abstract terms -> `npm run validate:patterns` -> `recon.mjs --cleanup <slug>`, which always runs, even after an abort or error.

Where things go: sheets in `patterns/<slug>.md` (versioned, reviewed in the PR; `patterns/_example-starter-demo.md` is a model); temporary working files only in `.cache/analyze/` (git-ignored, deleted at the end). Never write colors as codes, name brand fonts, quote copy beyond 12 words, link media files or paste code in a sheet; the validator enforces this and a human reviews it. Never try to bypass a login, bot challenge or block. Pages that scroll an inner container (document one viewport tall) are handled by `recon.mjs`: it detects the scroller and records `scroller.kind` (`document` or `container`) in `recon.json`. Behind `HTTPS_PROXY`/`HTTP_PROXY` (cloud sessions) `check-robots.mjs` and `recon.mjs` route through the proxy on their own; never set `NODE_USE_ENV_PROXY` by hand. Optional REA (`npx rea-agents analyze-javascript-application`) only to explain an effect recon cannot identify, and only its written conclusion goes in the sheet. Guidance, not legal advice. The recon approach is adapted from JCodesMore/ai-website-cloner-template (MIT).

## Licensing and credits

Every external image, font, icon or component must have a compatible license (for example CC0, MIT, or an open collection that allows commercial use). Record each one in a `CREDITS.md` at the root of the site's repo: source URL, author, license. No asset without a recorded license.

## Scope discipline

Do not add a shared component package across sites (sites copy the starter), per-site custom domains, CMS, i18n, client/commercial licensing features or backend forms: they are out of scope. Do not commit generated output (`dist/`, `.astro/`, `qa/`).
