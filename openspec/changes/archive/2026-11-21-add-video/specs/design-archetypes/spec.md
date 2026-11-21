## ADDED Requirements

### Requirement: Cinematic loop archetype
The catalog SHALL include a `cinematic-loop` archetype for pages carried by moving footage: a full-bleed muted looping clip behind a centred statement with a scrim, a framed second clip overlapping the next band, one short clip per feature row, a clip gallery that loads in view and alternating dark and light bands. It SHALL deliver the `balanced` and `bold` impact levels, use `hero: video` and lend `video-scrim-hero` and `clip-feature-rows`.

#### Scenario: Guard rails in the sheet
- **WHEN** the `cinematic-loop` sheet is read
- **THEN** it requires a poster and a reduced-motion form for every clip, at most one clip playing per viewport, 4.5:1 text contrast over the brightest frame, no sound and no countdown

#### Scenario: Video-led brief with the reference
- **WHEN** a brief's signals are `bold`, `product-showcase` and `photo-rich` with a `bold` impact and `--refs buzzy-now`
- **THEN** `cinematic-loop` is the primary of the best archetype blend (a reference-led `custom` outcome may still rank above every blend)

#### Scenario: Existing local business brief
- **WHEN** the picker runs for fisioterapia-ribera's signals
- **THEN** `cinematic-loop` does not rank above `calm-statement`
