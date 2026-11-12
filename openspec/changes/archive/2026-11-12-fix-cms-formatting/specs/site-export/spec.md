## ADDED Requirements

### Requirement: CMS files are not formatted in the repository
When the site has `.pages.yml`, the exported `.prettierignore` SHALL list each CMS path, a file entry as `/<path>` and a collection as `/<path>/`, so that a file saved by the CMS in its own formatting never fails `format:check`.

#### Scenario: Save from the CMS
- **WHEN** a CMS file in the exported repository is rewritten as two-space indented JSON with no final newline
- **THEN** `npm run format:check` still passes in that repository
