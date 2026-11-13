# Proposal: cms-managed-offer

## Why

tupathdigital moves its catalog to the Git CMS (owner decision 2026-11-13: products live in a CMS collection, coupons are a CMS list, a new product without a cover shows a text card until the factory adds the cover). Today `check-landing` `brief-facts` fails when a product name or price of `brief.json` `offer[]` is missing from the page. Once the owner edits or removes a product in Pages CMS, the brief no longer describes the page, and the next final check of the site would fail on a fact the owner changed on purpose. The brief must not be rewritten by every CMS save, so the check needs to know when the CMS owns the offer.

## What Changes

- **A CMS entry named `offer` owns the brief's offer.** A site whose `.pages.yml` is valid and has a `content[]` entry with `name: offer` declares that the CMS manages its products. `name` is an identifier the editor never sees (the editor shows `label`).
- **`brief-facts` skips `offer[]` on such a site.** Product names and prices are not required on the page; the final check prints one warning, `brief-facts-cms-offer`, saying the offer is managed by the CMS and the brief's `offer` is the starting record. Business name, primary call-to-action URL, contact email and phone are still checked. A site without that entry is unchanged.
- **`cms.mjs check` prints which brief sections the CMS owns** (today only `offer`), so a person sees it before an export.
- **Docs.** `docs/cms.md` (a "Products and the brief" section) and CLAUDE.md "Git CMS" and "Customer brief".

## Capabilities

### Modified Capabilities

- `landing-generation`: the brief facts on the page leave out the offer when the CMS manages it.
- `git-cms`: an entry named `offer` declares the CMS owns the brief's offer.

## Impact

- **Code:** `scripts/check-landing.mjs` (`briefFacts` gains an option to leave out the offer), `scripts/lib/cms-config.mjs` (a helper `cmsOwnsOffer`), `scripts/cms.mjs` (the check output).
- **Tests:** a site with an `offer` entry and a page without a brief price passes with the warning; the same page without the entry still fails naming `offer[i].price`; a `.pages.yml` that fails the CMS check does not skip anything; the business name is still required on a CMS site.
- **No site changes.** tupathdigital moves to the CMS in its own site change afterwards.
