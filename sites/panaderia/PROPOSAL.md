# Proposal: panaderia (first manual run)

Status: **approved** (2026-10-18) with the decisions below. Nothing is built yet.

## Brief

- **Niche:** artisan neighborhood bakery (sourdough bread, pastries, coffee).
- **Brand (fictional):** "Horno Lento", a small sourdough bakery in Barcelona.
- **Goal of the page:** make people want to visit or pre-order for pickup. Primary action: "Encarga para recoger" (order for pickup); secondary: "Cómo llegar" (visit).
- **Audience:** locals who care about real bread; weekend visitors.
- **Tone:** warm, crafted, unhurried, with one playful moment. Copy in Spanish, original.
- **Site location:** `sites/panaderia/` in this repo (model A), its own Cloudflare Pages project.

## References used

| Sheet                             | What we take                                                                                                                                                                               | What we leave                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `patterns/sonomabakery-com.md`    | Macro texture photography as hero, small confident type, asymmetric grid with text in the right half, product tiles reduced to name and price, warm tinted panel for the process statement | Custom virtual scroller, archival label style                                    |
| `patterns/bernicebakery-com.md`   | One bold display moment, one scroll-scrubbed giant word behind a product row, arch-cropped photos, wordmark set huge in the footer                                                         | Cart and quantity UI, loud color pairing, sticker illustrations, effect stacking |
| `patterns/blackstarbakery-com.md` | Practical structure: how to order, where we are, opening hours; one accent color reserved for the main action                                                                              | Small grey body text, crowded photo grids, delivery-platform logos               |

**Direction in one line:** Sonoma's editorial calm as the base, one dose of Bernice's personality, Black Star's practical answers.

## Page map

| #   | Section           | Height                 | Purpose                            | Layout idea                                                                                                                             |
| --- | ----------------- | ---------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Header            | thin                   | Navigation and the main action     | Wordmark left, 3 anchor links, pill "Encarga" button in the accent color; becomes solid on scroll                                       |
| 2   | Hero              | 1 viewport             | First impression: craft and warmth | Full-bleed macro photo of a crust; short statement (2 lines) bottom-right; small "Abierto hoy hasta las 20:00" line                     |
| 3   | Manifesto         | ~0.7 viewport          | Why our bread is different         | Warm tinted panel; one large sentence on slow fermentation; three small facts (hours of fermentation, flours, baked daily)              |
| 4   | Today in the oven | ~1 viewport            | Show the products                  | Heading left, 6 arch-cropped product tiles (name and price only), 3 columns desktop / 1 mobile                                          |
| 5   | The process       | ~2 viewports of scroll | Tell the craft story               | Pinned section: photo on the left changes through 4 steps (starter, kneading, slow rise, baking) while short texts advance on the right |
| 6   | Giant word        | ~0.8 viewport          | The one playful moment             | Outlined giant word ("MASA MADRE") travels sideways with scroll behind a strip of 3 arch photos with light parallax                     |
| 7   | Visit us          | ~0.8 viewport          | Practical info                     | Split: address, opening hours table, "Cómo llegar" link to a map; right side a storefront/interior photo                                |
| 8   | Order for pickup  | ~0.5 viewport          | Conversion                         | Short line on ordering by the day before, large accent button (mailto or phone link; no backend form)                                   |
| 9   | Footer            | ~0.6 viewport          | Close                              | Small link columns, social links, then the wordmark set huge across the full width                                                      |

## Motion plan

| Moment                     | Trigger | Type                              | Notes                                                                      |
| -------------------------- | ------- | --------------------------------- | -------------------------------------------------------------------------- |
| Hero statement             | load    | reveal (fade and rise, staggered) | Photo itself does not move                                                 |
| Section headings and tiles | scroll  | reveal                            | Existing `data-reveal` primitive                                           |
| The process (5)            | scroll  | pin + step change                 | Existing `data-pin` primitive (pins from `md` up; stacked steps on mobile) |
| Giant word (6)             | scroll  | scrub (horizontal)                | Needs a small new primitive: `data-marquee-scrub`                          |
| Arch photo strip (6)       | scroll  | parallax (subtle)                 | Existing `data-parallax`                                                   |
| Whole page                 | scroll  | smooth scroll                     | Lenis, off under reduced motion                                            |

Reduced motion: no pin, no scrub, no parallax, no smooth scroll; all content visible in its final state. Without JavaScript the page reads top to bottom with every section visible.

## Visual direction (to be fixed by the design system step)

- **Type:** a warm serif or soft grotesque for display used big only in the hero, manifesto and giant word; neutral sans for body. Final pairing chosen by ui-ux-pro-max.
- **Palette:** warm off-white base, sand panel tint, dark warm-brown text, one accent for actions (burnt orange or deep wheat). Final values by ui-ux-pro-max.
- **Imagery:** close-up crusts, flour, hands working dough, a warm interior. Openly licensed photos (for example Unsplash or Pexels licenses), every one recorded in `sites/panaderia/CREDITS.md`. No images from the references.

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings. Hero photo optimized (responsive sizes, modern format, preloaded).

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages.

## Decisions (review of 2026-10-18)

1. Brand "Horno Lento", located in Barcelona (fictional business; address and phone are placeholders).
2. Copy in Spanish, original.
3. Generic sourdough loaves and pastries, plus gluten-free variants (bread and a couple of pastries) shown with a "Sin gluten" tag and a short dedicated block (section 4b). Copy must not make medical or certification claims; it says the items are made without gluten-containing ingredients and that customers with coeliac disease should ask in the shop.
4. Personality: one playful moment (the scrubbed giant word) is the right amount.

## Next steps after approval

1. Infrastructure for model A: `sites/<slug>/` workspace with its own build, QA and Cloudflare project (small OpenSpec change).
2. Design system with ui-ux-pro-max: `design-system/panaderia/MASTER.md` then tokens.
3. Build with taste-skill (art direction and licensed photos) on the existing motion primitives.
4. QA loop, impeccable critique and polish, preview on Cloudflare.
