---
name: chaptered-atlas
summary: 'A release or launch page that maps itself in the first screen: an index or diagram of its few chapters that doubles as navigation, a giant vertical display word, one saturated colour field per chapter and a fixed chapter rail.'
signals:
  fits:
    [
      bold,
      product-showcase,
      storytelling,
      experimental,
      editorial-content,
      technical,
    ]
  avoid: [calm, local-service, heritage]
impact: [balanced, bold]
lends: [self-map-hero, chapter-color-fields]
rejects: [drop-cap, handwritten-accent, overlap-collage]
hero: [typographic, illustration]
signature:
  sectionCount: [5, 10]
  cols1Share: [0.3, 0.8]
  cols2Share: [0.1, 0.6]
  fullBleedShare: [0.4, 1]
  imageRadius: [0, 16]
  buttonShape: [pill, rect]
  headingScale: [4, 12]
  headingAlign: [left]
  eyebrowShare: [0.2, 1]
  wordsPerScreen: [20, 110]
  footerType: [minimal, columns]
  stickyCount: [1, 4]
---

# chaptered-atlas

A release or launch page that maps itself in the first screen: an index or diagram of its few chapters that doubles as navigation, a giant vertical display word, one saturated colour field per chapter and a fixed chapter rail. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

The page is an atlas of four to six chapters and never more than six. The first screen shows the whole territory: one giant display word set vertically along the left edge as the edition or brand mark, a short numbered index of the chapters, and a framed map panel that draws the chapters as labelled nodes joined by thin lines. Index and map both link to their chapters. Below, each chapter takes over the screen with its own colour field and opens with a very large title. It then alternates two modules: a wide feature card, with a short heading, two sentences, a small action and one screenshot or image that bleeds off the right edge of its frame, and a row of three or four short notes separated by hairlines. A fixed rail at the left edge lists the chapters, with a filled marker on the one in view. The page ends with a closing band in the last field and a small footer.

## Header and footer

Header: a slim fixed bar with the name and edition label, one or two text links and one action. The chapter rail is separate and sits beside the content, not in the bar. Footer: one small row of links and the legal line on the last chapter's colour or on a near-black ground.

## Typography

A two-level scale on purpose. Chapter titles and the vertical word are huge; everything else is small, around body size. There is nothing in between, so no medium headings. One neutral grotesque or geometric sans carries titles and notes, and a monospace is used for the index numbers, counts and short labels. Sentence case, ordinary tracking, tight leading on titles. Links in running text are underlined.

## Imagery

The map is the main picture and is drawn in code: nodes, labels and thin lines on a dark panel, in a lighter tint of the current chapter colour, built from the real chapter list of the brief. Product screenshots come from the customer or are abstract HTML and CSS mocks that state no figures; each bleeds off one edge of its card. Photographs are optional and placed large and alone. A faint copy of the map may continue behind the chapters in the colour of the current field.

## Buttons and links

One filled pill or rectangle for the primary action, in a contrasting neutral on every field, and small dark or outlined links on the cards. Index entries and map nodes are plain links with a visible focus ring. Hover changes colour or underline, never size.

## Motion

The map settles in once on load; nodes may pulse slowly while it is on screen. The chapter marker follows the scroll with an observer, and the field colour changes as each chapter enters. Smooth scrolling is optional. With reduced motion the fields are static, the map is drawn and does not animate, and the marker updates without easing. Without JavaScript the page is a plain stack of coloured chapters with a working index. At most one canvas runs on phones, and none runs while its section is off screen.

## Lendable traits

- `self-map-hero`: The first screen maps the whole page: a numbered index and a drawn node diagram of every chapter, both acting as navigation.
- `chapter-color-fields`: Each chapter owns one saturated full-bleed colour field with its own very large title, and the field changes as the chapter enters.

## Do

- Keep to four to six chapters, drawn from the brief's real offer, features or story.
- Make the index and the map work as links and show the same chapters in the same order.
- Check text on every colour field for 4.5:1 contrast, and darken the field instead of tinting the text when it falls short.
- Provide a reduced-motion form: static colour fields, a drawn and not animated map, no scrubbed colour.
- Let one screenshot per feature card break its frame on one edge.
- Keep the vertical word to the brand or edition name from the brief.

## Don't

- No more than six chapters and no endless archive of notes.
- No invented figures, counts, customers or quotes on the map or the cards.
- No white text on a mid-saturated field without measuring it.
- No more than one canvas on phones, and none that keeps running off screen.
- No medium-sized headings between the huge titles and the small notes.
- No copy of another site's diagram, labels, colours or screenshots.
