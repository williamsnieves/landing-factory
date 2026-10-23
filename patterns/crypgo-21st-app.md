---
url: 'https://crypgo-shadcn-ui-landingpage-v1.21st.app/'
slug: 'crypgo-21st-app'
date: '2026-10-23'
focus: 'visually attractive dark product page that builds trust to buy'
libraries:
  - 'Next.js'
---

# crypgo-21st-app

## Summary

A dark product landing for a trading app, built as a template. It is worth learning from for how it makes a digital product feel tangible and trustworthy on a dark ground: a device mockup hero, glowing UI fragments floating around it, a strip of partner marks, live-looking data cards, big figure tiles and a FAQ, all with one fresh accent color.

## Section map

1. Fixed header, about 0.1 viewport: wordmark left, five text links centered, an outline secondary action and a filled accent action right.
2. Hero, about 1.5 viewports including the next strip: small accent pill label, a three-line display headline, a short paragraph and one accent button on the left; a hand-held device mockup with floating UI cards and circular badges on the right; then a centered small line and a horizontal strip of partner marks.
3. Data strip, about 0.5 viewports: centered heading and a row of live-looking quote cards (icon, name, value).
4. Figures, about 0.25 viewports: four bordered tiles with a large figure and a small caption.
5. Features, about 1.5 viewports: a heading with one accent word, a split with feature rows and icons on one side and a stacked UI panel with connector lines on the other; then a centered device with orbiting feature callouts.
6. Visual moment, about 0.5 viewports: glowing coin cards on a dark field with a soft colored bloom.
7. Upgrade section, about 0.9 viewports: heading and a two-column check list on the left, a dashboard chart composition on the right.
8. Closing call, about 0.7 viewports: a centered short headline on dark.
9. Support row, about 0.7 viewports: three icon columns over a soft line-chart silhouette.
10. FAQ, about 0.8 viewports: centered label and heading, then an accordion list in bordered rows.
11. Footer, about 0.5 viewports: wordmark and blurb, link columns and store badges, a small credit line.

## Hero

Split hero on a near-black ground. Left: accent pill label, large three-line headline, short paragraph, one compact accent button. Right: a photographic hand holding a phone with the product UI, surrounded by small floating UI cards and circular icon badges that suggest a living product. A partner-mark strip closes the first screen. Two elements fade in on load.

## Grid and spacing

Content about 1140 to 1200 px wide; mostly 2-column splits, a 4-tile figure row and a 3-column support row. Gaps of 16 to 24 px, cards with medium radii, hairline borders a step lighter than the ground, and sections separated by generous dark space.

## Typography

One geometric sans for everything. Display up to about 72 px with tight line height (about 1.0), body 16 to 18 px with about 1.5 line height, weights mostly regular and medium, almost no uppercase. Accent color on one word of a heading is the main emphasis device.

## Palette

Dark theme: near-black ground with slightly lighter card surfaces and hairline borders, near-white text, muted grey secondary text, one fresh green accent for labels, the main action and highlighted words. Product UI fragments bring small spots of extra color, and soft colored blooms glow behind key visuals.

## Density

Low to moderate: one idea per section, short headings, very little body text, many visual fragments. The page sells through visuals (device, UI cards, charts) rather than paragraphs.

## Motion

| Moment                      | Trigger | Type     | Technique / library                                       | Confidence |
| --------------------------- | ------- | -------- | --------------------------------------------------------- | ---------- |
| Hero text and visual        | load    | reveal   | opacity fade of the hero blocks                           | medium     |
| Floating UI cards and coins | scroll  | parallax | fragments move a little faster than the page (about 1.17) | medium     |
| Device and feature visuals  | scroll  | scrub    | a few elements shift with scroll position                 | low        |
| Section content             | scroll  | reveal   | fade in as the section enters                             | medium     |
| Partner strip               | load    | reveal   | continuous horizontal drift (inferred from layout)        | low        |

## Libraries

Next.js (high, global). No smooth-scroll or scroll-timeline library and no WebGL detected; the effects are CSS and light script.

## What to take / what to avoid

Take: a hero visual that makes the product tangible (the real product shown at an angle with floating fragments around it); one fresh accent used for one word per heading, labels and the main action; bordered figure tiles; soft colored blooms behind key visuals on a dark ground; a FAQ accordion that answers buying doubts; small parallax on floating fragments. Avoid: a partner-logo strip or user, country and volume figures unless they are real; finance and trading UI, coins and charts as imagery; the specific device-in-hand composition.
