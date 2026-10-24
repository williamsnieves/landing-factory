# Tasks

## 1. Planning-folder fix

- [x] 1.1 `scripts/lib/sites.mjs`: `isPlanningEntry(entry, { hasBrief })`, which accepts top-level `*.md` files, `brief.json`, and an `assets/` folder when a brief exists. `new-site.mjs` and `preflight.mjs` use it (design Decision 10). Verify: new tests in `tests/new-site.test.mjs` and `tests/preflight.test.mjs`:
  - a folder with `brief.json` and `assets/logo.webp` is accepted and both files are unchanged;
  - `assets/` without a brief is refused, naming `assets`;
  - any other folder or file is still refused. (verified: tests/new-site.test.mjs and tests/preflight.test.mjs pass the three cases)
- [x] 1.2 `brief import` onto its own location is a no-op ("already in place"). `new-landing.sh` runs with `sites/<slug>/brief.json` and `assets/` already present. Verify:
  - a test in `tests/brief.test.mjs` for import onto itself;
  - a test in `tests/new-landing.test.mjs` with a prepared folder (stub `claude`, `NEW_LANDING_SKIP`) exits 0 and keeps the asset. (verified: tests/brief.test.mjs import onto its own location prints 'already in place' and copies nothing; tests/new-landing.test.mjs prepared folder with brief.json and assets/ exits 0 and keeps the asset)

## 2. QA keeps the Lighthouse detail

- [x] 2.1 `scripts/qa/lighthouse.mjs`: `perfDetail(lhr)` stored as `presets[].detail` (design Decision 8). It reads defensively: `null` for absent audits. `report.md` of QA is unchanged apart from an optional LCP line. Verify:
  - a unit test with a trimmed LHR fixture (`tests/fixtures/qa/lhr-sample.json`) asserts every field, and `null` for a missing audit;
  - `npm run qa -- --site tupathdigital --skip impeccable` writes `detail` with the LCP selector. (verified: tests/qa-perf-detail.test.mjs with tests/fixtures/qa/lhr-sample.json asserts every field and null for missing audits; qa --site tupathdigital --skip impeccable passed and wrote presets[].detail with the LCP selector. Lighthouse 13 replaced the legacy image, font, render-blocking and third-party audits with insight audits, so perfDetail reads both generations of ids)

## 3. Report core

- [x] 3.1 `scripts/landing-report.mjs` with modules in `scripts/report/`: CLI, config defaults and the `report` section of `qa.config.json`, item model, verdict, exit codes, output folder with a `latest` link, and JSON and Markdown rendering (design Decisions 1 and 2). It builds when `dist/` is missing, exits 2 on a broken build, and adds the `report` npm script and the allow-list entry in `.claude/settings.json`. Verify: `tests/landing-report.test.mjs` covers:
  - a clean fixture site, exit 0;
  - one failing item, exit 1;
  - a bad config (an ignore entry with no reason), exit 2;
  - `--help`;
  - Markdown that starts with the verdict and the counts. (verified: tests/landing-report.test.mjs: clean fixture exit 0, one failing item exit 1, bad config (ignore entry with no reason) exit 2, --help, Markdown starts with the verdict and counts, missing dist built or exit 2 on a broken build)
- [x] 3.2 `scripts/report/owasp.mjs`: the Top 10:2025 table, where every category appears with checks or "not applicable" and a reason (design Decision 3). Verify: a test asserts that all ten ids appear in the report of the clean fixture, and that A07 warns when a fixture page has a password input. (verified: tests/landing-report.test.mjs: all ten OWASP 2025 ids appear in the clean fixture report (A06, A07, A09 as one n/a line with the reason), A07 warns naming the page when a password input exists)

## 4. Security checks (static)

- [x] 4.1 Headers: parse `_headers` and compute the effective CSP from the header and the meta tag (design Decision 4). Verify, with fixtures under `tests/fixtures/report/`:
  - missing `nosniff`, `Referrer-Policy` or `frame-ancestors` fails;
  - missing HSTS, COOP or a script CSP warns;
  - a CSP meta tag with hashes passes;
  - `'unsafe-inline'` without a hash warns. (verified: tests/landing-report-checks.test.mjs: missing nosniff, Referrer-Policy, frame-ancestors or the whole file fail; missing HSTS, COOP, Permissions-Policy or a script CSP warn; a CSP meta with the real inline-script hash passes; 'unsafe-inline' without a hash warns)
- [x] 4.2 `dist` scan:
  - private files (`.env`, `.git/`, `*.pem`, `*.key`, `brief.json`) fail, and `*.map` and `package.json` warn;
  - mixed content fails, and plain `http://` links warn;
  - `javascript:` URLs fail;
  - external scripts without SRI fail, and external stylesheets without it warn;
  - the third-party origin inventory;
  - broken internal links and assets fail;
  - `target="_blank"` without `noopener` warns;
  - a missing `404.html` warns;
  - forms and password inputs.

  Verify: one fixture per rule, each asserting its status and evidence (page and URL). (verified: tests/landing-report-checks.test.mjs has one fixture per rule asserting status and page/URL evidence: private files, source maps, package.json, mixed content, http links, javascript: URLs, SRI, third-party inventory, broken links and anchors, target=_blank, 404, forms and password inputs)
- [x] 4.3 Source scan: injection sinks with file and line (warn), and secret patterns over the site folder and `dist/`, with `.env*` failing (design Decision 5). One `mask()` is used everywhere. Verify:
  - fixtures with a fake GitHub token, a fake PEM header, a fake AWS key and a generic pattern;
  - a test asserts that the full fake token never appears in stdout, stderr, `report.json` or `report.md`;
  - the generic pattern warns only. (verified: tests/landing-report-checks.test.mjs: fake GitHub token, PEM header, AWS key and Stripe key built at runtime fail with file, line and pattern name; the generic pattern only warns; .env files fail; the full token is absent from stdout, stderr, report.json and report.md in a spawned run)
- [x] 4.4 `npm audit` (design Decision 6): `--omit=dev` per workspace, the severity mapping, the ignore list with a reason, and not run on network errors. Verify:
  - unit tests on recorded `npm audit --json` outputs (critical, moderate, an ignored advisory, an error) by injecting the runner;
  - a real run on `sites/tupathdigital` shows the item with the advisory count. (verified: tests/landing-report-checks.test.mjs with injected runners (critical, moderate, ignored advisory, ENOAUDIT, offline, spawn failure); real run on sites/tupathdigital: 'npm audit: 0 advisories in the production dependencies (241 packages)')

## 5. Live checks

- [x] 5.1 `scripts/report/live.mjs` (design Decision 7), through the proxy re-exec helper:
  - TLS;
  - the HTTP to HTTPS redirect;
  - HTML headers and HSTS;
  - caching of a hashed asset;
  - private paths detected by their body;
  - an unknown path answering 404.

  Verify:
  - tests against a local HTTP fixture server in the test, with no network, covering a host that serves the home page for every path (private paths pass, the unknown path warns), an exposed `/.git/HEAD` (fail) and missing HSTS (warn);
  - a real run: `npm run report -- --site tupathdigital --only live --url https://tupathdigital.pages.dev`. (verified: tests/landing-report-live.test.mjs uses local HTTP fixture servers and stubbed https hosts (no network): host answering every path with the home page (private paths pass, unknown path warns), exposed /.git/HEAD fails, missing HSTS warns, TLS error fails, redirect cases; real run 'npm run report -- --site tupathdigital --only live --url https://tupathdigital.pages.dev' exited 0 with TLS, baseline headers, private paths and cache passing and warnings for HSTS, COOP, no script CSP and unknown path answering 200)
- [x] 5.2 `--external-links`: deduplicated, at most 50 links, sequential with a gap; 401, 403 and 429 answers and challenge pages are unverified; 404, 410, 5xx and DNS errors warn; nothing is retried around a block. Verify:
  - fixture-server tests for each class;
  - a real run on tupathdigital lists Etsy as unverified or passed, with no failure. (verified: fixture-server tests cover ok, redirect, 404, 410, 500, 403, 429, challenge header, HEAD fallback, DNS error, dedupe, 50 cap, sequential gap and private hosts; real run with --external-links on tupathdigital: Gumroad links ok, all 17 Etsy links unverified (403 with x-datadome), x.com and instagram.com unverified (connection cancelled by the proxy), exit 0)

## 6. Performance

- [x] 6.1 `scripts/report/perf.mjs`: reads the QA report with the timestamp guard, and shows the detail per page and preset, the scores, and a failure when a score is under the QA threshold. It measures `dist/`: page weight, largest images, oversized and legacy-format images, and font files. The thresholds warn (design Decision 8). Verify, with fixtures:
  - a QA report older than the build gives not run;
  - a heavy JPEG warns;
  - a page over `maxPageKb` warns;
  - a score of 85 fails;
  - a real run on tupathdigital after its QA shows the LCP element. (verified: tests/landing-report-perf.test.mjs: QA report older than the build gives not run 'run QA first', a 450 KB JPEG warns with file, size and fix, a page over maxPageKb warns, a score of 85 fails with exit 1, thresholds come from the site's qa.config.json; real run on tupathdigital after its QA lists the LCP element (section#top > div.wrap > div.copy > p.lede on mobile))

## 7. Starter hardening

- [x] 7.1 `astro.config.mjs` adopts `security.csp` with script hashes, plus `styleDirective` with `'unsafe-inline'` and a comment saying why. `public/_headers` gets HSTS and COOP, and keeps `frame-ancestors` (design Decision 4). Verify:
  - `npm run build` and `npm run qa` pass on the starter (including `/3d/` and `/islands/`);
  - a new test loads the built starter in Playwright, scrolls the 3D page and the islands page, and asserts that no `securitypolicyviolation` event fired;
  - the report on the starter shows the CSP and HSTS items as passed. (verified: 'npm run build' and 'npm run qa' PASSED on the starter with the CSP (/, /3d/ with its canvas, /islands/); tests/csp.test.mjs loads the built starter in Chromium, scrolls all three pages and asserts no securitypolicyviolation event and no CSP console error, Lenis started and the 3D canvas created (negative control: an injected inline script is blocked with script-src-elem); the report on the starter shows headers-baseline, headers-hsts, headers-coop and csp-scripts as pass)
- [x] 7.2 `new-site` copies the hardened files (both already sit in `COPIED_PATHS`). Verify: the `new-site` test asserts that the scaffolded `astro.config.mjs` has `csp` and `_headers` has HSTS. A scaffolded throwaway site builds, then is removed. (verified: tests/new-site.test.mjs scaffolds a throwaway site under .cache/, asserts astro.config.mjs has security.csp and _headers has HSTS and COOP, builds it (CSP meta tag with script hashes, no unsafe-inline in script-src) and removes it)

## 8. CI

- [x] 8.1 `.github/workflows/ci.yml` (design Decision 9). It adds:
  - a static report step after QA in `qa` and `site-qa-deploy`, before the deploy, so a failure blocks it;
  - a live report step after the URL capture in `deploy` and in `site-qa-deploy`;
  - artifacts `landing-report` and `landing-report-<slug>`;
  - the report line in both sticky comments.

  Verify:
  - `actionlint`, if present, otherwise a YAML parse in a test;
  - the existing workflow tests in `tests/` (step order: static report before deploy, live report after capture);
  - the PR's CI run itself, with the comment showing the report line. (verified: tests/ci-workflow.test.mjs checks step order (static report after QA and before the artifact upload or deploy steps, live report after the URL capture and before the comment), artifact names, the Report line in both comments and a YAML parse when a parser is installed; python yaml.safe_load parses the workflow; actionlint is not installed; the PR's own CI run is for the main session)

## 9. Existing sites and docs

- [x] 9.1 Run `npm run report` on the starter and on all seven sites. Record each verdict and the counts per status in the PR description. Verify:
  - no site fails because of a factory-owned file;
  - any other failure is listed for the user before the PR (Migration Plan step 2). (verified: starter: passed (1 warn: no 404.html; 32 pass, 3 n/a); app-finanzas passed (5 warn); clinica-dental passed (8 warn); estudio-arquitectura passed (8 warn); festival-electronica passed (7 warn); panaderia passed (9 warn); samurai passed (9 warn); tupathdigital passed (6 warn); every site has 3 n/a and 0 fail, 0 not run; no failure comes from a factory-owned file. The warnings are HSTS, COOP, no script CSP, no 404.html, uncovered inline scripts, image weight and format, and (samurai) 5 set:html sinks; estudio-arquitectura failed the Lighthouse desktop threshold (77) once while tests ran at the same time and passed with --runs 3 on an idle machine)
- [x] 9.2 Docs:
  - `CLAUDE.md`: the commands table, a new "Landing report" section, and the CI and deployment section;
  - `README.md`;
  - `scripts/README.md`;
  - `docs/status.md`: the Known gaps entry for the planning-folder bug removed, and a follow-up to opt existing sites into the CSP.

  Verify: `npx prettier --check .` and `openspec validate add-landing-report --strict`. (verified: CLAUDE.md (commands table, new 'Landing report' section, CI and deployment, quality budgets), README.md, scripts/README.md, sites/README.md and docs/status.md (planning-folder Known-gaps entry replaced by the CSP opt-in follow-up) updated; npx prettier --check . and openspec validate add-landing-report --strict pass)
- [x] 9.3 Full pre-push run in a clean clone: `npm ci && npx prettier --check . && npm run check && npm run check:sites && npm run validate:patterns && npm run validate:archetypes && npm test && npm run qa`, plus `npm run qa -- --site tupathdigital` and `openspec validate --all --strict`. Verify: every command exits 0. (verified: run in the working tree, not a clean clone: prettier --check, npm run check, check:sites, validate:patterns, validate:archetypes, npm test (373 tests, 0 fail), npm run qa (starter, with the CSP), npm run qa -- --site tupathdigital and openspec validate --all --strict all exited 0; the main session repeats it in a clean clone)

## Workflow follow-up

- After the user confirms the merge: `openspec archive add-landing-report --yes` as the first commit of the next branch (`change/add-ai-images`), and write the Purpose of the new `landing-report` spec if the archive leaves a placeholder.
