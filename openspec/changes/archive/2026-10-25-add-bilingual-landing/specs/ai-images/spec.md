# ai-images Specification Delta

## ADDED Requirements

### Requirement: Disclosure on every locale page
On a multi-locale site that uses an AI image, the final check SHALL require the visible AI disclosure on the home page of every locale, in that locale's language, and fail naming the page when it is missing, hidden, empty or left in English on a page of another language.

#### Scenario: Spanish page without the disclosure
- **WHEN** the site has an AI image and `dist/es/index.html` has no AI disclosure element
- **THEN** the final check fails naming `dist/es/index.html`

#### Scenario: Disclosure left in English
- **WHEN** the Spanish home page carries "Some images on this page were generated with AI."
- **THEN** the final check fails saying the disclosure must be written in Spanish

#### Scenario: Single-language site
- **WHEN** the site has no `i18n` block
- **THEN** only `dist/index.html` is checked, as before
