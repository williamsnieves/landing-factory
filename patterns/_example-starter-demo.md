---
url: http://localhost:4321/
slug: starter-demo
date: 2026-10-17
focus: how a small page combines reveal, pin and parallax with smooth scroll
libraries:
  - GSAP
  - ScrollTrigger
  - Lenis
---

# starter-demo

> note: This is a worked example. It describes this repo's own starter demo (built from `dist/` and served locally), so it contains no third-party content. Use it as a model for the level of abstraction expected in a sheet.

## Summary

A short single-page landing built as a showcase for three scroll primitives. It is calm and typographic: one big serif headline, a handful of sections, and motion that is always tied to content arriving or to one deliberate pinned moment. Worth learning from for restraint: each effect appears once and each has a clear job.

## Section map

1. Hero, about one viewport tall: eyebrow label, very large headline, short paragraph, one pill button. A soft blurred shape sits off to the top right.
2. Feature grid, a bit under one viewport: section heading, then three equal cards in one row on desktop, stacked on mobile.
3. Pinned statement, about two viewports of scroll for one screen of content: dark full-bleed panel with a centered heading and a short line of text.
4. Parallax band, about 0.6 viewport: gradient panel with a drifting inner layer and one centered line.

No navigation bar and no footer: the page is a demo, not a site.

## Hero

Type-led hero with no photo or video. Left-aligned stack (label, headline, paragraph, call to action) inside a wide container, with a large soft blob as the only decoration. On load the four items fade up in sequence with a small stagger.

## Grid and spacing

- One centered container about 1150 px wide at desktop, full width with side padding on mobile.
- Feature cards use a three-column grid with a 24 px gap that collapses to one column on small screens.
- Spacing sits on an 8 px base (most values are multiples of 8, with 24 and 32 dominant inside components).
- Vertical rhythm between sections is generous: roughly 144 px of padding above and below on desktop, less on mobile.

## Typography

- Two classes only: a serif display for headings and a neutral sans for body and labels, both system-friendly stacks.
- Scale ratio around 1.4 between steps; the hero headline is more than six times the body size at desktop and shrinks fluidly on small screens.
- Headlines have tight leading (close to 1) and slightly negative tracking; body copy runs at about 1.5 to 1.6 line height.
- Mostly regular weight; the only uppercase text is the small tracked label above the headline.

## Palette

Warm, light and quiet: an off-white warm background, near-black warm text, one saturated warm accent (burnt orange) for the button, label and card numerals, and a pale sand tint for the blob. The pinned panel flips to a very dark neutral with near-white text for contrast. Body text contrast is comfortably above the accessibility minimum.

## Density

Low. Roughly 120 words on the whole page, one idea per section, about 60 percent whitespace. Text carries the page; there are no photographs and no icons.

## Motion

| Moment                 | Trigger | Type                                 | Technique / library                    | Confidence |
| ---------------------- | ------- | ------------------------------------ | -------------------------------------- | ---------- |
| Hero items on load     | load    | reveal (fade and rise, staggered)    | tweened opacity and translate, GSAP    | high       |
| Feature cards          | scroll  | reveal (fade and rise)               | scroll-triggered tweens, ScrollTrigger | high       |
| Statement panel        | scroll  | pin (about one extra viewport)       | pin wrapper, ScrollTrigger             | high       |
| Gradient layer in band | scroll  | parallax (about 0.8 of scroll speed) | scroll-linked transform, ScrollTrigger | medium     |
| Whole page             | scroll  | eased smooth scroll                  | Lenis, html class and instance present | high       |

## Libraries

- Lenis: html class and an instance on the page (high).
- ScrollTrigger: pin wrapper element present in the DOM and a matching script chunk name (high).
- GSAP: bundled into one script chunk, so only the file name matches (medium); the behavior above confirms it.
- No canvas, WebGL or view transitions.

## What to take / what to avoid

Take: one pinned moment per page, reveals that stagger by a fraction of a second, parallax kept subtle, and smooth scroll that is switched off for reduced-motion users. Take the restraint on density too.

Avoid: relying on a single bundled chunk for detection when a library must be identified with certainty; a pin without a clear payload inside it would just feel like lag.
