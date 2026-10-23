---
url: 'https://craftsman-contractor-landing-page-v1.21st.app/'
slug: 'craftsman-contractor-21st-app'
date: '2026-10-23'
focus: 'polished sections, strong hero, trust signals'
libraries:
  - 'Next.js'
---

# craftsman-contractor-21st-app

## Summary

A local trade business landing (a tiling and flooring craftsman) built as a template. It is worth learning from for its craft discipline: every section is a clean light card system with consistent spacing, a dark photographic hero with proof figures right under the headline, and trust built in layers (credentials chips, figures, a project gallery with filters, a reviews row, a social profile card, a detailed contact form).

## Section map

1. Fixed header bar, about 0.1 viewport: wordmark left, five text links, a theme toggle and one bright accent action button right.
2. Hero, about 1.1 viewports: dark full-bleed interior photograph with a gradient scrim; left column with two small credential chips, a mono eyebrow, a two-line display headline (second line in the accent), a short paragraph, a row of three proof figures, a primary button and a secondary text button, then a small one-line social-proof note; a framed photo card with a thumbnail strip on the right.
3. Guidance section, about 1.7 viewports: centered small pill label, centered heading and paragraph, then a split of selectable option rows on the left and a large photo on the right; ends with a wide consultation card holding a heading, text and an action.
4. Technical feature section, about 1.4 viewports: two large spec cards side by side with a mono subline and a bullet list, then a row of four small icon cards.
5. Project gallery, about 1.8 viewports: a heading with a two-tone treatment, filter pills, and a three-column grid of project cards (photo with a corner tag, meta line, title, short text, spec tags).
6. Reviews, about 0.7 viewports: a row of four review cards with avatar initial, name, star row and short text, then a link to the full review source.
7. Social profile, about 1.5 viewports: a profile card with handle, follower figures and a follow action, then a grid of square posts.
8. Contact, about 1.1 viewports: contact details as stacked info cards on the left (phone, mail, address, hours, privacy note), a multi-field configurator form on the right with a slider and a file drop zone.
9. Footer, about 0.5 viewports: wordmark and blurb, link columns with mono prefixes, hours table, contact list, legal row.

## Hero

Dark full-bleed photograph with a left-to-right darkening scrim so the text column reads. Type-led left column (chips, eyebrow, two-line headline with an accent second line, paragraph, proof figures, two actions, proof note). The right side holds a smaller framed photo with a thumbnail strip that implies a gallery. Three elements fade in on load.

## Grid and spacing

Centered content of about 1280 px on a 12-column logic; most layouts are 2-column splits or 3-column card grids, one 4-column icon row. Spacing is built on a 4 px base with 8, 12 and 16 px gaps inside cards and generous vertical padding between sections. Cards have medium radii, hairline borders and very soft shadows on a pale tinted ground.

## Typography

A sans family for display and body, plus a mono family for small labels, eyebrows, tags and footer prefixes (about a quarter of the text). Scale ratio about 1.2, body 16 px with relaxed leading (about 1.6), large headings up to about 72 px with tight tracking. Some headings are uppercase, and one section heading splits into two colors. Labels are tiny and uppercase in mono.

## Palette

Light theme: near-white and pale cool-grey grounds, near-black text, one bright saturated cyan accent for actions, chips and highlighted words. The hero alone is dark (a photograph under a dark scrim). Contrast is high for text; the accent is used sparingly and consistently.

## Density

Moderate to high: each section carries one idea with several supporting cards. Text is short per card; media is real photography. Whitespace is regular rather than dramatic. Small mono metadata (tags, meta lines) adds a professional, spec-sheet feel.

## Motion

| Moment                    | Trigger | Type   | Technique / library                                       | Confidence |
| ------------------------- | ------- | ------ | --------------------------------------------------------- | ---------- |
| Hero content              | load    | reveal | short opacity fade of the left column items               | medium     |
| Cards in several sections | scroll  | reveal | fade and small lift (about 17 px) as cards enter          | medium     |
| Hero photo and gallery    | scroll  | scrub  | a few elements shift with scroll position, light parallax | low        |
| Buttons and cards         | hover   | reveal | soft color and shadow transitions (inferred)              | low        |

## Libraries

Next.js (high, global). No smooth-scroll library, no scroll-timeline library, no canvas or WebGL detected.

## What to take / what to avoid

Take: proof figures right under the hero headline; credential chips above it; a mono label system for metadata (tags, specs, eyebrows) that makes products feel precise; filter pills over a card grid; one consultation or call-to-action card per long section; a disciplined card system (one radius, hairline borders, soft shadow); a link to an external review source instead of claims. Avoid: invented reviews, star rows or follower counts (only real, verifiable numbers); the multi-field configurator form (out of scope for a static landing); the light trade-business look as a whole and the specific hero composition.
