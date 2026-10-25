# Tasks

## 1. Preparation

- [x] 1.1 Move the proxy helper to `scripts/lib/proxy.mjs` (design Decision 3).
  - `.claude/skills/analyze-reference/scripts/proxy.mjs` becomes a re-export.
  - Point the five factory scripts that import it at the new path.

  Verify:
  - `grep` finds no import of `.claude/` under `scripts/`;
  - `npm test` passes;
  - `node .claude/skills/analyze-reference/scripts/check-robots.mjs --help` and `node scripts/landing-report.mjs --help` still run. (verified: `grep` of `scripts/` finds no import from `.claude/`; `scripts/lib/proxy.mjs` holds the helper and `.claude/skills/analyze-reference/scripts/proxy.mjs` re-exports it (`export * from '../../../../scripts/lib/proxy.mjs'`); the five scripts import `./lib/proxy.mjs`; full `npm test` passed (707 tests before the new tests); `check-robots.mjs --help` and `landing-report.mjs --help` still run; tests/proxy.test.mjs (imports through the skill file) passes))

## 2. Export command

- [x] 2.1 `scripts/export/closure.mjs`: the import walker (design Decision 2).

  Verify, with tests:
  - the closure of the real entry points contains `qa/*`, the `report/*` modules the report imports, `deploy/*`, `lib/sites.mjs`, `lib/brief-schema.mjs` and `lib/proxy.mjs`, and nothing from `.claude/`, `mcp/` or `tests/`;
  - a fixture importing `../outside.mjs` fails, naming the import;
  - a non-literal `import()` fails. (verified: tests/export.test.mjs: the closure of the real entry points holds `qa/*`, `report/*`, `deploy/*`, `lib/sites.mjs`, `lib/brief-schema.mjs`, `lib/proxy.mjs` (42 files) and nothing from `.claude/`, `mcp/` or `tests/`; `../outside.mjs` fails naming the import and the importer; a non-literal `import()` fails; multi-line, re-export, side-effect and literal dynamic imports are followed and comment-only imports are not; a missing import fails))

- [x] 2.2 `scripts/export/package.mjs`: the exported `package.json` with versions from the factory lockfile, tooling devDependencies, wrangler only when the dispatch can use it, scripts and `engines` (design Decision 4).

  Verify, with tests on a fake lockfile:
  - exact pins, with the site-local entry winning over the root entry;
  - a package missing from the lockfile fails, naming it;
  - wrangler is present for `cloudflare` and absent for `vercel`;
  - `legal` script only with the brief. (verified: tests/export.test.mjs on a fake lockfile: exact pins with the site-local entry winning, a missing package fails naming it, wrangler present for `cloudflare` and for a vps with Cloudflare previews and absent for `vercel`; deviation: no `legal` (or `credits`) npm script at all, because `scripts/legal.mjs` and `scripts/credits.mjs` only work on `sites/<slug>/`, so the test asserts both are absent))

- [x] 2.3 Templates `scripts/export/templates/ci.yml` and `README.md` (design Decisions 5 and 6).

  Verify, with tests:
  - the workflow parses as YAML;
  - it has the `qa` job steps (`npm ci`, `format:check`, `astro check`, `qa -- --runs 3`, `report -- --only static`);
  - it has a `deploy` job with `needs: qa`, the `deploy/config.mjs --github-output` step, a gate that only compares secrets to `''`, the fork check, both deploy paths, the live report and the comment marker;
  - no `--site` anywhere;
  - the README names the target's secrets for `vercel` and `cloudflare`. (verified: tests/export.test.mjs: the workflow is read as text (no YAML library is a dependency, as tests/ci-workflow.test.mjs does): qa steps in order, `needs: qa`, the target step, a gate that compares secrets to `''` only, the fork check, both deploy paths, the live report with `continue-on-error`, the `<!-- site-preview -->` marker and a last failing step, no `--site`; README names `VERCEL_TOKEN`, the Cloudflare pair and `DEPLOY_SSH_KEY`))

- [x] 2.4 `scripts/export.mjs` CLI: arguments, `--dry-run`, `--no-brief`, `--no-lockfile`, `--record <https-url>` and the test-only `--root` honoured only under `NODE_TEST_CONTEXT`. It runs all checks before writing, writes the file plan, runs Prettier on the output, runs `npm install --package-lock-only --ignore-scripts` and cleans up on failure. Exit codes 0, 1 and 2 (design Decisions 5, 7 and 9). Add the npm script `export` and the `.claude/settings.json` allow entry.

  Verify, with tests on a fixture factory:
  - refusals (bad slug, missing site, `--out` inside the root, a non-empty `--out`) exit 2 and write nothing;
  - a fake provider key built at run time exits 1, prints only the masked form and writes nothing;
  - a full export with `--no-lockfile` has the expected files;
  - none of `dist/`, `node_modules/`, `.run.log`, `.run-usage.json`, `.env` or `EXPORTED.json` is copied;
  - planning docs are under `docs/factory/`;
  - `--no-brief` leaves out `brief.json` and the `legal` script;
  - `--dry-run` writes nothing;
  - `--record` writes `EXPORTED.json` with the four fields and refuses an `http://` URL. (verified: tests/export.test.mjs (32 tests in all) on a fixture factory: bad slug, missing site, missing arguments, http `--record`, `--out` inside the factory (also through a symlink) and a non-empty `--out` exit 2 and write nothing; a fake `ghp_` key built at runtime exits 1, only `ghp_... (40 chars)` is printed and nothing is written; a full `--no-lockfile` export has the expected files and none of `dist/`, `node_modules/`, `.run.log`, `.run-usage.json`, `.env`, `EXPORTED.json`; planning docs under `docs/factory/`; `--no-brief`; `--dry-run`; `--record`; Prettier formatting of the output; `npm run export` and the `.claude/settings.json` allow entry added))

## 3. Factory record and CI

- [x] 3.1 `scripts/changed-sites.mjs` skips sites with `EXPORTED.json` (design Decision 8; `deployment` delta).

  Verify, with tests:
  - an exported site is left out both when its folder changed and when a shared path changed;
  - other sites are unchanged. (verified: tests/changed-sites.test.mjs (13 tests, 3 new): an exported site is left out when its folder changed and when a shared path changed, other sites unchanged, CLI with a throwaway git repo (also `--all` and the unusable-base fallback)))

## 4. End-to-end check

- [x] 4.1 Export `personal-brand` into a scratch folder outside the repository, with the lockfile.

  In that folder:
  - `npm ci`, `npm run check`, `npm run format:check`, `npm run build`;
  - `npm run qa` passes;
  - `npm run report -- --only static` has no failing item;
  - `node scripts/deploy.mjs --dry-run` prints a plan for the site's target;
  - with `site.config.json` switched to `vercel` in the scratch copy, the dry run prints the Vercel plan and `vercel.json`;
  - no file of another site or of `.claude/` is present.

  Record the results here. The real Vercel deploy is the first-use site change, not this task.

  (verified, 2026-10-25, scratch folder outside the repository, exported with the lockfile (`npm install --package-lock-only` reached the registry): 115 files, 42 scripts; `npm ci` ok; `npm run check` 0 errors, 0 warnings; `npm run format:check` clean; `npm run build` 3 pages; `npm run qa` PASSED (verdict `passed`, 0 failures; `/` and `/es/`); `npm run report -- --only static` passed: 0 fail, 2 warn (Lighthouse image savings for the portrait, legal requirements unknown because the brief names no market; the brief is read from the repository root), 35 pass, 3 n/a, 0 not run; `node scripts/deploy.mjs --dry-run` for the site's `cloudflare` target says wrangler deploys it; with the scratch `site.config.json` switched to `{"target":"vercel","vercel":{"project":"williansnieves","productionBranch":"main"}}` the dry run prints the Vercel plan (40 unique files, production deployment) and the generated `vercel.json` with HSTS, COOP and immutable `/_astro/*`; `node scripts/deploy/config.mjs --branch main` gives `deploy_via=script`, `secrets=VERCEL_TOKEN`; no `sites/`, `.claude/` or `mcp/` path in the folder. The factory's `sites/personal-brand/` was not changed and `--record` was not run.)

## 5. Docs

- [x] 5.1 Update the docs:
  - `docs/export.md`: usage, what travels, the brief choice, the record, re-exporting to update, first push and secrets;
  - `CLAUDE.md`: commands table, folder structure, a short "Exporting a site" section, and the `changed-sites` note in "CI and deployment";
  - `scripts/README.md` and `docs/status.md`.

  Verify:
  - `npm run format:check` passes;
  - `openspec validate add-site-export --strict` passes;
  - the full `npm test` passes. (verified: `docs/export.md`, `CLAUDE.md` (commands row, folder structure, "Exporting a site", changed-sites note), `scripts/README.md` and `docs/status.md` updated; `npm run format:check` clean; `openspec validate add-site-export --strict` valid; full `npm test` 742 tests, 0 failures; `npm run check` 0 errors)
