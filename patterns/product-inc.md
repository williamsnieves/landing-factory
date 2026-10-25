---
url: 'https://www.product.inc/'
slug: 'product-inc'
date: '2026-10-25'
focus: 'the overall concept; creativity'
libraries:
  - 'Next.js'
  - 'WebGL'
  - 'Canvas 2D'
---

# product-inc

<!--
Rules (enforced by `npm run validate:patterns`):
- Describe, never copy.
-->

## Summary

A personal portfolio of a design leader built as one long "operating system for a career": a single scroll with a sticky anchor nav whose tabs map to content collections (case studies, shipped products, code experiments, side work, writing, a pattern library, resume, services, a coming-soon shop). The concept is a person presented as a small product company, and the creativity comes from the humor and honesty of the framing plus a hand-built hero object rather than from heavy animation.

## Section map

1. Slim ticker strip above the nav with a self-deprecating status message scrolling horizontally, about 0.04 viewports.
2. Sticky header: monogram left, centered uppercase tab nav with one tab carrying a small "soon" pill, theme toggle and mail icon right.
3. Hero, about 0.8 viewports: dotted rotating globe left, name, role eyebrow, dense bio paragraph with dashed-underline inline links and two buttons right.
4. Thin credibility strip of logos/tags, about 0.3 viewports.
5. Case studies, about 2 viewports: two-column grid of large rounded image cards, small colored eyebrow with the client area, one-line outcome headline below, one card shown as locked with a padlock.
6. Products, about 1.7 viewports: bento grid per product (icon tile, store badge, device mockups, big-number stat tile, voice-chip tile, phone and watch shots) on a soft tinted panel with a glow behind each tile.
7. Code experiments, about 0.9 viewports: cards with overlapping code-window thumbnails over an app screenshot, tech tag chips, a "load more" bar.
8. Other client work: auto-scrolling horizontal marquee of thumbnails.
9. Notes (writing), about 0.5 viewports: three-column text cards with truncated excerpts.
10. Pattern library for the niche (AI products): horizontal carousel of numbered cards with icon, category label, title, two-line rule, mono tags; arrows plus an "all" button.
11. Resume as a vertical timeline with a dot rail, each job a card with logo tile, role, dates and duration; download button in the heading row.
12. Work-together services: two large cards with checklists and primary plus secondary buttons.
13. A large illustrated vignette (ink-and-watercolor storefront scene) announcing the future shop, about 0.7 viewports.
14. Footer with many links, about 0.3 viewports.

## Hero

Split hero, type plus a custom generative object. A dotted-halftone globe in the accent hue sits left (WebGL dots with a 2D canvas layer), sized close to a square; the right column stacks a small uppercase eyebrow, a very large tight name, a long bio with muted tone and inline dashed links, then a filled primary button, an outlined secondary and an icon-only button. Four tiny corner brackets frame the hero like a viewfinder. The globe marks one point on the map and slowly turns; nothing else moves on load.

## Grid and spacing

Wide container with roughly 20 px side gutters at 1440 (almost full width, max content close to the viewport), mostly 2-column and bento grids with 12 to 20 px gaps. Sections have no vertical padding of their own: rhythm comes from generous eyebrow-plus-heading blocks and gaps of a few hundred pixels between collections. Cards use large radii and hairline borders. Bento tiles break the column rule by mixing 1x and 2x widths in one row.

## Typography

One neutral grotesque sans family for everything, a mono family only for tags and code-like labels (about 7 percent of text). Display is heavy weight, tight tracking, about 72 px at desktop and 36 px at 375 px. Body is 14 to 16 px, regular weight, line-height around 1.65; eyebrows are small uppercase with wide tracking in the accent hue; nav is uppercase small. Scale ratio is about 1.3. Weights are mostly regular with semibold reserved for headings.

## Palette

Warm off-white page, near-black text, one saturated burnt-orange accent used for eyebrows, primary buttons, the globe and the timeline dot. Tinted pastel panels (lavender, pink glow) appear only behind the product bento. Light theme by default with a dark toggle. Contrast character is calm and editorial; the accent is the only loud color outside project imagery.

## Density

High information per page, low per screen: one idea per section with a single heading and a repeated card pattern. Text-to-media balance leans to media in cases and products, to text in notes and resume. Whitespace is moderate; the page is long (about 12 viewports) and navigates by tabs.

## Motion

| Moment                              | Trigger       | Type              | Technique / library                                              | Confidence |
| ----------------------------------- | ------------- | ----------------- | ---------------------------------------------------------------- | ---------- |
| Hero globe                          | load, idle    | shader/3D         | dotted sphere drawn on a WebGL canvas, slow continuous rotation  | high       |
| Top ticker                          | load, idle    | marquee           | CSS or JS horizontal loop of one message                         | medium     |
| Sticky nav active tab               | scroll        | scrub (state)     | intersection observers highlight the tab of the section in view  | medium     |
| Section cards and thumbnails        | scroll        | scrub             | small transforms linked to scroll on a few elements, no pinning  | low        |
| Client-work strip, pattern carousel | load or click | marquee, carousel | auto-scroll strip, arrow-driven horizontal scroller              | medium     |
| Card hover                          | hover         | hover             | many elements with transitions (lift, tint, arrow nudge)         | low        |
| Smooth wheel                        | scroll        | eased scroll      | eased wheel response without a known smooth-scroll library class | low        |

## Libraries

Next.js (global, high). WebGL and Canvas 2D contexts (high) for the globe and small canvases. No GSAP, ScrollTrigger or Lenis detected. Analytics script and a blob storage host serve images; a CDN fetches data files for the globe (likely world geometry).

## What to take / what to avoid

Take: the concept of a person as a product with a tab nav that doubles as a table of contents; one handmade hero object in the accent hue instead of a stock photo; a self-aware status ticker; the locked-case-study card as honest NDA handling; outcome-first card headlines under large rounded imagery; bento tiles that show a product through several small facts (a stat, a voice chip, a device); a numbered pattern carousel as a thought-leadership layer; a dotted-line timeline for the resume; a playful illustrated "coming soon" vignette.
Avoid: nine nav items on one line (crowds mobile), a very long single page without per-collection landing pages, relying on dashed inline links for credibility, and copying the globe, the corner-bracket motif or the humor itself.
