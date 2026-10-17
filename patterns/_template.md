---
url: '{{url}}'
slug: '{{slug}}'
date: '{{YYYY-MM-DD}}'
focus: '{{what we like about this reference, in our own words}}'
libraries:
  - '{{library name, one per line; use `libraries: []` if none}}'
---

# {{slug}}

<!--
Rules (enforced by `npm run validate:patterns`):
- Replace every {{placeholder}}; unfilled placeholders fail validation.
- Describe, never copy: no site text, no asset or media URLs, no code, no hex or rgb()/hsl() colors,
  no brand font names, no quoted strings longer than 12 words.
- Own remarks that must quote something short can go on lines starting with "> note:".
- Keep the headings below exactly as written; every section needs content.
-->

## Summary

{{Two or three sentences: what kind of page it is and what makes its approach worth learning from.}}

## Section map

{{Ordered list of sections from top to bottom: role, approximate height in viewport units, layout idea. No copy.}}

## Hero

{{Hero type (full-bleed media, type-only, split, product shot, 3D/shader...), how the first screen is composed, what moves on load.}}

## Grid and spacing

{{Column system, max content width class, gutters, vertical rhythm, where the grid is deliberately broken.}}

## Typography

{{Generic classes only: for example "large grotesque display + serif body". Type scale ratio, weights, line-height habits, casing. No brand font names.}}

## Palette

{{Roles and tones only: for example "near-black background, warm saturated accent, one muted neutral". No color codes.}}

## Density

{{How much content per screen, whitespace share, number of ideas per section, text-to-media balance.}}

## Motion

| Moment                | Trigger                   | Type                                                           | Technique / library              | Confidence              |
| --------------------- | ------------------------- | -------------------------------------------------------------- | -------------------------------- | ----------------------- |
| {{where on the page}} | {{load, scroll or hover}} | {{reveal, pin, parallax, scrub, page transition or shader/3D}} | {{likely technique and library}} | {{high, medium or low}} |

## Libraries

{{Detected libraries and techniques, each with the evidence class (global, script name, network domain, DOM class) and confidence.}}

## What to take / what to avoid

{{Patterns worth reusing in an original landing, and parts that are too specific or too risky to imitate.}}
