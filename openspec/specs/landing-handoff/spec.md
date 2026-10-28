# landing-handoff Specification

## Purpose
Move one finished landing from the factory to its owner's own repository, host and domain: a read-only preflight, the owner's checklist for the site's target and domain, the guided `/landing-handoff` flow and the export record.

## Requirements

### Requirement: Handoff preflight
`node scripts/handoff.mjs check --site <slug> [--visibility public|private]` SHALL exit 1, naming every problem, when the site is missing or already exported, holds an unused layer, has an invalid `site.config.json`, has no `site` in `astro.config.mjs`, has a brief `deploy.domain` that differs from the host of `site`, or keeps the default `cloudflare` target while the brief names another target. It SHALL warn when a public repository would carry `brief.json`. It MUST NOT change any file.

#### Scenario: Site without a site URL
- **WHEN** `check` runs on a site whose `astro.config.mjs` has no `site`
- **THEN** it exits 1 and names `site` as missing

#### Scenario: Ready site
- **WHEN** `check` runs on a pruned, unexported site with a valid Vercel configuration and a `site` URL matching its brief domain
- **THEN** it exits 0

### Requirement: Owner checklist
`node scripts/handoff.mjs plan --site <slug> --repo <owner>/<name> --visibility public|private` SHALL print a Markdown checklist built from the site's configuration: the empty repository, the Claude GitHub App access, each secret the target needs (by name, never a value), the first run started by hand, the domain steps of the target with the apex or `www` choice derived from `site`, how to find the real DNS host, and the old host's cleanup.

#### Scenario: Vercel site on the apex
- **WHEN** `plan` runs for a Vercel site whose `site` is `https://example.com`
- **THEN** the checklist names the `VERCEL_TOKEN` secret, tells the owner to keep `example.com` as the production domain with "redirect apex to www" unchecked, and to add `www.example.com` as a permanent (308) redirect to it

#### Scenario: Cloudflare site
- **WHEN** `plan` runs for a Cloudflare site
- **THEN** the checklist names `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and the Pages custom-domain step

### Requirement: Guided handoff skill
The interactive skill `/landing-handoff <slug>` SHALL drive the handoff in order, from preflight and QA through the owner's decisions, export, first push and CI, domain and live report, to the export record in a factory pull request. It MUST NOT ask for a secret in chat, try to create a repository or start a workflow run itself, or change DNS.

#### Scenario: Owner without the secret yet
- **WHEN** the first push runs CI before the owner adds the target's secret
- **THEN** the skill reports that QA and the report passed and the deploy was skipped, and asks the owner to add the secret and start the run by hand

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
