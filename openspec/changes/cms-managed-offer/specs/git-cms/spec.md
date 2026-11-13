## ADDED Requirements

### Requirement: CMS ownership of the offer
A `content[]` entry named `offer` in a valid `.pages.yml` SHALL declare that the CMS manages the site's products, so the brief's `offer` is only the starting record. `cms.mjs check` SHALL print the brief sections the CMS owns.

#### Scenario: Check output
- **WHEN** `cms.mjs check --site <slug>` runs on a valid `.pages.yml` with an entry named `offer`
- **THEN** it exits 0 and prints that the CMS owns the brief's `offer`

#### Scenario: No offer entry
- **WHEN** a valid `.pages.yml` has no entry named `offer`
- **THEN** the check prints no ownership line and the final check treats the offer as before
