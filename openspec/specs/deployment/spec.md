# deployment Specification

## Purpose
Publishes every version of the site at a reviewable URL — a preview per branch and production from the main branch — only once QA has passed.

## Requirements

### Requirement: Preview per branch
Every push to a branch with an open pull request SHALL publish a preview of the site at a stable URL tied to that branch, on the site's own target when the target supports previews (Cloudflare Pages, Vercel); for targets without previews (VPS, shared hosting) it SHALL publish the preview on Cloudflare Pages when its secrets exist, and otherwise say on the pull request that the target has no preview.

#### Scenario: Push to a feature branch
- **WHEN** a branch with an open PR is pushed and QA passes
- **THEN** the site is published at that branch's preview URL

#### Scenario: VPS site without Cloudflare secrets
- **WHEN** a pull request changes a site whose target is `vps` and the Cloudflare secrets are missing
- **THEN** QA and the static report run, nothing is deployed, and the site's PR comment says the target has no preview

### Requirement: Production from the main branch
A push to the main branch SHALL publish the site at the project's production URL.

#### Scenario: Merge to main
- **WHEN** a PR is merged into `main` and QA passes
- **THEN** the production URL serves the new version

### Requirement: Deployment gated by QA
Deployment MUST NOT run if QA failed for the same commit.

#### Scenario: Failed QA
- **WHEN** QA fails for a commit
- **THEN** no deployment is created for that commit and the deploy check shows as skipped

### Requirement: Preview URL on the PR
The system SHALL post the preview URL on the pull request in a single comment that is updated on every deployment.

#### Scenario: Second push
- **WHEN** the same PR branch is pushed a second time
- **THEN** the existing comment is updated with the new URL and commit, without creating another comment

### Requirement: Secrets kept out of the repo
Deployment credentials MUST be read from CI environment secrets and MUST NOT appear in versioned files or logs.

#### Scenario: Missing secrets
- **WHEN** the workflow runs without the secrets configured
- **THEN** the deploy step ends with a message naming the missing secrets, without exposing values

### Requirement: Cache and security headers
The published site SHALL serve hashed assets with long-lived immutable caching, and HTML pages with basic security headers (nosniff, referrer-policy, frame-ancestors). Sites created from the starter SHALL also send HSTS and Cross-Origin-Opener-Policy and ship a Content-Security-Policy whose `script-src` admits only the site's own and hashed scripts.

#### Scenario: Hashed asset
- **WHEN** a file under `/_astro/` of the published site is requested
- **THEN** the response includes `Cache-Control` with `immutable` and a `max-age` of at least one year

#### Scenario: New site
- **WHEN** a site is created from the starter and built
- **THEN** its built headers include `Strict-Transport-Security` and its pages carry a CSP whose `script-src` does not contain `'unsafe-inline'`
- **AND** QA passes with no CSP violation in the browser console

### Requirement: Deploy each changed site
CI SHALL run QA and, when it passes and the deploy secrets of the site's target are present, deploy every site whose folder changed to its own target (Cloudflare Pages, Vercel, VPS or shared hosting), with production on the main branch and previews on other branches where the target supports them.

#### Scenario: PR touching one site
- **WHEN** a pull request changes files only under `sites/panaderia/`
- **THEN** CI runs QA for `panaderia` and deploys a preview of it to its own Pages project
- **AND** sites that did not change are not built or deployed

#### Scenario: Shared change
- **WHEN** a pull request changes shared files (dependencies, the motion layer source or the CI workflow)
- **THEN** CI runs QA and deploys previews for every site

#### Scenario: Merge of a VPS site
- **WHEN** a change to a site whose target is `vps` is merged into `main` and the SSH secrets exist
- **THEN** CI deploys a new release to the server, switches to it and runs the live report on the site's URL

### Requirement: One preview comment per site
On pull requests, CI SHALL keep one comment per deployed site with that site's preview URLs, updated in place on later pushes.

#### Scenario: Two sites changed
- **WHEN** a pull request changes two sites
- **THEN** the pull request shows two preview comments, one per site, each updated on later pushes

### Requirement: Deployment gated by the landing report
CI SHALL run the landing report on each built landing after QA and MUST NOT deploy a landing whose report failed. After a deploy, CI SHALL run the report's live checks on the deployed URL, upload each report as an artifact and add the verdict to the pull request's preview comment.

#### Scenario: Secret in a site
- **WHEN** a pull request adds a file with a private key to `sites/panaderia/`
- **THEN** the panaderia report fails, no preview is deployed for it and the job fails

#### Scenario: Preview deployed
- **WHEN** a site's preview is deployed
- **THEN** the live checks run on the preview URL and the site's preview comment shows the report's verdict and counts per status

### Requirement: Exported sites are skipped
A site whose folder holds `EXPORTED.json` lives in its own repository: CI SHALL NOT run its site job (QA, report, deploy), even when its folder or a shared path changed. It stays an npm workspace, so the root `check:sites` still type-checks it.

#### Scenario: Exported site
- **WHEN** a pull request changes `sites/personal-brand/` and that folder holds `EXPORTED.json`
- **THEN** CI runs no site job for `personal-brand`
