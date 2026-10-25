# site-workspaces Specification Delta

## ADDED Requirements

### Requirement: Multi-locale scaffold
The scaffold command SHALL accept two or more lowercase language tags and then create a site on Astro's built-in i18n routing: an `i18n` block in its configuration (the default locale first and without a URL prefix, the security policy block kept), a home page per locale, a typed UI dictionary with a `t(locale)` helper and the language switcher. The default locale SHALL be the requested language, else the first of the list, and the single 404 page SHALL stay in the default language.

#### Scenario: English and Spanish
- **WHEN** the scaffold command runs with `--langs en,es`
- **THEN** the site's `astro.config.mjs` has `locales: ['en', 'es']`, `defaultLocale: 'en'` and `prefixDefaultLocale: false` next to its `security.csp` block, `src/pages/es/index.astro` and `src/i18n/ui.ts` exist, and `src/pages/404.astro` is in English

#### Scenario: Spanish default
- **WHEN** the scaffold command runs with `--langs en,es --lang es`
- **THEN** the default locale is `es`, `src/pages/en/index.astro` exists and there is no `src/pages/es/` folder

### Requirement: Invalid locale lists are refused
The scaffold command MUST refuse a list with one language, a duplicate, an uppercase or malformed tag, or a default language that is not in the list, and change nothing.

#### Scenario: Invalid list
- **WHEN** the scaffold command runs with `--langs en` or `--langs en,en` or `--langs en,ES`
- **THEN** it exits with a non-zero code naming the problem and creates nothing

### Requirement: Single-language scaffold unchanged
A site created without a language list SHALL have no i18n configuration and no i18n files.

#### Scenario: Single-language site
- **WHEN** the scaffold command runs without `--langs`
- **THEN** the site has no `src/i18n/` folder and its `astro.config.mjs` equals the starter's

### Requirement: Locale alternates in the layout
On a multi-locale site the layout SHALL set `<html lang>` from the current locale and, on indexable pages, emit a `hreflang` alternate link for every locale plus `x-default` for the default locale, next to a canonical link that points to the page itself. The links SHALL be absolute when the site URL is configured. The layout MUST NOT import the i18n module on a site without an `i18n` block.

#### Scenario: Built multi-locale page
- **WHEN** a multi-locale site with `site` set is built
- **THEN** `dist/index.html` has `<html lang="en">`, a canonical to `/`, alternates for `en`, `es` and `x-default`, and `dist/es/index.html` has `<html lang="es">`, a canonical to `/es/` and the same alternates

#### Scenario: Page with a different slug per language
- **WHEN** a page passes `{ en: 'privacy', es: 'privacidad' }` as its locale slugs
- **THEN** its alternates link `/privacy/` and `/es/privacidad/`

#### Scenario: Noindex page
- **WHEN** a page is `noindex`
- **THEN** it has no alternates

#### Scenario: Single-language build
- **WHEN** a site without an `i18n` block is built
- **THEN** its pages have no `hreflang` links and the build succeeds

### Requirement: Language switcher
The starter SHALL offer a language switcher made of real links to the equivalent page of each locale, each with `hreflang` and `lang`, the current one marked with `aria-current`, working without JavaScript. A site MUST NOT redirect visitors by browser language.

#### Scenario: Switcher on the Spanish page
- **WHEN** the Spanish home page is built
- **THEN** its switcher links `/` and `/es/` and marks only the Spanish link as current

#### Scenario: Page with a different slug per language
- **WHEN** the Spanish privacy page passes its locale slugs
- **THEN** the switcher links the English privacy page at `/privacy/`
