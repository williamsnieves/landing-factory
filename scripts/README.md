# scripts

Automation scripts for the pipeline.

- `setup-agent.sh`: installs and verifies the agent tooling (`npm run setup:agent`, `npm run setup:verify`).
- `qa.mjs`: the QA pipeline behind `npm run qa` (`node scripts/qa.mjs --help`). Its modules live in `qa/`: `config.mjs` (defaults and validation of `qa.config.json`), `server.mjs` (build, `astro preview`, static server, page discovery), `browser-checks.mjs` (code that runs inside the page), `lighthouse.mjs`, `impeccable.mjs` (CLI runner and JSON parser) and `report.mjs` (Markdown report).
- `validate-pattern.mjs`: validates `patterns/*.md` sheets (`npm run validate:patterns`, `node scripts/validate-pattern.mjs --help`).
