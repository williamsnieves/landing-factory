# scripts

Automation scripts for the pipeline.

- `setup-agent.sh`: installs and verifies the agent tooling (`npm run setup:agent`, `npm run setup:verify`).
- `qa.mjs`: the QA pipeline behind `npm run qa` and `npm run qa -- --site <slug>` (`node scripts/qa.mjs --help`). Its modules live in `qa/`: `config.mjs` (defaults and validation of `qa.config.json`), `server.mjs` (build, `astro preview`, static server, page discovery), `browser-checks.mjs` (code that runs inside the page), `lighthouse.mjs`, `impeccable.mjs` (CLI runner and JSON parser), `report.mjs` (Markdown report) and `site.mjs` (paths for `--site`).
- `validate-pattern.mjs`: validates `patterns/*.md` sheets (`npm run validate:patterns`, `node scripts/validate-pattern.mjs --help`).
- `new-site.mjs`: scaffolds `sites/<slug>/` from the starter (`npm run new-site -- <slug>`, `node scripts/new-site.mjs --help`).
- `changed-sites.mjs`: prints the JSON list of sites CI must build and deploy (`node scripts/changed-sites.mjs --help`); `lib/sites.mjs` holds the shared slug rule and site listing.
- `new-landing.sh`: one command per landing (`npm run new-landing -- <slug> --niche "..."`, `scripts/new-landing.sh --help`): preflight, `new-site`, `npm install`, then `claude -p "/new-landing ..."`; the exit code follows the `Result:` line of `sites/<slug>/RUN.md`. `NEW_LANDING_SKIP=preflight,install,final-check` skips steps (tests).
- `preflight.mjs`: checks registry.npmjs.org, commons.wikimedia.org and upload.wikimedia.org (through `HTTPS_PROXY`), a Chromium for QA and a free slug; names every failure (`--slug`, `--json`, `--chromium-path`).
- `find-images.mjs`: `search "<query>"` and `get <slug> <title>` on Wikimedia Commons; throttled, retries 429/503 with backoff, keeps CC0, public domain, CC BY and CC BY-SA, writes `sites/<slug>/assets.json`.
- `credits.mjs`: `--site <slug> [--check]` writes the photo table of `CREDITS.md` between markers and `src/data/credits.json` from `assets.json`.
- `check-landing.mjs`: `--site <slug> [--refs urls] [--json]` runs the final landing check (credits, photo reuse, tokens, text contrast of the standard token pairs, diversity, copy originality). Photo reuse is a heuristic: it counts references to each imported photo in `src/` (imports bind names; each use of the name or each path string counts), not rendered instances, and does not follow aliases.
- `section-shots.mjs`: `--site <slug> [--widths 375,768,1440] [--out <dir>]` serves `sites/<slug>/dist` and writes one viewport screenshot per `section[id]`, header and footer per width to `qa/<slug>/sections/` (build first). For reviewing pinned sections that full-page captures show as empty space.
