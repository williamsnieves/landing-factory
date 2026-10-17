# Spec Delta

## Purpose

Publishes every version of the site at a reviewable URL — a preview per branch and production from the main branch — only once QA has passed.

## ADDED Requirements

### Requirement: Preview per branch
Every push to a branch with an open pull request SHALL publish a preview of the site at a stable URL tied to that branch.

#### Scenario: Push to a feature branch
- **WHEN** a branch with an open PR is pushed and QA passes
- **THEN** the site is published at that branch's preview URL

### Requirement: Production from the main branch
A push to the main branch SHALL publish the site at the project's production URL.

#### Scenario: Merge to main
- **WHEN** a PR is merged into `main` and QA passes
- **THEN** the production URL serves the new version

### Requirement: Deployment gated by QA
Deployment MUST NOT run if QA failed for the same commit.

#### Scenario: Failed QA
- **WHEN** QA fails for a commit
- **THEN** no deployment is created for that commit and the deploy check shows as skipped

### Requirement: Preview URL on the PR
The system SHALL post the preview URL on the pull request in a single comment that is updated on every deployment.

#### Scenario: Second push
- **WHEN** the same PR branch is pushed a second time
- **THEN** the existing comment is updated with the new URL and commit, without creating another comment

### Requirement: Secrets kept out of the repo
Deployment credentials MUST be read from CI environment secrets and MUST NOT appear in versioned files or logs.

#### Scenario: Missing secrets
- **WHEN** the workflow runs without the secrets configured
- **THEN** the deploy step ends with a message naming the missing secrets, without exposing values

### Requirement: Cache and security headers
The published site SHALL serve hashed assets with long-lived immutable caching, and HTML pages with basic security headers (nosniff, referrer-policy, frame-ancestors).

#### Scenario: Hashed asset
- **WHEN** a file under `/_astro/` of the published site is requested
- **THEN** the response includes `Cache-Control` with `immutable` and a `max-age` of at least one year
