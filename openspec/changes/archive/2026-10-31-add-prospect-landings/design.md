# Design: add-prospect-landings

## Context

The brief is the single source of customer facts (`scripts/lib/brief-schema.mjs`), and `assumed` already separates what the customer said from what the agent chose. Legal data reaches a site the same way this change needs: `legal.mjs --write` turns the brief into `src/data/legal.json`, and `astro.config.mjs` reads that file at build time (`formDirectives()`). `seoFiles()` already writes the sitemap from the built HTML (indexable pages only) and the `Sitemap:` line of `robots.txt`. `check-landing` already reads `dist/` without a browser.

## Decisions

### 1. Sources live in the brief, next to `assumed`

```json
"prospect": {
  "status": "prospect",
  "sources": [
    { "field": "contact.phone", "url": "https://...", "retrieved": "2026-10-31" },
    { "field": "offer[0].price", "url": "https://...", "retrieved": "2026-10-31" }
  ]
}
```

- `field` uses the same path syntax as `assumed[].field`.
- `url` is `https://`.
- `retrieved` is `YYYY-MM-DD`.
- Unknown keys fail.
- A field may appear once in `sources`. A field in both `sources` and `assumed` fails, because it is either sourced or chosen, never both.

The fact fields that need coverage are:

- `business.name`, `business.city`, `business.country`;
- every filled key of `contact`;
- `offer[i].name`, `offer[i].price`, `offer[i].url`;
- `goal.primaryCta.url`.

The list is `PROSPECT_FACT_FIELDS` in the schema module, so `brief missing` and `check-landing` share it. Descriptive text (`business.description`, `audience`, `tone`) is the owner's own framing and needs no source.

Alternative rejected: a separate `SOURCES.md`. It could drift from the brief, and validation could not tie a source to a field.

### 2. Prospect mode forbids brand and consent fields

While `status` is `prospect`, validation fails with "a prospect landing cannot use the prospect's brand" or "a prospect cannot consent" when any of these hold:

- `assets` is not empty;
- `brand.colors` or `brand.fonts` is not empty;
- `brand.aiImages` or `brand.ownerPortrait` is set;
- `legal.holder`, `legal.privacyContact` or `forms` is present.

`legal.markets` is allowed, so the report can still state the market's requirements. Without a holder no legal page is built: the `legal-pages` item of the report then warns as usual, and `SALES.md` lists the holder data as needed to go live. `references` stay allowed, but a reference to the prospect's own site is refused by the `analyze-reference` rules already in place (we never take a site's assets or copy).

### 3. One generated file drives the page

`scripts/prospect.mjs write --site <slug>` writes `src/data/prospect.json`, and `--check` exits 1 when the file is stale. The file holds `{ "status": "prospect", "business": "<name>", "language": "es" }`, plus `locales` on a multi-locale site. `sold` writes the file with `status: "sold"`.

- `BaseLayout.astro` loads it with `import.meta.glob('../data/prospect.json', { eager: true })`, the same pattern as the i18n URLs, so a site without the file never imports it. When the status is `prospect` it forces `noindex` on every page and renders `<ProspectNotice />`.
- `ProspectNotice.astro` (`src/components/prospect/`, copied by `new-site`) is a slim strip at the top of `<main>`:
  - It is a `role="note"` with `data-prospect-notice`.
  - Its text comes from a dictionary in `en` and `es`: "Design proposal prepared for {business}. This is not its official website." / "Propuesta de diseño preparada para {business}. No es su web oficial."
  - It uses tokens only, meets 4.5:1 contrast, has no JavaScript and is not dismissible.
  - knip treats it like the legal components: template source in the starter, used only when the site imports it.
- `seoFiles()` reads the same file. With `status: "prospect"` it writes a sitemap with no URLs (every page is `noindex` anyway) and appends a `/*` block with `X-Robots-Tag: noindex` to `dist/_headers`. `robots.txt` keeps `Allow: /`, so crawlers can see the `noindex`: a `Disallow` would hide it and can still let the URL be indexed from links.

### 4. The check

`check-landing` rule `prospect` (only when `brief.prospect.status` is `prospect`):

1. Every `dist/**/*.html` page except `404.html` has `<meta name="robots" content="noindex">` and a visible `[data-prospect-notice]` that contains the business name.
2. `dist/sitemap.xml` has no `<url>`.
3. `dist/_headers` has `X-Robots-Tag: noindex` for `/*`.
4. `assets.json` has no `source: "customer"` and no `source: "ai"` entry.
5. Every filled field of `PROSPECT_FACT_FIELDS` is covered by `sources` or `assumed`. The brief validation catches this first; the check repeats it so the final gate stands on its own.
6. `src/data/prospect.json` is not stale.

With `status: "sold"` the rule checks only that `prospect.json` says `sold` and that no page shows the notice. The landing's own SEO and legal checks then apply as for any site.

### 5. Generation and the kit

`new-landing` with a prospect brief:

- adds "Prospect: facts and sources" to `PROPOSAL.md`;
- runs `prospect.mjs write` before the build;
- takes images only from Commons and The Met (no customer files, no AI images: nobody consented);
- picks its palette and fonts with ui-ux-pro-max from the niche, never from the prospect's look, and records that under Decisions;
- runs `prospect.mjs kit` at the end.

`/brief-intake` asks for the source of each fact when the user says the business has not bought yet.

`prospect.mjs kit` writes `SALES.md` from the brief, `PROPOSAL.md` (archetype blend, sections), `RUN.md` (result) and `revisions.json` if any. It has fixed headings:

- **Summary**;
- **What was built**;
- **Facts and sources**: a table;
- **Assumed**;
- **To go live**: the customer's assets with permission; consent for AI images if wanted; legal holder data and markets; domain; `prospect.mjs sold`; a revision round; `/landing-handoff`;
- **Talking points**: drawn from `audience.needs` and `audience.objections`, never invented results;
- **First contact**: the owner writes it. The section says that unsolicited commercial email is restricted in Spain (LSSI, businesses included) and in other markets, suggests contact in person, by phone or through the business's own public contact channel, and says it is not legal advice.

The preview URL is not known to the script (CI prints it in the sticky comment), so the kit leaves `Preview: <from the pull request comment>` for the owner.

### 6. Sold

`prospect.mjs sold --site <slug>` refuses a site without a prospect section or already sold. It sets `status: "sold"` in the brief, keeps `sources` as history, rewrites `prospect.json` and prints the next steps. It never edits pages, builds, commits or deploys.

The brief then accepts brand and consent fields again, and the intake fills them from the customer. A rebuild or a revision round brings in the customer's assets.

## Risks

- **A wrong fact on a real business's page.** Mitigation: sources per fact, dates, the visible notice, `noindex`, and the kit table, which lets the owner re-check before showing the page.
- **Passing off.** Mitigation: the notice on every page is required by the final check; the page never uses the prospect's logo, photos or colors.
- **Shared layout change.** `BaseLayout` changes in the starter only; existing sites keep their copies. The starter build and its tests show that nothing changes without `prospect.json`.

## Verification

- Unit tests of the schema rules and `prospect.mjs` (`write`, `--check`, `kit`, `sold`, refusals).
- A fixture prospect site built in a test:
  - `noindex` on every page, the notice in `es` and `en`, an empty sitemap and the header;
  - `check-landing` passing on it;
  - failing when the notice is removed or a customer asset is added.
- The starter build unchanged; the MCP `get_landing` field; the full suite, lint, Prettier, `openspec validate --strict` and the clean-clone run.
