# Spec Delta

## ADDED Requirements

### Requirement: Planned 3D scenes
A generated landing MAY include up to two 3D scenes; the proposal SHALL describe each scene's purpose, poster, scroll behavior and reduced-motion fallback before it is built, and the final check SHALL fail if a scene has no credited or self-made poster.

#### Scenario: Scene without poster
- **WHEN** a built page contains a scene element without a poster image recorded in the site's asset manifest
- **THEN** the final check fails naming the scene

### Requirement: Museum open-access images
Image sourcing SHALL support public-domain open-access museum collections in addition to Wikimedia Commons, recording each image's source, museum credit line and license in the site's asset manifest.

#### Scenario: Museum image download
- **WHEN** an image is taken from a museum open-access collection
- **THEN** the manifest records the object page, the museum's credit line and a public-domain license, and the credits list it
