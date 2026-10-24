# Proposal: add-legal-compliance

## Why

A landing that is fast and secure can still be unlawful to publish. The owner asked whether our landings meet the rules for production: cookies, GDPR and the rest (owner, 2026-10-24). Nothing in the factory checks this today:

- No check notices a tracker or a cookie.
- No landing has a legal notice or a privacy policy.
- The owner's own live landing (`sites/tupathdigital`) advertises "50% off" coupons. In the EU, price-reduction claims have their own rules.

This change makes legal requirements visible before publishing, and generates the pages the customer's market requires from the customer's own data. It helps with compliance; it is not legal advice.

## What Changes

- **QA records what a page stores and contacts.** On a normal page load, QA writes to `report.json`:
  - the names and domains of the cookies the page sets (never their values);
  - the `localStorage` and `sessionStorage` keys;
  - the third-party hosts the page requested.
- **The landing report gains a `legal` area.** It covers:
  - **Cookies and trackers.** Non-essential cookies or known trackers (analytics, ad pixels, session recorders, non-privacy video embeds, maps) fail when the page has no consent mechanism. Fonts or other assets loaded from a third-party CDN warn, because they send the visitor's IP to that third party. A page that sets no cookies passes and needs no banner. Sources: the build (`dist/`), plus QA's runtime record when it is newer than the build.
  - **Legal pages.** When the brief names a market whose rules require them, the report checks that:
    - a legal notice and a privacy policy exist;
    - every page links to them;
    - they contain the holder's data from the brief;
    - they carry no "pending" marker.

    The market rules ship for the EU (GDPR, ePrivacy) and Spain (LSSI-CE). A landing with no market, or with no brief, warns that its legal requirements are unknown.
  - **Price claims.** Discount percentages, struck-through prices and "was/now" prices on a page warn for review. For EU markets the warning names the 30-day lowest-price rule.
- **The brief gains legal fields:**
  - `legal.markets`: the countries or regions where the page is offered;
  - `legal.holder`: who runs the page (name or company, tax id, address, email, register entry when there is one);
  - `legal.privacyContact`;
  - `legal.processing`: what the page does with personal data (analytics, forms, embeds).

  The `/brief-intake` interview asks for these fields and never invents them. Values the customer leaves to us are recorded as assumed. Identity data is never assumed.
- **Legal pages from the brief.** `node scripts/legal.mjs --site <slug> --write` writes `src/data/legal.json` from the brief. The starter adds a legal notice page and a privacy policy page, both components copied by `new-site`. They render that data in the page language (English and Spanish templates). A required field that is missing renders a visible "pending legal review" marker, and the report fails on that marker. `/new-landing` adds the pages and the footer links when the brief names a market.
- **Docs:**
  - a short guide to what each check means and how to stay banner-free;
  - a clear note that the templates and checks are not legal advice;
  - a lawyer's review before the factory is sold (already in the product plan).

## Capabilities

### New Capabilities

- `legal-compliance`: cookie and tracker detection and the consent rule, the legal pages each market requires and their data, price-claim review, and the "not legal advice" framing.

### Modified Capabilities

- `landing-report`: "Item statuses and evidence" gains the `legal` area.
- `brief-intake`: new requirement for the legal identity, market and data-processing fields, and how the interview asks for them.
- `landing-generation`: new requirement that a landing whose brief names a market gets the legal pages and footer links from the brief.
- `quality-gates`: new requirement that QA records cookies (names and domains only), storage keys and third-party hosts per page.

## Impact

- **New code:**
  - `scripts/report/legal.mjs`, with its rules in `scripts/report/legal-rules.mjs` and a small built-in tracker list;
  - `scripts/legal.mjs`;
  - in the starter: the legal components in `src/components/legal/` (legal notice and privacy policy), with `en` and `es` texts;
  - tests and fixtures.
- **Changed code:**
  - `scripts/qa/browser-checks.mjs` and `scripts/qa.mjs` (privacy record);
  - `scripts/report/items.mjs` and `scripts/report/render.mjs` (the `legal` area);
  - `scripts/lib/brief-schema.mjs`;
  - `scripts/brief.mjs` (`missing` order);
  - `scripts/new-site.mjs` (copy the legal components);
  - `.claude/skills/brief-intake/SKILL.md` and `.claude/skills/new-landing/SKILL.md`;
  - `.claude/settings.json` (allow `node scripts/legal.mjs *`);
  - `qa.config.json` (`legal` section).
- **Docs:** `CLAUDE.md`, `README.md`, `scripts/README.md`, `docs/status.md`.
- **No new dependencies.** No new network access: the checks read the build and QA's browser run.
- **Existing sites:** not edited. The report warns on the seven current sites (no brief market, no legal pages), so CI stays green. tupathdigital gets its legal pages in its own site change, once the owner gives the holder data and markets.
- **Out of scope:**
  - a consent banner component: no landing sets non-essential cookies today, so it arrives with the first change that adds analytics or embeds; until then such a page fails the report;
  - terms of sale (the sales happen on Etsy and Gumroad, under their terms);
  - markets other than the EU and Spain (they warn as "no rule set");
  - accessibility statements;
  - any claim of legal certification.
