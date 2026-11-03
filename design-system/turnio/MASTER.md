# Design system: Turnio (turnio)

Written by the design-system phase of `/new-landing` with ui-ux-pro-max only, on 2026-11-03. Inputs: the approved `sites/turnio/PROPOSAL.md` (it wins), `design-archetypes/product-led-saas.md` (primary), `design-archetypes/data-and-proof.md` (lends only `comparison-table`), `patterns/linear-app.md` (lends `mono-labels`) and `patterns/stripe-com.md`.

## 1. Skill queries run

1. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "salon booking saas calm light berry magenta product" --design-system -p "Turnio"`: pattern "Trust & Authority + Conversion", style "Motion-Driven", indigo `#6366F1` primary with an emerald `#059669` accent on `#F5F3FF`, typography Plus Jakarta Sans / Plus Jakarta Sans ("friendly, modern, saas, clean, approachable").
2. `... "salon booking saas calm light berry magenta" --domain color`: Coworking (amber), Booking & Appointment App (calendar blue `#0284C7` + green), Healthcare (cyan).
3. `... "salon booking saas calm light grotesque neutral sans mono" --domain typography`: Lora + Raleway ("Wellness Calm"), Calistoga + Inter + JetBrains Mono ("SaaS Mobile Boutique", mono for data labels and badges), Plus Jakarta Sans alone ("Friendly SaaS").
4. `... "salon booking saas calm light product minimal" --domain style`: Minimalism & Swiss Style (white space, grid, one accent color, sans-serif, clear hierarchy, subtle 200 to 250 ms hovers).
5. `... "beauty salon spa appointment pink berry" --domain color -n 6`: Beauty/Spa/Wellness Service: primary `#EC4899`, foreground `#831843`, background `#FDF2F8`, border `#FBCFE8`, lavender accent `#8B5CF6`.
6. `... "barbershop hair salon" --domain color`: no database match (the skill said so); not used.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

- **Primary hue.** The `--design-system` result is indigo `#6366F1`, and the booking-app palette is calendar blue `#0284C7`. The proposal forbids blue, navy and violet (other sites use them) and asks for a berry or magenta family. Resolved: the skill's own Beauty/Spa/Wellness palette (query 5) supplies the family (`#EC4899` primary, `#831843` foreground); the proposal wins on hue.
- **Primary lightness.** The skill's `#EC4899` pairs with black text and reaches only about 3.5:1 against white; a filled button with white label and links on the light page need 4.5:1. Resolved: the primary is taken two steps deeper in the same family, `#BE185D` (white on it 6.0:1, it on the paper 5.7:1), with `#9D174D` as its pressed/hover step.
- **Second saturated color.** The skill pairs indigo with an emerald accent and pink with a lavender `#8B5CF6` accent. The archetype allows only one saturated color. Resolved: no second hue; `--color-accent` is the deeper berry step `#9D174D`, used only for hover and pressed states.
- **Page tint.** The skill's beauty background `#FDF2F8` is a pink page and its foreground `#831843` is berry text. The proposal asks for a warm off-white page and deep ink headings. Resolved: warm off-white `#FAF8F5`, near-neutral plum-tinted ink `#1C1A1F`; the berry tint appears only in the faint panel `#F3EEF0` and the soft highlight `#FCE7F1`.
- **Muted text.** The skill's muted foreground is cool slate `#475569`. Resolved: warm greys `#48434D` (body) and `#6A6570` (two-tone continuations, captions) that match the warm page; both pass 4.5:1 on every background they sit on.
- **Style.** The `--design-system` style is "Motion-Driven" (animation-heavy, parallax 3 to 5 layers, page transitions). The proposal's motion plan and the archetype are calm: short fades, one gentle parallax, no pins. Resolved: the "Minimalism & Swiss Style" result (query 4) is the style, with the proposal's motion plan.
- **Pattern.** The skill's "Trust & Authority + Conversion" pattern puts a proof band (logos, certifications, stats) second and a "Contact Sales" call to action. The brief has no proof and the action is self sign-up. Resolved: the proposal's page map (fact strip from the brief, no proof, "Empieza gratis") wins.
- **Type character.** The proposal asks for "one neutral grotesque"; the skill's top pick, Plus Jakarta Sans, is a friendly grotesque with slightly geometric rounds rather than a strictly neutral one. Inter (the more neutral grotesque in query 3) is the body face of two other sites. Resolved: Plus Jakarta Sans for display and body (skill's first choice, unused elsewhere, not on the forbidden list), set at regular to medium weights with tight tracking to keep it quiet.
- **Mono face.** The skill pairs JetBrains Mono with a serif display (Calistoga) for labels; another site (festival-electronica) uses JetBrains Mono as its body font. Resolved: JetBrains Mono only for small labels here (time labels, plan tags, fact strip); the diversity rule compares primary, display font and hero type, none of which it shares.
- **Radius.** The Swiss style result says `--border-radius: 0px`; the primary archetype wants rounded frames (`imageRadius` 8 to 24) and data-and-proof allows 0 to 12. Resolved: the archetype wins: one 12 px radius for frames and cards (inside both ranges), 8 px buttons.
- **Archetype vs skill on shadows.** The Swiss result avoids shadows; stripe-com's product cards carry a subtle shadow. Resolved: hairline borders carry the frames; one very soft shadow is allowed only on the hero agenda frame.

## 3. Chosen style

**Calm product minimalism** (the skill's Minimalism & Swiss Style, warmed): a warm off-white page, generous white space between modules and tight insides, one neutral sans at regular and medium weights, hairline borders, faint berry-tinted panels behind HTML product mocks, and one berry action color. It respects the primary archetype: one radius family (12 px frames and cards, 8 px buttons, inside `imageRadius` 8 to 24 and the lent table's 0 to 12), low type-weight contrast with a large size contrast (display about 4 to 4.5 times body), and medium density (short headings, a few lines, one visual per module). Two-tone headings: lead clause in `ink`, continuation in `ink-muted`.

Emotional target: relief (primary), calm (secondary). It is an input to the palette and font queries, not a rule: evidence that colors or fonts carry emotions is weak, so contrast, legibility and the brief's brand constraints win.

## 4. Palette

| Role                     | Token                      | Hex       | Use                                                                                               |
| ------------------------ | -------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| Primary (action)         | `--color-primary`          | `#BE185D` | Filled primary buttons, text links, focus ring, the Pro card's top rule, check marks in the table |
| On primary               | `--color-primary-contrast` | `#FFFFFF` | Label on filled primary buttons                                                                   |
| Accent (pressed / hover) | `--color-accent`           | `#9D174D` | Hover and pressed state of primary buttons and links only; never a second decorative color        |
| Primary soft             | `--color-primary-soft`     | `#FCE7F1` | Pro plan tag background, selected slot in mocks, the active appointment block                     |
| Ink                      | `--color-ink`              | `#1C1A1F` | Headings, lead clause of two-tone headings, outlined button border and label                      |
| Ink soft                 | `--color-ink-soft`         | `#48434D` | Body copy, table cells, footer links                                                              |
| Ink muted                | `--color-ink-muted`        | `#6A6570` | Two-tone continuations, captions, mono labels, the demo note                                      |
| Paper                    | `--color-paper`            | `#FAF8F5` | Page background                                                                                   |
| Surface                  | `--color-surface`          | `#FFFFFF` | Product mock frames, plan cards, the comparison table                                             |
| Panel                    | `--color-panel`            | `#F3EEF0` | Faint tinted panels behind the mocks, the closing section, fact strip band                        |
| Line                     | `--color-line`             | `#E4DEE2` | Hairline borders and dividers (decorative separators only; never the only edge of a control)      |

Measured WCAG 2 contrast of the pairs used (relative luminance computed from the hex values):

| Pair (text on background)                       | Ratio  | Need | Result |
| ----------------------------------------------- | ------ | ---- | ------ |
| ink `#1C1A1F` on paper `#FAF8F5`                | 16.3:1 | 4.5  | pass   |
| ink on surface `#FFFFFF`                        | 17.3:1 | 4.5  | pass   |
| ink on panel `#F3EEF0`                          | 15.0:1 | 4.5  | pass   |
| ink-soft `#48434D` on paper                     | 9.1:1  | 4.5  | pass   |
| ink-soft on surface                             | 9.6:1  | 4.5  | pass   |
| ink-soft on panel                               | 8.4:1  | 4.5  | pass   |
| ink-muted `#6A6570` on paper                    | 5.3:1  | 4.5  | pass   |
| ink-muted on surface                            | 5.7:1  | 4.5  | pass   |
| ink-muted on panel                              | 4.9:1  | 4.5  | pass   |
| primary-contrast `#FFFFFF` on primary `#BE185D` | 6.0:1  | 4.5  | pass   |
| primary-contrast on accent `#9D174D`            | 7.9:1  | 4.5  | pass   |
| primary `#BE185D` on paper (links)              | 5.7:1  | 4.5  | pass   |
| primary on surface                              | 6.0:1  | 4.5  | pass   |
| primary on panel                                | 5.2:1  | 4.5  | pass   |
| primary on primary-soft `#FCE7F1`               | 5.1:1  | 4.5  | pass   |
| ink-soft on primary-soft                        | 8.2:1  | 4.5  | pass   |
| focus ring primary vs paper (non-text)          | 5.7:1  | 3    | pass   |
| outlined button border ink vs paper (non-text)  | 16.3:1 | 3    | pass   |

`line` `#E4DEE2` on paper is about 1.3:1: it is a decorative hairline, never the only boundary of a control or a meaning-carrying mark (the outlined button uses `ink`, table checks use `primary`).

## 5. Typography

- **Display and body:** Plus Jakarta Sans (variable, `@fontsource-variable/plus-jakarta-sans`, SIL OFL 1.1, Tokotype). Display weight 500, body 400, labels and buttons 500; never above 600. Display line-height 1.02 to 1.08 with tracking `-0.025em` at the top sizes and `-0.015em` for section headings; body line-height 1.6, no tracking.
- **Mono:** JetBrains Mono (variable, `@fontsource-variable/jetbrains-mono`, SIL OFL 1.1, JetBrains) only for small labels: time labels (`23:40`, `19:00`, `lunes 08:55`), the Pro plan tag, fact strip labels, step numbers. Weight 400 to 500, size `--text-xs`, tracking `0.02em`, sentence case or uppercase for tags only. About a sixth of text at most, never body or headings.
- **Type scale** (ratio about 1.2 for UI text, with a large jump to display, as product-led-saas asks):

| Token         | Size                          | Use                                          |
| ------------- | ----------------------------- | -------------------------------------------- |
| `--text-xs`   | 0.8125rem (13 px)             | Mono labels, mock UI text, legal line        |
| `--text-sm`   | 0.9375rem (15 px)             | Table cells, footer, captions, buttons       |
| `--text-base` | 1.0625rem (17 px)             | Body copy                                    |
| `--text-lg`   | 1.25rem (20 px)               | Lead lines under headings, plan names        |
| `--text-xl`   | 1.625rem (26 px)              | Plan prices, step titles                     |
| `--text-2xl`  | clamp(1.75rem, 3.2vw, 2.5rem) | Module headings (two-tone)                   |
| `--text-3xl`  | clamp(2rem, 4.6vw, 3.25rem)   | Statement paragraph, closing line            |
| `--text-4xl`  | clamp(2.5rem, 6.4vw, 4.75rem) | Hero `h1` (about 40 px at 375 px, 76 px max) |

## 6. Spacing, rhythm, radii

- Base unit `--spacing: 0.25rem` (Tailwind steps). Inside a module: 8, 12, 16, 24 px gaps. Between modules: 96 px (375 px) to 160 px (1440 px), the archetype's "huge gaps outside, tight inside".
- Content width about 1200 px with 20 px side gutters at 375 px and 32 to 48 px from 768 px; a 12-column grid with the "heading left, copy right" opener on 5 + 6 columns.
- Radii (one family): `--radius-sm` 0.5rem (8 px) for tags and mock slots; `--radius-md` 0.75rem (12 px) for product frames, plan cards and the table wrapper (the shared frame radius); `--radius-lg` 1.25rem (20 px) only for the inset tinted panel that holds a frame; `--radius-pill` 999px for the page's buttons, the tiny status dots and the mono plan tag.
- Final-check change (layout diversity, 2026-11-03): page buttons are pills (the linear-app reference's primary action; the archetype allows pill or rect); most mocks sit on full-bleed bands ruled with hour lines (`hour-lines` utility, `public/hour-lines.svg`) instead of rounded inset panels; the summary modules (statement, steps, pricing, questions, closing) center their headings.
- Borders are 1 px `--color-line`; the hero frame may add one soft shadow `0 1px 2px rgb(28 26 31 / 0.04), 0 12px 32px -12px rgb(28 26 31 / 0.12)`.

## 7. Motion tokens

- `--duration-fast: 160ms` (hover, focus, button press), `--duration-base: 240ms` (link and card hover), `--duration-reveal: 700ms` (reveals through `data-reveal`).
- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` for reveals and hovers; `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)` for the one parallax.
- Primitives (product-led-saas motion signature): `data-reveal` fades with a small rise (16 to 24 px) and short staggers (0, 0.08, 0.16 s); one `data-parallax="0.08"` on the hero frame's inner panel; the reminder bubble's delayed reveal. No pins, no scrub, no marquee. Reduced motion shows everything at rest.

## 8. Do / don't for the build step

Do:

- Use only the tokens above (`bg-paper`, `text-ink`, `text-ink-muted`, `bg-panel`, `border-line`, `font-mono`, ...); no raw hex values in components.
- Keep one saturated color: the berry primary for the filled button, links, focus and checks; `accent` only as its hover/pressed state.
- Write every heading in two tones: lead clause `ink`, continuation `ink-muted`, same size and weight.
- Draw the product mocks in HTML and CSS on `surface` frames (12 px radius, hairline) on `panel` (20 px radius); appointment blocks as `primary-soft` and `panel` fills with service words and times only.
- Mono labels in JetBrains Mono at `--text-xs`, `ink-muted`; the Pro tag `primary` on `primary-soft`.
- Buttons: filled primary (`primary` / `primary-contrast`, pill radius, weight 500) and outlined secondary (1 px `ink` border, `ink` label, transparent fill), same height, at least 44 px tall.
- The comparison table is a real `<table>` with a caption, `th scope`, check marks with a text alternative, hairline rows.
- Self-host both fonts through Fontsource (no third-party font host).

Don't (including the archetype's list):

- No invented metrics, customer names, features or logos, no placeholder logos, no testimonials, star ratings or usage numbers.
- No second saturated color, no pink page background, no gradient text, no glow in a second hue.
- No weights above 600, no all-caps headings, no mono for body or headings.
- No tile grid as the main structure, no photo-led bands, no decorative hero object: the product mock is the visual.
- No pinned sections, no motion-heavy page transitions or multi-layer parallax (the skill's "Motion-Driven" style is not used).
- No `line` color as the only edge of a control; no text in `ink-muted` smaller than `--text-xs`.
- No long pages that hold a dozen ideas.

## 9. Landing meta

```landing-meta
primary: #be185d
display-font: Plus Jakarta Sans
body-font: Plus Jakarta Sans
hero: typographic
archetype: product-led-saas+data-and-proof
traits: comparison-table, ref:linear-app/mono-labels
```

`archetype` is `<primary>`, `<primary>+<secondary>` or `custom` (reference-led); `traits` lists the lent traits, and `ref:<sheet>/<trait>` for a trait taken from a reference sheet.
