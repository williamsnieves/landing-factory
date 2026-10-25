---
url: 'https://sankar.work/'
slug: 'sankar-work'
date: '2026-10-25'
focus: 'palette in generic terms, and how projects are shown'
libraries:
  - 'Three.js'
  - 'Lottie'
  - 'Canvas 2D'
---

# sankar-work

<!--
Rules (enforced by `npm run validate:patterns`):
- Describe, never copy.
-->

## Summary

A dark, gadget-rich portfolio of a product manager: a centered hero, then a very long scroll of "interactive widgets" (project cards, a scenario game, a live repository activity feed, skills dashboards, a search palette, a language-greeting pill). It is worth studying for its glowing dark palette and for the many different formats it uses to present projects, not for its density, which is extreme.

## Section map

1. Fixed top bar: script-style wordmark, dropdown nav items, a gradient pill that cycles greetings in other languages, a search field with a keyboard shortcut hint, a day/night illustration toggle, and a scroll-progress line under the bar.
2. Hero, about 1.1 viewports: animated atom icon, status and award pills, large two-line name with the second line in a blue-to-teal gradient, role line, muted summary, two buttons.
3. Side-docked award badge (fixed, glowing, vertical text) and a floating back-to-top rocket button.
4. Summary and metrics strip, about 1 viewport.
5. Experience long block, about 2 viewports of text.
6. Skill and domain areas, about 2 viewports.
7. Projects, about 3.8 viewports: a 3-column grid of cards.
8. "Explore" lab cards in a dashed outline, tagged soon or live, about 1 viewport.
9. An interactive scenario widget styled as a chat message with three choice chips and a step counter.
10. Credentials and tech-stack dashboards with segmented proficiency bars.
11. Recent activity feed as a vertical timeline pulled from a code host, plus a stylized city-skyline "build activity" chart.
12. Many more widget sections (about 30 blocks in total), then a short footer.

## Hero

Centered stack on a near-black field with soft blue and violet radial glows. A small glowing animated emblem sits above, then status pills in cool, gold and green gradients, then the huge name with a gradient on the surname, a muted role line, a three-line summary and two pill buttons (filled gradient, ghost with an animated underline). Pills and emblem animate on load; a few small heart icons float up beside the docked badge.

## Grid and spacing

Content column about 1100 px wide centered with generous side space; cards in 3-column grids with about 24 px gaps and large radii; section padding about 96 px top and bottom with hairline dividers between sections. Fixed chrome overlays (top bar, badge, back-to-top) occupy the edges. At 375 px the page overflows horizontally, which is a defect to avoid.

## Typography

Geometric grotesque for display and body, a mono face for code and activity, and a script face only for the wordmark. Display about 88 px at desktop, medium to bold weight; section labels are small uppercase with wide tracking in the blue accent; card titles 18 to 20 px semibold; body 14 to 16 px in a muted tone. Heavy use of pill chips and tiny uppercase tags.

## Palette

Near-black, cool-tinted navy background; surfaces one step lighter with thin cool borders. Accent set is cool and electric: bright blue to cyan gradient for primary actions and the name, a violet second accent for category tags, a green for "live" and expert states, and a warm gold used only for awards and highlights. Text is near-white with a mid-light cool gray for secondary copy. Heavy glow and gradient use (hundreds of gradient elements). Dark theme only, with a decorative day/night toggle. Some secondary text has weak contrast.

## Density

Extremely high: around 30 blocks and 5,000 words, several widgets per screen, emoji used as icons. Whitespace appears only between sections. Text-to-media balance leans heavily to text and chips; images are scarce and icons are mostly emoji.

## Motion

| Moment                                         | Trigger    | Type             | Technique / library                                             | Confidence |
| ---------------------------------------------- | ---------- | ---------------- | --------------------------------------------------------------- | ---------- |
| Hero emblem and background                     | load, idle | shader/3D        | Lottie player and a small Three.js scene for background effects | high       |
| Hero pills and text                            | load       | reveal           | short opacity and small upward offset                           | medium     |
| Scroll-progress line under the bar             | scroll     | scrub            | width bound to scroll position                                  | medium     |
| One mid-page block                             | scroll     | pin              | fixed positioning held across a long scroll range               | medium     |
| Section content                                | scroll     | reveal           | opacity 0 to 1 with about 30 px upward offset on intersection   | high       |
| Hero layers                                    | scroll     | parallax         | low-ratio offsets (up to about 0.86 of scroll speed)            | medium     |
| Greeting pill                                  | idle       | text swap        | cycles words and language codes on a timer                      | high       |
| Project cards                                  | hover      | hover            | border glow and lift                                            | low        |
| Skyline chart, floating hearts, small canvases | idle       | canvas animation | 2D canvas loops, about 15 canvases                              | high       |

## Libraries

Three.js (global and script name, high), Lottie (global and script name, high), Canvas 2D (high). Fonts and icons from third-party hosts, a code-host API for the live feed, favicon images fetched from a search-engine host, and an awards site for badge images.

## What to take / what to avoid

Take: the glowing cool-dark palette with one warm highlight reserved for recognition; project cards with a tinted header strip, category chips, a short description and a highlighted outcome box with bold metrics; a status tag on cards (live, soon) with a dashed treatment for unreleased work; letting the visitor interact with a scenario instead of reading a case study; a live activity timeline as proof of ongoing work; a top bar with a command-palette style search; segmented bars for skills.
Avoid: 30 sections, emoji as the icon system, always-on gradients and glows everywhere, a fixed side badge covering content, fixed overlays on mobile, weak secondary text contrast, third-party image hosts that fail (broken badge images), and the horizontal overflow at 375 px.
