# Design system: Fisioterapia Ribera (fisioterapia-ribera)

Written by the design-system phase of `/new-landing` with ui-ux-pro-max only, on 2026-11-06. Inputs: the approved `sites/fisioterapia-ribera/PROPOSAL.md` (it wins), `design-archetypes/calm-statement.md` (primary) and `design-archetypes/warm-local-service.md` (lends only `hours-card`). Prospect landing: palette and fonts come from the niche, never from the prospect's look (the brief has none).

## 1. Skill queries run

1. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "physiotherapy clinic calm trust warm soft serif statement typographic" --design-system -p "Fisioterapia Ribera"`: pattern "Trust & Authority + Conversion" (hero, proof of logos, certs and stats, solution, CTA "Contact Sales / Get Quote"), style "Accessible & Ethical" (high contrast, large text, visible focus, reduced motion; best for healthcare and large audiences), medical teal palette (cyan primary, teal foreground on a mint background, green accent), typography IBM Plex Sans / IBM Plex Sans; avoid "confusing booking, AI purple/pink gradients".
2. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "physiotherapy clinic calm trust warm soft" --domain color`: Parenting & Baby Tracker (soft pink + trust blue), Veterinary Clinic (caring teal + warm orange), Beauty/Spa/Wellness Service (soft pink + lavender).
3. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "calm trust warm soft serif humanist health editorial" --domain typography`: Wellness Calm (Lora + Raleway: "calm, wellness, health, relaxing, natural, organic"; "Lora's organic curves"), Soft Rounded (Varela Round + Nunito Sans: "soft, warm, gentle, wellness"), SaaS Mobile Boutique (Calistoga + Inter).
4. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "calm minimal typographic soft warm editorial whitespace" --domain style`: Minimalism & Swiss Style (white space, clear type hierarchy, single accent, no shadows or gradients, subtle 200 to 250 ms hovers).
5. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "wine burgundy deep warm elegant" --domain color -n 5`: Brewery/Winery ("deep burgundy + craft gold": a deep warm primary, a craft-gold accent `#A16207`, a very dark warm foreground on a warm blush background), Wedding/Event Planning (pink + gold), White Noise (slate on dark), Podcast (indigo), Recipe app (terracotta + green).
6. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "earthy sand clay organic natural warm neutral" --domain color -n 5`: Florist (green), Knowledge Base (slate), Generative Art (neutral), Yoga & Stretching ("sage neutral + calm teal" on a warm stone background), Forum (slate). Used only for the warm-neutral ground idea.
7. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "readable accessible humanist sans body elegant serif display large" --domain typography -n 6`: Noto Serif/Sans JP and Arabic, Academic (Crimson Pro + Atkinson Hyperlegible), Classic Elegant (Playfair Display + Inter), Restaurant Menu (Playfair Display SC + Karla). Checked as alternatives; none used.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

- **Primary hue.** The `--design-system` result is medical cyan/teal with a green accent, and the clinic and vet palettes are teal. The proposal forbids green, teal, navy, royal blue, orange, red-orange, brown, violet, magenta and acid green (other sites use them). Resolved: the hue family comes from the skill's Brewery/Winery palette, "deep burgundy" (query 5), taken toward wine (hue about 347°, a rosy red, not the palette's own brown-leaning `orange-900` step, which would repeat the brown family of panaderia): primary `#7A2E3F`. The proposal wins on hue.
- **Primary lightness.** The winery palette's primary is very dark and the skill's cyan pairs with black text. The archetype asks for one deep, calm primary that also draws the thread on soft fields. Resolved: `#7A2E3F` (white on it 9.2:1; it on paper 8.5:1 and on every field at least 6.5:1), with `#5E2230` as the hover and pressed step.
- **Accent.** The skill's medical palette adds a saturated green accent; the winery palette a craft gold. The archetype wants calm, one action colour. Resolved: the gold becomes a deep ochre `#A16207` used only for non-text marks (today's row marker in the hours card, the small knots where the thread passes a visit step), never for text, buttons or fills.
- **Background.** The skill's backgrounds are mint (`--design-system`) or blush (winery). The proposal asks for a light warm ground and soft warm fields. Resolved: warm off-white paper `#FAF6F0` with three soft fields, sand `#EFE4D2`, pale clay `#ECD6C8` and a muted rose tint `#EBDEDD` (the skill's blush idea, desaturated), and the deep wine field `#3F1C25` for the closing band (from the winery palette's very dark warm foreground).
- **Style.** The `--design-system` style is "Accessible & Ethical" and the style query gives "Minimalism & Swiss Style" (grid-based, geometric, sans-serif, radius 0). The archetype is calm-statement: soft fields, a soft serif display, one drawn line, no visible grid. Resolved: the accessibility rules of "Accessible & Ethical" (contrast, large text, focus, reduced motion, 44 px targets) and the restraint of Swiss minimalism (one accent, no shadows or gradients) are kept; its geometric grid, 0 radius and sans-only typography are not.
- **Pattern.** The skill's "Trust & Authority + Conversion" puts a proof band (logos, certifications, stats) second and a "Contact Sales / Get Quote" action. The brief has no proof, the legal constraints forbid claims, and the action is booking a first assessment. Resolved: the proposal's page map (practical block second, no proof, "Pide tu primera valoración") wins.
- **Display font.** The `--design-system` typography is IBM Plex Sans, which casavela already uses as its display font and which is a corporate grotesque, not the soft serif the proposal asks for. Resolved: Lora, the heading face of the skill's "Wellness Calm" pairing (calm, health, organic curves), not used by any other site and not on the forbidden list (Fraunces, Newsreader, Atkinson Hyperlegible Next).
- **Body font.** Wellness Calm pairs Lora with Raleway. Raleway's default figures are old-style and its wide geometric forms are weaker at text sizes, which matters for prices, a phone number and opening hours read by an audience up to 65. Resolved: Nunito Sans, the body face of the skill's "Soft Rounded" pairing ("soft, warm, gentle, wellness"), a quiet, open, very legible sans with lining figures, set at 18 px or more. Varela Round (that pairing's heading face) is not used: clinica-dental already judged it infantile for a clinic, and the proposal asks for a serif.
- **Archetype vs skill on radius.** The Swiss style says `--border-radius: 0px`; calm-statement allows 0 to 32 px images and rounded or rect buttons, and warm-local-service rounds its hours card (6 to 40). Resolved: the archetypes win: an 18 px soft-rect button, 32 px photos and a 20 px hours card (raised from 6 and 20 px at the final check for layout diversity, see RUN.md).
- **Archetype vs skill on type contrast.** The skill's scales (hero 36 to 42 pt, H2 28 to 32 pt) are a medium-heading system; calm-statement forbids medium headings and wants statements 8 to 12 times the body size. Resolved: the scale jumps from small text straight to very large statements (section 5).
- **Archetype vs skill on motion.** The skill's hovers are 150 to 300 ms and its style has no reveals; calm-statement wants slow, wide reveals with long easing and a self-drawing line. Resolved: hovers stay at 200 ms; reveals and the line follow the archetype and the proposal's motion plan (section 7).

## 3. Chosen style

**Calm statement on warm fields** (the skill's "Accessible & Ethical" rules with Swiss restraint, softened): a light warm paper ground, full-bleed bands in three soft warm fields, one very large soft serif statement per screen in sentence case, small quiet sans text left aligned, one deep wine line drawn through the page that ends under the button in the deep wine closing band. No shadows, no gradients, no glass, no icon grids. It respects the primary archetype: one soft radius family (18 px button, 20 px card, 32 px photos, inside `imageRadius` 0 to 32), type contrast carried by scale and not by weight (display at 400 to 500, statements 8 to 9.8 times the body at desktop), low density with very long pauses between bands.

Emotional target: trust (secondary: calm). It is an input to the palette and font queries, not a rule: evidence that colors or fonts carry emotions is weak, so contrast, legibility and the brief's brand constraints win.

## 4. Palette

| Role                   | Token                      | Hex       | Use                                                                                             |
| ---------------------- | -------------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| Primary (action, line) | `--color-primary`          | `#7A2E3F` | The filled button, text links, focus ring, the drawn thread on paper and on the soft fields     |
| Primary hover          | `--color-primary-hover`    | `#5E2230` | Hover and pressed state of the button and links only                                            |
| On primary             | `--color-primary-contrast` | `#FFFFFF` | Label on the filled button                                                                      |
| Accent (non-text)      | `--color-accent`           | `#A16207` | Deep ochre marks: today's row marker in the hours card, knots of the thread at the visit steps  |
| Ink                    | `--color-ink`              | `#251B1D` | Statements, headings, prices                                                                    |
| Ink soft               | `--color-ink-soft`         | `#5A4A4C` | Body copy, captions ("Foto ilustrativa"), the "dato de ejemplo" labels, footer                  |
| Paper                  | `--color-paper`            | `#FAF6F0` | Light warm ground: header, practical block, prices, questions, footer                           |
| Surface                | `--color-surface`          | `#FFFFFF` | The hours card                                                                                  |
| Line                   | `--color-line`             | `#DDD0C3` | Hairlines and dividers (the hours card edge, price columns); never text, never a control's edge |
| Field sand             | `--color-field-sand`       | `#EFE4D2` | Hero field and one statement band                                                               |
| Field clay             | `--color-field-clay`       | `#ECD6C8` | Statement band (problem); also the thread colour on the deep field                              |
| Field tint             | `--color-field-tint`       | `#EBDEDD` | Statement band (the same person)                                                                |
| Field deep             | `--color-field-deep`       | `#3F1C25` | Closing band `#reserva` only                                                                    |
| On deep                | `--color-on-deep`          | `#F7EDE4` | Statement text on the deep field and the fill of the inverted button there (label `field-deep`) |
| On deep soft           | `--color-on-deep-soft`     | `#DCC8C0` | Supporting text and the phone link on the deep field                                            |

Measured WCAG 2 contrast of the pairs used (relative luminance computed from the hex values):

| Pair (text on background)                         | Ratio  | Need | Result |
| ------------------------------------------------- | ------ | ---- | ------ |
| ink `#251B1D` on paper `#FAF6F0`                  | 15.6:1 | 4.5  | pass   |
| ink on surface `#FFFFFF`                          | 16.8:1 | 4.5  | pass   |
| ink on field-sand `#EFE4D2`                       | 13.3:1 | 4.5  | pass   |
| ink on field-clay `#ECD6C8`                       | 12.0:1 | 4.5  | pass   |
| ink on field-tint `#EBDEDD`                       | 12.8:1 | 4.5  | pass   |
| ink-soft `#5A4A4C` on paper                       | 7.7:1  | 4.5  | pass   |
| ink-soft on surface                               | 8.3:1  | 4.5  | pass   |
| ink-soft on field-sand                            | 6.6:1  | 4.5  | pass   |
| ink-soft on field-clay                            | 6.0:1  | 4.5  | pass   |
| ink-soft on field-tint                            | 6.4:1  | 4.5  | pass   |
| primary-contrast `#FFFFFF` on primary `#7A2E3F`   | 9.2:1  | 4.5  | pass   |
| primary-contrast on primary-hover `#5E2230`       | 12.0:1 | 4.5  | pass   |
| primary on paper (links, line)                    | 8.5:1  | 4.5  | pass   |
| primary on surface                                | 9.2:1  | 4.5  | pass   |
| primary on field-sand                             | 7.3:1  | 4.5  | pass   |
| primary on field-clay                             | 6.6:1  | 4.5  | pass   |
| primary on field-tint                             | 7.0:1  | 4.5  | pass   |
| paper on ink (inverse, if used)                   | 15.6:1 | 4.5  | pass   |
| on-deep `#F7EDE4` on field-deep `#3F1C25`         | 13.0:1 | 4.5  | pass   |
| on-deep-soft `#DCC8C0` on field-deep              | 9.3:1  | 4.5  | pass   |
| field-deep label on on-deep button fill           | 13.0:1 | 4.5  | pass   |
| field-clay thread on field-deep (non-text)        | 10.7:1 | 3    | pass   |
| accent `#A16207` marks on paper (non-text)        | 4.6:1  | 3    | pass   |
| accent marks on surface (non-text)                | 4.9:1  | 3    | pass   |
| accent marks on field-sand (non-text)             | 3.9:1  | 3    | pass   |
| accent marks on field-clay (non-text)             | 3.5:1  | 3    | pass   |
| focus ring primary vs paper and fields (non-text) | ≥ 6.6  | 3    | pass   |

`line` `#DDD0C3` on paper is about 1.4:1: decorative only. The primary button is never placed on the deep field (about 1.6:1 there): the closing band uses the inverted button (`on-deep` fill, `field-deep` label), same shape and label, and the focus ring there is `on-deep`.

## 5. Typography

- **Display:** Lora (variable, `@fontsource-variable/lora` 5.3.0, `wght` 400 to 700, SIL OFL 1.1, Cyreal / The Lora Project Authors). Soft contemporary serif with brushed curves. Statements at weight 400 to 500, never bold; sentence case; line-height 1.02 to 1.08; tracking `-0.02em` at `--text-5xl` and above; measure about 12 to 16 characters per line so each statement breaks into two or three lines. Italic (`wght-italic.css`) is not loaded; the one word the line joins ("principio", "fin") is marked by the thread, not by a style change.
- **Text:** Nunito Sans (variable, `@fontsource-variable/nunito-sans` 5.3.0, `wght`, SIL OFL 1.1, The Nunito Sans Project Authors). Body 400, labels and buttons 600, never above 700; line-height 1.6; lining figures for prices, the phone and the hours (`font-variant-numeric: lining-nums tabular-nums` in the hours card).
- **Type scale** (body 18 px; no medium heading sizes between `--text-2xl` and the statements):

| Token         | Size                            | Use                                                                       |
| ------------- | ------------------------------- | ------------------------------------------------------------------------- |
| `--text-xs`   | 0.875rem (14 px)                | Captions, "dato de ejemplo", credits line (never body)                    |
| `--text-sm`   | 1rem (16 px)                    | Footer, hours rows, button labels                                         |
| `--text-base` | 1.125rem (18 px)                | Body copy, question answers                                               |
| `--text-lg`   | 1.3125rem (21 px)               | Supporting paragraph under a statement, offer names, visit step names     |
| `--text-xl`   | 1.625rem (26 px)                | Question summaries, practical block labels                                |
| `--text-2xl`  | 2.25rem (36 px)                 | Prices                                                                    |
| `--text-3xl`  | clamp(2.25rem, 4.5vw, 3.5rem)   | Reserved; use only if a statement must be secondary (prefer `--text-4xl`) |
| `--text-4xl`  | clamp(2.5rem, 7vw, 6.5rem)      | The large line of the two-column blocks (questions, practical)            |
| `--text-5xl`  | clamp(2.625rem, 9.5vw, 9rem)    | Statement bands (sections 3, 5, 6, 9): up to 144 px, 8 times the body     |
| `--text-6xl`  | clamp(2.75rem, 10.5vw, 10.5rem) | Hero `h1`: about 151 px at 1440 px (8.4 times the body), 168 px max       |

At 375 px the statements fall to 42 to 44 px (the clamp minimum) so the longest word, "fisioterapeuta", fits within a 343 px column.

## 6. Spacing, rhythm, radii

- Base unit `--spacing: 0.25rem` (Tailwind steps). Side gutter 16 px at 375 px, 32 px from 768 px, 64 px from 1280 px; content width up to 1280 px, statements may span the full width.
- Rhythm: statement bands are at least 80 to 100 svh with the statement placed in the upper or middle third and very wide margins; between blocks on the paper ground 128 px (375 px) to 224 px (1440 px). Inside a block: 12, 16, 24, 40 px.
- Practical, prices and questions sit in two or three calm columns on paper, separated by hairlines and space (never a card grid).
- Radii (one soft family): `--radius-button` 1.125rem (18 px) for the button, a soft rect that stays under half its height so it never reads as a pill; `--radius-image` 2rem (32 px, the top of calm-statement's range) for the illustrative photos; `--radius-sm` 0.375rem (6 px) for small inner corners; `--radius-md` 0.75rem (12 px) for the `details` focus outline and small chips; `--radius-lg` 1.25rem (20 px) for the hours card and the price highlight; `--radius-pill` only for the today marker dot. The button (first 6 px) and photo (first 20 px) radii were raised at the final check because the layout measured too close to two other sites (RUN.md "Design decisions"); a pill was tried and rejected because it moved the page next to two pill-button sites.
- No shadows. The hours card is `surface` with a 1 px `line` border.

## 7. Motion tokens

- `--duration-fast: 200ms` (hover, focus colour and underline), `--duration-reveal: 1200ms` (statements and steps), `--duration-draw: 1600ms` (the hero thread on load).
- `--ease-calm: cubic-bezier(0.16, 1, 0.3, 1)` for reveals; `--ease-draw: cubic-bezier(0.65, 0, 0.35, 1)` for the line.
- `--reveal-y: 48px` (rise of `data-reveal`), `--reveal-stagger: 0.1s` (`data-reveal-delay` steps of the visit points).
- Primitives: `data-reveal` on the statements of sections 3, 5, 6 and 9 and on the four visit steps; the thread is CSS (`stroke-dashoffset`, on load in the hero, `animation-timeline: view()` under `@supports` for the later segments). No pin, no scrub, no parallax, no Lenis. Under reduced motion every statement and every line segment is in its final state.

## 8. Do / don't for the build step

Do:

- Use only the tokens above (`bg-paper`, `bg-field-sand`, `text-ink-soft`, `text-on-deep`, `font-display`, `text-6xl`, ...); no raw hex values in components.
- One statement per screen, in Lora 400 to 500, sentence case, very large; supporting text in Nunito Sans at `--text-lg` or `--text-base`, left aligned.
- Draw the thread as inline SVG in `primary` on paper and the light fields and in `field-clay` on the deep field; stroke 2.5 to 4 px, round caps; ochre `accent` only for the small knots and today's marker.
- One action, "Pide tu primera valoración": a filled soft-rect button (`primary` / `primary-contrast`, `--radius-button`, Nunito Sans 600, at least 48 px tall), identical everywhere; the inverted form in the closing band. "Llámanos" is a text link with an underline.
- The `hours-card`: `surface`, 20 px radius, hairline border, tabular figures, today's row marked with the ochre dot and a text label (not colour alone), plain without JavaScript.
- Body never below 18 px; every text pair at 4.5:1 or more on the field it sits on (section 4).
- Self-host both fonts through Fontsource (`wght.css` only); no third-party font host.

Don't (including calm-statement's list):

- No medium-sized headings: go large or stay small.
- No eyebrow label above every section.
- No icon grids or card rows.
- No decorative gradients or glass.
- No photo collage or gallery.
- No shouting: a bold impact means bigger type and bolder colour, not louder copy.
- No marquee type, overlapping collage, handwritten accent font, visible grid or bento grid (the archetype rejects them).
- No bold or all-caps statements, no second saturated colour, no ochre text or ochre button, no primary button on the deep field.
- No shadows, no pinned sections, no parallax, no smooth scroll.
- No invented proof: no testimonials, ratings, figures, badges or certifications; no outcome promises (regulated niche).

## 9. Landing meta

Machine-readable summary read by `scripts/check-landing.mjs` (tokens check, diversity rules, archetype-target warning). Keep it in sync with sections 4 and 5 and with the "Archetype blend" of the proposal.

```landing-meta
primary: #7a2e3f
display-font: Lora
body-font: Nunito Sans
hero: illustration
archetype: calm-statement+warm-local-service
traits: hours-card
```

`archetype` is `<primary>`, `<primary>+<secondary>` or `custom` (reference-led); `traits` lists the lent traits, and `ref:<sheet>/<trait>` for a trait taken from a reference sheet.
