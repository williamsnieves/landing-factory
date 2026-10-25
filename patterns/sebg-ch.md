---
url: 'https://www.sebg.ch/'
slug: 'sebg-ch'
date: '2026-10-25'
focus: 'a mascot that moves through each section, driven by scroll'
libraries:
  - 'Lenis'
  - 'ScrollTrigger'
  - 'SplitText'
  - 'WebGL'
  - 'Canvas 2D'
  - 'View Transitions'
---

# sebg-ch

<!--
Rules (enforced by `npm run validate:patterns`):
- Describe, never copy.
-->

## Summary

A short, very visual developer portfolio whose idea is a one-bit, dithered cartoon portrait of the owner who follows the visitor down the page, changes pose and expression per section, and talks through speech bubbles. Only five sections and under 300 words, so the character and the scroll choreography carry the whole page. It is the clearest example here of a mascot used as a narrative device.

## Section map

1. Hero, 1 viewport: saturated flat color field, tiny name and role top left, pill contact button top right, giant three-line statement bottom left, character bottom right with a speech bubble.
2. About, about 1.5 viewports: light page, character moves to the left edge, a large statement paragraph on the right with one phrase highlighted in the accent.
3. Projects showcase, about 7.5 viewports of scroll, one pinned stage: the character stays at the bottom, and for each project the background color changes, a big project title and a "view" pill appear, a browser-window mockup and a phone mockup slide in, and a speech bubble comments on one detail. Eight to ten projects in sequence.
4. Archive grid, about 4 viewports: light page, a 3-column then 2-column grid of rounded mockup photographs with project name left and year right under each.
5. Contact, 1 viewport: near-black field, a huge question headline, the character in a circular badge.
6. Persistent mute toggle for sound, bottom right, and a faint 12-column guide-line overlay behind everything.

## Hero

Type-led split with a color-block background. The statement is set at about 137 px, tight leading, three lines, with the last word in a lighter weight; the character sits in the right third, bust only, cropped by the viewport bottom; a speech bubble above it fades in. Faint vertical guide lines make the 12-column grid visible. On load the headline and bubble reveal with a vertical offset.

## Grid and spacing

Twelve-column grid shown as hairlines, page margin about 40 px, content text starts at column 6 or 7 for the statement, mockups span 6 to 8 columns, grid cards 4 or 5 columns wide with 24 px gutters. Vertical padding is large for the archive (about 144 to 216 px). The character and the speech bubble intentionally break out of columns and overlap mockups.

## Typography

One wide, geometric grotesque with a light and a bold cut used together in the same headline; display about 137 px desktop, 52 px at 375 px; statement paragraphs about 40 px, bold; small UI labels 14 to 16 px. Sentence case everywhere, tight tracking on display, minimal body copy. One highlighted phrase per statement in the accent hue.

## Palette

Each section owns a flat, saturated background: electric blue (hero), warm off-white (about, archive), deep navy, lilac, soft purple, sunny yellow (project stages, one per project, chosen to complement the project), near-black (contact). The character is pure black and white halftone, so it works on any background. Text is near-black or near-white; accents are a bright blue and, per project, a hue taken from that project. Contrast character is poster-like and playful; the color change per project is the main rhythm.

## Density

Very low. About ten words per project stage, one idea per screen, a lot of empty colored space, and the largest text on the page is a single sentence. Text-to-media ratio is almost all media after the intro. The archive grid is the only dense block.

## Motion

| Moment                            | Trigger | Type            | Technique / library                                                                                                                                                                          | Confidence |
| --------------------------------- | ------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Whole page scroll                 | scroll  | eased scroll    | smooth-scroll library driving a single scroll position                                                                                                                                       | high       |
| Hero text and bubble              | load    | reveal          | split-text lines revealed with offset and fade                                                                                                                                               | medium     |
| Character moving between sections | scroll  | pin+scrub       | a sticky stage; the character is a canvas (halftone dither rendered by a shader) or a stack of pre-rendered frames switched by scroll progress, with position tweened between left and right | medium     |
| Pose and expression changes       | scroll  | scrub           | frame or sprite swap per project step (waves, points, wears a hat, wears glasses, covers mouth)                                                                                              | medium     |
| Project stage sequence            | scroll  | pin+scrub       | one sticky section about 7 viewports tall, timeline of steps: background color tween, title swap, mockups slide in from edges, bubble text appears                                           | medium     |
| Dither dissolve on mockups        | scroll  | shader/3D       | mockup images pass through a dither/halftone threshold effect when entering or leaving, so they resolve from dots                                                                            | medium     |
| Archive cards                     | scroll  | reveal          | fade or dot-dissolve on enter                                                                                                                                                                | low        |
| Contact character badge           | scroll  | position tween  | character shrinks into a circle and slides to the contact block                                                                                                                              | low        |
| Route changes                     | click   | page transition | view-transition names present on one element                                                                                                                                                 | low        |
| Sound                             | click   | audio           | opt-in mute toggle, off by default                                                                                                                                                           | medium     |

## Libraries

Lenis (global instance and html class, high). GSAP ScrollTrigger and SplitText (script names, medium; bundled so shown as likely). WebGL and Canvas 2D contexts (high), one full-viewport and one smaller. View Transitions (one named element, medium). Everything is served from the site's own origin, no third-party hosts.

## What to take / what to avoid

Take: a mascot (an illustrated or stylized portrait of the owner) as the one continuous narrative thread; one sticky stage with a scroll-driven timeline so the page changes state without leaving the viewport; background color as the section identity, tuned per project; speech bubbles as micro-copy that explains one detail of the work; browser and phone mockups sliding in from opposite sides; a dithered or halftone treatment tied to the character; statement-sized type with one weight contrast; a visible column grid as decoration; a quiet archive grid after the show; a reduced-motion fallback that shows the mascot static and each project as a normal block with a poster.
Avoid: copying the character style, the dither look or the bubble jokes; a 7-viewport pinned section without a skip link or progress hint; autoplaying audio; relying on scroll hijacking at 375 px; mockups that are the only way to see the work (add real links); contrast of text over dithered backgrounds, which can fail accessibility.
