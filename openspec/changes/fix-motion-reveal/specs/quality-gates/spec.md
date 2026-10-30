## ADDED Requirements

### Requirement: Reveal end state check
QA MUST load each page with motion enabled at 1440 px, scroll through it and, once reveals have finished, fail if a rendered `[data-reveal]` element has computed opacity below 0.99 or a transform translation over 1px. `--skip reveal-end-state` MUST skip it and no threshold changes.

#### Scenario: Reveal left shifted
- **WHEN** a reveal ends with the stylesheet's start offset still applied (computed transform `matrix(1,0,0,1,0,32)`)
- **THEN** QA fails with check `reveal-end-state`, metric `transform`, the page, viewport 1440 and the element selector

#### Scenario: Settled reveals and pages without reveals
- **WHEN** every reveal ends opaque with transform `none`, or the page has no `[data-reveal]`
- **THEN** the check passes
