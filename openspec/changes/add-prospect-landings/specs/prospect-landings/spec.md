## ADDED Requirements

### Requirement: Sourced facts for a prospect
A brief whose `prospect.status` is `prospect` SHALL have every filled fact field (business name and place, contact data, offer names, prices and URLs, primary call-to-action URL) either backed by a `prospect.sources` entry with an `https` URL and a retrieval date, or listed in `assumed`, and validation SHALL fail naming each uncovered field.

#### Scenario: Phone without a source
- **WHEN** a prospect brief has `contact.phone` filled and neither a source nor an `assumed` entry for it
- **THEN** `brief validate` exits 1 naming `contact.phone`

### Requirement: No prospect brand or consent
While `prospect.status` is `prospect`, the brief SHALL NOT carry assets, brand colors or fonts, AI image or owner portrait consent, legal holder identity or forms, and the build SHALL use only archive images and a palette and fonts chosen from the niche.

#### Scenario: Prospect logo in the brief
- **WHEN** a prospect brief lists an asset of kind `logo`
- **THEN** validation fails saying a prospect landing cannot use the prospect's brand

### Requirement: Prospect pages are marked and not indexed
A site whose `src/data/prospect.json` has status `prospect` SHALL render on every page a `noindex` robots meta tag and a visible notice in the page language naming the business and saying the page is not its official website, SHALL publish a sitemap without URLs and SHALL send `X-Robots-Tag: noindex` for every path. A site without the file SHALL build as before.

#### Scenario: Prospect build
- **WHEN** a prospect site is built
- **THEN** every page in `dist/` except `404.html` has `noindex` and a `[data-prospect-notice]` containing the business name, `dist/sitemap.xml` has no URL and `dist/_headers` sets `X-Robots-Tag: noindex` for `/*`

#### Scenario: Starter unchanged
- **WHEN** the starter, which has no `prospect.json`, is built
- **THEN** its pages, sitemap and headers are the same as before the change

### Requirement: Prospect final check
`check-landing` SHALL fail a prospect site with a page lacking `noindex` or the visible notice, a sitemap URL, a missing `X-Robots-Tag` header, a customer or AI image in `assets.json`, an unsourced fact, or a stale `prospect.json`.

#### Scenario: Notice removed
- **WHEN** a prospect site's build has a page without `[data-prospect-notice]`
- **THEN** `check-landing` exits 1 naming the page and the `prospect` rule

### Requirement: Sales kit
`scripts/prospect.mjs kit --site <slug>` SHALL write `sites/<slug>/SALES.md` with what was built, the facts and their sources, what was assumed, what going live needs and talking points from the brief, and SHALL NOT contain an outreach message; it SHALL state that the first contact is written by the owner and that unsolicited commercial email is restricted, without claiming legal advice.

#### Scenario: Kit after a prospect build
- **WHEN** the kit is written for a passed prospect build
- **THEN** `SALES.md` has a facts table with every source URL and date, a "To go live" list naming the customer's assets, legal holder data, domain and `prospect.mjs sold`, and no message addressed to the prospect

### Requirement: Marking a prospect as sold
`scripts/prospect.mjs sold --site <slug>` SHALL set `prospect.status` to `sold`, keep the sources, rewrite `prospect.json` and print the next steps, and SHALL refuse a site without a prospect section or already sold. It SHALL NOT edit pages, build, commit or deploy.

#### Scenario: Sold
- **WHEN** the owner marks a prospect site as sold and rebuilds it
- **THEN** no page shows the notice or the prospect `noindex`, and the brief accepts the customer's assets and consent again
