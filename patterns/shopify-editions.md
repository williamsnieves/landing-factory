---
url: 'https://www.shopify.com/editions/fall2026'
slug: 'shopify-editions'
date: '2026-11-11'
focus: 'creative editorial release page: chapters, a network diagram, colour field per chapter'
libraries:
  - 'Lenis'
  - 'Canvas 2D'
---

# shopify-editions

<!--
Rules (enforced by `npm run validate:patterns`):
- Describe, never copy.
-->

## Summary

A very long seasonal release page (about fifty viewports) that presents a large number of product updates as one continuous editorial piece divided into eleven chapters. It is worth learning from because it turns an overwhelming list into a navigable object: a generative network diagram maps the chapters as glowing hubs with thin spokes, a fixed chapter index on the left tracks the reader with a live dot and a drawn line, and every chapter takes over the whole screen with its own saturated colour field. Most content is short bulleted notes in tidy columns, so the spectacle comes from structure, colour and one diagram, not from heavy media.

## Section map

1. Fixed top bar (about 0.06 viewport): product mark and edition label, two text menus, a text link and one white pill button.
2. Opening screen (about 1 viewport, sticky): a single giant word set vertically, rotated up the left edge and filling the full height, with a tiny mono tagline beside it; a narrow column of stacked panels (a mono numbered table of contents, then three tiles each pairing a mono figure statement with an illustration or animated particle graphic); and a large dark panel with the network diagram: eleven labelled hubs with counts, each radiating thin lines to small thumbnail squares.
3. Chapters (about 48 viewports in one long flow): each chapter opens with a large title on a full-screen colour field, then alternates two modules: wide feature cards (a framed box with a short heading, a two-sentence description, a small dark pill link on the left and a product interface screenshot bleeding off the right edge) and grids of four short bulleted notes per row separated by hairline rules. The diagram's spokes continue faintly behind the content of every chapter, recoloured to the chapter's field.
4. Footer (about 0.15 viewport): small links and legal text.

## Hero

An index-as-hero: the first screen is a map of everything on the page. The giant rotated word gives scale and edition identity, the numbered list and the hub diagram show the eleven chapters at once, and the diagram doubles as navigation. On phones the word turns horizontal across the top with the tagline under it, and the diagram fills a tall dark panel below, its hubs rearranged into two loose columns. The diagram animates idly (hubs pulse, spokes shimmer) once loaded.

## Grid and spacing

A 16-column frame almost the full viewport wide (about 1390 px at 1440), with 14-column sub-grids inside chapters. A fixed left rail of about 130 px holds the chapter index; content starts after it and keeps a wide right margin. Gaps sit on an 8 px base (8, 16, 24, 48). Notes grids use four equal columns with hairline rules between rows; feature cards span most of the content width. The grid is deliberately broken by the rotated hero word, the diagram that runs behind everything, and screenshots that bleed out of their cards.

## Typography

A neutral grotesque for headings and body and a monospace for every index, label, count and figure statement. Body text is small (about 14 to 18 px) and medium weight; chapter titles jump to about 120 px with nothing in between, a deliberate two-level scale (small reading text and huge display) rather than a smooth ratio. The opening word is the largest element, rotated ninety degrees. Sentence case everywhere, ordinary tracking, tight line heights (1.2 to 1.35). Inline links are underlined.

## Palette

Each chapter owns one saturated, mid-dark field colour: a deep electric blue, a rust orange, a violet, near-black and others; text is near-white on all of them. The diagram panel is a very dark, cool near-black with hubs and spokes in a lighter tint of the current field colour plus a vivid green highlight for selected spokes. Feature cards are a slightly lighter or darker tint of the field with a hairline border. One white pill button. Several gradient elements appear inside illustrations.

## Density

Very high in total and moderate per screen: a chapter screen typically holds either one feature card or eight short notes in two rows of four, with large empty field around them. Text dominates (several thousand words), broken by one product screenshot per feature card and small thumbnails in the diagram. Each chapter screen carries one idea or one group of notes.

## Motion

| Moment                  | Trigger | Type                                                                                        | Technique / library                           | Confidence |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------- |
| Whole page              | scroll  | eased smooth scroll                                                                         | Lenis                                         | high       |
| Network diagram         | load    | shader-like generative scene (pulsing hubs, shimmering lines)                               | Canvas 2D drawing loop                        | high       |
| Diagram behind chapters | scroll  | parallax (background layer held while content moves)                                        | fixed canvas layer recoloured per chapter     | medium     |
| Chapter colour field    | scroll  | scrub (field colour changes as each chapter enters)                                         | CSS scroll-driven timelines and observers     | medium     |
| Chapter index rail      | scroll  | pin with active state (dot fills, a thin line is drawn from the active item to the content) | fixed positioning, observers and a drawn line | medium     |
| Opening screen          | scroll  | pin (sticky opening panel while the first chapter slides over)                              | sticky positioning                            | medium     |
| Tiles, cards and links  | hover   | colour and underline transitions                                                            | CSS transitions on many elements              | low        |

Many CSS animations and observers run at once; no reduced-motion rules were detected, which a landing of ours must not copy.

## Libraries

- Lenis: global instance and class on the root element, high.
- Canvas 2D: several 2D canvases including one full-viewport layer, high (diagram and particle tiles).
- Shopify platform: network requests only, low.

## What to take / what to avoid

Take: a page that maps itself in the first screen (an index or diagram of all chapters that is also navigation), a giant rotated display word as the edition or brand mark, chapters that each take over the screen with their own saturated colour field, a fixed chapter rail with a live indicator, the two-level type scale (huge chapter titles, small dense notes), feature cards with a screenshot bleeding off one edge, and a generative network or constellation drawn in code that keeps running faintly behind the content as a connecting thread.

Avoid: the length (fifty viewports is a release archive, not a landing; a landing should keep four to six chapters), the platform's own diagram labels and screenshots, smooth scrolling and colour scrubbing without a reduced-motion path, white text on mid-saturated fields without checking contrast (several fields sit close to the 4.5:1 limit), and running several canvases at once on phones.
