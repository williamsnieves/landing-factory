# legal-compliance Specification Delta

## ADDED Requirements

### Requirement: Legal data for every locale
With a multi-locale brief the legal data generator SHALL record the default locale and, for each locale, where each page the market requires lives, and the legal components SHALL render in the language of their locale. A locale without legal texts SHALL get the English texts and a warning. A single-language brief SHALL produce the same data as before.

#### Scenario: English and Spanish on the Spanish market
- **WHEN** the brief has languages `en` and `es` and market `ES`
- **THEN** the data lists `/privacy/`, `/legal-notice/`, `/es/privacidad/` and `/es/aviso-legal/`, and the Spanish pages are written in Spanish

#### Scenario: Locale without texts
- **WHEN** a locale is `fr`
- **THEN** its legal pages use the English texts and the generator warns that `fr` has no legal text

#### Scenario: Single-language brief
- **WHEN** the brief has one language
- **THEN** the data has no locale list

### Requirement: Legal pages required in each locale
On a multi-locale landing the report SHALL fail the legal-pages item when a page the market requires is missing in any locale or when a page does not link to the legal page of its own locale.

#### Scenario: Page missing in one locale
- **WHEN** the build has no privacy policy under `/es/`
- **THEN** the legal-pages item fails naming the privacy policy and the locale `es`

#### Scenario: Footer links the other language
- **WHEN** the Spanish home page links only to `/privacy/`
- **THEN** the item fails naming `/es/` and the Spanish page it should link

#### Scenario: All locales complete
- **WHEN** all four pages exist and each locale's pages link their own locale's legal pages
- **THEN** the item passes naming the locales
