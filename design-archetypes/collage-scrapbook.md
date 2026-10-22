---
name: collage-scrapbook
summary: 'Playful and handmade: overlapping, slightly rotated photos, paper textures, handwritten accents and stickers, arranged like a scrapbook page.'
signals:
  fits: [playful, craft, photo-rich, local-service, heritage]
  avoid: [serious, technical, data-heavy, premium]
lends: [overlap-collage, handwritten-accent]
rejects: [visible-grid, mono-labels, stat-strip]
hero: [collage]
signature:
  sectionCount: [5, 11]
  imageRadius: [0, 20]
  rotatedShare: [0.25, 1]
  overlapShare: [0.25, 1]
  mediaPerScreen: [1, 5]
  headingAlign: [left, center]
  buttonShape: [pill, rect]
  wordsPerScreen: [20, 100]
---

# collage-scrapbook

Playful and handmade: overlapping, slightly rotated photos, paper textures, handwritten accents and stickers, arranged like a scrapbook page. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

Sections are pages of a scrapbook. Photos of different sizes sit on a loose canvas, overlap each other and the text, and are tilted by a few degrees; captions and arrows are scribbled next to them. Backgrounds are paper-like color fields with a hint of texture. The grid is hidden: it exists for the layout to stay readable at 375 px (photos stack with overlap and rotation retained), but the eye sees a collection. Text blocks are short and often sit on a tape or a label.

## Header and footer

Header: a hand-lettered name and a few links, perhaps on a torn-paper strip. Footer: a collage of small items (stamp, sticker, address note) and the credits in plain text.

## Typography

A friendly display face with some irregularity for headings, plus a handwriting face used sparingly for notes and annotations, and a plain readable body. Sizes are moderate; personality comes from the face and the placement, not from huge scale.

## Imagery

Many photos, each used at most twice, cropped with simple rectangles, small radii or cut-out shapes; thin white borders or tape; overlap and rotation of 2 to 6 degrees. Photos must show what the caption says.

## Buttons and links

A chunky pill or a sticker-like rectangle with a slight tilt and a hard offset shadow. Links are underlined with a hand-drawn feel.

## Motion

Playful but small: photos settle into place with a little rotation, a sticker wiggles on hover. At most one moment of scroll-driven movement. Reduced motion shows the final arrangement.

## Lendable traits

- `overlap-collage`: Photos that overlap each other and the text, with small rotations, on a loose canvas.
- `handwritten-accent`: A handwriting face for notes, arrows and annotations next to images.

## Do

- Overlap and rotate photos, and keep them readable at 375 px.
- Write captions and notes that name what the photo shows.
- Use paper, tape and sticker details sparingly.
- Keep the body text plain and legible.

## Don't

- No strict grid, no hairline rules.
- No uniform rows of equal rounded photos.
- No monospaced labels.
- No more than two playful moments of motion.
