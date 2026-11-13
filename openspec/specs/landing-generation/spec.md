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
When a brief exists, the final check SHALL fail if a non-assumed fact of the brief (business name, primary call-to-action URL, contact email and phone, each product name and price) is missing from the built page, or if the page labels a customer fact as sample data, naming the field. The primary call-to-action URL SHALL count as present when a link has the same origin and path and keeps every query parameter of the brief URL with the same value, whatever extra parameters or fragment it adds.

#### Scenario: Price dropped by the build
- **WHEN** the built page omits the price of one product listed in the brief
- **THEN** the final check fails naming `offer[1].price`

#### Scenario: Link tagged for analytics
- **WHEN** the brief's primary URL is `https://shop.example/store` and the page only links `https://shop.example/store?utm_source=landing`
- **THEN** the primary URL fact passes

#### Scenario: Different plan in the link
- **WHEN** the brief's primary URL is `https://app.example/signup?plan=free` and the page only links `https://app.example/signup?plan=pro`
- **THEN** the final check fails naming `goal.primary.url`

### Requirement: Brief facts with a CMS-managed offer
When the site's `.pages.yml` passes the CMS check and has a `content[]` entry named `offer`, the final check SHALL NOT require the brief's product names and prices, SHALL print the warning `brief-facts-cms-offer` and SHALL still check the other brief facts.

#### Scenario: Offer managed by the CMS
- **WHEN** the site's valid `.pages.yml` has an entry named `offer` and the owner removed a product of the brief through the CMS
- **THEN** the final check does not fail on that product, prints `brief-facts-cms-offer`, and still fails if the business name is missing

#### Scenario: Invalid CMS configuration
- **WHEN** the site's `.pages.yml` has an entry named `offer` but fails the CMS check
- **THEN** the product names and prices are still required

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

### Requirement: Copy plan before building
The `/new-landing` synthesis SHALL run the framework picker and write a "Copy plan" section in `PROPOSAL.md`. The plan SHALL contain:
- the chosen framework and the reason, plus any override and its reason;
- every section mapped to a stage, with the facts it uses;
- two or three hero headline candidates checked with the 4U test;
- the inventory of real proof from the brief.

The build SHALL write the copy from that plan and list the framework in RUN.md "Design decisions".

#### Scenario: Proposal checkpoint
- **WHEN** the run stops at the checkpoint
- **THEN** `PROPOSAL.md` has a "Copy plan" naming the framework and mapping every planned section to a stage

#### Scenario: No real proof
- **WHEN** the brief has no `proof` entries
- **THEN** the plan marks the proof stage "no proof available" and the page shows no invented proof

### Requirement: A person reads the copy
Every RUN.md SHALL list under "to confirm before launch" that a person must read the whole copy before publishing.

#### Scenario: Finished run
- **WHEN** a run ends with `Result: passed`
- **THEN** RUN.md "to confirm before launch" contains the copy read-through item

### Requirement: Conversion plan before building
The `/new-landing` synthesis SHALL write a "Conversion plan" in `PROPOSAL.md` after the Copy plan, with:
- the emotional target and its reason;
- the attention path with one primary call to action;
- the offers shown (at most 3 side by side) and the highlighted one;
- trust and risk elements from the brief only;
- the closing call to action;
- the ethics checklist.

The emotional target SHALL be written into MASTER.md as an input to ui-ux-pro-max, which still picks palette and fonts.

#### Scenario: Proposal checkpoint
- **WHEN** the run stops at the checkpoint
- **THEN** `PROPOSAL.md` has a "Conversion plan" with an emotional target and exactly one primary call to action

### Requirement: One conversion review round
After QA passes and before the impeccable polish, the build SHALL run the conversion audit, look at the section screenshots and apply fixes in one round. RUN.md SHALL have a "Conversion review" listing the findings, what changed and what is left for a person, and QA SHALL pass again after the round.

#### Scenario: Review recorded
- **WHEN** a run ends with `Result: passed`
- **THEN** RUN.md has a "Conversion review" section

### Requirement: Limits of the review round
The review round MAY change:
- section order;
- call-to-action placement and labels;
- copy emphasis;
- optional form fields;
- secondary actions.

It SHALL NOT change tokens, fonts, images, facts, prices, the archetype or the layout grammar.

#### Scenario: Finding outside the allowed edits
- **WHEN** a finding would need a different palette
- **THEN** the round leaves the palette unchanged and lists the finding under "for a person" in RUN.md

### Requirement: Stock photos from Pixabay
`scripts/find-images.mjs` SHALL search Pixabay with `--source pixabay` and download one photo with `get <slug> pixabay:<id>`, only from `https://pixabay.com` or `https://cdn.pixabay.com`, recording it in `assets.json` with `source: "pixabay"`, `pixabayId`, `title`, `sourcePage`, `author`, `authorUrl`, `license: "Pixabay Content License"`, `licenseUrl` and `credit: true`.

#### Scenario: Photo downloaded from Pixabay
- **WHEN** `get demo pixabay:123` runs against an API that returns a photo by the user "anaruiz"
- **THEN** the file is saved under `sites/demo/src/assets/images/` and `assets.json` gains an entry with `source: "pixabay"` and author "anaruiz"

#### Scenario: Download from another host
- **WHEN** the API answers with a photo whose download URL is not on a Pixabay host
- **THEN** nothing is downloaded or recorded and the command exits 1 naming the host

### Requirement: Pixabay key handling
The Pixabay API key SHALL be read only from `PIXABAY_API_KEY`, and SHALL never be printed, logged, stored, cached or passed as an argument; every URL shown in output or errors SHALL have its key masked.

#### Scenario: Key in an error
- **WHEN** a Pixabay request fails and the error names the request URL
- **THEN** the URL is printed with `key=***` and the key value appears in no output or file

#### Scenario: Missing key
- **WHEN** `search` runs with `--source pixabay` and no `PIXABAY_API_KEY`
- **THEN** the command exits 1 saying to set `PIXABAY_API_KEY` in the environment's settings

### Requirement: Manual Pexels import
`find-images.mjs import <slug> <file> --source pexels --page <url> --author <name>` SHALL copy a photo the owner downloaded from Pexels into the site and record it with `source: "pexels"`, `sourcePage`, `author`, `license: "Pexels License"`, `licenseUrl`, `credit: true` and `imported: true`, without a network request.

#### Scenario: Photo imported
- **WHEN** the owner imports a JPEG with a `https://www.pexels.com/photo/...` page and the author "Ana Ruiz"
- **THEN** the file is copied under `src/assets/images/` and `assets.json` gains the entry

#### Scenario: Page from another site
- **WHEN** `--page` is not a `www.pexels.com/photo/` URL
- **THEN** the command exits 2 and writes nothing

### Requirement: Stock photo credits
`credits.mjs` SHALL list each Pixabay and Pexels photo with its photographer and license in `CREDITS.md` and `src/data/credits.json`, and SHALL add one "Photos provided by" line linking the provider for each provider the manifest uses.

#### Scenario: Credits for two providers
- **WHEN** `credits.mjs` runs on a manifest with one Pixabay and one Pexels photo
- **THEN** both photographers are credited and each provider is linked once

### Requirement: Image source order
Generation SHALL take images in this order: the customer's files; AI images where the brief allows them and the art direction asks for illustration; Pexels photos the owner imported; Pixabay photos; Commons and The Met for real, named subjects and historical or cultural niches; SVG and CSS art made in the build.

#### Scenario: No AI images allowed
- **WHEN** a brief does not allow AI images and the hero needs a photo of a treatment room
- **THEN** the build searches Pixabay before Commons and records the chosen photo with its provenance

### Requirement: Stock photo license rules
A stock photo showing a person SHALL be presented as illustrative and SHALL never be shown as the business's team, customers or patients, placed next to a quote, a name or a result, or shown in a bad light; no stock photo SHALL be used in a logo, brand mark or business name, or show a recognisable trademark, logo or brand.

#### Scenario: Branded product in a stock photo
- **WHEN** the best Pixabay match for a café shows a recognisable soft-drink logo
- **THEN** the build skips it and picks another photo

#### Scenario: Stock person next to a quote
- **WHEN** a draft places a Pixabay portrait beside a testimonial
- **THEN** the build must replace it, since a stock person never stands for the business's people

### Requirement: Every landing carries visuals
The final check SHALL fail when a built home page has no visual, or when its first section has none, and SHALL warn when fewer than half of the sections in `<main>` carry one. A visual is an `img`, a `picture`, a `video`, a `[data-scene]` poster, an element with `role="img"` and an `aria-label`, or an inline `svg` whose `viewBox` is at least 96 units wide. On a multi-locale site each locale's home page is checked.

#### Scenario: Text-only hero
- **WHEN** the first section of `dist/index.html` holds only headings, text and buttons with a 24-unit icon
- **THEN** `check-landing` fails `visual-assets` naming the section

#### Scenario: Sparse imagery
- **WHEN** the hero has a photo and two of eight sections carry a visual
- **THEN** `check-landing` passes with the warning `visual-assets-sparse`

### Requirement: Signature moment in every proposal
Every proposal SHALL name one signature moment a visitor should remember: the section it lives in, what it shows, the technique, its reduced-motion and no-JavaScript form and the brief facts it uses, at every impact level and without invented proof. The build SHALL record in RUN.md "Design decisions" whether the moment was built as planned or why it changed.

#### Scenario: Proposal template
- **WHEN** `new-site` scaffolds a site
- **THEN** its `PROPOSAL.md` has a "Signature moment" section right after "Archetype blend"

#### Scenario: Quiet impact
- **WHEN** a brief asks for `quiet` impact
- **THEN** the proposal still names a signature moment, a quieter one

### Requirement: Layout signature ignores the skip link
`scripts/layout-signature.mjs` SHALL leave out of the button measures (`buttonRadius`, `buttonShape`) a link or button whose box lies entirely outside the page, such as the layout's off-screen skip link, so that a skip link never makes a page with no filled button read as one with a filled button.

#### Scenario: Skip link only
- **WHEN** a page's only element with a filled background is the off-screen skip link and its calls to action are text links
- **THEN** the signature's `buttonShape` is `text`

#### Scenario: Page without a skip link
- **WHEN** a page has no off-screen link
- **THEN** its button measures are the same as before this change
