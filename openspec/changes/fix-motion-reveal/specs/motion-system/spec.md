## MODIFIED Requirements

### Requirement: Declarative animation primitives
The system SHALL provide `reveal`, `pin` and `parallax` primitives that can be applied to any section through attributes or a wrapper component, without writing animation code in the section. A finished reveal MUST leave the element at its layout position, opaque and with no transform offset.

#### Scenario: Reveal on entering the viewport
- **WHEN** an element marked with reveal enters the viewport
- **THEN** it transitions from its initial state (offset and transparent) to its final visible state

#### Scenario: Reveal end state
- **WHEN** a reveal tween has finished on a page where the stylesheet gives `[data-reveal]` a start offset
- **THEN** the element's computed opacity is 1
- **AND** its computed transform is `none` or has no translation beyond 1px

#### Scenario: Pinned section
- **WHEN** a section marked with pin reaches the top of the viewport
- **THEN** it stays pinned for the configured scroll distance and then resumes normal flow
