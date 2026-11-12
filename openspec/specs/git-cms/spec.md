# git-cms Specification

## Purpose
Routine content edits on an exported landing without code: editable content in Astro content collections with schemas, a checked Pages CMS configuration (`.pages.yml`), and a pull command that brings the content edited in the repository back into the factory.

## Requirements

### Requirement: Editable content in collections
A site that offers content to a CMS SHALL keep that content in JSON or YAML files under `src/content/`, each one loaded by an Astro content collection declared in `src/content.config.ts` with a schema, so that a value of the wrong type or a missing required field fails `astro check` and the build.

#### Scenario: Wrong type from an edit
- **WHEN** a product price in a collection file is changed to a word
- **THEN** `astro check` fails naming the file and the field, and the exported CI does not deploy

### Requirement: CMS configuration check
`node scripts/cms.mjs check --site <slug>` SHALL validate `sites/<slug>/.pages.yml`. It fails (exit 1, naming each problem) when an entry's type is not `collection` or `file`, a path is outside `src/content/` or missing, a format is not `json` or `yaml`, a path is not referenced in `src/content.config.ts`, or a `media` or `actions` key is present. Bad usage or a missing file exits 2.

#### Scenario: Valid configuration
- **WHEN** `.pages.yml` has one `collection` entry at `src/content/jobs` in `json`, and `src/content.config.ts` loads that folder
- **THEN** the check exits 0

#### Scenario: Uploads requested
- **WHEN** `.pages.yml` has a `media` key
- **THEN** the check exits 1 saying uploads are not allowed because uploaded images would have no license record

#### Scenario: Path outside the content folder
- **WHEN** an entry's path is `src/components`
- **THEN** the check exits 1 naming the entry and the path

### Requirement: Pull CMS content into the factory
`node scripts/cms.mjs pull --site <slug> --from <clone>` SHALL copy the files under the CMS paths of `.pages.yml` from the clone into `sites/<slug>/`, adding, changing and deleting only inside those paths, print each file, and never commit.

#### Scenario: Pull after an edit
- **WHEN** a job was added through the CMS and committed in the repository, and the owner pulls from an up-to-date clone
- **THEN** the new job file appears under `sites/<slug>/src/content/`, the output lists it, and nothing outside the CMS paths changes

### Requirement: Pull refusals
`cms.mjs pull` SHALL refuse (exit 1, writing nothing) a site without `.pages.yml` or `EXPORTED.json`, a transferred site, a clone whose `origin` is not the recorded repository, and a clone with uncommitted changes.

#### Scenario: Wrong clone
- **WHEN** `--from` points at a clone of another repository
- **THEN** pull exits 1 naming both URLs and writes nothing

### Requirement: Pulled files follow the factory formatting
`cms.mjs pull` SHALL format every file it writes with the factory's Prettier configuration, so that the factory's `format:check` passes after a pull.

#### Scenario: Pull of a file saved by the CMS
- **WHEN** the clone holds a CMS file in the formatting Pages CMS writes
- **THEN** the pulled file in `sites/<slug>/` passes `prettier --check` and holds the same values
