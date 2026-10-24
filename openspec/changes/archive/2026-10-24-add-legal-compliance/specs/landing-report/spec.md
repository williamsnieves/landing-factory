# landing-report Specification Delta

## MODIFIED Requirements

### Requirement: Item statuses and evidence
Every report item SHALL carry an area (security, performance or legal), an OWASP category for security items, one status out of pass, warn, fail, not applicable and not run, the evidence (file, line, URL or measured value) and a fix. The verdict is failed when any item fails; warn, not applicable and not run never fail the run but are always listed.

#### Scenario: Check that could not run
- **WHEN** a check needs the network and the network is unreachable
- **THEN** the item is reported as not run with the reason, and it is never reported as passed

#### Scenario: Legal area in the report
- **WHEN** the report runs on any landing
- **THEN** its Markdown has a Legal section with the cookies, third-party, legal-pages and price-claims items
