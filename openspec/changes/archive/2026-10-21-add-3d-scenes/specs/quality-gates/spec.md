# Spec Delta

## ADDED Requirements

### Requirement: 3D scene checks
For every page containing a 3D scene, QA SHALL verify that the poster is visible and no canvas exists under reduced motion and without JavaScript, that a normal load creates the canvas without WebGL or script errors, and that the JavaScript loaded for 3D stays within the configured size budget.

#### Scenario: Canvas under reduced motion
- **WHEN** a scene creates a canvas while `prefers-reduced-motion: reduce` is set
- **THEN** QA fails naming the page and the scene

#### Scenario: WebGL error
- **WHEN** creating the scene logs a WebGL or script error
- **THEN** QA fails with the error message

#### Scenario: 3D bundle over budget
- **WHEN** the gzip size of the 3D chunks of a page exceeds the budget in the QA configuration
- **THEN** QA fails reporting the measured size and the budget
