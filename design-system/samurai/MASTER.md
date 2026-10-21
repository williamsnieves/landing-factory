# Design system: Atlas Bushi (samurai)

Source of truth for `sites/samurai/src/styles/tokens.css`. Produced with the `ui-ux-pro-max` skill only (no other design skill). Brief: `sites/samurai/PROPOSAL.md`.

## 1. Skill queries run

All from the repo root, `python3 .claude/skills/ui-ux-pro-max/scripts/search.py ...`.

| #   | Command                                                                                                    | Result in short                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `"dark cinematic japanese history samurai educational reading editorial" --design-system -p "Atlas Bushi"` | Pattern "Feature-Rich Showcase", style Claymorphism (playful, light), indigo/orange palette, Baloo 2 + Comic Neue; it says to avoid dark modes.       |
| 2   | `"dark cinematic museum history" --domain color`                                                           | Museum/Gallery (gallery black #18181B on white space) and Podcast Platform (dark #0F0F23, light text #F8FAFC, orange accent).                         |
| 3   | `"serif elegant classical editorial dark" --domain typography`                                             | Classic Elegant (Playfair Display + Inter), Minimalist Monochrome Editorial (Playfair + Source Serif 4), Editorial Classic (Cormorant + Baskerville). |
| 4   | `"dark cinematic editorial minimal luxury" --domain style`                                                 | Minimalism and Swiss Style: whitespace, high contrast, hairlines, no shadows, one single accent color, dark mode supported.                           |
| 5   | `"Newsreader" --domain google-fonts`                                                                       | Newsreader: serif, designer Production Type, axes `opsz` 6-72 and `wght` 200-800, subsets latin, latin-ext, vietnamese.                               |
| 6   | `"storytelling scroll" --domain landing`                                                                   | Scroll-Triggered Storytelling: chapters, progress indicator, mini CTA per chapter, complete DOM order, scrub off under reduced motion.                |
| 7   | `"contrast dark mode focus" --domain ux`                                                                   | Focus indicator at least 2 px with 3:1 contrast; body text needs strong contrast.                                                                     |
| 8   | `"scroll scrub reveal" --domain gsap`                                                                      | Scrub 0.5-1.5, pin at most 1-2 sections, `ScrollTrigger.refresh()` after fonts and images, small reveal offset, matchMedia for reduced motion.        |

Package check (`npm view <package> version`): `@fontsource-variable/newsreader` 5.3.0, `@fontsource-variable/inter` 5.3.0 (installed in `site-samurai`). Also available and not chosen: `@fontsource/shippori-mincho` 5.3.0, `@fontsource/zen-old-mincho` 5.3.1, `@fontsource-variable/cormorant` 5.3.0, `@fontsource-variable/source-serif-4` 5.3.1.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

1. **Style.** The unconstrained query returned Claymorphism (soft, toy-like, light) and says to avoid dark modes. It is the opposite of a quiet, cinematic reading page. Resolution: the proposal wins. We use the skill's Minimalism / editorial family (query 4): hairlines, no shadows, one accent, generous space, dark supported.
2. **Palette.** The skill offers indigo/orange and a white gallery. The proposal asks for a near-black lacquer ground, warm paper-white text and one vermilion (shu). Resolution: the proposal wins; the structure (dark ground, off-white foreground, one warm accent, muted foreground, subtle border) follows the skill's dark Podcast Platform palette, with hues retuned to lacquer and shu.
3. **Fonts.** The skill pairs Playfair Display with Inter for dark editorial work. Playfair is the generic "luxury" choice and its hairlines are too thin at small sizes on black. Resolution: Newsreader (print-like text serif by Production Type, optical size axis) for display and Inter for body. Fraunces is forbidden (used by panaderia). Shippori Mincho and Zen Old Mincho were considered for a Japanese flavor, but the page is Spanish and a Mincho latin set would read as a costume.
4. **Landing pattern.** "Feature-Rich Showcase" does not fit; the page keeps the approved chapter map. The skill's "Scroll-Triggered Storytelling" notes drive the motion rules (query 6 and 8).

## 3. Chosen style

Quiet, cinematic reading experience: near-black lacquer ground, warm paper-white text, a single vermilion (shu) used in two intensities, hairline dividers, no shadows, no gradients, no glass. Type does the work: a large print-like serif and a calm sans. Photography and the two 3D scenes (drifting ink, katana) provide the light; the UI stays still. Corners are almost square (print, not app).

## 4. Palette

Dark site naming: `paper` is the dark ground and `ink` is the light text, so the checker's standard `ink` on `paper` pair stays "text on background". Utilities: `bg-paper text-ink`.

| Role (token)       | Hex       | Use                                                                                       |
| ------------------ | --------- | ----------------------------------------------------------------------------------------- |
| `paper`            | `#0E0C0B` | Page background: near-black lacquer (also `html` background)                              |
| `surface`          | `#1A1613` | Raised panels, cards, caption blocks, footer                                              |
| `ink`              | `#F1EADC` | Body and headings: warm paper-white                                                       |
| `ink-soft`         | `#B5AA98` | Secondary text, captions, credits                                                         |
| `line`             | `#3A322B` | Hairlines and dividers only; never text, never the only cue of a state                    |
| `primary`          | `#E5543A` | Shu, bright intensity: buttons, text links, focus ring, chapter numerals                  |
| `primary-hover`    | `#F0694F` | Button and link hover                                                                     |
| `primary-contrast` | `#0E0C0B` | Text on `primary` and `primary-hover` (dark lacquer, not white)                           |
| `accent`           | `#BC351F` | Shu, deep intensity: large shapes, outline strokes, rules, the katana tint; non-text only |

Source: dark ground, light foreground and single warm accent follow the structure of the skill's dark palette (query 2); the hues are our own lacquer and shu values. 3D scenes read every color from these tokens (`@theme static`).

### Measured WCAG contrast (relative luminance formula, WCAG 2.x)

| Pair actually used                                     | Ratio     | Requirement | Result                                     |
| ------------------------------------------------------ | --------- | ----------- | ------------------------------------------ |
| `ink` on `paper` (body, headings)                      | 16.3      | 4.5         | pass (AAA)                                 |
| `ink` on `surface` (text on panels)                    | 15.0      | 4.5         | pass (AAA)                                 |
| `ink-soft` on `paper` (captions)                       | 8.5       | 4.5         | pass (AAA)                                 |
| `ink-soft` on `surface` (captions on panels)           | 7.9       | 4.5         | pass (AAA)                                 |
| `primary-contrast` on `primary` (button label)         | 5.3       | 4.5         | pass                                       |
| `primary-contrast` on `primary-hover` (button hover)   | 6.4       | 4.5         | pass                                       |
| `primary` on `paper` (link, numerals, focus ring)      | 5.3       | 4.5 / 3     | pass                                       |
| `primary` on `surface` (link and focus ring on panels) | 4.8       | 4.5 / 3     | pass                                       |
| `primary-hover` on `paper` (link hover)                | 6.4       | 4.5         | pass                                       |
| `accent` on `paper` (outline strokes, rules, non-text) | 3.4       | 3           | pass, large or non-text only               |
| `accent` on `surface` (shapes on panels)               | 3.1       | 3           | pass, large or non-text only               |
| `line` on `paper` / `surface`                          | 1.6 / 1.4 | n/a         | decorative hairlines, carry no information |

Rules that follow: never set `accent` as small text; never use `line` for text or input borders; keep `primary` for actions and chapter numerals only (one accent family, two intensities, nothing else red).

## 5. Typography

| Role    | Family                                            | Why                                                                                                                        | License     | Self-hosted file                               |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------- |
| Display | Newsreader Variable (`opsz` 6-72, `wght` 200-800) | Print-like text serif with an optical size axis: sturdy at 17 px, sharp and calligraphic at giant sizes; reads like a book | SIL OFL 1.1 | `newsreader-latin-opsz-normal` (+ `latin-ext`) |
| Body/UI | Inter Variable (`wght` 100-900)                   | Neutral, very legible on dark at 15-17 px; keeps the serif as the only personality                                         | SIL OFL 1.1 | `inter-latin-wght-normal`                      |

Spanish glyphs: the `latin` face covers accents and ñ, ¿ ¡. The macrons of romanized Japanese (ō U+014D, ū U+016B: Tōkugawa, Shōgun, Bushidō) are in the `latin-ext` face (unicode-range `U+0100-02BA`). `@fontsource-variable/newsreader/opsz.css` declares both faces with their `unicode-range`, so the browser fetches `latin-ext` (about 36 KB) only on pages that use a macron; keep it imported. Do not strip it. Inter's latin subset has no macrons: write macron words inside the display font or accept the fallback for those glyphs in body text (Inter `latin-ext` is also declared by the package and is fetched on demand).

Optical size is automatic (`font-optical-sizing: auto`, the browser default). Weights: display 300-500 (giant sizes at 300-400), body 400, UI labels and buttons 500-600.

### Type scale

| Token (utility)  | Value                          | Used for                                                      | Line height / tracking |
| ---------------- | ------------------------------ | ------------------------------------------------------------- | ---------------------- |
| `text-xs`        | 0.8125rem                      | Captions, credits, legal (minimum size on the site)           | 1.5                    |
| `text-sm`        | 0.9375rem                      | Nav links, tags, museum object labels                         | 1.5                    |
| `text-base`      | 1.0625rem (17 px)              | Body                                                          | 1.65                   |
| `text-lg`        | 1.25rem                        | Lead paragraphs                                               | 1.5                    |
| `text-xl`        | 1.625rem                       | Pull quotes, card titles (display font)                       | 1.25                   |
| `text-2xl`       | clamp(1.75rem, 3vw, 2.25rem)   | Sub-headings                                                  | 1.15, -0.01em          |
| `text-3xl`       | clamp(2.25rem, 4.5vw, 3.75rem) | Chapter headings                                              | 1.05, -0.02em          |
| `text-4xl`       | clamp(3rem, 9vw, 7rem)         | Hero supporting statement, big pull sentence                  | 1, -0.02em             |
| `text-hero-word` | clamp(5rem, 24vw, 22rem)       | The giant hero word, over the `ink` particle scene            | 0.85, -0.03em, nowrap  |
| `text-numeral`   | clamp(5rem, 14vw, 12rem)       | Chapter numerals I-VI (display font, `primary`, light weight) | 0.9, -0.02em           |
| `text-wordmark`  | clamp(3rem, 15vw, 20rem)       | Footer wordmark "Atlas Bushi", full width                     | 0.85, -0.04em, nowrap  |

At 1440 px: hero word 22 rem cap is reached at 92 rem, so it is 24 vw = 345 px; numeral 14 vw = 202 px capped at 192 px; wordmark 15 vw = 216 px. At 375 px: hero word 5 rem (a 7-letter word at 80 px must fit 335 px: check in QA and wrap in `overflow-x: clip`), numeral 5 rem, wordmark 3 rem.

## 6. Spacing, rhythm, radii

- Base unit `--spacing: 0.25rem` (4 px grid).
- `--section-y: clamp(5rem, 12vw, 10rem)` between chapters; chapter openings may use 1.25x for a slower pace.
- `--gutter: clamp(1.25rem, 4vw, 3rem)` side padding. Content width max 80 rem; reading column `--measure: 62ch`.
- Radii: `radius-sm` 2 px, `radius-md` 4 px, `radius-lg` 8 px, `radius-pill` for the single header action. Photos are rectangles with `radius-sm`, like prints.
- Shadows: none. Depth comes from `surface` tint and `line` hairlines.

## 7. Motion tokens

Cinematic means slow and quiet. All motion is off under `prefers-reduced-motion: reduce`; content is visible without JavaScript; a 3D scene shows its poster.

| Token                | Value                            | GSAP equivalent | Use                                                               |
| -------------------- | -------------------------------- | --------------- | ----------------------------------------------------------------- |
| `--ease-out-soft`    | `cubic-bezier(0.16, 1, 0.3, 1)`  | `expo.out`      | Reveals, hero entrance                                            |
| `--ease-in-out-soft` | `cubic-bezier(0.65, 0, 0.35, 1)` | `power3.inOut`  | Header becoming solid, chapter transitions                        |
| (none)               | `linear`                         | `none`          | Scrub (katana rotation, camera) and parallax                      |
| `--duration-fast`    | 180 ms                           | 0.18 s          | Hover, press, focus                                               |
| `--duration-base`    | 320 ms                           | 0.32 s          | Header solid, small state changes                                 |
| `--duration-reveal`  | 1000 ms                          | 1 s             | `data-reveal` fade and rise (offset 2 rem, small), stagger 100 ms |
| `--duration-slow`    | 1600 ms                          | 1.6 s           | Hero word entrance, 3D canvas fade-in over the poster             |

From the skill's gsap data: scrub 1 (range 0.5-1.5), at most one or two pinned sections (the katana chapter), `ScrollTrigger.refresh()` after fonts and images load, `matchMedia` for reduced motion, no invisible-by-default content without a no-JS fallback.

## 8. Do / don't for the build step

Do:

- Use tokens only (`bg-paper`, `text-ink`, `bg-surface`, `bg-primary text-primary-contrast`, `font-display`, `text-hero-word`); no raw hex in components. 3D scenes read the same tokens.
- Reserve `primary` for actions, links, focus ring and chapter numerals; use `accent` only for large non-text shapes and strokes.
- Keep a 3 px `primary` focus outline (offset 3 px) visible everywhere.
- Set the display serif large and light; body 17 px or more; `text-xs` is the floor.
- Give photos explicit width and height, hero poster `priority`, others lazy. Sober grading: let museum objects sit on `paper` or `surface` without borders.
- Keep 44 px minimum touch height for buttons and nav links.
- Check `text-hero-word` and `text-wordmark` for overflow at 375/768/1440.
- Write macron words (Shōgun, Bushidō) with real ō and ū characters; verify they render in the display font.

Don't:

- Don't add a second hue or any other red; no gold, no cherry-blossom pink, no cliches (rising sun, katakana filler, bamboo textures).
- Don't use `accent` or `line` for text, or `ink-soft` below `text-sm`.
- Don't use shadows, gradients, glassmorphism or emoji icons.
- Don't drop the `latin-ext` import (it holds ō and ū).
- Don't parallax text, pin more than two sections, or leave motion on under reduced motion.
- Don't request fonts from Google at runtime.

## 9. Landing meta

Machine-readable summary read by `scripts/check-landing.mjs` (tokens check and the diversity rule across sites). Keep it in sync with sections 4 and 5.

```landing-meta
primary: #e5543a
display-font: Newsreader
body-font: Inter
hero: typographic
```
