# Design: add-legal-compliance

## Context

- The landing report (`scripts/landing-report.mjs`, modules in `scripts/report/`) has the areas `security` and `performance`. Its items, statuses, verdict and rendering are generic (`scripts/report/items.mjs`, `render.mjs`).
  - It reads QA's `report.json` for Lighthouse detail, behind a guard: the QA run must be newer than the build.
  - It already inventories the third-party origins of each page (`dist-scan.mjs`).
- QA (`scripts/qa.mjs`, `scripts/qa/browser-checks.mjs`) loads every page in Chromium at three widths and under reduced motion. It records nothing about cookies or storage.
- The brief (`scripts/lib/brief-schema.mjs`) has `legal: { regulated, notices[], constraints }`, `business.country` and `contact`. A hand-written validator with `assumed` and `missing` exists.
- No site has legal pages. tupathdigital's footer links to its stores and social profiles only. Its brief has no market or holder data.
- Sites copy the starter at creation. A factory change does not edit site folders.

## Goals / Non-Goals

**Goals:**

- Detect cookies and trackers from evidence: the build, plus a real browser load. Never guess.
- Generate legal pages only from the customer's data. Missing data is visible as "pending legal review" and fails the report.
- Keep CI green on existing sites: unknown requirements warn, they do not fail.
- No new dependencies.

**Non-Goals:**

- A consent banner component.
- Terms of sale.
- Rule sets beyond the EU and Spain.
- Translating legal pages beyond `en` and `es`.
- Any guarantee of legal compliance.

## Decisions

### 1. Privacy record in QA (`pages[].privacy`)

- **When:** during the existing 1440 px normal load in `qa.mjs`, after the page settles and is scrolled once to the bottom, so lazy embeds load.
- **What QA collects:**
  - `context.cookies()`, as `{ name, domain, path, session, thirdParty }`, with the values dropped at collection time;
  - `localStorage` and `sessionStorage` keys, without their values;
  - the set of request hosts other than the page's own origin, from `page.on('request')`.
- **Why QA and not the report:** the report never starts a browser, and QA already loads every page. The report reads the record behind the same freshness guard it uses for Lighthouse detail.
- **Alternative rejected:** a second browser pass in the report. It would duplicate QA's server and Chromium setup.

### 2. Tracker and cookie rules (`scripts/report/legal-rules.mjs`)

**Built-in host list, by category:**

| Category | Hosts |
| --- | --- |
| analytics | `google-analytics.com`, `googletagmanager.com`, `analytics.google.com`, `clarity.ms`, `hotjar.com`, `mixpanel.com`, `segment.io`/`segment.com`, `plausible.io` (cookieless, see below) |
| advertising | `doubleclick.net`, `googlesyndication.com`, `connect.facebook.net`, `facebook.com/tr`, `analytics.tiktok.com`, `snap.licdn.com`, `ads-twitter.com` / `static.ads-twitter.com` |
| embeds that set cookies | `youtube.com` (not `youtube-nocookie.com`), `player.vimeo.com` (it sets cookies unless `dnt=1`), `google.com/maps` and `maps.googleapis.com` |
| fonts and CDNs (IP disclosure, warn only) | `fonts.googleapis.com`, `fonts.gstatic.com`, `use.typekit.net`, `cdnjs.cloudflare.com`, `unpkg.com`, `cdn.jsdelivr.net` |
| cookieless analytics (pass, listed for the privacy policy) | `plausible.io`, `static.cloudflareinsights.com` |

**Cookie names:**

- Known non-essential patterns: `_ga*`, `_gid`, `_gcl_*`, `_fbp`, `_fbc`, `_hj*`, `_clck`, `_clsk`, `IDE`, `NID`, `_tt_*`, `_pin_*`.
- Essential allow list: `qa.config.json` `legal.essentialCookies`, defaulting to `__cf_bm` (Cloudflare's bot management) and `cf_clearance`.
- Any other cookie warns with "classify this cookie" and is never silently passed.

**Rules:**

- **Cookies at first load:** a non-essential cookie or storage key set at first load, before any interaction, fails, whatever banner exists. Consent must come before the cookie (ePrivacy).
- **Trackers in the build:**
  - a tracker script or embed that loads unconditionally fails;
  - a tracker that is inert until consent (`<script type="text/plain" data-consent="<category>">`, or an embed placeholder with `data-consent-src`) passes with a warning, "verify the consent mechanism";
  - the report does not judge banners.
- **No cookies, storage keys or trackers:** pass, with "no consent banner needed".
- **Without a fresh QA record:** the build checks still run, and the runtime part is `not-run` with "run QA first".

### 3. Price claims

- **What is scanned:** the visible text of each built page, in English and Spanish:
  - percentages next to discount words: `off`, `discount`, `save`, `descuento`, `dto`, `rebaja`, `ahorra`;
  - `<s>` and `<del>` around a price-like string;
  - pairs like "was/now" and "antes/ahora".
- **Result:** each match warns with the page and up to 80 characters of text. When the brief's markets include `EU` or an EU member code, the fix mentions the Omnibus 30-day rule.
- **Why never a fail:** coupons and store-side discounts are often lawful as stated. A person must judge them.

### 4. Brief schema

`legal` gains these fields:

```js
markets: list(str({ format: 'market' })),       // 'EU' or ISO 3166-1 alpha-2, e.g. 'ES', 'US'
holder: obj({ name, taxId, address, email (format email), register }),
privacyContact: str({ format: 'email' }),
processing: obj({ analytics: str({ enum: ['none','cookieless','cookies'] }),
                  forms: { type: 'boolean' }, embeds: list(str()) }),
```

- **Validation:**
  - Any `assumed` entry under `legal.holder` or `legal.privacyContact` is a validation error: identity data is never assumed.
  - `missing` lists the holder fields and the privacy contact as recommended when `markets` is non-empty, in interview order after `contact`.
- **Version:** the brief version stays the same. The new fields are optional and empty by default, so existing briefs stay valid.
- **Interview (`/brief-intake`):** it gains one legal step:
  - "Where will you sell or promote this (countries)?";
  - then the holder data;
  - then "analytics, forms or embeds?".

  It explains in one sentence why each item is needed.

### 5. Legal pages

- **Generator:** `scripts/legal.mjs --site <slug> [--write|--check]` builds `src/data/legal.json` from the brief:
  - the markets;
  - the required pages from the rule set;
  - the holder;
  - the privacy contact;
  - the processing;
  - the third-party hosts the build loads (read from `dist/` when present);
  - the page language;
  - a `pending` list of the required fields that are missing.

  `--check` exits 1 when the file is stale against the brief, mirroring `credits.mjs --check`.
- **Starter components:** `src/components/legal/LegalNotice.astro` and `src/components/legal/PrivacyPolicy.astro`.
  - Both render from `legal.json`, with texts in `src/components/legal/texts.ts` (`en`, `es`) and the language from the data.
  - A missing value renders `<mark data-legal-pending>Pending legal review: <field></mark>`.
  - Each page source starts with a comment: templates support compliance and are not legal advice.
  - The privacy policy lists the host as processor (Cloudflare Pages by default, or the brief's `deploy.target`), the IP and server logs, the processing answers, and the third-party hosts.
- **`new-site`:** copies `src/components/legal/` (added to `COPIED_PATHS`). It does not copy pages: the generation adds `src/pages/legal-notice.astro` and `src/pages/privacy.astro` only when the market requires them, plus footer links.
- **`/new-landing` skill:** when `legal.markets` is non-empty, it runs `node scripts/legal.mjs --site <slug> --write`, adds the required pages and footer links, and lists any `pending` field under Decisions. With no market, it writes "legal requirements unknown" under Decisions.

### 6. Rule sets (`legal-rules.mjs`)

| Market | Required pages | Holder fields required |
| --- | --- | --- |
| `EU` and every EU member code | privacy policy | name, email (or `privacyContact`) |
| `ES` | privacy policy, legal notice | name, tax id, address, email; register when the holder is a company (warn only, since the schema cannot tell) |
| any other market | none known | warn "no rule set for <market>" |

- **Page detection:** pages are found by path (`/legal-notice/`, `/privacy/`, `/aviso-legal/`, `/privacidad/`) or by the `data-legal-page="notice|privacy"` attribute the components set.
- **Footer links:** "Linked from every page" means each built HTML page has an `<a>` to each required page.

### 7. Report wiring

- `items.mjs` adds `legal` to `AREAS`. `render.mjs` adds a "Legal" section after security and performance, ending with the not-legal-advice line.
- The four legal items keep stable ids: `legal-cookies`, `legal-third-party`, `legal-pages`, `legal-price-claims`.
- `--skip legal` is allowed.
- CI needs no workflow change: the static report already runs after QA.

## Risks / Trade-offs

- **[False sense of compliance]** → "not legal advice" appears in the report, the pages and the docs. The rule sets are few and named, and unknown markets never pass.
- **[Tracker list goes stale]** → a short list of the most common hosts, unit-tested, and extendable in `qa.config.json` `legal.trackers`. An unknown third-party host still shows in the IP-disclosure warning, so nothing is invisible.
- **[Cloudflare sets `__cf_bm` on some deployments]** → it is on the essential allow list. The live run does not read cookies (only QA's local load does), so preview-only cookies never fail.
- **[Templates in two languages may read stiff or miss local nuance]** → they are short and factual, built from data, and reviewed by a person before production. Each page says so in its source.
- **[Price-claim regex noise]** → warnings only, with the matched text, so a human decides quickly.

## Migration Plan

1. Land the QA record, the report area, the schema, the generator and the components.
2. The seven existing sites warn (no brief market, or no brief). Nothing fails, and CI stays green.
3. **Follow-up site change for tupathdigital:**
   - the owner provides the markets and the holder data;
   - generate the legal pages;
   - review the "50% off" wording against the 30-day rule.
4. **Rollback:** the legal area can be skipped (`--skip legal`), and the schema fields are optional.
