## ADDED Requirements

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
