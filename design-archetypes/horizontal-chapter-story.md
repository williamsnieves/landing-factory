---
name: horizontal-chapter-story
summary: 'A story told in chapters. One pinned section scrolls a horizontal track of panels, with a chapter index and full-screen moments between them.'
signals:
  fits: [storytelling, educational, heritage, premium, photo-rich, calm]
  avoid: [data-heavy, conversion-first, product-showcase]
lends: [horizontal-chapter, chapter-index]
rejects: [bento-grid, stat-strip, comparison-table]
hero: [full-bleed-photo, typographic, video]
signature:
  sectionCount: [4, 10]
  cols1Share: [0.5, 1]
  fullBleedShare: [0.2, 0.8]
  stickyCount: [1, 8]
  wordsPerScreen: [15, 110]
  mediaPerScreen: [0.5, 3]
  buttonShape: [pill, rect, text]
---

# horizontal-chapter-story

A story told in chapters. One pinned section scrolls a horizontal track of panels, with a chapter index and full-screen moments between them. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

The page is a sequence of numbered chapters, each almost a screen tall. A chapter opens with a large number and a short statement, then reveals its content. One chapter is a horizontal track: while the section is pinned, panels slide sideways with the scroll (steps, a timeline, a series of objects), and the vertical scroll resumes at the end. Between chapters come full-screen quiet moments (one image, one line). A fixed chapter index shows where the visitor is. Without scripting or with reduced motion the track becomes a normal vertical stack.

## Header and footer

Header: the title and a compact chapter index (roman or arabic numerals) that marks the current chapter. Footer: a closing chapter with the sources or credits and a way back to the index.

## Typography

A refined serif or a calm sans for statements, set large but not shouting, with a small numeral as the chapter marker. Body is short and readable; one idea per panel. Strong contrast between the chapter statement and the caption text.

## Imagery

Full-bleed or large single images per chapter, darkened or toned so type stays readable, with a caption that names the subject. Panels in the horizontal track carry one image each. No collages.

## Buttons and links

One quiet action repeated at the start and end (a pill or a rectangle, the same everywhere) plus text links to chapters.

## Motion

One pinned horizontal track, chapter reveals, a progress marker. At most one pinned section, always with a reduced-motion and no-script fallback that reads top to bottom.

## Lendable traits

- `horizontal-chapter`: A pinned section whose panels travel sideways with the scroll, falling back to a vertical stack.
- `chapter-index`: Numbered chapters with a small index that shows the current one.

## Do

- Number the chapters and give each one idea.
- Pin only one section and test it with reduced motion and no script.
- Use full-screen quiet moments between dense chapters.
- Caption images with what they show.

## Don't

- No dense multi-column grids of cards.
- No more than one pinned section.
- No decorative parallax on every image.
- No hidden content in the track that the fallback loses.
