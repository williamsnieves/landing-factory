# Tasks

## 1. Vocabulary and ranking

- [x] 1.1 `scripts/lib/archetypes.mjs`: add `ui-frame-hero`, `two-tone-heading`, `logo-strip-under-hero` to `TRAITS`.

  Verify: `npm run validate:archetypes` still passes on the ten sheets until 2.1 adds the owner (an owner-less trait must be reported; add the sheet in the same commit).
- [x] 1.2 `scripts/pick-archetypes.mjs`: the `REF_RULES` of design Decision 4, tuned against the real text of `patterns/linear-app.md`, `vercel-com.md`, `stripe-com.md` and `framer-com.md`.

  Verify in `tests/pick-archetypes.test.mjs`: each of the four sheets yields at least one of the three traits, and together they yield all three.

## 2. Sheet

- [x] 2.1 `design-archetypes/product-led-saas.md` per design Decisions 2 and 3, with the honesty rules in Do and Don't.

  Verify:
  - `npm run validate:archetypes` reports 11 valid sheets;
  - `tests/archetypes.test.mjs` with the counts updated (11 sheets, 12 files), unique signatures and the README listing every trait;
  - a pick-archetypes test: a brief with `technical, premium, conversion-first, few-assets` ranks `product-led-saas` first; a brief with `local-service, craft` does not.
- [x] 2.2 `design-archetypes/README.md`: the three traits in the trait table and the catalog row.

## 3. Docs

- [x] 3.1 CLAUDE.md "Design archetypes" (eleven sheets) and `docs/status.md` (this change in progress).

  Verify: review and `npx prettier --check .`.

## 4. Checks

- [x] 4.1 `npm test`, `npm run lint`, `npx prettier --check .`, `openspec validate add-product-led-saas-archetype --strict`, then the same in a clean clone of the branch.
