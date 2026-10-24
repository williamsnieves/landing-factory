# quality-gates Specification Delta

## ADDED Requirements

### Requirement: Lighthouse performance detail in the QA report
For every page and preset, QA's JSON report SHALL keep the performance detail of the run whose scores it reports: LCP time and element, CLS, TBT, total byte weight, request count, the image, font and render-blocking findings and the third-party summary, so other tools can read them without running Lighthouse again.

#### Scenario: Report reads the detail
- **WHEN** QA has run on a site
- **THEN** each page's Lighthouse entry in `report.json` holds the LCP element selector and time, CLS, TBT, total byte weight and request count for each preset
