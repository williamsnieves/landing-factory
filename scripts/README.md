# scripts

Automation scripts for the pipeline.

- `setup-agent.sh`: installs and verifies the agent tooling (`npm run setup:agent`, `npm run setup:verify`).
- `qa.mjs`: the QA pipeline behind `npm run qa` and `npm run qa -- --site <slug>` (`node scripts/qa.mjs --help`). Its modules live in `qa/`: `config.mjs` (defaults and validation of `qa.config.json`), `server.mjs` (build, `astro preview`, static server, page discovery), `browser-checks.mjs` (code that runs inside the page), `lighthouse.mjs`, `impeccable.mjs` (CLI runner and JSON parser), `report.mjs` (Markdown report) and `site.mjs` (paths for `--site`).
- `validate-pattern.mjs`: validates `patterns/*.md` sheets (`npm run validate:patterns`, `node scripts/validate-pattern.mjs --help`).
- `new-site.mjs`: scaffolds `sites/<slug>/` from the starter (`npm run new-site -- <slug>`, `node scripts/new-site.mjs --help`).
- `changed-sites.mjs`: prints the JSON list of sites CI must build and deploy (`node scripts/changed-sites.mjs --help`); `lib/sites.mjs` holds the shared slug rule and site listing.
