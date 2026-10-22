# landing-generation Specification

## Purpose
Generates, with a single command, an original and deployable landing for a given niche, reusing abstract patterns from references and meeting the system's quality criteria with no manual touch-ups.

## Requirements

### Requirement: Single generation command
The system SHALL provide a command that, given a slug, a niche and optionally `patterns/` sheets, creates the site project and runs brief, synthesis, design system, build and QA end to end with no intervention when automatic mode is requested.

#### Scenario: Automatic run
- **WHEN** the command runs with slug, niche and automatic mode
- **THEN** at the end the site project exists with its proposal, design system, the built landing and the QA report

### Requirement: Reviewable proposal before building
Before building, the system SHALL produce a proposal with page map, sections and their purpose, motion plan and sheets used; in interactive mode it MUST stop until the user approves or edits it.

#### Scenario: Interactive mode
- **WHEN** the command runs without automatic mode
- **THEN** the proposal is saved and the run stops awaiting approval before generating code

### Requirement: Per-niche design system
Every site SHALL have a `design-system/<slug>/MASTER.md` with the niche's pattern, style, palette, fonts and anti-patterns, and the site's tokens SHALL be derived from it.

#### Scenario: Derived tokens
- **WHEN** the site is generated
- **THEN** the color and typography values in the site's tokens match those defined in its `MASTER.md`

### Requirement: Original and licensed content
All site copy MUST be original, and every external image or component MUST have a license that allows its use and MUST be listed in the site's `CREDITS.md` with source, author and license.

#### Scenario: Uncredited image
- **WHEN** the site contains an external image not listed in `CREDITS.md`
- **THEN** the generation's final check fails naming the image

#### Scenario: Photo overused
- **WHEN** the same source photo is used in more than two places on the site
- **THEN** the final check fails naming the photo and its uses

#### Scenario: Copy from a reference
- **WHEN** a sentence on the site literally matches text from a reference site used
- **THEN** generation is not considered done until it is rewritten

### Requirement: Preflight before generation
Before creating anything, the command SHALL check that the package registry and the image sources answer (through the configured proxy when one is set), that a Chromium for QA is available and that the slug is free, and MUST exit non-zero naming every missing item when a check fails.

#### Scenario: Image host blocked
- **WHEN** the image source host is not reachable from the environment
- **THEN** the command exits non-zero before creating the site folder and names the host to allow

### Requirement: QA loop until passing
After building, the system SHALL run QA, fix the reported failures and repeat until it passes or a configurable maximum of attempts is reached; if attempts run out, it MUST end in a failed state with a summary of what is left.

#### Scenario: Automatic fix
- **WHEN** the first QA run fails due to overflow at 375 px
- **THEN** the system fixes the overflow and runs QA again

#### Scenario: Attempts exhausted
- **WHEN** QA still fails after the maximum number of attempts
- **THEN** the command exits with a non-zero code and the run log lists the remaining failures

### Requirement: Run log
Every generation SHALL leave a log with the inputs used, design decisions, QA attempts with their result, and total duration.

#### Scenario: Later review
- **WHEN** the log of a finished generation is opened
- **THEN** it shows the sheets used, the number of QA attempts and the final result

### Requirement: Diversity across niches
Sites generated for different niches SHALL be visually different: different palette, typography and hero structure.

#### Scenario: Three niches
- **WHEN** sites are generated for three different niches
- **THEN** no pair of sites shares palette, main font family and hero type all at once

#### Scenario: Same look as an existing site
- **WHEN** a new site's primary color, display font and hero type all match an existing site in `sites/`
- **THEN** the final check fails naming the existing site

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
