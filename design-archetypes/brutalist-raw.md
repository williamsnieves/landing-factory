---
name: brutalist-raw
summary: 'Raw, structural pages: hard edges, visible grid lines, monospaced labels, dense blocks and text links instead of buttons. Honest and loud without decoration.'
signals:
  fits: [technical, experimental, bold, serious, few-assets, data-heavy]
  avoid: [premium, calm, heritage]
lends: [visible-grid, mono-labels]
rejects: [handwritten-accent, scene-backdrop]
hero: [typographic, split]
signature:
  sectionCount: [6, 14]
  cols2Share: [0.3, 1]
  imageRadius: [0, 2]
  buttonRadius: [0, 2]
  buttonShape: [rect, text]
  headingAlign: [left]
  headingCase: [0.3, 1]
  eyebrowShare: [0, 0.4]
  wordsPerScreen: [60, 260]
  footerType: [columns, minimal]
  rotatedShare: [0, 0.1]
---

# brutalist-raw

Raw, structural pages: hard edges, visible grid lines, monospaced labels, dense blocks and text links instead of buttons. Honest and loud without decoration. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

The page is a visible structure. Sections are separated by thick or hairline rules that run the full width, and a column grid is allowed to show: cells are outlined, tables are bordered, nothing floats. Content sits in uneven, dense blocks: a narrow label column next to a wide text column, or a ledger of rows with a number, a title and a short line. Sections have different heights on purpose; there is no steady rhythm of equal bands. Whitespace is small and constant, not generous. Most sections are one or two columns; a three-column ledger is fine.

## Header and footer

Header: a plain bar with a hard bottom rule, the name set in the label face, links as bare text with an underline on hover, no pills. Footer: a dense block of columns (address, links, credits) in the label face under a thick rule; no giant wordmark.

## Typography

One heavy grotesque or a slab for headings, set tight, often in capitals, plus a monospaced face for labels, numbers and captions. Scale contrast is high but steps are few: one huge heading size, one body size, one label size. Alignment is flush left everywhere. Body text may run wide and dense. No italics for decoration.

## Imagery

Photos are cropped square or in plain rectangles with no radius, often high contrast or reduced to one tone with CSS, placed in grid cells with a visible border and a mono caption (index number, subject). Few images; a page works with none. Never an arch, circle or blob crop.

## Buttons and links

Primary action is a rectangle with a thick outline or a solid fill and zero radius, or a text link with an arrow glyph. No pills, no soft shadows; the hover state inverts the colors instantly. Links are underlined.

## Motion

Almost none. Instant state changes, a marquee strip at most once, reveals replaced by simple cuts. Reduced motion changes nothing important. Never smooth-scroll or parallax.

## Lendable traits

- `visible-grid`: Hairline or thick rules that outline the grid cells and sections so the structure shows.
- `mono-labels`: A monospaced face for labels, indexes, captions and figures, small and in capitals.

## Do

- Show the grid: rules, outlined cells, tables with borders.
- Use a monospaced label face for every small piece of metadata.
- Keep corners at zero radius, including buttons and photos.
- Let text blocks be dense and information-first.

## Don't

- No eyebrow-plus-big-serif-heading pairing in every section.
- No rounded or arch-shaped photos, no pill buttons.
- No giant wordmark footer.
- No soft shadows, glass or gradients.
