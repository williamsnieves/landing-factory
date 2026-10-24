# deployment Specification Delta

## MODIFIED Requirements

### Requirement: Cache and security headers
The published site SHALL serve hashed assets with long-lived immutable caching, and HTML pages with basic security headers (nosniff, referrer-policy, frame-ancestors). Sites created from the starter SHALL also send HSTS and Cross-Origin-Opener-Policy and ship a Content-Security-Policy whose `script-src` admits only the site's own and hashed scripts.

#### Scenario: Hashed asset
- **WHEN** a file under `/_astro/` of the published site is requested
- **THEN** the response includes `Cache-Control` with `immutable` and a `max-age` of at least one year

#### Scenario: New site
- **WHEN** a site is created from the starter and built
- **THEN** its built headers include `Strict-Transport-Security` and its pages carry a CSP whose `script-src` does not contain `'unsafe-inline'`
- **AND** QA passes with no CSP violation in the browser console

## ADDED Requirements

### Requirement: Deployment gated by the landing report
CI SHALL run the landing report on each built landing after QA and MUST NOT deploy a landing whose report failed. After a deploy, CI SHALL run the report's live checks on the deployed URL, upload each report as an artifact and add the verdict to the pull request's preview comment.

#### Scenario: Secret in a site
- **WHEN** a pull request adds a file with a private key to `sites/panaderia/`
- **THEN** the panaderia report fails, no preview is deployed for it and the job fails

#### Scenario: Preview deployed
- **WHEN** a site's preview is deployed
- **THEN** the live checks run on the preview URL and the site's preview comment shows the report's verdict and counts per status
