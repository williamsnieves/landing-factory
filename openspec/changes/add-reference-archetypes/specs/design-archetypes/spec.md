## ADDED Requirements

### Requirement: Chaptered atlas archetype
The catalog SHALL include a `chaptered-atlas` archetype for release, launch and collection pages: a first screen that maps all chapters and doubles as navigation, one saturated colour field per chapter and a fixed chapter rail. It SHALL deliver the `balanced` and `bold` impact levels and lend `self-map-hero` and `chapter-color-fields`.

#### Scenario: Guard rails in the sheet
- **WHEN** the `chaptered-atlas` sheet is read
- **THEN** it limits the page to six chapters and requires a reduced-motion form and 4.5:1 text contrast on every colour field

#### Scenario: Product launch with references
- **WHEN** a brief's signals are `bold`, `product-showcase` and `storytelling` with a `bold` impact and `--refs shopify-editions`
- **THEN** `chaptered-atlas` is the primary of the best archetype blend (a reference-led `custom` outcome may still rank above every blend, as for any clear reference)

### Requirement: Developer console archetype
The catalog SHALL include a `dev-console` archetype for AI, software and developer pages: monospaced metadata with optional key hints, a humanist sans for titles, a light ground with one accent, an index or changelog list as the hero, a fixed identity column and one original motif drawn in code. It SHALL deliver the `quiet` and `balanced` impact levels and lend `mono-meta-rows` and `generative-dot-field`.

#### Scenario: Technical product without photos
- **WHEN** a brief's signals are `technical`, `product-showcase`, `few-assets` and `calm` with a `balanced` impact and `--refs claude-dev`
- **THEN** `dev-console` is the primary of the best archetype blend (a reference-led `custom` outcome may still rank above every blend)

#### Scenario: Existing local business brief
- **WHEN** the picker runs for fisioterapia-ribera's signals
- **THEN** neither new archetype ranks above `calm-statement`
