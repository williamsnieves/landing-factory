# Design system: Casavela Inmobiliaria (casavela)

## 1. Skill queries run

All from the repo root with `python3 .claude/skills/ui-ux-pro-max/scripts/search.py` (ui-ux-pro-max only; no other design skill was used for palette or fonts). Inputs: `sites/casavela/PROPOSAL.md` (approved), `brief.json`, `directions.json` (direction a chosen, the owner's notes are fixed input), `DIRECTIONS.md` and the owner's palette revision of 2026-10-30 (quoted in section 2). The first build's queries (warm terracotta and home-decoration families) led to a deep brick primary, `#A3402A`, which the owner retired; the queries below are the ones of the revised palette.

| #   | Query                                                                                                   | Result in short                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `"real estate navy trust warm sand cream terracotta accent" --design-system -p "Casavela Inmobiliaria"` | Pattern "Hero-Centric Design" (full-bleed hero), style "Glassmorphism", Real Estate palette "trust teal + professional blue" (#0F766E / #0369A1 on #F0FDFA, foreground #134E4A), fonts Cinzel + Josefin Sans (luxury real estate), avoid "poor photos".                                              |
| 2   | `"navy sand taupe cream warm" --domain color -n 4`                                                      | Notes app "warm ink + amber accent on cream" (warm grey #78716C, cream background #FFFBEB), Bakery "warm brown + cream", B2B Service "professional navy + blue CTA" (#0F172A, secondary #334155, background #F8FAFC), Podcast "dark audio + warm accent" (deep indigo navy #1E1B4B with an orange).  |
| 3   | `"banking trust navy premium gold" --domain color -n 3`                                                 | **Banking/Traditional Finance "Trust navy + premium gold"** (primary #0F172A, secondary #1E3A8A, accent #A16207), Legal Services "authority navy + trust gold" (#1E3A8A, accent #B45309), Luxury "premium black + gold" (warm stone neutrals #1C1917 / #44403C / border #D6D3D1).                    |
| 4   | `"real estate property trust" --domain color -n 3`                                                      | Real Estate/Property is still the cold teal + blue; then Fintech gold + purple (dark) and Legal Services navy + gold again.                                                                                                                                                                          |
| 5   | `"warm terracotta clay accent" --domain color -n 3`                                                     | "Warm terracotta + fresh green" (primary #9A3412, muted #F8F2F0, border #F2E6E2, background #FFFBEB), Podcast's navy with a warm orange accent, Notes app warm ink on cream.                                                                                                                         |
| 6   | `"trustworthy professional banking serious navy warm" --domain typography -n 4`                         | **Financial Trust (IBM Plex Sans + IBM Plex Sans: "trustworthy, professional, banking, serious; excellent for data")** first, then Legal Professional (EB Garamond + Lato), Corporate Trust (Lexend + Source Sans 3), Medical Clean (Figtree + Noto Sans). IBM Plex Sans is confirmed for navy/sand. |

Fonts are unchanged from the first build (`@fontsource-variable/ibm-plex-sans` 5.3.0, already installed): no package change and no credits change.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

Fixed input, the owner's revision (2026-10-30), wins over the skill: "the brick primary is not right. Use a real-estate palette inspired by the owner's Pinterest board: deep navy as the primary (trust), warm sand/taupe as the secondary, cream paper and a near-black ink; terracotta only as a small accent (a Valencia nod). Keep it warm, not cold corporate blue. Palette and tokens from ui-ux-pro-max only; keep IBM Plex Sans unless the new palette clearly asks otherwise; keep the structure, sections and copy of the first build."

1. **Palette family.** The skill's Real Estate palette (queries 1 and 4) is a cold teal with a professional blue on a mint background. The owner asks for navy, sand, cream and near-black. Resolution: the owner wins; the palette is built from the skill's navy entries (query 3 "Trust navy + premium gold", query 2 "professional navy") for the primary and from its warm cream and warm-stone neutrals (query 2 "warm ink on cream", query 3 "premium black" stone borders) for paper, surface, line and ink. Every value was retuned and measured; none is copied.
2. **Cold versus warm navy.** The skill's navies (#0F172A, #1E3A8A) are cold slate or saturated corporate blue, which the owner rejects ("not cold corporate blue"). Resolution: a desaturated navy pulled slightly toward violet-red, `#232D47` (hue about 223°, saturation about 34 %, lightness about 21 %), sitting on cream and sand so the whole page reads warm.
3. **Second color.** The skill pairs navy with gold (queries 3) and terracotta with green (query 5). Gold reads as luxury, the wrong promise for a neighbourhood agency, and green is not in the owner's board. Resolution: the owner's warm sand/taupe is the secondary, as the `surface` panels and `line` hairlines, not a second saturated hue.
4. **Terracotta.** The skill's terracotta (#9A3412) is a primary in its palette; the owner wants it only as a small Valencia accent. Resolution: a new `--color-terracotta` (`#9E4527`) for small markers, rules, dots and small text only, plus the existing pale `accent` tint behind the "Dato de ejemplo" tag; never buttons, links or large areas. It sits close to the retired brick, which is intended: the Valencia nod survives at small scale.
5. **Navy family against estudio-arquitectura.** estudio-arquitectura's primary is `#17356B` (navy, Schibsted Grotesk, split hero). The owner accepts the family overlap. Resolution: `#232D47` is visibly apart from it: much less saturated (about 34 % against 65 %), darker (about 21 % against 25 % lightness) and shifted about 5° toward violet-red; the display font differs (IBM Plex Sans), so the `diversity` trio (primary, display font, hero) is not shared. It is also far from tupathdigital `#1881D4` (bright blue), clinica-dental `#0F6B68` (teal) and app-finanzas `#4A35D4` (saturated indigo).
6. **The first build's "no navy" rule.** Section 8 of the first build forbade teal, navy or blue as an action color. The owner's revision supersedes it for navy; the rule now forbids teal, bright or saturated blue and olive only.
7. **Fonts.** The `--design-system` run proposes Cinzel + Josefin Sans (luxury real estate). Cinzel is a decorative all-caps serif that contradicts the owner's clean-sans note and the product-like clarity. Resolution: the skill's own "Financial Trust" pairing (query 6), IBM Plex Sans for headings and text, kept from the first build; navy and sand do not ask for another face.
8. **Style.** The skill's top style is Glassmorphism (backdrop blur, translucent layers). The page stays light, flat and product-like with hairline rails (Minimalism & Swiss Style structure from the first build). No blur.
9. **Radius.** Minimalism & Swiss Style uses 0 px. The first build's radii stay (6 / 10 / 16 px) with the section 6 amendment (pill buttons). The palette change does not touch them.
10. **Landing pattern.** "Hero-Centric Design" wants a full-bleed hero. The proposal fixes a `split` hero and puts the full-bleed Valencia photograph in its own band; the owner asks to keep structure, sections and copy. The page map stands.
11. **Archetype sheets vs. skill and proposal** (unchanged from the first build). `data-and-proof` wants figures that count up; they stay static. `warm-local-service` allows no pinned sections; the sticky calculator is CSS `position: sticky`, not a pin. Image radii 10 px or 0 px when full-bleed sit inside both sheets' ranges.

## 3. Chosen style

**Warm navy clarity.** A light, flat, document-like page framed by two 1 px hairline rails: cream paper, warm sand panels for the product areas (valuation card, calculator, practical strip, hours card), taupe hairlines, a near-black warm ink and one deep warm navy reserved for actions, links, focus and the two data bars. A small terracotta mark (step markers, a short rule or dot) is the Valencia nod, never a fill. The two-tone headline uses ink for the first sentence and `ink-soft` for the continuation. Warmth comes from the cream and sand neutrals, the desaturated navy and the real Valencia street photograph, never from gradients, blur or decoration. Constraints respected: moderate radius family (6 / 10 / 16 px, pills for buttons, chips and the hours bar after the section 6 amendment), low type contrast (one family, medium heading scale, weight and tone carry hierarchy), medium density with generous section padding, hairlines instead of shadows.

## 4. Palette

| Role             | Token                      | Hex       | Use                                                                                                                                                                         |
| ---------------- | -------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| primary          | `--color-primary`          | `#232D47` | Deep warm navy: the one action color (filled pill buttons, text links, 3 px focus ring, the "Gratis" chip, the hours bar segments, the calculator result bar, step numbers) |
| primary-hover    | `--color-primary-hover`    | `#182036` | Hover and active state of buttons and links                                                                                                                                 |
| primary-contrast | `--color-primary-contrast` | `#FBF7F0` | Text and icons on `primary` and `primary-hover` (the cream paper)                                                                                                           |
| accent           | `--color-accent`           | `#F1D9CB` | Pale terracotta tint: background of the "Dato de ejemplo" tag, with ink text. Background only                                                                               |
| terracotta       | `--color-terracotta`       | `#9E4527` | Small Valencia accent: step-number markers, a short rule or dot, small text. Never buttons, links or large areas                                                            |
| ink              | `--color-ink`              | `#1C1A17` | Near-black warm ink: headings, body text, the first sentence of two-tone headlines                                                                                          |
| ink-soft         | `--color-ink-soft`         | `#57504A` | Secondary text, the muted continuation of two-tone headlines, captions, labels, input borders                                                                               |
| paper            | `--color-paper`            | `#FBF7F0` | Cream page background                                                                                                                                                       |
| surface          | `--color-surface`          | `#EBE2D3` | Warm sand secondary: valuation card frame, calculator panel, practical strip, hours card, chips                                                                             |
| line             | `--color-line`             | `#D6C8B4` | Taupe hairline rails, frame borders and dividers; decorative only                                                                                                           |

Measured WCAG 2.x contrast (relative luminance with the sRGB linearization; luminances: paper 0.933, surface 0.768, accent 0.726, line 0.589, terracotta 0.117, ink-soft 0.083, primary 0.027, primary-hover 0.015, ink 0.010):

| Pair used                                                     | Ratio     | Requirement  | Result                    |
| ------------------------------------------------------------- | --------- | ------------ | ------------------------- |
| `ink` on `paper` (body, headings)                             | 16.3      | 4.5          | pass (AAA)                |
| `ink` on `surface` (text in panels)                           | 13.5      | 4.5          | pass (AAA)                |
| `ink-soft` on `paper` (secondary, headline tail)              | 7.4       | 4.5          | pass (AAA)                |
| `ink-soft` on `surface`                                       | 6.2       | 4.5          | pass                      |
| `primary-contrast` on `primary` (button label, "Gratis" chip) | 12.8      | 4.5          | pass (AAA)                |
| `primary-contrast` on `primary-hover` (hover)                 | 15.1      | 4.5          | pass (AAA)                |
| `primary` on `paper` (text links, step numbers, focus ring)   | 12.8      | 4.5          | pass (AAA)                |
| `primary` on `surface` (links and bars in panels)             | 10.6      | 4.5          | pass (AAA)                |
| `paper` on `ink` (any inverted block)                         | 16.3      | 4.5          | pass (AAA)                |
| `ink` on `accent` ("Dato de ejemplo" tag)                     | 12.8      | 4.5          | pass (AAA)                |
| `ink-soft` on `accent`                                        | 5.9       | 4.5          | pass                      |
| `terracotta` on `paper` (small text, markers)                 | 5.9       | 4.5          | pass                      |
| `terracotta` on `surface` (small text, markers in panels)     | 4.9       | 4.5          | pass                      |
| `terracotta` on `accent`                                      | 4.7       | 4.5          | pass                      |
| `primary` on `accent` (non-text)                              | 10.1      | 3 (non-text) | pass                      |
| `primary` on `line` (bar on a hairline track, non-text)       | 8.3       | 3 (non-text) | pass                      |
| `ink-soft` on `paper` as an input border                      | 7.4       | 3 (non-text) | pass                      |
| `line` on `paper` / `surface`                                 | 1.5 / 1.3 | n/a          | decorative hairlines only |

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
- **Amended by the full build (2026-10-30):** buttons, the header icon links, the "Gratis" chip and the hours bar use `--radius-pill`. With 6 px rectangles the built page failed `layout-diversity` against `app-finanzas` (distance 0.05) and `estudio-arquitectura` (0.16); the button shape is one of the levers the skill names, and both archetype sheets allow pills. Palette, fonts and the other radii are unchanged. Reasons in `sites/casavela/RUN.md` "Design decisions". (The palette was later revised by the owner, sections 2 and 4; radii unchanged.)

## 7. Motion tokens

- Durations: 150 ms (hover, color), 250 ms (focus and small state), 600 ms (reveals). Easing: `cubic-bezier(0.22, 1, 0.36, 1)` for reveals, `ease-out` for hover.
- `data-reveal` on section openers and the figure strip: fade and rise 16 px, once.
- One `data-parallax` (subtle, about 8-10 % speed difference) on the Valencia photo band: the one playful moment.
- The calculator panel: CSS `position: sticky` from 1024 px, not a GSAP pin; static on phones.
- No count-up, no scrub, no Lenis-driven flourish beyond the motion layer's defaults. Reduced motion: no parallax, no smooth scroll, reveals shown at rest.

## 8. Do / don't for the build step

Do:

- Use the tokens only (`bg-paper`, `text-ink`, `bg-primary`, `text-terracotta`, ...); no raw hex in components.
- Keep `primary` (navy) for actions, links, focus, the "Gratis" chip, step-number text and the two data bars; one filled primary pill button plus an outlined secondary (ink border, ink text) per group.
- Use `surface` (sand) for the product panels and chips; `ink`, `ink-soft` and `primary` text all stay readable on it.
- Use `ink-soft` for the muted half of two-tone headlines and for input borders (`line` is too light for a control border).
- Use `terracotta` only at small scale: a step-number marker, a short rule or dot, a small label. At most a few touches per section.
- Set `tabular-nums` on every figure, price and calculator value.
- Put tags ("Dato de ejemplo") on `accent` with `ink` text.
- Keep hairline rails and frame borders in `line`, 1 px.

Don't:

- No gradients, glass, blur, glow or decorative shadows (at most one soft shadow on the calculator panel).
- No `accent` or `line` as text color; no text on `primary` other than `primary-contrast`.
- No `terracotta` on buttons, links, focus rings, bars or any large area (section backgrounds, panels, the photo band); it is a small accent, not a second action color.
- No radius above 16 px except `--radius-pill` (buttons, chips and the hours bar, after the full-build amendment in section 6).
- No second typeface, no rounded display face, no all-caps decorative serif.
- No count-up figures, no invented statistics, ratings or awards (regulated niche).
- From `data-and-proof`: no chart or figure without its source line. From `warm-local-service`: no experimental motion, no giant outlined words, no stock image passed off as the agency or a property.
- No teal, no bright or saturated corporate blue, no gold and no olive (other sites' families or declined by the owner); the navy stays the warm, desaturated `primary`.

## 9. Landing meta

```landing-meta
primary: #232d47
display-font: IBM Plex Sans
body-font: IBM Plex Sans
hero: split
archetype: custom
traits: ref:framer-com/split-sticky, ref:stripe-com/stat-strip, practical-strip
```
