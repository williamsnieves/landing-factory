## ADDED Requirements

### Requirement: Reveal check waits for the motion layer
The `reveal-end-state` check MUST NOT fail a reveal only because the motion layer initialised after QA's first scroll-through. QA MUST wait for network idle (bounded) before scrolling and, while reveals are off, scroll through the page again until they settle or the timeout passes. A reveal that stays shifted MUST still fail.

#### Scenario: Motion layer initialises late
- **WHEN** the motion layer starts its scroll triggers 2 s after `load` and reveals below the first viewport play only when scrolled to
- **THEN** QA passes `reveal-end-state` because it scrolls through the page again

#### Scenario: Shifted end state
- **WHEN** a reveal ends with the stylesheet start offset applied
- **THEN** QA still fails with check `reveal-end-state` and metric `transform`
