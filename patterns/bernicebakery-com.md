---
url: 'https://bernicebakery.com/'
slug: 'bernicebakery-com'
date: '2026-10-18'
focus: 'playful bold type, scroll-driven motion, product cards'
libraries:
  - 'GSAP'
  - 'ScrollTrigger'
  - 'Lenis'
---

# bernicebakery-com

## Summary

A cookie and cake bakery home page with a loud, playful identity: heavy condensed display type, saturated contrasting colors, hand-drawn sticker illustrations, and lots of scroll-linked motion. Worth learning from for personality and motion craft, and for blending a shop (product cards with quantity and add to cart) into a brand page.

## Section map

1. Header, thin: wordmark left, six uppercase links centered, cart and search icons right.
2. Hero, one full viewport: full-bleed overhead photo of baked goods, a huge two-line uppercase display headline bottom-left, a round sticker-like badge rotating at the right.
3. Manifesto, about half a viewport: large uppercase statement left in the accent color, short paragraph right, a small illustrated sticker.
4. Bestsellers, about one and a half viewports: a giant outlined word scrolls sideways behind arch-shaped product cards (photo, name, size, price, quantity stepper, pill add-to-cart button).
5. Image strip, about one viewport: a row of photos cropped into arches and circles, mixing product and people.
6. Product catalog, about two viewports: pill tabs to switch category, then a three-column grid of product cards, a slider with arrows and a view-all link.
7. Reviews, about one viewport: horizontal carousel of rounded cards alternating dark and colored backgrounds, quote glyph, short review and a press-style signature.
8. Cake feature, about one viewport: circular text wrapped around an arch-cropped cake photo with a round order badge.
9. Newsletter card, about half a viewport: rounded colored card with heading, short line, pill input and button, floating sticker illustrations.
10. Footer: colored background, address and links in columns, newsletter form, then the wordmark set enormous across the full width.

## Hero

Full-bleed photographic hero (overhead spread of cakes and cookies) with a very large heavy uppercase headline in white over the lower left, and a circular badge with curved text that rotates slowly. Elements rise into place on load.

## Grid and spacing

- Narrow text measure (about 520 px for paragraphs) inside a wide container; product grids use three columns on desktop and one on mobile.
- Spacing is mostly multiples of 8 with 16 and 32 dominant.
- The grid is broken on purpose: giant words overflow the viewport and scroll sideways, arch and circle crops overlap section edges, stickers float over borders.

## Typography

- Two families: a heavy condensed display sans in uppercase for headlines and the giant marquee words, a neutral sans for body and UI.
- Very wide scale: body 16 px, headings jump through 32, 41, 67, 80, 96 and up to about 128 px.
- Display type uses tight leading and slight negative tracking; outlined (stroke-only) versions of the display face appear behind content.
- Uppercase is common (about 16 percent of text), including buttons and labels.

## Palette

High contrast and playful: a very light warm off-white page, a mid-dark saturated cool blue as the brand color (panels, footer, headings), a very dark cool near-black for alternate cards, and a light vivid pink for buttons, badges and highlights. Body contrast is very high.

## Density

Medium. Large blocks of product data (around 1250 words in total, mostly product names and prices), but each screen is organized around one bold idea with big type and clear whitespace.

## Motion

| Moment                          | Trigger | Type                                       | Technique / library           | Confidence |
| ------------------------------- | ------- | ------------------------------------------ | ----------------------------- | ---------- |
| Hero headline and badge         | load    | reveal (rise into place) and slow rotation | GSAP timeline, CSS rotation   | high       |
| Giant outlined words            | scroll  | scrub (horizontal travel with scroll)      | ScrollTrigger scrubbed tweens | high       |
| Photo strips and arch crops     | scroll  | parallax (speed ratio about 0.9 to 1.4)    | ScrollTrigger                 | high       |
| Product cards and text blocks   | scroll  | reveal (fade and rise about 40 px)         | ScrollTrigger                 | high       |
| Whole page                      | scroll  | eased smooth scroll                        | Lenis                         | high       |
| Review cards and product slider | click   | horizontal carousel                        | custom slider                 | medium     |

## Libraries

- GSAP and ScrollTrigger: globals plus script names loaded from a public CDN (high).
- Lenis: html class and global (high).
- Canvas 2D: canvas elements present (high), purpose unclear.
- Shopify storefront: network domains only (low).

## What to take / what to avoid

Take: one bold display face used big and in uppercase, a single saturated brand color plus one playful highlight color, arch and circle photo crops, a scroll-scrubbed giant word behind a product row (one per page), rounded review cards in a carousel, the wordmark set huge in the footer, sticker-like illustrations as accents (drawn originally).

Avoid: stacking too many effects per screen, a commerce flow (cart, quantity) since our landing has no shop, heavy reliance on third-party CDN scripts, and copying the specific sticker illustrations or color pairing.
