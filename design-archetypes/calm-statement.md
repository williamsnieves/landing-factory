---
name: calm-statement
summary: 'Calm but striking without photographs: one idea per screen set very large in generous space, soft full-bleed colour fields and one drawn shape that recurs through the page.'
signals:
  fits:
    [
      calm,
      serious,
      premium,
      local-service,
      few-assets,
      conversion-first,
      educational,
    ]
  avoid: [playful, experimental, data-heavy]
impact: [balanced, bold]
lends: [statement-band, line-art-thread]
rejects:
  [marquee-type, overlap-collage, handwritten-accent, visible-grid, bento-grid]
hero: [typographic, illustration]
signature:
  sectionCount: [5, 10]
  cols1Share: [0.4, 0.9]
  fullBleedShare: [0.25, 0.8]
  imageRadius: [0, 32]
  buttonShape: [pill, rect]
  headingScale: [6, 14]
  headingAlign: [left, center]
  eyebrowShare: [0, 0.4]
  wordsPerScreen: [15, 90]
  footerType: [minimal, columns]
  rotatedShare: [0, 0.02]
  overlapShare: [0, 0.15]
---

# calm-statement

Calm but striking without photographs: one idea per screen set very large in generous space, soft full-bleed colour fields and one drawn shape that recurs through the page. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

One statement per screen. The page is a sequence of bands that alternate between a soft colour field and the light ground. Each statement band holds one oversized line, a short supporting paragraph and, where the Copy plan places it, the action. Practical facts (where, when, how much) sit in calm two-column blocks between the bands, so the statements are never crowded by detail. Space is the main material: wide margins, long pauses, nothing competing with the line of the screen.

## Header and footer

Header: a light bar with the name and the one action; it stays pinned only when the brief puts conversion first. Footer: minimal, or quiet columns when the brief has contact data and opening hours. Both sit on the light ground, never on a loud colour.

## Typography

One humanist or soft serif display face, set large with generous leading, and a quiet text face for everything else. Scale carries the impact, not weight or capitals: the statement is eight to twelve times the body size, sentence case, with a short measure so it breaks into two or three calm lines. Supporting text stays small and left aligned.

## Imagery

One drawn element does the work of an image: a long line, a curve or an organic shape in SVG or CSS, in the palette of the brand, that recurs or runs through several sections and can end in the closing band. Photographs are optional. When good ones exist (the customer's own, a stock photo or a museum image) they are placed large and alone, never in a grid or a collage; when they do not exist the page loses nothing.

## Buttons and links

A filled button, rounded or rectangular, for the one action, repeated in the same form each time it appears. Everything else is a quiet text link with an underline. Hover and focus change colour or underline, never size.

## Motion

Slow, wide reveals of each statement as it enters, with long easing; the drawn line may draw itself as the page scrolls. One gesture per screen at most. With reduced motion every statement and the line appear in their final state, and without JavaScript the page reads in full.

## Lendable traits

- `statement-band`: A full-bleed soft colour field that carries one oversized line and a short supporting text, used for the moments that matter.
- `line-art-thread`: One large drawn line or shape that recurs across sections and ties them together, kept in the brand palette.

## Do

- Put one idea on each screen and let the space around it breathe.
- Keep colour fields soft enough for body text to hold 4.5:1 contrast.
- Draw the recurring shape in colours already in the palette.
- Make the first screen work with type and the drawn shape alone.

## Don't

- No medium-sized headings: go large or stay small.
- No eyebrow label above every section.
- No icon grids or card rows.
- No decorative gradients or glass.
- No photo collage or gallery.
- No shouting: a bold impact means bigger type and bolder colour, not louder copy.
