# quality-gates Specification Delta

## ADDED Requirements

### Requirement: Privacy record per page
On a normal page load, QA SHALL record per page the names and domains of the cookies set (never their values), the keys in local and session storage, and the third-party hosts requested, in its JSON report, without changing the QA verdict.

#### Scenario: Page that sets a cookie
- **WHEN** a page sets a cookie named `_ga` on its own domain
- **THEN** that page's privacy record lists `_ga` with its domain, and `report.json` contains no cookie value
