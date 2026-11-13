## ADDED Requirements

### Requirement: First sync seeds CMS files
When nothing exists in the clone at a CMS path (the file of a `file` entry, the folder of a `collection`), `sync-export.mjs` SHALL add the factory's files under it once and list each as `added <file> (first copy for the CMS)`. Once the path exists in the clone, sync SHALL never add, change or delete a file under it.

#### Scenario: First sync after moving content to the CMS
- **WHEN** the site's `.pages.yml` names `src/content/career.json` and the clone has no such file
- **THEN** sync adds it, and the clone builds

#### Scenario: Later sync after an edit in the CMS
- **WHEN** the clone's `src/content/career.json` was edited in the CMS
- **THEN** sync keeps it and lists it as kept

#### Scenario: Entry deleted in the CMS
- **WHEN** a file of a collection folder that exists in the clone was deleted through the CMS
- **THEN** sync does not add it back and lists it as kept
