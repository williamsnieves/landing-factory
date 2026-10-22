# Spec Delta

## ADDED Requirements

### Requirement: Archetype catalog
The system SHALL keep a catalog of composition archetypes, each describing its layout grammar, typography and imagery treatment, motion signature, the requirement signals it fits and avoids, and the traits it can lend to another archetype, in a validated machine-readable form.

#### Scenario: Invalid archetype sheet
- **WHEN** an archetype sheet lacks a required field or lends a trait it does not define
- **THEN** the archetype validator fails naming the sheet and the field

### Requirement: Blends chosen from the requirement and the references
For each new landing the system SHALL rank archetype blends (one primary, at most one secondary lending one or two traits) by how well they match the requirement's signals and the reference pattern sheets of the run, SHALL exclude blends already used by other sites, and SHALL record the chosen blend and its reasons.

#### Scenario: Blend already used
- **WHEN** the best-scoring blend is already recorded by another site
- **THEN** it is not offered and the next distinct blend is proposed

#### Scenario: Recorded reasons
- **WHEN** a landing's proposal is written
- **THEN** it names the primary and secondary archetypes, the borrowed traits and the requirement signals that led to them

### Requirement: Archetypes are a flexible base
Archetypes SHALL be a starting base, not a template: a landing MAY be reference-led, and its build MAY deviate from any archetype rule when the requirement or a reference justifies it, recording each deviation in the run log.

#### Scenario: Justified deviation
- **WHEN** the build departs from a rule of the chosen archetype because the requirement or a reference calls for it
- **THEN** the run log records the deviation and its reason, and the final check does not fail for it

#### Scenario: References change the base
- **WHEN** the run's reference sheets describe a composition that matches another archetype better than the requirement alone
- **THEN** the ranking moves that archetype up and lists the reference as a reason

#### Scenario: Reference-led landing
- **WHEN** the references give a clear direction
- **THEN** the proposal may record a custom blend, naming which reference drives which part, and archetypes only fill the gaps
