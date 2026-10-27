## ADDED Requirements

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
