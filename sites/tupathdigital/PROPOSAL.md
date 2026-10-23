# Proposal: tupathdigital

Status: **approved** by the owner on 2026-10-23 (answers in Decisions 3 to 5 and the 3D section).

## Brief

- **Source:** `sites/tupathdigital/brief.json` (valid; the one assumed field, `offer[9].currency`, and every empty field are listed under Decisions).
- **Niche:** Ready-to-use digital products about technology, mostly AI: guides and prompt collections, planners, wallpaper packs, 3D asset bundles, and everyday guides (finance, freelancing, parenting, social media). Sold on Etsy and Gumroad.
- **Brand (real):** tupathdigital. Logo: a blue circular "t/e" mark with the wordmark below, used as given.
- **Goal of the page:** send traffic to the stores. Primary action: "See products" → the Etsy shop. Secondary, quieter: "Gumroad store" → the Gumroad store. Every product card links straight to its listing.
- **Audience:** a mix of the catalog's publics, mostly people who want to make things with AI and have examples they can use right away. They want fast, direct material with real applications and no wasted time.
- **Tone:** technical, energetic, friendly, close.
- **Signals:** technical, bold, product-showcase, conversion-first, educational, photo-rich
- **Language:** English only for now (owner decision). Some product names are Spanish-language listing titles and stay exactly as listed.
- **Site location:** `sites/tupathdigital/`, its own Cloudflare Pages project.

## References used

| Sheet | What we take                         | What we leave                                                                                                                                              |
| ----- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| none  | The brief lists no liked references. | Nothing disliked either. The owner's ambition ("looks like a 40,000-dollar website, creative, made to drive traffic and conversions") is the creative bar. |

**Direction in one line:** a dark, electric shelf of AI products in the logo's blue where the owner's own cover art is the hero material, one bento mosaic that sorts 17 products into four shelves, and a 50% coupon you can copy in one tap.

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site tupathdigital` (top candidate, score 7.5).

- **Primary:** bento-product-showcase
- **Secondary:** data-and-proof
- **Lent traits:** `stat-strip`, and `spec-chips` stays native to the primary (format, count and tool chips on each card)
- **Why:** the brief reads technical, bold, product-showcase and conversion-first with 21 owner-provided images (photo-rich). The bento grammar fits a catalog of 17 products with strong cover art; data-and-proof lends a strip of real figures (products, stores, discount). The others were passed over: immersive-scene would put chrome over covers that already carry heavy text, and swiss-grid-minimal is penalized by `bold`.
- **Twist from the requirement:** the covers are the owner's own art and already loud (neon, gradients, dark fantasy), so the page is a quiet dark canvas that lets them glow, and the 50% coupon is treated as an object: a ticket-shaped "copy code" control per store, not a banner.
- **Planned deviations:** (1) tiles are not one-message-only: a product tile carries cover, title, price, discount badge and its store buttons because the page's job is purchase; (2) one scrubbed 3D scene in the hero area, which the bento sheet does not plan; (3) a filterable shelf row (CSS-only, with anchors) over the grid.

## Page map

| #   | Section                         | Height       | Purpose                                                                                                  | Layout idea                                                                                                                                                |
| --- | ------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Header                          | 64px, sticky | Logo, three anchors (Shelves, Coupons, Stores), primary action "See products"                            | Compact floating bar, rect button                                                                                                                          |
| 2   | Hero                            | 100svh       | Say what this is and drive to the shop                                                                   | Split: headline and the two actions on the left; a code-built node network scene with cover tiles drifting around it on the right. Scene poster is the LCP |
| 3   | Figures                         | ~30svh       | Real numbers: 17 products, 2 stores, 50% off with a code, instant download (only facts the owner gave)   | Stat strip, large tabular figures, no invented claims                                                                                                      |
| 4   | Shelf: AI and prompts           | ~110svh      | Gen AI 450 prompts (both stores), AI Professional Prompt Collection, Lovable Playbook, AI Weekly Planner | Bento: one 2x2 lead tile, three small tiles; spec chips (tools named in the listing titles)                                                                |
| 5   | Shelf: 3D and game assets       | ~90svh       | Meshy 54 models and guide (both stores), 50 Fantasy and Sci-Fi models Vol. 2 (both stores)               | Bento: two wide tiles, each with two store buttons and the second store's own title and price in small type                                                |
| 6   | Shelf: wallpapers               | ~110svh      | Six background packs                                                                                     | Bento mosaic of landscape covers with varied spans                                                                                                         |
| 7   | Shelf: guides for life and work | ~100svh      | Social media kit, parents guide, freelancer guide, two finance guides                                    | Bento of portrait and landscape tiles; Spanish-language titles kept as listed                                                                              |
| 8   | Coupons                         | ~60svh       | How to use the 50% codes                                                                                 | Two ticket-shaped copy controls: FALL2026 for Etsy, 92xsh57 for Gumroad, each linking to its store                                                         |
| 9   | Closing                         | ~50svh       | Repeat the single action                                                                                 | Large "See products" button, Gumroad as the text link, X and Instagram links                                                                               |
| 10  | Footer                          | ~30svh       | Logo, store and social links, credits                                                                    | Columns: stores, social, credits; no contact email (none given)                                                                                            |

Product count check: 20 listings, 3 sold in both stores, so 17 cards (4 + 2 + 6 + 5).

## Motion plan

| Moment      | Trigger                 | Type                             | Notes                                                                                                |
| ----------- | ----------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Tile reveal | enter viewport          | `data-reveal`, staggered         | All tiles, short fade and lift                                                                       |
| Hero scene  | scroll through the hero | `scrub` 3D scene                 | Nodes in the logo blue connect as the page scrolls; one scene only                                   |
| Cover hover | pointer hover           | CSS lift and glow                | Pointer devices only                                                                                 |
| Copy code   | click                   | small JS island or inline script | Copies the code to the clipboard and says "Copied"; the code is visible text, so it works without JS |

No pinned section. Reduced motion: no scrub, no parallax, no smooth scroll; the hero shows its poster and every tile is visible at rest. Without JavaScript the page reads top to bottom, every product link works and the codes show as plain text.

## Visual direction

- **Type:** a geometric grotesk for display at a large size with tight leading, and a clean sans for text, with tabular figures for prices and stats. Open-licensed `@fontsource` families, fixed in the design system step.
- **Palette:** near-black blue ground with the logo blue (#1881d4) as the primary and a cooler lighter blue for accents. No second brand hue: the covers supply the color (magenta, orange, violet). The design system step fixes the values and checks contrast.
- **Hero type:** split
- **Imagery:** the 21 provided images only (logo plus 20 product covers; 17 distinct cards and the second store's cover for the three duplicates), each recorded in `assets.json` with `source: "customer"`, owner and permission. No stock photos. Covers carry their own text, so they stay uncropped inside tiles or are cropped only on the edges. Each cover is used at most twice and never twice in one section.

## 3D

One scene, built from code (no models), because the audience is AI and 3D-minded and the owner wants a standout hero (confirmed by the owner).

| Scene     | Purpose                                                                                  | Poster                                                                      | Scroll behavior               | Reduced-motion fallback |
| --------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------- | ----------------------- |
| `network` | A field of a few hundred linked points forming a "path", the brand idea, in token colors | Rendered from the scene with `scripts/render-poster.mjs` (`source: "self"`) | `scrub` over the hero section | The poster; no canvas   |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings, 3D JavaScript within 200 KB gzip. Covers are served as optimized responsive images (the largest are the Gumroad PNGs).

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages (a Spanish version may come later).

## Decisions

1. Customer facts shown exactly: business name, the 20 listing titles (kept as written, including Spanish ones), prices, store URLs, the primary and secondary action URLs and the X and Instagram links. Nothing is labeled sample.
2. Duplicated products (Gen AI 450 prompts, Meshy 54 models, 50 Fantasy Sci-Fi models Vol. 2) appear once with two buttons, Etsy and Gumroad, and the card shows each store's own title and price so every listing stays findable (owner decision).
3. Discount: each product shows its listed price with a visible "50% off" badge and its coupon code (FALL2026 on Etsy, 92xsh57 on Gumroad). We do not compute or show a discounted price: the owner did not say whether the listed price is before the coupon. Confirmed by the owner: the listed price is before the coupon, the badge means "50% off the listed price with this code" and the page shows no final price. Both codes end on 31 October 2026: the badge and the coupon tickets say "until Oct 31, 2026"; the owner updates or removes them after that date.
4. Confirmed by the owner: the Etsy guide priced "14,50" is in USD. The page shows it in the same format as the others.
5. Empty fields the page needs and the placeholder used: contact email, phone, address and hours are empty, so the footer has no contact block and the page offers only the store and social links (confirmed by the owner). Domain and deploy target are undecided: the site goes to its own Cloudflare Pages project for now. Audience objections are empty: no objection-handling copy is invented.
6. Customer assets: `assets/logo.webp` (used as given in header and footer) and the 20 product covers (`assets/products/*`), all with owner `tupathdigital` and the permission written in the brief. No stock photos. Gumroad covers are PNG and will be converted to optimized formats by the image pipeline, not edited.
7. Claims: no invented reviews, ratings, sales figures, download counts or testimonials. The figures strip uses only counts derivable from the brief (17 products, 2 stores) and the coupon. Product descriptions use only what the listing titles and covers state.
8. Tone: technical and energetic, in friendly second person ("grab", "copy", "ready to use").
