---
name: product-led-saas
summary: 'A software product page: a short two-tone headline over a framed interface, quiet customer marks, then alternating feature modules with one visual each on a calm neutral page.'
signals:
  fits:
    [technical, premium, conversion-first, product-showcase, calm, few-assets]
  avoid: [heritage, craft, local-service, playful, editorial-content]
lends: [ui-frame-hero, two-tone-heading, logo-strip-under-hero]
rejects: [overlap-collage, handwritten-accent, drop-cap]
hero: [typographic, split, video]
signature:
  sectionCount: [6, 12]
  cols2Share: [0.3, 0.8]
  fullBleedShare: [0, 0.25]
  imageRadius: [8, 24]
  buttonRadius: [6, 999]
  buttonShape: [pill, rect]
  headingAlign: [left, center]
  eyebrowShare: [0, 0.5]
  wordsPerScreen: [20, 80]
  mediaPerScreen: [0.6, 2.5]
  footerType: [columns, minimal]
---

# product-led-saas

A software product page: a short two-tone headline over a framed interface, quiet customer marks, then alternating feature modules with one visual each on a calm neutral page. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

The page is a vertical stack of modules separated by very large gaps, while the inside of each module stays tight and dense. The hero holds a short headline, one supporting line, a primary and a secondary action, and under them a large framed picture of the product interface, cropped by the fold so the visitor sees there is more below. A single quiet row of customer marks may follow. Then come three to five feature modules that alternate: heading and a few lines on one side, one visual on the other, flipping sides each time. One proof module and a closing call to action precede the footer. Width stays on a regular column grid with generous side margins.

## Header and footer

Header: a slim bar with the product name, three or four links and one primary action, optionally with a hairline underneath. Footer: columns of product, resources and company links with a short legal line, on the same neutral page.

## Typography

One neutral sans family, weights between regular and medium, so the page looks light even at large sizes. Display size is large with tight leading and slightly negative tracking; section headings are smaller but follow the same pattern. Headings use two tones: the first clause at full contrast and the continuation muted. Body copy is short, muted and comfortable. A monospaced face is optional and limited to small labels and code.

## Imagery

The interface is the image: the customer's own screenshots, or an abstract mock drawn in HTML and CSS with placeholder-free, non-numeric content such as bars, lines, blocks and panels. Frames have a rounded corner and a hairline border, sit on a faint tinted panel and share one radius. Abstract gradients and soft glows may support them. Photographs appear only when the brief supplies them.

## Buttons and links

A pill or slightly rounded rectangle, one filled style for the primary action and one outlined style for the secondary. Only one saturated color is used for actions; secondary links are plain text with an arrow.

## Motion

Short fades with a slight rise as modules enter; the hero frame may carry a slow glow or a gentle scroll-linked shift. No pinned sections by default. Reduced motion shows everything at rest.

## Lendable traits

- `ui-frame-hero`: The product interface shown large in a rounded hairline frame as the hero visual, cropped by the fold.
- `two-tone-heading`: A heading whose lead clause is full contrast and whose continuation is a muted tone.
- `logo-strip-under-hero`: One quiet row of customer marks directly under the hero, low contrast and of equal height.

## Do

- Keep one idea per module: a short heading, a few lines, one visual.
- Fill frames with the customer's own screenshots, or with an abstract HTML/CSS mock that states no figures.
- Use only metrics, names and features that appear in the brief.
- Show a logo strip only with marks the customer supplied, with permission, from the brief assets; otherwise leave the strip out or replace it with a strip of facts from the brief.
- Use one saturated action color against a calm neutral page.
- Leave huge gaps between modules and keep the inside of a module compact.

## Don't

- No invented metrics, customer names, features or logos, and no placeholder logos.
- No testimonials, star ratings or usage numbers unless the brief provides them.
- No more than one saturated color.
- No tile grid as the main structure or photo-led bands.
- No hero object that is only decoration; the product itself is the visual.
- No long pages that hold a dozen ideas.
