---
url: 'https://blackstarbakery.com/'
slug: 'blackstarbakery-com'
date: '2026-10-18'
focus: 'bakery-cafe warmth, real photography, clear order and visit paths'
libraries:
  - 'jQuery'
  - 'Swiper'
---

# blackstarbakery-com

## Summary

A multi-location bakery and cafe home page built as a conventional, photo-heavy business site: full-bleed interior hero, story, locations, catering, social grid. Worth learning from for its practical structure (how a bakery answers where, what and how to order) more than for its visual craft.

## Section map

1. Top navigation over the hero: script-like wordmark left, five uppercase links, one pill-shaped order button in the accent color.
2. Hero, one full viewport: full-bleed photo of a busy shop interior, a small uppercase eyebrow, a two-line headline, one sentence and a small pill button, all bottom-left.
3. Delivery strip, about half a viewport: three tiles, the middle one dark with a row of delivery-platform pill buttons, side tiles are food and drink photos.
4. Story, about one viewport: tall portrait photo left, eyebrow plus heading, three paragraphs and a short values list right.
5. Locations, about one viewport: eyebrow and heading, then cards with a storefront photo, name, address, phone and a small dark button; a slider shows more cards.
6. Testimonials, about half a viewport: two photos and a quote card with large quotation glyph.
7. Catering, about one viewport: full-bleed photo with dark overlay, centered heading and a four-field form.
8. Social grid, about one and a half viewports: heading and handle pill, then a three-column grid of overhead food photos.
9. Footer: black background, centered wordmark, social icons and two contact lines.

## Hero

Full-bleed interior photograph showing people and counters, darkened for legibility. Text block bottom-left: tiny tracked uppercase eyebrow, a two-line headline around 65 px, one sentence and a small button. No motion on load beyond a soft fade.

## Grid and spacing

- Centered container about 1300 px wide with 20 px gutters; three-column card rows; occasional full-bleed photo bands.
- Spacing values are irregular (5, 10, 15, 20, 30 px), not an 8 px system.
- Sections are separated by modest gaps; photo tiles often butt against each other with no gap.

## Typography

- One neutral sans for headings and body, weights 400 to 600.
- Flat scale (ratio about 1.1) except for the hero headline, which jumps to roughly four times body size.
- Small uppercase eyebrows with wide tracking above each section heading (about 16 percent of text is uppercase).
- Body copy is small and light grey, which hurts readability.

## Palette

Light and neutral: white and very light grey backgrounds, near-black for the footer and the delivery tile, near-white text over photos, and one warm vivid accent (a coral red) reserved for the main order button. Photography supplies most of the warmth.

## Density

Medium to high. Few words overall (about 75 visible at load), but many photos per screen (up to nine), so screens feel busy. Each section carries one job.

## Motion

| Moment              | Trigger | Type                                  | Technique / library                      | Confidence |
| ------------------- | ------- | ------------------------------------- | ---------------------------------------- | ---------- |
| Most section blocks | scroll  | reveal (fade in from partial opacity) | class-toggled CSS transitions via jQuery | high       |
| Location cards      | click   | horizontal slider                     | Swiper                                   | high       |

## Libraries

- jQuery: global and script name (high).
- Swiper: DOM classes and script name (high).
- Embedded video player script from a video platform (low, network domain only).

## What to take / what to avoid

Take: the practical information architecture for a bakery (hero, how to order, story, locations with address and hours, catering, social proof), the single accent color reserved for the main action, real interior photography to signal a place people visit.

Avoid: small light-grey body text, irregular spacing, photo grids that crowd every screen, delivery-platform logos as decoration, and a generic business-template look.
