# brief-intake Specification Delta

## ADDED Requirements

### Requirement: Owner portrait consent
The brief SHALL hold whether the business is a person (`business.personalBrand`) and whether the owner allows an AI-generated portrait of themselves (`brand.ownerPortrait`: `allowed`, `not-allowed` or empty); the interview SHALL ask for the consent only when the business is a person; an empty value counts as not allowed and the value MUST NOT be listed as assumed.

#### Scenario: Consent assumed
- **WHEN** the brief lists `brand.ownerPortrait` in `assumed`
- **THEN** validation fails saying the owner must decide it

#### Scenario: Personal brand
- **WHEN** the brief has `business.personalBrand: true` and an empty `brand.ownerPortrait`
- **THEN** `brief missing` lists `brand.ownerPortrait` among the recommended fields

#### Scenario: Business that is not a person
- **WHEN** the brief has `business.personalBrand: false`
- **THEN** `brief missing` does not list `brand.ownerPortrait`

#### Scenario: Older brief
- **WHEN** a brief written before these fields existed is validated
- **THEN** it is still valid and both fields read as empty
