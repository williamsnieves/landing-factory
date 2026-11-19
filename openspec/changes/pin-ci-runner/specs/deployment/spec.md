## ADDED Requirements

### Requirement: Pinned runner image
Every CI job of the factory and of an exported repository SHALL run on a named runner image (`ubuntu-24.04`), never on a moving alias such as `ubuntu-latest`. The image SHALL change only together with a Playwright version that supports it.

#### Scenario: GitHub moves the latest image
- **WHEN** GitHub points `ubuntu-latest` at an Ubuntu release the pinned Playwright does not support
- **THEN** the factory's and the exported repositories' CI keep installing Chromium and running QA on `ubuntu-24.04`

#### Scenario: Exported workflow
- **WHEN** a site is exported or synced
- **THEN** every job in its `.github/workflows/ci.yml` has `runs-on: ubuntu-24.04`
