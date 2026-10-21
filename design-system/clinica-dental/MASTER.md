# Design system: Dental Azahar (clinica-dental)

Source of truth for `sites/clinica-dental/src/styles/tokens.css`. Produced with the `ui-ux-pro-max` skill only (no other design skill). Brief: `sites/clinica-dental/PROPOSAL.md`.

## 1. Skill queries run

All from the repo root, `S=.claude/skills/ui-ux-pro-max/scripts/search.py`.

| #   | Command                                                                                                                    | Result in short                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `python3 $S "dental clinic calm reassuring teal airy soft rounded friendly healthcare" --design-system -p "Dental Azahar"` | Pattern "Hero + Testimonials + CTA", style "Soft UI Evolution", sky-blue palette (#0EA5E9 / #F0F9FF / #0C4A6E) with a yellow accent note, fonts Varela Round + Nunito Sans, avoid "poor imagery, no testimonials". |
| 2   | `python3 $S "dental medical calm teal green" --domain color`                                                               | Medical Clinic palette: primary #0891B2, accent #16A34A, background #F0FDFA, foreground #134E4A, border #CCFBF1, muted foreground #475569. Same values for Telemedicine.                                           |
| 3   | `python3 $S "friendly rounded geometric sans healthcare calm clean" --domain typography`                                   | Soft Rounded (Varela Round + Nunito Sans), Medical Clean (Figtree + Noto Sans, "medical, clean, accessible, trustworthy"), Wellness Calm (Lora + Raleway).                                                         |
| 4   | `python3 $S "soft airy calm minimal healthcare rounded" --domain style`                                                    | Minimalism & Swiss Style (white space, grid, essential elements only, no shadows or gradients, single primary). Used for layout principles; its black/white colors and 0 px radius are not used.                   |
| 5   | `python3 $S "Figtree" --domain google-fonts`                                                                               | Figtree: sans serif, variable `wght` 300-900, latin and latin-ext, designer Erik Kennedy.                                                                                                                          |
| 6   | `python3 $S "Noto Sans" --domain google-fonts`                                                                             | Noto Sans family listed (script-specific variants returned first); the Latin Noto Sans comes from the typography pairing in query 3.                                                                               |

Packages checked with `npm view`: `@fontsource-variable/figtree` 5.3.0 and `@fontsource-variable/noto-sans` 5.3.0.

## 2. Conflicts between the skill and the proposal (reported, not hidden)

1. **Palette family.** The `--design-system` run recommends a sky blue (#0EA5E9) with a yellow "smile" accent. The proposal asks for sea-green and teal with one coral accent. Resolution: followed the proposal. The skill's own Medical Clinic palette (query 2) is teal (#0891B2) with a green accent, which supports the direction; its action color is too bright for white text (about 3.7:1), so the primary is a deeper teal tuned to pass AA with white. The skill's green accent and yellow accent are not used; the single accent is a warm coral, decorative only.
2. **Style.** The skill's top style is "Soft UI Evolution" (subtle shadows, depth). The proposal asks for a quiet, airy page. Resolution: flat tinted panels and hairlines, no shadows, structure from "Minimalism & Swiss Style" (white space, essential elements, single primary). Softness comes from large radii and the pale green tint, not from shadows.
3. **Radii.** Minimalism & Swiss Style uses `--border-radius: 0px`. The proposal wants rounded, friendly shapes. Resolution: generous radii (up to 2.5 rem for the hero frame) and a pill for buttons. No arch crops (that is the bakery's signature).
4. **Fonts.** The skill's first pairing is Varela Round + Nunito Sans (soft, but "children's products, pet apps"). That reads infantile for a clinic, which the proposal forbids ("never infantile"). Resolution: Figtree (display) + Noto Sans (body), the skill's "Medical Clean" pairing for "healthcare, medical clinics, accessibility". Figtree is a friendly geometric grotesque with round bowls; Noto Sans is a clean humanist sans with full Spanish coverage. Data-backed, not a free pick.
5. **Skill landing pattern.** "Hero + Testimonials + CTA" does not fit: the proposal forbids invented testimonials and ratings (regulated niche) and keeps its approved 10-section map. The skill's "avoid: no testimonials" is therefore knowingly not followed; trust is built by explaining what happens in the appointment.
6. **Effects.** The skill suggests "improved shadows" for Soft UI. Not adopted (see 2).

## 3. Chosen style

Calm, airy, flat. Off-white with a faint cool tint, one pale sea-green panel tint, deep teal-green text and one teal action color. A warm coral appears only as tiny decorative marks and the edge of the breathing circle. Lots of white space, big soft radii, hairline dividers, no shadows, no gradients. The photographs carry the light; type is friendly and large in three places only (hero statement, the fear sentence, the "Respira" circle) plus the footer wordmark. Tone: reassuring, never clinical-cold and never infantile.

## 4. Palette

| Role (token)       | Hex       | Use                                                                                     |
| ------------------ | --------- | --------------------------------------------------------------------------------------- |
| `paper`            | `#F6FAF9` | Page background (white with a faint cool tint)                                          |
| `surface`          | `#E1F0EC` | Pale sea-green panel tint (fear section, visit card, calm moment)                       |
| `ink`              | `#0E3433` | Body and headings (very dark teal-green); also the footer background                    |
| `ink-soft`         | `#3E5A59` | Secondary text, captions, table labels                                                  |
| `line`             | `#C3DBD5` | Hairlines and dividers only; never text, never the only cue of a state                  |
| `primary`          | `#0F6B68` | The one action color: buttons, text links, focus ring                                   |
| `primary-hover`    | `#0A5452` | Button and link hover                                                                   |
| `primary-contrast` | `#FFFFFF` | Text on `primary`                                                                       |
| `accent`           | `#DB5F43` | Decorative only (warm coral): tiny marks, the breathing circle edge, small ornament dot |

Source: the hue family and the dark-teal foreground idea come from the skill's Medical Clinic palette (#0891B2 primary, #134E4A foreground, #F0FDFA background, #CCFBF1 border); every value is retuned and measured, none is copied.

### Measured WCAG contrast (relative luminance formula, WCAG 2.x)

The ratios were calculated with the WCAG 2.x formula (sRGB linearization, luminance 0.2126 R + 0.7152 G + 0.0722 B, ratio (L1 + 0.05) / (L2 + 0.05)). The generation sandbox did not allow running scripts, so they were worked out by hand and rounded; re-run a script check if a value is changed. Every text pair has a margin of at least 0.9 over its threshold.

| Pair actually used                                        | Ratio       | Requirement | Result                                     |
| --------------------------------------------------------- | ----------- | ----------- | ------------------------------------------ |
| `ink` on `paper` (body, headings)                         | 12.8        | 4.5         | pass (AAA)                                 |
| `ink` on `surface` (text on the green panel)              | 11.5        | 4.5         | pass (AAA)                                 |
| `ink-soft` on `paper` (soft text)                         | 7.1         | 4.5         | pass (AAA)                                 |
| `ink-soft` on `surface` (soft text on the panel)          | 6.4         | 4.5         | pass                                       |
| `primary-contrast` on `primary` (button label)            | 6.3         | 4.5         | pass                                       |
| `primary-contrast` on `primary-hover` (button hover)      | 8.7         | 4.5         | pass (AAA)                                 |
| `primary` on `paper` (text link, focus ring)              | 6.0         | 4.5 / 3     | pass                                       |
| `primary` on `surface` (link and focus ring on the panel) | 5.4         | 4.5 / 3     | pass                                       |
| `paper` on `ink` (footer text and wordmark)               | 12.8        | 4.5         | pass (AAA)                                 |
| `accent` on `paper` (circle edge, marks; non-text)        | 3.5         | 3           | pass, non-text only                        |
| `accent` on `surface` (marks on the panel; non-text)      | 3.1         | 3           | pass, non-text only                        |
| `line` on `paper` / `surface`                             | 1.39 / 1.24 | n/a         | decorative hairlines, carry no information |

Rules that follow: never set `accent` as text of any size or as a button; never use `line` for text or input borders; keep `primary` for actions only (one reserved action color).

## 5. Typography

| Role    | Family                              | Why                                                                                                                        | License     | Self-hosted file                 |
| ------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------- |
| Display | Figtree Variable (`wght` 300-900)   | Friendly geometric grotesque with round bowls; warm and modern without being childish; the skill's "Medical Clean" heading | SIL OFL 1.1 | `@fontsource-variable/figtree`   |
| Body/UI | Noto Sans Variable (`wght` 100-900) | Clean humanist sans, very legible at 15-17 px, full Spanish coverage; the skill's "Medical Clean" body                     | SIL OFL 1.1 | `@fontsource-variable/noto-sans` |

Fonts come from the npm packages `@fontsource-variable/figtree` and `@fontsource-variable/noto-sans` (`wght.css`, `font-display: swap`, 5.3.0), no Google Fonts request at runtime. The latin subset is fetched for Spanish text; `latin-ext` and other subsets are in the CSS but load only if a glyph from those ranges appears. Only upright styles are loaded; do not use `italic` or synthetic bold. Check the woff2 payload in QA (target: both families under about 110 KB).

Weights: display 500-600 (rounded forms look friendly at medium; 700 maximum), body 400, UI labels and buttons 500-600.

### Type scale

| Token (utility) | Value                          | Used for                                                  | Line height / tracking |
| --------------- | ------------------------------ | --------------------------------------------------------- | ---------------------- |
| `text-xs`       | 0.8125rem                      | Hours table notes, legal, sample-data note (minimum size) | 1.5                    |
| `text-sm`       | 0.9375rem                      | Nav links, tags, card meta                                | 1.5                    |
| `text-base`     | 1.0625rem (17 px)              | Body                                                      | 1.65                   |
| `text-lg`       | 1.25rem                        | Lead paragraphs                                           | 1.55                   |
| `text-xl`       | 1.5rem                         | Card titles, step titles (display font)                   | 1.25                   |
| `text-2xl`      | clamp(1.75rem, 3vw, 2.25rem)   | Sub-headings                                              | 1.15, -0.01em          |
| `text-3xl`      | clamp(2.125rem, 4.2vw, 3.5rem) | Section headings                                          | 1.1, -0.015em          |
| `text-4xl`      | clamp(2.5rem, 6.4vw, 5.25rem)  | Hero statement (left column of the split)                 | 1.04, -0.02em          |
| `text-fear`     | clamp(1.875rem, 4.2vw, 3.5rem) | The one big sentence "Si te da miedo ir al dentista..."   | 1.15, -0.015em         |
| `text-calm`     | clamp(1.75rem, 3.6vw, 3rem)    | "Respira. Vamos a tu ritmo." inside or beside the circle  | 1.15, -0.01em          |
| `text-wordmark` | clamp(3rem, 14vw, 18rem)       | Footer wordmark "Dental Azahar", full width, display font | 0.9, -0.03em, nowrap   |

At 1440 px these resolve to: hero 5.25 rem (84 px), fear 3.5 rem (56 px), calm 3 rem (48 px), wordmark 14 vw = 202 px. At 375 px: hero 2.5 rem, fear 1.875 rem, calm 1.75 rem, wordmark 3.28 rem (14 vw = 52 px). "Dental Azahar" is 13 characters at about 0.55 em each in Figtree semi-bold; at 14 vw that is roughly 100 vw, so the build step must measure the footer wordmark at 375/768/1440 and lower the factor (or use two lines) if it overflows.

## 6. Spacing, rhythm, radii

- Base unit `--spacing: 0.25rem` (4 px grid, Tailwind default).
- `--section-y: clamp(4.5rem, 11vw, 9rem)` is the vertical padding between sections (72 px mobile, 144 px max). A little tighter than a loud page: the feel is airy through the white space inside sections, not by huge gaps. Tight groups inside a section use 6-12 (1.5-3 rem), related text 3-4.
- `--gutter: clamp(1.25rem, 4vw, 3rem)` side padding (20 px at 375, 48 px max). Content width max 80 rem; text measure 60 ch for body, 16 ch for the hero statement.
- Radii: `radius-sm` 0.5 rem (inputs, tags), `radius-md` 1 rem (cards), `radius-lg` 1.75 rem (panels), `radius-frame` 2.5 rem (the large hero photo frame and the three-photo strip), `radius-pill` (buttons, header action, circle). No arch crops; photos use `rounded-frame` or `rounded-lg`.
- Shadows: none. Depth comes from the tint (`surface`) and hairlines (`line`).

## 7. Motion tokens

Consistent with the proposal's motion plan (hero reveal, scroll reveal, one pinned section, subtle parallax, the breathing circle, Lenis). All motion is off under `prefers-reduced-motion: reduce`; content is visible without JavaScript.

| Token                | Value                            | GSAP equivalent | Use                                                                                                              |
| -------------------- | -------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `--ease-out-soft`    | `cubic-bezier(0.16, 1, 0.3, 1)`  | `expo.out`      | Reveals, hero statement, anything that arrives                                                                   |
| `--ease-in-out-soft` | `cubic-bezier(0.65, 0, 0.35, 1)` | `power3.inOut`  | Pinned step change, header becoming solid, the breathing circle (`ease-in-out`)                                  |
| (none)               | `linear`                         | `none`          | Parallax: tied to scroll position, never eased                                                                   |
| `--duration-fast`    | 180 ms                           | 0.18 s          | Hover, press, focus                                                                                              |
| `--duration-base`    | 320 ms                           | 0.32 s          | Header solid on scroll, accordion open, small state changes                                                      |
| `--duration-reveal`  | 900 ms                           | 0.9 s           | `data-reveal` fade and rise (2 rem), stagger 80-120 ms                                                           |
| `--duration-slow`    | 1400 ms                          | 1.4 s           | Hero statement entrance, step photo cross-fade                                                                   |
| `--duration-breathe` | 8000 ms                          | 8 s (CSS)       | One full inhale and exhale of the calm circle: `scale` 1 to 1.12, `infinite alternate`-style, CSS keyframes only |

The breathing circle is a CSS animation on `transform: scale()` (and optionally `opacity` 0.85 to 1) using `--duration-breathe` and `--ease-in-out-soft`. It needs no JavaScript and is wrapped in `@media (prefers-reduced-motion: no-preference)`; under reduced motion the circle is static at scale 1. 8 s per cycle is intentionally slower than a typical UI loop so it reads as calm breathing (about 7-8 breaths a minute). Parallax: delta 5-15 percent on photos only, never on text; at most one pinned section (the first visit); `ScrollTrigger.refresh()` after fonts and images load.

## 8. Do / don't for the build step

Do:

- Reference tokens only (`bg-paper`, `text-ink`, `bg-surface`, `bg-primary text-primary-contrast`, `font-display`, `text-fear`, `rounded-frame`); no raw hex in components.
- Reserve `primary` for actions ("Pedir cita", "Cómo llegar", links, focus ring). Keep the focus outline (3 px `primary`, offset 3 px) visible everywhere.
- Use `accent` coral in very small doses (a dot, a short rule, the circle edge); one or two marks per screen at most.
- Use Figtree large only in the hero statement, the fear sentence, the calm circle, headings and the footer wordmark; everything else is Noto Sans.
- Keep body text at 17 px or more on mobile; `text-xs` is the floor.
- Give every photo explicit width and height, hero photo preloaded, others lazy.
- Keep a 44 px minimum touch height for buttons, nav links and accordion summaries.
- Check `text-wordmark` for horizontal overflow at 375/768/1440 and wrap it in `overflow-x: clip`.
- Write calm, plain copy: short sentences, no promises (no "indoloro", "garantizado"), no invented reviews or credentials, per the proposal.

Don't:

- Don't add a second accent color, and never use `accent` for text or buttons.
- Don't use `line` for text or input borders, or `ink-soft` below `text-sm` (15 px).
- Don't use the bakery's arch crop, Fraunces, brown/amber colors or a full-bleed hero photo (diversity rule).
- Don't use shadows, gradients, glassmorphism, emoji icons or medical clip-art (crosses, tooth cartoons, bright clinical blue).
- Don't load extra weights, italics, a third family or Google Fonts at runtime.
- Don't parallax text, pin more than one section, or leave any motion (including the breathing circle) on under reduced motion.
- Don't hard-code sizes for the big type; use the `clamp` tokens.

## 9. Landing meta

Machine-readable summary read by `scripts/check-landing.mjs` (tokens check and the diversity rule across sites). Keep it in sync with sections 4 and 5.

```landing-meta
primary: #0f6b68
display-font: Figtree
body-font: Noto Sans
hero: split
```
