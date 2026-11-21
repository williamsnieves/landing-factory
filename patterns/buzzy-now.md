---
url: 'https://www.buzzy.now/es/models/kling-4-0'
slug: 'buzzy-now'
date: '2026-11-20'
focus: 'video-led landing: full-bleed video hero and video galleries'
libraries:
  - 'Vue (Nuxt)'
  - 'IntersectionObserver'
---

# buzzy-now

<!--
Rules (enforced by `npm run validate:patterns`):
- Describe, never copy.
-->

## Summary

A product page for an AI video model inside a creative-tools platform. Moving footage is the material of the page: a looping clip fills the whole first screen behind the headline, every feature row pairs a short muted loop with its text, and a dark gallery strip of clips sits in the middle. It is worth learning from because the page lets video carry the mood while the text stays short and the layout stays plain: alternating dark and light bands, a centred statement per band, and media that always sits in a rounded frame with a darkening scrim when text is on top.

## Section map

1. Promotion strip and header (about 0.1 viewport): a thin full-width offer bar, then a transparent header over the hero with the wordmark, a row of navigation items, a language pill and one bright pill button.
2. Hero (about 1.3 viewports, dark): a full-bleed looping clip, heavily darkened, behind a centred two-line display headline (one phrase set in an italic serif for contrast) and a short centred paragraph; below, a wide rounded panel splits into a tool form on the left and a framed video preview on the right that overlaps the bottom of the hero.
3. Feature rows (about 2 viewports, light): a centred section title with a short lead, then four alternating rows, each a rounded media frame (looping clip or product interface shot) on one side and a heading, two short paragraphs and a dark pill button on the other.
4. Steps (about 1.5 viewports, very light grey): centred title and lead, then numbered steps, each with a framed image and an uppercase step label.
5. Gallery (about 1 viewport, near-black): a large centred word with a gradient fill, one bright pill button, a row of category chips as filters, and a masonry of muted autoplay clips that load as they come into view.
6. Reasons (about 1 viewport, near-black): a large left statement with a stack of dark rounded cards on the right, each with an arrow icon, a heading and a short sentence.
7. Long reference text (about 4 viewports, near-black): a specification table and many subheaded paragraphs in a single reading column, plainly set.
8. Related models carousel (about 1 viewport, near-black): a centred title mixing the sans with an italic serif phrase, then a carousel of video thumbnails with round arrow buttons.
9. Footer: dark, multi-column link lists.

## Hero

Full-bleed video hero. The clip covers the viewport behind everything, darkened by a strong overlay so white display type keeps contrast; the headline is centred over it with an italic serif phrase inside the sans line. The hero does not end at the fold: a wide rounded panel (form plus a second, framed and undarkened video preview) starts inside the first screen and overlaps the next band, so the visitor sees two layers of footage at once: atmosphere behind, the product's output in front. Nothing animates on load beyond the video playing.

## Grid and spacing

A centred container of about 1200 px inside full-bleed bands; feature rows are two equal columns with a wide gutter, the gallery and steps use three columns. Bands are separated by large vertical padding (well over one hundred pixels at desktop), with the content of each band centred under a centred title. Spacing does not follow a strict 8 px scale; gaps between chips and cards are small (4 to 8 px), gaps between blocks large. The grid is broken on purpose only once: the hero panel crosses from the dark hero band into the next one.

## Typography

A geometric sans for everything (headings, body, buttons), with one contrast device: a single italic serif phrase inside some display headlines. Display sizes reach about 56 to 62 px at desktop and drop to about 30 px on phones, with a low scale ratio between the smaller steps; body text 16 px with a generous 1.6 line height, headings at 1.25 to 1.3. Mostly regular weight; medium and semibold only for headings and buttons. Sentence case throughout, with uppercase reserved for small step labels.

## Palette

Two themes alternate by band: near-black bands for the hero, gallery and reference text, near-white and very light grey bands for features and steps. One bright, saturated warm-yellow accent is used only for primary pill buttons and active controls; secondary buttons are near-black pills on light bands. Video provides all the remaining color; the interface itself stays neutral. Gradients appear only as darkening scrims over video and as a soft fill on one large word.

## Density

Low in the bands that carry video: one idea per band, one clip per idea, short paragraphs. High in the long reference section, which reads like documentation and is plainly set. Text-to-media balance is about even in feature rows, media-dominant in the hero and gallery.

## Motion

| Moment                   | Trigger | Type                       | Technique / library                                     | Confidence |
| ------------------------ | ------- | -------------------------- | ------------------------------------------------------- | ---------- |
| Hero background          | load    | looping muted video        | native video element, autoplay, muted, inline, looped   | high       |
| Feature row media        | scroll  | video starts when in view  | IntersectionObserver toggling playback and lazy sources | medium     |
| Gallery clips            | scroll  | lazy-loaded autoplay clips | IntersectionObserver, sources attached on entry         | medium     |
| Buttons, chips and cards | hover   | color and lift transitions | CSS transitions                                         | low        |
| Related models carousel  | click   | horizontal slide           | component carousel with arrow buttons                   | medium     |

## Libraries

Vue, high (global object); the earlier load also reported Nuxt as a global, high. Many IntersectionObservers (about 27), consistent with lazy media and play-in-view. No scroll-driven animation library, no smooth scroll, no canvas or WebGL; the page declares reduced-motion rules. Analytics and payment scripts from third parties are present and are not patterns to take.

## What to take / what to avoid

Take: a full-bleed muted looping video behind a centred statement, with a strong scrim for contrast; a hero that hands over to a second, framed clip overlapping the next band; feature rows that pair one short looping clip with one idea; a gallery of clips that only load and play when visible; alternating dark and light bands so video sits on dark; one bright accent used only for the main action; an italic serif phrase as the single typographic contrast.

Avoid: a promotion bar with a running countdown (a dark pattern the factory refuses); autoplay with sound; many clips playing at once off-screen; very long documentation text on a landing; third-party trackers loaded at first view; any footage, frames or interface shots of the reference itself. For our pages, every clip needs a poster image, no playback under reduced motion, a size budget, and a plain image without JavaScript.
