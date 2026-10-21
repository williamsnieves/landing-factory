# Design system: Trazo (app-finanzas)

Design system for the fictional Spanish personal-finance app "Trazo" (copy in Spanish, `es`). Written by the design-system phase of `/new-landing` with ui-ux-pro-max only. Blend from `sites/app-finanzas/PROPOSAL.md`: data-and-proof (primary) lending nothing, swiss-grid-minimal lending `split-sticky` and `flush-left-axis`.

## 1. Skill queries run

All run with `python3 .claude/skills/ui-ux-pro-max/scripts/search.py`:

1. `"personal finance budgeting mobile app calm trustworthy evidence-first indigo clean sans" --design-system -p "Trazo"` -> pattern Trust & Authority + Conversion, style Minimalism & Swiss Style, navy plus gold palette, Lexend / Source Sans 3.
2. `"fintech finance calm trust indigo violet savings green" --domain color` -> Fintech/Crypto (gold on dark) and Personal Finance Tracker (blue 1E40AF, green 059669 accent, dark ground).
3. `"clean sans tabular numerals fintech calm" --domain typography` -> Wellness Calm, Inter system, Calistoga + Inter.
4. `"minimal data-driven calm swiss finance" --domain style` -> `minimalism-and-swiss-style` (grid, no shadows, single primary, 0 radius, WCAG 4.5 text).

Font packages verified with `npm view`: `@fontsource-variable/manrope` 5.3.0, `@fontsource-variable/onest` 5.3.1.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

- Skill palette: navy primary `#0F172A` with gold accent, or blue `#1E40AF` with a dark ground. The proposal asks for one saturated indigo-violet primary on a cool light ground, and blue is already used by another site. Resolved: the proposal wins; indigo-violet primary, light ground. The skill's "avoid AI purple gradients" is respected: flat color, no gradients.
- Skill fonts (Lexend + Source Sans 3, Inter, Calistoga) clash with the brief: Inter is excluded as display and Calistoga is a serif. Resolved: Manrope (display) and Onest (body), both open-licensed variable sans with tabular figures.
- Skill style says radius 0 and black and white. The proposal wants lightly rounded rectangle buttons (6-8 px) and a color primary. Resolved: proposal wins; radii stay within 0-12 px (the data-and-proof `imageRadius` range) with buttons at 8 px.
- Skill "Dark mode supported": not planned; the page is light only.
- Archetypes: swiss-grid-minimal prefers 0-2 px radii and no color beyond one accent; the primary archetype data-and-proof allows rect or lightly rounded buttons and up to 12 px image radius, so the primary's range governs. The hero is an illustration (phone drawn in code), larger than the data-and-proof sheet's small framed screenshots (already in the proposal's planned deviations).

## 3. Chosen style

Calm evidence-first minimal: a cool off-white ground, deep ink text, thin 1 px rules instead of shadows, a strict grid with one left axis, and large tabular numerals as the emphasis. A single saturated indigo-violet carries every action and the chart bars; soft green appears only for savings ("ahorro") and a muted amber only for alerts. No gradients, no glow, no shadows beyond a hairline border. Radius family: 0-12 px (store buttons 8 px, cards 8 px, phone frame 12 px at most). Type contrast: moderate (hero about 4.75 rem against 1.0625 rem body). Density: medium, 60-220 words per screen, with tables and charts as real HTML or SVG with text alternatives.

## 4. Palette

| Role               | Token                      | Hex       | Use                                                            |
| ------------------ | -------------------------- | --------- | -------------------------------------------------------------- |
| Primary            | `--color-primary`          | `#4a35d4` | Buttons, links, focus ring, chart bars, the sample month's key |
| Primary hover      | `--color-primary-hover`    | `#3b28b8` | Hover and pressed tone of the primary                          |
| Primary contrast   | `--color-primary-contrast` | `#ffffff` | Text on primary                                                |
| Primary soft       | `--color-primary-soft`     | `#e9e6fb` | Tinted chips, selected row, phone screen accents               |
| Accent (amber)     | `--color-accent`           | `#b86e00` | Alert marks and chart highlight only (non-text, large text)    |
| Ink                | `--color-ink`              | `#12142b` | Body and heading text, dark footer ground                      |
| Ink soft           | `--color-ink-soft`         | `#4b4f6b` | Secondary text, captions, table notes                          |
| Paper              | `--color-paper`            | `#f6f7fb` | Page ground (cool off-white)                                   |
| Surface            | `--color-surface`          | `#eceef6` | Cards, table header, phone bezel ground                        |
| Line               | `--color-line`             | `#d3d7e6` | 1 px rules, table borders, chart gridlines                     |
| Positive (savings) | `--color-positive`         | `#1f7a4d` | Only for savings amounts, goals and "ahorro" marks             |
| Positive soft      | `--color-positive-soft`    | `#e1f2e8` | Ground of a savings chip                                       |
| Warn (alert)       | `--color-warn`             | `#8a5a00` | Alert text, e.g. a category over budget                        |
| Warn soft          | `--color-warn-soft`        | `#faefd2` | Ground of an alert chip                                        |

Measured contrast (WCAG 2.x; the standard pairs are enforced by `check-landing`, the others are hand calculations rounded down):

| Pair                              | Ratio | Use                                              |
| --------------------------------- | ----- | ------------------------------------------------ |
| ink on paper                      | 16.5  | Body text                                        |
| ink on surface                    | 14.5  | Text on cards                                    |
| ink-soft on paper                 | 7.3   | Captions (>= 4.5)                                |
| ink-soft on surface               | 6.8   | Captions on cards (>= 4.5)                       |
| primary-contrast on primary       | 7.5   | Button label                                     |
| primary-contrast on primary-hover | 10.0  | Hover button label                               |
| primary on paper                  | 7.0   | Links and numerals                               |
| primary on surface                | 6.5   | Links on cards                                   |
| paper on ink                      | 16.5  | Text on the dark footer or band                  |
| positive on paper                 | 4.9   | Savings text (>= 4.5)                            |
| positive on positive-soft         | 4.5   | Savings chip text; use bold and size >= 15 px    |
| warn on warn-soft                 | 5.2   | Alert chip text                                  |
| warn on paper                     | 5.4   | Alert text                                       |
| accent on paper                   | 3.6   | Non-text and large text only (>= 3)              |
| line on paper                     | 1.3   | Decorative rules only, never carry meaning alone |

Chart bars use primary on paper (7.0, above the 3.0 non-text limit); a savings series uses positive; the category over budget uses warn plus a text label, never color alone.

## 5. Typography

- **Display:** Manrope (`@fontsource-variable/manrope`, SIL OFL 1.1), weights 600-800, tight tracking (-0.02 em) on large headings. A geometric sans with good tabular figures (`font-variant-numeric: tabular-nums` set on `html`) for amounts and axes.
- **Body:** Onest (`@fontsource-variable/onest`, SIL OFL 1.1), weights 400-600, line height 1.6. Reads well in Spanish (accents and the inverted marks) and keeps tabular figures in tables.
- No mono font; tables and the stat strip use tabular figures of the same families.
- Scale (tokens): xs 0.8125, sm 0.9375, base 1.0625, lg 1.25, xl 1.5, 2xl 2, 3xl clamp(2.25, 4.4vw, 3.25), 4xl clamp(2.75, 6.4vw, 4.75) rem. Heading to body contrast is moderate; large figures (stat strip, hero numbers) use 3xl at weight 700 and carry the emphasis. Labels are xs, medium weight, sentence case (no letter-spaced uppercase eyebrows beyond a few).

## 6. Spacing, rhythm, radii

- Base `--spacing` 0.25 rem; layout steps 4, 8, 16, 24, 40, 64, 96 px multiples; section padding 96 px desktop, 64 px phone; 12-column grid, 24 px gutters, one left axis (`flush-left-axis`), narrow label column plus wide column for `split-sticky`.
- Radii: `--radius-xs` 2 px (chips, table cells), `--radius-sm` 6 px (inputs), `--radius-md` 8 px (store buttons, cards), `--radius-lg` 12 px (phone frame, large chart panel), `--radius-pill` kept in the file but not used for buttons. No radius above 12 px on images or cards.
- Borders 1 px `line`; no box shadows; the phone mockup gets a 1 px ink-soft bezel stroke.

## 7. Motion tokens

- `--duration-fast` 150 ms (hover tone), `--duration-base` 240 ms, `--duration-slow` 600 ms (a bar growing once); easings `--ease-out` cubic-bezier(0.22, 1, 0.36, 1) and `--ease-standard` cubic-bezier(0.4, 0, 0.2, 1).
- Primitives: `data-reveal` (short lift and fade, once) with `data-reveal-delay` stagger; chart bars rise once with the reveal; CSS `position: sticky` for the steps column from `md` up. No pin, no parallax, no scrub. Under reduced motion everything is visible in its final state.

## 8. Do / don't for the build step

Do:

- State the claim, then show its evidence next to it (one sample month, "Marzo, datos de ejemplo", everywhere).
- Draw the phone and charts with HTML, CSS and SVG in token colors; give every chart a text table alternative.
- Keep everything on one strong left axis; headings and captions flush left.
- Use primary for the single main action per screen, positive only for savings, warn only for alerts.
- Set amounts with tabular figures and a unit (EUR, %), in Spanish format (1.234,56 EUR).

Don't:

- No promise of returns, no invented statistics, ratings, downloads, licences or "bank-grade" claims; label sample figures as such.
- No gradients, glow, drop shadows, glassmorphism or purple-pink blends; no emoji as icons.
- No decorative photos, no bank logos, no faces.
- No playful rotation, collage, handwriting or drop caps; no centered blocks.
- No color alone to carry meaning; no radius above 12 px; no charts that need a script to be readable.
- Do not reuse the colors or display fonts of other sites (blue, teal, lime, coral, brown; Schibsted Grotesk, Figtree, Archivo, Newsreader, Fraunces).

## 9. Landing meta

```landing-meta
primary: #4a35d4
display-font: Manrope
body-font: Onest
hero: illustration
archetype: data-and-proof+swiss-grid-minimal
traits: split-sticky, flush-left-axis
```
