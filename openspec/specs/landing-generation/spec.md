# landing-generation Specification

## Purpose
Generates, with a single command, an original and deployable landing for a given niche, reusing abstract patterns from references and meeting the system's quality criteria with no manual touch-ups.

## Requirements

### Requirement: Single generation command
The system SHALL provide a command that, given a slug, a niche and optionally `patterns/` sheets, creates the site project and runs brief, synthesis, design system, build and QA end to end with no intervention when automatic mode is requested.

#### Scenario: Automatic run
- **WHEN** the command runs with slug, niche and automatic mode
- **THEN** at the end the site project exists with its proposal, design system, the built landing and the QA report

### Requirement: Reviewable proposal before building
Before building, the system SHALL produce a proposal with page map, sections and their purpose, motion plan and sheets used; in interactive mode it MUST stop until the user approves or edits it.

#### Scenario: Interactive mode
- **WHEN** the command runs without automatic mode
- **THEN** the proposal is saved and the run stops awaiting approval before generating code

### Requirement: Per-niche design system
Every site SHALL have a `design-system/<slug>/MASTER.md` with the niche's pattern, style, palette, fonts and anti-patterns, and the site's tokens SHALL be derived from it.

#### Scenario: Derived tokens
- **WHEN** the site is generated
- **THEN** the color and typography values in the site's tokens match those defined in its `MASTER.md`

### Requirement: Original and licensed content
All site copy MUST be original, and every external image or component MUST have a license that allows its use and MUST be listed in the site's `CREDITS.md` with source, author and license.

#### Scenario: Uncredited image
- **WHEN** the site contains an external image not listed in `CREDITS.md`
- **THEN** the generation's final check fails naming the image

#### Scenario: Photo overused
- **WHEN** the same source photo is used in more than two places on the site
- **THEN** the final check fails naming the photo and its uses

#### Scenario: Copy from a reference
- **WHEN** a sentence on the site literally matches text from a reference site used
- **THEN** generation is not considered done until it is rewritten

### Requirement: Preflight before generation
Before creating anything, the command SHALL check that the package registry and the image sources answer (through the configured proxy when one is set), that a Chromium for QA is available and that the slug is free, and MUST exit non-zero naming every missing item when a check fails.

#### Scenario: Image host blocked
- **WHEN** the image source host is not reachable from the environment
- **THEN** the command exits non-zero before creating the site folder and names the host to allow

### Requirement: QA loop until passing
After building, the system SHALL run QA, fix the reported failures and repeat until it passes or a configurable maximum of attempts is reached; if attempts run out, it MUST end in a failed state with a summary of what is left.

#### Scenario: Automatic fix
- **WHEN** the first QA run fails due to overflow at 375 px
- **THEN** the system fixes the overflow and runs QA again

#### Scenario: Attempts exhausted
- **WHEN** QA still fails after the maximum number of attempts
- **THEN** the command exits with a non-zero code and the run log lists the remaining failures

### Requirement: Run log
Every generation SHALL leave a log with the inputs used, design decisions, QA attempts with their result, and total duration, and, when Claude Code reports them, the run's token usage and cost.

#### Scenario: Later review
- **WHEN** the log of a finished generation is opened
- **THEN** it shows the sheets used, the number of QA attempts and the final result

#### Scenario: Usage reported
- **WHEN** a generation finishes and Claude Code reported usage
- **THEN** the Totals section of the run log shows input and output tokens and the cost, and otherwise says they were not reported

### Requirement: Diversity across niches
Sites generated for different niches SHALL be visually different: different palette, typography and hero structure.

#### Scenario: Three niches
- **WHEN** sites are generated for three different niches
- **THEN** no pair of sites shares palette, main font family and hero type all at once

#### Scenario: Same look as an existing site
- **WHEN** a new site's primary color, display font and hero type all match an existing site in `sites/`
- **THEN** the final check fails naming the existing site

### Requirement: Planned 3D scenes
A generated landing MAY include up to two 3D scenes; the proposal SHALL describe each scene's purpose, poster, scroll behavior and reduced-motion fallback before it is built, and the final check SHALL fail if a scene has no credited or self-made poster.

#### Scenario: Scene without poster
- **WHEN** a built page contains a scene element without a poster image recorded in the site's asset manifest
- **THEN** the final check fails naming the scene

### Requirement: Museum open-access images
Image sourcing SHALL support public-domain open-access museum collections in addition to Wikimedia Commons, recording each image's source, museum credit line and license in the site's asset manifest.

#### Scenario: Museum image download
- **WHEN** an image is taken from a museum open-access collection
- **THEN** the manifest records the object page, the museum's credit line and a public-domain license, and the credits list it

### Requirement: Layout-based diversity
The final check SHALL compare a new site's measured layout signature and viewport screenshot hashes with every other site, and SHALL fail when the layouts are closer than the configured thresholds, naming the closest site and features, in addition to comparing primary color, display font and hero type.

#### Scenario: Same layout, new colors
- **WHEN** a new site reuses another site's section patterns, radii, button shape and footer type with different colors and fonts
- **THEN** the final check fails naming that site and the shared features

#### Scenario: No worked-example anchoring
- **WHEN** a landing is generated
- **THEN** the generation instructions and templates do not point to another generated site as the model to follow

### Requirement: Generation reads the brief
When a brief exists, landing generation SHALL validate it before any other phase, SHALL take brand, offer, audience, tone, calls to action, contact data, references, brand constraints and legal constraints from it, SHALL derive the proposal's signals from it, and SHALL use the customer's own assets before stock images.

#### Scenario: Brief with real products and prices
- **WHEN** a landing is generated from a brief that lists two products with prices and a primary call-to-action URL
- **THEN** the proposal and the page use those names, prices and URL, and none of them is labeled as sample data

#### Scenario: Invalid brief
- **WHEN** the brief fails validation
- **THEN** generation stops before the proposal with the validator's errors

### Requirement: Brief facts on the page
When a brief exists, the final check SHALL fail if a non-assumed fact of the brief (business name, primary call-to-action URL, contact email and phone, each product name and price) is missing from the built page, or if the page labels a customer fact as sample data, naming the field.

#### Scenario: Price dropped by the build
- **WHEN** the built page omits the price of one product listed in the brief
- **THEN** the final check fails naming `offer[1].price`

### Requirement: Legal pages from the brief
When the brief names a market, generation SHALL add the legal pages that market requires, rendered from the brief's legal data in the page language, and link them from every page's footer; a missing required value SHALL render a visible pending-review marker instead of an invented value.

#### Scenario: Spanish customer
- **WHEN** a landing is generated from a brief with market `ES`, a holder and a privacy contact
- **THEN** the site has a legal notice and a privacy policy showing the holder's name, tax id, address and email, and the footer links to both

#### Scenario: Brief without a market
- **WHEN** the brief names no market
- **THEN** no legal pages are added and the run log lists the legal requirements as unknown under Decisions

### Requirement: AI images during generation
Generation SHALL use AI images only for illustrative, abstract or generic subjects, only when the customer allowed them or there is no brief, after the customer's own files and never for subjects archives cover with real photos the page claims as real, and SHALL record in the run log each AI image with its reason and the count against the cap.

#### Scenario: Customer allows AI images
- **WHEN** a landing is generated from a brief with AI images allowed and the art direction asks for an abstract hero image
- **THEN** the hero image may be generated, the page carries the AI disclosure and the run log names the image and its reason

#### Scenario: Customer does not allow AI images
- **WHEN** the brief does not allow AI images
- **THEN** no AI image is generated or imported and the run log says so

### Requirement: 404 page in the build
Generation SHALL restyle the site's default 404 page in the landing's design, in the page language, with links to the home page and to the primary call to action, keeping it `noindex`, and the review step SHALL look at it.

#### Scenario: Generated landing
- **WHEN** a landing is generated
- **THEN** its build has `dist/404.html` in the landing's design, `noindex`, linking home and to the primary call to action, and QA still excludes it from the page checks

### Requirement: Owner portrait during generation
Generation SHALL use an AI image of a person only as the owner portrait of a personal brand, only when the brief has both `brand.aiImages` and `brand.ownerPortrait` allowed, only from a file the owner supplied (recorded with `--subject owner`), with alt text that calls it an AI-generated portrait and not a photo, and with the page's AI disclosure.

#### Scenario: Owner allows the portrait
- **WHEN** the brief of a personal brand allows AI images and the owner portrait and lists the owner's AI portrait as a file
- **THEN** the portrait is recorded with subject `owner`, the page shows it with alt text "AI-generated portrait of" the owner and carries the AI disclosure

#### Scenario: Owner portrait not allowed
- **WHEN** the brief leaves `brand.ownerPortrait` empty
- **THEN** the portrait is not used and the run log says why

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

### Requirement: Clean code before the final check
The build SHALL follow the architecture contract, run `node scripts/site-layers.mjs prune --site <slug>` and `npm install`, and pass `npm run lint` before the final check. A lint failure SHALL be fixed in the code, never by turning a rule off.

#### Scenario: Landing without 3D
- **WHEN** a landing whose proposal plans no 3D scene reaches the final check
- **THEN** its site folder has no 3D layer, its `package.json` has no `three` dependency and `npm run lint` passes

### Requirement: Visual directions before the build
`scripts/new-landing.sh <slug> --directions [--count 2|3]` SHALL build 2 or 3 visual directions as `noindex` pages at `/directions/<id>/` in `sites/<slug>/`, each with a hero and one section from the brief's real copy, its own page-scoped palette and fonts from ui-ux-pro-max and a primary archetype no other direction uses. It SHALL write `directions.json` and `DIRECTIONS.md`, pass QA and stop with `Result: directions` without running the full build.

#### Scenario: Three directions
- **WHEN** a directions run finishes for a site with a valid brief
- **THEN** `dist/directions/a/`, `b/` and `c/` exist and are `noindex`, `directions.json` records a different primary archetype for each, and `RUN.md` says `Result: directions`

#### Scenario: Directions too similar
- **WHEN** `node scripts/directions.mjs check --site <slug>` runs on a record where two directions share a primary archetype
- **THEN** it exits 1 naming both directions

### Requirement: Recorded customer choice
`node scripts/directions.mjs choose --site <slug> --direction <id> [--notes "..."]` SHALL record the chosen direction, the customer's notes and the date in `directions.json`. It SHALL refuse an unknown direction and a site whose direction pages were already removed by the build.

#### Scenario: Choice with notes
- **WHEN** the owner runs `choose --direction b --notes "warmer photos"`
- **THEN** `directions.json` has `choice.direction` `b`, the notes and today's date

### Requirement: Build from the chosen direction
On `--resume`, a site with `directions.json` SHALL build only after a choice is recorded. The full build SHALL take the chosen direction's archetype blend, palette and fonts as its starting point and the customer's notes as fixed inputs, and SHALL remove the direction pages, their scoped styles and components before building. A site without `directions.json` SHALL build as before.

#### Scenario: No choice yet
- **WHEN** `new-landing.sh <slug> --resume --auto` runs on a site whose `directions.json` has no choice
- **THEN** it exits 1 naming `node scripts/directions.mjs choose`

#### Scenario: Chosen direction
- **WHEN** the build resumes after `choose --direction b`
- **THEN** the proposal's "Archetype blend" is direction `b`'s and the built site has no `/directions/` pages

### Requirement: SEO in generation
The `/new-landing` synthesis SHALL record the primary keyword, service area and schema type (from the brief, else marked assumed), and the build SHALL write titles and descriptions within the report's limits for every locale, one `h1` per page, and JSON-LD of the schema type from customer facts only, never with review or rating markup the customer did not give.

#### Scenario: Real estate agency
- **WHEN** a landing is built from a brief with `seo.schemaType` `RealEstateAgent` and a primary keyword
- **THEN** the home page carries `RealEstateAgent` JSON-LD with the brief's name and contact data, the keyword appears in its title and `h1`, and the report's `seo` area has no failing item
