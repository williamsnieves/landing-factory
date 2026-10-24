# quality-gates Specification

## Purpose
Measures automatically and reproducibly whether a landing meets the MVP acceptance criteria, and returns a verdict and report an agent can use to fix issues and retry.

## Requirements

### Requirement: Single QA command
The system SHALL provide a QA command that builds the site, serves it locally, runs every check on each generated page and exits with code 0 only if all checks meet their thresholds.

#### Scenario: Passing landing
- **WHEN** QA runs on a site that meets every threshold
- **THEN** the command exits with code 0 and the report marks the verdict as passed

#### Scenario: Failing landing
- **WHEN** any check falls short of its threshold
- **THEN** the command exits with a non-zero code and the report lists each failure with page, viewport and metric

### Requirement: Screenshots at three widths
QA SHALL capture a full-page screenshot of each page at 375, 768 and 1440 px wide.

#### Scenario: Screenshots generated
- **WHEN** QA finishes on a site with one page
- **THEN** three screenshots of that page exist, one per width, in the report folder

### Requirement: Overflow detection
QA MUST fail if, at any of the three widths, the document scrolls horizontally or any visible text element is clipped by its container.

#### Scenario: Element wider than the viewport
- **WHEN** at 375 px an element sticks out past the viewport width
- **THEN** QA fails and identifies the element's selector and width

### Requirement: Lighthouse thresholds
QA MUST fail if any page's Lighthouse performance, accessibility or SEO score is below the configured threshold, which defaults to 90.

#### Scenario: Low performance
- **WHEN** a page scores 85 on performance with a threshold of 90
- **THEN** QA fails and the report includes the score and the highest-impact audits

### Requirement: Reduced-motion check
QA MUST load each page with `prefers-reduced-motion: reduce` and fail if any content marked as animatable stays invisible, or if smooth scroll or section pinning remains active.

#### Scenario: Reveal that never shows
- **WHEN** under reduced motion an animatable element stays at opacity 0 after load
- **THEN** QA fails naming the element

### Requirement: Generic-design detection
QA MUST run impeccable's deterministic detector on the landing's code and fail if it reports major-severity findings.

#### Scenario: Major finding
- **WHEN** the detector reports a major-severity finding
- **THEN** QA fails and the report includes the rule, file and line

### Requirement: Machine- and human-readable report
Each run SHALL produce a JSON report with verdict, per-page and per-viewport metrics and a list of failures, plus an equivalent Markdown summary, in its own folder per run.

#### Scenario: Agent reads the report
- **WHEN** an agent reads the JSON from a failed QA run
- **THEN** for each failure it can get the check type, page, viewport, measured value and threshold

### Requirement: Configurable thresholds
Thresholds SHALL be read from the site's config file and, if it does not exist, the roadmap defaults SHALL apply.

#### Scenario: No config
- **WHEN** QA runs without a config file
- **THEN** Lighthouse ≥ 90 for performance, accessibility and SEO, widths 375/768/1440 and zero major impeccable findings apply

### Requirement: QA on pull requests
Every pull request SHALL run QA in CI and attach the report and screenshots as a downloadable artifact.

#### Scenario: PR opened
- **WHEN** a pull request is opened or updated
- **THEN** QA runs and its result shows as a PR check with the report attached

### Requirement: QA per site
The QA command SHALL accept a site slug and run every check (build, screenshots, overflow, reduced motion, Lighthouse, impeccable on that site's source) against that site only, writing its report to a per-site folder.

#### Scenario: QA one site
- **WHEN** QA runs for site `panaderia`
- **THEN** it builds and serves `sites/panaderia`, checks every page of that site, runs impeccable on `sites/panaderia/src`, and writes the report under `qa/panaderia/`

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

### Requirement: Lighthouse performance detail in the QA report
For every page and preset, QA's JSON report SHALL keep the performance detail of the run whose scores it reports: LCP time and element, CLS, TBT, total byte weight, request count, the image, font and render-blocking findings and the third-party summary, so other tools can read them without running Lighthouse again.

#### Scenario: Report reads the detail
- **WHEN** QA has run on a site
- **THEN** each page's Lighthouse entry in `report.json` holds the LCP element selector and time, CLS, TBT, total byte weight and request count for each preset
