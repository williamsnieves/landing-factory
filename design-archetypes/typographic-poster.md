---
name: typographic-poster
summary: 'Type is the image. Huge display lettering, tight cropping and bold color fields carry the page, with few or no photographs.'
signals:
  fits: [bold, playful, experimental, few-assets, premium]
  avoid: [photo-rich, data-heavy, local-service]
lends: [marquee-type, giant-numerals]
rejects: [bento-grid, spec-chips, practical-strip]
hero: [typographic]
signature:
  sectionCount: [4, 10]
  cols1Share: [0.5, 1]
  imageRadius: [0, 40]
  headingScale: [8, 40]
  headingCase: [0, 1]
  wordsPerScreen: [15, 90]
  mediaPerScreen: [0, 0.8]
  fullBleedShare: [0, 0.3]
  footerType: [wordmark, minimal]
  rotatedShare: [0, 0.3]
---

# typographic-poster

Type is the image. Huge display lettering, tight cropping and bold color fields carry the page, with few or no photographs. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

Each section is a poster: one dominant line of display type that fills most of the width, cropped by the edge or running off it, and a small block of supporting text placed at an odd, deliberate position. Sections alternate large flat color fields. The grid is simple (one or two columns) because the type does the composition: scale, rotation of a word, overlap of two words, a line broken across the viewport. Whole sections can be only words.

## Header and footer

Header: a tiny mark and two or three links pinned at the edges so the poster area stays free. Footer: the closing line set huge, or a single compact line when the closing section already shouted.

## Typography

One characterful display face used at extreme scale (the first heading is several times the body size), tight tracking and tight leading, capitals or very large lowercase. A plain text face for the supporting lines, small. Contrast between scales is the whole point: two sizes only, far apart. Text may be outlined, stretched or clipped by overflow in a controlled way.

## Imagery

Few or no photographs. When one is used it is a flat, cropped, single-tone or high-contrast image acting as a texture inside a letterform or a color block. Illustrations and shapes from code are welcome. Never a row of equal rounded photos.

## Buttons and links

A giant text link or a large solid block with the action word in the display face; a pill is allowed only when it is oversized and part of the poster. Hover moves or inverts the type.

## Motion

Type moves: a marquee line, a word that travels sideways with the scroll, letters that settle. One or two moments, never constant. Reduced motion freezes everything at a readable rest state; the text must stay legible and unclipped at 375 px.

## Lendable traits

- `marquee-type`: A repeated line of display type that travels sideways, once or twice on the page.
- `giant-numerals`: Very large numerals (steps, years, counts) used as graphic anchors for a section.

## Do

- Make the first screen a poster that works without any image.
- Crop type deliberately and check it at 375, 768 and 1440 px.
- Use flat color fields and strong contrast between sections.
- Keep supporting text short and small.

## Don't

- No photo grids or galleries.
- No eyebrow label above the heading in every section.
- No medium-sized headings: go big or go small.
- No decorative gradients or glass.
