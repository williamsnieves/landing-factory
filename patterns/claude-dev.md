---
url: 'https://claude.dev/'
slug: 'claude-dev'
date: '2026-11-11'
focus: 'current AI product site trend: restrained, type-led, product demos, generous whitespace'
libraries:
  - 'Next.js'
  - 'Lottie'
  - 'Canvas 2D'
---

# claude-dev

<!--
Rules (enforced by `npm run validate:patterns`):
- Describe, never copy.
-->

## Summary

A developer blog and resource index for an AI product, styled like a calm terminal: a warm off-white page, a monospaced label system that reads like keyboard shortcuts, one humanist sans for titles and reading text, and small pixel-art icons and a pixel mascot as the only illustration. It is worth learning from because it looks unmistakably "AI and developer" without any of the usual gradients, glows or 3D: the character comes from typesetting conventions of tools (mono metadata, bracketed key hints, list rows like a file listing) and one playful pixel motif, with a lot of air around a single list.

## Section map

1. Header (about 0.1 viewport): pixel mascot mark on the left, four navigation items set in small uppercase mono, each prefixed with a bracketed single-letter shortcut, and one solid dark button on the right.
2. Index (about 1.8 viewports): an asymmetric two-column layout. The left column holds the site name in a large mono setting and a two-line description, and stays fixed while the list scrolls. The right column holds a row of mono category filters with a bracketed search hint at its far end, one featured row (a square pixel-icon tile in the accent colour, two small tags, a large sans title, a byline) and then a long list of hairline-separated rows: tiny pixel icon, mono date, sans title, mono reading time pushed to the right edge.
3. List footer row: a mono "load more" control and a keyboard hint on the right.
4. Video block (about 1 viewport): a list of video titles with mono date and duration on the left half, and a large player on the right half with a minimal mono control strip under it; the pixel mascot perches on the player's top edge.
5. Footer (about 0.3 viewport): site name, company wordmark and legal links on the left; two short link columns with small mono uppercase labels; a newsletter column with one underlined input, an arrow submit and a short consent paragraph.
6. Closing scene (about 1 viewport): a full-width field of grey dots forming loose clusters and arcs, with the pixel mascot floating in the middle, drawn on a canvas.

## Hero

Type-only and asymmetric: there is no hero image. The first screen is the site name in a large monospaced face on the left and the index list already starting on the right, so the content itself is the hero. On load the list rows and the description fade in from transparent, row after row. On phones the hero collapses to name, description and a shortened filter row.

## Grid and spacing

A wide 12-column frame with an 8-column inner grid for the list area. The left column takes roughly a third, the list two thirds; the most common content width is about 900 px inside a frame of about 1350 px. List rows are separated only by hairline rules with generous internal padding (around 30 px above and below each row). Spacing values cluster on a 4 px base (4, 8, 12, 16, 24, 28, 36). The grid is broken only twice: the mascot overlapping the video player's edge, and the full-bleed dot scene at the end.

## Typography

Two families: a monospace for every piece of metadata (navigation, filters, dates, durations, tags, labels, keyboard hints, the site name) and a humanist sans for titles and reading text. Sizes stay small and close together (ratio about 1.2): body around 18 px, list titles around 18 px, the featured title around 34 px, mono labels around 11 to 14 px. Almost everything is regular weight; hierarchy comes from size, family switch and grey level, not bold. Mono labels are uppercase and lightly tracked; titles are sentence case with ordinary tracking. Bracketed single letters before navigation items imply keyboard shortcuts.

## Palette

Light theme on a warm near-white ground. Text runs through three or four neutral greys from very dark to mid, with mid grey for secondary metadata. One warm, saturated earth accent appears only in the pixel mascot and the featured icon tile. The single filled button is near-black with white text. No gradients. Body contrast is high.

## Density

Low per element but high in information: the index shows a dozen titles in one screen because each row is a single line of text, while the whitespace around the list stays wide. Text dominates; media is limited to tiny icons, one tile, one video and the closing canvas. Each section carries one idea.

## Motion

| Moment                     | Trigger | Type                                                 | Technique / library                                       | Confidence |
| -------------------------- | ------- | ---------------------------------------------------- | --------------------------------------------------------- | ---------- |
| List rows and description  | load    | reveal (fade from transparent, staggered)            | CSS animation or observer-driven class, no scroll library | medium     |
| Left column with site name | scroll  | pin (stays in place while the list scrolls)          | sticky or fixed positioning                               | high       |
| Pixel icons and mascot     | load    | sprite-like idle animation                           | Lottie animations                                         | medium     |
| Closing dot field          | load    | shader-like generative scene (drifting dot clusters) | Canvas 2D drawing loop                                    | high       |
| Rows, links and filters    | hover   | colour and underline transitions                     | CSS transitions on many elements                          | low        |

No smooth-scroll library and no scroll-linked timelines; scrolling is native. Reduced-motion rules exist.

## Libraries

- Next.js: framework global, high.
- Lottie: global and script name, high (small looping illustrations).
- Canvas 2D: a 2D drawing context on a full-width canvas, high (the closing dot scene).

## What to take / what to avoid

Take: the "tool-like" typesetting system for a technical or AI product (mono metadata, sans titles, bracketed key hints as decoration and as real shortcuts), an index or changelog list as the hero instead of a big image, hairline row separators with metadata pushed to both edges, a fixed left column holding the identity while content scrolls, one tiny pixel or grid motif as the only illustration, and a generative dot field as a quiet closing scene that replaces a photo.

Avoid: the mascot itself and the pixel icon set (they are the brand's own characters; any landing needs its own motif), the exact shortcut-letter navigation unless the shortcuts really work, and relying on a long list when the landing has few items: the pattern needs enough real entries (articles, releases, features, cases) to read as an index.
