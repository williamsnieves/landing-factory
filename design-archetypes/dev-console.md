---
name: dev-console
summary: 'The developer-tool look for AI and software pages: monospaced metadata with key hints, a humanist sans for titles, a warm light ground with one accent, an index list as the hero and a generative dot field as the closing scene.'
signals:
  fits:
    [
      technical,
      product-showcase,
      editorial-content,
      few-assets,
      calm,
      educational,
    ]
  avoid: [heritage, playful, photo-rich, local-service]
impact: [quiet, balanced]
lends: [mono-meta-rows, generative-dot-field]
rejects: [overlap-collage, handwritten-accent, drop-cap, marquee-type]
hero: [typographic]
signature:
  sectionCount: [3, 8]
  cols1Share: [0.2, 0.7]
  cols2Share: [0.3, 0.8]
  splitRatio: [0.25, 0.45]
  fullBleedShare: [0, 0.3]
  imageRadius: [0, 8]
  buttonRadius: [0, 8]
  buttonShape: [rect]
  headingScale: [3, 8]
  headingAlign: [left]
  eyebrowShare: [0.3, 1]
  wordsPerScreen: [40, 160]
  mediaPerScreen: [0, 1]
  footerType: [columns, minimal]
  stickyCount: [1, 3]
---

# dev-console

The developer-tool look for AI and software pages: monospaced metadata with key hints, a humanist sans for titles, a warm light ground with one accent, an index list as the hero and a generative dot field as the closing scene. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

The content is the hero. The first screen is split asymmetrically: a fixed identity column on the left, about a third of the width, with the product name in a large monospaced setting and a two-line description; and on the right a long list of hairline-separated rows. Each row is one line: a mono date or number, a sans title and a mono detail pushed to the right edge. Above the list sit a row of category filters and, when the page has one, a featured row with a small tile in the accent colour. The identity column stays in place while the list scrolls. Further sections reuse the same two-column frame: a second list, a single demonstration or a short text block, then a footer with link columns. The page closes with a full-width scene of dots.

## Header and footer

Header: the mark on the left, three or four navigation items in small uppercase mono, and one solid dark action on the right. A bracketed letter before an item is shown only when that shortcut really works. Footer: the name and legal links on the left, short link columns with small mono labels, and optionally one underlined input for updates.

## Typography

Two families. A monospace for every piece of metadata: navigation, filters, dates, counts, tags, labels and the product name. A humanist sans for titles and reading text. Sizes are small and close together, around a 1.2 ratio, with a larger featured title and mono labels at the small end. Weight stays regular; hierarchy comes from size, the family switch and the grey level. Mono labels are uppercase and lightly tracked, titles are sentence case.

## Imagery

No photographs. One small original motif, such as a grid, a stepped shape or a pixel pattern drawn in SVG or CSS, serves as mark and as the only illustration, in the accent colour. The closing scene is a field of dots in loose clusters and arcs drawn on a canvas or in SVG, in a mid grey, standing in for a photo. Any interface picture is the customer's own or an abstract mock with no figures.

## Buttons and links

One solid near-black rectangular button with light text for the single action, with a small corner radius. Everything else is text: underlined links and mono controls such as "load more" and filter toggles. Hover and focus change colour or underline, never size.

## Motion

List rows and the description fade in one after another on load. The identity column is sticky. The dot scene drifts slowly while on screen and pauses off screen. Scrolling stays native, with no smooth-scroll library. With reduced motion rows appear at rest and the dots are drawn as a still image; without JavaScript the list and the identity column read in full.

## Lendable traits

- `mono-meta-rows`: List rows with a mono date or number on the left, a sans title and mono detail on the right edge, separated only by hairlines.
- `generative-dot-field`: A full-width field of dots in loose clusters and arcs, drawn in code, used as a quiet closing scene instead of a photo.

## Do

- Fill the list with real entries from the brief: releases, articles, features, cases or steps.
- Show key hints only when the shortcuts work, and plain labels otherwise.
- Draw the motif and the dot field in code, in colours already in the palette.
- Keep one accent colour on a warm near-white ground with high text contrast.
- Let the whitespace around the list stay wide even though each row is dense.

## Don't

- No page built on fewer than about eight real entries: pick another archetype instead.
- No mascot, icon set or pixel characters from another brand; the motif is the landing's own.
- No gradients, glows, glass or 3D.
- No invented dates, versions, counts or reading times.
- No bold weights as the main hierarchy and no decorative uppercase titles.
- No photo grids or stock imagery.
