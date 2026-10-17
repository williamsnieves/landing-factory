# Proposal

## Why

The roadmap calls for deploying with a push and an automatic preview per branch, so each landing can be reviewed on a real device before merging. Deployment must also happen only if QA passes, so nothing below the thresholds reaches a shareable URL.

## What Changes

- GitHub Actions workflow that, after QA, deploys `dist/` to Cloudflare Pages:
  - on PRs and branches → preview deployment with its own URL per branch;
  - on `main` → production deployment.
- A comment on the PR with the preview URL (updated on every push, never duplicated).
- Project configuration (`wrangler.toml` / project name) and documentation of the required secrets.
- Static headers (`public/_headers`) with long caching for hashed assets and basic security headers.

## Capabilities

### New Capabilities
- `deployment`: publishing the static site with per-branch previews and production from `main`, gated by QA, with the URL visible on the PR.

### Modified Capabilities
<!-- None. -->

## Impact

- Requires the GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (created by the user; never committed).
- Dev dependency: `wrangler` (pinned version).
- Depends on `setup-astro-starter` and `add-qa-pipeline`.
