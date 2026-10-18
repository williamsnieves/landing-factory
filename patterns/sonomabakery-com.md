---
url: 'https://sonomabakery.com/'
slug: 'sonomabakery-com'
date: '2026-10-18'
focus: 'quiet editorial tone, craft photography, generous whitespace'
libraries:
  - 'Next.js'
  - 'React'
---

# sonomabakery-com

> note: Recon reported a document scroller because the page drives scrolling with JavaScript (main element clipped, content moved by transform on wheel). Screens were captured by wheel-scrolling for this sheet; this gap is logged for a later recon change.

## Summary

An artisan sourdough bakery home page built like a calm editorial magazine spread: one huge macro photograph of the craft, then short statements and product rows separated by lots of air. Worth learning from for restraint and for how close-up texture photography alone carries the premium feel, with almost no decoration.

## Section map

1. Thin top bar: wordmark left, three text links and a menu icon to the right, a small pick-up link at the far right. Overlays the hero in light text.
2. Hero, one full viewport: full-bleed macro photo of crusts; a short two-line statement sits low in the right half with an inline underlined link.
3. Product row, about one viewport: small heading left, then three equal portrait product tiles, name and price as tiny captions under each.
4. Founder statement, about one viewport: warm tinted panel with a medium paragraph left and a small attribution at the bottom.
5. Process story, about one and a half viewports: asymmetric pairs of hands-at-work photos and short paragraphs, deliberately offset from each other.
6. Wide process photo, about one viewport, inset with side margins.
7. Heritage note, about half a viewport: one paragraph and a small text link, aligned to the right half.
8. Newsletter strip and land acknowledgement, about half a viewport, two columns.
9. Footer: four small link columns on a tinted background, followed by a full-width photo panel acting as the next-page teaser.

## Hero

Full-bleed photographic hero with a tight crop on texture, not on the product as a whole. The message is small for a hero (around 2.5 times body size) and anchored bottom-right, so the image does the talking. A soft blurred placeholder fades into the photo on load.

## Grid and spacing

- A 24-column grid inside a near full-width container (about 96 percent of a desktop viewport) with a 20 px gutter.
- Text blocks start on the right half of the grid while images span the left or full width: the asymmetry is the signature.
- Large vertical gaps between sections (roughly half a viewport); inside sections spacing is small and tight.
- On mobile everything collapses to one column with full-width images and the same generous section gaps.

## Typography

- One neutral grotesque sans for everything, in a single regular weight; hierarchy comes from size only.
- Scale ratio about 1.25; hero statement around 64 px on desktop, product captions very small (12 to 14 px).
- Headings use tight leading (1.05 to 1.25); body sits around 1.4 to 1.5.
- A few tiny monospaced-looking uppercase labels with wide tracking add an archival feel (dates, small tags).

## Palette

Warm and muted: a very light warm off-white page, a pale sand tint for feature panels, dark warm-grey text, and photography in deep browns and flour whites providing all the color. No accent color at all; links are underlined text.

## Density

Low. Around 250 words on the page, one idea per screen, more than half of each screen is image or empty space. Product information is reduced to name and price.

## Motion

| Moment                | Trigger | Type                                              | Technique / library                         | Confidence |
| --------------------- | ------- | ------------------------------------------------- | ------------------------------------------- | ---------- |
| Hero image            | load    | reveal (blurred placeholder to sharp photo)       | canvas placeholder then image swap, Next.js | medium     |
| Whole page            | scroll  | eased virtual scroll (content moved by transform) | custom JavaScript scroller in React         | medium     |
| Text and image blocks | scroll  | reveal (subtle rise into place)                   | transform tweened by the custom scroller    | low        |

## Libraries

- Next.js and React: framework globals and script names (high).
- Canvas 2D: canvas elements used for blurred image placeholders (high).
- No GSAP, Lenis or ScrollTrigger detected; the smooth scroll is a custom implementation (medium, inferred from a clipped main element moved by transform).

## What to take / what to avoid

Take: macro texture photography as the hero, small confident type, an asymmetric grid where text lives in the right half, product tiles reduced to name and price, a warm tinted panel for a founder or process statement.

Avoid: a fully custom virtual scroller (it breaks native scrolling, keyboard and accessibility expectations); use native scroll with an optional light smoothing layer instead. Avoid copying the archival label style too literally.
