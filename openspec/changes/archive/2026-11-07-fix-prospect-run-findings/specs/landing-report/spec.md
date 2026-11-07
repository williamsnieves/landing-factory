## ADDED Requirements

### Requirement: Duplicated header paths
The static report SHALL warn (item `headers-duplicate-paths`, OWASP A02) when `dist/_headers` has two or more blocks with the same path pattern, naming the pattern and the line numbers and advising to merge them into one block, since Cloudflare Pages may apply only one of them. It SHALL pass when every pattern appears once and SHALL be `na` when the build has no `_headers`.

#### Scenario: Two `/*` blocks
- **WHEN** `dist/_headers` has a `/*` block on line 1 and another on line 12
- **THEN** `headers-duplicate-paths` warns naming `/*` and lines 1 and 12, and the verdict does not fail on it

#### Scenario: One block per path
- **WHEN** each path pattern of `dist/_headers` appears once
- **THEN** `headers-duplicate-paths` passes
