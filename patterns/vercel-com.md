---
url: 'https://vercel.com/'
slug: 'vercel-com'
date: '2026-10-28'
focus: 'premium and clear product-site craft: hero, product UI, grids, type, motion, CTAs'
libraries:
  - 'Next.js'
  - 'Canvas 2D'
---

# vercel-com

<!--
Rules (enforced by `npm run validate:patterns`):
- Describe, never copy.
-->

## Summary

A very restrained light page for a developer platform: one centered glowing geometric object, a big type-only headline, three short value lines and then a handful of sections that each pair a bold headline with a customer proof line and a plain feature list. It is worth learning from for how little it uses: almost no color, almost no copy (about 120 words in the measured document) and a very strict grid.

## Section map

1. Header, about 0.07 viewports: mark only on the left, two dropdown links and two plain links, then three buttons on the right (outlined demo, outlined login, solid dark sign up). Full-width, 24 px side margin.
2. Hero, about 0.9 viewports: headline left, a centered object with a soft glow, three short lines right; two buttons under the headline (solid dark pill, outlined pill); a full-width row of customer marks across the bottom.
3. Feature section one, about 1 viewport: headline top-left, a wide product visual, then a customer proof line with a small feature list in the right column.
4. Feature section two, about 1 viewport: same module mirrored, headline and visual on the right, proof line and feature list on the left.
5. Further feature modules, about 0.5 to 0.9 viewports each, repeating the alternation with a different visual.
6. Large footer, about 0.9 viewports, on a dark panel with many link columns.

## Hero

Type left, object centre, three lines right: a three-part composition built on a 12-column grid. The centre object is a solid black triangle with a soft white halo and drop shadow, drawn on a 2D canvas, the only graphic. The headline is two lines at large size in a medium weight with tight tracking. Two pill buttons form the hierarchy: filled dark primary and outlined secondary. A customer logo row spans the full width at the bottom of the first screen, so social proof is above the fold. On mobile everything stacks centered: object, headline, one mono line, two full-width buttons, then the marks.

## Grid and spacing

Almost full-width layout: content about 1390 px at 1440 with just 24 px side margin and a strict 12-column grid; blocks occupy named column ranges (left, centre, right) and then alternate sides section by section. Spacing is built on a 4 px base unit; small gaps (2 to 6 px) inside lists, 40 to 44 px between groups, and very large empty areas between modules. Images bleed to column edges with no card chrome.

## Typography

One neutral grotesque sans for everything, with a mono variant for small labels on mobile (about 1 percent of text). Display 56 to 64 px, line-height 1.0, tight tracking; sub-headings 24 px in a two-tone treatment (dark clause then grey continuation); UI and list text 14 px. Scale ratio about 1.18 with big jumps between 24 and 56. Weights 400 to 500 only, so the page looks light even at large sizes. No uppercase.

## Palette

Near-white neutral background, near-black ink, mid-grey secondary text, borders barely darker than the page. A single cool-blue accent appears in tiny details. A very dark neutral is used for the footer and for the primary button, giving a strong black-on-white button hierarchy. Light theme with a 8:1 body contrast and no gradients except the halo around the hero object.

## Density

Very low: about 0.3 ideas per screen and under 150 words on the whole page before the footer. Whitespace share is large, around 70 percent of every screen. Each module is a headline, an image, a proof line and four feature names. Media carries nearly all of the explanation; the text only labels.

## Motion

| Moment            | Trigger | Type   | Technique / library                                     | Confidence |
| ----------------- | ------- | ------ | ------------------------------------------------------- | ---------- |
| Hero object glow  | load    | canvas | 2D canvas draws and animates the halo and shadow        | medium     |
| Feature visuals   | scroll  | reveal | intersection observers (about 9) swap visuals into view | low        |
| Header            | scroll  | sticky | sticky header with a hairline appearing after the hero  | high       |
| Buttons and links | hover   | hover  | about 130 elements with short transitions               | low        |

No pinning, scrubbing, parallax or eased wheel scroll was measured; reduced-motion rules exist.

## Libraries

Next.js (global, high). Canvas 2D (context, high) for the hero object. Error-tracking and first-party blob hosting for images. No GSAP, ScrollTrigger, Lenis or WebGL detected. In the recon run the product visuals were lazy-loaded and did not appear, so the sheet describes their placement, not their content.

## What to take / what to avoid

Take: a three-zone hero (headline, centred object, short value lines); black pill primary with outlined pill secondary; customer marks on the first screen; alternating left/right modules that keep a headline, a visual, a proof line and a short feature list; extreme whitespace and few words; a 4 px base unit with huge gaps between modules; a dark footer as the only dark block.
Avoid: a product explained only by images that load lazily (empty states look broken), a hero object that is the brand mark itself, the use of customer-specific proof lines as a template, side margins as small as 24 px on very wide screens, and copying the triangle-and-glow idea.
