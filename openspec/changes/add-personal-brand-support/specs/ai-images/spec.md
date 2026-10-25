# ai-images Specification Delta

## ADDED Requirements

### Requirement: Owner portrait import
The import command SHALL accept `--subject owner` to record an AI portrait of the brand owner, only when a brief exists that names the business and has both `brand.aiImages` and `brand.ownerPortrait` allowed, requiring every provenance flag as for any import, and SHALL record the entry with `subject: "owner"`. The generate command MUST NOT accept `--subject`.

#### Scenario: Both consents given
- **WHEN** the import runs with `--subject owner` on a site whose brief allows AI images and the owner portrait
- **THEN** the file is copied and the `assets.json` entry has `source: "ai"`, `imported: true` and `subject: "owner"`

#### Scenario: Owner portrait not allowed
- **WHEN** the import runs with `--subject owner` and the brief leaves `brand.ownerPortrait` empty
- **THEN** it exits 1 naming the missing consent and changes nothing

#### Scenario: No brief
- **WHEN** the import runs with `--subject owner` on a site without a brief
- **THEN** it exits 1 saying an owner portrait needs a brief that names the owner

#### Scenario: Generation with a subject
- **WHEN** the generate command runs with `--subject owner`
- **THEN** it exits 2 and sends no request

### Requirement: Owner portrait policy exemption
For an entry with subject `owner` the prompt policy SHALL skip only its `people` and `real-person` rules; the `brand`, `identity` and `results` rules still apply.

#### Scenario: Owner prompt
- **WHEN** an import with `--subject owner` has a prompt about the author as a half-human, half-machine figure
- **THEN** the policy allows it

#### Scenario: Brand name in an owner prompt
- **WHEN** an import with `--subject owner` has a prompt that contains the business name from the brief
- **THEN** it exits 1 naming the `brand` rule

#### Scenario: Subject does not exempt other rules
- **WHEN** an import with `--subject owner` has a prompt that asks for a logo
- **THEN** it exits 1 naming the `identity` rule

### Requirement: Owner portrait enforced by the final check
The final check SHALL fail when an AI entry has a subject other than `owner`, or has subject `owner` and the brief does not give both consents (or there is no brief), and the page disclosure rule SHALL apply to it as to every AI image; the credits SHALL list it noting it is a portrait of the owner made with their consent.

#### Scenario: Portrait without consent
- **WHEN** an entry has subject `owner` and the brief's `brand.ownerPortrait` is empty
- **THEN** the final check fails naming the file and the missing consent

#### Scenario: Unknown subject
- **WHEN** an entry has subject `team`
- **THEN** the final check fails saying the only subject allowed is `owner`

#### Scenario: Credits
- **WHEN** credits are written for a site with an owner portrait
- **THEN** the "AI-generated images" table notes that it is a portrait of the owner made with their consent
