---
url: 'https://linear.app/'
slug: 'linear-app'
date: '2026-10-28'
focus: 'premium and clear product-site craft: hero, product UI, grids, type, motion, CTAs'
libraries:
  - 'Next.js'
---

# linear-app

<!--
Rules (enforced by `npm run validate:patterns`):
- Describe, never copy.
-->

## Summary

A dark, quiet product page for a software tool, built almost entirely from the product's own interface shown large and cropped, separated by hairline rules and short two-part statements. It is worth learning from because premium comes from restraint: one typeface, one neutral scale, very little color, and a strict repeat of "short heading, one calm paragraph, one big product visual" for every feature.

## Section map

1. Fixed slim header, about 0.08 viewports: mark and wordmark left, five text links, a divider, a plain login link and a pill-shaped light button on the right. Collapses to login, pill button and a two-line menu icon at 375 px.
2. Hero, about 1.1 viewports: left-aligned two-line headline, one muted sentence, a small "new" tag with an arrow link on the right of the same row, then a very large dark product window cropped by the fold (sidebar, issue view, a floating agent panel).
3. Logo strip, thin: a single row of customer marks, low contrast.
4. Statement block, about 0.2 viewports: one large two-sentence paragraph, white for the first clause and muted for the rest.
5. Three-column "figure" row, about 0.5 viewports: each column has a tiny mono figure label, a thin-line isometric illustration, a short title and two lines of text; columns split by vertical hairlines.
6. Four feature sections, each about 1.4 viewports: headline on the left, paragraph and a quiet text link on the right, then a wide product visual below (timeline chart, scatter chart, review diff, issue list), usually cropped at the section edge or bleeding off one side. Small plus-sign feature lists sit at the right of some sections.
7. Secondary statement or quote block, about 0.5 viewports.
8. Changelog row, about 0.6 viewports: four columns on a horizontal line with dot markers (first dot accented), title, two-line truncated excerpt, mono date, and a "view all" arrow link.
9. Closing call to action, about 0.25 viewports, one line and a button.
10. Footer, about 0.55 viewports, link columns in small muted type.

## Hero

Type-led split with a product shot: headline top-left at large display size, supporting sentence in a muted tone, and a tagged announcement link aligned right on the same baseline as the sentence. The product window is the real visual, framed with a hairline border and a faint top glow, deliberately cropped so the user feels there is more below. The only primary action is the pill button in the header; no hero button pair. On load the hero elements fade up in a short stagger.

## Grid and spacing

Content width about 1340 px at 1440 with 80 px side margin, 12-column underlay but most blocks use a clean 2-column (heading left, copy right) or equal 3 and 4 column split with visible vertical hairlines. Sections are separated by full-width thin horizontal rules plus very large vertical padding (about 128 px top and bottom). Gaps inside components are small (4 to 12 px), which makes the product visuals feel dense against the empty page. Product visuals are allowed to break the container and bleed off the edge.

## Typography

Single neutral grotesque sans for everything, with a mono face only for figure labels, dates and code chips (about a sixth of text). Display about 64 to 72 px on desktop, 38 px at 375 px, line-height close to 1.0, tight negative tracking, medium weight rather than bold. Body 15 to 16 px at regular weight, muted. Scale ratio about 1.18 with long flat stretches at 13 to 15 px for UI text. No uppercase except in tiny mono labels. A signature move is two-tone text: the lead clause bright, the continuation dimmed.

## Palette

Near-black neutral background in two slightly different dark steps, hairline borders slightly lighter than the page, near-white headings, mid-grey body text. Accent color almost absent from the chrome: only small status dots, chart marks and tiny icons use a warm or cool vivid tone, and the pill button is light on dark. Body text contrast is high (above 18:1) while secondary text is deliberately subdued. Gradients are used as soft glows behind and over product visuals, not as decoration.

## Density

Low content per screen but high detail inside visuals: each viewport carries one headline, one paragraph and one image. About 1,400 words on the whole page. Text-to-media balance leans heavily to media; the visuals are information-rich, so the page reads like a tour of the product instead of a list of claims.

## Motion

| Moment                  | Trigger | Type          | Technique / library                                             | Confidence |
| ----------------------- | ------- | ------------- | --------------------------------------------------------------- | ---------- |
| Hero text and window    | load    | reveal        | staggered fade and about 25 px rise, CSS transitions            | high       |
| Feature visuals         | scroll  | reveal, scrub | elements inside the product shots animate in as they enter view | medium     |
| Chart and diagram parts | scroll  | reveal        | many animated and will-change elements, intersection observers  | medium     |
| Header                  | scroll  | sticky        | fixed header with a hairline bottom border                      | high       |
| Links, rows, plus items | hover   | hover         | short colour and opacity transitions, about 80 elements         | low        |
| Wheel scrolling         | scroll  | eased scroll  | eased response to wheel without a known smooth-scroll class     | low        |

No pinning or scroll-scrubbed timelines were measured; reduced-motion rules exist in the stylesheet.

## Libraries

Next.js (global, high). No GSAP, ScrollTrigger or Lenis detected, no canvas or WebGL on the page. Assets come from the site's own static and image hosts. Motion is CSS and intersection observers.

## What to take / what to avoid

Take: an interface shot as the hero visual, cropped by the fold and framed by a hairline; two-column "heading left, copy right" feature blocks with one visual each; two-tone statements; a single light pill as the primary action on a dark page; hairline-divided figure columns with small mono labels; a horizontal changelog timeline as proof of momentum; spacing that is huge between sections and tiny inside components.
Avoid: relying on near-invisible low-contrast illustrations (they vanish on poor screens), a hero with no visible primary button in the content area, copying the isometric line-art style or the specific dashboard visuals, and very heavy DOM and request counts (over 600 requests here).
