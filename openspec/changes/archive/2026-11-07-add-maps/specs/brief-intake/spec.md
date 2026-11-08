## ADDED Requirements

### Requirement: Map coordinates in the brief
The brief SHALL accept `contact.geo` (`lat` -90..90, `lng` -180..180, optional `zoom` 12..18) and `contact.mapInteractive` (boolean). On a prospect brief `contact.geo` SHALL need a source or an `assumed` entry. `brief missing` SHALL ask for the coordinates when the brief has an address, and the intake SHALL never geocode or invent them.

#### Scenario: Out of range
- **WHEN** `contact.geo.lat` is 95
- **THEN** validation fails naming `contact.geo.lat`

#### Scenario: Prospect without a source
- **WHEN** a prospect brief has `contact.geo` with no source and no `assumed` entry
- **THEN** validation fails naming `contact.geo`
