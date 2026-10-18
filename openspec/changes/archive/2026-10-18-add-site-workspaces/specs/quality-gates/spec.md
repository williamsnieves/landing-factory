# Spec Delta

## ADDED Requirements

### Requirement: QA per site
The QA command SHALL accept a site slug and run every check (build, screenshots, overflow, reduced motion, Lighthouse, impeccable on that site's source) against that site only, writing its report to a per-site folder.

#### Scenario: QA one site
- **WHEN** QA runs for site `panaderia`
- **THEN** it builds and serves `sites/panaderia`, checks every page of that site, runs impeccable on `sites/panaderia/src`, and writes the report under `qa/panaderia/`
