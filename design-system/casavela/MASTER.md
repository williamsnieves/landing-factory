# Design system: Casavela Inmobiliaria (casavela)

## 1. Skill queries run

All from the repo root with `python3 .claude/skills/ui-ux-pro-max/scripts/search.py` (ui-ux-pro-max only; no other design skill was used for palette or fonts). Inputs: `sites/casavela/PROPOSAL.md` (approved), `brief.json`, `directions.json` (direction a chosen, the owner's notes are fixed input) and `DIRECTIONS.md`.

| #   | Query                                                                                                                             | Result in short                                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `"real estate agency mortgage advice warm trust local Valencia clean product clarity" --design-system -p "Casavela Inmobiliaria"` | Pattern "Hero-Centric Design" (full-bleed hero), style "Glassmorphism", Real Estate palette "trust teal + professional blue" (#0F766E / #0369A1 on #F0FDFA, foreground #134E4A), fonts Cinzel + Josefin Sans (luxury real estate), avoid "poor photos". |
| 2   | `"real estate warm trust terracotta clay" --domain color`                                                                         | Real Estate/Property (the same teal + blue), then "Warm terracotta + fresh green" (primary #9A3412, secondary #C2410C, background #FFFBEB, muted #F8F2F0, border #F2E6E2).                                                                              |
| 3   | `"real estate mortgage finance trustworthy" --domain color`                                                                       | Real Estate teal again, "Trust blue + profit green" (dark), Banking "Trust navy + premium gold".                                                                                                                                                        |
| 4   | `"warm earthy terracotta brick home local service trust" --domain color -n 5`                                                     | Warm terracotta + fresh green (#9A3412), Home Decoration "interior warm grey + gold accent" (#78716C, background #FAF5F2), restaurant red, local-events orange.                                                                                         |
| 5   | `"clean modern sans professional trustworthy finance tabular" --domain typography -n 5`                                           | Corporate Trust (Lexend + Source Sans 3), **Financial Trust (IBM Plex Sans + IBM Plex Sans: "trustworthy, professional, banking, serious; excellent for data")**, Modern Professional (Poppins + Open Sans), Medical Clean (Figtree).                   |
| 6   | `"minimal clean product clarity light hairline professional" --domain style -n 3`                                                 | Minimalism & Swiss Style: white space, grid, sans-serif, essential elements only, no shadows or gradients, single primary, `--border-radius: 0px`.                                                                                                      |
| 7   | `"IBM Plex Sans variable sans serif" --domain google-fonts -n 6`                                                                  | IBM Plex Sans: sans serif, variable axes `wdth` 75-100 and `wght` 100-700, designers Mike Abbink and Bold Monday.                                                                                                                                       |

Package checked with `npm view @fontsource-variable/ibm-plex-sans version`: 5.3.0 (installed with `npm install -w site-casavela @fontsource-variable/ibm-plex-sans`).

## 2. Conflicts between the skill and the proposal (reported, not hidden)

1. **Palette family.** The skill's Real Estate palette (queries 1-3) is a cold teal with a professional blue. The owner's notes ask for a warm palette, neither a's violet nor c's olive, and the teal/navy/blue families are already used by clinica-dental, estudio-arquitectura and tupathdigital. Resolution: the owner wins. The palette is built from the skill's warm entries: the "warm terracotta" family of query 2/4 (#9A3412 primary on a warm cream background with warm muted and border tints) and the warm-grey neutrals of "Home Decoration" (query 4). Every value was retuned and measured; none is copied.
2. **Second color.** The skill pairs terracotta with a "fresh green" accent and Home Decoration with gold. Green would bring back c's olive feel, which the owner declined, and gold reads as luxury. Resolution: no second hue; the accent is a pale clay tint of the primary, used as a quiet fill for frames, chips and the calculator bar track.
3. **Primary hue against other sites.** A terracotta sits near samurai (#e5543a) and personal-brand (#ff6f3c) in hue and near panaderia (#92400e) in tone. Resolution: a deep brick (#A3402A, hue about 11°, much darker and less saturated than the two oranges, redder and less brown than panaderia's amber); display font and hero type differ from all three, so no trio is shared.
4. **Fonts.** The `--design-system` run proposes Cinzel + Josefin Sans (luxury real estate). Cinzel is a decorative all-caps serif: it contradicts the owner's note ("a clean sans like a's") and the proposal's product-like clarity, and "luxury" is the wrong promise for a neighbourhood agency in a regulated niche. Resolution: the skill's own "Financial Trust" pairing (query 5), IBM Plex Sans for headings and text: a clean, neutral grotesque with tabular figures, made for data, not rounded. It differs from every other site's display font, and Figtree, Schibsted Grotesk and Space Grotesk (the other split heroes) are avoided.
5. **Style.** The skill's top style is Glassmorphism (backdrop blur, translucent layers). The proposal asks for a light, flat, product-like page with hairline rails. Resolution: structure from "Minimalism & Swiss Style" (query 6): white space, grid, essential elements, single primary, no gradients; at most one very soft shadow on the calculator panel. No blur.
6. **Radius.** Minimalism & Swiss Style uses 0 px. The proposal's custom + warm-local blend and a's frames call for moderate rounding. Resolution: a's radii kept (6 / 10 / 16 px); buttons are rounded rectangles, not pills.
7. **Landing pattern.** "Hero-Centric Design" wants a full-bleed hero. The proposal fixes a `split` hero (a's grammar) and puts the full-bleed Valencia photograph in its own band after the hero. Resolution: the proposal's page map stands.
8. **Archetype sheets vs. skill and proposal.** `data-and-proof` wants figures that count up; the proposal keeps them static (few figures, two are sample data). `warm-local-service` allows no pinned sections; the proposal's sticky calculator is CSS `position: sticky`, not a pin, and is the customer's request. `data-and-proof` allows image radii 0-12 px and `warm-local-service` 6-40 px: images use 10 px (`--radius-md`) or 0 px when full-bleed, inside both ranges. `framer-com`'s 24-32 px card radii and dark shell are not used (light page, 16 px maximum).

## 3. Chosen style

**Warm product clarity.** A light, flat, document-like page framed by two 1 px hairline rails (a's grammar): warm off-white paper, warm sand panels for the product areas (valuation card, calculator, hours card), deep warm-brown ink and one deep brick color reserved for actions, links and focus. The two-tone headline uses ink for the first sentence and `ink-soft` for the continuation. Warmth comes from the color temperature of every neutral, the brick action color and the real Valencia street photograph, never from gradients, blur or decoration. Constraints respected: moderate radius family (6 / 10 / 16 px, no pills on buttons), low type contrast (one family, medium heading scale, weight and tone carry hierarchy), medium density with generous section padding, hairlines instead of shadows.

## 4. Palette

| Role             | Token                      | Hex       | Use                                                                                                                                             |
| ---------------- | -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| primary          | `--color-primary`          | `#A3402A` | Deep brick: the one action color (filled buttons, text links, focus ring, the working-hours bar in the hours card, the calculator's result bar) |
| primary-hover    | `--color-primary-hover`    | `#85321F` | Hover and active state of buttons and links                                                                                                     |
| primary-contrast | `--color-primary-contrast` | `#FFFFFF` | Text and icons on `primary` and `primary-hover`                                                                                                 |
| accent           | `--color-accent`           | `#EBD3C4` | Pale clay tint: chip and tag backgrounds ("dato de ejemplo"), the calculator bar track, selected-row tint. Background only, with ink text       |
| ink              | `--color-ink`              | `#231A15` | Headings, body text, the first sentence of two-tone headlines                                                                                   |
| ink-soft         | `--color-ink-soft`         | `#5C4F45` | Secondary text, the muted continuation of two-tone headlines, captions, labels, input borders                                                   |
| paper            | `--color-paper`            | `#FBF8F4` | Page background                                                                                                                                 |
| surface          | `--color-surface`          | `#F3ECE3` | Warm sand panels: valuation card, calculator panel, practical strip, hours card                                                                 |
| line             | `--color-line`             | `#E2D7C9` | Hairline rails, frame borders and dividers; decorative only                                                                                     |

Measured WCAG 2.x contrast (relative luminance, sRGB linearization):

| Pair used                                          | Ratio | Requirement  | Result                     |
| -------------------------------------------------- | ----- | ------------ | -------------------------- |
| `ink` on `paper` (body, headings)                  | 16.1  | 4.5          | pass (AAA)                 |
| `ink` on `surface` (text in panels)                | 14.6  | 4.5          | pass (AAA)                 |
| `ink-soft` on `paper` (secondary, headline tail)   | 7.5   | 4.5          | pass (AAA)                 |
| `ink-soft` on `surface`                            | 6.7   | 4.5          | pass                       |
| `primary-contrast` on `primary` (button label)     | 6.3   | 4.5          | pass                       |
| `primary-contrast` on `primary-hover` (hover)      | 8.5   | 4.5          | pass (AAA)                 |
| `primary` on `paper` (text links, focus ring)      | 6.0   | 4.5          | pass                       |
| `primary` on `surface` (links in panels)           | 5.4   | 4.5          | pass                       |
| `paper` on `ink` (any inverted block)              | 16.1  | 4.5          | pass (AAA)                 |
| `ink` on `accent` (chip and tag text)              | 11.9  | 4.5          | pass (AAA)                 |
| `ink-soft` on `accent`                             | 5.5   | 4.5          | pass                       |
| `primary` on `accent` (bar on its track, non-text) | 4.4   | 3 (non-text) | pass for non-text; no text |
| `ink-soft` on `paper` as an input border           | 7.5   | 3 (non-text) | pass                       |
| `line` on `paper` / `surface`                      | 1.3   | n/a          | decorative hairlines only  |

## 5. Typography

| Role    | Family                                   | Package                              | License     | Why                                                                                                                                           |
| ------- | ---------------------------------------- | ------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Display | IBM Plex Sans (`IBM Plex Sans Variable`) | `@fontsource-variable/ibm-plex-sans` | SIL OFL 1.1 | The skill's "Financial Trust" pairing: neutral, serious, clear grotesque with tabular figures for the calculator and the figures; not rounded |
| Body/UI | IBM Plex Sans (`IBM Plex Sans Variable`) | same                                 | SIL OFL 1.1 | One family, like a's DM Sans: hierarchy from weight and tone; full Spanish coverage (latin, latin-ext)                                        |

Self-hosted through the npm package (`font-display: swap`, variable `wght` 100-700); no request to Google Fonts. Only upright styles; no synthetic bold or italic. Weights: headings 600 (hero 600 with `letter-spacing: -0.02em`), figures 600 with `font-variant-numeric: tabular-nums`, body 400, labels and buttons 500-600. Calculator inputs and results always use `tabular-nums`.

Type scale (tokens; one family, low contrast, medium heading scale):

| Token         | Size                            | Use                                    |
| ------------- | ------------------------------- | -------------------------------------- |
| `--text-xs`   | 0.8125rem (13 px)               | Tags, captions, source lines           |
| `--text-sm`   | 0.9375rem (15 px)               | Labels, footer, secondary copy         |
| `--text-base` | 1.0625rem (17 px)               | Body, line-height 1.6                  |
| `--text-lg`   | 1.25rem (20 px)                 | Lead paragraphs, card titles           |
| `--text-xl`   | 1.5rem (24 px)                  | Sub-headings, calculator result        |
| `--text-2xl`  | 2rem (32 px)                    | Section headings on phones, figures    |
| `--text-3xl`  | clamp(2rem, 4vw, 3rem)          | Section headings (two-tone openers)    |
| `--text-4xl`  | clamp(2.375rem, 5.5vw, 4.25rem) | Hero `h1` (two-tone, line-height 1.05) |

## 6. Spacing, rhythm, radii

- Spacing base `--spacing: 0.25rem`; gaps of 8, 16, 32 and 64 px (stripe-com's rhythm).
- Content frame max 1200 px between the two hairline rails (1 px `line`), 16 px side gutter on phones, 32 px from 768 px.
- Section padding: 96-128 px vertical on desktop, 64-80 px on phones; section openers are heading left, short paragraph right from 1024 px.
- Radii: `--radius-sm` 0.375rem (6 px: chips, tags, inputs, buttons), `--radius-md` 0.625rem (10 px: cards, photos that are not full-bleed, the practical strip), `--radius-lg` 1rem (16 px: the valuation card and the calculator panel). `--radius-pill` stays for the hours bar ends and area chips only. Buttons are rounded rectangles (6 px), never pills. The full-bleed photo band has no radius.
- **Amended by the full build (2026-10-30):** buttons, the header icon links, the "Gratis" chip and the hours bar use `--radius-pill`. With 6 px rectangles the built page failed `layout-diversity` against `app-finanzas` (distance 0.05) and `estudio-arquitectura` (0.16); the button shape is one of the levers the skill names, and both archetype sheets allow pills. Palette, fonts and the other radii are unchanged. Reasons in `sites/casavela/RUN.md` "Design decisions".

## 7. Motion tokens

- Durations: 150 ms (hover, color), 250 ms (focus and small state), 600 ms (reveals). Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for reveals, `ease-out` for hover.
- `data-reveal` on section openers and the figure strip: fade and rise 16 px, once.
- One `data-parallax` (subtle, about 8-10 % speed difference) on the Valencia photo band: the one playful moment.
- The calculator panel: CSS `position: sticky` from 1024 px, not a GSAP pin; static on phones.
- No count-up, no scrub, no Lenis-driven flourish beyond the motion layer's defaults. Reduced motion: no parallax, no smooth scroll, reveals shown at rest.

## 8. Do / don't for the build step

Do:

- Use the tokens only (`bg-paper`, `text-ink`, `bg-primary`, ...); no raw hex in components.
- Keep `primary` for actions, links, focus and the two data bars; one filled primary button plus an outlined secondary (ink border, ink text) per group.
- Use `ink-soft` for the muted half of two-tone headlines and for input borders (`line` is too light for a control border).
- Set `tabular-nums` on every figure, price and calculator value.
- Put tags ("dato de ejemplo") on `accent` with `ink` text.
- Keep hairline rails and frame borders in `line`, 1 px.

Don't:

- No gradients, glass, blur, glow or decorative shadows (at most one soft shadow on the calculator panel).
- No `accent` or `line` as text color; no text on `primary` other than `primary-contrast`.
- No radius above 16 px except `--radius-pill` (buttons, chips and the hours bar, after the full-build amendment in section 6).
- No second typeface, no rounded display face, no all-caps decorative serif.
- No count-up figures, no invented statistics, ratings or awards (regulated niche).
- From `data-and-proof`: no chart or figure without its source line. From `warm-local-service`: no experimental motion, no giant outlined words, no stock image passed off as the agency or a property.
- No teal, navy or blue as an action color (other sites' families) and no olive (declined by the owner).

## 9. Landing meta

```landing-meta
primary: #a3402a
display-font: IBM Plex Sans
body-font: IBM Plex Sans
hero: split
archetype: custom
traits: ref:framer-com/split-sticky, ref:stripe-com/stat-strip, practical-strip
```
