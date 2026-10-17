# CLAUDE.md

Rules for any agent or person working in this repo. Keep this file current.

## Project

landing-factory turns a niche into an original, near-Awwwards-quality Astro landing page, ready to deploy. Roadmap: `docs/roadmap.md`.

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

| Command                | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `npm ci`               | Install exact dependencies                                                  |
| `npm run dev`          | Dev server with hot reload                                                  |
| `npm run build`        | Static build into `dist/`                                                   |
| `npm run preview`      | Serve the built `dist/`                                                     |
| `npm run check`        | `astro check` (types and Astro diagnostics)                                 |
| `npm run format`       | Format with Prettier (`format:check` to verify)                             |
| `npm run setup:agent`  | Install/verify agent tooling (design skills, telemetry opt-out)             |
| `npm run setup:verify` | Fast, offline, read-only check of the agent tooling                         |
| `npm test`             | Unit and fixture tests for the QA script (`node --test`)                    |
| `npm run qa`           | Build, serve and verify every page; writes `qa/latest/`; exit 0 = pass      |
| `npx wrangler ...`     | Pinned Cloudflare CLI; CI uses it to deploy `dist/` (do not deploy locally) |

## Folder structure

```text
src/components/sections/   page sections (.astro first, React islands only if interactive)
src/components/motion/     motion layer: initMotion(), <Motion />, README with primitives
src/layouts/               BaseLayout (SEO, skip link, <main id="main">)
src/pages/                 routes
src/styles/                global.css and tokens.css (single source of the theme)
patterns/                  abstract pattern sheets from references (no assets, copy or code)
design-system/             per-niche design decisions, translated into tokens.css
scripts/                   pipeline automation (qa.mjs, parse-wrangler-output.mjs, setup-agent.sh)
public/_headers            Cloudflare Pages cache and security headers (lands in dist/_headers)
site.config.json           per-site Cloudflare settings: Pages project name and production branch
.github/workflows/ci.yml   CI: qa job, then deploy job (needs: qa)
openspec/                  specs, changes, archive
docs/                      roadmap and project docs
```

## CI and deployment

`.github/workflows/ci.yml` (triggers: `pull_request`, push to `main`, `workflow_dispatch`) has two jobs. `qa` runs Prettier, `astro check`, Chromium install, `npm test` and `npm run qa`, uploads the `qa-report` artifact, and, only if everything passed, the `site-dist` artifact (`dist/`). `deploy` has `needs: qa`, downloads `site-dist` and runs `npx wrangler pages deploy dist --project-name <site.config.json> --branch <head_ref || ref_name>`: `main` is the Pages production branch, every other branch gets a preview at `https://<branch-alias>.<project>.pages.dev`. On PRs it posts one sticky comment (hidden marker `<!-- landing-factory-preview -->`) with the URLs. The project is created idempotently if missing. URLs are read from wrangler's `WRANGLER_OUTPUT_FILE_PATH` ND-JSON via `scripts/parse-wrangler-output.mjs`.

Deploy gating: the first `deploy` step checks that the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set (never echoing them) and that the PR is not from a fork. If not, it emits a `::warning::` naming what is missing and skips the remaining deploy steps (job stays green). Never print, log or commit credentials; never deploy from a local machine. Docs for setup: README, "Deployment".

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

## Licensing and credits

Every external image, font, icon or component must have a compatible license (for example CC0, MIT, or an open collection that allows commercial use). Record each one in a `CREDITS.md` at the root of the site's repo: source URL, author, license. No asset without a recorded license.

## Scope discipline

Do not add CMS, i18n, client/commercial licensing features or backend forms: they are out of scope. Do not commit generated output (`dist/`, `.astro/`, `qa/`).
