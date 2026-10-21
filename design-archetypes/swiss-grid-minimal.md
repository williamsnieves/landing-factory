---
name: swiss-grid-minimal
summary: 'A strict twelve-column grid, flush-left text, small type contrast, no rounded corners and a lot of white. Order and restraint carry the page.'
signals:
  fits: [premium, serious, calm, technical, editorial-content, educational]
  avoid: [playful, bold, experimental]
lends: [flush-left-axis, split-sticky]
rejects: [marquee-type, overlap-collage, handwritten-accent, giant-numerals]
hero: [typographic, split]
signature:
  sectionCount: [5, 12]
  cols1Share: [0.1, 0.5]
  cols2Share: [0.3, 0.9]
  imageRadius: [0, 4]
  buttonShape: [rect, text]
  headingScale: [2, 6]
  headingAlign: [left]
  headingCase: [0, 0.2]
  eyebrowShare: [0, 0.5]
  wordsPerScreen: [40, 160]
  footerType: [columns, minimal]
  fullBleedShare: [0, 0.25]
  rotatedShare: [0, 0.05]
  overlapShare: [0, 0.05]
---

# swiss-grid-minimal

A strict twelve-column grid, flush-left text, small type contrast, no rounded corners and a lot of white. Order and restraint carry the page. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

Every element snaps to a twelve-column grid with a fixed outer margin. Sections are built from the same few column spans (for example 3 + 9, 4 + 8, 6 + 6), repeated so the eye learns the system. A narrow left column holds a number or a short title; the content hangs from the next column line. White space is the main design material: generous margins, large gaps between blocks, nothing decorative. Sections are separated by space or a single thin rule, never by color bands.

## Header and footer

Header: name at the left column line, links aligned to grid columns, small and regular weight, no background. Footer: a quiet grid of columns aligned with the sections above, small type, no wordmark.

## Typography

One neutral grotesque or humanist sans in two or three sizes and two weights. The heading is only a little larger than the lead paragraph; hierarchy comes from position and space, not size. Sentence case, flush left, ragged right, generous line height, short lines. Numerals are tabular.

## Imagery

Photographs are placed on the grid at whole column spans, rectangular, with no radius and no overlap, often with a small caption below on the same grid. They can be tall or wide but never decorative. A page with a handful of well chosen photos is enough; whitespace around them matters.

## Buttons and links

Buttons are small rectangles with a thin outline or a plain text link with an arrow. No radius beyond 2 px, no shadow, a calm color change on hover. One main action per screen at most.

## Motion

Quiet: a slow fade-and-rise reveal on blocks and nothing else; at most one sticky label column. Reduced motion shows everything at rest.

## Lendable traits

- `flush-left-axis`: Everything, including headings and captions, hangs from one strong left axis with no centered blocks.
- `split-sticky`: A narrow label or heading column stays in place while the wide column beside it scrolls.

## Do

- Choose a small set of column spans and reuse them in every section.
- Let white space separate sections instead of colored bands.
- Keep one weight for headings and one for body.
- Align captions, labels and numbers to the grid.

## Don't

- No large centered headings, no pills, no rounded photos.
- No decorative eyebrow label above every heading.
- No heavy type contrast between heading and body.
- No wordmark footer or oversized brand text.
