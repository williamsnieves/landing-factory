# Run log: tupathdigital

Result: passed

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field           | Value                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Niche           | Digital AI products and guides (brief `sites/tupathdigital/brief.json`, valid; assumed: `offer[9].currency`; empty: contact email, phone, address, hours, audience objections, domain, fonts, references) |
| References      | none in the brief; 21 customer assets: logo and 20 product covers in `assets/`                                                                                                                            |
| Mode            | auto (resumed after approval), lang en                                                                                                                                                                    |
| Max QA attempts | 5                                                                                                                                                                                                         |
| Started         | 2026-10-23T18:39:02Z                                                                                                                                                                                      |

## Phases

| Phase         | Status | Started              | Finished             | Notes                                            |
| ------------- | ------ | -------------------- | -------------------- | ------------------------------------------------ |
| brief         | done   | 2026-10-23T18:39:02Z | 2026-10-23T18:39:57Z | brief valid                                      |
| synthesis     | done   | 2026-10-23T18:39:57Z | 2026-10-23T18:41:00Z | bento-product-showcase+data-and-proof            |
| checkpoint    | done   | 2026-10-23T18:41:00Z | 2026-10-23T18:56:30Z | approved by the owner, resumed with --auto       |
| design-system | done   | 2026-10-23T18:56:30Z | 2026-10-23T18:58:10Z | Space Grotesk + DM Sans, dark, #1881d4           |
| build         | done   | 2026-10-23T18:58:10Z | 2026-10-23T19:16:47Z | 17 cards, 1 scene, 21 customer images            |
| qa            | done   | 2026-10-23T19:16:47Z | 2026-10-23T19:18:30Z | passed on the first run                          |
| polish        | done   | 2026-10-23T19:18:30Z | 2026-10-23T19:19:00Z | detector clean, section shots reviewed, no edits |
| final-check   | done   | 2026-10-23T19:19:00Z | 2026-10-23T19:20:52Z | check-landing passed                             |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins). Every deviation from the chosen archetype sheets, with the requirement or reference that justifies it.

Art direction came from `draw.mjs --sector ecommerce --tone bold --have product-photo --keep palette,type`, direction `hero-object` (the object, large), used as: hero as a split with one big object (the code-built network scene) with the owner's covers drifting around it.

Skill conflicts (proposal and MASTER.md win):

- Skill: a hero with no navigation beyond a wordmark and one action, and a light solid tab. Proposal: a header with Shelves, Coupons, Stores anchors and a primary "See products" button. Kept the proposal.
- Skill: full-bleed 100svh showcase frames with a single opaque card per product, and a 100svh footer photograph with a giant wordmark. Proposal and archetype (no wordmark footer, 17 products in a bento): kept the bento tile grid and a compact footer.
- Skill: no gradients, no shadows at rest, no eyebrows. Kept: no shadows at rest and no eyebrow over headings except the small "N products" count label inside each shelf title tile; same-hue (brand blue) radial tints are used on full-width bands and the closing card. No new hue.
- Skill: rectangular buttons, one corner radius. MASTER.md fixed pill buttons for main actions; kept (pill), one button shape for the whole page.
- Skill: one "live thing". Kept the copy-code tickets as the page's live control.

Deviations from the bento-product-showcase sheet:

- A tile carries cover, title, price, discount badge and store buttons (several messages), because the page's job is purchase (planned in the proposal).
- A hero 3D scene (planned in the proposal) and a shelf index of anchors (CSS only, planned).
- Product covers sit inset in their tile with a 20 px radius; each shelf starts with a coloured title tile with a large product count, and a 50% off promo tile fills the last gap of the guides shelf.
- `cols3Share` is 0.22 (expected 0.3 to 1): the shelves are 2 and 4 column mosaics because landscape covers need 2 columns to stay uncropped.
- A full-width band lit by the brand blue (same hue) carries the mid-page call to action; the closing section uses a dimmed wallpaper cover (AI Tech pack) as a full-width backdrop to differ from sibling sites (layout-diversity).
- Buttons are pills (MASTER.md); the data-and-proof trait `stat-strip` is the four-tile figures row (products, stores, 50% off with a code, shelves). "Instant download" is not a fact the owner stated in the brief, so the fourth figure is the number of shelves.

Polish pass A (owner review, 2026-10-23):

- Shelf title tiles: count, title and blurb stay, and the empty middle now holds a fanned preview of 2 to 3 covers of that shelf (decorative, `alt=""`, `aria-hidden`, lazy). The 3D shelf tile is a short horizontal band (text left, covers right), so no tile is a tall empty block and no text touches the bottom border.
- Product tiles: more inner padding, price and button row wraps, the coupon badge is two lines ("50% off with code X" / "Until date") with the code kept on one line. Facts unchanged.
- Closing: the wallpaper cover backdrop (its printed text showed through) is replaced by a soft brand-blue radial glow that fades inside the section; the "Follow along" card is top-aligned, compact, with divided rows. The AI Tech cover is now used only in its shelf card.
- Arrow links: one continuous underline under text and arrow (the arrow is inline text), applied to every `.link-arrow`.
- Background tints: `glow-left`, `glow-right`, the mid-page band and the closing glow are ellipses or gradients that reach transparent inside their own box, so no hard edge shows at 375 or 1440 px.

Redesign B (2026-10-23, owner request: premium, trust to buy; spec in `PROPOSAL.md` "Redesign B"):

- Sections now: header (Products, How it works, Coupons, FAQ), split hero, "Available on" store strip, four figure tiles, one filterable catalog, how it works, coupons, FAQ, closing, footer. Removed: the `network` 3D scene, its poster (`network-poster.jpg`, dropped from `assets.json`, credits regenerated), `Shelf`, `ShelfIndex`, `MidCta`, the bento title tiles and the shelf promo tile.
- Hero: a stack of five real covers (eager and `fetchpriority="high"` on the front one, the other four lazy, `sizes` set) at slight angles on a blue bloom, plus three floating fragments (coupon code, GLB/FBX/OBJ formats, lowest listed price) with `data-parallax` from the motion layer; no entrance animation on the images so LCP is not delayed. Without JS or under reduced motion the stack and chips sit still at their CSS positions. The OG image is now the 450-prompts Gumroad cover instead of the poster.
- Catalog: one section, filter pills as radio inputs and labels (`:has()` hides the other groups, no JavaScript needed; keyboard arrows move between pills, visible focus ring); shelf groups stay visible under "All". Cards are uniform (one radius, hairline border), the cover is shown whole on a blue spotlight, mono tags come only from words in the listing titles (so Spanish words such as "Guía", "Plantilla", "30 días" stay as written). Both-store cards keep both titles, prices, badges and buttons.
- Mono family added: Geist Mono Variable (`@fontsource-variable/geist-mono`, OFL 1.1); not used by another site with the same display font.
- No sales counts, ratings, reviews, testimonials or partner logos. FAQ answers only state facts from the brief and the listing titles; no refund, license or support promises.

Deviations from the archetype sheets in Redesign B (bento-product-showcase primary, data-and-proof secondary), each justified by the owner request and the two reference sheets:

- The bento mosaic with spans and shelf title tiles is replaced by a uniform 3-column card grid with filter pills (reference `craftsman-contractor-21st-app`: disciplined card system, filter pills). The bento sheet's 2x2 lead tile and coloured count tiles are gone; the `layout-signature` columns will read as 3 uniform columns.
- A centered closing card on a soft glow (reference `crypgo-21st-app`) instead of a left-weighted closing plus follow-along card; socials stay in the footer.
- The hero loses its code-built scene in favour of a cover stack with floating fragments (owner: no 3D models); this is a collage-like hero, so `hero: split` stays in `landing-meta`.
- Mono eyebrows and pill labels are used above headings (the design-taste skill prefers none; the reference sheets and the owner request both ask for the mono label system). One accent word per heading.
- `check-landing` warns (not fails) about `archetype-target`: `cols3Share` 0.25, `imageRadius` 0 (covers are shown whole inside the card, the card itself has the 20 px radius) and `eyebrowShare` 1 (every section has a mono eyebrow, by the reference sheets); all follow from the points above.
- Interactive pills and the FAQ rely on CSS only; no new JavaScript beyond the existing copy-code script.

Prices are shown as "$x.xx" USD; the Etsy guide listed as "14,50" is shown as "$14.50" (confirmed by the owner as USD). No final (discounted) price is shown.

## Images

21 customer files (the logo and 20 product covers), 0 stock photos, 0 posters (the hero scene and its poster were removed in Redesign B). All customer files are recorded in `assets.json` with `source: "customer"`, owner `tupathdigital` and the permission written in the brief; none asks for a public credit. The originals stay in `assets/`; the optimized copies are in `src/assets/images/`. Each cover is used once in its shelf card; the three covers of products sold in both stores that are not used in a card (the Etsy covers of the 450-prompts guide, the Meshy bundle and the 50 Fantasy models Vol. 2) appear once each as drifting cards in the hero; the logo appears in header and footer.

To confirm before launch: coupon codes and the "until Oct 31, 2026" text must be updated or removed after that date (owner decision).

## QA attempts

| #   | Verdict | Failures by check | Fixed | Notes                                                                     |
| --- | ------- | ----------------- | ----- | ------------------------------------------------------------------------- |
| 1   | passed  | none              | none  | Lighthouse mobile 99/100/100, desktop 100/100/100; section shots reviewed |
| 2   | passed  | none              | none  | Re-run after Prettier                                                     |

## Final check

`check-landing`: passed (images-credited, credits-in-sync, photo-uses, landing-meta, tokens, contrast, diversity, layout-diversity, scenes, brief-facts). One warning, `archetype-target` `cols3Share` 0.22, explained under Design decisions. `credits --check`, Prettier, `astro check` (`check:sites`) and the final `npm run qa -- --site tupathdigital` all pass.

To confirm before launch: the coupon codes and "until Oct 31, 2026" text need updating or removing after that date; no contact block (no email, phone or address in the brief); the domain and deploy target are undecided.

To fetch by the owner: nothing.

## Totals

Wall clock about 42 minutes in total (2026-10-23T18:39Z to 19:21Z, including the earlier synthesis run). Token count not reported. No remaining failures.

## Owner changes 2026-10-31

Preparation for production on the owner's domain (decisions of 2026-10-31). Result stays `passed`: every check below passed.

- Coupons removed: the codes FALL2026 and 92xsh57 expired on 31 October 2026. No code, "50% off", discount badge, end date or coupon FAQ remains in the page, `catalog.ts` or the offer descriptions of `brief.json`; the Coupons section and its copy script are deleted and the header link is now "Stores". The hero coupon fragment became a "Catalog, 17 products" fragment, the third hero chip says "Prompts, 3D & wallpapers", the figure tile shows 4 shelves, and the "How it works" step 2 is "Buy in the store". Copy states no price claim and no invented fact.
- Domain and deploy: `site: 'https://tupathdigital.com'` (apex canonical, `www` redirects at Cloudflare); brief `deploy` is `cloudflare-pages` on `tupathdigital.com`; `site.config.json` unchanged (Cloudflare Pages project `tupathdigital`, branch `main`).
- SEO opt-in: `seoFiles()` in `astro.config.mjs` (no prospect parts), `public/robots.txt`, `BaseLayout` writes `og:url`, `og:locale`, `ogType` and the `jsonLd` prop, `src/data/seo.ts` holds the title, description, the absolute OG image (the owner's 450-prompts cover) and the JSON-LD graph (Organization, WebSite, ItemList of Products with offers from the brief prices and store URLs; no reviews or ratings). `seo.primaryKeyword` "AI products" is listed in `assumed`.
- Analytics: Cloudflare Web Analytics, cookieless, enabled by the owner in the Pages project (no script tag in the HTML). The CSP allows `https://static.cloudflareinsights.com` in `script-src` and `https://cloudflareinsights.com` in `connect-src`. `legal.processing.analytics` is `cookieless`, `legal.json` was rewritten and the privacy policy (site's own `texts.ts`, `en` and `es`) names Cloudflare Web Analytics (Cloudflare, Inc.).
- UTM: every store link of the page (header and hero buttons, store strip, product buttons, closing, 404, privacy) carries `utm_source=tupathdigital.com&utm_medium=referral&utm_campaign=landing` through `storeLink()` in `catalog.ts`; `brief.json` URLs are unchanged. The footer "Etsy shop" link stays without UTM because `check-landing` `brief-facts` compares the primary call-to-action URL with an `href` exactly.
- Code: the brand mark is imported once in `catalog.ts` (`brandMark`) so `photo-uses` counts one use for the header, footer and structured data.

Checks (2026-10-31): `brief validate` valid; `npm run qa -- --site tupathdigital` passed (Lighthouse mobile 99/100/100, desktop 100/100/100); section shots reviewed; static report 0 fail, 2 warn (`lh-assets` image savings, `legal-pages` no rule set for US; every `seo-*` item passes); `layout-signature --write`; `check-landing` passed (the same `archetype-target` warning as before); `credits` up to date; `handoff check --visibility private` ready; `npm run lint`, `npm run check -w site-tupathdigital` and Prettier clean.

## Owner change 2026-10-31: favicon

The starter's generic favicon (`public/favicon.svg`) is replaced by the brand mark cropped from the owner's logo (`src/assets/images/logo.webp`, recorded in `assets.json`): `public/favicon-48.png` and `public/apple-touch-icon.png` (180 px), the circle mark on white, without the wordmark, which is unreadable at icon size. `BaseLayout.astro` links both.
