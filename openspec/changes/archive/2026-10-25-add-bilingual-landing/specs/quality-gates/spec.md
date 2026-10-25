# quality-gates Specification Delta

## ADDED Requirements

### Requirement: Every locale page is checked
QA SHALL discover and check each locale's pages of a multi-locale site like any other page: screenshots and overflow at the three widths, the reduced-motion load and Lighthouse. The layout signature SHALL measure the default locale's home page.

#### Scenario: Bilingual site
- **WHEN** QA runs for a site with `/` and `/es/`
- **THEN** both pages appear in the report with their screenshots, overflow results, reduced-motion result and Lighthouse scores

#### Scenario: Layout signature
- **WHEN** the layout signature is measured for a multi-locale site
- **THEN** it describes `/`, the default locale's home page
