# Proposal: add-reference-archetypes

## Why

The owner asked (2026-11-11) for creative archetypes from current references: AI product sites and a creative release page. Two references were analyzed into pattern sheets (`patterns/claude-dev.md`, `patterns/shopify-editions.md`; openai.com answered 403 to automated access and was not analyzed). Their grammars are not covered by the 12 sheets: none maps the whole page in its first screen or gives each chapter its own colour field, and none uses the "developer tool" typesetting (monospaced metadata, key hints, an index list as the hero) that defines today's AI and developer sites.

## What Changes

- **`chaptered-atlas`** (impact `balanced`, `bold`): a page that maps itself in the first screen (a numbered index or a generative network diagram of its 4 to 6 chapters that doubles as navigation), a giant display word set vertically along one edge as the edition or brand mark, chapters that each take over the screen with their own saturated colour field, a fixed chapter rail with a live indicator, a two-level type scale (huge chapter titles, small notes in columns), and feature cards whose screenshot or image bleeds off one edge. Fits `bold`, `product-showcase`, `storytelling`, `experimental`, `editorial-content`, `technical`; avoids `calm`, `local-service`, `heritage`. Lends `self-map-hero` and `chapter-color-fields`. Guard rails written in the sheet: at most 6 chapters, a reduced-motion form with static colour fields and a drawn (not animated) diagram, every field checked for 4.5:1 text contrast, one canvas at most on phones.
- **`dev-console`** (impact `quiet`, `balanced`): the developer-tool look of current AI and software sites. Monospaced uppercase metadata with bracketed key hints, a humanist sans for titles and reading text, a warm near-white ground with one accent, the content itself as the hero (an index, changelog or release list of hairline-separated rows with mono metadata pushed to both edges), a fixed identity column beside the list, one small original motif (pixel or grid drawn in code) as the only illustration, and a generative dot field as a closing scene instead of a photo. Fits `technical`, `product-showcase`, `editorial-content`, `few-assets`, `calm`, `educational`; avoids `heritage`, `playful`, `photo-rich`, `local-service`. Lends `mono-meta-rows` and `generative-dot-field`. Guard rails: key hints only when the shortcuts work (else plain labels), never a brand's mascot or icon set, the list needs enough real entries from the brief (else use another archetype).
- **Catalog and picker.** Both sheets (front matter with signals, impact, lends, rejects, hero, signature ranges; every body section) join `design-archetypes/`, the README catalog and traits table. `REF_RULES` in `pick-archetypes.mjs` gains keyword rules so the two new reference sheets map onto the vocabulary (`--refs claude-dev` leads to `dev-console`, `--refs shopify-editions` to `chaptered-atlas`). CLAUDE.md says 14 sheets.

## Capabilities

### Modified Capabilities

- `design-archetypes`: two new archetypes, four new traits, reference rules for the two new pattern sheets.

## Impact

- New: `design-archetypes/chaptered-atlas.md`, `design-archetypes/dev-console.md`.
- Modified: `design-archetypes/README.md`, `scripts/pick-archetypes.mjs` (`REF_RULES` only; no scoring change), tests (`tests/pick-archetypes*.test.mjs`, archetype validation fixtures if they count sheets), CLAUDE.md, `docs/status.md`.
- Also on this branch: the two pattern sheets (already committed) and the archive of `add-newsletter`.
- No site changes; existing rankings for existing briefs must not change except where a new sheet now fits better, which the tests record.
