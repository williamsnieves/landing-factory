## ADDED Requirements

### Requirement: Calm statement archetype
The catalog SHALL include a `calm-statement` archetype for calm but striking pages that do not depend on photographs: one idea per screen set very large, soft full-bleed colour fields, one drawn shape that recurs through the page and slow reveals. It SHALL fit `calm`, `serious`, `premium`, `local-service`, `few-assets`, `conversion-first` and `educational`, and SHALL lend the traits `statement-band` and `line-art-thread`.

#### Scenario: Calm professional service without photos
- **WHEN** a brief's signals are `local-service`, `calm`, `serious`, `conversion-first` and `few-assets` with a `balanced` impact
- **THEN** `pick-archetypes` ranks `calm-statement` above `swiss-grid-minimal` and `warm-local-service`

### Requirement: Impact level in the ranking
Every archetype sheet SHALL list the impact levels (`quiet`, `balanced`, `bold`) its grammar can deliver, and the picker SHALL add one point to a primary whose list holds the brief's impact level and subtract one when it does not, using `balanced` and reporting it as assumed when the brief gives none.

#### Scenario: Quiet impact requested
- **WHEN** the brief sets `brand.impact` to `quiet`
- **THEN** `swiss-grid-minimal` gains a point, `calm-statement` loses one, and the output names the level

#### Scenario: Sheet without impact
- **WHEN** an archetype sheet has no `impact` list or lists an unknown level
- **THEN** `validate:archetypes` fails naming the sheet and the field
