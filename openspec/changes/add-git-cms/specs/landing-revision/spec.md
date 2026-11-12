## ADDED Requirements

### Requirement: CMS-managed content in a revision round
On a site with `.pages.yml`, a feedback item that only changes content under a CMS path SHALL be classified `cms`, MUST NOT be edited by the round, and SHALL be listed in `REVISION.md` under "Edit in the CMS" with the file it lives in. Other items in the same feedback SHALL be handled as before, and `revisions.json` SHALL accept the `cms` kind.

#### Scenario: New job in the feedback
- **WHEN** the feedback of a CMS site asks to add a job and to change the hero heading
- **THEN** the round edits the heading, lists the job under "Edit in the CMS" naming the jobs collection, and records one `copy` and one `cms` item
