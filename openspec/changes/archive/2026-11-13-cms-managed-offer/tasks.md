# Tasks: cms-managed-offer

## 1. CMS ownership

- [x] 1.1 `scripts/lib/cms-config.mjs`: export `cmsOwnsOffer(siteDir)` (true only when `.pages.yml` exists, passes `readCmsConfig` with no problems and has a `content[]` entry with `name: offer`). Verify: unit tests for valid with entry, valid without, invalid with entry, no file.
- [x] 1.2 `scripts/cms.mjs check`: print `CMS owns the brief's offer` when it applies. Verify: test on the output.

## 2. Final check

- [x] 2.1 `scripts/check-landing.mjs`: `briefFacts(brief, { skipOffer })`; the `brief-facts` rule passes `skipOffer` from `cmsOwnsOffer` and adds one warning `brief-facts-cms-offer`. Verify: tests with a fixture site (offer entry and a page missing a price passes with the warning; same without the entry fails naming `offer[i].price`; business name still required).
- [x] 2.2 Help text and header comment of `check-landing.mjs` name the new warning. Verify: read.

## 3. Docs

- [x] 3.1 `docs/cms.md` "Products and the brief"; CLAUDE.md "Git CMS" and "Customer brief" (`brief-facts` line). Verify: Prettier check.

## 4. Checks

- [x] 4.1 `openspec validate cms-managed-offer --strict`, `npm test`, `npm run lint`, `npm run format:check`, and `check-landing` on tupathdigital and personal-brand unchanged. Verify: all pass.
