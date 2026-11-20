# Proposal: pin-ci-runner

## Why

On 2026-11-19 the CI of the exported repository williamsnieves/tupathdigital failed at "Install Chromium": GitHub moved `ubuntu-latest` to Ubuntu 26.04, and the pinned Playwright (1.56.1) "does not support chromium on ubuntu26.04-x64", so `npx playwright install --with-deps chromium` exits 1 and QA, the report and the deploy never run. The factory's workflow and the export template both use `ubuntu-latest`, so every factory run and every exported repository breaks the same way.

## What Changes

- **Pinned runner image.** Every job in `.github/workflows/ci.yml` and in `scripts/export/templates/ci.yml` runs on `ubuntu-24.04` instead of `ubuntu-latest`, so a runner image change never breaks QA silently. Moving to a newer image is a deliberate change made together with a Playwright version that supports it.
- **Exported repositories** get the fix through `sync-export.mjs` (tupathdigital and personal-brand).

## Capabilities

### Modified Capabilities

- `deployment`: the CI runs on a pinned runner image.

## Impact

- **Code:** `.github/workflows/ci.yml`, `scripts/export/templates/ci.yml`.
- **Tests:** none new; the factory's own CI run on this branch is the check.
- **No site changes.**
