# Design: add-product-led-saas-archetype

## Context

Archetype sheets are a starting grammar validated by `scripts/validate-archetypes.mjs` (front matter with closed vocabularies, required H2 sections, signature ranges), ranked by `scripts/pick-archetypes.mjs` and compared with built pages by `check-landing` (a warning only). Traits live in one closed list (`TRAITS`) and each has exactly one owner sheet. Reference sheets are mapped onto signals and traits by keyword rules (`REF_RULES`).

## Decisions

### 1. One sheet, three traits, no new hero type

The grammar's signature is the framed interface under a short headline. A new hero value (`ui-frame`) would ripple into `landing-meta`, `directions-schema.mjs`, the diversity trio in `check-landing` and every existing MASTER.md vocabulary check. The hero types already describe the layout well (`typographic` when the headline is centered above the frame, `split` when it sits beside it, `video` for a looping product capture), and the frame itself is the `ui-frame-hero` trait. That keeps the change to the catalog and the ranking.

### 2. Front matter

```yaml
name: product-led-saas
summary: 'A software product page: a short two-tone headline over a framed interface, quiet customer marks, then alternating feature modules with one visual each on a calm neutral page.'
signals:
  fits: [technical, premium, conversion-first, product-showcase, calm, few-assets]
  avoid: [heritage, craft, local-service, playful, editorial-content]
lends: [ui-frame-hero, two-tone-heading, logo-strip-under-hero]
rejects: [overlap-collage, handwritten-accent, drop-cap]
hero: [typographic, split, video]
signature:
  sectionCount: [6, 12]
  cols2Share: [0.3, 0.8]
  fullBleedShare: [0, 0.25]
  imageRadius: [8, 24]
  buttonRadius: [6, 999]
  buttonShape: [pill, rect]
  headingAlign: [left, center]
  eyebrowShare: [0, 0.5]
  wordsPerScreen: [20, 80]
  mediaPerScreen: [0.6, 2.5]
  footerType: [columns, minimal]
```

The ranges come from the four reference sheets (densities, alternating two-column modules, rounded frames of about 12 to 20 px, pill or slightly rounded buttons, a columns footer). They differ from every existing signature, which the catalog test requires. `few-assets` fits because the interface, type and hairlines carry the page without photographs. `bento-product-showcase` keeps `photo-rich`.

### 3. Body: the grammar in our words

The sections follow the format (Layout grammar, Header and footer, Typography, Imagery, Buttons and links, Motion, Lendable traits, Do, Don't). The content is written from the reference sheets' "Take" lines in abstract terms, with no site named as a template:

- **Layout:** hero (headline, one line, primary and secondary action, then the frame cropped by the fold); a logo strip; three to five feature modules alternating heading-left/visual-right, each with one visual and a short list; one proof module; a closing call to action; a columns footer. Huge gaps between modules, tight spacing inside.
- **Typography:** one neutral grotesque or humanist sans at weights 400 to 500, display 48 to 72 px with tight leading, two-tone headings, an optional mono face for small labels.
- **Imagery:** interface frames, code or data panels drawn in HTML/CSS, abstract gradients; photographs only when the brief has them.
- **Motion:** short fades and a slight rise for modules, an optional slow glow or scrub on the hero frame, no pinned sections by default.
- **Honesty (in Do and Don't):** frames show the customer's screenshots or an abstract mock, never invented metrics, names, features or logos. A logo strip needs supplied marks with permission (brief assets), else it is omitted or replaced by a facts strip. Testimonials, ratings and usage numbers never appear without the brief.

### 4. Traits and reference rules

`TRAITS` gains `ui-frame-hero`, `two-tone-heading` and `logo-strip-under-hero`, owned by `product-led-saas`. `REF_RULES` gains:

| Pattern (lowercase sheet text)                                                        | Yields                                  |
| ------------------------------------------------------------------------------------- | --------------------------------------- |
| `interface shot\|product (screen\|ui\|mock\|video)\|ui (frame\|mock)\|framed product` | trait `ui-frame-hero`                   |
| `two-tone`                                                                            | trait `two-tone-heading`                |
| `logo strip\|customer marks\|logo row\|customer logos`                                | trait `logo-strip-under-hero`           |
| `conversion\|primary action\|call to action`                                          | signal `conversion-first` (if missing)  |

The tests check that the four sheets yield the new traits, so the rules are tuned against the sheets' real text, not invented phrases. An existing rule that already covers a word is not duplicated.

## Risks

- **Catalog drift:** the sheet must not read like a copy of one reference. It is written from four, in abstract terms, and the validator rejects URLs and site names.
- **Ranking shifts:** brief signals such as `technical` now also favor the new primary. The existing pick-archetypes tests are re-run; fixtures that expect another top blend are checked, and any change is explained in the test, not hidden.
- **Fake proof:** the honesty rules sit in the sheet that the build reads, and `brief-facts` and review back them. No new automated check is added for logos; a reviewer looks at the strip.

## Verification

`npm run validate:archetypes` (11 sheets), `npm test` (catalog count, unique signatures, README lists the new traits, pick-archetypes ranks `product-led-saas` first for `technical, premium, conversion-first` and yields the three traits from the four reference sheets), lint, Prettier, `openspec validate --strict`, the clean-clone run.
