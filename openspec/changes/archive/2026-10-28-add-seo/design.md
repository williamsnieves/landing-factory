# Design: add-seo

## Context

- **What exists:**
  - `BaseLayout` already writes the title, description, canonical (absolute when `site` is set), `og:image` and hreflang alternates.
  - Lighthouse SEO (score at least 90) runs in QA.
  - The report has security, performance and legal areas, with item ids, statuses and a freshness guard.
- **Pinned skills:** design skills are vendored by `scripts/setup-agent.sh` from `agent-tooling.lock.json` (`fetch.repo`, `fetch.subpath`, `commit`). They have one role each and are never edited.
- **marketingskills** (MIT, commit `0cd9b3a0ef4c411a1d690419ce843f2a1da32cce`, 2026-10-27):
  - `skills/seo-audit/` holds `SKILL.md`, `references/` (title tags, local SEO, international SEO, rankings push, AI writing detection) and `evals/`.
  - `skills/schema/` holds `SKILL.md`, `references/schema-examples.md` and `evals/`.
  - Neither runs code.

## Goals / Non-Goals

**Goals:**

- SEO decided at the brief and the synthesis, written at the build, and checked deterministically before publishing.
- No new runtime dependency.
- No existing site turns red.

**Non-Goals:**

- Keyword research tools.
- Live search data.
- Off-page SEO.
- `llms.txt`.
- Lead forms.

## Decisions

1. **Two vendored skills, one lock entry each.**
   - Entries `seo-audit` and `schema`: same repository and commit, subpaths `skills/seo-audit` and `skills/schema`, paths `.claude/skills/seo-audit` and `.claude/skills/schema`, license `MIT`, `licenseFiles: ["third-party-licenses/marketingskills.LICENSE"]`.
   - Roles:
     - `seo-audit`: SEO criteria for planning and reviewing pages; the source of title, description, heading and local SEO rules in the synthesis and the review.
     - `schema`: JSON-LD for the business type.
   - `evals/` is kept as shipped, since it is vendored content and is not run.
   - `setup-agent.sh` already handles `fetch` by subpath. If it assumes one tool per repository, it fetches the commit once and copies each subpath.
   - The `CLAUDE.md` design skills table becomes "Vendored skills" with these two rows.
   - The skills mention `.agents/product-marketing.md`, which does not exist here. The brief is the context, and the new-landing skill says so.

2. **Brief `seo` object** (optional, unknown keys fail):

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

   - **Validation:**
     - `schemaType` comes from a closed list: `LocalBusiness`, `ProfessionalService`, `RealEstateAgent`, `FinancialService`, `Dentist`, `MedicalClinic`, `Restaurant`, `Bakery`, `Store`, `Organization`, `Person`, `SoftwareApplication`, `Event`. The list lives in `brief-schema.mjs` and is extended there.
     - Strings are trimmed and at most 120 characters.
     - At most 10 keywords and 10 areas.
   - **`brief missing`:** lists `seo.primaryKeyword` and `seo.serviceArea` as recommended. `serviceArea` is listed only when `business.kind` is local or the brief has an address.
   - **`summary`:** shows them.
   - **`/brief-intake`:** asks "what would a customer type into Google to find you?" and the area served. A keyword chosen for the customer goes into `assumed`.

3. **Starter markup.**
   - **`BaseLayout` props:**
     - `jsonLd?: object | object[]`: rendered with `JSON.stringify`, with `<` escaped as `<` so it cannot close the script.
     - `ogType?: string` (default `website`).
   - **Tags written always:** `og:title`, `og:description`, `og:url` (the canonical, when `site` is set), `og:type`, `og:locale` (from `lang`, `es` becomes `es_ES` only when the brief market says so; otherwise the bare language) and `twitter:card` (`summary_large_image` with an image, `summary` without one).
   - **Sitemap:** `src/pages/sitemap.xml.ts` uses `import.meta.glob` over `src/pages/**/*.astro` with eager access to a page-level `export const noindex = true` marker. The exact Astro mechanism (`getStaticPaths`, `Astro.glob` replacement or a post-build step) is checked with the astro-docs MCP during implementation.
     - Its output is static XML with absolute URLs when `site` is set.
     - It leaves out the 404, `noindex` pages and `/directions/`.
     - When `site` is not set it writes a sitemap with relative URLs and the report warns.
     - If a page-level marker is not reliable, a small post-build script that reads `dist/**/*.html` for `noindex` writes `dist/sitemap.xml` instead. That is decided in task 2.1 and documented.
   - **`public/robots.txt`:** `User-agent: *`, `Allow: /` and a `Sitemap:` line. The absolute URL needs `site`, so the file is generated with the sitemap when the endpoint route is used.
   - **CSP:** a JSON-LD block is not executed, so it needs no script hash. `tests/csp.test.mjs` must still see no violation.

4. **Report `seo` area** (`scripts/report/seo.mjs`).
   - It reads indexable pages from `dist/`: pages without `noindex`, skipping `404.html` and `/directions/`.
   - Every item lists offending pages and values as evidence.
   - Each item has a fix that names the brief field or the layout prop.
   - **Thresholds:** `report.seo` in `qa.config.json` (`titleMin` 30, `titleMax` 60, `descriptionMin` 70, `descriptionMax` 160), validated in `scripts/report/config.mjs`.
   - **The rule for fail versus warn:** fail only on what is broken or misleading:
     - no title;
     - no description;
     - JSON-LD that does not parse;
     - review or rating markup with no reviews in the brief;
     - a `noindex` page in the sitemap;
     - `Disallow: /` with indexable pages.

     Everything else warns.
   - **`seo-keyword`:** a normalized, accent-insensitive, case-insensitive match of the primary keyword, or of all its words of four letters or more, in the title, `h1` and description. It only runs with a brief that names one; otherwise it is `na`.
   - **The inline-script inventory** in `dist-scan.mjs` skips `<script type="application/ld+json">`.
   - **Markdown:** the area appears after Legal, with the counts.

5. **Generation (new-landing skill).**
   - **Synthesis:** a short "SEO" section in `PROPOSAL.md` with the primary keyword, area and schema type, taken from the brief or from the niche and marked assumed. It says which `seo-audit` rules apply (local business or not).
   - **Build:**
     - titles and descriptions within the limits, per locale;
     - one `h1`;
     - the keyword used naturally, never stuffed;
     - JSON-LD in `src/data/seo.ts` (typed, customer facts only), passed to `BaseLayout`;
     - the sitemap and `robots.txt` stay as copied.
   - **Final check:** runs the report's `seo` items through the existing static report run. Any `seo` fail is fixed in the site.
   - **Directions run:** titles and descriptions only.

## Risks / Trade-offs

- **Vendored skills drift from upstream.** They are pinned, and bumped like the design skills.
- **Keyword matching in Spanish and English is approximate.** It only warns.
- **Existing sites get many SEO warnings.** That is intended: they opt in, in site changes. Task 4 checks that none of them gets a new fail.
- **The sitemap mechanism depends on Astro's API.** It is checked against the docs and falls back to a post-build script.
