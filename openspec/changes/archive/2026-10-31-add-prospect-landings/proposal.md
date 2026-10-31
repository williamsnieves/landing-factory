# Proposal: add-prospect-landings

## Why

Track 1 of the product (`docs/channels.md`, owner decision 2026-10-28) is: the owner picks a niche or a real business, builds a landing and offers it. `docs/channels.md` already sets the rule for a business that has not bought anything yet: never use its brand assets, keep the page `noindex` until it is sold. Nothing in the factory enforces that rule:

- **Facts.** The brief has no way to say "these facts are public, here is where each one comes from". Without that, a prospect's name, address or prices look like customer-confirmed data.
- **Assets.** A brief may list the prospect's own logo, photos, colors or fonts; the build would use them.
- **Indexing.** Nothing keeps a prospect page out of search engines across all its pages, its sitemap and its response headers.
- **Confusion.** A preview at `*.pages.dev` that carries a real business name could be taken for the business's official website.
- **Hand-off.** There is nothing for the owner to take into the conversation with the prospect, and no recorded step from "prospect" to "sold".

## What Changes

- **Brief: `prospect` section.** `prospect: { status: "prospect" | "sold", sources: [{ field, url, retrieved }] }`:
  - Every filled customer fact (business name, contact data, address, hours, offer names and prices, URLs) is either listed in `assumed` or backed by a `sources` entry (`https` URL, `YYYY-MM-DD` date). Validation fails otherwise, naming the field.
  - While `status` is `prospect`, the brief cannot carry the prospect's brand: `assets`, `brand.colors` and `brand.fonts` must be empty, and `brand.aiImages`, `brand.ownerPortrait`, `legal.holder`, `legal.privacyContact` and `forms` must be absent (nobody has consented, and nobody holds the page yet).
  - `brief missing` and `/brief-intake` ask for a source per fact in prospect mode; `summary` shows the status and the sources.
- **Generated data and layout.** `node scripts/prospect.mjs write --site <slug>` writes `src/data/prospect.json` (`status`, business name, language) from the brief. The starter's `BaseLayout` (copied by `new-site`) reads it when present:
  - every page gets `noindex`;
  - every page shows a visible notice in the page language ("Design proposal prepared for <business>. This is not its official website."), marked `data-prospect-notice`;
  - `seoFiles()` in `astro.config.mjs` writes an empty sitemap and adds `X-Robots-Tag: noindex` to `dist/_headers`.

  Sites without the file (all existing ones) are unchanged.
- **Final check.** `check-landing` gains a `prospect` rule (only for a brief whose status is `prospect`). It fails on:
  - a page in `dist/` without `noindex`;
  - a page without a visible notice;
  - a sitemap URL;
  - no `X-Robots-Tag: noindex` in `dist/_headers`;
  - an `assets.json` entry with `source: "customer"`;
  - an AI image;
  - a fact without a source or an `assumed` entry.
- **Generation.** `new-landing` reads the prospect section:
  - images come from Commons and The Met only, and no palette or font is taken from the prospect;
  - the proposal lists every fact with its source;
  - the run ends by writing the sales kit.
- **Sales kit.** `node scripts/prospect.mjs kit --site <slug>` writes `sites/<slug>/SALES.md` (owner decision 2026-10-31: summary and talking points, no outreach message). It contains:
  - what was built, with the archetype and the sections;
  - the facts and their sources;
  - what was assumed;
  - what going live needs: the customer's assets and consent, legal holder data, domain, an indexable build;
  - talking points drawn from the brief;
  - a note that the first contact is the owner's, written by hand. In Spain the LSSI forbids unsolicited commercial email, businesses included, and the note says so. It is not legal advice.
- **Sold.** `node scripts/prospect.mjs sold --site <slug>` sets `status: "sold"` and rewrites `prospect.json`, which removes the notice, the `noindex` and the header on the next build. It then prints the next steps: `/brief-intake` for the customer's real data and consent, the customer's assets through a revision round, then `/landing-handoff`.
- **Interface and docs.** `get_landing` shows the prospect status. A new guide, `docs/prospect.md`. CLAUDE.md gains a "Prospect landings" section.

## Out of scope

- Finding prospects, scraping, contact lists, sending any message, a CRM.
- Reading facts from a prospect's site automatically: the owner (or the intake) records each fact with its source by hand. `analyze-reference` stays for design references only, never for a prospect's own site content.
- Prices for the landing itself, contracts, billing.

## Impact

- Code:
  - `scripts/lib/brief-schema.mjs` and `scripts/brief.mjs`;
  - `scripts/prospect.mjs` (new);
  - `src/layouts/BaseLayout.astro` and a `src/components/prospect/ProspectNotice.astro` (copied by `new-site`);
  - `astro.config.mjs` (`seoFiles()`);
  - `scripts/check-landing.mjs`, `scripts/mcp/landings.mjs`, `knip.json`;
  - the skills `new-landing` and `brief-intake`.
- Spec: new capability `prospect-landings`.
- Tests: brief validation, `prospect.mjs`, the layout and the build of a fixture prospect site, the check-landing rule, the MCP field.
- `src/layouts/` and `astro.config.mjs` are shared CI paths, so CI re-runs every site; existing sites keep their own copies and do not change.
