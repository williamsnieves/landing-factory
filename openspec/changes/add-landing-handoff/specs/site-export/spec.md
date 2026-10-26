## ADDED Requirements

### Requirement: Live report on the production domain
On the production branch, after a deploy, the exported workflow SHALL also run the live report on the landing's `site` URL when `astro.config.mjs` sets one. While that domain is unreachable its items SHALL be `not-run` and the job SHALL stay green; once it answers, a failing item SHALL fail the job. The run summary SHALL show both the deployment URL result and the domain result.

#### Scenario: Domain not pointed yet
- **WHEN** an exported Vercel site deploys to production and its `site` domain still resolves elsewhere or not at all
- **THEN** the domain report lists its items as `not-run` and the job succeeds

#### Scenario: Domain serving the site
- **WHEN** the domain serves the site with a missing security header
- **THEN** the domain report fails that item and the job fails after uploading the report
