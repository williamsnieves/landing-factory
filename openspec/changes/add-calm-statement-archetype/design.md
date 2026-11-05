# Design: add-calm-statement-archetype

## The calm-statement sheet

Front matter:

```yaml
name: calm-statement
summary: 'Calm but striking without photographs: one idea per screen set very large in generous space, soft full-bleed colour fields and one drawn shape that recurs through the page.'
signals:
  fits: [calm, serious, premium, local-service, few-assets, conversion-first, educational]
  avoid: [playful, experimental, data-heavy]
impact: [balanced, bold]
lends: [statement-band, line-art-thread]
rejects: [marquee-type, overlap-collage, handwritten-accent, visible-grid, bento-grid]
hero: [typographic, illustration]
signature:
  sectionCount: [5, 10]
  cols1Share: [0.4, 0.9]
  fullBleedShare: [0.25, 0.8]
  imageRadius: [0, 32]
  buttonShape: [pill, rect]
  headingScale: [6, 14]
  headingAlign: [left, center]
  eyebrowShare: [0, 0.4]
  wordsPerScreen: [15, 90]
  footerType: [minimal, columns]
  rotatedShare: [0, 0.02]
  overlapShare: [0, 0.15]
```

The body uses the same H2 sections as every sheet, written in our own words:

- **Layout grammar.** One statement per screen. Bands alternate between a soft colour field and the light ground. Each statement band carries one oversized line plus a short supporting paragraph and, where the Copy plan places it, the action. Practical facts (where, when, price) sit in calm two-column blocks between the bands.
- **Header and footer.** A light header with the name and the one action, sticky only when the brief is `conversion-first`. A minimal footer, or quiet columns when the brief has contact data and hours.
- **Typography.**
  - One humanist or soft serif display face, large and with generous leading, plus a quiet text face.
  - Scale carries the impact, not weight or capitals.
- **Imagery.**
  - One drawn element: a line, a curve or an organic shape in SVG or CSS that recurs or runs through sections.
  - Photos (stock or the customer's) are optional, placed large and calm, and never in a grid.
- **Buttons and links.** A filled, rounded or rectangular button for the one action, and quiet text links for the rest.
- **Motion.**
  - Slow, wide reveals of the statements; the drawn line may draw with the scroll.
  - With reduced motion, everything appears in its final state.
- **Lendable traits:** `statement-band` and `line-art-thread`.
- **Do:**
  - put one idea per screen;
  - use colour fields soft enough to keep text contrast at 4.5:1;
  - keep the drawn element from the brand's palette.
- **Don't:**
  - no medium headings;
  - no eyebrows on every section;
  - no icon grids;
  - no decorative gradients;
  - no photo collage;
  - no shouting (`bold` impact means bigger and bolder colour, not louder copy).

## Impact field

- **Brief:** `brand.impact`, enum `IMPACT_LEVELS = ['quiet', 'balanced', 'bold']`. It may be listed in `assumed`.
- **Picker:**
  - `impact = brief.brand?.impact`, else `balanced`, with `impactAssumed` true when missing or listed in `assumed`.
  - `scoreArchetype` adds `+IMPACT_WEIGHT` (1) when `a.impact.includes(impact)`, else `-IMPACT_WEIGHT`.
  - The secondary of a blend keeps the existing half weight of its whole score, impact included.
  - The CLI's reasons line says `impact balanced (assumed)`.
  - A site without `brief.json` uses `balanced`, assumed.
- **Validator:** `impact` is required, a non-empty subset of `IMPACT_LEVELS` without duplicates.
- **Expected effect on fisioterapia-ribera's signals** (`local-service, calm, serious, conversion-first, few-assets`, impact `balanced`):
  - `calm-statement` scores 1 (local-service) + 1 (calm) + 1 (serious) + 1 (conversion-first) + 1.5 (few-assets) + 1 (impact) = 6.5;
  - `swiss-grid-minimal` scores 2 (calm, serious) - 1 (impact) = 1;
  - `warm-local-service` scores 3 (local-service, calm, conversion-first) + 1 (impact) = 4; it lists `photo-rich` in fits, not `few-assets`, so it gains nothing there.

  The exact numbers are asserted in the test against the real sheets.

## Signature moment

- **Template:** `new-site.mjs` writes the heading `## Signature moment` after "Archetype blend" in the `PROPOSAL.md` template, with a one-line prompt: section, what it shows, technique, reduced-motion and no-JS form, and the brief facts it uses.
- **Skill:** the `new-landing` synthesis fills it.
  - The moment must exist at every impact level; `quiet` means a quieter moment, not none.
  - It must not invent proof, figures or results.
  - The build implements it, and RUN.md "Design decisions" has the line `Signature moment: built as planned`, or `changed: <why>`.
- **Existing proposals** (archived sites) are not touched.

## Tests

- `validate-archetypes`:
  - the new sheet passes;
  - a sheet without `impact`, with an unknown level or with duplicates fails, naming it;
  - the new traits must appear in the README traits table with their owner.
- `pick-archetypes`:
  - with a temp site holding the fisioterapia-ribera signals and `impact: balanced`, `calm-statement` ranks above `swiss-grid-minimal`;
  - with `impact: quiet`, `swiss-grid-minimal` gains 1 and `calm-statement` loses 1;
  - the output names the impact and whether it was assumed.
- **Brief:**
  - `brand.impact: "loud"` fails naming the allowed values;
  - an assumed impact is valid;
  - `missing` lists it;
  - `summary` shows it.
- `new-site`: the template contains `## Signature moment` after `## Archetype blend`.
