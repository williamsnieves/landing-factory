## ADDED Requirements

### Requirement: Sync keeps CMS-managed content
For a site with `.pages.yml`, `sync-export.mjs` MUST NOT add, change or delete a file under a CMS path of the factory's `.pages.yml` in the clone. When the factory copy of such a file differs from the clone's, sync SHALL keep the clone's, list the file as `kept (managed by the CMS)` and name the `cms.mjs pull` command.

#### Scenario: Edit made in the CMS
- **WHEN** a product was edited through the CMS in the repository and sync runs from a factory that still has the old file
- **THEN** the clone keeps the edited file, the output lists it as kept and names the pull command, and other files sync as usual

#### Scenario: Configuration changes sync
- **WHEN** the factory's `.pages.yml` changed
- **THEN** sync updates `.pages.yml` in the clone like any other file

### Requirement: CMS steps in the owner checklist
For a site with `.pages.yml`, `handoff.mjs plan` SHALL add the Pages CMS steps: install its GitHub App on this repository only, open the repository in Pages CMS, invite editors by email, and note that each save is a commit on the production branch that CI checks before deploying.

#### Scenario: Site without a CMS
- **WHEN** `plan` runs for a site without `.pages.yml`
- **THEN** the checklist has no CMS steps
