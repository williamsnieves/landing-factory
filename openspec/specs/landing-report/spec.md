# landing-report Specification

## Purpose
Audits a built landing, and optionally its deployed URL, for security (framed by the OWASP Top 10) and performance, and writes one readable report per landing so it is shown to be fast and safe before it is published.

## Requirements

### Requirement: One report command per landing
The repo SHALL offer one command that audits a landing (the starter, or `sites/<slug>` with `--site <slug>`) and writes `report.json` and `report.md` to a new timestamped folder under `qa/` (`qa/<slug>/report/` for a site), with a `latest` link to the newest run. It exits 0 when no item failed, 1 when at least one item failed and 2 when the run itself broke.

#### Scenario: Clean landing
- **WHEN** the command runs on a landing whose build has no failing item
- **THEN** it exits 0, writes both files and the Markdown starts with the verdict and the count of items per status

#### Scenario: No build
- **WHEN** the command runs and the landing has no `dist/` and the build fails
- **THEN** it exits 2 with the reason and writes no verdict

### Requirement: Item statuses and evidence
Every report item SHALL carry an area (security, performance or legal), an OWASP category for security items, one status out of pass, warn, fail, not applicable and not run, the evidence (file, line, URL or measured value) and a fix. The verdict is failed when any item fails; warn, not applicable and not run never fail the run but are always listed.

#### Scenario: Check that could not run
- **WHEN** a check needs the network and the network is unreachable
- **THEN** the item is reported as not run with the reason, and it is never reported as passed

#### Scenario: Legal area in the report
- **WHEN** the report runs on any landing
- **THEN** its Markdown has a Legal section with the cookies, third-party, legal-pages and price-claims items

### Requirement: OWASP Top 10 coverage
The report SHALL list every category of the OWASP Top 10 edition it names (2025), each with the checks that apply to a static landing, or as not applicable with the reason (for example, no authentication exists on a static page).

#### Scenario: Category without a server
- **WHEN** the report covers authentication failures for a static landing with no password field
- **THEN** that category is reported as not applicable with the reason

#### Scenario: Password field on a static page
- **WHEN** a built page contains a password input
- **THEN** the authentication category is reported as warn naming the page

### Requirement: Security misconfiguration checks
The report SHALL fail when the built headers file lacks `X-Content-Type-Options: nosniff`, a `Referrer-Policy` or a `frame-ancestors` directive for HTML pages, and SHALL warn when HSTS or a Content-Security-Policy that restricts scripts without `'unsafe-inline'` is missing.

#### Scenario: Missing nosniff
- **WHEN** `dist/_headers` has no `X-Content-Type-Options: nosniff` for `/*`
- **THEN** the item fails with the fix naming the header line to add

#### Scenario: Site without a script CSP
- **WHEN** a site has neither a CSP header nor a CSP meta tag with a `script-src` that excludes `'unsafe-inline'`
- **THEN** the item warns and the fix points at the starter's CSP setup

### Requirement: Nothing private is shipped
The report SHALL fail when the build output contains environment files, version-control data, private keys or the customer brief, and SHALL warn on source maps and package manifests.

#### Scenario: Brief copied into the build
- **WHEN** `dist/brief.json` exists
- **THEN** the item fails naming the file and the fix says to keep it out of `public/`

### Requirement: Secret scanning
The report SHALL scan the landing's folder (excluding installed dependencies) and its build for credential patterns (private keys, cloud and payment provider keys, access tokens) and fail on any match. Matched values MUST be masked in every output, showing at most the first four characters.

#### Scenario: Token in a source file
- **WHEN** a source file contains a GitHub personal access token
- **THEN** the item fails with the file, the line and the pattern name, and neither the console, `report.json` nor `report.md` contains the full token

### Requirement: Injection surface
The report SHALL fail on `javascript:` URLs in built pages, and SHALL warn with file and line on raw HTML injection in the landing's own source (`set:html`, `innerHTML`, `outerHTML`, `document.write`, `eval`, `new Function`). Inline scripts are inventoried with whether the CSP covers them.

#### Scenario: Raw HTML in a component
- **WHEN** a component in the landing's source uses `set:html`
- **THEN** the item warns with the file and line

### Requirement: Supply chain and integrity
The report SHALL run `npm audit` on the landing's production dependencies, fail on high or critical advisories not listed in the configured ignore list (each ignore needs a reason), and warn on lower ones. It SHALL fail on external scripts without Subresource Integrity, warn on external stylesheets without it, and list every third-party origin the pages load.

#### Scenario: Critical advisory
- **WHEN** `npm audit` reports a critical advisory for a production dependency of the landing
- **THEN** the item fails naming the package, the advisory and the fixed version

#### Scenario: Ignored advisory
- **WHEN** the advisory's id is in the ignore list with a reason
- **THEN** the item warns and shows the reason

### Requirement: Transport security
The report SHALL fail on resources loaded over plain `http://` (mixed content) in built pages and warn on plain `http://` links.

#### Scenario: Image over http
- **WHEN** a built page loads an image from an `http://` URL
- **THEN** the item fails naming the page and the URL

### Requirement: Links and error pages
The report SHALL fail on internal links and assets that do not resolve to a file of the build, warn on `target="_blank"` links without `noopener` and warn when the build has no 404 page.

#### Scenario: Broken internal link
- **WHEN** a page links to `/precios/` and the build has no such page
- **THEN** the item fails naming the page and the link

### Requirement: Live checks on a deployed URL
With a deployed URL, the report SHALL check valid TLS, that HTTP redirects to HTTPS, the security headers and HSTS on the HTML response, long-lived caching on a hashed asset, and that an unknown path answers 404. It SHALL fail when a private path (`/.git/HEAD`, `/.env`, `/brief.json`, `/package.json`) serves its real content, detected from the body and not only from the status code.

#### Scenario: Host answers every path with the home page
- **WHEN** `/.env` returns status 200 with the home page's HTML
- **THEN** the private-path item passes and the unknown-path item warns that the host does not return 404

#### Scenario: Exposed git data
- **WHEN** `/.git/HEAD` returns a body starting with `ref:`
- **THEN** the item fails naming the URL

### Requirement: External link health
With `--external-links`, the report SHALL request each outbound link once and warn on links that fail; answers that are a bot challenge, a 403 or a 429 are reported as unverified, and the report never retries to get around them.

#### Scenario: Store page behind a bot challenge
- **WHEN** an outbound link to a marketplace answers 403
- **THEN** the link is listed as unverified and the run does not fail

### Requirement: Performance detail
The report SHALL show per page the Lighthouse scores and, from the latest QA run of the same build, the LCP element and time, CLS, TBT, total byte weight, request count, image and font findings, render-blocking resources and third-party summary. From the build it SHALL measure page weight, oversized or legacy-format images and font files. These measures warn against `report` thresholds in the QA configuration and never fail; a Lighthouse score below its QA threshold fails.

#### Scenario: QA run older than the build
- **WHEN** the latest QA report is older than the build
- **THEN** the Lighthouse detail items are reported as not run with "run QA first"

#### Scenario: Heavy image
- **WHEN** a built JPEG is larger than the configured image threshold
- **THEN** the item warns naming the file, its size and the fix (modern format or smaller size)
