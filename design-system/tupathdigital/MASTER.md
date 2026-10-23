# Design system: tupathdigital (tupathdigital)

Design system for the real brand tupathdigital (English page, `en`): a dark, electric shelf of AI digital products in the logo blue. Written by the design-system phase of `/new-landing` with ui-ux-pro-max only. Blend from `sites/tupathdigital/PROPOSAL.md`: bento-product-showcase (primary) lending nothing but its native `spec-chips`, data-and-proof (secondary) lending `stat-strip`.

## 1. Skill queries run

- `search.py "AI digital products shop dark electric tech bold conversion" --design-system -p "tupathdigital"` (pattern: Funnel; style: Vibrant & Block-based; type: Space Grotesk / DM Sans)
- `search.py "dark tech electric blue AI" --domain color`
- `search.py "geometric grotesk tech bold" --domain typography` (top result: Tech Startup, Space Grotesk + DM Sans, "AI products")
- `search.py "dark bento tech product showcase" --domain style` (top result: Bento Box Grid, dark mode supported, 16 to 24 px radii)

## 2. Conflicts between the skill and the proposal (reported, not hidden)

- Palette: the skill returned indigo/violet and pink-green palettes on light grounds. The proposal fixes the brand blue `#1881d4` (from the brief), a near-black blue ground and no second brand hue; the proposal wins. Indigo is also avoided because app-finanzas already uses an indigo primary.
- Style: the skill's "Vibrant & Block-based" implies high-color duotone blocks. The page instead uses the bento grammar on a quiet dark canvas so the owner's colorful covers carry the color.
- Funnel pattern from the skill is not used; the page map of the proposal wins.
- Skill check: "On Primary" suggestions are black; adopted (near-black text on the brand blue) because white on `#1881d4` is only about 4.1:1.
- Archetypes: bento `imageRadius` 8 to 40 and data-and-proof 0 to 12 overlap at 8 to 12; tiles use 20 px (inside the bento range, primary owns radii). Buttons use the rect/pill range; chosen pill for the main actions.

## 3. Chosen style

Dark bento product shelf with an electric blue accent. A near-black blue ground, slightly lighter tinted tiles with thin blue-grey borders, glow only on hover and behind the hero cover stack. One brand hue (blue) in two steps; the covers bring magenta, orange and violet. Radii: tiles 20 px, small chips 8 px, buttons pill. Type contrast is large (display up to 100 px against 17 px body). Density medium: 25 to 110 words per screen.

## 4. Palette

| Role                | Token                      | Hex       | Use                                                    |
| ------------------- | -------------------------- | --------- | ------------------------------------------------------ |
| Brand primary       | `--color-primary`          | `#1881D4` | Primary button fill, links on dark, key figures, focus |
| On primary          | `--color-primary-contrast` | `#04101C` | Text on primary buttons and badges                     |
| Accent (cooler)     | `--color-accent`           | `#5CB8FF` | Highlights, chip text, scene nodes, hover glow         |
| Ink (light text)    | `--color-ink`              | `#EAF2FB` | Headings and body on the dark ground                   |
| Ink soft            | `--color-ink-soft`         | `#9DB3CC` | Secondary text, spec text, captions                    |
| Paper (page ground) | `--color-paper`            | `#060B14` | Page background (near-black blue)                      |
| Surface             | `--color-surface`          | `#0A121E` | Tile and card background                               |
| Line                | `--color-line`             | `#20334B` | Tile borders, dividers (non-text)                      |

Contrast pairs used (all measured by `check-landing`, text >= 4.5, non-text >= 3):

- ink on paper, ink on surface: high (about 16:1 and 15:1)
- ink-soft on paper, ink-soft on surface: above 4.5
- primary-contrast on primary: above 4.5
- primary on paper and on surface (links, big figures, focus ring): above 4.5 / 3
- accent on paper and on surface: above 4.5
- line on paper: decorative border, not relied on to separate meaning

## 5. Typography

- Display: Space Grotesk Variable (`@fontsource-variable/space-grotesk`, SIL OFL 1.1), weights 500 to 700, tight leading (1.0 to 1.05), slight negative tracking.
- Body: DM Sans Variable (`@fontsource-variable/dm-sans`, SIL OFL 1.1), regular and medium, leading 1.55.
- Mono (Redesign B, 2026-10-23): Geist Mono Variable (`@fontsource-variable/geist-mono`, SIL OFL 1.1) for eyebrows, pill labels, format tags, filter pills, coupon codes and step numbers (`--font-mono` in tokens.css), 12 to 15 px, uppercase with 0.04 to 0.08em tracking for labels.
- Tabular figures (`font-variant-numeric: tabular-nums`) on the body for prices, stats and counts.
- Scale (tokens.css): xs 13, sm 15, base 17, lg 20, xl 26, 2xl 36, 3xl clamp 40 to 60, 4xl clamp 48 to 100 px (hero and stat figures).
- Tile titles small and bold, spec text small and secondary, per the bento sheet.

## 6. Spacing, rhythm, radii

- Base unit 4 px (`--spacing: 0.25rem`). One tile gap of 16 px (gap-4), 12 px on phones. Section padding 80 to 128 px vertical on desktop, 56 px on phones; 16 px side gutter at 375 px.
- Radii: `--radius-tile` 20 px (all tiles and cover frames), `--radius-md` 14 px, `--radius-sm` 8 px (chips), `--radius-pill` for buttons.
- Bento spans: 4 columns on desktop, 2 on tablet, 1 on phone; one large 2x2 lead tile per shelf at most.

## 7. Motion tokens

- Durations: fast 150 ms (hover), base 250 ms (lift, color), slow 600 ms (reveal).
- Easings: `--ease-out` cubic-bezier(0.22, 1, 0.36, 1) for reveals and lifts, `--ease-in-out` for glows.
- Primitives: `data-reveal` staggered fade and lift for tiles, a hero cover stack with floating fragment chips on light `data-parallax` (Redesign B replaced the 3D scene), CSS hover lift and glow on covers (pointer devices), inline copy-code script. No pinned sections. Reduced motion: tiles at rest, no parallax, the hero stack sits still.

## 8. Do / don't for the build step

Do:

- Use the near-black ground and tinted tiles; let the covers be the color.
- Give a tile one clear focus (the product cover); carry price, 50% badge and store buttons as a compact footer of the tile.
- Keep one gap and one radius for all tiles; vary spans for rhythm.
- Show primary actions as blue pills with near-black text; secondary actions as text with an arrow.
- Set prices and figures large with tabular numerals; spec chips are small, bordered, accent text.
- End with a clear purchase strip and the two coupon tickets.

Don't:

- No second brand hue, no gradients that invent a new hue, no purple or indigo.
- No white text on the brand blue fill (use `primary-contrast`).
- No long text columns, no alternating full-width photo-and-text bands, no huge wordmark footer.
- No invented claims, ratings or discounted prices.
- Do not crop away text on the covers.

## 9. Landing meta

```landing-meta
primary: #1881d4
display-font: Space Grotesk
body-font: DM Sans
hero: split
archetype: bento-product-showcase+data-and-proof
traits: stat-strip, spec-chips
```
