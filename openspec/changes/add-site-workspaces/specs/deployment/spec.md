# Spec Delta

## ADDED Requirements

### Requirement: Deploy each changed site
CI SHALL run QA and, when it passes and the deploy secrets are present, deploy every site whose folder changed, each to the Pages project named in its own site configuration, with production on the main branch and previews on other branches.

#### Scenario: PR touching one site
- **WHEN** a pull request changes files only under `sites/panaderia/`
- **THEN** CI runs QA for `panaderia` and deploys a preview of it to its own Pages project
- **AND** sites that did not change are not built or deployed

#### Scenario: Shared change
- **WHEN** a pull request changes shared files (dependencies, the motion layer source or the CI workflow)
- **THEN** CI runs QA and deploys previews for every site

### Requirement: One preview comment per site
On pull requests, CI SHALL keep one comment per deployed site with that site's preview URLs, updated in place on later pushes.

#### Scenario: Two sites changed
- **WHEN** a pull request changes two sites
- **THEN** the pull request shows two preview comments, one per site, each updated on later pushes
