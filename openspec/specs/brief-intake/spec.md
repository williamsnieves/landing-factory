# brief-intake Specification

## Purpose
Captures a customer's requirement once, in a validated brief file filled by an interview that asks only for what is missing, so generation reads real facts and never presents an assumption as one.

## Requirements

### Requirement: Validated brief file
Each landing that starts from a customer requirement SHALL have a `sites/<slug>/brief.json` that a validator checks for required fields, types, closed values, URL, email and phone formats, existing asset files and pattern sheets, and unknown keys, naming the field and the fix for every error.

#### Scenario: Typo in a hand-written brief
- **WHEN** a brief has an unknown key or a malformed URL
- **THEN** validation fails with the field path and what is expected

#### Scenario: Valid skeleton
- **WHEN** a brief is created with the init command
- **THEN** it passes validation except for the required fields still empty, which are listed

### Requirement: Assumptions are never presented as facts
A brief SHALL list every value chosen for the customer in `assumed` with a reason, SHALL leave unknown values empty, and later phases SHALL treat assumed and empty fields as not coming from the customer.

#### Scenario: The customer skips the phone number
- **WHEN** the customer does not give a phone number
- **THEN** `contact.phone` stays empty, the proposal lists it under Decisions with the placeholder used, and the page labels the placeholder as an example

#### Scenario: The customer lets the agent choose the tone
- **WHEN** the customer asks the agent to choose the tone
- **THEN** the chosen tone is written and `assumed` lists `tone` with the reason

### Requirement: Interview asks only for what is missing
The intake interview SHALL read the material already given, ask only for missing required and recommended fields in a fixed topic order and in the customer's language, validate the brief after each answer, and SHALL NOT invent prices, reviews, ratings, results, certifications or quotes.

#### Scenario: Partial material
- **WHEN** the customer pastes a description that names the business, its products and an email
- **THEN** the interview fills those fields and its first questions are about the next missing topics, not the ones already answered

### Requirement: Legal identity, market and data processing
The brief SHALL hold the markets where the page is offered, the holder who runs it (name or company, tax id, address, email, register entry), a privacy contact and what the page does with personal data (analytics, forms, embeds). The interview SHALL ask for them when a market is named and MUST NOT invent or assume holder identity data.

#### Scenario: Holder data left to the agent
- **WHEN** the brief lists `legal.holder.taxId` in `assumed`
- **THEN** validation fails saying holder identity data cannot be assumed

#### Scenario: Market named, holder missing
- **WHEN** the brief names the market `ES` and has no holder tax id
- **THEN** `brief missing` lists the holder tax id among the recommended fields

### Requirement: AI image consent
The brief SHALL hold whether the customer allows AI-generated images (`allowed`, `not-allowed` or empty) and the interview SHALL ask for it; an empty value counts as not allowed for generation, and the value MUST NOT be listed as assumed.

#### Scenario: Consent assumed
- **WHEN** the brief lists the AI-image field in `assumed`
- **THEN** validation fails saying the customer must decide it

#### Scenario: Older brief
- **WHEN** a brief written before this field existed is validated
- **THEN** it is still valid and the field reads as empty

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

### Requirement: Page languages
The brief SHALL hold an optional list of the page languages as lowercase language tags; when it is not empty it MUST contain the page `language`, which is the default language, and MUST NOT repeat a tag. The interview SHALL ask whether the page is in one language or more and record the answer without assuming it; a brief without the list stays valid and reads as a single-language page.

#### Scenario: Two languages
- **WHEN** the brief has `language: "en"` and `languages: ["en", "es"]`
- **THEN** it is valid, the summary shows both languages with `en` as the default, and generation treats the landing as multi-locale

#### Scenario: Default language missing
- **WHEN** `languages` is `["es"]` and `language` is `"en"`
- **THEN** validation fails on `languages` naming the default language

#### Scenario: Duplicate or malformed tag
- **WHEN** `languages` repeats a tag or contains `"ES"`
- **THEN** validation fails naming the entry

#### Scenario: Older brief
- **WHEN** a brief written before this field existed is validated
- **THEN** it is valid and `brief missing` lists `languages` among the recommended fields until it is answered

### Requirement: SEO fields in the brief
The brief SHALL accept an optional `seo` object with `primaryKeyword`, `keywords`, `serviceArea` and `schemaType` (a closed list of schema.org types), reject unknown keys and types, and `brief missing` SHALL list `seo.primaryKeyword` and, for local businesses, `seo.serviceArea` as recommended. Briefs without `seo` SHALL stay valid.

#### Scenario: Unknown schema type
- **WHEN** a brief sets `seo.schemaType` to `SpaceAgency`
- **THEN** validation fails naming the field and the allowed types
