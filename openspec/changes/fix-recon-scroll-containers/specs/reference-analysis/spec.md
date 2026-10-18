# Spec Delta

## ADDED Requirements

### Requirement: Inner scroll containers
When the document does not scroll but an inner element holds the page's scrollable content, the analysis SHALL scroll that element for screenshots and motion observations, and SHALL record which scroller it used.

#### Scenario: Page scrolls inside a wrapper
- **WHEN** a page keeps the document one viewport tall and scrolls a full-height wrapper element
- **THEN** screenshots cover the wrapper's full scrollable height at each width
- **AND** motion observations are sampled while scrolling the wrapper
- **AND** the recon output states that an inner scroll container was used and its scrollable height

#### Scenario: Normal document scroll
- **WHEN** the document itself scrolls
- **THEN** the analysis behaves as before and records the document as the scroller

### Requirement: Works behind an outbound proxy
When the environment defines an outbound HTTP(S) proxy, the permission checks and the browser analysis SHALL route their requests through it without extra manual configuration.

#### Scenario: Cloud session with a proxy
- **WHEN** `HTTPS_PROXY` is set and the site is reachable through it
- **THEN** the permission check fetches `robots.txt` and the page through the proxy and reports allowed or blocked, not "cannot verify"
