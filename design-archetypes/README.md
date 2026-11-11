# design-archetypes

A catalog of composition archetypes for generated landings. An archetype is a **starting grammar, not a template**: it names a layout grammar (grid, section patterns, header and footer, density), a typography and imagery treatment, buttons and links, a motion signature, the requirement signals it fits and avoids, and a few traits another archetype may borrow. Each landing starts from a blend chosen from its requirement and its references, and then goes where that requirement leads.

## What is flexible and what is not

- **Flexible:** every rule in a sheet. The build may deviate from any archetype rule when the requirement or a reference justifies it; each deviation is written in `RUN.md` under "Design decisions". The `signature` ranges of a sheet are compared with the built page by `check-landing`, and a miss is a **warning**, never a failure.
- **Reference-led:** when the reference pattern sheets (`patterns/<slug>.md`) give a clear direction, the blend may be `archetype: custom`: the references are the base and archetypes only fill the gaps. The proposal then says which reference drives which part.
- **Hard rules:** the quality budgets of `CLAUDE.md`, licensing and originality, and the layout diversity rule (`scripts/check-landing.mjs`, `scripts/layout-signature.mjs`).

## Sheet format

`design-archetypes/<name>.md`, checked by `npm run validate:archetypes`.

```yaml
---
name: <file name without .md>
summary: 'one or two sentences, at most 240 characters'
signals:
  fits: [signals the archetype suits]
  avoid: [signals it does not suit]
impact: [impact levels its grammar can deliver]
lends: [one to three traits others may borrow]
rejects: [lent traits that clash with this grammar]
hero: [allowed hero types]
signature:
  <feature>: [min, max] # numbers
  <feature>: [value, value] # categories
---
```

`impact` is a non-empty list from the closed set `quiet`, `balanced`, `bold` (see "Impact" below). The body has these H2 sections, all non-empty: Layout grammar, Header and footer, Typography, Imagery, Buttons and links, Motion, Lendable traits (one bullet `- \`trait\`: description`per lent trait, matching`lends`), Do, Don't. Sheets are written in our own words, contain no URLs and never name a real site as a template.

`signature` holds target ranges for the features of the layout signature (below): a two-number list for a count, ratio or pixel feature, the allowed values for a category.

## Signals (closed vocabulary)

The synthesis writes a `Signals: a, b, c` line in the Brief of `PROPOSAL.md` (or the intake writes `signals` in `brief.json`) using only these words. `photo-rich` and `few-assets` describe the assets the customer has and weigh more in the score. The tone words (`calm`, `bold`, ...) describe the requirement; how striking the look should be is a separate answer, the impact level (see "Impact").

| Signal              | Meaning                                                       |
| ------------------- | ------------------------------------------------------------- |
| `premium`           | high-end, refined, price not the lead                         |
| `playful`           | light-hearted, informal, fun                                  |
| `serious`           | sober, institutional, trust through restraint                 |
| `technical`         | engineering, software, specifications matter                  |
| `heritage`          | tradition, history, long-standing craft                       |
| `craft`             | handmade, artisan, made in small batches                      |
| `local-service`     | a business tied to a place, hours and an address              |
| `product-showcase`  | one product or a product line is the star                     |
| `storytelling`      | a narrative or a journey explains the offer                   |
| `data-heavy`        | figures, comparisons and proof carry the message              |
| `editorial-content` | long-form text, articles or explanation                       |
| `experimental`      | unconventional, art-directed, willing to surprise             |
| `calm`              | quiet, unhurried, lots of space                               |
| `bold`              | loud, confident, high contrast                                |
| `conversion-first`  | one action (book, buy, call) must be obvious at all times     |
| `educational`       | teaches a topic to a newcomer                                 |
| `photo-rich`        | many good photographs are available                           |
| `few-assets`        | little or no photography; type and shapes must carry the page |

## Impact

`impact` says how striking a page may look, apart from the tone of its copy: a calm tone does not mean a quiet look. The brief carries the level in `brand.impact` (`quiet`, `balanced` or `bold`; `balanced` is assumed when it is empty). Each sheet lists the levels its grammar can deliver, and `pick-archetypes` adds two points to a primary whose list holds the brief's level and subtracts two when it does not, so an explicit choice outweighs any single signal (the secondary of a blend keeps half of its own score, impact included). The output names the level and says when it was assumed.

| Level      | Meaning                                                                  |
| ---------- | ------------------------------------------------------------------------ |
| `quiet`    | restrained: order and space carry the page, nothing competes for the eye |
| `balanced` | calm surface with one deliberate moment of scale, colour or shape        |
| `bold`     | a strong, memorable look: big type, strong colour, a pronounced gesture  |

## Lendable traits (closed vocabulary)

A trait has one owner sheet (which defines it). A secondary archetype lends one or two of its traits to the primary, unless the primary lists the trait in `rejects`. A reference sheet can also supply a trait: it is written `ref:<sheet>/<trait>`.

| Trait                   | Owner                    |
| ----------------------- | ------------------------ |
| `visible-grid`          | brutalist-raw            |
| `mono-labels`           | brutalist-raw            |
| `flush-left-axis`       | swiss-grid-minimal       |
| `split-sticky`          | swiss-grid-minimal       |
| `marquee-type`          | typographic-poster       |
| `giant-numerals`        | typographic-poster       |
| `horizontal-chapter`    | horizontal-chapter-story |
| `chapter-index`         | horizontal-chapter-story |
| `bento-grid`            | bento-product-showcase   |
| `spec-chips`            | bento-product-showcase   |
| `overlap-collage`       | collage-scrapbook        |
| `handwritten-accent`    | collage-scrapbook        |
| `drop-cap`              | editorial-magazine       |
| `pull-quote`            | editorial-magazine       |
| `scene-backdrop`        | immersive-scene          |
| `chaptered-overlay`     | immersive-scene          |
| `hours-card`            | warm-local-service       |
| `practical-strip`       | warm-local-service       |
| `stat-strip`            | data-and-proof           |
| `comparison-table`      | data-and-proof           |
| `ui-frame-hero`         | product-led-saas         |
| `two-tone-heading`      | product-led-saas         |
| `logo-strip-under-hero` | product-led-saas         |
| `statement-band`        | calm-statement           |
| `line-art-thread`       | calm-statement           |
| `self-map-hero`         | chaptered-atlas          |
| `chapter-color-fields`  | chaptered-atlas          |
| `mono-meta-rows`        | dev-console              |
| `generative-dot-field`  | dev-console              |

## Blends

1. The **primary** archetype owns the layout grammar: grid, section patterns, header, footer and hero type.
2. The **secondary** (optional) lends one or two named traits and nothing else.
3. One **twist** comes from the requirement itself (a product's physical texture, a ritual of the business, a data point the customer is proud of) and is described in the proposal.
4. **Reference-led:** with `archetype: custom` the references drive the grammar; the archetypes that fit the brief best only fill gaps.

`node scripts/pick-archetypes.mjs --site <slug> [--refs a,b] [--top N] [--json]` ranks the candidates (see the header of the script for the scoring): fits minus avoids for the brief signals, reference sheets mapped onto the same vocabulary, and the exclusion of blends already used by other sites (the `archetype:` line of their `landing-meta`; a primary already used by two other sites is excluded too). The synthesis prefers the top blend unless the brief clearly argues otherwise and records the choice and the reasons in `PROPOSAL.md` ("Archetype blend") and in the `landing-meta` block of `design-system/<slug>/MASTER.md`:

```landing-meta
archetype: primary+secondary
traits: trait-a, trait-b
```

(`archetype: custom` and `ref:<sheet>/<trait>` entries are valid.)

## Layout signature

`node scripts/layout-signature.mjs --site <slug> --write` measures the built home page and stores `sites/<slug>/layout-signature.json`: the coarse features below at 1440 px and a 64-bit difference hash of each viewport-height slice. `check-landing` compares a site with every other site that has a signature (the `layout-diversity` rule, thresholds in `qa.config.json` under `diversity`) and warns when the page is far from its primary archetype's ranges.

| Feature          | Kind                             | Meaning    |
| ---------------- | -------------------------------- | ---------- |
| `sectionCount`   | count                            | weight 1   |
| `cols1Share`     | ratio                            | weight 1   |
| `cols2Share`     | ratio                            | weight 1   |
| `cols3Share`     | ratio                            | weight 1   |
| `splitRatio`     | ratio                            | weight 1   |
| `fullBleedShare` | ratio                            | weight 2   |
| `imageRadius`    | px                               | weight 2   |
| `buttonRadius`   | px                               | weight 2   |
| `buttonShape`    | cat (pill, rect, text)           | weight 2   |
| `headingScale`   | count                            | weight 1.5 |
| `headingAlign`   | cat (left, center, right)        | weight 1   |
| `headingCase`    | ratio                            | weight 1   |
| `eyebrowShare`   | ratio                            | weight 2   |
| `wordsPerScreen` | count                            | weight 1   |
| `footerType`     | cat (wordmark, columns, minimal) | weight 1.5 |
| `mediaPerScreen` | count                            | weight 1   |
| `rotatedShare`   | ratio                            | weight 1   |
| `overlapShare`   | ratio                            | weight 1   |
| `stickyCount`    | count                            | weight 0.5 |

The header of `scripts/layout-signature.mjs` documents how each one is measured.

## Catalog

| Archetype                                               | In one line                                                                                                                                                    |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [bento-product-showcase](bento-product-showcase.md)     | A tile grid of mixed sizes that presents a product or a service line as a set of feature tiles, with product shots and short claims.                           |
| [brutalist-raw](brutalist-raw.md)                       | Raw, structural pages: hard edges, visible grid lines, monospaced labels, dense blocks and text links instead of buttons. Honest and loud without decoration.  |
| [calm-statement](calm-statement.md)                     | Calm but striking without photographs: one idea per screen set very large in generous space, soft full-bleed colour fields and one drawn shape that recurs.    |
| [chaptered-atlas](chaptered-atlas.md)                   | A release or launch page that maps itself in the first screen, with one saturated colour field per chapter, a giant vertical word and a fixed chapter rail.    |
| [collage-scrapbook](collage-scrapbook.md)               | Playful and handmade: overlapping, slightly rotated photos, paper textures, handwritten accents and stickers, arranged like a scrapbook page.                  |
| [data-and-proof](data-and-proof.md)                     | Evidence first: figures, small charts drawn in CSS or SVG, comparison tables and clear claims with their sources.                                              |
| [dev-console](dev-console.md)                           | The developer-tool look: monospaced metadata, a humanist sans, a warm light ground, an index list as the hero and a generative dot field as the closing scene. |
| [editorial-magazine](editorial-magazine.md)             | Reads like a magazine feature: multi-column text, drop caps, pull quotes, captions and a strong masthead, with photographs set among the words.                |
| [horizontal-chapter-story](horizontal-chapter-story.md) | A story told in chapters. One pinned section scrolls a horizontal track of panels, with a chapter index and full-screen moments between them.                  |
| [immersive-scene](immersive-scene.md)                   | Full-bleed media or a 3D scene fills the screen with minimal chrome; short chaptered overlays carry the story over it.                                         |
| [product-led-saas](product-led-saas.md)                 | A software product page: a short two-tone headline over a framed interface, quiet customer marks, then alternating feature modules with one visual each.       |
| [swiss-grid-minimal](swiss-grid-minimal.md)             | A strict twelve-column grid, flush-left text, small type contrast, no rounded corners and a lot of white. Order and restraint carry the page.                  |
| [typographic-poster](typographic-poster.md)             | Type is the image. Huge display lettering, tight cropping and bold color fields carry the page, with few or no photographs.                                    |
| [warm-local-service](warm-local-service.md)             | Friendly and practical: what, where, when and how to reach us come first; warm photos, hours, a map and one obvious action.                                    |
