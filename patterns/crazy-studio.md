---
url: 'https://crazy.studio/en'
slug: 'crazy-studio'
date: '2026-10-21'
focus: '3D storytelling, scroll-linked WebGL scenes, typography and pacing'
libraries:
  - 'Three.js'
  - 'WebGL'
  - 'Canvas 2D'
  - 'GSAP'
  - 'Vue'
---

# crazy-studio

## Summary

A studio site presented as a walk through a single dark, atmospheric 3D interior instead of a conventional page. Recon captured only the first screen (an entry gate over the scene), because the experience is driven by a full-viewport fixed canvas and not by document scroll. It is worth learning from for its chapter framing, its consent-style entry choice and its restrained type over a heavy scene.

Recon gap: the document is exactly one viewport tall (scroller kind: document, 900 px of 900 px), the wheel probe moved nothing, and no scroll-linked trigger was found. Later stages of the experience (chapters, camera moves, transitions) were NOT observed. Everything below about later stages is inferred from the first screen and the mobile chapter card, and is marked low confidence.

## Section map

Observed structure at 1440 px (three top-level layers, one viewport tall in total):

1. Hidden heading layer: the one H1 and a few links, positioned off-screen for semantics and accessibility (0 vh).
2. Fixed full-viewport canvas (1 vh): the 3D scene, always behind everything.
3. Fixed overlay card near the lower third (about 0.3 vh): a short consent line, two large side-by-side choices (a normal entry and a quiet entry that leaves no trace), each with a small caption and a small arched icon.

At 375 px the first screen is different: a chapter card ("part one" eyebrow, a one-line statement, a thin rule, a small caption) sits centered over a darkened scene, with thin corner brackets framing the viewport. This suggests the experience is chaptered, each chapter a short centered statement over the scene.

## Hero

Hero type: 3D / full-bleed scene, no page chrome. The first screen shows a deep one-point-perspective interior (long hall, tall narrow windows at the far end, a shaft of light, a small silhouette at the vanishing point, polished stone floor in the foreground). The composition guides the eye along the central axis to the light. Over it: a small widely tracked uppercase welcome line, a single glowing dot (a cursor or progress marker), and the two entry choices. The scene looks like a pre-rendered or video-textured plate with light shafts and drifting particles rather than live geometry (low confidence, judged from screenshots and the combined 2D and WebGL contexts).

On load: the scene fades up from black on small screens (the mobile capture was mid-fade), idle animation runs at a low frame rate (around 20 fps measured), suggesting a throttled render loop.

## Grid and spacing

No grid in the usual sense. One narrow centered column (content width about 510 px, 3-column grid used once for the two choices plus a divider). Generous empty space; the overlay card sits in the lower third so the vanishing point stays clear. Spacing is mostly multiples of 4 and 8, with small gaps (about 8 px) inside choices. Corner brackets frame the viewport on mobile, a cinematic-viewfinder device.

## Typography

Single clean sans family at two weights (regular dominant, bold for the choices). Small sizes (11 to 16 px) for almost everything; one larger statement size (about 32 px) at desktop. Uppercase with very wide tracking for eyebrows and labels, sentence case for the privacy line. Body line-height about 1.55. Light, thin-looking text over a dark scene; type never competes with the image.

## Palette

Dark theme: near-black neutral background, near-white neutral text, one cool desaturated blue-gray cast over the whole scene, one vivid cool accent used sparingly. Very high text contrast (about 19:1 measured on body text) but over a photographic scene, so the overlay lines rely on shadow and placement rather than a backing panel.

## Density

Extremely low: about 58 words total on the first screen, two actions, one idea. Text-to-media ratio is almost all media. The pacing idea is "one statement per screen", leaving the scene to carry the mood.

## Motion

| Moment                                                    | Trigger                        | Type                                                  | Technique / library                                | Confidence |
| --------------------------------------------------------- | ------------------------------ | ----------------------------------------------------- | -------------------------------------------------- | ---------- |
| Entry gate over the scene                                 | load                           | shader/3D (scene plus overlay)                        | full-viewport fixed WebGL canvas, overlay in DOM   | high       |
| Scene idle (light shafts, particles, subtle camera drift) | load / idle                    | shader/3D                                             | live render loop throttled to a low frame rate     | low        |
| Chosen entry to first chapter                             | click                          | page transition (scene fade from black, chapter card) | tweening library, likely GSAP                      | low        |
| Chapter statements                                        | scroll or wheel (not captured) | scrub / camera move                                   | virtual scroll driving a camera path on the canvas | low        |
| Choices and links                                         | hover                          | reveal / color shift                                  | CSS transitions (2 hover-transition elements)      | low        |
| Reduced motion                                            | media query                    | fallback                                              | reduced-motion rules present in CSS                | medium     |

## Libraries

- Three.js: likely, script name match only, medium confidence.
- WebGL: canvas context webgl2, high confidence. A 2D canvas context is also present (high), probably for a texture, mask or particle layer.
- GSAP: likely, script name match only, medium confidence.
- Vue: global DOM marker, high confidence (the overlay UI is a Vue app; the 3D lives in a separate canvas).
- No Lenis class and no ScrollTrigger instances found. Eased wheel scroll: not detected. Everything is same-origin: no third-party hosts, nothing blocked.
- Canvas is full viewport, 1440 by 900 CSS px at device pixel ratio 1 in the capture. Total requests were 41 with 8 fetch calls (likely data or media), a small payload for a 3D site.

## What to take / what to avoid

Take:

- A fixed full-viewport canvas behind everything, with all text in ordinary DOM layered above (keeps text real, selectable and accessible).
- A poster-first entry gate: a calm still composition with one clear call to action, then the scene starts after a click. This is also a natural place to ask about sound or motion.
- A choice between a full experience and a quiet, low-impact version, which doubles as the reduced-motion and low-power fallback.
- Chapter cards: a small numbered eyebrow, one short statement, a thin rule, a caption, centered; one idea per screen.
- Compose scene frames along a central axis with a light source at the far end to draw the eye; keep overlays in the lower third.
- Heavily tracked small uppercase labels with a thin sans over a dark image; corner brackets as a framing device.
- Throttle the idle render loop and keep a hidden semantic heading layer.

Avoid:

- Copying the interior, the silhouette gag, the entry wording or the corner-bracket look wholesale; they are this studio's identity.
- A first screen that is a consent-style gate with no visible content if no fallback exists; the landing must remain readable without WebGL and without JavaScript.
- Assuming the later stages work as inferred above; they were not observed.
