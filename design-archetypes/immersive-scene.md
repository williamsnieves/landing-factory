---
name: immersive-scene
summary: 'Full-bleed media or a 3D scene fills the screen with minimal chrome; short chaptered overlays carry the story over it.'
signals:
  fits: [experimental, storytelling, premium, photo-rich, bold]
  avoid: [data-heavy, editorial-content, local-service, few-assets]
lends: [scene-backdrop, chaptered-overlay]
rejects: [stat-strip, comparison-table, hours-card]
hero: [video, full-bleed-photo, illustration]
signature:
  sectionCount: [3, 9]
  cols1Share: [0.6, 1]
  fullBleedShare: [0.5, 1]
  wordsPerScreen: [8, 80]
  mediaPerScreen: [0.4, 3]
  buttonShape: [pill, rect, text]
  headingAlign: [left, center]
  footerType: [minimal, columns, wordmark]
---

# immersive-scene

Full-bleed media or a 3D scene fills the screen with minimal chrome; short chaptered overlays carry the story over it. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

The screen is the image. Each section is a full-viewport stage with a background that is a photograph, a video, an illustration or a code-built 3D scene (poster first), and a small overlay of text on it. The overlay is a chapter card: a short statement, a tiny label, sometimes one action. Content is deliberately light; chrome is minimal so the media carries the mood. The page works without the scene: the poster stays and the text remains in real HTML.

## Header and footer

Header: almost invisible: a small mark and one or two links, transparent over the media, solid only after scrolling. Footer: a compact dark strip with credits and links.

## Typography

A restrained sans or serif at small and medium sizes for overlays, with one larger statement per chapter; very wide tracking on tiny labels is allowed. Light type on dark media with enough contrast; text never competes with the image.

## Imagery

Full-bleed media with a darkening layer where text sits; one clear subject per stage; credited images and a poster for every scene. Variety comes from the media itself, not from layout tricks.

## Buttons and links

One understated action, a pill or a rectangle with a thin outline, repeated per chapter; or a simple text link.

## Motion

Scene or media reacts to scroll (scrubbed progress, camera drift, a slow zoom) within the performance budget; overlays fade in per chapter. Reduced motion, no script and no WebGL all show the poster and the text.

## Lendable traits

- `scene-backdrop`: A fixed or full-bleed media or 3D layer behind the content, poster first, with the text in real HTML.
- `chaptered-overlay`: Short numbered statement cards laid over the media, one idea per screen.

## Do

- Let one image or scene fill the viewport and keep the overlay short.
- Make the poster carry the page when the scene does not load.
- Protect text contrast with a gradient or scrim.
- Keep chrome minimal.

## Don't

- No dense text columns or tables.
- No rows of small rounded cards.
- No decorative scenes that tell nothing.
- No content that only exists inside the canvas.
