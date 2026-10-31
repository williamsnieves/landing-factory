# Proposal: add-product-led-saas-archetype

## Why

The catalog has ten archetypes and none of them is a software product page. Four of our reference sheets describe one (`linear-app`, `vercel-com`, `stripe-com`, `framer-com`), and they agree on a grammar the catalog lacks:

- a short headline over a large framed interface shot, cropped by the fold;
- headings in two tones: the first clause bright, the continuation muted;
- a row of customer marks right under the hero;
- calm neutral pages, one saturated action color, huge gaps between modules and dense detail inside them.

Today a SaaS brief ranks `bento-product-showcase` or `data-and-proof` first, or falls back to `archetype: custom`. The result is either a tile grid that does not fit a product story, or a reference-led page with no sheet to check it against. A SaaS customer is a likely first prospect (the owner's own track, `docs/channels.md`), so the gap shows early. The owner listed this archetype as the next step after `add-landing-restyle` (`docs/status.md`, 2026-10-31).

## What Changes

- **New sheet `design-archetypes/product-led-saas.md`.** It follows the existing format and passes `npm run validate:archetypes`:
  - signals it fits: `technical`, `premium`, `conversion-first`, `product-showcase`, `calm`, `few-assets`;
  - signals it avoids: `heritage`, `craft`, `local-service`, `playful`, `editorial-content`;
  - heroes: `typographic` (a centered headline over the frame), `split` and `video`;
  - signature ranges of its own.
- **Three new lendable traits**, owned by the new sheet:
  - `ui-frame-hero`: the product interface in a rounded hairline frame, the hero's visual;
  - `two-tone-heading`: a heading whose lead clause is full contrast and whose continuation is muted;
  - `logo-strip-under-hero`: one quiet row of customer marks under the hero.
- **Honesty rules in the sheet.** These turn the reference grammar into something safe to generate:
  - The interface frame shows the customer's own screenshots (brief assets) or an abstract HTML/CSS mock. It never shows invented metrics, customer names or features the brief does not state.
  - The logo strip uses only marks the customer supplies with permission. Without them the strip is left out or becomes a strip of brief facts. Placeholder or invented logos are never used.
  - No invented testimonials, ratings or usage numbers.
- **Ranking.** `TRAITS` in `scripts/lib/archetypes.mjs` gains the three traits. `pick-archetypes` gains `REF_RULES` that read them from reference sheets: interface shot or product UI, two-tone, logo strip or customer marks. The four reference sheets then lend them as `ref:<sheet>/<trait>`.
- **Docs.** The `design-archetypes/README.md` trait table and catalog, and CLAUDE.md "Design archetypes" (eleven sheets).

## Out of scope

- A new hero type: the UI frame is expressed with the existing `typographic`, `split` and `video` heroes, so `landing-meta`, the directions schema and the diversity trio are unchanged.
- Generating a landing with the new archetype. A real build is a separate run the owner decides on, for example the first SaaS prospect in `add-prospect-landings`.
- Changes to existing sites: their recorded blends stay valid.

## Impact

- New: `design-archetypes/product-led-saas.md`.
- Changed: `scripts/lib/archetypes.mjs` (`TRAITS`), `scripts/pick-archetypes.mjs` (`REF_RULES`), `design-archetypes/README.md`, CLAUDE.md, `tests/archetypes.test.mjs` (catalog count) and `tests/pick-archetypes.test.mjs`.
- Spec: `design-archetypes` (the catalog requirement gains the product-led archetype and its honesty rules).
- No new dependency, no network, no site rebuilt. `scripts/lib/` is a shared CI path, so CI re-runs every site's QA; nothing in the sites changes.
