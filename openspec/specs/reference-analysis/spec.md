# reference-analysis Specification

## Purpose
Turns reference websites into abstract design and motion pattern sheets, reusable to create original landings, without storing or reproducing protected content from the analyzed site.

## Requirements

### Requirement: Analyze a URL into an abstract sheet
Given a public URL and an optional note on what is interesting about it, the system SHALL generate a sheet at `patterns/<slug>.md` with: section map and order, hero type, grid and spacing, type scale, palette in generic terms, density, motion inventory with the technique behind each, and detected libraries.

#### Scenario: Successful analysis
- **WHEN** the analysis runs on a reachable URL with no mining reservation
- **THEN** `patterns/<slug>.md` is created with every template section filled in
- **AND** the sheet records the URL, analysis date and the given focus

### Requirement: Respect rights-holder reservations
Before analyzing, the system MUST check `robots.txt` and text-and-data-mining reservation signals for the site, and MUST abort without producing a sheet if agent access is disallowed or an express reservation exists.

#### Scenario: Site with a reservation
- **WHEN** the site's `robots.txt` disallows the path or declares a mining reservation
- **THEN** the analysis stops, no sheet is saved and the reason is reported

### Requirement: No site content in the repo
The sheet and any versioned file MUST NOT contain images, videos, 3D models, logos, illustrations, text from the site (beyond its title and URL) or fragments of its source code.

#### Scenario: Validating the sheet
- **WHEN** a sheet that includes an image URL from the site, a copied code block or sentences of its copy is validated
- **THEN** validation fails naming the offending line

#### Scenario: Temporary material
- **WHEN** the analysis finishes, successfully or with an error
- **THEN** temporary screenshots and dumps have been deleted and none remain in the versioned area of the repo

### Requirement: Generic palette and typography
The sheet SHALL describe colors and typefaces in generic terms (for example "near-black background, warm saturated accent", "large grotesque + serif body") and MUST NOT include the site's proprietary brand font names or exact hex values of its identity.

#### Scenario: Palette in the sheet
- **WHEN** the palette section of a generated sheet is reviewed
- **THEN** it contains role and tone descriptions, not color codes

### Requirement: Motion technique detection
For each relevant animation observed, the sheet SHALL record the trigger (load, scroll, hover), the type (reveal, pin, parallax, scrub, page transition, shader/3D) and the likely library or technique with its confidence level.

#### Scenario: Scroll-pinned section
- **WHEN** the site pins a section while animating its content with scroll
- **THEN** the sheet includes an entry with trigger scroll, type pin+scrub and the detected library

### Requirement: Validatable sheet format
Every sheet SHALL follow a template with frontmatter (url, slug, date, focus, libraries) and fixed sections, and the repo SHALL provide a validator that checks structure and content rules.

#### Scenario: Incomplete sheet
- **WHEN** a sheet missing the motion section is validated
- **THEN** the validator fails naming the missing section

### Requirement: Unreachable URL
If the URL does not respond, requires authentication or blocks the automated browser, the system SHALL abort without a sheet and explain why.

#### Scenario: Login page
- **WHEN** the URL redirects to a login form
- **THEN** no sheet is generated and the user is told the page is not public
