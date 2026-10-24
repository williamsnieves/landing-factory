# Design: add-landing-report

## Context

- `npm run qa` (`scripts/qa.mjs` and `scripts/qa/*`) builds, serves and checks a landing. Lighthouse runs through its Node API in `scripts/qa/lighthouse.mjs`, which keeps only the scores and the top failing audits of the median run.
- Security today is one static file, `public/_headers`, with `nosniff`, `Referrer-Policy`, `frame-ancestors 'self'` and `Permissions-Policy`. Nothing checks that it is present.
- The built pages hold:
  - Astro's small inline scripts;
  - JSON-LD;
  - the motion and 3D module scripts from `/_astro/`.
- Astro 7.4 ships `security.csp`. It hashes the scripts and styles Astro emits and writes a CSP `<meta>` tag per page.
- Sites copy the starter at creation and may diverge. A change to the factory may not rewrite another site's folder (`CLAUDE.md`, "Sites").
- CI:
  - the root `qa` job, then `deploy`;
  - the `sites` and `site-qa-deploy` matrix, which runs QA with `--runs 3` and deploys when QA passes.
- Network requests from Node CLIs go through `HTTPS_PROXY` with the re-exec helper `.claude/skills/analyze-reference/scripts/proxy.mjs` (as in `find-images.mjs` and `preflight.mjs`).
- The planning-folder bug: `isPlanningDoc` (`scripts/lib/sites.mjs`) accepts only top-level files named `*.md` or `brief.json`. The brief interview, however, tells the user to put files in `sites/<slug>/assets/`, so preflight and `new-site --allow-existing-docs` reject the folder.

## Goals / Non-Goals

**Goals:**

- One command, deterministic and with no new dependency, that can run:
  - offline on `dist/` and the site source;
  - online for `npm audit`, the live checks and external links.
- The report reads QA's output for Lighthouse detail instead of running Lighthouse again.
- Existing sites keep passing CI. New strictness lands as warnings where it would otherwise break a site the factory is not allowed to edit.
- Secrets never leave the process unmasked.

**Non-Goals:**

- Dynamic scanning (fuzzing, ZAP), penetration tests, or checks that need a server.
- Real-user Web Vitals.
- Rewriting existing sites to adopt the CSP.
- Replacing GitHub's own secret scanning for the whole repository history. This report scans the landing's folder and its build.

## Decisions

### 1. A separate command next to QA, not more QA checks

- **Decision:** `scripts/landing-report.mjs`, with modules in `scripts/report/`:
  - `config`;
  - `headers` (parses Cloudflare `_headers`);
  - `dist-scan` (pages, links, files, mixed content, SRI, inline scripts, forms);
  - `source-scan` (injection sinks, secrets);
  - `audit` (`npm audit`);
  - `live` (deployed URL);
  - `links` (external);
  - `perf` (reads the QA report and measures `dist/`);
  - `owasp` (category map);
  - `render` (JSON and Markdown).
- **CLI:**
  ```text
  npm run report -- [--site <slug>] [--url <url>] [--external-links] [--only static|live]
                    [--skip <ids>] [--config <file>] [--out <dir>] [--qa <report.json>]
  ```
- **Why:** QA answers "does the page look and score right" and is already slow (browser, Lighthouse). The report answers "is it safe and lean to publish". Most of its checks are file scans that run in seconds, and the live part runs after the deploy, when QA is long finished.
- **Alternative rejected:** adding checks to `qa.mjs`. That would make `qa` depend on the network and a deployed URL, and mixes two verdicts.
- **Build:**
  - If `dist/` is missing, the command builds with the same build helper QA uses (`scripts/qa/server.mjs` `build`).
  - `--only live` needs no `dist/`.
- **Output:**
  - Without `--site`: `qa/report/<ts>/`.
  - With `--site`: `qa/<slug>/report/<ts>/`.
  - `latest` is a symlink, as in QA.

### 2. Item model and verdict

- **Item fields:** each item is `{ id, area: 'security'|'performance', owasp: 'A01'..'A10'|null, status: 'pass'|'warn'|'fail'|'na'|'not-run', title, evidence: [...], fix }`.
- **Verdict:**
  - `failed` when any item fails;
  - otherwise `passed`, with counts per status;
  - `not-run` is shown in the headline, for example "passed (2 not run)".
- **Exit codes:** 0, 1 and 2, as in QA and `check-landing`.
- **Markdown layout:** verdict and counts first, then the fails, then the warnings, then one table per OWASP category, then performance per page. Every not-applicable category gets one line with its reason.

### 3. OWASP Top 10:2025 mapping (`scripts/report/owasp.mjs`)

| Category                                     | Checks for a static landing                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control                    | private files in `dist/`; live: private paths not served                                                                            |
| A02 Security Misconfiguration                | `_headers` baseline (nosniff, referrer, frame-ancestors) fail, HSTS, COOP and Permissions-Policy warn; source maps; live headers     |
| A03 Software Supply Chain Failures           | `npm audit` (production deps of the workspace), lockfile present, third-party origin inventory                                      |
| A04 Cryptographic Failures                   | mixed content, `http://` links; live: TLS valid, HTTP→HTTPS, HSTS                                                                   |
| A05 Injection                                | `javascript:` URLs, source sinks, inline-script inventory, script CSP                                                               |
| A06 Insecure Design                          | forms: none expected (no backend); a `<form>` posting to a third party warns; otherwise not applicable with the reason               |
| A07 Authentication Failures                  | not applicable (no accounts); a password input warns                                                                                |
| A08 Software or Data Integrity Failures      | SRI on external scripts (fail) and stylesheets (warn); deploys come only from CI after QA and the report (recorded as pass, by design) |
| A09 Security Logging and Alerting Failures   | not applicable (static host; no application logs to keep)                                                                           |
| A10 Mishandling of Exceptional Conditions    | `404.html` exists; live: unknown path answers 404                                                                                   |

- **Secrets** are a cross-cutting item listed under A04, since hard-coded credentials are a cryptographic-material failure. Their own heading keeps them visible.
- **Edition:** the edition string lives in one constant, so a future edition is a small change.

### 4. Headers and CSP

- **Parsing `_headers`:** a small parser of Cloudflare's format (path pattern lines, indented `Name: value` lines). The rules for `/*` are evaluated, and `/_astro/*` is checked for `immutable`.
- **CSP sources:** the effective CSP of a page is the header CSP plus any `<meta http-equiv="Content-Security-Policy">`. A script CSP "restricts scripts" when `script-src` (or `default-src`) exists and contains neither `'unsafe-inline'` (unless a hash or nonce is also present, which makes browsers ignore it) nor `*`.
- **Starter adopts Astro's `security.csp`.**
  - Scripts get hashes.
  - Styles: `styleDirective` keeps `'unsafe-inline'` because sites use `style=` attributes for custom properties. Style injection is far less dangerous than script injection, and the trade-off is written in the starter's config comment.
  - The meta tag cannot carry `frame-ancestors`, so the header keeps `frame-ancestors 'self'`.
  - **Verification:**
    - QA on the starter (including the `/3d/` scene and the islands page) must pass;
    - a Playwright check in the test suite loads the built starter and asserts no `securitypolicyviolation` event fired.
  - **Fallback:** if Astro's CSP breaks the motion or 3D layers, the task stops and reports the cause rather than loosening `script-src`.
- **New headers in `public/_headers`:**
  - `Strict-Transport-Security: max-age=31536000` (no `preload`, and no `includeSubDomains`, since the host may be shared);
  - `Cross-Origin-Opener-Policy: same-origin`.
- **Existing sites:** they keep their copies. The report warns on them, and each opts in through its own site change.

### 5. Secret scanning without a dependency

- **Patterns:**
  - PEM private key headers;
  - AWS access key ids;
  - GitHub tokens (`ghp_`, `gho_`, `ghs_`, `github_pat_`);
  - Slack tokens (`xox[abprs]-`);
  - Stripe live keys (`sk_live_`, `rk_live_`);
  - Google API keys (`AIza`);
  - OpenAI-style and Anthropic-style keys (`sk-`, `sk-ant-`, with length rules);
  - npm tokens (`npm_`);
  - generic `(secret|token|password|api[_-]?key)\s*[:=]\s*['"][^'"\s]{16,}['"]`. This one warns, because it is noisy.
- **Files:**
  - **Scope:** the landing's folder minus `node_modules/`, `.astro/` and binary files, plus `dist/`.
  - **`.env*` files** under the site folder fail even when ignored by git: a later `public/` copy could ship them, and they do not belong in a site folder.
  - **Masking:** a single `mask()` helper is used by every output path. It keeps the first four characters and the length. A unit test asserts that a fixture token never appears in stdout, `report.json` or `report.md`.
- **Alternative rejected:** `gitleaks` or `trufflehog` as a binary or npm package. Both mean a new dependency and a download in CI, and the static landing surface is small.

### 6. `npm audit`

- **Command:**
  - for a site: `npm audit --omit=dev --json --workspace site-<slug>`;
  - for the starter: `--workspaces=false`.

  It runs from the repo root, where the single lockfile lives.
- **Results:**
  - high or critical severity fails;
  - moderate or low warns;
  - an advisory listed in `qa.config.json` `report.audit.ignore` (`[{ "id": "GHSA-...", "reason": "..." }]`) warns with its reason. An entry without a reason is a config error, exit 2.
- **Network errors** and npm's `ENOAUDIT` give not run.
- **Why `--omit=dev`:** dev dependencies never reach the visitor. Astro and its integrations are runtime dependencies in the site manifests, so they are covered.

### 7. Live checks (`--url`)

- **Network:** Node `fetch` through the proxy re-exec helper. Each request has a timeout (10 s), and there are no retries beyond one for network errors.
- **Checks:**
  1. **HTTPS URL fetch:** a TLS error fails.
  2. **HTTP redirect:** the `http://` version is fetched with `redirect: 'manual'`. It must answer 301 or 308 to HTTPS. Any other answer warns, because some hosts only serve HTTPS. A plain-HTTP 200 serving content fails.
  3. **HTML response headers:** the same rules as `_headers`, plus HSTS. The live result is authoritative over the file check.
  4. **Hashed asset:** the first `/_astro/` asset found in the HTML must have `immutable` with a max-age of at least one year.
  5. **Private paths:** `/.git/HEAD` (body starts `ref:`), `/.env` (lines `KEY=`), `/brief.json` (JSON with `business`), `/package.json` (JSON with `dependencies`), `/assets.json`. Each is a fail only when the body matches.
  6. **Unknown path:** `/__landing-report-<random>` must answer 404. A 200 warns: the host serves the home page for unknown paths, which happens on Cloudflare Pages without `404.html`.
- **External links (`--external-links`):**
  - Outbound `http(s)` links are deduplicated, with at most 50 per run, run sequentially with a 250 ms gap.
  - Each link gets a `HEAD`, falling back to a `GET` without reading the body.
  - Any status from 200 to 399 passes.
  - 401, 403 and 429 answers, or a page with a known challenge marker, are unverified. Nothing is retried around them.
  - 404, 410, 5xx and DNS errors warn.

### 8. Performance data

- **QA side:** `scripts/qa/lighthouse.mjs` gains `perfDetail(lhr)`, built from the representative run:
  - `largest-contentful-paint` (ms);
  - `largest-contentful-paint-element` (selector and snippet);
  - `cumulative-layout-shift`;
  - `total-blocking-time`;
  - `total-byte-weight`;
  - `network-requests` (count);
  - `modern-image-formats`, `uses-responsive-images`, `offscreen-images`, `uses-optimized-images` (savings in KB);
  - `font-display`;
  - `render-blocking-resources`;
  - `third-party-summary`.

  It is stored as `presets[].detail` in `report.json`, as an addition only. The QA verdict does not change.
- **Report side:**
  - It reads `--qa <file>`, else `qa/<slug>/latest/report.json`.
  - It uses the detail only when the QA report's `finishedAt` is newer than the mtime of `dist/index.html`. Otherwise the item is not run, with "run QA first".
  - It measures `dist/` itself:
    - weight per page: HTML plus its referenced same-origin CSS, JS, images and fonts, gzip size for text assets and raw size for binaries;
    - the largest images;
    - any raster image over `report.maxImageKb`;
    - JPEG or PNG images over 100 KB, a legacy-format warning;
    - font files: count and total.
- **Thresholds:** in `qa.config.json` `report`, with defaults in `scripts/report/config.mjs`:
  - `maxPageKb: 1600`;
  - `maxImageKb: 400`;
  - `lcpMs: 2500`;
  - `cls: 0.1`;
  - `tbtMs: 200`;
  - `maxFontFiles: 6`;
  - `maxThirdPartyOrigins: 3`.

  These are warnings. Lighthouse scores below the QA thresholds fail, as in QA, so the report never passes a site that QA would fail.

### 9. CI wiring

- **Root `qa` job:**
  - after QA: `npm run report -- --only static`, with the artifact `landing-report`;
  - in `deploy`, after the URL capture: `npm run report -- --only live --url "$URL"`.
- **`site-qa-deploy`:**
  - after QA: `npm run report -- --site "$SITE" --only static`;
  - after the deploy: `--only live --url`.
  - The artifact is `landing-report-<slug>`, holding both runs in their own timestamped folders.
- **Deploy gate:** the existing "only if everything passed" condition covers the static report, because it is a step before the deploy.
- **Live failure:** the job fails. The preview already exists, which is fine: the PR shows red and the comment says why.
- **Sticky comment:** gains one line, `Report: passed — 0 fail, 3 warn, 2 n/a, 0 not run`, with the artifact link.
- **Network:** the static report runs `npm audit`, which needs the registry. CI has it.
- **Local default:** the report runs all static checks, and live checks only with `--url`.

### 10. Planning-folder fix

- **`isPlanningDoc`:** it becomes `isPlanningEntry(entry, { hasBrief })`. It accepts:
  - top-level `*.md` files;
  - `brief.json`;
  - when `brief.json` is present, a directory named `assets`.

  `new-site.mjs` and `preflight.mjs` use it.
- **`new-site`:** keeps every existing file. Its walk already lists nested files, so `assets/**` are recorded as kept.
- **`brief import`:** when the source file resolves to `sites/<slug>/brief.json` itself, the import validates and returns "already in place", copying nothing. Asset paths are already inside the site, so nothing is copied for them either.
- **`new-landing.sh`:** with `sites/<slug>/brief.json` and `assets/` already present, the script runs end to end with `NEW_LANDING_SKIP` in the existing test harness.

## Risks / Trade-offs

- **[Astro CSP blocks a script the motion or 3D layer creates at runtime]** → QA's `scene-runtime` and reduced-motion checks plus the no-violation Playwright test catch it on the starter. Scripts loaded from `/_astro/` are `'self'`. If a dynamic import is blocked, the fix is a `scriptDirective.resources` entry, never `'unsafe-inline'`.
- **[`npm audit` turns CI red on an advisory published overnight, unrelated to the PR]** → this is intended: a high advisory in shipped code should block a deploy. The ignore list with a reason is the escape hatch for advisories that do not affect a static build (for example a dev-server-only issue in a runtime package). It is reviewed in the PR.
- **[False positives from the generic secret pattern]** → it only warns. The precise provider patterns fail.
- **[Live checks through the cloud proxy see the proxy's certificate]** → the session's CA bundle is trusted. In CI there is no proxy. A TLS failure names the host and the error so it is not mistaken for a site fault.
- **[Report and QA disagree because they ran on different builds]** → the timestamp guard reports not run instead of mixing data.
- **[Existing sites show many warnings (no script CSP, no HSTS)]** → expected and documented. Each site can opt in with a small site change. The first candidate is tupathdigital, if the owner wants it.

## Migration Plan

1. Land the report with every new check, and the starter hardening.
2. Run the report on the starter and all seven sites locally. Any fail on an existing site is fixed in this change only when it is a factory file the site does not own (for example the shared headers template). Otherwise the fail is recorded, and the user decides before the PR.
3. **Rollback:** the CI steps are separate. Reverting the workflow lines restores the old gate, and the report command can stay.

## Open Questions

- The exact Lighthouse audit ids for third-party and font data can change between Lighthouse versions. `perfDetail` reads them defensively and records `null` when an audit is absent. This does not change the spec.
