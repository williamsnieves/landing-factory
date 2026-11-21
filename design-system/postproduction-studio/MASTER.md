# Design system: Gamma Room (postproduction-studio)

Design-system phase of `/new-landing` for Gamma Room, a fictional small video post-production studio (editing, colour grading, motion, finishing) for brands, musicians and creators. English copy, impact `bold`. Source: ui-ux-pro-max queries plus the approved `PROPOSAL.md` ("Direction in one line", "Visual direction", "Archetype blend", "Conversion plan") and the `cinematic-loop` + `bento-product-showcase` blend, with the reference sheet `patterns/buzzy-now.md`.

## 1. Skill queries run

1. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "video post-production studio cinematic dark bold film color grading" --design-system -p "Gamma Room"`: pattern Scroll-Triggered Storytelling, style Motion-Driven (light and dark supported), palette pure black `#000000` with zinc greys (`#18181B`, `#27272A`) and a near-white accent `#F8FAFC`, fonts Archivo / Space Grotesk.
2. `... "video post-production studio cinematic dark bold film color grading" --domain color`: Short Video Editor (pink `#EC4899` on navy `#0F172A`), Video Streaming/OTT (cinema dark `#000000` + play red `#E11D48`), Music Creation (purple + green on navy).
3. `... "video post-production studio cinematic dark bold film color grading" --domain typography`: "Modern Dark Cinema" (Inter for everything, single family), Orbitron + JetBrains Mono, Lexend Mega + Public Sans.
4. `... "video post-production studio cinematic dark bold film color grading" --domain style`: Vintage Analog / Retro Film, Parallax Storytelling, Dark Mode (OLED).
5. Follow-up `... "cinema film amber tungsten warm dark premium" --domain color -n 5`: Theater/Cinema ("dramatic dark + spotlight gold", accent `#CA8A04` with dark on-accent `#0F172A`), Bookmark & Read-Later (amber `#D97706` / `#F59E0B` with black on-primary).
6. Follow-up `... "confident grotesk editorial bold studio agency italic serif accent" --domain typography -n 8`: "Bold Typography Mobile (Inter Poster)" (Inter 600-800 for UI and display, Playfair Display Italic only for accent phrases), Outfit + Rubik, Space Grotesk systems, editorial serif pairings.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

- Design-system palette: the skill's first result makes the near-white `#F8FAFC` the call-to-action colour on pure black, and the colour results use pink, red or purple accents on navy. The proposal asks for a near-black graphite, a warm bone white and one tungsten amber. Proposal wins; kept from the skill: the cinema-dark ground, the "spotlight gold with dark text on it" idea of the Theater/Cinema palette (query 5) and its amber family (`#F59E0B`), nudged to a yellower, brighter amber (hue about 40 degrees) so it stays clearly apart from another site's orange `#ff6f3c`.
- Pure black `#000000` (skill, OLED style) vs "near-black graphite" (proposal): graphite `#121314` is used, so the scrim and the footage's own blacks read deeper than the interface.
- Skill pairing Archivo / Space Grotesk (query 1): both are display fonts of other sites and must not be reused. Replaced by Inter, the skill's "Modern Dark Cinema" single-family result (query 3), which has tabular numerals (`tnum`) for the timecodes.
- Mono fonts (JetBrains Mono, query 3; mono labels in query 6): the proposal sets timecodes in the body sans with tabular numerals, never a mono font, and `cinematic-loop` rejects `mono-meta-rows`. No mono family is loaded.
- Italic serif: the skill's Inter Poster pairing uses Playfair Display Italic for pull quotes; the proposal limits the italic serif to a single phrase in some display lines. Playfair Display Italic is kept for that role only, never for quotes (there are none) or body text.
- Style "Motion-Driven" / "Parallax Storytelling" lists parallax (3-5 layers), page transitions and scroll effects; `cinematic-loop` says nothing moves beyond the footage and text bands fade in once. Archetype and proposal win: no parallax, no pin, no page transitions; the only motion is the clips and one fade per band.
- Style "Vintage Analog / Retro Film" (film grain overlay, sepia, light leaks): rejected, the footage supplies all colour and the sheet forbids heavy colour overlays except the scrim.
- Skill checklist "hover states with smooth transitions (150-300 ms)" and the archetype rule "hover changes colour or outline, never size": both kept (colour and outline transitions in 160-240 ms, no scale).
- Archetype sheets: `cinematic-loop` asks for "one sans family" with medium headings; the bold impact pushes display weight to 600 at large sizes, still one family. `bento-product-showcase` wants semi-bold headings and tinted tile backgrounds; the lent `bento-grid` keeps one gap and one radius but its tiles are footage and stills on the dark ground, not tinted fills. Bento's "no full-width alternating photo-and-text bands" is overridden by the primary archetype, which owns the layout grammar.

## 3. Chosen style

Dark screening room. A near-black graphite ground for the stage, the colour-grading band, the gallery, the final frame and the footer; warm bone white bands for the reading sections (last mile, editing, motion and finishing, process); mid greys for secondary text; one tungsten amber that appears only on the primary action pill and the grade-split handle. Large, tight Inter display statements, centred on the stage and the final frame, with a single Playfair Display italic phrase in some of them; timecodes such as `00:00:12:00` in Inter with tabular numerals. Footage sits full-bleed on the stage and in rounded frames elsewhere; the interface stays neutral so the clips give the colour.

Archetype constraints respected: `cinematic-loop` radius family (rounded clip frames, 28 px, inside its 0-32 px image radius range; pill buttons), close type steps below a large stage size, short text bands, alternating dark and light bands, strong scrim over clips. `bento-product-showcase` traits: one gap and one radius for every gallery tile, small pill chips for deliverables.

Emotional target: excitement (secondary: trust). It is an input to the palette and font queries, not a rule: evidence that colors or fonts carry emotions is weak, so contrast, legibility and the brief's brand constraints win.

## 4. Palette

| Role                     | Token                      | Hex       | Use                                                                                                   |
| ------------------------ | -------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| Dark ground (paper)      | `--color-paper`            | `#121314` | Page background and every dark band (stage, grading, gallery, final frame, footer)                    |
| Dark surface             | `--color-surface`          | `#1C1D20` | Edit-list panel, header after the first screen, chips and tiles on dark bands                         |
| Dark rule                | `--color-line`             | `#3A3B40` | Hairlines and dividers on dark bands (decorative)                                                     |
| Ink on dark              | `--color-ink`              | `#F1ECE2` | Headings and body on dark bands, outlined-pill border and label on dark                               |
| Ink soft on dark         | `--color-ink-soft`         | `#A6A29A` | Secondary text, timecodes and captions on dark bands                                                  |
| Primary (tungsten amber) | `--color-primary`          | `#F7AD18` | Primary action pill ("Book a project call") and the grade-split handle only; focus ring on dark bands |
| Primary contrast         | `--color-primary-contrast` | `#121314` | Text and icons on the amber pill and handle                                                           |
| Primary hover            | `--color-primary-hover`    | `#FFC24A` | Hover and active state of the amber pill (lighter amber, same hue)                                    |
| Accent                   | `--color-accent`           | `#FFC24A` | Alias of the hover amber; never a second hue                                                          |
| Scrim                    | `--color-scrim`            | `#0A0A0B` | Gradient scrim over clips (used with alpha) so text meets 4.5:1 over the brightest frame              |
| Light ground (bone)      | `--color-bone`             | `#EFE9DD` | Background of the light bands                                                                         |
| Light surface            | `--color-bone-surface`     | `#E3DCCD` | Cards, chips and process steps on light bands                                                         |
| Light rule               | `--color-bone-line`        | `#C9C0AE` | Hairlines on light bands (decorative)                                                                 |
| Ink on light             | `--color-bone-ink`         | `#141416` | Headings and body on light bands, dark pill fill on light bands, focus ring on light bands            |
| Ink soft on light        | `--color-bone-ink-soft`    | `#58554F` | Secondary text, timecodes and captions on light bands                                                 |

Contrast (WCAG 2.x relative luminance, measured):

- Dark bands: ink on paper 15.8:1; ink on surface 14.3:1; ink-soft on paper 7.3:1; ink-soft on surface 6.6:1; paper on ink 15.8:1 (reverse use).
- Amber: primary-contrast on primary 9.7:1 (pill label); primary-contrast on primary-hover 11.6:1; primary on paper 9.7:1 and on surface 8.8:1 (focus ring and handle as non-text, also passes as text).
- Light bands: bone-ink on bone 15.2:1; bone-ink on bone-surface 13.5:1; bone-ink-soft on bone 6.1:1; bone-ink-soft on bone-surface 5.4:1; bone on bone-ink 15.2:1 (dark pill label on light bands).
- Decorative only (not relied on for meaning): line on paper 1.7:1; bone-line on bone 1.5:1.
- Not allowed: amber on bone 1.6:1. The amber is never text on a light band and never the only boundary of a control there; the amber pill appears only on dark bands (header, stage, final frame), and the focus ring on light bands is bone-ink.

## 5. Typography

| Role                       | Family                                             | Package                                       | Notes                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display, body, timecodes   | Inter (variable, `wght` 100-900)                   | `@fontsource-variable/inter` 5.3.0            | Import `wght.css`. Display weight 600, tracking -0.035em, leading 0.95; headings 500-600; body 400 at line-height 1.6; buttons 500. Timecodes and step numbers with `font-variant-numeric: tabular-nums`. |
| Italic accent (one phrase) | Playfair Display (variable italic, `wght` 400-900) | `@fontsource-variable/playfair-display` 5.3.0 | Import `wght-italic.css` only (no upright file). Weight 400-500 italic, one phrase inside some display lines (stage, gallery "Looks", final frame), never body, labels or buttons.                        |

Type scale (`tokens.css`), close steps below a large stage size, as `cinematic-loop` asks:

| Token         | Size                       | Use                                                    |
| ------------- | -------------------------- | ------------------------------------------------------ |
| `--text-xs`   | 0.8125rem (13 px)          | Timecodes, chip labels, tiny uppercase labels (0.08em) |
| `--text-sm`   | 0.9375rem (15 px)          | Captions, footer, credits                              |
| `--text-base` | 1.0625rem (17 px)          | Body                                                   |
| `--text-lg`   | 1.25rem (20 px)            | Leads, edit-list rows                                  |
| `--text-xl`   | 1.625rem (26 px)           | Row headings, process step titles                      |
| `--text-2xl`  | clamp(2rem, 4vw, 3rem)     | Section headings                                       |
| `--text-3xl`  | clamp(2.5rem, 6.5vw, 5rem) | Band statements, final frame                           |
| `--text-4xl`  | clamp(3rem, 10vw, 8.5rem)  | Stage statement (two lines), "Looks"                   |

Sentence case everywhere; uppercase only for timecode labels and chips.

## 6. Spacing, rhythm, radii

Spacing base `--spacing: 0.25rem`. Side gutter 1.25 rem at 375 px, 2.5 rem from 768 px, content max width 80 rem, reading column 38 rem. Section padding 5 rem vertical at 375 px, 8 to 10 rem from 1024 px; the stage and the grading band are 100svh. Bands alternate dark (paper) and light (bone) as in the page map; the edit-list panel overlaps the stage and the next band by about 6 rem. Gallery tiles share one gap (`--gap-tile`, 0.75 rem, 1 rem from 1024 px).

Radii: `--radius-sm` 0.5rem (small controls, the pause button frame), `--radius-md` 1rem (edit-list panel rows, process steps), `--radius-lg` 1.75rem (clip frames, gallery tiles, the edit-list panel: one radius for all footage), `--radius-pill` 999px (every button and chip). The stage clip is full-bleed with no radius.

## 7. Motion tokens

`--duration-fast` 160 ms (hover colour and outline), `--duration-base` 240 ms (header turning solid), `--duration-slow` 640 ms (band fade-in), `--duration-clip-fade` 400 ms (a clip fading in over its poster once it plays), `--ease-out` cubic-bezier(0.22, 1, 0.36, 1), `--ease-in-out` cubic-bezier(0.65, 0, 0.35, 1). Primitives: `data-reveal` once per text band (short fade with a small rise, no stagger beyond three items), `<VideoLoop />` for every clip (plays when a quarter is in view, pauses off-screen, one playing per viewport), the grade-split range input (no animation of its own). No parallax, no pin, no Lenis-dependent effect, no scrub. Reduced motion: no clip plays, posters show, the split stays usable on the poster, reveals are visible.

## 8. Do / don't for the build step

Do:

- Keep the amber for the primary action pill and the grade-split handle only (plus the focus ring on dark bands); amber pill label in `--color-primary-contrast`.
- Put the amber pill only on dark bands; on light bands use the dark pill (`--color-bone-ink` fill, `--color-bone` label) and on dark bands the outlined secondary pill (`--color-ink` border and label).
- Override the focus ring to `--color-bone-ink` inside light bands (amber on bone is 1.6:1).
- Check stage and band text at 4.5:1 over the brightest frame of each clip, not only the poster; strengthen the scrim (`--color-scrim` with alpha) before lightening text.
- Set timecodes in Inter with `tabular-nums`, `--text-xs`, ink-soft; never a mono font.
- Use the italic serif for one phrase per display line at most, and not in every heading.
- Give every clip a poster, a pause control, a reduced-motion form and a credit; at most six clips.
- Keep one gap and one radius (`--radius-lg`) for all gallery tiles; chips are small pills on `--color-surface` (dark) or `--color-bone-surface` (light).

Don't (from `cinematic-loop`, `bento-product-showcase` and the proposal):

- No sound, no autoplay with audio, no clip that starts before it is in view.
- No countdown, urgency strip or pulsing call to action over the footage.
- No heavy colour overlays, gradients, glow, grain or film effects except the scrim.
- No second accent hue, no amber text on light bands, no amber decoration.
- No marquee type, mono meta rows or visible grid (rejected by `cinematic-loop`).
- No clip of a person presented as the team or a client; no readable brands or logos.
- No long running text columns, no tile with more than one message, no huge wordmark footer.
- No hover that changes size; colour or outline only.
- No parallax, pinned sections or page transitions.

## 9. Landing meta

Machine-readable summary read by `scripts/check-landing.mjs` (tokens check, diversity rules, archetype-target warning). In sync with sections 4 and 5 and with the "Archetype blend" of the proposal.

```landing-meta
primary: #f7ad18
display-font: Inter
body-font: Inter
hero: video
archetype: cinematic-loop+bento-product-showcase
traits: bento-grid, spec-chips
```
