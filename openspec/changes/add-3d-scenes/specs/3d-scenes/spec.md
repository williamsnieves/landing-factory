# Spec Delta

## ADDED Requirements

### Requirement: Poster-first 3D scenes
The system SHALL provide a scene component that renders a static poster image as HTML and replaces it with a WebGL canvas only when JavaScript runs, WebGL is available, reduced motion is not requested and the scene is near the viewport.

#### Scenario: Scene enters the viewport
- **WHEN** a page with a scene is scrolled so the scene is within one viewport, with JavaScript on and no reduced-motion preference
- **THEN** the 3D code is loaded at that moment and a canvas replaces the poster

#### Scenario: No JavaScript
- **WHEN** the page loads with JavaScript disabled
- **THEN** the poster image is visible with its alternative text and no canvas exists

#### Scenario: WebGL unavailable or scene error
- **WHEN** WebGL cannot be created or the scene throws while starting
- **THEN** the poster stays visible and the page keeps working

### Requirement: Reduced motion and scene lifecycle
Under `prefers-reduced-motion: reduce` the system MUST NOT create a canvas; otherwise it SHALL pause rendering while the scene is off-screen or the tab is hidden and SHALL release GPU resources when the page is left.

#### Scenario: Reduced motion
- **WHEN** the browser reports `prefers-reduced-motion: reduce`
- **THEN** only the poster is shown and no 3D code is downloaded

#### Scenario: Scene off-screen
- **WHEN** the scene leaves the viewport
- **THEN** its render loop stops until it is visible again

### Requirement: Scroll-linked scenes
A scene SHALL be able to follow the scroll progress of its section, receiving a value from 0 to 1, using the existing scroll animation layer.

#### Scenario: Scrubbed scene
- **WHEN** the user scrolls through a section marked to scrub its scene
- **THEN** the scene receives the section's scroll progress and updates accordingly

### Requirement: Scenes built from code and themed by tokens
Scenes SHALL be TypeScript modules built from code (geometry, materials, particles, shaders) that read their colors from the site's design tokens; external 3D model files are not part of this capability.

#### Scenario: Retheming
- **WHEN** the site's color tokens change
- **THEN** the scene uses the new colors without editing the scene code
