# Design system: TALLER 303 (festival-electronica)

Design-system phase of `/new-landing` for a fictional three-day electronic festival in a disused Bilbao factory. Spanish copy, code and docs in English. Source: ui-ux-pro-max queries plus the approved `PROPOSAL.md` and the brutalist-raw + typographic-poster blend.

## 1. Skill queries run

1. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "electronic music festival nocturnal experimental brutalist industrial loud" --design-system -p "TALLER 303"` (returned Minimalism & Swiss Style, light slate palette, Space Mono / Space Mono).
2. `... "festival nightlife dark neon acid" --domain color` (arcade and gaming dark palettes: neon red/blue/violet on `#0F172A` / `#0F0F23`, green on-accent `#0F172A`).
3. `... "brutalist condensed display monospace poster" --domain typography` (Brutalist Raw: Space Mono; Barlow Condensed; Inter + JetBrains Mono "Bold Typography").
4. `... "brutalism raw typographic dark" --domain style` (Brutalism: 0 px corners, instant transitions, visible borders, weight 700+, no smooth motion).

## 2. Conflicts between the skill and the proposal (reported, not hidden)

- Design-system result picked "Minimalism & Swiss Style" on a light ground (`#F8FAFC`); the proposal asks for a dark nocturnal ground. Proposal wins: Brutalism style from query 4, dark mode.
- Colors: the skill's festival and gaming results use neon red, blue or violet as primary; the proposal wants one acid lime and forbids red, teal and blue primaries (taken by other sites). Proposal wins; only the skill's dark-slate grounds and "dark on bright accent" idea are kept.
- Brutalism style lists pure primaries (red, blue, yellow) and default or system fonts; replaced by a single lime accent and self-hosted variable fonts (proposal: one accent, a condensed-to-wide grotesque).
- Typography: the skill proposes all-mono Space Mono for headings; the proposal and typographic-poster need giant condensed display type. Display is Archivo (wdth axis) instead; the mono role (JetBrains Mono, also in the skill's results) takes labels, times and body. Space Mono was not used because JetBrains Mono is a variable font with a `wght` axis.
- Brutalism "instant, no transitions" vs the proposal's marquee and short reveals: only the marquee loop and `data-reveal` stay; every state change otherwise uses the cut tokens.
- Archetype sheets: brutalist-raw wants a light "paper" default in spirit; the proposal's planned deviation (dark ground, acid accent) is applied. typographic-poster asks for "flat color fields alternating between sections"; here the alternation is ground vs surface and one full lime field (CTA), not several hues, because there is one accent. The sheet's two-size type contrast is kept (giant display, small mono); the mid steps in the scale exist only for UI text.
- Body copy in mono (proposal) vs brutalist sheet "body may run wide and dense": body stays at 15 px mono with a narrow measure for readability.

## 3. Chosen style

Raw nocturnal poster. Blue-black ground, off-white ink, one acid lime for actions and highlights, hairline and 4 px rules that show the grid, giant flush-left condensed display type (Archivo at 62% width, weight 800, leading 0.82) and a mono voice for labels, times and body. Constraints respected: radii 0 everywhere (buttons, photos, cards), flush-left alignment, near-instant state changes, hover inverts colors (lime fill with dark text), few photos in grayscale, no gradients, glass or soft shadows.

## 4. Palette

| Role                | Token                      | Hex       | Use                                                             |
| ------------------- | -------------------------- | --------- | --------------------------------------------------------------- |
| Ground (paper)      | `--color-paper`            | `#0B0E14` | Page background                                                 |
| Surface             | `--color-surface`          | `#131824` | Alternate bands, table rows, cards                              |
| Rule                | `--color-line`             | `#2B3346` | Hairlines, outlined cells, input borders                        |
| Ink                 | `--color-ink`              | `#F2F0E8` | Body and headings (off-white)                                   |
| Ink soft            | `--color-ink-soft`         | `#A9B0BF` | Secondary mono labels, captions                                 |
| Primary (acid lime) | `--color-primary`          | `#C8FF2E` | Buttons, links, highlights, marquee, giant numerals, focus ring |
| Primary contrast    | `--color-primary-contrast` | `#0B0E14` | Text and icons on lime fills                                    |
| Accent (pale lime)  | `--color-accent`           | `#E6FF85` | Hover tint of lime on dark; never a second hue, use sparingly   |

Contrast (WCAG 2.x, relative luminance): ink on paper about 16.6:1; ink-soft on paper about 8.4:1; ink-soft on surface about 7.6:1; primary on paper about 15.7:1 (lime text and links on the dark ground); primary-contrast on primary about 15.7:1 (dark text on lime buttons); accent on paper about 17.5:1; line on paper about 1.4:1 (decorative rules only, not relied on for meaning; interactive boundaries use lime or ink). `node scripts/check-landing.mjs --site festival-electronica` verifies the standard pairs.

## 5. Typography

| Role                | Family                                    | Package                                     | Notes                                                                                                                                                 |
| ------------------- | ----------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display             | Archivo (variable, `wdth` 62-125, `wght`) | `@fontsource-variable/archivo` 5.3.0        | Import `wdth.css`. Giant headings at `font-stretch: 62%`, weight 800, leading 0.82, tracking -0.02em, capitals. Wide (125%) for short contrast words. |
| Body, labels, times | JetBrains Mono (variable, `wght` 100-800) | `@fontsource-variable/jetbrains-mono` 5.3.0 | Import `wght.css`. Labels in capitals at 12-13 px with 0.06em tracking; body 15 px, line-height 1.6.                                                  |

Scale (`tokens.css`): `--text-xs` 12 px (labels), `--text-sm` 13 px (captions, table cells), `--text-base` 15 px (body), `--text-lg` 18 px, `--text-xl` 24 px, `--text-2xl` 40 px, `--text-3xl` clamp(3rem, 9vw, 7rem) (section titles, ticket and stage names), `--text-4xl` clamp(4.5rem, 20vw, 20rem) (hero wordmark, giant numerals). Go big or go small: body and labels use xs-base, headings use 3xl-4xl; xl and 2xl are for artist names in lists only. No italics.

## 6. Spacing, rhythm, radii

Spacing base `--spacing: 0.25rem`. Section padding 6 to 12 rem vertical on desktop, 3 to 6 rem at 375 px; side gutter 4 (1rem) at 375 px, 8 to 12 from 768 px. Rhythm is deliberately uneven: sections follow the page map heights (80 to 180 svh), separated by full-width rules (`--rule-hair` 1 px between rows, `--rule-thick` 4 px between sections). Cells are outlined with `--color-line`.

Radii: `--radius-sm`, `-md`, `-lg` and `-pill` are all `0`. Buttons are hard rectangles with a 2 px outline or solid lime fill; photos are plain rectangles with a visible border and a mono caption.

## 7. Motion tokens

`--duration-instant` 0 ms, `--duration-fast` 90 ms, `--duration-base` 160 ms, `--duration-slow` 480 ms (reveals), `--duration-marquee` 28 s linear loop, `--ease-cut` steps(1, end) for hover inversions, `--ease-out` cubic-bezier(0.2, 0, 0, 1) for reveals. Primitives: `data-reveal` with staggered `data-reveal-delay`, one `data-parallax` stage photo, one CSS marquee strip, one scrubbed 3D scene. Hover and focus invert instantly (lime fill, dark text). Reduced motion: no marquee movement, no parallax, no scrub, content visible.

## 8. Do / don't for the build step

Do:

- Make the first screen a typographic poster that works with no image: giant condensed "TALLER 303", mono date line, visible rules.
- Show the grid with rules, outlined cells and bordered tables; keep labels, times and numbers in mono capitals.
- Use giant numerals 01 / 02 / 03 for the three turnos and one marquee strip (static under reduced motion).
- Keep lime for actions, numerals and highlights only; dark ink on lime fills, lime text on the dark ground.
- Check giant type at 375, 768 and 1440 px: crop deliberately, never clip text that must be read.
- Treat photos in grayscale with CSS, square-cornered, with a mono caption.

Don't (brutalist-raw and typographic-poster "Don't" lists):

- No eyebrow-plus-big-heading pairing in every section.
- No rounded or arch photos, no pill buttons, no radius above 0.
- No giant wordmark footer: columns footer in mono under a thick rule.
- No soft shadows, glass, decorative gradients or glow (the reference's green glow is left out).
- No photo grids or galleries; no medium-sized headings.
- No second accent hue; no red, teal or blue primaries.
- No smooth scroll or parallax under reduced motion.

## 9. Landing meta

```landing-meta
primary: #c8ff2e
display-font: Archivo
body-font: JetBrains Mono
hero: typographic
archetype: brutalist-raw+typographic-poster
traits: marquee-type, giant-numerals
```
