---
url: 'https://www.framer.com/'
slug: 'framer-com'
date: '2026-10-28'
focus: 'premium and clear product-site craft: hero, product UI, grids, type, motion, CTAs'
libraries:
  - 'Framer'
---

# framer-com

<!--
Rules (enforced by `npm run validate:patterns`):
- Describe, never copy.
-->

## Summary

A dark, media-heavy product page for a site builder, where the product is shown as animated UI inside large rounded frames, followed by a sticky split section that scrolls feature stories next to a fixed agent panel and a showcase mosaic of customer sites. It is worth learning from for how it makes a complex tool feel tangible: video-like product demos, glow effects around inputs, and a variety of tile sizes that echo what users can build.

## Section map

1. Header, about 0.07 viewports: mark with wordmark, four dropdown or plain links, then a muted login link and a white pill sign-up button on the right; 120 px side margin, content 1200 px wide.
2. Hero, about 1.1 viewports: left-aligned large headline, a muted subline, a white primary button and a dark secondary button with a download icon, a "new" link aligned right on the button row, then a large rounded dark frame holding a looping product demo with a bright blue glow around the prompt field. A duration chip sits on the video on mobile.
3. Logo strip, about 0.4 viewports, a single scrolling row of customer marks.
4. Showcase of mixed visuals, about 1.5 viewports, a collage of rounded media tiles in different sizes.
5. Sticky agent section, about 3.5 viewports: on the left, a stack of rounded feature panels (a CMS table, a generative component preview, others) each with a title, a muted description and a link; on the right, a single chat-and-code panel that stays in place while the left stories scroll past and its content changes.
6. Feature and community sections, about 2 viewports: many short headings with image tiles and small cards.
7. Large single statement band, about 1.4 viewports.
8. Mosaic of customer sites, about 0.9 viewports: rows of rounded tiles of different widths (portrait, wide, tall) showing complete sites, cropped at the container edge on both sides.
9. Closing section, about 1.4 viewports, with videos and a final call to action, then a footer of link columns, about 0.7 viewports.

## Hero

Type above a product demo. The headline is two lines, bold white, tight tracking, placed top-left; below it a muted sentence and the button pair. The visual is a wide dark frame with a hairline border and rounded corners, filled with a video of the product (an input box that lights up with a saturated blue edge and halo). Nothing else moves on load except a gentle fade and about 20 px rise of the first three text elements; the demo plays inline.

## Grid and spacing

Content width about 1200 px centred with 120 px margins at 1440; flex-based layout rather than strict grids (about 1,400 flex containers against four grids). Gaps of 10 and 15 px dominate, with 100 to 120 px vertical padding on major sections. Cards and frames use large radii (about 24 to 32 px) with hairline borders; tiles in the mosaic share a fixed row height and vary in width, with row ends cropped at the edge. The pinned section uses a 2-column asymmetry, about 70 percent stories and 30 percent fixed panel.

## Typography

Neutral geometric sans, heavy use of weights 400 and 500 with a few 600 and 700. Display 54 px on desktop (about 36 px on 375), section headlines about 44 px, descriptions 18 px, UI text in the mocks 12 to 15 px. Tight tracking on every heading, line-height around 1.1. Scale ratio about 1.18. Some customer tiles carry their own display type (serif, rounded, condensed), which adds visual variety within the neutral shell. A mono face appears in the code panel only.

## Palette

Pure near-black background with a second very dark neutral for cards, near-white headings, mid-grey secondary copy. The only chromatic accent is a saturated electric blue used as glow, input outline and highlight; the tiles bring in the customers' own varied colors, giving the page a rich color field inside a monochrome frame. Primary button is white on black. Contrast high; secondary text kept dim.

## Density

Medium to high: about 11 viewports with a dozen distinct ideas, many images and videos (50 plus per large section), yet each screen keeps a single focal object. Text-to-media balance leans to media; copy is short and always paired with a visual. Whitespace is moderate inside frames but generous around the hero.

## Motion

| Moment                  | Trigger | Type         | Technique / library                                                                                       | Confidence |
| ----------------------- | ------- | ------------ | --------------------------------------------------------------------------------------------------------- | ---------- |
| Hero text               | load    | reveal       | fade and about 20 px rise on three elements                                                               | medium     |
| Hero demo               | load    | video        | looping inline video with glow animated inside the media                                                  | medium     |
| Sticky agent section    | scroll  | pin + scrub  | position-sticky panel holds for about two scroll steps while stories scroll and the panel content changes | high       |
| Feature tiles and cards | scroll  | scrub        | seven elements tied to scroll inside the pinned areas                                                     | medium     |
| Logo strip, mosaic rows | load    | marquee      | continuous horizontal movement of rows (high idle frame rate, about 48 fps)                               | medium     |
| Wheel scrolling         | scroll  | eased scroll | eased wheel response without a known smooth-scroll class                                                  | low        |
| Buttons and tiles       | hover   | hover        | not measured by recon; likely scale or glow on tiles                                                      | low        |

## Libraries

The site is built with its own platform (about a thousand platform name attributes in the DOM and requests to the platform's domain, medium confidence). No GSAP, ScrollTrigger, Lenis, WebGL or canvas detected; sticky positioning handles the pinned section and video handles the demos. No reduced-motion rules were found in the stylesheet.

## What to take / what to avoid

Take: a hero that is headline plus a large framed product video with one glowing focal point; white pill primary and dark secondary button; sticky split section where a fixed panel explains while stories scroll (CSS sticky, no scroll library); mosaic rows of mixed tile sizes cropped at the edges as a "what you can build" proof; a logo strip right under the hero; rounded hairline frames to unify very different media.
Avoid: autoplaying heavy video on mobile without a poster, motion without reduced-motion handling, a page this long with a dozen ideas, reproducing the glowing prompt box or the specific demo visuals, and showing customers' real sites or logos without permission.
