## ADDED Requirements

### Requirement: Stock photos from Pexels
`scripts/find-images.mjs` SHALL search Pexels with `--source pexels` and download one photo with `get <slug> pexels:<id>`, only from `https://images.pexels.com`, recording it in `assets.json` with `source: "pexels"`, `pexelsId`, `title`, `sourcePage`, `author`, `authorUrl`, `license: "Pexels License"`, `licenseUrl` and `credit: true`.

#### Scenario: Photo downloaded from Pexels
- **WHEN** `get demo pexels:123` runs against an API that returns a photo by "Ana Ruiz"
- **THEN** the file is saved under `sites/demo/src/assets/images/` and `assets.json` gains an entry with `source: "pexels"` and author "Ana Ruiz"

#### Scenario: Download from another host
- **WHEN** the API answers with a photo whose download URL is not on `images.pexels.com`
- **THEN** nothing is downloaded or recorded and the command exits 1 naming the host

### Requirement: Pexels key handling
The Pexels API key SHALL be read only from `PEXELS_API_KEY` or from a credential saved for `api.pexels.com` in the session's network settings, and SHALL never be printed, logged, stored or passed as an argument.

#### Scenario: Missing key
- **WHEN** the API answers 401
- **THEN** the command exits 1 saying to set `PEXELS_API_KEY` or save a credential for `api.pexels.com`, and prints no key

### Requirement: Pexels credits
`credits.mjs` SHALL list each Pexels photo with its photographer and license in `CREDITS.md` and `src/data/credits.json`, and SHALL add one "Photos provided by Pexels" line linking `https://www.pexels.com` when the manifest has a Pexels entry.

#### Scenario: Credits for a Pexels photo
- **WHEN** `credits.mjs` runs on a manifest with a Pexels photo by "Ana Ruiz"
- **THEN** both `CREDITS.md` and `src/data/credits.json` credit her and link Pexels once

### Requirement: Image source order
Generation SHALL take images in this order: the customer's files; AI images where the brief allows them and the art direction asks for illustration; Pexels photos; Commons and The Met for real, named subjects and historical or cultural niches; SVG and CSS art made in the build. A stock photo showing a person SHALL be presented as illustrative and SHALL never be shown as the business's team, customers or patients, or next to a quote, a name or a result.

#### Scenario: No AI images allowed
- **WHEN** a brief does not allow AI images and the hero needs a photo of a treatment room
- **THEN** the build searches Pexels before Commons and records the chosen photo with its provenance

#### Scenario: Stock person next to a quote
- **WHEN** a draft places a Pexels portrait beside a testimonial
- **THEN** the build must replace it, since a stock person never stands for the business's people

### Requirement: Every landing carries visuals
The final check SHALL fail when a built home page has no visual, or when its first section has none, and SHALL warn when fewer than half of the sections in `<main>` carry one. A visual is an `img`, a `picture`, a `video`, a `[data-scene]` poster or an inline `svg` whose `viewBox` is at least 96 units wide. On a multi-locale site each locale's home page is checked.

#### Scenario: Text-only hero
- **WHEN** the first section of `dist/index.html` holds only headings, text and buttons with a 24-unit icon
- **THEN** `check-landing` fails `visual-assets` naming the section

#### Scenario: Sparse imagery
- **WHEN** the hero has a photo and two of eight sections carry a visual
- **THEN** `check-landing` passes with the warning `visual-assets-sparse`
