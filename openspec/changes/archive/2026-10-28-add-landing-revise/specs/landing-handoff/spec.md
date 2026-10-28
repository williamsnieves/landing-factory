## ADDED Requirements

### Requirement: Sync of a managed repository
`node scripts/sync-export.mjs --site <slug> --into <clone>` SHALL re-export the site and mirror it into a clone of the recorded repository, keeping `.git`, git-ignored paths, the lockfile when `package.json` did not change and the README when only its export line differs, and SHALL print the files added, changed and deleted. It MUST NOT commit or push.

#### Scenario: Revised copy reaches the repository
- **WHEN** sync runs after a revision round that changed one component
- **THEN** that component changes in the clone, the lockfile and README stay, and the output lists one changed file

#### Scenario: Wrong clone
- **WHEN** `--into` points at a clone of another repository
- **THEN** sync exits 1 naming both URLs and writes nothing

### Requirement: Sync refusals
`sync-export.mjs` SHALL refuse (exit 1, writing nothing) a site without `EXPORTED.json`, a transferred site, a clone whose `origin` is not the recorded repository and a clone with uncommitted changes.

#### Scenario: Dirty clone
- **WHEN** the clone has an uncommitted change
- **THEN** sync exits 1 naming the clone and writes nothing

### Requirement: Transfer checklist and record
`node scripts/handoff.mjs transfer-plan --site <slug> --to <github-owner>` SHALL print the transfer steps (repository transfer by the owner, the customer's host project and secrets by name, the first run, the domain, the owner's cleanup) without reading any secret value. `node scripts/transfer.mjs record --site <slug> --to <github-owner>` SHALL write `transferredTo`, `transferredAt` and the new repository URL into `EXPORTED.json`, after which revision and sync SHALL refuse the site.

#### Scenario: After the transfer
- **WHEN** `transfer.mjs record` ran for a site
- **THEN** `sync-export.mjs` and `revise-landing.sh` on that site exit 1 saying it was transferred
