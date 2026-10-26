# site-export Specification

## Purpose
Turn one site workspace into a standalone repository that builds, runs QA and the landing report, and deploys to its target without the factory, and keep a record of the export in the factory.

## Requirements

### Requirement: Export a site as a standalone repository
The system SHALL provide `npm run export -- --site <slug> --out <dir>`, which writes into `<dir>` a repository with the site at its root that installs, builds, runs QA and the landing report, and deploys to the site's target without the factory. The scripts it copies SHALL be those that QA, the report and the deploy import, found by following imports from fixed entry points.

#### Scenario: Export the owner's landing
- **WHEN** the owner runs `npm run export -- --site personal-brand --out ../williansnieves.com`
- **THEN** the folder holds the site at its root, `scripts/qa.mjs`, `scripts/landing-report.mjs`, `scripts/deploy.mjs` and every module they import, and no file of another site
- **AND** `npm ci`, `npm run build`, `npm run qa` and `npm run report -- --only static` succeed in that folder with no file of the factory present

#### Scenario: Import outside the copied tree
- **WHEN** an entry script imports a module outside `scripts/`
- **THEN** the export stops with exit 1 naming the import, and the output folder is left empty

### Requirement: Pinned dependencies in the exported repository
The exported `package.json` SHALL list the site's dependencies and the tooling the copied scripts need, each pinned to the exact version the factory lockfile resolved; wrangler only when the site can deploy through it. The export SHALL create `package-lock.json` and stop with a clear message when the registry cannot be reached.

#### Scenario: Same versions as the factory
- **WHEN** the factory lockfile resolves `astro` to a given version
- **THEN** the exported `package.json` pins `astro` to that exact version

### Requirement: CI of the exported repository
The exported GitHub Actions workflow SHALL run format check, `astro check`, QA and the static report, and only when they pass, the target's secrets are present and the pull request is not from a fork, deploy to the site's target, run the live report and keep one sticky preview comment. It MUST read credentials only from secrets and MUST NOT print them.

#### Scenario: Vercel site without the token
- **WHEN** the exported repository of a `vercel` site runs CI without the `VERCEL_TOKEN` secret
- **THEN** QA and the static report run, the deploy is skipped with a warning naming the missing secret, and the job stays green

### Requirement: Nothing private or generated is exported
The export MUST NOT copy `dist/`, `node_modules/`, `.astro/`, `qa/`, `.run.log`, `.run-usage.json` or `.env` files, and MUST stop with exit 1, writing nothing, when the report's provider secret patterns match a file of the site; the message shows only the masked match. `brief.json` SHALL be copied unless `--no-brief` is given. The planning documents (`PROPOSAL.md`, `RUN.md`, `CONTENT.md` and the site's design-system `MASTER.md`) SHALL go under `docs/factory/`.

#### Scenario: Public repository without the brief
- **WHEN** the owner exports with `--no-brief`
- **THEN** the folder has no `brief.json` and the report's legal pages item warns that the requirements are unknown

#### Scenario: Secret in the site
- **WHEN** a file of the site matches a provider key pattern
- **THEN** the export exits 1, prints the file and the masked match, and writes nothing

### Requirement: Export refusals
The export SHALL refuse, with exit 2 and nothing written, an invalid slug, a site that does not exist, an `--out` inside the factory repository and an `--out` folder that exists and is not empty. `--dry-run` SHALL print the files, the dependencies and the workflow it would write and change nothing.

#### Scenario: Output inside the factory
- **WHEN** `--out` resolves to a path inside the factory repository
- **THEN** the export exits 2 and writes nothing

#### Scenario: Non-empty output folder
- **WHEN** `--out` names a folder that already holds a file
- **THEN** the export exits 2 naming the folder and changes nothing in it

### Requirement: Record of an exported site
`--record <repo-url>` SHALL write `sites/<slug>/EXPORTED.json` with the repository URL (`https://` only), the export date, the factory commit and the target. The site folder SHALL stay in the factory as the record and as a comparison point for the layout diversity check.

#### Scenario: Recording the owner's repository
- **WHEN** the owner exports with `--record https://github.com/<owner>/<repo>`
- **THEN** `sites/personal-brand/EXPORTED.json` holds that URL, the date, the factory commit and `vercel`
