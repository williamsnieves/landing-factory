# Tasks

## 1. Configuration and command

- [x] 1.1 `scripts/deploy/config.mjs`: schema, defaults (no `target` means `cloudflare`), the `previews` rule, validation with exit 2 naming the field, the brief mapping, and the `--github-output` mode (design Decision 1). `new-site` writes `target: "cloudflare"`. Verify:
  - unit tests for each target's valid and missing fields;
  - `ftp` is refused;
  - every existing `sites/*/site.config.json` and the root one still validate as `cloudflare`;
  - the `new-site` test asserts the new field. (verified: tests/deploy-config.test.mjs (21 tests): each target's valid and missing fields named, ftp refused, previews rules, dispatch, `--github-output`, brief mapping; the root and all 7 existing `sites/*/site.config.json` validate as cloudflare and dispatch to wrangler; tests/new-site.test.mjs asserts `target: "cloudflare"`)
- [x] 1.2 `scripts/deploy.mjs`: CLI, the CI-only refusal, the dry-run plan, the one-line JSON output, secret redaction, the `deploy` npm script, and the allow-list entry for `--dry-run` only (design Decision 2). Verify:
  - tests: outside CI without `--dry-run` it exits 1 and sends nothing;
  - the dry run prints the plan with no secret values (fake secrets built at runtime are asserted absent);
  - bad usage exits 2. (verified: tests/deploy-cli.test.mjs (18 tests): outside CI without `--dry-run` exits 1 and the fake Vercel API got 0 requests; dry runs for vercel, vps and shared print the plan with random fake secrets asserted absent; bad usage and invalid configuration exit 2; the allow-list holds only `--dry-run` entries; CLI process test)

## 2. Headers

- [x] 2.1 `scripts/deploy/headers.mjs`: translators to `vercel.json`, Caddy, Nginx and `.htaccess` from the `_headers` rules (design Decision 3). Verify:
  - unit tests on the starter's built `_headers` and a fixture with several rules;
  - every header of every rule appears in every output;
  - `/_astro/*` keeps immutable caching;
  - the 404 handling is present;
  - `.htaccess` forces HTTPS and sets `Options -Indexes`. (verified: tests/deploy-headers.test.mjs (18 tests): every header of every rule appears in all four outputs for the starter `_headers` and a multi-rule fixture; `/_astro/*` immutable, 404 handling, `.htaccess` HTTPS redirect and `Options -Indexes`; Nginx repeats global headers per location)

## 3. Adapters

- [x] 3.1 Vercel adapter (design Decision 4). Verify, with tests against a local fake Vercel API via `VERCEL_API_URL`:
  - SHA-1 digests and headers on upload;
  - the deployment body for production and for a preview;
  - polling to READY;
  - ERROR and timeout exit 1;
  - a token echoed in an error is masked;
  - `vercel.json` is included. (verified: tests/deploy-vercel.test.mjs (9 tests) against a local fake via `VERCEL_API_URL`: SHA-1 digests and headers, production and preview bodies, polling to READY, ERROR and timeout exit 1, echoed token masked, `vercel.json` uploaded, missing token exits 2 with no request)
- [x] 3.2 rsync adapters for VPS and shared hosting (design Decision 5). Verify:
  - the argv plans are asserted exactly (ssh options include `StrictHostKeyChecking=yes` and the pinned `known_hosts`);
  - path validation refuses `/`, `~`, empty paths, metacharacters, and shared paths outside `public_html` or `allowPath`;
  - an integration test with real rsync from one local folder to another checks the release folders, the atomic `current` switch, pruning to 5, rollback, an interrupted upload leaving `current` unchanged, and shared hosting's `--delete-after` with `.htaccess`;
  - the temporary key folder is removed. (verified: tests/deploy-rsync.test.mjs (23 tests): exact argv plans, path validation, and real rsync between local folders (release layout, atomic `current`, prune to 5, hard links, rollback, interrupted upload leaves `current` and removes the half release, shared `--delete-after` with `.htaccess` and `.well-known` kept, temporary key folder removed, key never printed))
- [x] 3.3 FTPS fallback (design Decision 6). Verify: the plan is unit-tested (TLS forced, certificate verified, password only through the environment, never in argv); plain FTP is refused. (verified: tests/deploy-rsync.test.mjs: the lftp plan forces TLS, verifies the certificate and takes the password only through `LFTP_PASSWORD` (exec hook asserts it is absent from argv); plain FTP is refused in config (exit 2) and in the plan)

## 4. CI

- [x] 4.1 `.github/workflows/ci.yml` dispatch (design Decision 7):
  - read the target, run the secrets gate per effective target, keep the Cloudflare path, add the deploy step for the other targets, apply the preview fallback, add the "no preview" comment line;
  - the live report and comment take the captured URL;
  - `lftp` is installed only for FTPS.

  Verify:
  - `tests/ci-workflow.test.mjs` asserts the new steps, their order and conditions, and that secrets appear only in `env` of the deploy step;
  - the PR's own CI stays green with every site on `cloudflare`. (verified: tests/ci-workflow.test.mjs (20 tests) asserts the steps, order, conditions and that the new secrets appear only in the deploy step `env`; tests/ci-gate.test.mjs (12 tests) runs the real gate script for every target and the unchanged Cloudflare messages; `python3 yaml` parses the workflow; the PR's own CI stays to be confirmed on GitHub (every site is cloudflare))

## 5. Guides and docs

- [x] 5.1 `docs/deploy/{cloudflare,vercel,vps,shared-hosting}.md` (design Decision 8), each ending with the report on the final URL. Update `CLAUDE.md` (commands, CI and deployment, sites), `README.md` (Deployment points to the guides), `sites/README.md`, `docs/status.md`, and the `/new-landing` skill (set `target` from `deploy.target`). Verify:
  - `npx prettier --check .`;
  - `openspec validate add-deploy-adapters --strict`;
  - a docs test asserts each guide names its secrets and ends with the report command. (verified: tests/deploy-docs.test.mjs (10 tests): each guide names its secrets, ends with the report command and its JSON examples validate; `npx prettier --check .` and `openspec validate add-deploy-adapters --strict` pass)

## 6. Full run

- [x] 6.1 Full pre-push run in a clean clone: `npm ci && npx prettier --check . && npm run check && npm run check:sites && npm run validate:patterns && npm run validate:archetypes && npm test && npm run qa`, plus `node scripts/deploy.mjs --site tupathdigital --dry-run` with the target temporarily set to `vps` and to `vercel` in a scratch copy (never committed), and `openspec validate --all --strict`. Verify: every command exits 0, and the dry runs print plans with no secrets. (verified: in the working tree: prettier, check, check:sites, validate:patterns, validate:archetypes, `npm test` (591 tests, 467 before), `npm run qa` (PASSED, 0 failures) and `openspec validate --all --strict` all exit 0; dry runs for vercel, vps and shared against a scratch copy of tupathdigital's config print plans with no secrets; the clean-clone run is repeated by the main session)

## Workflow follow-up

- First real deploy per target once the owner has the account and secrets (Vercel token; VPS host, key and host key; Hostinger SSH or FTPS). Each is a small follow-up that records the result.
- After the user confirms the merge: `openspec archive add-deploy-adapters --yes` as the first commit of the next branch.
