---
url: 'https://experience2026.funtech.inc/'
slug: 'experience2026-funtech-inc'
date: '2026-10-21'
focus: '3D storytelling, scroll-linked WebGL scenes, typography and pacing'
libraries:
  - 'WebGL'
---

# experience2026-funtech-inc

## Summary

An immersive WebGL experience whose first and only captured screen is a retro terminal-style boot and preloader. It shows how a heavy 3D experience can turn its loading time into content: a log of asset categories with counters, progress bars and sizes, plus a "building" list that names the scenes about to appear. Worth learning from for preloader design, a visible fallback path, and a pared-back monospace typographic voice.

Recon gap: the document is exactly one viewport tall (scroller kind: document, 900 of 900 px), the wheel probe moved nothing and no scroll-linked trigger exists. The capture stopped at the preloader, so the 3D scenes, camera moves, chapters and transitions were NOT observed. The only evidence about them is the list of scene names shown by the preloader (a museum-like space and a monument-like space, plus two other warmed-up modules). Everything about later stages is inference, low confidence.

## Section map

Observed layers at 1440 px, all absolute or fixed over a single viewport:

1. A tiny status line (live region) announcing loading to assistive tech.
2. Full-viewport background layer (a soft dark vignette with a faint green glow).
3. The boot log block, upper left (about 0.9 vh tall): an introductory two-line system header, then a table-like list of loading lines with leader dots, counters, small bar meters and sizes, then decode, shader compile and "warming" or "building" lines.
4. A prompt glyph and a large block cursor, mid-screen, blinking.
5. A button (about 0.05 vh) that appears at the lower middle, presumably to start once loading ends.

One WebGL canvas exists behind these layers, rendered at a reduced internal resolution (about 85 percent of the CSS size, 1224 by 765 against 1440 by 900), a deliberate performance trade.

## Hero

Hero type: type-only terminal preloader over a hidden 3D scene. Composition: left-aligned text block anchored near the top-left with generous margins, large empty dark area below and right, a big blinking block cursor as the only graphic. Header line mentions that the graphics path is a fallback, an honest status that reassures. What moves on load: counters and bar meters climb across categories (models, textures, audio, fonts, data), lines turn from dim to bright as they complete, the cursor blinks. The loader finishes with an action button rather than auto-starting, which also unlocks audio.

## Grid and spacing

Monospace grid by nature: a fixed character grid with columns for label, counter, bar and size, aligned with leader dots. Left margin about 7 percent of the viewport. Line height tight (about 1.1), very regular vertical rhythm of one line per step. On 375 px the same block reflows to a shorter label set (labels shortened, bars narrower) and keeps the cursor centered below.

## Typography

Almost entirely monospace (99 percent of text), pixel or terminal-flavored, regular weight, no uppercase transform in body lines, uppercase only in the header. Mostly one size (about 26 px at desktop in the log) with one display-size element (the cursor glyph, about 111 px). Tight leading, no tracking tricks. A secondary sans is loaded from a third-party font host but barely used (about 1 percent of text), likely for the later experience.

## Palette

Dark theme: near-black neutral background, a single phosphor-green accent in two intensities (dim for pending, bright for done), a faint green ambient glow in the background. Very high contrast (about 16:1 measured). Monochrome by intent; the single hue makes the terminal metaphor.

## Density

Moderate inside the log (about 90 words across 19 short lines), but the screen itself is mostly empty. All content is status, no marketing text. One call to action.

## Motion

| Moment                           | Trigger                        | Type                 | Technique / library                                                                               | Confidence |
| -------------------------------- | ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| Boot log counters and bars       | load                           | reveal (progressive) | JS-driven DOM updates tied to real asset loading progress                                         | medium     |
| Cursor blink                     | load                           | loop                 | CSS or timer animation                                                                            | medium     |
| Idle scene render                | load                           | shader/3D            | WebGL2 canvas at reduced internal resolution, high frame rate (about 85 measured on an idle loop) | medium     |
| Shader compile and scene warm-up | load                           | pre-warm             | scenes built and shaders compiled off-screen before reveal                                        | medium     |
| Start button to scene            | click                          | page transition      | terminal to scene cut or fade (not observed)                                                      | low        |
| Scenes and chapter changes       | scroll or input (not captured) | scrub / camera move  | unknown; likely custom, no ScrollTrigger detected                                                 | low        |
| Hover states on controls         | hover                          | color shift          | CSS transitions (7 hover-transition elements)                                                     | low        |
| Reduced motion                   | media query                    | fallback             | reduced-motion rules present in CSS                                                               | medium     |

## Libraries

- WebGL: canvas context webgl2, high confidence. The header line states a fallback graphics path is in use, which is a sign of a capability check with a degraded renderer.
- Three.js, GSAP and Lenis: none detected. The scripts are likely bundled and custom (21 scripts, 50 fetch calls), so absence of a match is weak evidence. Do not infer the stack.
- Third-party hosts: a font service (two hosts, stylesheets and four font files). Nothing reported as unreachable or blocked.
- Total requests 106, a heavy experience; many fetches are probably model, texture, audio and data chunks.

## What to take / what to avoid

Take:

- Make the preloader part of the story: real per-category progress, counters, sizes, then an explicit start action. It honors autoplay and audio policies and hides shader compilation.
- Name what is being prepared (scenes warming up) so the wait previews the chapters.
- Show capability status honestly: say when a fallback renderer or reduced path is used.
- Render the canvas at a reduced internal resolution (around 80 to 90 percent) and keep the scene alive but cheap while idle.
- One typographic voice, one accent hue in two intensities, large empty space around a compact text block.
- Real text in the DOM and a live-region status for assistive tech.

Avoid:

- Copying the terminal metaphor, the system-header wording or the green-on-black look; it is a brand idea of this company.
- A start-gated experience without a no-JS and no-WebGL readable version; the landing must show its content without them.
- Assuming the 3D, camera and chapter patterns of the full site: they were not captured.
