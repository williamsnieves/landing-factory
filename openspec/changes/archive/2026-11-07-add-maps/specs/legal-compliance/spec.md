## ADDED Requirements

### Requirement: Interactive map disclosed
When a site uses the interactive map, the privacy policy SHALL name OpenStreetMap as an embed that receives the visitor's IP address after a click, and the report SHALL classify `www.openstreetmap.org` as an embed host (gated behind the click placeholder: pass with a warning; loaded directly: fail).

#### Scenario: Embed loaded on page load
- **WHEN** a built page has an iframe from `www.openstreetmap.org` without the click placeholder
- **THEN** `legal-cookies` fails naming the host
