# brief-intake Specification Delta

## ADDED Requirements

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
