# Design system: Fisioterapia Ribera (fisioterapia-ribera)

Written by the design-system phase of `/new-landing` with ui-ux-pro-max only (no design-taste-frontend, no impeccable). Inputs: the approved `sites/fisioterapia-ribera/PROPOSAL.md` ("Direction in one line", "Archetype blend", "Visual direction", "Conversion plan"), the brief (prospect, regulated health niche, Spanish, tone cercano, profesional, tranquilo, claro; no brand colors or fonts) and the archetype sheets `design-archetypes/swiss-grid-minimal.md` (primary) and `design-archetypes/warm-local-service.md` (secondary, lending `practical-strip` and `hours-card`). The approved proposal wins over the skill.

Direction in one line: a quiet, orderly clinic page on a strict grid, where the practical facts (what we treat, when, how much, how to book) are as easy to find as on a well-run reception desk, and the 50-minute session is the one idea the page is built around.

## 1. Skill queries run

1. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "physiotherapy clinic calm trust swiss grid minimal green local service" --design-system -p "Fisioterapia Ribera"`: pattern "Trust & Authority + Conversion", style "Accessible & Ethical" (healthcare, contrast 4.5, visible focus, reduced motion, 44 px targets), palette "Medical teal + health green" (cyan primary, green accent, mint ground), font pairing "Minimal Swiss" (Inter / Inter).
2. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "physiotherapy clinic calm trust green reed natural health" --domain color -n 6`: Healthcare App and Medical Clinic (cyan + green), Florist/Plant Shop ("Natural green": a green-700 primary, a green-900 foreground, a mint ground, a pink accent), Patient Portal (clinical blue), two lavender wellness palettes.
3. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "humanist sans calm clear trustworthy health clinic minimal" --domain typography -n 6`: Wellness Calm (Lora + Raleway), Medical Clean (Figtree + Noto Sans), Plus Jakarta Sans, Minimal Swiss (Inter), Spatial Clear (Inter), Accessibility First (Atkinson Hyperlegible, "healthcare, inclusive design, maximum legibility").
4. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "swiss grid minimal flush left calm healthcare" --domain style -n 5`: "Minimalism & Swiss Style" (grid 12-16 columns, `--border-radius: 0px`, no shadow, single primary accent, subtle hover 200-250 ms).
5. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "humanist sans serif tabular figures variable legible" --domain google-fonts -n 10`: only monospace families; not used.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

- **Primary hue.** The skill's design system and its two healthcare palettes lead with medical cyan/teal. The proposal rules out teal (the other clinic site) and blue (three other sites) and asks for a deep reed or river green. Resolved: the green family of the skill's own color results (the "Natural green" palette: green-700 primary and green-900 deep) is used, one step deeper than its primary (`#166534`, between the skill's green-700 and green-900), because the proposal asks for a **deep** green and the skill's green-700 measured 4.45:1 on the surface tone (under 4.5).
- **Ground.** The skill proposes a mint-tinted ground. The proposal asks for a calm off-white ground and keeps the green tint for the hours card only. Resolved: a near-neutral off-white paper; the light green tint is a separate token used only by the hours card (and, at most, the highlighted price cell).
- **Secondary and accent colors.** The skill adds a bright cyan secondary, a pink accent (florist) or a green accent with black text. The proposal and the Swiss sheet allow one primary only. Resolved: no secondary hue; `accent` is the deep green used for hover and pressed states.
- **Ink.** The skill's foregrounds are tinted dark teal or deep green, and its muted text is cool slate. The proposal asks for near-black ink. Resolved: a near-black with a faint green cast and a warm grey-green for secondary text, both above 7:1.
- **Fonts.** The design system's pick is Inter (Minimal Swiss); the typography search also offers Figtree + Noto Sans (Medical Clean) and Atkinson Hyperlegible (Accessibility First). Figtree is used by the other clinic site and is excluded by the proposal. The proposal asks for one **humanist** sans; Inter is a neo-grotesque. Resolved: Atkinson Hyperlegible (from the skill's "Accessibility First" result, recommended for healthcare), in its variable successor **Atkinson Hyperlegible Next** (`@fontsource-variable/atkinson-hyperlegible-next`, weights 200-800), a grotesque with humanist letterforms built for legibility, used for headings and text. Not used by any other site.
- **Pattern.** The skill's "Trust & Authority + Conversion" pattern wants proof (logos, certificates, stats, case studies) right after the hero and a "Contact Sales / Get Quote" form. The brief has no proof, forbids invented proof and comparisons, and the proposal has no form. Resolved: the proposal's page map stands; trust comes from visible facts (practical strip, prices, hours) as the Conversion plan says.
- **Skill style vs archetype sheets.** "Accessible & Ethical" and "Minimalism & Swiss Style" agree with the Swiss sheet on radius 0, no shadow, one accent and a 12-column grid. The skill's "clear type hierarchy" and "high contrast" are read as color contrast only: the Swiss sheet asks for a **small** size step between heading and lead, so the type scale below keeps the hero heading at about 1.9x the lead, not a display size.
- **Secondary archetype vs primary.** `warm-local-service` allows 6-40 px radii and pill buttons; the Swiss primary owns the radius family: images and cells 0 px, the filled primary button 2 px (the proposal's planned deviation from the Swiss outline button).
- **Tabular figures.** The proposal wants tabular figures for prices, hours and the ruler. The build sets `font-variant-numeric: tabular-nums` on those elements and checks in the screenshots that the digits align; if the font's `tnum` feature turns out to be missing, the numbers are aligned with fixed-width cells on the grid instead (never by switching to a second family).

## 3. Chosen style

**Swiss minimal, accessible clinic.** "Minimalism & Swiss Style" with the healthcare rules of "Accessible & Ethical": a strict twelve-column grid, flush-left ragged-right text, white space as the main material, thin rules instead of color bands (the closing call to action is the one colour field, a planned deviation), no shadows, no gradients, no decoration. Archetype constraints respected: radius family 0 px (images, cells, cards) and 2 px (the filled primary button only); small type contrast between heading and lead (about 1.9x at the hero, 1.4x for section headings); modest density (generous line height, short lines, large gaps between blocks); one sticky label column in `#sesion` and the sticky header. The lent `practical-strip` and `hours-card` come from `warm-local-service`; the hours card is the one tinted surface.

Emotional target: trust (primary), calm (secondary). It is an input to the palette and font queries, not a rule: evidence that colors or fonts carry emotions is weak, so contrast, legibility and the brief's brand constraints win.

## 4. Palette

| Role                                  | Token                      | Hex       | Use                                                                                          |
| ------------------------------------- | -------------------------- | --------- | -------------------------------------------------------------------------------------------- |
| Ground                                | `--color-paper`            | `#FAFAF7` | Page background (calm off-white, near neutral)                                               |
| Surface                               | `--color-surface`          | `#F1F2EC` | Quiet blocks (practical strip cells on hover, footer band if needed)                         |
| Tint                                  | `--color-tint`             | `#E6F1E8` | Hours card background; at most the highlighted price cell                                    |
| Ink                                   | `--color-ink`              | `#141A15` | Headings and body text                                                                       |
| Ink soft                              | `--color-ink-soft`         | `#4B544C` | Secondary text, captions ("Foto ilustrativa", "dato de ejemplo"), strong rules               |
| Line                                  | `--color-line`             | `#D5D9D1` | Thin decorative rules between cells and sections (not a control boundary)                    |
| Primary (deep reed green)             | `--color-primary`          | `#166534` | Filled primary button, links, the 50-minute ruler, highlighted price rule, focus ring, close |
| Primary hover / accent (deeper green) | `--color-primary-hover`    | `#14532D` | Hover and pressed state of the primary button and links; `--color-accent` is the same color  |
| Primary contrast                      | `--color-primary-contrast` | `#FFFFFF` | Text on the primary button and on the closing colour field                                   |

WCAG contrast of each pair used (relative luminance, sRGB; text >= 4.5, large text and non-text >= 3):

| Pair (foreground on background)   | Ratio  | Use                                  | Verdict    |
| --------------------------------- | ------ | ------------------------------------ | ---------- |
| ink on paper                      | 16.9:1 | All text                             | text ok    |
| ink on surface                    | 15.7:1 | Text in surface blocks               | text ok    |
| ink on tint                       | 15.2:1 | Hours card text                      | text ok    |
| ink-soft on paper                 | 7.5:1  | Captions, secondary text             | text ok    |
| ink-soft on surface               | 7.0:1  | Captions in surface blocks           | text ok    |
| ink-soft on tint                  | 6.8:1  | Hours card labels                    | text ok    |
| primary-contrast on primary       | 7.1:1  | Button label, closing field text     | text ok    |
| primary-contrast on primary-hover | 9.1:1  | Button label on hover                | text ok    |
| primary on paper                  | 6.8:1  | Links, ruler ticks, focus ring       | text ok    |
| primary on surface                | 6.3:1  | Links in surface blocks              | text ok    |
| primary on tint                   | 6.2:1  | "Hoy" marker and links in hours card | text ok    |
| primary-hover on tint             | 7.9:1  | Link hover in hours card             | text ok    |
| paper on primary                  | 6.8:1  | Off-white text in the closing field  | text ok    |
| paper on ink                      | 16.9:1 | Skip link / inverted label if any    | text ok    |
| line on paper                     | 1.4:1  | Decorative rules only                | decorative |

`line` is never the only boundary of a control: buttons are filled, links are underlined, and the highlighted price uses a primary rule (6.8:1). `node scripts/check-landing.mjs --site fisioterapia-ribera` re-checks the standard pairs from `tokens.css`.

## 5. Typography

- **Family (headings and text):** Atkinson Hyperlegible Next, variable `wght` 200-800, latin subset, self-hosted with `@fontsource-variable/atkinson-hyperlegible-next` (CSS family `'Atkinson Hyperlegible Next Variable'`). SIL Open Font License 1.1. One family, two weights: **400** for text and **600** for headings, labels and prices. No italic in the page.
- **Numbers:** `font-variant-numeric: tabular-nums` on prices, hours, phone, the practical strip and the ruler (see the conflict note in section 2).
- **Fallback stack:** `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.
- **Type scale** (small heading contrast, per the Swiss sheet; three sizes carry the page: base, lg, 2xl/3xl):

| Token         | Size                        | Use                                                          |
| ------------- | --------------------------- | ------------------------------------------------------------ |
| `--text-xs`   | 0.8125rem (13 px)           | Captions, "dato de ejemplo", footer small print              |
| `--text-sm`   | 0.9375rem (15 px)           | Labels, header links, practical strip labels                 |
| `--text-base` | 1.0625rem (17 px)           | Body text, line height 1.6, measure 60-68 characters         |
| `--text-lg`   | 1.25rem (20 px)             | Hero lead, practical strip values, list items in first visit |
| `--text-xl`   | 1.5rem (24 px)              | Section headings (h2), price names                           |
| `--text-2xl`  | 1.875rem (30 px)            | Prices, hours set large in the hours card                    |
| `--text-3xl`  | clamp(2rem, 3.6vw, 2.5rem)  | Hero `h1` (32-40 px), about 1.9x the lead at most            |
| `--text-4xl`  | clamp(2.25rem, 4.4vw, 3rem) | Reserved (closing heading at most); never a display size     |

Headings: weight 600, line height 1.2, letter-spacing 0, sentence case, flush left, `text-wrap: balance`. Text: weight 400, line height 1.6, `text-wrap: pretty`.

## 6. Spacing, rhythm, radii

- **Spacing:** Tailwind base unit `--spacing: 0.25rem`. Rhythm: block gap 1.5-2rem inside a section; section padding 6rem (desktop) / 4rem (mobile); outer page margin 1rem at 375 px, 2rem at 768 px, 3rem at 1440 px; content max width 80rem on a 12-column grid with a 1.5rem gutter.
- **Column spans** (reuse these only): 7 + 5 (hero), 3-3-3-3 (practical strip, ruler stages), 3 + 9 (qué tratamos), 4 + 8 (first visit, questions), 4-4-4 (prices), 5 + 7 (hours and contact), 8 (closing).
- **Density:** modest. 40-160 words per screen (Swiss signature range); one idea per block.
- **Radii** (Swiss family; the secondary archetype's rounding is not used):

| Token           | Value    | Use                                                   |
| --------------- | -------- | ----------------------------------------------------- |
| `--radius-none` | 0        | Photos, cells, the hours card, price cells, the field |
| `--radius-sm`   | 0.125rem | The filled primary button only (2 px, the maximum)    |
| `--radius-md`   | 0.125rem | Alias of `sm` so no utility can round further         |
| `--radius-lg`   | 0.125rem | Alias of `sm` so no utility can round further         |

No pill radius token: pills are ruled out by the Swiss sheet.

- **Rules:** 1 px `line` between cells and sections; 2 px `primary` rule on the highlighted price and under the ruler line.
- **Touch targets:** at least 44 x 44 px for the button, phone link and anchors (skill: Accessible & Ethical).

## 7. Motion tokens

| Token               | Value                          | Use                                                         |
| ------------------- | ------------------------------ | ----------------------------------------------------------- |
| `--duration-fast`   | 200ms                          | Hover color change of buttons and links (skill: 200-250 ms) |
| `--duration-reveal` | 900ms                          | Fade-and-rise of a block (slow, short distance)             |
| `--duration-ruler`  | 1400ms                         | The ruler line drawing 0 to 50 once                         |
| `--ease-calm`       | cubic-bezier(0.22, 1, 0.36, 1) | Reveals and the ruler                                       |
| `--ease-standard`   | cubic-bezier(0.4, 0, 0.2, 1)   | Hover transitions                                           |

Primitives (only from `src/components/motion/README.md`): `data-reveal` fade-and-rise per block (never on the `h1` or the LCP photo), one staggered reveal for the ruler stages, CSS `position: sticky` for the label column of `#sesion`. No pin, no scrub, no parallax, no marquee, no smooth scroll beyond what `<Motion />` provides. Reduced motion: everything at rest, the ruler fully drawn.

## 8. Do / don't for the build step

Do:

- Snap every element to the 12-column grid and reuse only the spans of section 6.
- Keep headings at weight 600 and text at 400 in the one family; let position and space make the hierarchy.
- Set prices, hours, phone and ruler numbers in tabular figures, aligned on the grid.
- Use `primary` for the one filled button (2 px radius), links, the ruler and the highlighted price rule; nothing else is green except the hours card tint and the closing field.
- Put "Foto ilustrativa" and "dato de ejemplo" captions in `ink-soft` at `text-xs`, aligned to the grid.
- Keep visible focus rings (3 px `primary`, offset 3 px) and 44 px targets.
- Use only token utilities (`bg-paper`, `text-ink`, `bg-tint`, `rounded-sm`, ...); no hex values in components.

Don't (Swiss sheet "Don't" plus the proposal):

- No large centered headings, no pills, no rounded photos or cards, no shadows, no gradients.
- No decorative eyebrow label above every heading.
- No heavy type contrast between heading and body; no display-size type.
- No wordmark footer or oversized brand text.
- No color bands between sections (the closing field is the one exception).
- No second hue, no teal or blue, no pink accent.
- No giant numerals, marquee type, overlap collage or handwritten accents.
- No contact data hidden behind an interaction; no embedded map.
- No invented testimonials, ratings, figures or claims.

## 9. Landing meta

Machine-readable summary read by `scripts/check-landing.mjs` (tokens check, diversity rules, archetype-target warning). Keep it in sync with sections 4 and 5 and with the "Archetype blend" of the proposal.

```landing-meta
primary: #166534
display-font: Atkinson Hyperlegible Next
body-font: Atkinson Hyperlegible Next
hero: split
archetype: swiss-grid-minimal+warm-local-service
traits: practical-strip, hours-card
```

`archetype` is `<primary>`, `<primary>+<secondary>` or `custom` (reference-led); `traits` lists the lent traits, and `ref:<sheet>/<trait>` for a trait taken from a reference sheet.
