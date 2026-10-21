# Spec Delta

## ADDED Requirements

### Requirement: Archetype catalog
The system SHALL keep a catalog of composition archetypes, each describing its layout grammar, typography and imagery treatment, motion signature, the requirement signals it fits and avoids, and the traits it can lend to another archetype, in a validated machine-readable form.

#### Scenario: Invalid archetype sheet
- **WHEN** an archetype sheet lacks a required field or lends a trait it does not define
- **THEN** the archetype validator fails naming the sheet and the field

### Requirement: Blends chosen from the requirement
For each new landing the system SHALL rank archetype blends (one primary, at most one secondary lending one or two traits) by how well they match the requirement's signals, SHALL exclude blends already used by other sites, and SHALL record the chosen blend and its reasons.

#### Scenario: Blend already used
- **WHEN** the best-scoring blend is already recorded by another site
- **THEN** it is not offered and the next distinct blend is proposed

#### Scenario: Recorded reasons
- **WHEN** a landing's proposal is written
- **THEN** it names the primary and secondary archetypes, the borrowed traits and the requirement signals that led to them
