# deployment Specification Delta

## MODIFIED Requirements

### Requirement: Preview per branch
Every push to a branch with an open pull request SHALL publish a preview of the site at a stable URL tied to that branch, on the site's own target when the target supports previews (Cloudflare Pages, Vercel); for targets without previews (VPS, shared hosting) it SHALL publish the preview on Cloudflare Pages when its secrets exist, and otherwise say on the pull request that the target has no preview.

#### Scenario: Push to a feature branch
- **WHEN** a branch with an open PR is pushed and QA passes
- **THEN** the site is published at that branch's preview URL

#### Scenario: VPS site without Cloudflare secrets
- **WHEN** a pull request changes a site whose target is `vps` and the Cloudflare secrets are missing
- **THEN** QA and the static report run, nothing is deployed, and the site's PR comment says the target has no preview

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
