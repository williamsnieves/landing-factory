# Spec Delta

## ADDED Requirements

### Requirement: Layout-based diversity
The final check SHALL compare a new site's measured layout signature and viewport screenshot hashes with every other site, and SHALL fail when the layouts are closer than the configured thresholds, naming the closest site and features, in addition to comparing primary color, display font and hero type.

#### Scenario: Same layout, new colors
- **WHEN** a new site reuses another site's section patterns, radii, button shape and footer type with different colors and fonts
- **THEN** the final check fails naming that site and the shared features

#### Scenario: No worked-example anchoring
- **WHEN** a landing is generated
- **THEN** the generation instructions and templates do not point to another generated site as the model to follow
