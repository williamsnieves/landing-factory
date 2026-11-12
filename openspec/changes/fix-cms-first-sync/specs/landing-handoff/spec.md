## ADDED Requirements

### Requirement: First sync seeds CMS files
When a file under a CMS path exists in the factory but not in the clone, `sync-export.mjs` SHALL add it and list it as `added (first copy for the CMS)`. A file under a CMS path that the clone already has SHALL never be changed or deleted.

#### Scenario: First sync after moving content to the CMS
- **WHEN** the site's `.pages.yml` names `src/content/career.json` and the clone has no such file
- **THEN** sync adds it, and the clone builds

#### Scenario: Later sync after an edit in the CMS
- **WHEN** the clone's `src/content/career.json` was edited in the CMS
- **THEN** sync keeps it and lists it as kept
