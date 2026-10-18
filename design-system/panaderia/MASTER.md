# Design system: Horno Lento (panaderia)

Source of truth for `sites/panaderia/src/styles/tokens.css`. Produced with the `ui-ux-pro-max` skill only (no other design skill). Brief: `sites/panaderia/PROPOSAL.md`.

## 1. Skill queries run

All from the repo root, `S=.claude/skills/ui-ux-pro-max/scripts/search.py`.

| #   | Command                                                                                              | Result in short                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `python3 $S "artisan sourdough bakery cafe landing warm editorial" --design-system -p "Horno Lento"` | Pattern "Funnel", style "Vibrant & Block-based", Bakery/Cafe palette (#92400E / #FEF3C7 / #78350F), fonts Inter + Playfair Display, avoid "poor food photos, hidden hours".     |
| 2   | `python3 $S "bakery warm earthy craft" --domain color`                                               | Bakery/Cafe palette: primary and CTA #92400E, secondary #B45309, background #FEF3C7, foreground #78350F, border #FDE68A. Also Brewery/Winery (#7C2D12 deep rust, #A16207 gold). |
| 3   | `python3 $S "warm serif editorial elegant food" --domain typography`                                 | Restaurant Menu (Playfair Display SC + Karla), Classic Elegant (Playfair Display + Inter), Calistoga + Inter.                                                                   |
| 4   | `python3 $S "organic natural warm soft editorial minimal" --domain style`                            | Minimalism & Swiss Style (white space, grid, single accent, no shadows). Used for the layout principles; its black/white colors are not used.                                   |
| 5   | `python3 $S "Fraunces serif variable" --domain google-fonts`                                         | Fraunces: serif, variable axes SOFT, WONK, opsz, wght; latin subset; Undercase Type. License OFL per `data/google-font-licenses.json`.                                          |
| 6   | `python3 $S "storytelling scroll pinned parallax editorial" --domain landing`                        | Scroll-Triggered Storytelling: keep the story readable without scroll effects, DOM order complete, disable parallax and scrub under reduced motion.                             |
| 7   | `python3 $S "scroll reveal timing easing duration" --domain ux`                                      | Use shared motion tokens, different durations per purpose, ease-out for entry, linear for scrub.                                                                                |
| 8   | `python3 $S "pin scrub parallax reveal" --domain gsap`                                               | Scrub 0.5-1.5, pin at most 1-2 sections, parallax delta 5-15 percent and never on body copy, skip under reduced motion.                                                         |
| 9   | `python3 $S "Bakery Cafe" --domain product`                                                          | Primary style "Vibrant & Block-based + Soft UI Evolution", palette focus "Warm Brown + Cream + Appetizing accents".                                                             |
| 10  | `python3 $S "organic biophilic natural earthy soft" --domain style`                                  | Organic Biophilic (green and blue palette, blobs, wood textures); rejected, off-tone for a bakery.                                                                              |
| 11  | `python3 $S "Inter" --domain google-fonts` and `"Instrument Sans"`                                   | Inter: variable `wght` (and opsz), latin, Rasmus Andersson, OFL. Instrument Sans considered and not chosen.                                                                     |

## 2. Conflicts between the skill and the proposal (reported, not hidden)

1. **Style.** The skill's top recommendation is "Vibrant & Block-based" (bold, energetic, high color contrast, geometric blocks, youth-focused). The proposal asks for editorial calm with one playful moment. Resolution: not adopted. The closest supported option is "Minimalism & Swiss Style" for structure (white space, grid, single accent, no shadows, clear hierarchy) combined with the skill's own bakery palette focus "Warm Brown + Cream". The "block" idea survives only as flat tinted panels (the sand section).
2. **Palette.** The skill's Bakery/Cafe palette has a saturated yellow background (#FEF3C7) and a pale amber border. The proposal wants a warm off-white base and a sand panel. Resolution: kept the skill's action color (#92400E), its secondary (#B45309) as a decorative accent and its brown family for text, but moved the base to a warm off-white and added a sand tint. The values are tuned (not copied) and every pair is measured below.
3. **Fonts.** The skill pairs Playfair Display + Inter for editorial work. Playfair is a high-contrast display serif that feels formal and luxury, and its hairlines break down in outlined giant type. Resolution: the display face is Fraunces, a warm "old-style soft" serif that the skill's google-fonts data lists and supports (variable, OFL, latin); body stays Inter, the skill's most-used body face. This is a data-backed substitution, not a free pick.
4. **Skill landing pattern.** "Funnel (3-step conversion)" does not fit; the page keeps the approved 9-section map. The skill's "Scroll-Triggered Storytelling" notes are used for the pinned process and the motion rules.

## 3. Chosen style

Editorial minimalism with a crafted warm tone: generous white space, asymmetric grid, flat color panels, no shadows and no gradients, hairline dividers, photography does the talking. Typography is the personality: Fraunces used big in only four places (hero statement, manifesto sentence, outlined "MASA MADRE", footer wordmark). One action color. Radii are soft; photos are arch-cropped.

## 4. Palette

| Role (token)       | Hex       | Use                                                                    |
| ------------------ | --------- | ---------------------------------------------------------------------- |
| `paper`            | `#FAF5EC` | Page background (warm off-white)                                       |
| `surface`          | `#EFE4D0` | Sand panel tint (manifesto, visit card)                                |
| `ink`              | `#2B1D14` | Body and headings (dark warm brown); also the dark footer background   |
| `ink-soft`         | `#5C4838` | Secondary text, captions, table labels                                 |
| `line`             | `#D8C8AE` | Hairlines and dividers only; never text, never the only cue of a state |
| `primary`          | `#92400E` | The one action color: buttons, text links, focus ring                  |
| `primary-hover`    | `#7C2D12` | Button and link hover                                                  |
| `primary-contrast` | `#FFFFFF` | Text on `primary`                                                      |
| `accent`           | `#B45309` | Decorative only: outline stroke of the giant word, small marks, shapes |

Source: `primary` and `accent` are the skill's Bakery/Cafe CTA and secondary colors; `primary-hover` is the skill's Brewery/Winery primary; the rest are tuned in the warm brown family of the skill's foreground (#78350F).

### Measured WCAG contrast (relative luminance formula, WCAG 2.x)

| Pair actually used                                        | Ratio       | Requirement | Result                                     |
| --------------------------------------------------------- | ----------- | ----------- | ------------------------------------------ |
| `ink` on `paper` (body, headings)                         | 15.01       | 4.5         | pass (AAA)                                 |
| `ink` on `surface` (text on the sand panel)               | 12.94       | 4.5         | pass (AAA)                                 |
| `ink-soft` on `paper` (soft text)                         | 7.93        | 4.5         | pass (AAA)                                 |
| `ink-soft` on `surface` (soft text on the panel)          | 6.84        | 4.5         | pass                                       |
| `primary-contrast` on `primary` (button label)            | 7.09        | 4.5         | pass (AAA)                                 |
| `primary-contrast` on `primary-hover` (button hover)      | 9.37        | 4.5         | pass                                       |
| `primary` on `paper` (text link, focus ring)              | 6.53        | 4.5 / 3     | pass                                       |
| `primary` on `surface` (link and focus ring on the panel) | 5.63        | 4.5 / 3     | pass                                       |
| `paper` on `ink` (footer text and wordmark)               | 15.01       | 4.5         | pass (AAA)                                 |
| `accent` on `paper` (giant outline stroke, non-text)      | 4.62        | 3           | pass                                       |
| `accent` on `surface` (decorative marks on the panel)     | 3.99        | 3           | pass, large or non-text only               |
| `line` on `paper` / `surface`                             | 1.51 / 1.30 | n/a         | decorative hairlines, carry no information |

Rules that follow: never set `accent` as small text on `surface`; never use `line` for text or input borders; keep `primary` for actions only (a second accent breaks the Black Star lesson of one reserved action color).

## 5. Typography

| Role    | Family                                  | Why                                                                                                                    | License     | Self-hosted file (latin, woff2)      |
| ------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------ |
| Display | Fraunces Variable (`wght` 100-900 axis) | Warm, soft, slightly quirky old-style serif; reads crafted and unhurried; strong at large sizes, survives outlined use | SIL OFL 1.1 | `fraunces-latin-wght-normal` 36.6 KB |
| Body/UI | Inter Variable (`wght` 100-900 axis)    | Neutral, very legible at 15-17 px, the skill's standard body face; keeps the serif as the only personality             | SIL OFL 1.1 | `inter-latin-wght-normal` 48.3 KB    |

Payload: about 85 KB of woff2 for both families on a Spanish page (latin subset only; the `latin-ext` and `vietnamese` faces are in the CSS but are fetched only if a glyph from those ranges appears). Fonts come from the npm packages `@fontsource-variable/fraunces` and `@fontsource-variable/inter` (`wght.css`, `font-display: swap`), no Google Fonts request at runtime. The `opsz`, `SOFT` and `WONK` axes of Fraunces are intentionally not loaded (they would add 26-45 KB); at the big sizes Fraunces's default optical size is fine. Only upright styles are loaded; do not use `italic` or synthetic bold.

Weights: display 400-500 (large sizes look better light-to-medium; 600 maximum), body 400, UI labels and buttons 500-600.

### Type scale

| Token (utility)  | Value                          | Used for                                                                                  | Line height / tracking          |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------- |
| `text-xs`        | 0.8125rem                      | Hours table notes, legal, captions (minimum size on the site)                             | 1.5                             |
| `text-sm`        | 0.9375rem                      | Nav links, product price, tags                                                            | 1.5                             |
| `text-base`      | 1.0625rem (17 px)              | Body                                                                                      | 1.6                             |
| `text-lg`        | 1.25rem                        | Lead paragraphs                                                                           | 1.5                             |
| `text-xl`        | 1.625rem                       | Product names, step titles (display font)                                                 | 1.2                             |
| `text-2xl`       | clamp(1.75rem, 3vw, 2.25rem)   | Sub-headings                                                                              | 1.15, -0.01em                   |
| `text-3xl`       | clamp(2.25rem, 4.5vw, 3.75rem) | Section headings                                                                          | 1.05, -0.02em                   |
| `text-4xl`       | clamp(2.75rem, 8vw, 7rem)      | Hero statement (2 lines, bottom-right)                                                    | 0.98, -0.03em                   |
| `text-manifesto` | clamp(1.875rem, 4vw, 3.5rem)   | The one large manifesto sentence                                                          | 1.12, -0.02em                   |
| `text-giant`     | clamp(8rem, 28vw, 30rem)       | Outlined "MASA MADRE" (stroke `accent`, transparent fill, `-webkit-text-stroke` 1.5-2 px) | 0.8, -0.04em, uppercase, nowrap |
| `text-wordmark`  | clamp(3rem, 15vw, 20rem)       | Footer wordmark "Horno Lento", full width                                                 | 0.85, -0.04em, nowrap           |

At 1440 px these resolve to: hero 7 rem (112 px), manifesto 3.5 rem (56 px), giant 28 vw = 403 px, wordmark 15 vw = 216 px. At 375 px: hero 2.75 rem, manifesto 1.875 rem, giant 8 rem, wordmark 3.5 rem (15 vw = 56 px; the 3 rem floor applies below 320 px). The 15 vw wordmark width (11 characters of Fraunces at about 0.5 em each) fits inside the gutters; the build step must verify it does not overflow at 375/768/1440 and tune the factor if it does.

## 6. Spacing, rhythm, radii

- Base unit `--spacing: 0.25rem` (4 px grid, Tailwind default).
- `--section-y: clamp(5rem, 12vw, 10rem)` is the vertical padding between sections (80 px mobile, 144 px at 1200 px+, 160 px max). The sand panel and the footer may use 1.25x. Tight groups inside a section use 6-12 (1.5-3 rem), related text 3-4.
- `--gutter: clamp(1.25rem, 4vw, 3rem)` side padding (20 px at 375, 48 px max). Content width max 80 rem; text measure 62 ch for body, 20 ch for the hero statement.
- Radii: `radius-sm` 0.375 rem (inputs, tags), `radius-md` 0.75 rem (cards), `radius-lg` 1.5 rem (panels), `radius-pill` (buttons, header action). `rounded-arch` = `999px 999px 0.75rem 0.75rem`: the top is a semicircle, the base keeps a soft corner. Use it on product tiles, the process photo and the three-photo strip; the hero photo stays full-bleed and square.
- Shadows: none. Depth comes from the tint (`surface`) and hairlines (`line`).

## 7. Motion tokens

Consistent with the proposal's motion plan (reveal, pin, scrub, parallax, Lenis). All motion is off under `prefers-reduced-motion: reduce`; content is visible without JavaScript.

| Token                | Value                            | GSAP equivalent | Use                                                                   |
| -------------------- | -------------------------------- | --------------- | --------------------------------------------------------------------- |
| `--ease-out-soft`    | `cubic-bezier(0.16, 1, 0.3, 1)`  | `expo.out`      | Reveals, hero statement, anything that arrives                        |
| `--ease-in-out-soft` | `cubic-bezier(0.65, 0, 0.35, 1)` | `power3.inOut`  | Pinned step change, header becoming solid                             |
| (none)               | `linear`                         | `none`          | Scrub (giant word) and parallax: tied to scroll position, never eased |
| `--duration-fast`    | 180 ms                           | 0.18 s          | Hover, press, focus                                                   |
| `--duration-base`    | 320 ms                           | 0.32 s          | Header solid on scroll, small state changes                           |
| `--duration-reveal`  | 900 ms                           | 0.9 s           | `data-reveal` fade and rise (2 rem), stagger 80-120 ms                |
| `--duration-slow`    | 1400 ms                          | 1.4 s           | Hero statement entrance, step photo cross-fade                        |

Parameters from the skill's gsap data: scrub 0.5-1.5 (use 1), at most one pinned section (the process), parallax delta 5-15 percent on photos only (never on text), `ScrollTrigger.refresh()` after fonts and images load.

## 8. Do / don't for the build step

Do:

- Reference tokens only (`bg-paper`, `text-ink`, `bg-surface`, `bg-primary text-primary-contrast`, `font-display`, `text-giant`, `rounded-arch`); no raw hex in components.
- Reserve `primary` for actions ("Encarga para recoger", "Cómo llegar", links, focus ring). Keep the focus outline (3 px `primary`, offset 3 px) visible everywhere.
- Use Fraunces large and only in the four big moments plus headings and product names; everything else is Inter.
- Keep body text at 17 px or more on mobile; `text-xs` is the floor.
- Give every photo explicit width and height (arch crop via `rounded-arch overflow-hidden`), hero photo preloaded, others lazy.
- Keep fixed 44 px minimum touch height for buttons and nav links.
- Check `text-giant` and `text-wordmark` for horizontal overflow at 375/768/1440 and wrap them in `overflow-x: clip`.
- Preload the Fraunces latin file only if the hero statement shows a swap flash in QA (it is the LCP-adjacent text).

Don't:

- Don't add a second accent color or use `accent` for small text or buttons.
- Don't use `line` for text or input borders, or `ink-soft` below `text-sm` (15 px).
- Don't load Playfair, extra weights, italics, `latin-ext` forced loads, or a third family.
- Don't use shadows, gradients, glassmorphism or emoji icons.
- Don't parallax text, pin more than one section, or leave motion on under reduced motion.
- Don't hard-code sizes for the big type; use the `clamp` tokens.
- Don't request fonts from Google at runtime.
