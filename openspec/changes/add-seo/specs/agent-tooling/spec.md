## ADDED Requirements

### Requirement: Several skills from one repository
`scripts/setup-agent.sh` SHALL install more than one vendored skill from the same repository and commit, each from its own subpath into its own folder.

#### Scenario: Two skills, one commit
- **WHEN** the lock lists `seo-audit` and `schema` with the same repository and commit
- **THEN** setup installs both folders and `setup:verify` reports both present
