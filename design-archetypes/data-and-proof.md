---
name: data-and-proof
summary: 'Evidence first: figures, small charts drawn in CSS or SVG, comparison tables and clear claims with their sources.'
signals:
  fits: [data-heavy, technical, serious, conversion-first, educational]
  avoid: [playful, heritage, craft]
lends: [stat-strip, comparison-table]
rejects: [handwritten-accent, overlap-collage, drop-cap]
hero: [split, typographic, illustration]
signature:
  sectionCount: [6, 12]
  cols2Share: [0.2, 0.7]
  cols3Share: [0.2, 0.8]
  wordsPerScreen: [60, 220]
  mediaPerScreen: [0, 1.8]
  imageRadius: [0, 12]
  buttonShape: [rect, pill]
  eyebrowShare: [0, 0.7]
---

# data-and-proof

Evidence first: figures, small charts drawn in CSS or SVG, comparison tables and clear claims with their sources. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

Each section makes one claim and proves it. A short headline states the claim; below it sits the evidence: a strip of large figures, a bar or line chart drawn with CSS or inline SVG, a comparison table with ticks, a before and after pair. Layout is a steady grid of two to four columns with clear labels and units; tables and charts are real HTML or SVG with text alternatives. Sources and dates are stated next to each figure. The page may end with a method note and a clear action.

## Header and footer

Header: name, links to sections (Evidence, Compare, Method) and an action button. Footer: columns with sources, method, contact and credits.

## Typography

A clean sans for headings and text, with tabular figures; large figures set in a distinct weight; labels small and consistent. Moderate heading scale; numbers carry the emphasis.

## Imagery

Few photographs; the visuals are charts, diagrams and icons built from code in the page's tokens, each with a text equivalent. Screenshots or product photos are small and framed with a thin border.

## Buttons and links

A rectangular or lightly rounded button for the main action and text links with arrows for details. Hover changes the tone only.

## Motion

Figures count up or bars grow once when they enter the viewport, and settle at their final values under reduced motion; nothing else moves.

## Lendable traits

- `stat-strip`: A row of three to four large figures, each with a unit, a label and a source.
- `comparison-table`: A real table that compares options row by row with clear ticks and values.

## Do

- State the claim, then show the evidence beside it.
- Draw charts with CSS or SVG and give them text alternatives.
- Cite the source and date of every figure, or label it as a sample.
- Keep tables as real tables with headers.

## Don't

- No invented statistics presented as real.
- No decorative photos in place of evidence.
- No charts that need a script to be readable.
- No playful rotation, collage or handwriting.
