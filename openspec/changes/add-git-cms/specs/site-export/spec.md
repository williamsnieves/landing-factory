## ADDED Requirements

### Requirement: CMS configuration in the export
When `sites/<slug>/.pages.yml` exists, the export SHALL first run the CMS configuration check (exit 1, writing nothing, when it fails) and SHALL copy `.pages.yml` to the root of the repository, where Pages CMS reads it. No other file is added for the CMS.

#### Scenario: Export of a CMS site
- **WHEN** a site with a valid `.pages.yml` is exported
- **THEN** the repository root holds `.pages.yml` with the same content, and the build and QA pass there

#### Scenario: Invalid configuration
- **WHEN** the site's `.pages.yml` has a `media` key
- **THEN** the export exits 1 naming the problem and writes nothing
