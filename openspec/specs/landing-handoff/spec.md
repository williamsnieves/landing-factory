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

### Requirement: Sync keeps CMS-managed content
For a site with `.pages.yml`, `sync-export.mjs` MUST NOT add, change or delete a file under a CMS path of the factory's `.pages.yml` in the clone. When the factory copy of such a file differs from the clone's, sync SHALL keep the clone's, list the file as `kept (managed by the CMS)` and name the `cms.mjs pull` command.

#### Scenario: Edit made in the CMS
- **WHEN** a product was edited through the CMS in the repository and sync runs from a factory that still has the old file
- **THEN** the clone keeps the edited file, the output lists it as kept and names the pull command, and other files sync as usual

#### Scenario: Configuration changes sync
- **WHEN** the factory's `.pages.yml` changed
- **THEN** sync updates `.pages.yml` in the clone like any other file

### Requirement: CMS steps in the owner checklist
For a site with `.pages.yml`, `handoff.mjs plan` SHALL add the Pages CMS steps: install its GitHub App on this repository only, open the repository in Pages CMS, invite editors by email, and note that each save is a commit on the production branch that CI checks before deploying.

#### Scenario: Site without a CMS
- **WHEN** `plan` runs for a site without `.pages.yml`
- **THEN** the checklist has no CMS steps

### Requirement: Sync compares CMS files by value
`sync-export.mjs` SHALL compare a CMS-managed JSON or YAML file by its parsed value, falling back to its bytes when it does not parse, and SHALL list it as `kept (managed by the CMS)` only when the values differ or the file exists on one side only.

#### Scenario: Same content, other formatting
- **WHEN** the clone's CMS file and the factory's hold the same values with different formatting
- **THEN** sync lists no kept file for it

#### Scenario: Edited value
- **WHEN** a value in the clone's CMS file differs from the factory's
- **THEN** sync keeps the clone's file and lists it as kept

### Requirement: First sync seeds CMS files
When nothing exists in the clone at a CMS path (the file of a `file` entry, the folder of a `collection`), `sync-export.mjs` SHALL add the factory's files under it once and list each as `added <file> (first copy for the CMS)`. Once the path exists in the clone, sync SHALL never add, change or delete a file under it.

#### Scenario: First sync after moving content to the CMS
- **WHEN** the site's `.pages.yml` names `src/content/career.json` and the clone has no such file
- **THEN** sync adds it, and the clone builds

#### Scenario: Later sync after an edit in the CMS
- **WHEN** the clone's `src/content/career.json` was edited in the CMS
- **THEN** sync keeps it and lists it as kept

#### Scenario: Entry deleted in the CMS
- **WHEN** a file of a collection folder that exists in the clone was deleted through the CMS
- **THEN** sync does not add it back and lists it as kept
