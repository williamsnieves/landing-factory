# Proposal: add-landing-report

## Why

Today a landing ships once QA passes. QA checks layout, motion and Lighthouse scores, but nothing checks security, and only the scores cover performance. The owner wants every landing to be fast and safe before it is published, with the OWASP Top 10 as the frame for security (owner, 2026-10-24). The owner's own landing (`sites/tupathdigital`) is live, and more customer landings are coming, so now is the time to add this. The same change fixes a bug found during that landing's build: generation refused a site folder that held the brief and its `assets/` folder.

## What Changes

- A new command, `npm run report -- --site <slug> [--url <deployed-url>]`, writes one readable report per landing to `qa/<slug>/report/<timestamp>/` (`report.json` and `report.md`). Every item has a status (pass, warn, fail, not applicable, or not run), the evidence and how to fix it. Exit codes: 0 passed, 1 failed, 2 the run broke.
- **Security, mapped to the OWASP Top 10 (2025 edition).** Each category is checked where it applies to a static landing. The others are reported as not applicable, with the reason. The report checks:
  - security headers in `dist/_headers`;
  - exposed or private files in `dist/` (`.env`, `.git`, keys, `brief.json`, source maps);
  - script-injection surface: inline scripts, `set:html` and `innerHTML` in the site's source, `javascript:` URLs, and whether a Content-Security-Policy restricts scripts;
  - `npm audit` of the site's production dependencies;
  - external scripts and stylesheets without Subresource Integrity, and an inventory of third-party origins;
  - mixed content and plain `http://` links;
  - `target="_blank"` links without `noopener`;
  - internal broken links;
  - a 404 page;
  - secret scanning of the site folder and its build. Secrets are always masked in the report.
- **Live checks with `--url`.** On the deployed URL the report checks:
  - valid TLS, and that HTTP redirects to HTTPS;
  - the response headers, including HSTS;
  - long-lived caching of `/_astro/` assets;
  - that private paths are not served (detected from the response content, because a host may answer every path with the home page);
  - that unknown paths return 404;
  - with `--external-links`, outbound link health. Bot challenges and rate limits are reported as unverified, never failed.
- **Performance.** QA keeps the Lighthouse details it already computes for each page, and the report reads them:
  - the LCP element and time, CLS and TBT;
  - total page weight and request count;
  - image format and size findings;
  - font loading;
  - render-blocking resources;
  - the third-party summary.

  The report adds its own measures of `dist/`: the weight of each page, oversized or legacy-format images, and font files. Lighthouse budgets stay as they are (≥ 90). The new performance measures warn and never fail. Their thresholds live in `qa.config.json` under `report`.
- **Starter hardening, copied by `new-site` into new sites.** The starter gets:
  - a Content-Security-Policy from Astro's built-in hash-based support, which blocks injected inline scripts;
  - an `HSTS` header;
  - a `Cross-Origin-Opener-Policy` header.

  Existing sites are not edited. For them the report warns until each one opts in, in its own site change.
- **CI.**
  - The report runs after QA in the root `qa` job and in each site job. A failing report blocks the deploy, like QA.
  - After a deploy, the live checks run on the preview or production URL. Each report is uploaded as an artifact (`landing-report`, `landing-report-<slug>`).
  - The sticky preview comment gets a line with the report's verdict and counts.
- **Planning-folder fix.**
  - `new-site --allow-existing-docs`, preflight and `new-landing.sh` accept a `sites/<slug>/` that holds `brief.json` and its `assets/` folder.
  - `brief import` onto the brief's own location becomes a no-op instead of copying a file onto itself.

## Capabilities

### New Capabilities

- `landing-report`: the per-landing security (OWASP Top 10) and performance report: what it checks, statuses, verdict, exit codes, masking of secrets, live checks on a deployed URL, configuration and how not-applicable categories are reported.

### Modified Capabilities

- `deployment`:
  - "Cache and security headers" now also requires HSTS and a CSP that restricts scripts on new sites.
  - New requirement: the report gates the deploy and runs against the deployed URL.
- `site-workspaces`: "Scaffold a new site" accepts a folder that holds only planning docs, `brief.json` and the brief's `assets/` folder.
- `quality-gates`: QA keeps the Lighthouse performance details per page in `report.json`, so the report can read them without a second Lighthouse run.

## Impact

- **New code:**
  - `scripts/landing-report.mjs` with modules under `scripts/report/`;
  - tests in `tests/landing-report*.test.mjs`, with failing-case fixtures under `tests/fixtures/report/`;
  - a `report` npm script.
- **Changed code:**
  - `scripts/qa/lighthouse.mjs` and `scripts/qa/report.mjs` (detail fields);
  - `scripts/lib/sites.mjs`, `scripts/new-site.mjs`, `scripts/preflight.mjs`, `scripts/brief.mjs`, `scripts/new-landing.sh`;
  - `astro.config.mjs` and `public/_headers` (the starter);
  - `qa.config.json` (`report` section);
  - `.github/workflows/ci.yml`;
  - `.claude/settings.json` (allow the report command).
- **Docs:** `CLAUDE.md`, `README.md`, `scripts/README.md`, `docs/status.md`.
- **No new dependencies.** Secret patterns, header parsing and link checks are written in the repo. `npm audit` uses the npm already installed.
- **Network:**
  - `npm audit` needs the npm registry, which CI and the cloud session already reach.
  - Live checks need the deployed host (`*.pages.dev` is already allowed).
  - Offline, these items are reported as "not run", never as passed.
- **Out of scope:**
  - real-user Web Vitals from visitors (needs a beacon endpoint, so it is a later step);
  - penetration testing;
  - opting the existing sites into the CSP (one small site change each, starting with tupathdigital if the owner wants it);
  - custom domains.
