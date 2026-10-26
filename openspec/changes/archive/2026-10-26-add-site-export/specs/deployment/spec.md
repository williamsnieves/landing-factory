## MODIFIED Requirements

### Requirement: Deploy each changed site
CI SHALL run QA and, when it passes and the deploy secrets of the site's target are present, deploy every site whose folder changed to its own target (Cloudflare Pages, Vercel, VPS or shared hosting), with production on the main branch and previews on other branches where the target supports them. A site whose folder holds `EXPORTED.json` lives in its own repository: CI SHALL NOT run its site job (QA, report, deploy), even when its folder or a shared path changed; it stays an npm workspace, so the root `check:sites` still type-checks it.

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

#### Scenario: Exported site
- **WHEN** a pull request changes `sites/personal-brand/` and that folder holds `EXPORTED.json`
- **THEN** CI runs no site job for `personal-brand`
