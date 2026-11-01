# Prospect landings

Track 1 of the product (`docs/channels.md`): the owner picks a business, builds a landing and offers it. Until the business buys, the landing is a **design proposal**, not its website. The factory enforces the rule from `docs/channels.md`: never use the prospect's brand assets, and keep every page out of search engines until it is sold.

The notice on the pages, the checks and the sales kit support honest presentation. They are not legal advice.

## The flow

1. **Brief.** `/brief-intake <slug>` asks whether the business has already hired you or is a prospect. For a prospect it writes `prospect.status: "prospect"` and asks, for every fact it fills, which public page shows it and when you read it. You record the sources by hand; nothing is scraped.
2. **Build.** `npm run new-landing -- <slug> --brief sites/<slug>/brief.json`. The run adds the facts and sources to `PROPOSAL.md`, writes `src/data/prospect.json`, builds with archive images and a palette chosen from the niche, runs the final check and writes `SALES.md`.
3. **Show it.** The preview URL is in the pull request comment (CI prints it). The first contact is yours, by hand (see "First contact").
4. **If they buy.** `node scripts/prospect.mjs sold --site <slug>`, then `/brief-intake <slug>` for their real data and consent, a revision round for their assets, and `/landing-handoff <slug>`.

## The brief

```json
"prospect": {
  "status": "prospect",
  "sources": [
    { "field": "contact.phone", "url": "https://example.com/contact", "retrieved": "2026-10-31" }
  ]
}
```

- `field` uses the same dotted syntax as `assumed[].field` (`offer[0].price`). A source on a parent (`offer[0]`) covers its children.
- Every filled fact field has a source or an `assumed` entry, never both. The fact fields are `business.name`, `business.city`, `business.country`, `contact.email`, `contact.phone`, `contact.address`, `contact.hours`, each `contact.social[i]`, `offer[i].name`, `offer[i].price`, `offer[i].url`, `proof[i].text` and `goal.primary.url` (`PROSPECT_FACT_FIELDS` in `scripts/lib/brief-schema.mjs`). Descriptive text (`business.description`, `audience`, `tone`) is your own framing and needs no source. A `proof` entry is backed by its own `source` URL (proof can never be assumed).
- While the status is `prospect` these must stay empty: `assets`, `brand.colors`, `brand.fonts` ("a prospect landing cannot use the prospect's brand") and `brand.aiImages`, `brand.ownerPortrait`, `legal.holder`, `legal.privacyContact`, `forms` ("a prospect cannot consent"). `legal.markets` is allowed, so the report can still state the market's requirements; without a holder no legal page is built.
- `node scripts/brief.mjs validate --site <slug>` names every uncovered fact; `missing` asks for a source per fact; `summary` shows the status and the sources.

## What the page does

`node scripts/prospect.mjs write --site <slug>` writes `src/data/prospect.json` from the brief:

```json
{ "status": "prospect", "business": "Clínica Dental Alameda", "language": "es" }
```

`--check` exits 1 when the file is stale. With the file present and `status: "prospect"`:

- every page carries `<meta name="robots" content="noindex">`;
- `BaseLayout` renders `<ProspectNotice />` at the top of `<main>`: a `role="note"` strip with `data-prospect-notice` saying "Design proposal prepared for {business}. This is not its official website." (Spanish: "Propuesta de diseño preparada para {business}. No es su web oficial."). It uses the site's `ink` and `paper` tokens, has no JavaScript and cannot be dismissed. A language without a text shows English; add one in `src/components/prospect/texts.ts`;
- the sitemap has no URL and `dist/_headers` gets a `/*` block with `X-Robots-Tag: noindex`;
- `robots.txt` keeps `Allow: /`: a `Disallow` would hide the `noindex` from crawlers and the URL could still be indexed from links.

A site without the file builds exactly as before. Existing sites keep their own copy of the layout and are not changed.

## The final check

`node scripts/check-landing.mjs --site <slug>` runs the `prospect` rule when the brief has `prospect.status`:

| Failure | Meaning |
| --- | --- |
| a page without `noindex`, or without a visible notice naming the business | the build lost the layout behavior |
| a `<url>` in `dist/sitemap.xml` | the sitemap must be empty |
| no `X-Robots-Tag: noindex` for `/*` in `dist/_headers` | the header block is missing |
| `source: "customer"` or `source: "ai"` in `assets.json` | nobody has agreed to those |
| a fact without a source or an `assumed` entry | validation catches it first; the check repeats it |
| a stale or missing `src/data/prospect.json` | run `prospect.mjs write` |

For `sold` the rule checks that `prospect.json` says `sold` and that no page still shows the notice. Fix the site, never the brief or the rule.

## The sales kit

`node scripts/prospect.mjs kit --site <slug>` writes `sites/<slug>/SALES.md` from the brief, `PROPOSAL.md`, `RUN.md` and `revisions.json`. Running it again overwrites the file. It has fixed headings:

- **Summary**: the business, the build result and `Preview: <from the pull request comment>` (the script cannot know the URL; CI prints it in the sticky comment).
- **What was built**: the archetype blend and the sections, and the rules the page follows.
- **Facts and sources**: a table with field, value, source URL and retrieval date. Re-check it before you show the page.
- **Assumed**: values chosen for the business, with the reason.
- **To go live**: the business's assets with permission, its consent to AI images, the legal holder data, a domain, `prospect.mjs sold`, a revision round and `/landing-handoff`.
- **Talking points**: taken from `audience.needs` and `audience.objections`. Never invented results.
- **First contact**: see below.

### First contact

The kit contains no message to the prospect. You write the first contact yourself. Unsolicited commercial email is restricted: in Spain the LSSI forbids it, businesses included, and other markets have similar rules. Prefer a channel the business can answer on its own terms (in person, by phone, or its own public contact channel), say who you are and that the page is a draft built from public information. This is a note, not legal advice.

## Sold

`node scripts/prospect.mjs sold --site <slug>` sets `status: "sold"`, keeps `sources` as history, rewrites `prospect.json` and prints the next steps. It refuses a site without the section and one already sold, and it never edits pages, builds, commits or deploys. After a rebuild there is no notice, no prospect `noindex` and no header, and the brief accepts brand and consent fields again. Then:

1. `/brief-intake <slug>`: the customer's data, assets and consent.
2. A revision round (`npm run revise -- <slug> --feedback <file>`) brings in their assets and copy.
3. `/landing-handoff <slug>`: repository, host and domain.

## Agent interface

`get_landing` shows `prospect` (the status, or `null`). `prospect.mjs` is not a tool: the interface never edits a landing's status.

## Out of scope

Finding prospects, scraping, contact lists, sending any message, a CRM; reading a prospect's site automatically (`analyze-reference` stays for design references only, never for a prospect's own content); prices for the landing itself, contracts and billing.
