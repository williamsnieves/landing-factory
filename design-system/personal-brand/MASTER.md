# Design system: Willians Nieves (personal-brand)

Design-system phase of `/new-landing` for `sites/personal-brand/`, made with ui-ux-pro-max only. The approved `PROPOSAL.md` (Visual direction, Archetype blend `custom` with brutalist-raw as gap filler) wins over every skill suggestion. Translated into `sites/personal-brand/src/styles/tokens.css`.

## 1. Skill queries run

All run with `python3 .claude/skills/ui-ux-pro-max/scripts/search.py`:

1. `"developer portfolio personal brand AI engineer dark glowing operating system bold experimental" --design-system -p "Willians Nieves"`: pattern Scroll-Triggered Storytelling (keep the narrative readable without scroll effects, final readable state under reduced motion), style Brutalism (sharp 0 px corners, visible grid, bold 700+ type, instant transitions), a monochrome light palette with a blue accent, Inter / Inter.
2. `--domain color "dark tech portfolio coral orange blue violet"`: Portfolio/Personal (monochrome + blue accent, light) and Pet Tech App (orange `#F97316` with dark on-primary text). Used only as a hint that dark ink on an orange fill is the accessible pairing.
3. `--domain typography "grotesque display mono tech portfolio bold"`: Tech/HUD Mono, Kinetic Motion (Syncopate + Space Mono), Brutalist Raw (Space Mono). Mood confirmed: mono for technical metadata.
4. `--domain style "dark brutalist glowing developer portfolio"`: Cyberpunk UI (neon on dark, scanlines, glitch) and Dark Mode OLED (deep black, midnight blue, minimal glow, visible focus). Taken: the navy-black base and minimal glow; left: neon green and magenta, scanlines, glitch.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

- Skill palette is light (`#FAFAFA` background) with a monochrome primary; the proposal asks for a dark, glowing page with a coral primary and a blue companion. Proposal wins: dark base, coral primary.
- Skill fonts: Inter / Inter (and Space Mono, Syncopate, Share Tech Mono). Inter and Space Grotesk-like families are already used by other sites and the proposal wants a distinctive grotesque with a light and a heavy cut. Proposal wins: Bricolage Grotesque Variable, Instrument Sans Variable, Geist Mono Variable.
- Skill style Brutalism says default fonts, plain look, no gradients; the proposal wants a glowing dark OS with a collage hero. Resolved: take the 0 px corners, hairline grid and instant state changes; keep glows (CSS radial gradients behind the portrait, no text glow) and the portrait collage.
- Skill Cyberpunk UI suggests neon green and magenta, scanlines and glitch: not used (the two accents come from the portrait and the logo, no glitch).
- Skill pattern Scroll-Triggered Storytelling lists a final-climax CTA; the owner wants no call to action: the last chapter ends in the footer links.
- Archetype brutalist-raw says no gradients or soft shadows and almost no motion; the proposal wants glows, one pinned stage and reveals. Proposal wins, written as a deviation: gradients only as background glows and field blends, never on controls; motion stays short and cut-like (see section 7).
- Archetype brutalist-raw says flush-left headings and uppercase heading case 0.3 to 1; the hero is a collage, but headings stay flush left and the labels (not the headings) are uppercase mono.
- Skill checklist says hover transitions of 150 to 300 ms; the brutalist grammar prefers instant cuts: hover and focus use `--duration-instant` (90 ms) for color inversion, reveals use the longer durations.

## 3. Chosen style

**Dark glowing "operating system" with brutal hairlines.** A near-black navy page, a hairline grid showing as faint column lines (`ref:sebg-ch/visible-grid`), mono labels for numbers, dates, chips and the status ticker (`mono-labels`, `ref:product-inc/marquee-type`), and one flat saturated color field per chapter (`field-1` to `field-6`) as in the sebg-ch reference, kept dark so light text always passes. The portrait carries the two halves: warm coral for the human half, logo blue for the machine half, violet where they meet (the portrait's own gradient).

Archetype constraints respected: radii 0 to 4 px, no pill buttons, buttons are rectangles or text links with an arrow, flush-left headings, labels in mono, dense blocks, no giant wordmark footer, footer in columns. Type contrast is high: one huge display size, one body size, one label size. Density follows brutalist-raw (60 to 260 words per screen).

## 4. Palette

| Role                   | Token                      | Hex       | Use                                                                            |
| ---------------------- | -------------------------- | --------- | ------------------------------------------------------------------------------ |
| Page background        | `--color-paper`            | `#0A0D16` | `html` background, default section background                                  |
| Panel                  | `--color-surface`          | `#121827` | Cards, bento tiles, header bar, ticker strip                                   |
| Hairline               | `--color-line`             | `#2B3552` | Grid lines, card borders, rail (decorative, not text)                          |
| Text                   | `--color-ink`              | `#EEF1F8` | Body and headings (light text on the dark page)                                |
| Secondary text         | `--color-ink-soft`         | `#B9C2D6` | Captions, dates, secondary copy; also passes on every field                    |
| Primary accent (human) | `--color-primary`          | `#FF6F3C` | Links, active nav, key phrase in the accent, focus ring, marks                 |
| Primary hover          | `--color-primary-hover`    | `#FF8A5E` | Hover and pressed state of primary fills                                       |
| On primary             | `--color-primary-contrast` | `#0A0D16` | Text on a primary fill (dark on coral, never white)                            |
| Highlight              | `--color-accent`           | `#FFC46B` | Rare warm highlight: status dot, one chip state, guitar strings                |
| Cool accent (machine)  | `--color-cool`             | `#2FB8FF` | AI stage, machine-half marks, tags for tools; the logo blue family             |
| Bridge                 | `--color-bridge`           | `#A37BFF` | Seam, gradient midpoint between coral and blue, hover of cool/primary elements |
| Field 1 (coral wine)   | `--color-field-1`          | `#8A2F12` | About / human half chapter                                                     |
| Field 2 (deep blue)    | `--color-field-2`          | `#0D3F8F` | AI engineering stage                                                           |
| Field 3 (violet)       | `--color-field-3`          | `#4A2A9C` | Career path cards (alternating with field 5)                                   |
| Field 4 (wine)         | `--color-field-4`          | `#7B1D4E` | Beyond the code                                                                |
| Field 5 (deep teal)    | `--color-field-5`          | `#0C5560` | Skills tiles, career cards                                                     |
| Field 6 (navy)         | `--color-field-6`          | `#1A2340` | Education and languages strip, quiet fields                                    |

The logo (`assets/logo.svg`) keeps its own colors (blue `#00B6FF` and white on dark grey `#272A2C`); it sits on `paper` or `surface` and is never recolored. Light theme: none (the page is dark only, `color-scheme: dark`).

Primary choice: `#FF6F3C` is a bright warm orange-coral (hue about 16 degrees, high saturation). The only other warm primary, `#E5543A` (hue about 8 degrees, a red-coral used with a light theme), reads redder and darker; `#FF6F3C` is clearly more orange and brighter, matches the portrait's orange gradient, and gives 7:1 with dark text. No other site uses it, and the `diversity` rule also differs on display font and hero type.

Measured WCAG 2.x contrast (relative luminance, hand-checked and confirmed by `check-landing` for the standard pairs):

| Pair                                     | Ratio                                     | Needs               | Result                                                                                                 |
| ---------------------------------------- | ----------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------ |
| ink on paper                             | 16.9:1                                    | 4.5                 | pass                                                                                                   |
| ink on surface                           | 15.8:1                                    | 4.5                 | pass                                                                                                   |
| ink-soft on paper                        | 10.5:1                                    | 4.5                 | pass                                                                                                   |
| ink-soft on surface                      | 9.7:1                                     | 4.5                 | pass                                                                                                   |
| primary-contrast on primary              | 7.0:1                                     | 4.5                 | pass                                                                                                   |
| primary-contrast on primary-hover        | 8.4:1                                     | 4.5                 | pass                                                                                                   |
| primary on paper                         | 7.0:1                                     | 4.5                 | pass                                                                                                   |
| primary on surface                       | 6.4:1                                     | 4.5                 | pass                                                                                                   |
| cool on paper / surface                  | 8.7 / 8.0:1                               | 4.5                 | pass                                                                                                   |
| bridge on paper / surface                | 6.3 / 5.8:1                               | 4.5                 | pass                                                                                                   |
| accent on paper                          | 12.5:1                                    | 4.5                 | pass                                                                                                   |
| ink on field-1 / 2 / 3 / 4 / 5 / 6       | about 7.5 / 8.7 / 8.9 / 8.8 / 7.5 / 14 :1 | 4.5                 | pass                                                                                                   |
| ink-soft on field-1 (the lightest field) | about 4.7:1                               | 4.5                 | pass (ink-soft stays at 14 px and up)                                                                  |
| primary on a field                       | 3.0 to 4.2:1                              | 3 (large text only) | use only for headings of 24 px and up or non-text marks on a field; body-size text on a field is `ink` |
| line on paper                            | 1.4:1                                     | n/a                 | decorative hairline, never carries information alone                                                   |

Rules that follow: text on a field is `ink` (or `ink-soft`); coral text on a field is large type only; a card must never rely on its field color alone for meaning (the border and the label carry it).

## 5. Typography

Three self-hosted OFL families (no third-party host), all variable:

- **Display: Bricolage Grotesque Variable** (`@fontsource-variable/bricolage-grotesque`, `wght` 200 to 800). A distinctive grotesque with ink-trap character; the wght axis lets one headline mix a light cut (`--font-weight-display-light: 200`) and a heavy cut (`--font-weight-display-heavy: 800`), as in the hero name (first line light, second line heavy). Letter spacing slightly negative on large sizes (about -0.02em), tight line height (0.9 to 1.0).
- **Body: Instrument Sans Variable** (`@fontsource-variable/instrument-sans`, `wght` 400 to 700). Neutral and humanist enough for long reading, calmer than the display. Weights used: 400 and 500, 600 for emphasis.
- **Labels: Geist Mono Variable** (`@fontsource-variable/geist-mono`, `wght` 100 to 900). Uppercase 12 to 13 px with +0.06em tracking for numbers, dates, chips, ticker, captions and nav indexes.

None of these appear in the other sites (Archivo, Manrope, Onest, Schibsted Grotesk, Hanken Grotesk, Figtree, Noto Sans, Space Grotesk, DM Sans, Fraunces, Inter, Newsreader, JetBrains Mono).

Type scale (tokens): `text-xs` 0.75rem (labels, mono caps), `text-sm` 0.9375rem, `text-base` 1.0625rem (body, line height 1.6), `text-lg` 1.25rem, `text-xl` 1.625rem, `text-2xl` 2.25rem, `text-3xl` clamp(2.5rem, 6vw, 4.5rem) (section headings), `text-4xl` clamp(3.25rem, 13vw, 11rem) (hero name only). Steps are few on purpose: one huge size, one body size, one label size. The hero name must not overflow at 375 px: 13vw is 49 px there and the longest word must fit; check at 375 px.

## 6. Spacing, rhythm, radii

- Spacing base `--spacing: 0.25rem`. Section padding 5rem to 8rem on desktop, 3.5rem to 4.5rem on mobile; gutters 1rem at 375 px, 2rem at 768 px, 3rem and up at 1440 px. Whitespace is small and constant inside blocks, with deliberately uneven section heights (0.4 to 2 viewports, see the page map).
- Layout: 12 columns with the faint column lines (`line` at low opacity) as decoration; content may break the grid by one column for the collage hero.
- Radii: `--radius-sm: 0`, `--radius-md: 2px`, `--radius-lg: 4px`, `--radius-pill: 0` (pills are off). Images, buttons, cards and chips use 0 to 2 px. The portrait is a rectangle (or a clipped polygon on the seam), never a circle or an arch.
- Borders: 1 px `line` hairlines for cards and the grid; 2 px primary for the focus ring.

## 7. Motion tokens

| Token                | Value                            | Use                                             |
| -------------------- | -------------------------------- | ----------------------------------------------- |
| `--duration-instant` | 90 ms                            | Hover and focus color inversion (brutalist cut) |
| `--duration-fast`    | 180 ms                           | Chip and nav state, underline                   |
| `--duration-base`    | 320 ms                           | Card hover, small reveals                       |
| `--duration-slow`    | 700 ms                           | Section reveals (`data-reveal`), hero load      |
| `--duration-stage`   | 1200 ms                          | The AI stage: portrait turning, seam moving     |
| `--ease-out`         | `cubic-bezier(0.22, 1, 0.36, 1)` | Reveals, entrances                              |
| `--ease-in-out`      | `cubic-bezier(0.65, 0, 0.35, 1)` | The stage and the seam                          |
| `--ease-snap`        | `cubic-bezier(0.7, 0, 0.2, 1)`   | Short, hard transitions                         |

Primitives (motion layer): `data-reveal` for section content, one pin (the AI stage), one parallax or scrub for the portrait seam, a CSS marquee for the status ticker, one hover animation for the guitar strings. Reduced motion: no pin, no scrub, no parallax, no marquee, no smooth scroll; every `[data-reveal]` visible, the portrait static with the seam centered. Without JavaScript everything reads top to bottom.

## 8. Do / don't for the build step

Do:

- Set `paper` as the page background and `ink` as the text color; use `surface` for panels and `line` for hairlines.
- One flat `field-*` color per chapter; text on a field is `ink`, labels in mono `ink-soft`.
- Show the grid: 1 px rules, outlined cards, faint column lines. Mono caps labels for every small piece of metadata (numbers, dates, chips, ticker).
- Headline: line one in `--font-weight-display-light` and line two in `--font-weight-display-heavy` in the same size; one phrase in the primary accent per page section at most.
- Warm (`primary`, `accent`) for the human half content, cool (`cool`) for the AI and tools content, `bridge` for the seam and for transitions between them.
- Glows only as soft radial gradients behind the portrait and a few fields; never on text or controls.
- Links are text links with an underline and an arrow glyph; LinkedIn and GitHub are quiet text links, not buttons.
- Check the hero at 375 px and 1440 px; keep the guitar strings and the ticker keyboard reachable and paused under reduced motion.

Don't (archetype brutalist-raw and the proposal):

- No eyebrow-plus-big-heading pairing in every section: labels sit in mono beside the number, not above the heading.
- No pill buttons, no rounded or arch-shaped photos, no giant wordmark footer.
- No soft drop shadows, glass, glow on text, scanlines or glitch effects.
- No white text on `primary` (use `primary-contrast`), no coral body text on a field, no `ink-soft` below 14 px on a field.
- No big call to action, no email, phone or form (owner's decision); no invented figures, ratings or testimonials.
- No third-party font or asset hosts; fonts are self-hosted by `@fontsource-variable` packages.
- Do not recolor or redraw the logo; the portrait is used at most twice, never twice in one section, with the alt "AI-generated portrait of Willians Nieves".

## 9. Landing meta

Machine-readable summary read by `scripts/check-landing.mjs`. Keep it in sync with sections 4 and 5 and with the "Archetype blend" of the proposal.

```landing-meta
primary: #ff6f3c
display-font: Bricolage Grotesque
body-font: Instrument Sans
hero: collage
archetype: custom
traits: mono-labels, ref:product-inc/marquee-type, ref:sebg-ch/visible-grid
```
