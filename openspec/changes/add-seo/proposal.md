# Proposal: add-seo

## Why

The landings the factory builds are meant to win customers. In the owner's first approach (build landings, then offer them), SEO is part of what is sold. Today the factory checks SEO only through Lighthouse's SEO score, which is a basic crawlability check. Every page gets a title, a description and a canonical URL, but nothing more:

- **What is never planned:** keywords and the service area.
- **What is never written:**
  - JSON-LD structured data (for example `RealEstateAgent`, `LocalBusiness`, `FinancialService`);
  - Open Graph and Twitter tags beyond the image;
  - a sitemap;
  - a `robots.txt`.
- **What nothing checks:** title and description length, one `h1` per page, and whether the primary keyword appears where it matters.

The owner proposed two SEO skills (2026-10-28):

- **[coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills):**
  - MIT licensed.
  - `seo-audit` and `schema` are plain text skills with references (local SEO, title tags, international SEO, schema examples) and need no runtime.
- **[AgricIDaniel/claude-seo](https://github.com/AgricIDaniel/claude-seo):**
  - MIT licensed.
  - It ships 25 skills, 19 subagents, a Python runtime of about 20 packages (Google APIs, PDF and Excel export) and its own Chromium.
  - Most of it works on live sites with traffic (Search Console, backlinks, rank drift), and its page checks overlap the factory's QA and report.

The factory needs SEO knowledge at build time and deterministic checks before publishing. The decision is a hybrid:

- **From marketingskills:** vendor its two knowledge skills, pinned like the design skills.
- **Our own work:** write the checks in the landing report.
- **claude-seo:** keep it in mind for landings already live with traffic.

## What Changes

- **Vendored skills.** `seo-audit` and `schema` from `coreyhaines31/marketingskills` at a pinned commit go to `.claude/skills/seo-audit/` and `.claude/skills/schema/`.
  - They are recorded in `agent-tooling.lock.json` with role, license and fetch.
  - `npm run setup:agent` restores them and `setup:verify` checks them. The license goes to `third-party-licenses/`.
  - One role each:
    - `seo-audit`: SEO criteria for planning and reviewing a page.
    - `schema`: JSON-LD for the business type.
  - They are never edited by hand.
- **Brief.** An optional `seo` object:
  - `primaryKeyword`, `keywords[]`, `serviceArea[]` (cities or regions) and `schemaType` (a schema.org type from a closed list);
  - `brief missing` lists `seo.primaryKeyword` and `seo.serviceArea` as recommended;
  - `/brief-intake` asks for them without inventing;
  - a chosen keyword can be listed in `assumed`.

  Older briefs stay valid.
- **Starter and new sites:**
  - **`BaseLayout`:**
    - new optional `jsonLd` prop, rendered as `<script type="application/ld+json">`;
    - full Open Graph (`og:title`, `og:description`, `og:url`, `og:type`, `og:locale`) and `twitter:card`.
  - **`src/pages/sitemap.xml.ts`:** a static endpoint, with no new dependency, listing every indexable page (never a `noindex` one) with absolute URLs when `site` is set.
  - **`public/robots.txt`:** with the `Sitemap:` line.

  `new-site` copies them. Existing sites keep their copies and the report warns until each opts in, in its own site change.
- **Generation.** The `/new-landing` skill gains an SEO step in the synthesis and the build, using `seo-audit` and `schema`:
  - one primary keyword per page, in the title, the `h1`, the description and the first paragraph, written naturally;
  - titles and descriptions per locale;
  - JSON-LD of the brief's `schemaType` with only customer facts (name, address, phone, area served, opening hours);
  - nothing assumed is presented as a fact;
  - no review, rating or aggregate rating markup unless the customer gave real reviews.

  The directions run writes titles and descriptions too, but no sitemap entry for direction pages (they stay `noindex`).
- **Landing report, new `seo` area.** Static, read from `dist/`, indexable pages only, `--skip seo` removes it. Items with stable ids:
  - `seo-title`: missing fails; outside 30 to 60 characters warns.
  - `seo-description`: missing fails; outside 70 to 160 characters warns.
  - `seo-h1`: no `h1` or more than one warns.
  - `seo-canonical`: missing or relative warns.
  - `seo-open-graph`: missing tags warn.
  - `seo-structured-data`: JSON-LD that does not parse fails; none warns; a type other than the brief's `schemaType` warns; review markup without reviews in the brief fails.
  - `seo-sitemap`: missing warns; a `noindex` page listed fails.
  - `seo-robots`: missing warns; `Disallow: /` on a site with indexable pages fails.
  - `seo-keyword`: the brief's primary keyword absent from title, `h1` or description warns.

  Limits live in `qa.config.json` under `report.seo`. The inline script inventory skips `application/ld+json` blocks, which are data, not script.
- **Docs.**
  - `docs/seo.md`.
  - `CLAUDE.md` sections: design skills table, landing report, customer brief.
  - `docs/status.md`.
  - The owner's two-track product decision of 2026-10-28 is recorded in `docs/channels.md`:
    - **Track 1:** the owner builds landings and then offers them.
    - **Track 2:** later, a self-serve web app driven by the Agent SDK.
    - **Telegram:** serves both tracks.
    - **Repository:** stays public until the flow is polished and tupathdigital is in production.
    - **Prospect landings:** never use the prospect's brand assets, and stay `noindex` until sold.

## Capabilities

### New Capabilities

- `seo`: SEO planning inputs, generated SEO markup and the static SEO checks of the landing report.

### Modified Capabilities

- `landing-generation`: the SEO step in the synthesis and the build.
- `brief-intake`: the optional `seo` fields.
- `agent-tooling`: two more vendored skills.

## Impact

- **New:**
  - `.claude/skills/{seo-audit,schema}/` (vendored);
  - `third-party-licenses/marketingskills.LICENSE`;
  - `scripts/report/seo.mjs`;
  - `src/pages/sitemap.xml.ts`, `public/robots.txt`;
  - `tests/report-seo.test.mjs`;
  - `docs/seo.md`.
- **Changed:**
  - `agent-tooling.lock.json` and `scripts/setup-agent.sh` (if the fetch needs two subpaths from one repository);
  - `scripts/lib/brief-schema.mjs`, `scripts/brief.mjs`;
  - `src/layouts/BaseLayout.astro`;
  - `scripts/new-site.mjs`;
  - `scripts/landing-report.mjs`, `scripts/report/dist-scan.mjs`, `scripts/report/config.mjs`;
  - `.claude/skills/new-landing/SKILL.md`, `.claude/skills/brief-intake/SKILL.md`;
  - `CLAUDE.md`, `docs/channels.md`, `docs/status.md`.
- **Existing sites:**
  - not edited by this change;
  - each must still pass the static report: no new item may fail an existing site;
  - their SEO gaps show as warnings, which the task verifies on all eight sites.
- **Out of scope:**
  - `claude-seo`;
  - keyword research with external APIs;
  - Search Console, rank tracking, backlinks;
  - `llms.txt`;
  - lead forms (`add-lead-forms`, a separate change);
  - the reference sheets of linear.app, stripe.com, vercel.com, framer.com and raycast.com. Those wait for the session's network allow list.
