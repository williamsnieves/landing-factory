---
name: bento-product-showcase
summary: 'A tile grid of mixed sizes that presents a product or a service line as a set of feature tiles, with product shots and short claims.'
signals:
  fits:
    [product-showcase, premium, technical, photo-rich, conversion-first, bold]
  avoid: [heritage, editorial-content, few-assets]
lends: [bento-grid, spec-chips]
rejects: [drop-cap, pull-quote, horizontal-chapter]
hero: [split, illustration, full-bleed-photo]
signature:
  sectionCount: [5, 11]
  cols3Share: [0.3, 1]
  imageRadius: [8, 40]
  buttonShape: [pill, rect]
  mediaPerScreen: [1.2, 6]
  wordsPerScreen: [25, 110]
  eyebrowShare: [0, 0.8]
  headingAlign: [left, center]
  footerType: [columns, minimal, wordmark]
---

# bento-product-showcase

A tile grid of mixed sizes that presents a product or a service line as a set of feature tiles, with product shots and short claims. A starting grammar, not a template: bend it when the requirement or a reference asks for it, and write the deviation in RUN.md "Design decisions".

## Layout grammar

The core is the bento: a grid of tiles with different spans (one large, two medium, several small) in a single rectangle, each tile holding one product shot, one number or one short claim. Tiles share one gap and one radius and may have different background tones. Sections are mostly such grids, with a simple hero in front and a pricing or purchase strip at the end. Heading blocks are short and sit above the grid, aligned with it.

## Header and footer

Header: a floating or compact bar with the product name, three links and the primary action. Footer: columns of product, company and support links with a short legal line.

## Typography

A modern sans for headings at a medium-large size, semi-bold, tight leading; short sentences in tiles; numbers set large inside tiles. Tile titles are small and bold; spec text is small and secondary.

## Imagery

Product shots and detail crops placed inside tiles with a shared radius, on tinted backgrounds; images are the content of the tile, cropped to its shape (object-fit). Different crops of the same product are fine as long as no photo repeats more than twice.

## Buttons and links

A pill or rounded rectangle, one style across the page; secondary links as text with an arrow. Tiles can be links with a subtle lift on hover.

## Motion

Tiles reveal with a short staggered fade; one tile may hold a small looping or hover-driven detail. No pinned sections. Reduced motion shows tiles at rest.

## Lendable traits

- `bento-grid`: A tile grid with mixed spans in one rectangle, tiles sharing a gap and a radius.
- `spec-chips`: Small labelled chips that state a specification or a benefit in a few words.

## Do

- Give each tile one job: a shot, a number or a claim.
- Keep one gap and one radius for all tiles.
- Vary tile spans to make a rhythm, not a uniform grid.
- End with a clear purchase or contact strip.

## Don't

- No long running text columns.
- No full-width alternating photo-and-text bands.
- No tile that holds more than one message.
- No huge wordmark footer.
