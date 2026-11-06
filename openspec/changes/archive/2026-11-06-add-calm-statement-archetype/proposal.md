# Proposal: add-calm-statement-archetype

## Why

The fisioterapia-ribera prospect (PR #55) passed every check, but the owner found it "correct but not striking" (2026-11-04). The review traced the cause to the archetype catalog more than to the build.

The brief's signals were `local-service`, `calm`, `serious`, `conversion-first` and `few-assets`. Against those signals the 11 sheets offer two kinds of grammar:

- **Quiet grammars:** `swiss-grid-minimal` and `warm-local-service`. `warm-local-service` needs real photos of the place.
- **Striking grammars:** `typographic-poster`, `brutalist-raw` and `immersive-scene`. All three avoid `calm` or `local-service`, or need photos or media.

No sheet is **calm and striking at once, without depending on photos**. That gap covers a large share of track 1: clinics, physiotherapists, psychologists, lawyers, advisers and therapists. They are local professional services, often prospects without good photos of their own.

The calm tone is also carried into the look. Nothing in the brief separates "the copy must be calm" from "the page may be quiet". The picker therefore ranks a restrained grammar first whenever `calm` and `serious` appear, and no proposal is asked for the one moment a visitor should remember.

The owner decided (2026-11-04) to add a new archetype, an impact level in the brief and a signature moment in every proposal, in one change. The stock photo source the owner also asked for shipped first (`add-stock-images`, PR #56).

## What Changes

- **New archetype `calm-statement`** (`design-archetypes/calm-statement.md`): calm but striking without photographs. Impact comes from scale, colour and one drawn shape:
  - one idea per screen, set very large (eight to twelve times the body size), in generous space;
  - soft full-bleed colour fields alternating with a light ground;
  - one large SVG or CSS shape or line that recurs or runs through the page;
  - slow, wide reveals.
  - It fits `calm`, `serious`, `premium`, `local-service`, `few-assets`, `conversion-first` and `educational`, and avoids `playful`, `experimental` and `data-heavy`.
  - The allowed heroes are `typographic` and `illustration`.
  - It lends two new traits: `statement-band` (a full-bleed soft colour field carrying one oversized line) and `line-art-thread` (one large drawn line or shape that recurs across sections).
  - Photos are welcome when there are good ones (stock from Pixabay or an imported Pexels photo), but the page never depends on them.
- **Impact level in the brief.** A new optional field `brand.impact` takes `quiet`, `balanced` or `bold`. It says how striking the page should look, separately from the tone of the copy.
  - It may be listed in `assumed`, and `balanced` is used when it is empty, reported as assumed.
  - `brief missing` lists it among the recommended fields, `summary` shows it, and `/brief-intake` asks "how striking should the page look?" without assuming.
  - Older briefs stay valid.
- **Impact in the picker.** Every archetype sheet gets an `impact` list: the levels its grammar can deliver. `pick-archetypes` adds 2 to a primary whose list holds the brief's level and subtracts 2 when it does not.
  - The levels per sheet:
    - `[quiet]`: swiss-grid-minimal;
    - `[quiet, balanced]`: data-and-proof, editorial-magazine, product-led-saas, warm-local-service;
    - `[balanced, bold]`: bento-product-showcase, collage-scrapbook, horizontal-chapter-story, calm-statement;
    - `[bold]`: brutalist-raw, immersive-scene, typographic-poster.
  - The output names the level and whether it was assumed. `validate:archetypes` requires the field.
- **Signature moment in every proposal.** `PROPOSAL.md` gets a "Signature moment" section after "Archetype blend". It names one moment a visitor should remember and how it is built:
  - the section it lives in;
  - what it shows;
  - the technique (scale, colour field, drawn shape, motion, 3D or photo);
  - what it looks like with reduced motion and without JavaScript.

  The moment is built from brief facts and never invents proof. `new-site.mjs` writes the heading into the template. The build confirms the moment in RUN.md "Design decisions", or says why it changed.
- **Docs:** the archetype README (catalog, traits, the `impact` field), CLAUDE.md ("Design archetypes", "Customer brief", "Generating a landing"), `docs/status.md`.

## Capabilities

### Modified Capabilities

- `design-archetypes`: the `calm-statement` sheet, the `impact` field on every sheet, and impact in the ranking.
- `brief-intake`: the `brand.impact` field and its question.
- `landing-generation`: the "Signature moment" section of the proposal.

## Impact

- **Archetype sheets:** `design-archetypes/calm-statement.md` (new) and the `impact` line in the other 11 sheets. Only front matter changes in those 11; their grammar text is untouched.
- **Code:**
  - `scripts/validate-archetypes.mjs` (the field and the new traits);
  - `scripts/pick-archetypes.mjs` (the impact score and its output);
  - `scripts/lib/brief-schema.mjs` (`brand.impact`, missing, summary);
  - `scripts/new-site.mjs` (the template heading).
- **Skills:** `new-landing` (signature moment, impact in the synthesis) and `brief-intake` (the question).
- **Tests:**
  - `tests/validate-archetypes*.test.mjs`;
  - `tests/pick-archetypes*.test.mjs` (fisioterapia-ribera's signals with `balanced` rank `calm-statement` above `swiss-grid-minimal`; `quiet` keeps the old order);
  - the brief schema tests;
  - the new-site template test.
- **Existing landings:** unchanged. Their `landing-meta` blends stay valid, since `calm-statement` is only a new candidate. Rebuilding fisioterapia-ribera with the new archetype and Pixabay photos is a separate test run after this change merges.
