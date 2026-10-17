# motion-system Specification

## Purpose
Provides reusable animation primitives (smooth scroll, reveal, pin, parallax) so landings get high-quality motion without sacrificing accessibility or performance.

## Requirements

### Requirement: Optional smooth scroll
The system SHALL provide per-page opt-in smooth scrolling and SHALL keep it in sync with scroll-driven animations.

#### Scenario: Smooth scroll on
- **WHEN** a page enables smooth scroll and the user has not requested reduced motion
- **THEN** scrolling is smoothly interpolated and scroll-driven animations follow the interpolated position

### Requirement: Declarative animation primitives
The system SHALL provide `reveal`, `pin` and `parallax` primitives that can be applied to any section through attributes or a wrapper component, without writing animation code in the section.

#### Scenario: Reveal on entering the viewport
- **WHEN** an element marked with reveal enters the viewport
- **THEN** it transitions from its initial state (offset and transparent) to its final visible state

#### Scenario: Pinned section
- **WHEN** a section marked with pin reaches the top of the viewport
- **THEN** it stays pinned for the configured scroll distance and then resumes normal flow

### Requirement: Respect prefers-reduced-motion
When the user prefers reduced motion, the system MUST disable smooth scroll, pin and parallax and MUST show reveal elements directly in their final state.

#### Scenario: User with reduced motion
- **WHEN** the browser reports `prefers-reduced-motion: reduce`
- **THEN** smooth scroll is not initialized
- **AND** all reveal elements are visible without animation
- **AND** no section is pinned

### Requirement: Content visible without JavaScript
Animated content MUST be visible and readable if JavaScript does not run.

#### Scenario: JavaScript disabled
- **WHEN** the page loads with JavaScript disabled
- **THEN** all elements marked with reveal are visible

### Requirement: Animation cleanup
Animations SHALL be released when leaving the page or unmounting the island that created them, leaving no active listeners.

#### Scenario: Navigating between pages
- **WHEN** navigating to another page with view transitions enabled
- **THEN** the previous page's animation instances are destroyed
