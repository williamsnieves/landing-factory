# Tasks

## 1. Configuration

- [ ] 1.1 Add `wrangler` (pinned version) and the Pages project config (name from site config, output `dist/`); verify `npx wrangler pages deploy --help` and that no credentials are in files
- [ ] 1.2 Add `public/_headers` with immutable caching for `/_astro/*` and security headers; verify the file appears in `dist/` after the build
- [ ] 1.3 Document in `README.md` how to create the Cloudflare project, the minimal token and the `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets; verify the steps are complete by following them once

## 2. Workflow

- [ ] 2.1 Merge QA and deployment into `.github/workflows/ci.yml` (`qa` job uploads `dist/`, `deploy` job with `needs: qa`); verify a commit with failing QA does not deploy
- [ ] 2.2 Deploy previews with `--branch` on PRs and production on `main`; verify this change's PR gets a preview URL that responds 200
- [ ] 2.3 A single, updatable comment with the preview URL; verify with two pushes that only one comment exists
- [ ] 2.4 Clear message when secrets are missing or the source is a fork; verify by running without secrets (test branch) that the job fails/skips without exposing values
- [ ] 2.5 Check with `curl -I` on the preview that `/_astro/*` carries `immutable` and pages carry the security headers

## Workflow follow-up

- Open PR, review and merge (requires the user to have created the secrets).
- `/opsx:archive add-cloudflare-preview-deploy` after merge.
