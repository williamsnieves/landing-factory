---
url: 'https://stripe.com/'
slug: 'stripe-com'
date: '2026-10-28'
focus: 'premium and clear product-site craft: hero, product UI, grids, type, motion, CTAs'
libraries:
  - 'Next.js'
  - 'React'
  - 'WebGL'
  - 'Canvas 2D'
---

# stripe-com

<!--
Rules (enforced by `npm run validate:patterns`):
- Describe, never copy.
-->

## Summary

A long, light enterprise product page for a payments platform that mixes a showpiece generative hero, product screens shown as live UI cards, customer story carousels and one dark data section. It is worth learning from for how it keeps a very large product surface understandable: a framed page with edge rails, a repeated headline-plus-visual module, and a clear primary/secondary button pair.

## Section map

1. Mega-menu header, about 0.08 viewports: wordmark, four dropdown items and a plain link, an "assistant" entry with a sparkle icon, then a light outlined sign-in button and a filled primary contact button on the right. Collapses to a boxed menu icon on mobile.
2. Hero, about 0.8 viewports: live-counter eyebrow, a very large paragraph-length headline whose first sentence is dark and the rest muted blue-grey, two buttons, all sitting over a flowing ribbon of gradient colors.
3. Logo marquee strip, about 0.1 viewports, a single row of well-known brands in their own colors.
4. Solutions module, about 2.4 viewports: one two-tone headline, then large rounded product cards showing UI (a checkout form, a data table, charts) side by side on a faint tinted panel.
5. Small interlude with an AI prompt box, about 0.5 viewports: centered heading, a large text area with step hints and a send button.
6. Banner and a second statement, about 1 viewport.
7. Startup story section, about 1 viewport, and a large module of about 5 viewports containing a headline-plus-button pair, a horizontal carousel of four tall image cards with arrow buttons and a story link under each, followed by paired feature tiles.
8. Dark navy section, about 2.6 viewports: row of three big gradient-filled statistics with captions, a two-tone paragraph, and three equal tiles (a chat mock, an integration grid, a code editor with autocomplete).
9. Global-reach section with a canvas map, about 1.9 viewports, then a closing call to action and a large footer of dense link columns, about 1.2 viewports.

## Hero

Type over generative art. The headline is long, multi-line and sized like a paragraph, with the first sentence in the dark ink tone and the rest in a muted blue-grey, so there is a built-in hierarchy without changing size. A full-bleed WebGL canvas draws a flowing, striped ribbon of saturated gradient colors that sweeps in from the top right and crosses behind the text. A small live-updating number acts as the eyebrow. Two buttons: filled brand-color primary with an arrow, outlined secondary with a third-party sign-in icon. The page sits inside two faint vertical rails that mark the content frame.

## Grid and spacing

Content frame about 1230 px with visible 1 px vertical hairlines at the left and right edges, so the whole page feels like a document in a column. Mostly 2, 3 and 12 column layouts; headline left and supporting paragraph right is the standard section opener. Gaps of 8, 16, 32 and 64 px. Product cards have 8 to 12 px radii, hairline borders and a subtle shadow. Vertical rhythm is built from big modules rather than per-section padding.

## Typography

One humanist sans family at light weight (about 83 percent of text in the lightest weights), which gives an airy, expensive look. Display about 48 to 56 px with line-height near 1.1; section openers use the same two-tone trick at 26 to 32 px. Body 16 to 18 px. Very small 8 to 10 px type exists inside the product mock screens. Scale ratio about 1.17. Sentence case, no uppercase. Code snippets use a mono face inside the dark tile.

## Palette

Light theme: near-white page, very light cool-tinted panels for product areas, dark navy ink for headings and a muted slate for secondary text. One vivid indigo-violet brand color for primary buttons, links and focus; the hero ribbon and the statistic numbers introduce an orange-pink-violet gradient family. A deep navy section flips the page for the statistics and developer content. Contrast is high for headings and gentle for body.

## Density

High: about 1,800 words and many images over about 15 viewports. Each module still follows one idea: a two-tone headline, a short line, a button or link, and a rich product visual. Dense UI inside mocks is balanced by large empty headline areas. Text-to-media balance is about even, with media in rounded containers.

## Motion

| Moment               | Trigger    | Type        | Technique / library                                                                    | Confidence |
| -------------------- | ---------- | ----------- | -------------------------------------------------------------------------------------- | ---------- |
| Hero ribbon          | load, idle | shader/3D   | full-viewport WebGL canvas with continuous animation (about 13 fps sampled while idle) | high       |
| Live counter         | load, idle | text update | number ticks continuously in the eyebrow                                               | medium     |
| Hero content         | load       | reveal      | opacity and large translate on one element                                             | medium     |
| Product tiles, cards | scroll     | reveal      | many intersection observers (about 60) trigger entry states                            | medium     |
| Logo strip           | load, idle | marquee     | horizontal loop of brand marks                                                         | medium     |
| Story carousel       | click      | carousel    | arrow buttons scroll a horizontal card track                                           | medium     |
| Map canvas           | scroll     | canvas 2D   | animated points or arcs on a canvas near the end                                       | low        |
| Buttons, cards       | hover      | hover       | about 200 elements with transitions                                                    | low        |

## Libraries

Next.js and React (globals, high). WebGL (canvas context, high) for the hero ribbon and Canvas 2D (high) for a secondary canvas. Tag manager and several first-party analytics hosts are present. No GSAP, ScrollTrigger or Lenis detected, no pinned sections.

## What to take / what to avoid

Take: two-tone headline hierarchy (dark first sentence, muted continuation); a single saturated brand color for actions against a calm neutral page; product screens as rounded cards on tinted panels; hairline frame rails; one dark section with oversized gradient statistics for proof; a clear primary plus outlined secondary pair; a startup or customer carousel with a link under every card; an interactive input as a conversion device.
Avoid: a heavy full-screen WebGL hero without a static poster, a floating chat widget over content, very long pages with several carousels, 4 to 6 dropdown nav items on small screens, and copying the ribbon art, the live-counter gimmick or brand-colored logo wall.
