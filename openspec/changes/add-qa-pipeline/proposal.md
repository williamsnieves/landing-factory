# Proposal

## Why

The MVP success criterion is that a landing meets objective thresholds (Lighthouse ≥ 90, no overflow at 375/768/1440, reduced motion, no major impeccable findings) **with no manual touch-ups**. For Claude to iterate on its own until they are met, it needs a QA command that measures everything and returns a machine-readable verdict.

## What Changes

- `scripts/qa.mjs` (exposed as `npm run qa`): build, preview server, and for each page:
  - full-page screenshots at 375, 768 and 1440 px in `qa/<timestamp>/`;
  - horizontal overflow and clipped-text detection;
  - a check under `prefers-reduced-motion: reduce`;
  - Lighthouse (performance, accessibility, SEO, best practices) on mobile and desktop;
  - `impeccable detect` on the source code.
- Report `qa/<timestamp>/report.json` + `report.md` and exit code 0/1 based on thresholds.
- Thresholds configurable in `qa.config.json`, defaulting to the roadmap values.
- GitHub Actions workflow running QA on every PR and uploading the report and screenshots as an artifact.

## Capabilities

### New Capabilities
- `quality-gates`: automatic verification of a landing against the MVP acceptance criteria, with a report and verdict an agent can iterate on.

### Modified Capabilities
<!-- None. -->

## Impact

- Dev dependencies: `playwright` (or `@playwright/test`), `lighthouse`, `chrome-launcher`, `impeccable` (via npx, pinned version).
- Requires Chromium (preinstalled in cloud sessions; installed in the CI job).
- New workflow `.github/workflows/qa.yml`.
- Depends on `setup-astro-starter`. Used by `add-new-landing-skill` and deployment.
