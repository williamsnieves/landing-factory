# Design system: Estrato (herramienta-migraciones)

Written by the design-system phase of `/new-landing` with ui-ux-pro-max only, on 2026-11-12. Inputs: the approved `sites/herramienta-migraciones/PROPOSAL.md` (it wins), `design-archetypes/dev-console.md` (primary), `design-archetypes/chaptered-atlas.md` (lends only `self-map-hero`) and `patterns/claude-dev.md`. Niche: a fictional open-source command-line tool for database migrations, `estrato`, Spanish page, demo with no customer.

## 1. Skill queries run

1. `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "open source cli database migrations developer tool calm warm minimal monospace" --design-system -p "Estrato"`: pattern "FAQ/Documentation Landing" (hero with search bar, categories, FAQ accordion, contact), style "Dark Mode (OLED)", colors slate `#1E293B` primary on a `#0F172A` dark ground with a run-green `#22C55E` accent ("Code dark + run green"), typography JetBrains Mono / JetBrains Mono ("terminal, cli, developer, precision"), effects "minimal glow".
2. `... "developer tool cli open source warm neutral moss green" --domain color`: Developer Tool / IDE (dark slate, `#22C55E` accent), Open Source Project Landing (dark `#020617`, star gold `#A16207`), API Developer Portal (dark, endpoint green `#22C55E`).
3. `... "developer monospace humanist sans technical documentation" --domain typography`: "Developer Mono" JetBrains Mono + IBM Plex Sans ("developer tools, documentation, CLI apps"), "Brutalist Raw" Space Mono alone, "Terminal CLI Monospace" JetBrains Mono alone.
4. `... "minimal developer documentation calm warm editorial" --domain style`: Minimalism & Swiss Style (white space, grid, one accent color, no shadows or gradients, `--border-radius: 0px`, subtle 200 to 250 ms hovers, "documentation sites, professional tools").
5. `... "humanist sans calm readable editorial technical" --domain typography -n 6`: Lora + Raleway, Newsreader + Roboto, Libre Bodoni + Public Sans, Playfair Display + Inter, **"Dashboard Data" Fira Code + Fira Sans** ("code, technical, precise"; "Fira family cohesion. Code for data, Sans for labels"), Playfair + Source Serif 4 + JetBrains Mono.
6. `... "earthy moss sage green warm natural calm" --domain color -n 4`: Yoga (sage neutral `#6B7280`, warm ground `#F5F5F0`, teal accent), Florist/Plant Shop (natural green `#15803D`, foreground `#14532D`), Healthcare (cyan), Meditation (violet + green).
7. `... "plum deep purple warm muted calm" --domain color -n 3`: Church (violet `#7C3AED`), White Noise (slate + indigo), Healthcare (cyan); no plum family offered, so plum was not pursued.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

- **Light versus dark.** The `--design-system` style is Dark Mode (OLED) ("light not recommended") and every developer palette (queries 1 and 2) is a dark slate ground. The proposal and dev-console ask for a warm near-white ground with one dark block. Resolved: the proposal wins; the page is light (`paper` `#F7F4EE`) and the skill's dark ground survives only as the terminal block and the button, in a warm near-black `#1C1B18` instead of cool slate.
- **Cool slate greys.** The skill's greys are cool slate (`#334155`, `#475569`, `#94A3B8`). The proposal asks for warm greys. Resolved: four warm greys of the same hue as the ground (`#4A4741`, `#6B675F`, `#8F8A80`, `#DDD7CC`).
- **Accent hue and lightness.** The skill's developer accent is a bright run green `#22C55E` (about 2.3:1 on white, too light for text on a light page) and the Florist palette's `#15803D` is a saturated grass green. The proposal asks for one earthy accent, moss green or deep plum. Resolved: the skill's green family, desaturated and shifted toward yellow into moss, `#4A6741` (hue about 106 degrees, far from the lime `#C8FF2E` of festival-electronica and the teal `#0F6B68` of clinica-dental); white on it 6.4:1 and it on the paper 5.8:1. Its light form `#A9C495` is the check mark colour inside the terminal (9.0:1 on near-black). The plum query returned only violet and indigo, families other sites and the proposal exclude.
- **Second accent.** The Open Source palette adds a star gold `#A16207` (an amber, excluded by the proposal; and the archetype allows one accent). Resolved: no second hue; `--color-accent` is the moss hover step `#3B5434`.
- **Glow.** The skill's key effect is a minimal text glow. dev-console and the proposal forbid gradients and glows. Resolved: no glow, no shadow; hairlines only.
- **Pattern.** The skill's "FAQ/Documentation Landing" wants a search bar hero and an FAQ accordion with a contact escalation. The proposal's page map (release index hero with a self-map, install terminal, principles, docs, community, closing dot field) wins; there is no search and no contact.
- **Mono everywhere.** The `--design-system` typography (and query 3's second and third results) is mono only. The proposal and dev-console want two families: mono for metadata and the product name, a humanist sans for titles and reading. Resolved: the skill's own two-family "Dashboard Data" pairing (query 5).
- **Which pairing.** Query 3's first result, JetBrains Mono + IBM Plex Sans, is the skill's strongest developer pairing, but IBM Plex Sans is casavela's display face, JetBrains Mono is festival-electronica's body face and turnio's label face, and Plex Sans reads as a grotesque more than a humanist sans. Resolved: Fira Code + Fira Sans (query 5): Fira Sans is a humanist sans (Meta-like open apertures), the pair shares one design so the family switch stays quiet, and no other site uses either.
- **Ligatures.** Fira Code ships programming ligatures (`->`, `=>`, `>=` drawn as one glyph). Real commands must read as typed. Resolved: ligatures off (`font-variant-ligatures: none`) wherever commands or ids are shown.
- **Radius.** The Swiss style says 0 px; dev-console allows 0 to 8 px and asks for a "small corner radius" on the single button. Resolved: 2 px (`--radius-xs`) on the button and tiles, 0 on rows and the terminal, 4 px at most for the featured tile; inside both.
- **Archetype versus skill on the hero.** The skill hero is a search bar; dev-console's hero is an index list with a sticky identity column; chaptered-atlas lends the self-map. The archetypes win (they follow the proposal).

## 3. Chosen style

**Warm tool minimalism** (the skill's Minimalism & Swiss Style, warmed and set in mono metadata): a warm near-white ground, hairline-separated rows, small and close type sizes, one near-black rectangular action, one moss accent used only for the strata mark, the featured release tile and the current node of the migration chain, and one dark block, the terminal. No shadows, no gradients, no glow. It respects dev-console: radius family 0 to 4 px (button 2 px, `buttonShape: rect`), low type contrast (ratio about 1.2, with the mono product name as the largest element and the h1 a step below), regular weights with hierarchy from size, family switch and grey level, and high row density inside wide whitespace.

Emotional target: calm (secondary: trust). It is an input to the palette and font queries, not a rule: evidence that colors or fonts carry emotions is weak, so contrast, legibility and the brief's brand constraints win.

## 4. Palette

| Role             | Token                      | Hex       | Use                                                                                              |
| ---------------- | -------------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| Primary (accent) | `--color-primary`          | `#4A6741` | Strata mark, featured release tile, current node of the chain map, focus ring, inline text links |
| Primary hover    | `--color-primary-hover`    | `#3B5434` | Hover and pressed state of moss links and the tile; also `--color-accent`                        |
| On primary       | `--color-primary-contrast` | `#FFFFFF` | Text or glyph on a moss fill (the featured tile's label)                                         |
| Primary soft     | `--color-primary-soft`     | `#E4EADB` | Background of the featured release row; the "demo" tag                                           |
| Ink              | `--color-ink`              | `#1C1B18` | Headings, the product name, the solid action button fill, outlined borders of controls           |
| Ink hover        | `--color-ink-hover`        | `#35332E` | Hover and pressed state of the solid button                                                      |
| Ink soft         | `--color-ink-soft`         | `#4A4741` | Body copy, row titles' detail, footer links                                                      |
| Ink muted        | `--color-ink-muted`        | `#6B675F` | Mono metadata: dates, versions, migration ids, nav labels at rest, captions                      |
| Paper            | `--color-paper`            | `#F7F4EE` | Page ground; label on the solid button                                                           |
| Surface          | `--color-surface`          | `#FCFAF6` | Raised rows on hover, install command rows                                                       |
| Panel            | `--color-panel`            | `#EFEBE3` | Sticky identity column ground on wide screens, footer band                                       |
| Line             | `--color-line`             | `#DDD7CC` | Hairline row separators (decorative only)                                                        |
| Dot              | `--color-dot`              | `#8F8A80` | Closing dot field, the community dot cluster, chain map strokes and inactive nodes               |
| Terminal ground  | `--color-terminal`         | `#1C1B18` | Ground of the terminal session block                                                             |
| Terminal text    | `--color-terminal-text`    | `#ECE8DF` | Commands and output in the terminal                                                              |
| Terminal muted   | `--color-terminal-muted`   | `#A8A397` | Prompt sign, comments, ids and timestamps in the terminal                                        |
| Terminal accent  | `--color-terminal-accent`  | `#A9C495` | Check marks and the "aplicada" status in the terminal, the cursor                                |

Measured WCAG 2 contrast of the pairs used (relative luminance from the hex values):

| Pair (text on background)                            | Ratio  | Need | Result |
| ---------------------------------------------------- | ------ | ---- | ------ |
| ink `#1C1B18` on paper `#F7F4EE`                     | 15.7:1 | 4.5  | pass   |
| ink on surface `#FCFAF6`                             | 16.5:1 | 4.5  | pass   |
| ink on panel `#EFEBE3`                               | 14.5:1 | 4.5  | pass   |
| ink on primary-soft `#E4EADB`                        | 14.0:1 | 4.5  | pass   |
| ink-soft `#4A4741` on paper                          | 8.4:1  | 4.5  | pass   |
| ink-soft on surface                                  | 8.9:1  | 4.5  | pass   |
| ink-soft on panel                                    | 7.8:1  | 4.5  | pass   |
| ink-muted `#6B675F` on paper                         | 5.1:1  | 4.5  | pass   |
| ink-muted on surface                                 | 5.4:1  | 4.5  | pass   |
| ink-muted on panel                                   | 4.7:1  | 4.5  | pass   |
| ink-muted on primary-soft                            | 4.6:1  | 4.5  | pass   |
| paper on ink (solid button label)                    | 15.7:1 | 4.5  | pass   |
| paper on ink-hover `#35332E`                         | 11.5:1 | 4.5  | pass   |
| primary-contrast `#FFFFFF` on primary `#4A6741`      | 6.4:1  | 4.5  | pass   |
| primary-contrast on primary-hover `#3B5434`          | 8.4:1  | 4.5  | pass   |
| primary on paper (links)                             | 5.8:1  | 4.5  | pass   |
| primary on surface                                   | 6.1:1  | 4.5  | pass   |
| primary on panel                                     | 5.3:1  | 4.5  | pass   |
| primary on primary-soft                              | 5.2:1  | 4.5  | pass   |
| terminal-text `#ECE8DF` on terminal `#1C1B18`        | 14.1:1 | 4.5  | pass   |
| terminal-muted `#A8A397` on terminal                 | 6.8:1  | 4.5  | pass   |
| terminal-accent `#A9C495` on terminal                | 9.0:1  | 4.5  | pass   |
| focus ring primary vs paper (non-text)               | 5.8:1  | 3    | pass   |
| dot `#8F8A80` vs paper (non-text: map strokes, dots) | 3.1:1  | 3    | pass   |
| solid button ink vs paper (non-text boundary)        | 15.7:1 | 3    | pass   |

`line` `#DDD7CC` on paper is about 1.3:1: it is a decorative hairline between rows, never the only boundary of a control or a meaning-carrying mark. `dot` is never used for text.

## 5. Typography

- **Display (mono):** Fira Code (variable, `@fontsource-variable/fira-code` 5.3.0, family `Fira Code Variable`, SIL OFL 1.1, Nikita Prokopov) as `--font-display` and `--font-mono`: the product name `estrato`, navigation, versions, dates, migration ids, labels, install commands and the terminal. Weight 400 (450 at most for the product name); `font-variant-ligatures: none` on commands, ids and the terminal. Labels uppercase with tracking `0.06em`; the product name lowercase with tracking `-0.02em`.
- **Body and headings (humanist sans):** Fira Sans (`@fontsource/fira-sans` 5.3.0, static, latin 400, 400 italic and 500 imported, SIL OFL 1.1, Carrois Apostrophe for Mozilla) as `--font-sans`: the h1, section titles, row titles and reading text. Weight 400; 500 only for row titles that need a step. Sentence case. Body line-height 1.6; headings 1.15 to 1.25 with tracking `-0.01em`.
- **Type scale** (ratio about 1.2, small and close; the mono product name in the hero is the largest element):

| Token         | Size                             | Use                                                       |
| ------------- | -------------------------------- | --------------------------------------------------------- |
| `--text-2xs`  | 0.75rem (12 px)                  | Mono uppercase labels, the "demo" tag, footer notice      |
| `--text-xs`   | 0.8125rem (13 px)                | Mono metadata in rows (dates, versions, ids), nav         |
| `--text-sm`   | 0.9375rem (15 px)                | Terminal and command rows, footer links, captions, button |
| `--text-base` | 1.0625rem (17 px)                | Body copy, row titles                                     |
| `--text-lg`   | 1.25rem (20 px)                  | Lead lines, featured release title                        |
| `--text-xl`   | 1.5rem (24 px)                   | Section titles                                            |
| `--text-2xl`  | clamp(1.625rem, 2.6vw, 1.875rem) | Hero h1 (sans)                                            |
| `--text-3xl`  | clamp(1.875rem, 3.4vw, 2.25rem)  | Closing line                                              |
| `--text-4xl`  | clamp(2.25rem, 5.2vw, 3.5rem)    | The product name `estrato` in mono (identity column)      |

## 6. Spacing, rhythm, radii

- Base unit `--spacing: 0.25rem` (Tailwind steps). Rows: 12 to 16 px vertical padding, hairline between them. Between sections: 96 px (375 px) to 144 px (1440 px); wide whitespace around dense rows.
- Content width about 1240 px, 16 to 20 px gutters at 375 px, 32 to 48 px from 768 px. Two-column frame from 1024 px: identity/label column about one third (`splitRatio` 0.3 to 0.35, inside dev-console's 0.25 to 0.45), content two thirds; one column below 1024 px, with the identity column no longer sticky.
- Radii (dev-console 0 to 8 px): `--radius-none` 0 for rows, the terminal block and install rows; `--radius-xs` 2 px for the solid button (rectangular) and the demo tag; `--radius-sm` 4 px for the featured release tile; `--radius-md` 6 px reserved, not planned; `--radius-pill` only for chain map nodes and dots (circles), never for buttons.
- Borders are 1 px `--color-line`; no shadows.

## 7. Motion tokens

- `--duration-fast: 140ms` (hover, focus, button press), `--duration-base: 220ms` (row hover, link underline), `--duration-reveal: 600ms` (reveals through `data-reveal`).
- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` for reveals and hovers; `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)` for the dot field drift.
- Primitives (dev-console motion signature, the proposal's motion plan): staggered `data-reveal` fades for the hero rows (small rise, 8 to 12 px, 0.05 s steps) and for the terminal lines on enter (the one playful moment, cursor blink at the end); CSS `position: sticky` for the identity column (no ScrollTrigger pin); a slow CSS drift of the dot groups, paused off screen with `animation-play-state`. Native scroll, Lenis off, no parallax, no scrub. Reduced motion: everything at rest, no cursor blink, dots still.

## 8. Do / don't for the build step

Do:

- Use only the tokens above (`bg-paper`, `text-ink-muted`, `bg-terminal`, `text-terminal-text`, `border-line`, `font-mono`, ...); no raw hex values in components, and the SVG art reads `var(--color-*)`.
- Keep one accent: moss for the strata mark, the featured tile, the chain's current node, focus and links; `primary-hover` only as its hover state.
- Set every metadata item in Fira Code at `--text-xs` or `--text-2xs`, `ink-muted`, uppercase and tracked for labels; titles and reading text in Fira Sans, sentence case, regular.
- One solid near-black rectangular button (`bg-ink`, `text-paper`, 2 px radius, at least 44 px tall, hover `ink-hover`); "Ver en GitHub" as an underlined text element with the `primary-soft` "demo" tag, `aria-disabled="true"`, never a link.
- The terminal is real, selectable HTML text on `terminal`, mono `--text-sm`, ligatures off, prompt and ids in `terminal-muted`, checks in `terminal-accent`.
- Rows (`mono-meta-rows`): mono number or date left, sans title, mono detail on the right edge, 1 px `line` hairlines only.
- Draw the strata mark, the chain map, the layers diagram, the dot cluster and the dot field in code, in `primary`, `dot`, `ink-muted` and `line` only.
- Self-host both fonts through Fontsource (no third-party font host).

Don't (including dev-console's list):

- No page built on fewer than about eight real entries; no invented counts, stars, downloads, users or reading times (dates and versions are the labelled sample data of the proposal).
- No mascot, icon set or pixel characters from another brand; the motif is Estrato's own stepped strata shape.
- No gradients, glows, glass, shadows or 3D; no dark page mode.
- No bold weights (nothing above 500) as hierarchy and no decorative uppercase titles.
- No photo grids or stock imagery; no photographs at all.
- No second saturated colour, no teal, blue, indigo, orange, amber, lime, magenta, vermilion or burgundy.
- No pill or rounded buttons, no radius above 4 px on rectangles.
- No bracketed shortcut letters (no real shortcuts), no overlap collage, no handwritten accent, no drop cap, no marquee type.
- No `line` or `dot` colour for text, and no text in `ink-muted` below `--text-2xs`.

## 9. Landing meta

Machine-readable summary read by `scripts/check-landing.mjs` (tokens check, diversity rules, archetype-target warning). Keep it in sync with sections 4 and 5 and with the "Archetype blend" of the proposal.

```landing-meta
primary: #4a6741
display-font: Fira Code
body-font: Fira Sans
hero: typographic
archetype: dev-console+chaptered-atlas
traits: self-map-hero, mono-meta-rows, generative-dot-field
```

`archetype` is `<primary>`, `<primary>+<secondary>` or `custom` (reference-led); `traits` lists the lent traits, and `ref:<sheet>/<trait>` for a trait taken from a reference sheet.
