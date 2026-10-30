# seo Specification

## Purpose
SEO planned at the brief, written at the build and checked before publishing: the vendored seo-audit and schema skills, the brief's seo fields, the starter's Open Graph, JSON-LD, sitemap and robots.txt, and the seo area of the landing report.

## Requirements

### Requirement: SEO area of the landing report
The landing report SHALL have a static `seo` area over the indexable pages of `dist/` (no `noindex`, no `404.html`, no `/directions/`) with the items `seo-title`, `seo-description`, `seo-h1`, `seo-canonical`, `seo-open-graph`, `seo-structured-data`, `seo-sitemap`, `seo-robots` and `seo-keyword`, removable with `--skip seo`.

#### Scenario: Broken structured data
- **WHEN** an indexable page has a `<script type="application/ld+json">` block that is not valid JSON
- **THEN** `seo-structured-data` fails naming the page

#### Scenario: Long title
- **WHEN** a page title is 75 characters long
- **THEN** `seo-title` warns with the length and the limit

#### Scenario: Existing sites
- **WHEN** the static report runs on any existing site after this change
- **THEN** no `seo` item fails

### Requirement: SEO fail rule
An `seo` item SHALL fail only for a missing title or description, JSON-LD that does not parse, review or rating markup without reviews in the brief, a `noindex` page in the sitemap, or `Disallow: /` with indexable pages; every other gap SHALL warn.

#### Scenario: No structured data
- **WHEN** an indexable page has no JSON-LD
- **THEN** `seo-structured-data` warns and does not fail

### Requirement: Generated SEO markup
New sites SHALL get a `BaseLayout` that writes Open Graph and Twitter tags and an escaped JSON-LD block from its `jsonLd` prop, a static sitemap listing only indexable pages, and a `robots.txt` with a `Sitemap:` line.

#### Scenario: Noindex page left out
- **WHEN** a new site has a `noindex` page and an indexable home page
- **THEN** `dist/sitemap.xml` lists the home page and not the `noindex` page

### Requirement: Vendored SEO skills
The skills `seo-audit` and `schema` from `coreyhaines31/marketingskills` SHALL be vendored at a pinned commit, recorded in `agent-tooling.lock.json` with their license, restored by `npm run setup:agent` and checked by `npm run setup:verify`.

#### Scenario: Restore
- **WHEN** `.claude/skills/schema/` is deleted and `npm run setup:agent` runs
- **THEN** the folder is restored from the pinned commit
