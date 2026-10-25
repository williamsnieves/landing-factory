# landing-generation Specification Delta

## ADDED Requirements

### Requirement: Multi-locale generation
When the brief lists two or more languages (or the command is given them), generation SHALL scaffold a multi-locale site whose default locale is the brief's language, keep the same sections in the same order in every locale, build one shared component per section with strings from the site's UI dictionary or per-locale content files, put the language switcher in every header, set the site URL from the brief's domain when it has one, and list the locales under Decisions.

#### Scenario: Bilingual brief
- **WHEN** a landing is generated from a brief with `language: "en"` and `languages: ["en", "es"]`
- **THEN** the site has a home page at `/` in English and one at `/es/` in Spanish with the same sections, both with the language switcher and hreflang alternates, and the run log lists the locales

#### Scenario: Single-language brief
- **WHEN** the brief has one language or none
- **THEN** generation behaves as before and adds no i18n configuration

### Requirement: Copy written per locale
Generation SHALL write the copy of every locale as natural text for its readers rather than a word-for-word translation, keep customer facts exact in every locale, and ask in the run log for a native speaker to read each non-default locale.

#### Scenario: Facts stay exact
- **WHEN** a bilingual landing is generated
- **THEN** the business name, product names, prices, links and contact data are the same in both locales

### Requirement: Locale pages in the final check
When the site has an `i18n` block, the final check SHALL fail naming the locale and the page when a locale has no home page, when `<html lang>` differs from the locale, or when the hreflang alternates are missing, point to unbuilt pages, are not reciprocal or lack `x-default`.

#### Scenario: Missing locale page
- **WHEN** the configuration lists `es` and `dist/es/index.html` does not exist
- **THEN** the final check fails naming the locale and the file

#### Scenario: Non-reciprocal alternates
- **WHEN** the English page lists the Spanish page at an address different from the one the Spanish page gives itself
- **THEN** the final check fails naming both pages and both addresses

### Requirement: Switcher and dictionary in the final check
When the site has an `i18n` block, the final check SHALL fail when a home page has no language switcher, its links do not resolve or mark the wrong locale, the configuration, the UI dictionary and the brief disagree on the locales, or a page shows a UI string of another locale.

#### Scenario: Untranslated interface string
- **WHEN** the Spanish home page still shows the English skip-link text from the dictionary
- **THEN** the final check fails naming the page, the locale and the dictionary key

#### Scenario: Locales disagree
- **WHEN** the brief lists `fr` and the configuration does not
- **THEN** the final check fails naming both lists

### Requirement: Relative alternates warn
When the site has an `i18n` block and its alternates are root-relative because no site URL is configured, the final check SHALL warn without failing.

#### Scenario: No site URL
- **WHEN** the alternates are root-relative
- **THEN** the check passes with an `i18n-absolute-urls` warning

### Requirement: Brief facts per locale
With a brief on a multi-locale site, the final check SHALL check every brief fact on the default locale's home page and the business name on every locale's home page.

#### Scenario: Business name in another locale
- **WHEN** the Spanish home page omits the business name from the brief
- **THEN** the final check fails naming `business.name` and the page
