# SEO

How the factory plans, writes and checks the search markup of a landing. Design: `openspec/changes/add-seo/`. The checks are static and deterministic; they say nothing about rankings or traffic.

## What the factory does

| Stage     | What happens                                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Brief     | The optional `seo` object holds `primaryKeyword`, `keywords`, `serviceArea` and `schemaType`. `/brief-intake` asks "what would a customer type into Google to find you?" and never invents the answer.                          |
| Synthesis | `PROPOSAL.md` has an "SEO" section: keyword, area and schema type from the brief, else chosen from the niche and marked assumed. The `seo-audit` and `schema` skills supply the rules.                                          |
| Build     | Titles and descriptions inside the report limits (per locale), one `h1`, the keyword written naturally, and JSON-LD from `src/data/seo.ts` passed to `BaseLayout`, with customer facts only.                                     |
| Check     | The `seo` area of `npm run report` (static, over `dist/`). The `/new-landing` final check runs it; no `seo-*` item may fail.                                                                                                    |

## The brief

```json
{
  "seo": {
    "primaryKeyword": "valoración de vivienda en Valencia",
    "keywords": ["calculadora hipoteca", "vender piso Valencia"],
    "serviceArea": ["Valencia", "Paterna"],
    "schemaType": "RealEstateAgent"
  }
}
```

- Strings are at most 120 characters; at most 10 keywords and 10 areas; unknown keys fail.
- `schemaType` is one of `LocalBusiness`, `ProfessionalService`, `RealEstateAgent`, `FinancialService`, `Dentist`, `MedicalClinic`, `Restaurant`, `Bakery`, `Store`, `Organization`, `Person`, `SoftwareApplication`, `Event` (`SCHEMA_TYPES` in `scripts/lib/brief-schema.mjs`; extend it there).
- `brief missing` lists `seo.primaryKeyword` and, when the brief has an address or a city, `seo.serviceArea`.
- A keyword chosen for the customer is listed in `assumed` (`seo.primaryKeyword`). Older briefs without `seo` stay valid.

## What the starter writes

- **`BaseLayout`**: `title`, `description`, a canonical URL (absolute when `site` is set), `og:title`, `og:description`, `og:type` (prop `ogType`, default `website`), `og:url` (with `site`), `og:locale` (the page language), `og:image` (prop `ogImage`) and `twitter:card` (`summary_large_image` with an image, else `summary`). The `jsonLd` prop (an object or an array of objects) becomes `<script type="application/ld+json">`; the text is `JSON.stringify` output with every `<` written as `<`, so a value such as `</script>` cannot close the block. A JSON-LD block is data, not script: it needs no CSP hash and the report's inline-script inventory skips it.
- **Sitemap and `robots.txt`**: `public/robots.txt` allows everything. The `seoFiles()` integration in `astro.config.mjs` runs after the build, reads the built pages and writes `dist/sitemap.xml` with every indexable page, and appends `Sitemap: <site>/sitemap.xml` to `dist/robots.txt` when `site` is set. It leaves out `404.html`, `/directions/` and any page with `<meta name="robots" content="noindex">`. Without `site` the sitemap has root-relative URLs and the report warns.
  - Why a post-build step and not a `src/pages/sitemap.xml.ts` endpoint: whether a page is `noindex` is a prop of `BaseLayout`, which an endpoint cannot read; reading the built HTML is the only mechanism that cannot disagree with the page. It needs no dependency.
- `new-site` copies `astro.config.mjs` and `public/robots.txt`. Existing sites keep their copies and the report warns until each opts in, in its own site change.

## The report's `seo` area

Static, over the indexable pages of `dist/` (no `noindex`, no `404.html`, no `/directions/`). `--skip seo` removes it. A build with no indexable page makes every item `na`.

| Item                  | Fails                                                                                          | Warns                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `seo-title`           | a page without a title                                                                         | length outside `titleMin` to `titleMax` (30 to 60)                             |
| `seo-description`     | a page without a meta description                                                              | length outside `descriptionMin` to `descriptionMax` (70 to 160)                |
| `seo-h1`              |                                                                                                | a page with no `h1` or more than one                                           |
| `seo-canonical`       |                                                                                                | missing or relative                                                            |
| `seo-open-graph`      |                                                                                                | any of `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `twitter:card` missing |
| `seo-structured-data` | JSON-LD that does not parse; review, `aggregateRating` or rating markup (the brief has no reviews) | no JSON-LD; no block of the brief's `schemaType`                          |
| `seo-sitemap`         | a `noindex` page listed                                                                        | no `sitemap.xml`, relative URLs, an indexable page missing                     |
| `seo-robots`          | `Disallow: /` for `*` or Googlebot with indexable pages                                        | no `robots.txt`, no `Sitemap:` line                                            |
| `seo-keyword`         |                                                                                                | the brief's primary keyword missing from the title, `h1` or description of the home page (`na` without a keyword) |

Limits live in `qa.config.json` under `report.seo` and are validated in `scripts/report/config.mjs`; never widen them to hide a real problem. Keyword matching is case and accent insensitive and accepts the whole phrase or all of its words of four letters or more, so it is approximate in both Spanish and English and only warns.

Review markup: the brief schema has no field for customer reviews yet, so any review or rating markup fails today. When a change adds real reviews to the brief, `seo-structured-data` will accept markup that matches them.

## Vendored skills

`seo-audit` and `schema` from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT, pinned in `agent-tooling.lock.json`) are text skills with references; they run no code. `seo-audit` is the source of title, description, heading and local SEO rules; `schema` is the source of JSON-LD for the business type. They are restored by `npm run setup:agent`, never edited by hand, and bumped like the design skills. They mention `.agents/product-marketing.md`, which does not exist here: the brief is the context.

## Out of scope

Keyword research tools and external APIs, Search Console, rank tracking, backlinks, `llms.txt`, lead forms, and live-site SEO work (the owner keeps [claude-seo](https://github.com/AgricIDaniel/claude-seo) in mind for landings that already have traffic).
