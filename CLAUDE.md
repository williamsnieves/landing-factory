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
- Three.js (`three`, vanilla, no R3F) only where a landing needs 3D: opt-in `<Scene3D />` scenes built from code, poster first, lazy-loaded (see "3D scenes")
- TypeScript strict, `astro check`, Prettier (with `prettier-plugin-astro`)
- Deployment: Cloudflare Pages via GitHub Actions (`wrangler pages deploy`), per-branch previews, production from `main`

## Commands

| Command                                                           | Purpose                                                                                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                          | Install exact dependencies                                                                                                |
| `npm run dev`                                                     | Dev server with hot reload                                                                                                |
| `npm run build`                                                   | Static build into `dist/`                                                                                                 |
| `npm run preview`                                                 | Serve the built `dist/`                                                                                                   |
| `npm run check`                                                   | `astro check` for the root starter (`sites/` is excluded in `tsconfig.json`)                                              |
| `npm run check:sites`                                             | `astro check` in every site workspace                                                                                     |
| `npm run new-site -- <slug>`                                      | Scaffold `sites/<slug>/` from the starter (see "Sites")                                                                   |
| `npm run brief -- <init\|validate\|missing\|summary\|import> ...` | Customer brief `sites/<slug>/brief.json` (see "Customer brief")                                                           |
| `npm run new-landing -- <slug> --niche "..."`                     | Generate a whole landing with `claude -p` (see "Generating a landing")                                                    |
| `npm run preflight`                                               | Check npm and Commons reachability, Chromium and a free slug                                                              |
| `npm run find-images -- ...`                                      | Search and download licensed Commons (and, with `--source met`, Met public-domain) images into `sites/<slug>/assets.json` |
| `npm run ai-images -- <generate\|import\|count> <slug> ...`       | Generate AI images (OpenAI) or record ones the owner made, with provenance in `assets.json` (see "AI images")             |
| `node scripts/render-poster.mjs --page ... --scene ... --out ...` | Render a 3D scene's poster image from the scene itself (see "3D scenes")                                                  |
| `npm run legal -- --site <slug> [--write\|--check]`               | Write `src/data/legal.json` for the legal pages from the brief (see "Legal compliance")                                   |
| `npm run credits -- --site <slug>`                                | Write the photo credits (`CREDITS.md`, `src/data/credits.json`) from `assets.json`                                        |
| `npm run check-landing -- --site <slug>`                          | Final check: credits, photo reuse, tokens, diversity, copy originality                                                    |
| `npm run report -- [--site <slug>] [--url <url>]`                 | Security (OWASP Top 10:2025), performance and legal report; writes `qa/[<slug>/]report/<ts>/` (see "Landing report")      |
| `npm run format`                                                  | Format with Prettier (`format:check` to verify)                                                                           |
| `npm run setup:agent`                                             | Install/verify agent tooling (design skills, telemetry opt-out)                                                           |
| `npm run setup:verify`                                            | Fast, offline, read-only check of the agent tooling                                                                       |
| `npm test`                                                        | Unit and fixture tests (QA script, analyze-reference scripts, validator)                                                  |
| `npm run validate:archetypes`                                     | Validate `design-archetypes/*.md` sheets (front matter, closed vocabularies, signature ranges, sections); runs in CI      |
| `node scripts/pick-archetypes.mjs --site <slug> [--refs a,b]`     | Rank archetype blends from the brief signals and reference sheets (see "Design archetypes")                               |
| `node scripts/layout-signature.mjs --site <slug> --write`         | Measure the built page's layout signature into `sites/<slug>/layout-signature.json`                                       |
| `npm run validate:patterns`                                       | Validate `patterns/*.md` sheets (structure, no site content); runs in CI                                                  |
| `npm run qa`                                                      | Build, serve and verify every page; writes `qa/latest/`; exit 0 = pass                                                    |
| `npm run qa -- --site <slug>`                                     | Same checks for one site; writes `qa/<slug>/latest/`                                                                      |
| `npx wrangler ...`                                                | Pinned Cloudflare CLI; CI uses it to deploy `dist/` (do not deploy locally)                                               |

## Folder structure

```text
src/components/sections/   page sections (.astro first, React islands only if interactive)
src/components/motion/     motion layer: initMotion(), <Motion />, README with primitives
src/components/legal/      legal notice and privacy policy components and their texts (`en`, `es`), rendered from `src/data/legal.json`
src/components/three/      3D layer: <Scene3D />, runtime, scene helpers and types, README with the scene contract
src/scenes/                scene modules (<name>.ts) loaded lazily by <Scene3D scene="name">; demo.ts is the starter's demo
src/layouts/               BaseLayout (SEO, skip link, <main id="main">)
src/pages/                 routes
src/styles/                global.css and tokens.css (single source of the theme)
sites/<slug>/              one self-contained Astro site per landing (npm workspace `site-<slug>`)
patterns/                  abstract pattern sheets from references (no assets, copy or code)
design-archetypes/         composition archetype sheets and their vocabularies (a starting grammar for each landing)
design-system/             per-niche design decisions, translated into tokens.css
scripts/                   pipeline automation (qa.mjs, ai-images.mjs, landing-report.mjs, report/, new-site.mjs, new-landing.sh, preflight.mjs, find-images.mjs, render-poster.mjs, credits.mjs, legal.mjs, check-landing.mjs, changed-sites.mjs, validate-pattern.mjs, validate-archetypes.mjs, pick-archetypes.mjs, layout-signature.mjs, lib/, parse-wrangler-output.mjs, setup-agent.sh)
public/_headers            Cloudflare Pages cache and security headers (lands in dist/_headers)
site.config.json           per-site Cloudflare settings: Pages project name and production branch
.github/workflows/ci.yml   CI: qa job, then deploy job (needs: qa)
openspec/                  specs, changes, archive
docs/                      roadmap and project docs
```

## Sites

Each landing is a complete static Astro site in `sites/<slug>/` (slug rule `^[a-z0-9]+(-[a-z0-9]+)*$`), registered as the npm workspace `site-<slug>` through `"workspaces": ["sites/*"]` in the root `package.json`. One `npm ci` at the root installs everything; one root `package-lock.json`. Details and conventions: `sites/README.md`.

- Create: `npm run new-site -- <slug> [--title ... --lang ... --message ...]` copies `astro.config.mjs`, `tsconfig.json`, `src/layouts/`, `src/components/motion/`, `src/components/three/`, `src/components/legal/`, `src/styles/`, `src/env.d.ts`, `public/_headers` and `public/favicon.svg` from the root, and writes `package.json` (same dependency ranges as the root), `site.config.json` (`pagesProject: <slug>`), `CREDITS.md`, `README.md`, the planning templates `PROPOSAL.md` and `RUN.md`, an empty `assets.json` (image manifest), an empty `src/scenes/` and a `noindex` placeholder `src/pages/index.astro`. `three` and `@types/three` join the shared dependencies. It never copies the starter's pages or sections, and refuses invalid slugs and existing folders (`--allow-existing-docs` accepts a folder holding only top-level `*.md` planning docs such as `PROPOSAL.md`, `brief.json` and, next to a brief, its `assets/` folder, and never overwrites them). Then run `npm install` once and commit the updated `package-lock.json`.
- Build and check one site: `npm run build -w site-<slug>`, `npm run check -w site-<slug>` (`npm run check:sites` for all).
- QA one site: `npm run qa -- --site <slug>` builds and serves `sites/<slug>`, checks its pages, runs impeccable on `sites/<slug>/src` and writes `qa/<slug>/<timestamp>/` (`qa/<slug>/latest`). A `sites/<slug>/qa.config.json` overrides the root `qa.config.json` for that site; never lower a threshold to get a pass.
- Sites copy the starter at creation and may diverge; nothing is shared at runtime. The root `src/styles/global.css` excludes `sites/` and `scripts/` from Tailwind's class scan so a site never changes the starter's CSS.
- Each site has its own Cloudflare Pages project (`sites/<slug>/site.config.json`) and its own `CREDITS.md`. Do not edit another site's folder from a site change.

## Generating a landing

`scripts/new-landing.sh <slug> (--niche "..." | --brief <file>) [--refs a,b] [--auto] [--dry-run] [--resume] [--max-attempts N] [--model M]` runs `scripts/preflight.mjs`, `npm run new-site`, `npm install`, then `claude -p "/new-landing ..."` (skill: `.claude/skills/new-landing/SKILL.md`) and writes `sites/<slug>/.run.log`. With a customer brief (`--brief <file>`, or an existing `sites/<slug>/brief.json`) `--niche` is optional, the brief is validated first (exit 1, nothing created) and `--lang` defaults to its `language`; see "Customer brief". Phases: brief, synthesis (`PROPOSAL.md`, with a `Signals:` line and an "Archetype blend" chosen with `pick-archetypes`), checkpoint (stops unless `--auto`), design system (`design-system/<slug>/MASTER.md` with a `landing-meta` block, ui-ux-pro-max only), build (design-taste-frontend for art direction, palette and type fixed), QA loop (`npm run qa -- --site <slug>` until it passes or attempts run out), impeccable polish once, final check (writes `layout-signature.json` first), `RUN.md`. Outcome is the `Result:` line of `sites/<slug>/RUN.md`; the script exits non-zero on `failed`.

- Legal pages: when `legal.markets` in the brief is non-empty, the build runs `node scripts/legal.mjs --site <slug> --write`, adds the legal notice and privacy policy pages the market requires (components from `src/components/legal/`) and links them from every page footer; with no market it adds none and Decisions says "legal requirements unknown". See "Legal compliance".
- Images: only `node scripts/find-images.mjs` (Commons API through the proxy, throttled, CC0 / public domain / CC BY / CC BY-SA; with `--source commons,met` also The Met Open Access, public-domain objects, recorded with `source: "met"` and the museum's `creditLine`, `credit: true`; `new-landing.sh --sources commons,met` for historical or cultural niches). Each file is recorded in `sites/<slug>/assets.json`; `node scripts/credits.mjs --site <slug>` regenerates the photo table of `CREDITS.md` (between `<!-- credits:start -->` and `<!-- credits:end -->`) and `src/data/credits.json` for the footer. Do not hand-edit those. The vendored taste-skill `assets.mjs` ignores the proxy and is not used.
- AI images: the fifth source, only for illustrative art and only when the customer allows it or there is no brief; `node scripts/ai-images.mjs` (see "AI images"). The skill's source order is the customer's files, then Commons and The Met for real-world subjects, then AI.
- Final check: `node scripts/check-landing.mjs --site <slug> [--refs urls]` fails on an uncredited image, stale credits, a source photo referenced from more than two places, a MASTER.md palette color or font missing from `tokens.css`, a standard text token pair (ink/paper, primary-contrast/primary, ...) below 4.5:1, a site that matches another on primary color, display font and hero type, a layout too close to another site's (`layout-diversity`, thresholds under `diversity` in `qa.config.json`; needs `sites/<slug>/layout-signature.json`, written by `node scripts/layout-signature.mjs --site <slug> --write` after the build; no signature on a site with others to compare fails, and `check-landing` never starts a browser), a `[data-scene]` in the built pages without a poster recorded in `assets.json` (or more than 2 scenes), an AI image without provenance, consent or a visible disclosure (`ai-provenance`, see "AI images"), or (with `--refs`) 8 words in a row copied from a reference read in memory. A warning (never a failure) is printed when the signature is outside the primary archetype's ranges. Exit 0 passed, 1 failed, 2 the run broke. CI does not run `check-landing`.
- `design-system/<slug>/MASTER.md` (skeleton: `design-system/_template.md`) ends with a fenced `landing-meta` block: `primary: #rrggbb`, `display-font`, optional `body-font`, `hero: full-bleed-photo|split|typographic|video|illustration|collage`, and the blend: `archetype: <primary>[+<secondary>]` or `custom`, `traits: a, b` (`ref:<sheet>/<trait>` allowed). See "Design archetypes".
- Auto mode runs with `--permission-mode acceptEdits`; the commands the skill needs are allowed in `.claude/settings.json`. Generation never commits, pushes or deploys.

## Customer brief

A real customer's requirement lives in `sites/<slug>/brief.json`, one validated file (schema and validator: `scripts/lib/brief-schema.mjs`, tool: `scripts/brief.mjs`, no new dependency). It holds business and offer (products, prices), audience, goal and calls to action with real URLs, tone, page `language`, contact data, the customer's own assets (with owner and permission), brand constraints, references liked and disliked, legal constraints and the deploy target. Unknown keys fail. A value chosen for the customer is listed in `assumed` (`{ "field": "contact.hours", "reason": "..." }`) and an unknown value stays empty: assumed and empty fields are never presented as customer facts.

- `node scripts/brief.mjs init --site <slug> [--niche ...] [--lang <tag>] [--force]` writes a skeleton; `validate (--site <slug> | --file <path>) [--json]`, `missing` (required first, then recommended in interview order), `summary` and `import --file <path> --site <slug>` (copies the brief and its local assets into the site). Exit codes: 0 valid, 1 invalid or required missing, 2 bad usage. Asset paths are relative to `sites/<slug>/` (with `--file`, to the file's folder).
- Legal fields: `legal.markets` (`EU` or ISO 3166-1 alpha-2 codes), `legal.holder` (`name`, `taxId`, `address`, `email`, `register`), `legal.privacyContact` and `legal.processing` (`analytics`: `none|cookieless|cookies`, `forms`, `embeds`). Holder identity (`legal.holder`, `legal.privacyContact`, or `legal` as a whole) can never be listed in `assumed`: validation fails. `brief missing` lists the holder fields, the privacy contact and the analytics answer once a market is named. All are optional, so older briefs stay valid.
- `/brief-intake <slug>` (`.claude/skills/brief-intake/SKILL.md`) is the interactive interview: it asks in the language the user writes in (separate from the page `language`), only for what is missing, validates after each answer and never invents prices, reviews or results. It is not run by `claude -p`.
- `/new-landing` takes brand, offer, audience, tone, calls to action, contact data, references (liked sheets go to `pick-archetypes`, disliked ones are "avoid") and brand constraints from the brief, and lists every assumed or empty field under Decisions. Customer files are recorded in `assets.json` with `source: "customer"`, `owner`, `permission` and `credit` (a public credit only when `credit: true`); `credits.mjs` lists them under "Provided by the customer".
- `check-landing` `brief-facts` (only when `brief.json` exists, reads `dist/index.html`, no browser): fails when a non-assumed business name, primary call-to-action URL, contact email or phone, product name or price is missing from the page, or sits in an element that also says a word of `brief.sampleWords` in `qa.config.json`.

## Landing report

`npm run report -- [--site <slug>] [--url <deployed-url>] [--external-links] [--only static|live] [--skip <groups>] [--qa <report.json>]` (`scripts/landing-report.mjs`, modules in `scripts/report/`) audits one landing for security, framed by the **OWASP Top 10:2025**, for performance and, in the `legal` area, for cookies, trackers, legal pages and price claims (see "Legal compliance"). It writes `report.json` and `report.md` to `qa/<slug>/report/<timestamp>/` (`qa/report/<timestamp>/` for the starter) and a `latest` link. Exit codes: 0 no item failed, 1 at least one item failed, 2 the run broke (bad usage or config, build error). Options: `npm run report -- --help`.

- Every item has an area (security, performance or legal), an OWASP category, a status (`pass`, `warn`, `fail`, `na`, `not-run`), the evidence (file, line, URL, measured value) and a fix. The verdict is `failed` only when an item fails; warnings, not-applicable categories and `not-run` items are always listed. A check that needs the network (npm audit, live checks, outbound links) and cannot reach it is `not-run`, never `pass`. The Markdown starts with the verdict and the counts; A06, A07 and A09 are reported as not applicable with the reason unless something applies.
- Static checks (no `--url`; build is made if `dist/` is missing): security headers in `dist/_headers` (nosniff, Referrer-Policy and `frame-ancestors` fail; HSTS, COOP, Permissions-Policy and a script CSP warn), the effective CSP per page (header plus `<meta http-equiv>`), private files in `dist/` (`.env`, `.git`, keys, `brief.json` fail; source maps and manifests warn), mixed content (fail) and `http://` links (warn), `javascript:` URLs, external scripts without SRI (fail) and stylesheets (warn), third-party origins, broken internal links and assets (fail), `target="_blank"` without `noopener`, the 404 page, forms and password fields, inline scripts against the CSP hashes, raw HTML sinks in `src/` (`set:html`, `innerHTML`, ...), secrets in the site folder and its build, `npm audit --omit=dev` for the workspace (high or critical fail unless listed with a reason in `report.audit.ignore`), and the lockfile.
- Secrets: provider patterns (private keys, AWS, GitHub, Slack, Stripe live, Google, OpenAI/Anthropic, npm) fail; the generic `token|password|api_key = '...'` pattern only warns; `.env` files (except `.example`, `.sample`, `.template`) in a site folder fail. Every match goes through `mask()` (`scripts/report/mask.mjs`: four characters and the length); never print or store a raw match, and never put a real-looking token in a fixture: tests build fake secrets at runtime.
- Legal area (`--skip legal` removes it): four items with stable ids, `legal-cookies`, `legal-third-party`, `legal-pages` and `legal-price-claims`, read from `dist/` and, behind the same freshness guard as the Lighthouse detail, from QA's `pages[].privacy` record. The Markdown ends the Legal section with the not-legal-advice line. Details and rules: "Legal compliance".
- Live checks (`--url https://...`, `--only live` for just these): valid TLS, HTTP redirects to HTTPS (a closed port or an unreachable plain HTTP is a warn or `not-run`, 200 fails), response headers and HSTS, long `immutable` caching of an `/_astro/` asset, private paths (`/.git/HEAD`, `/.env`, `/brief.json`, `/package.json`, `/assets.json`) judged by their body so a host that answers the home page for every path passes, and an unknown path that must answer 404. `--allow-http` (local servers) turns the TLS checks into n/a. `--external-links` requests each outbound link once (at most 50, sequential, 250 ms apart): 401, 403, 429, challenge headers and cancelled connections are listed as unverified, 404/410/5xx/DNS errors warn, and nothing is retried to get around a block (Etsy answers a bot challenge: it stays unverified).
- Performance: the report reads the Lighthouse detail QA stores in `qa/[<slug>/]latest/report.json` (`presets[].detail`: LCP element and time, CLS, TBT, weight, requests, image and font findings, render-blocking, third parties) and uses it only when that QA run finished after `dist/index.html` was built; otherwise those items are `not-run` ("run QA first"). A Lighthouse score under the QA threshold fails; the other measures (LCP, CLS, TBT, page weight, images over `maxImageKb`, JPEG or PNG over `legacyImageKb`, font faces, third-party origins) warn against `report` in `qa.config.json` (defaults in `scripts/report/config.mjs`; never raise a limit to hide a real problem).
- The starter ships a Content-Security-Policy from Astro's `security.csp` (hashes for the scripts Astro emits, `'unsafe-inline'` only in `style-src-attr`), HSTS and COOP in `public/_headers`, and `new-site` copies them. A policy in a `<meta>` tag only applies to what follows it, so an authored inline script before the tag (Motion's `is:inline`) is listed as outside the policy, not as an injection point. Never use `'unsafe-inline'` in `script-src`; if a script is blocked, add its origin to `scriptDirective.resources`. `tests/csp.test.mjs` loads the built starter in Chromium and fails on any `securitypolicyviolation`. Existing sites keep their copies and the report warns until each one opts in (HSTS, COOP, CSP) in its own site change.
- CI runs `npm run report -- --only static` after QA (root `qa` job and each site job; a failing report blocks the deploy) and `--only live --url <deployed URL>` after the deploy, uploads `landing-report` / `landing-report-live` / `landing-report-<slug>` and adds a `Report:` line to the sticky comment. See "CI and deployment".

## CI and deployment

`.github/workflows/ci.yml` (triggers: `pull_request`, push to `main`, `workflow_dispatch`) has two jobs. `qa` runs Prettier, `astro check`, `npm run validate:patterns`, `npm run validate:archetypes`, Chromium install, `npm test`, `npm run qa` and `npm run report -- --only static`, uploads the `qa-report` and `landing-report` artifacts, and, only if everything passed, the `site-dist` artifact (`dist/`). `deploy` has `needs: qa`, downloads `site-dist` and runs `npx wrangler pages deploy dist --project-name <site.config.json> --branch <head_ref || ref_name>`: `main` is the Pages production branch, every other branch gets a preview at `https://<branch-alias>.<project>.pages.dev`. After the URL capture `deploy` runs `npm run report -- --only live --url <deployment URL>` (`continue-on-error`, so the comment and the `landing-report-live` artifact are written first, then a last step fails the job if the live report failed). On PRs it posts one sticky comment (hidden marker `<!-- landing-factory-preview -->`) with the URLs and a `Report:` line (static and live verdicts and counts). The project is created idempotently if missing. URLs are read from wrangler's `WRANGLER_OUTPUT_FILE_PATH` ND-JSON via `scripts/parse-wrangler-output.mjs`.

Sites: the `sites` job runs `scripts/changed-sites.mjs` (full history, `fetch-depth: 0`) to list the sites whose `sites/<slug>/` changed, or all of them when a shared path changed (`package.json`, `package-lock.json`, `qa.config.json`, `src/components/motion/`, `src/layouts/`, `src/styles/`, `scripts/qa.mjs`, `scripts/qa/`, `scripts/landing-report.mjs`, `scripts/report/`, `scripts/lib/`, `scripts/parse-wrangler-output.mjs`, `.github/workflows/`); manual runs build all. The `site-qa-deploy` matrix job (one per site, skipped when the list is empty) runs `astro check`, `npm run qa -- --site <slug> --runs 3` (median of 3 Lighthouse runs, since one slow runner pass scored a site 67 that measures 97 to 99 locally), runs `npm run report -- --site <slug> --only static` right after QA, uploads the `qa-report-<slug>` artifact and, only if everything passed, deploys `sites/<slug>/dist` to the Pages project in `sites/<slug>/site.config.json` with the same secrets gate, project creation and URL capture as `deploy`, then runs the live report on the deployment URL and uploads `landing-report-<slug>` (both runs). On PRs each site gets its own sticky comment (marker `<!-- landing-factory-preview:<slug> -->`) with its `Report:` line. The root `qa` job also runs `npm run check:sites`.

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
- on pages with a 3D scene (`[data-scene]`): a reduced-motion load and a JavaScript-disabled load must show the poster and create no canvas, a normal load at 1440 px scrolled to each scene must create the canvas without console errors or page errors mentioning WebGL, THREE or the scene (scrubbed scenes must also move `data-scene-progress`), and the gzip size of the JS chunks containing Three.js must stay within `threeD.maxGzipKb` (default 200);
- `npx impeccable@4.6.0 detect --json src/`; findings mapped to major/minor/info in `qa.config.json`, and any major finding fails. If the detector cannot run (for example offline on first use), the check fails with the reason; it never passes silently.

Exit code: `0` all checks passed, `1` at least one check failed, `2` the run itself broke (bad config, build error, no Chromium). Options: `npm run qa -- --help` (`--dist <dir>` to skip the build and serve prebuilt HTML, `--skip lighthouse,impeccable`, `--runs 3` for the median of 3 Lighthouse runs, `--config <file>`). Chromium comes from Playwright; set `QA_CHROME_PATH` (or `CHROME_PATH`) to use another binary, for example `/opt/pw-browsers/chromium-*/chrome-linux/chrome` in a cloud session. Thresholds live in `qa.config.json`; with no file the roadmap defaults apply. Never lower a threshold to get a pass.

Output goes to `qa/<ISO-timestamp>/` (colons replaced by `-`) with `report.json`, `report.md` and `screens/<page>-<width>.png`; `qa/latest` is a symlink to the newest run. `qa/` is not committed.

### Reading `report.json`

- `verdict`: `"passed"` or `"failed"`. `skipped` lists checks that were not run.
- `failures[]`: one entry per problem. Fields: `check` (`overflow`, `clipped-text`, `reduced-motion`, `scene-reduced-motion`, `scene-no-js`, `scene-runtime`, `scene-budget`, `lighthouse`, `impeccable`, `page-load`), `page` (URL path, `null` for impeccable), `viewport` (width in px, or `mobile`/`desktop` for Lighthouse), `metric`, `measured`, `threshold`, `message`, plus `selector` (CSS selector of the offending element), `file` and `line` (impeccable) or `topAudits` (Lighthouse: the highest-impact failing audits).
- `pages[]`: per page, `viewports["375"|"768"|"1440"]` (`documentScrollWidth`, `overflowing[]`, `clipped[]`, `screenshot`), `reducedMotion`, and `lighthouse` (`presets[]` with scores and `topAudits`, `worst` per category).
- `pages[].scenes` (pages with a scene): `names`, `reducedMotion`, `noJs`, `runtime` (per scene: `canvas` created, `state`, `reason`, scrub `progress` samples) and `budget` (`gzipKb`, `maxGzipKb`, `chunks`). `scene-reduced-motion` has metrics `canvas`, `poster` and `three-downloaded`; `scene-no-js` has `poster`; `scene-runtime` has `canvas`, `error` and `scrub`; `scene-budget` has `gzip-kb`. `--skip scenes` skips them.
- `pages[].privacy` (null when the layout check is skipped): taken on the 1440 px normal load after the scroll through the page: `cookies[]` (`name`, `domain`, `path`, `session`, `thirdParty`; never a value), `storage.local[]` and `storage.session[]` (keys only), `thirdPartyHosts[]` (request hosts other than the page's own). The record never changes the QA verdict; the landing report reads it.
- `impeccable`: all findings with `rule`, `severity` (raw), `level` (mapped), `file`, `line`, `snippet`.

### QA -> fix -> QA

1. `npm run qa`, then read `qa/latest/report.json` (`failures` first, `report.md` for a summary) and look at the failing `screens/*.png`.
2. Fix the cause in `src/` (use the `selector`, `file` and `line` fields), never the threshold.
3. Re-run `npm run qa` until the verdict is `passed`. Use `--skip lighthouse,impeccable` for fast layout-only iterations, but the final run must be the full one.

Clipped text that is intentional (for example a truncated card title with `text-overflow: ellipsis`) can be exempted by putting `data-qa-allow-clip` on the element or any ancestor. Use it sparingly and only for deliberate clipping, never to hide a real overflow bug. Pages that are `noindex` skip only Lighthouse's `is-crawlable` audit (`lighthouse.skipCrawlableOnNoindex`); every other SEO audit still counts.

Tests for the QA script itself live in `tests/` (`npm test`). Failing-case fixtures (overflow at 375 px, invisible `[data-reveal]`, clipped text) are tiny static pages in `tests/fixtures/qa/`, served with `--dist`; they are never part of the site build.

## 3D scenes

A landing may use up to two Three.js scenes (`<Scene3D />`, `src/components/three/README.md` has the props and the scene module contract). They are opt-in, built from code (no model files, no R3F), and poster first: the poster is real HTML (the LCP candidate and the fallback), and only when JavaScript runs, WebGL exists, reduced motion is not requested and the figure is within one viewport does the runtime lazy-load Three.js and the scene module after `load` and fade a canvas in. `scrub` links a scene to the scroll progress (0..1) of its section through the motion layer's ScrollTrigger setup. The render loop pauses off-screen and in hidden tabs, DPR is capped (2, or 1.5 under 768 px) and everything is disposed on `astro:before-swap`. Scenes import from `three` by name and read colors from the tokens (`@theme static` keeps every `--color-*` in the CSS). Budgets: 3D JavaScript <= 200 KB gzip per page (`threeD.maxGzipKb`), Lighthouse unchanged. Every scene needs a poster recorded in `assets.json`: render it with `node scripts/render-poster.mjs` (`source: "self"`) or use a credited museum or Commons image. The starter's demo is `/3d/` (noindex, `src/scenes/demo.ts`); `new-site` does not copy it. Historical or cultural pages must not invent quotes or facts: check claims against the museum records of the images used and label myths as such.

## Legal compliance

The factory makes legal requirements visible before a landing is published and generates the legal pages a market requires from the customer's own data. **It supports compliance and is not legal advice**: the report, the templates and the docs say so, nothing claims certification, and a lawyer must review the result before it goes live in production.

- **Cookies and trackers (`legal-cookies`).** A known tracker (analytics, ad pixel, session recorder, a video or map embed that sets cookies) loaded unconditionally, or a non-essential cookie or storage key set at first load, fails: consent must come before the cookie (ePrivacy). A tracker that is inert until consent (`<script type="text/plain" data-consent="analytics" src="...">`, or an embed placeholder with `data-consent-src`) passes with a warning to verify the consent mechanism; the report does not judge banners. A page with no cookies, no storage keys and no tracker passes and needs no banner, which is why cookieless analytics (Plausible, Cloudflare Web Analytics) and `youtube-nocookie.com` are preferred. An unclassified cookie or key warns ("classify this cookie") and is never silently passed. The runtime part reads QA's privacy record behind the freshness guard; with no fresh record it is `not-run`.
- **Third-party hosts (`legal-third-party`).** Fonts, styles, scripts or images from a third-party host warn: that host receives the visitor's IP address. Self-host the asset or name the host in the privacy policy.
- **Legal pages (`legal-pages`).** With a brief that names a market with a rule set, the report fails when a page the market requires is missing, a page has no link to it, the page lacks holder data the rule requires, or a `data-legal-pending` marker is still visible. Rule sets: the EU and its member states (privacy policy; holder name and an email or privacy contact) and Spain (LSSI-CE: privacy policy and legal notice; holder name, tax id, address, email; a register entry only warns, since the schema cannot tell a company from a person). No brief, no market or a market without a rule set warns "requirements unknown", never passes. Pages are found by path (`/legal-notice/`, `/aviso-legal/`, `/privacy/`, `/privacidad/`) or by `data-legal-page="notice|privacy"`; `404.html` does not need the footer links.
- **Price claims (`legal-price-claims`).** Discount percentages, struck-through prices and was/now pairs (English and Spanish) warn with the page and the text; for an EU market the fix names the 30-day lowest-price rule. Never a fail: a person judges the claim.
- **Rules and tuning.** Hosts, cookie-name patterns and rule sets live in `scripts/report/legal-rules.mjs`; the `legal` section of `qa.config.json` has `essentialCookies` (default `__cf_bm`, `cf_clearance`), `essentialStorageKeys` and `trackers` (`{ host, category, path? }`, categories `analytics`, `advertising`, `embed`, `cdn`, `cookieless`). Never add a tracker to the allow list to get a pass.
- **Legal pages from the brief.** `node scripts/legal.mjs --site <slug> [--write|--check]` writes `sites/<slug>/src/data/legal.json` (markets, required pages, holder, privacy contact, processing, hosting, third-party hosts of the build, language, `pending`) from `brief.json`; `--check` exits 1 when it is stale, and no market writes nothing. `src/components/legal/{LegalNotice,PrivacyPolicy}.astro` (copied by `new-site`, texts in `texts.ts`, `en` and `es`) render it inside a page of the site; a missing required value renders `<mark data-legal-pending="holder.taxId">` ("pending legal review") and the report fails on it. Holder identity is never assumed or invented. Every legal component source starts with a comment saying the templates are not legal advice.
- **Existing sites** are not edited by this feature: they warn (no market, no brief). tupathdigital gets its legal pages in its own site change once the owner gives the holder data and markets, and its "50% off" claims need review against the 30-day rule.
- **Out of scope for now:** a consent banner component (it arrives with the first change that adds analytics or embeds; until then such a page fails the report), terms of sale, markets other than the EU and Spain, accessibility statements. Guide: `docs/legal.md`.

## AI images

AI-generated images are a fifth, recorded image source (owner decision, 2026-10-24; provider: OpenAI GPT image models). They are for illustration (abstract art, textures, generic objects and scenes) and never pose as real photos of the business, its people or its products.

- **Tool.** `node scripts/ai-images.mjs generate <slug> --prompt "..." --as <name> [--size 1536x1024|1024x1024|1024x1536] [--quality low|medium|high] [--model <id>] [--title ...] [--dry-run]` makes one request to the OpenAI Images API (`scripts/lib/openai-images.mjs`, one `fetch`, no SDK), writes the file to `sites/<slug>/src/assets/images/` and appends the entry to `assets.json`: `source: "ai"`, `generator`, `model`, `prompt`, `revisedPrompt`, `size`, `quality`, `createdAt`, `terms`, `requestId`, `usage`, `credit: false`. `import <slug> <file> --generator ... --model ... --prompt ... --created <date> --terms <url>` records an image the owner made with their own tool (`imported: true`; all provenance fields required, exit 2 when one is missing). `count <slug>` prints the count, the cap and the consent. Exit codes: 0 ok, 1 refused or failed, 2 bad usage. Run `node scripts/credits.mjs --site <slug>` afterwards.
- **Key and environment.** The key is read only from `OPENAI_API_KEY`; it is never passed as an argument and never printed, logged, stored or placed in an error (errors go through `scripts/report/mask.mjs` and an exact replacement). Real generation needs `OPENAI_API_KEY` as an environment secret and `api.openai.com` in the allowed domains; neither exists in every session, and the skill then falls back to archives. `OPENAI_BASE_URL` overrides the endpoint (tests use a local fake server; the real API is never called by tests or CI). CI never generates images: generated files are committed like any other image.
- **Consent.** `brand.aiImages` in the brief is `allowed`, `not-allowed` or empty, asked by `/brief-intake` and never assumed (validation fails if it is listed in `assumed`). With a brief the tool generates or imports only when it is `allowed` (empty counts as not allowed); with no brief (demo niches) it is allowed.
- **Prompt policy** (`scripts/lib/ai-prompt-policy.mjs`, English and Spanish, no override). Refused with the rule and the reason: the business or a product name from the brief (`brand`), team, staff, customers, founder, owner, testimonials or reviews (`people`), logo or brand mark (`identity`), before and after or results (`results`), a portrait or photo of a named or famous person (`real-person`). A false block is fixed by rewording; the filter is best effort and the reviewer's screenshot pass backs it up.
- **Cap.** `qa.config.json` `aiImages` (`provider`, `model` default `gpt-image-1.5`, `size`, `quality`, `maxPerSite` default 12) is validated in `scripts/qa/config.mjs`. A generation at the cap is refused before any request. `--dry-run` prints the request (never the headers) and changes nothing. The default model is confirmed by the first real generation.
- **Credits and disclosure.** `credits.mjs` lists AI images under "AI-generated images" (tool and model, date, terms link) and they add no footer credit line. A page that uses any AI image carries a visible `<p data-ai-disclosure>` ("Some images on this page were generated with AI."; `es`: "Algunas imágenes de esta página se generaron con IA.") in its footer. Check-landing `ai-provenance` (only when the manifest has AI entries) fails on a missing provenance field or file, a brief that does not allow AI images, a prompt that breaks the policy, or no visible disclosure on `dist/index.html`. OpenAI embeds C2PA metadata in its outputs; the file kept in the repo keeps it, the variants Astro serves may not, so the page disclosure is what covers transparency. Not legal advice (`docs/legal.md`).

## Quality budgets

A landing is done only when all of these hold:

- Lighthouse >= 90 in performance, accessibility and SEO
- No horizontal overflow at 375, 768 and 1440 px
- `prefers-reduced-motion` respected: no smooth scroll, pin or parallax; reveal content is visible
- Content is visible and usable without JavaScript (a 3D scene shows its poster)
- Original copy and assets; no major findings in impeccable detect
- The landing report (`npm run report`) has no failing item: headers, private files, secrets, `npm audit`, SRI, mixed content, broken links, and the legal area (tracker or non-essential cookie without consent, a legal page the market requires, a pending-review marker)

Motion rules: pages are static HTML by default; load GSAP/Lenis only through `<Motion />`; load Three.js only through `<Scene3D />`; hydrate React only with an explicit `client:*` directive.

## Design archetypes

`design-archetypes/` holds 10 composition archetype sheets (layout grammar, header and footer, typography, imagery, buttons, motion, lendable traits, do and don't, expected layout-signature ranges) and a README with the closed vocabularies of requirement `signals` and lendable `traits`. They exist because every landing shared one composition; they are a **starting grammar, not a template**.

- The synthesis writes a `Signals:` line in the proposal Brief and runs `node scripts/pick-archetypes.mjs --site <slug>`. It ranks blends (one primary that owns the grammar, at most one secondary lending one or two traits) from the signals and from the reference sheets (`--refs`, else those named in `RUN.md` and `PROPOSAL.md`), excludes blends other sites already use (`archetype:` in their `landing-meta`; a primary used by two other sites is excluded) and may offer `archetype: custom` when the references clearly lead. The chosen blend, a twist from the requirement and the reasons go in the proposal's "Archetype blend" and in `landing-meta`.
- The build may deviate from any archetype rule when the requirement or a reference justifies it; each deviation is written in `RUN.md` "Design decisions". The archetype `signature` comparison is only a warning. The hard rules stay the quality budgets, licensing and originality, and the layout diversity rule.
- `scripts/layout-signature.mjs` measures the built home page (columns per section, full-bleed share, radii, button shape, heading scale and alignment, eyebrow share, density, footer type, rotation and overlap, sticky or pinned elements) and perceptual hashes of the viewport slices; `check-landing` compares it with every other site. No generated site is a model for another: never point a landing's instructions or templates at another site.

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

Every external image, font, icon or component must have a compatible license (for example CC0, MIT, or an open collection that allows commercial use). Record each one in a `CREDITS.md` at the root of the site's repo: source URL, author, license. No asset without a recorded license. An AI-generated image has no author or source page: it is recorded in `assets.json` with its generator, model, prompt, date and a link to the generator's terms, listed under "AI-generated images" in `CREDITS.md`, and disclosed on the page (see "AI images").

## Scope discipline

Do not add a shared component package across sites (sites copy the starter), per-site custom domains, CMS, i18n, client/commercial licensing features, backend forms or a consent banner component (until a change adds analytics or embeds): they are out of scope. Do not commit generated output (`dist/`, `.astro/`, `qa/`).
