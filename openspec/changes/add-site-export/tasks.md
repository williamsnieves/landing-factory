# Tasks

## 1. Preparation

- [ ] 1.1 Move the proxy helper to `scripts/lib/proxy.mjs` (design Decision 3).
  - `.claude/skills/analyze-reference/scripts/proxy.mjs` becomes a re-export.
  - Point the five factory scripts that import it at the new path.

  Verify:
  - `grep` finds no import of `.claude/` under `scripts/`;
  - `npm test` passes;
  - `node .claude/skills/analyze-reference/scripts/check-robots.mjs --help` and `node scripts/landing-report.mjs --help` still run.

## 2. Export command

- [ ] 2.1 `scripts/export/closure.mjs`: the import walker (design Decision 2).

  Verify, with tests:
  - the closure of the real entry points contains `qa/*`, the `report/*` modules the report imports, `deploy/*`, `lib/sites.mjs`, `lib/brief-schema.mjs` and `lib/proxy.mjs`, and nothing from `.claude/`, `mcp/` or `tests/`;
  - a fixture importing `../outside.mjs` fails, naming the import;
  - a non-literal `import()` fails.
- [ ] 2.2 `scripts/export/package.mjs`: the exported `package.json` with versions from the factory lockfile, tooling devDependencies, wrangler only when the dispatch can use it, scripts and `engines` (design Decision 4).

  Verify, with tests on a fake lockfile:
  - exact pins, with the site-local entry winning over the root entry;
  - a package missing from the lockfile fails, naming it;
  - wrangler is present for `cloudflare` and absent for `vercel`;
  - `legal` script only with the brief.
- [ ] 2.3 Templates `scripts/export/templates/ci.yml` and `README.md` (design Decisions 5 and 6).

  Verify, with tests:
  - the workflow parses as YAML;
  - it has the `qa` job steps (`npm ci`, `format:check`, `astro check`, `qa -- --runs 3`, `report -- --only static`);
  - it has a `deploy` job with `needs: qa`, the `deploy/config.mjs --github-output` step, a gate that only compares secrets to `''`, the fork check, both deploy paths, the live report and the comment marker;
  - no `--site` anywhere;
  - the README names the target's secrets for `vercel` and `cloudflare`.
- [ ] 2.4 `scripts/export.mjs` CLI: arguments, `--dry-run`, `--no-brief`, `--no-lockfile`, `--record <https-url>` and the test-only `--root` honoured only under `NODE_TEST_CONTEXT`. It runs all checks before writing, writes the file plan, runs Prettier on the output, runs `npm install --package-lock-only --ignore-scripts` and cleans up on failure. Exit codes 0, 1 and 2 (design Decisions 5, 7 and 9). Add the npm script `export` and the `.claude/settings.json` allow entry.

  Verify, with tests on a fixture factory:
  - refusals (bad slug, missing site, `--out` inside the root, a non-empty `--out`) exit 2 and write nothing;
  - a fake provider key built at run time exits 1, prints only the masked form and writes nothing;
  - a full export with `--no-lockfile` has the expected files;
  - none of `dist/`, `node_modules/`, `.run.log`, `.run-usage.json`, `.env` or `EXPORTED.json` is copied;
  - planning docs are under `docs/factory/`;
  - `--no-brief` leaves out `brief.json` and the `legal` script;
  - `--dry-run` writes nothing;
  - `--record` writes `EXPORTED.json` with the four fields and refuses an `http://` URL.

## 3. Factory record and CI

- [ ] 3.1 `scripts/changed-sites.mjs` skips sites with `EXPORTED.json` (design Decision 8; `deployment` delta).

  Verify, with tests:
  - an exported site is left out both when its folder changed and when a shared path changed;
  - other sites are unchanged.

## 4. End-to-end check

- [ ] 4.1 Export `personal-brand` into a scratch folder outside the repository, with the lockfile.

  In that folder:
  - `npm ci`, `npm run check`, `npm run format:check`, `npm run build`;
  - `npm run qa` passes;
  - `npm run report -- --only static` has no failing item;
  - `node scripts/deploy.mjs --dry-run` prints a plan for the site's target;
  - with `site.config.json` switched to `vercel` in the scratch copy, the dry run prints the Vercel plan and `vercel.json`;
  - no file of another site or of `.claude/` is present.

  Record the results here. The real Vercel deploy is the first-use site change, not this task.

## 5. Docs

- [ ] 5.1 Update the docs:
  - `docs/export.md`: usage, what travels, the brief choice, the record, re-exporting to update, first push and secrets;
  - `CLAUDE.md`: commands table, folder structure, a short "Exporting a site" section, and the `changed-sites` note in "CI and deployment";
  - `scripts/README.md` and `docs/status.md`.

  Verify:
  - `npm run format:check` passes;
  - `openspec validate add-site-export --strict` passes;
  - the full `npm test` passes.
