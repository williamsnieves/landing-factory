# Proposal: turnio

Status: **approved** (owner, 2026-11-03, with the Pro tag correction in Decision 10). Fill every section; the checkpoint waits for approval unless the run is automatic.

## Brief

- **Source:** `sites/turnio/brief.json` (the customer's requirement; fields listed in its `assumed` array, and empty ones, are not customer facts and are listed under Decisions). This brief is a test fixture: name, description, offer, URLs, contact email, awareness and keyword are all listed as assumed.
- **Niche:** online booking software for small hair salons, barbershops and beauty centres in Spain.
- **Brand (fictional or real):** Turnio, Madrid, ES (`business.name`, `business.city`, `business.country`; the name is assumed: a fictional SaaS). Kind `product`.
- **Goal of the page:** primary action "Empieza gratis" -> `https://app.example.com/registro?plan=gratis` (`goal.primary`); secondary, quieter action "Prueba el Pro 14 días" -> `https://app.example.com/registro?plan=pro` (`goal.secondary`).
- **Audience:** owners of hair salons, barbershops and beauty centres with 1 to 8 professionals in Spain. Needs: stop answering WhatsApps to give appointments while they work, fewer clients who do not show up, the week's agenda at a glance. Objections: "I manage with WhatsApp and a notebook", "my older clients will not know how to book online", "switching will take time I do not have" (`audience`).
- **Tone:** cercano, claro, práctico, moderno (`tone`).
- **Signals:** product-showcase, technical, conversion-first, calm, few-assets
- **Language:** Spanish (`language: es`, single locale).
- **Site location:** `sites/turnio/`, deployed to the target in its `site.config.json` (Cloudflare Pages; the brief asks for `cloudflare-pages`).

## References used

| Sheet                    | What we take                                                                                                                                                                                                                                                                                                                       | What we leave                                                                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patterns/linear-app.md` | Customer's reason: "Producto enmarcado en el hero y secciones de funciones limpias." The product interface as the hero visual, framed by a hairline and cropped by the fold; "heading left, copy right" feature modules with one visual each; two-tone statements; small mono labels; huge gaps between modules and tight insides. | The dark page (our audience is not developers; a light, calm page reads friendlier), the near-invisible line illustrations, the hero with no button in the content area, the changelog timeline (no real changelog), the heavy DOM. |
| `patterns/stripe-com.md` | Customer's reason: "Claridad y precios fáciles de comparar." The two-tone headline hierarchy; one saturated action color on a calm neutral page; product screens as rounded cards on faint tinted panels; a clear filled primary plus outlined secondary button pair; faint hairline frame rails.                                  | The WebGL ribbon hero, the live counter, the logo wall, the oversized statistics (no proof in the brief), carousels, mega-menu dropdowns, the floating chat widget.                                                                 |

No disliked references in the brief.

**Direction in one line:** a light, calm product page where Turnio's own agenda, drawn in HTML, is the hero and every feature module shows one piece of it, ending in a plain three-plan comparison a salon owner can read in ten seconds.

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site turnio --refs linear-app,stripe-com` (signals of the Brief, the reference sheets above, blends other sites already use). The archetype sheets in `design-archetypes/` are a starting grammar, not a template: any deviation goes in RUN.md "Design decisions".

- **Primary:** `product-led-saas` (owns the layout grammar, header, footer and hero type).
- **Secondary:** `data-and-proof`.
- **Lent traits:** `comparison-table` (from data-and-proof: the plan comparison under the pricing cards) and `ref:linear-app/mono-labels` (small mono labels for module numbers, plan tags and the fact strip).
- **Why:** the picker's top candidate was `custom` (score 18.75) because both references are rich in traits, but every reference trait the customer named (framed product hero, clean feature sections, two-tone headings) is already owned by `product-led-saas`, which also fits all five signals; the brief's notes name `product-led-saas` as the archetype under test. The `custom` option would add the marquee and scene-backdrop traits, which clash with `calm`. `data-and-proof` lends only its comparison table, which answers the stripe-com reason ("precios fáciles de comparar"); its `stat-strip` is not borrowed, because the brief has no figures. No other site uses `product-led-saas` as primary, nor this blend.
- **Twist from the requirement:** the page reads like one working day in the salon. The hero mock is a day's agenda with chairs or cabins as columns; each feature module zooms into one moment of that day (a client booking at night from Instagram, the WhatsApp reminder the evening before, the week at a glance on Monday morning); the mono labels are times of day (`23:40`, `19:00`, `lunes 08:55`) instead of section numbers. Times are scene-setting, not metrics.
- **Planned deviations:** the logo strip under the hero is replaced by a strip of facts from the brief (the sheet's own "Do" allows it: no customer marks exist). The proof module is replaced by the "how to start" steps and the FAQ that answers the brief's objections, because `proof` is empty on purpose.

## Page map

| #   | Section                                 | Height  | Purpose                                                                      | Layout idea                                                                                                                                                                                                                                                                                   |
| --- | --------------------------------------- | ------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| -   | Header (sticky)                         | 0.08 vh | Name and the one action always in reach                                      | Slim bar, hairline below: "Turnio" wordmark (type only, no logo drawn), links Funciones, Cómo empezar, Precios, Preguntas; filled "Empieza gratis" button. At 375 px: wordmark, button and a no-JS disclosure menu.                                                                           |
| 1   | Hero `#inicio`                          | 1.1 vh  | Say what Turnio is and for whom; primary and secondary actions               | Left-aligned two-tone `h1` (keyword inside), one muted line, "Empieza gratis" (filled) and "Prueba el Pro 14 días" (outlined). Below, a wide framed HTML/CSS mock of a day's agenda (columns per chair, appointment blocks labeled by service), cropped by the fold, on a faint tinted panel. |
| 2   | Fact strip `#datos`                     | 0.12 vh | Replace the logo strip with facts from the brief                             | One hairline-divided row of four mono-labeled facts: reservas desde un enlace o Instagram; recordatorio por WhatsApp (Pro); de 1 a 8 profesionales; plan gratis 0 €. Wraps to 2x2 at 375 px.                                                                                                  |
| 3   | Statement `#idea`                       | 0.35 vh | Name the visitor's situation plainly                                         | One large two-tone paragraph: the lead clause (giving appointments by WhatsApp while you work) at full contrast, the continuation muted.                                                                                                                                                      |
| 4   | Feature: reservas `#reservas`           | 1.0 vh  | Feature: booking link and Instagram at any hour                              | Heading left, copy and a text link right; below, a visual: a phone-width booking page mock (service, day, time slots) next to an Instagram-style profile button. Mono label `23:40`.                                                                                                          |
| 5   | Feature: recordatorios `#recordatorios` | 1.0 vh  | Feature: WhatsApp reminder for every appointment, deposit at booking (Pro)   | Flipped: visual left (a chat bubble mock with the reminder text, no client names), heading and copy right. Mono label `19:00`.                                                                                                                                                                |
| 6   | Feature: agenda `#agenda`               | 1.0 vh  | Feature: the week at a glance, by chair or cabin (Equipo), occupancy reports | Heading left, copy right; below, a wide week-view mock with abstract blocks and a small report panel drawn as bars with no numbers. Mono label `lunes 08:55`.                                                                                                                                 |
| 7   | Cómo empezar `#empezar`                 | 0.6 vh  | Lower the "switching takes time" objection with the real path                | Three hairline-divided columns, mono step labels: create the free account, share the link (or put it on Instagram), clients book and get reminded. No time claims.                                                                                                                            |
| 8   | Precios `#precios`                      | 1.3 vh  | Compare the three plans                                                      | Three plan cards side by side (Gratis, Pro highlighted, Equipo) with the brief's names, prices, descriptions and links; under them a comparison table (rows from the offer descriptions, plans as columns, check or dash).                                                                    |
| 9   | Preguntas `#preguntas`                  | 0.8 vh  | Answer the objections with brief facts                                       | Two columns: heading left, native `<details>` list right (works without JS).                                                                                                                                                                                                                  |
| 10  | Cierre `#empieza`                       | 0.4 vh  | Repeat the primary action                                                    | One two-tone line and the filled "Empieza gratis" button, the outlined Pro trial link beside it, on the tinted panel.                                                                                                                                                                         |
| -   | Footer                                  | 0.4 vh  | Navigation, contact, honest demo note                                        | Columns: Producto (anchors), Planes (the three plan links), Contacto (`hola@example.com`); a legal line with the demo note (see Decisions) and photo credits only if a photo is ever used.                                                                                                    |

The one conversion action ("Empieza gratis") sits in the header, the hero, the pricing card of Plan Gratis and the closing section.

## Motion plan

| Moment                | Trigger | Type     | Notes                                                                                                                 |
| --------------------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Hero text and actions | load    | reveal   | `data-reveal` with short `data-reveal-delay` stagger (0, 0.08, 0.16).                                                 |
| Hero agenda frame     | scroll  | parallax | `data-parallax="0.08"` on the frame's inner panel only: a gentle rise as the page scrolls.                            |
| Module headings, copy | scroll  | reveal   | `data-reveal` on each module's text block and visual.                                                                 |
| Reminder bubble       | scroll  | reveal   | The playful moment: the chat bubble arrives with `data-reveal-delay="0.3"` and `data-reveal-y="16"`, after its frame. |
| Plan cards            | scroll  | reveal   | Staggered `data-reveal` (0, 0.08, 0.16).                                                                              |
| Header                | scroll  | sticky   | CSS `position: sticky`, no JS.                                                                                        |

No pinned section. Reduced motion: no pin, no scrub, no parallax, no smooth scroll; all content visible in its final state. Without JavaScript the page reads top to bottom with every section visible, the FAQ uses native `<details>`, and the mobile menu is a `<details>` disclosure.

## Visual direction

- **Type:** one neutral grotesque sans for everything, regular to medium weights, large display with tight leading and slightly negative tracking; a monospace for the small time labels, plan tags and fact strip only. Families are picked by ui-ux-pro-max; avoid the display fonts other sites use (Manrope, Archivo, Space Grotesk, Schibsted Grotesk, IBM Plex Sans, Newsreader, Fraunces, Figtree, Bricolage Grotesque).
- **Palette:** light and calm: a warm off-white page, deep ink for headings, a muted grey for continuations and body, faint tinted panels behind the product mocks, hairline borders. One saturated action color only, in a family no other site uses as primary (not blue, navy, violet, teal, lime, orange or brown; a berry or magenta family fits a salon product and stays new). Values come from ui-ux-pro-max; text >= 4.5:1.
- **Hero type:** `typographic` (type-led headline and actions on top, the framed product mock under them as the product visual, cropped by the fold).
- **Imagery:** no photographs: the brief has no customer assets and the archetype says the interface is the image. All visuals are HTML/CSS mocks of Turnio's own screens (agenda, booking page, reminder message, week view), with service words and times only, no client names, no figures, no star ratings. `brand.aiImages` is empty, so no AI image. If the build wants one photo (for example a salon chair texture for the closing section), it comes from Commons through `find-images.mjs`, with no faces or brands, credited in `CREDITS.md`; the default is none.

## SEO

- **Primary keyword:** "app de reservas para peluquerías" (`seo.primaryKeyword`, listed as assumed in the brief). Secondary: "software de citas para peluquería", "recordatorios de citas por WhatsApp", "agenda online centro de estética" (`seo.keywords`), used once each where they read naturally (features, FAQ).
- **Service area:** none: an online product; `seo.serviceArea` is empty and no area is invented. The `local-seo` rules of `seo-audit` do not apply; its SaaS/product-site rules do (clear product title, features and pricing on the page, one `h1`).
- **Schema type:** `SoftwareApplication` (`seo.schemaType`) in `src/data/seo.ts`: name, description, `applicationCategory: BusinessApplication`, `operatingSystem: Web`, `offers` from the three plans (name, price, `priceCurrency: EUR`, url). No `aggregateRating` or `review` (no proof). No FAQPage markup (Google no longer shows it; the schema skill notes this).
- **Title and description per page:** title 30 to 60 characters, for example "Turnio: app de reservas para peluquerías y estética" (51); description 70 to 160 characters with the keyword, the WhatsApp reminder and the free plan; one `h1` holding the keyword; the 404 page gets its own title. `site` stays unset: the brief has no `deploy.domain` (the report warns; noted for the hand-off).

## Copy plan

Chosen from `node scripts/pick-copy-framework.mjs --site turnio` (awareness solution-aware (assumed), kind product, price low, goal lead, proof none, regulated false, objections present). Facts and proof come from the brief only; the writing help is the `copywriting` skill, the structure is the plan.

- **Framework:** `fab` (Features, Advantages, Benefits), score 5: fits a solution-aware visitor (+3), kind product (+1), low price (+1). Taken as ranked. The visitor already knows booking apps exist and is comparing; FAB shows what Turnio does, why that is better than WhatsApp and a notebook, and what it means for the owner's day. The objections (present in the brief) are carried by the steps and the FAQ inside the Benefit stage. 4P (score 4) was second; it would need a "Prove" stage with no proof available.
- **Awareness:** `solution-aware`, listed as assumed in the brief ("las peluquerías ya conocen las apps de reservas; dudan de cuál elegir").
- **Stage to section:**

| Section         | Stage                | What it says                                                                                                       | Facts it uses                                                         |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1 Hero          | Feature (lead)       | Turnio is the booking app for salons: clients book from a link or Instagram at any hour, with a WhatsApp reminder. | `business.name`, `business.description`, `seo.primaryKeyword`, `goal` |
| 2 Fact strip    | Feature              | Four plain facts from the offer.                                                                                   | `offer[].description`, `offer[0].price`, `audience.who`               |
| 3 Statement     | Advantage            | The situation it replaces: answering WhatsApps to give appointments while you work.                                | `audience.needs`                                                      |
| 4 Reservas      | Feature -> Advantage | Booking link and Instagram, any hour; you stop being the switchboard.                                              | `business.description`, `offer[1].description`, `audience.needs`      |
| 5 Recordatorios | Feature -> Advantage | A WhatsApp reminder for every appointment so nobody forgets; deposit at booking on Pro.                            | `business.description`, `offer[1].description`, `audience.needs`      |
| 6 Agenda        | Feature -> Benefit   | The week at a glance, by chair or cabin, with occupancy reports on Equipo.                                         | `audience.needs`, `offer[2].description`                              |
| 7 Cómo empezar  | Benefit              | Starting is three steps on the free plan; answers "switching takes time" without a time claim.                     | `offer[0]`, `audience.objections`                                     |
| 8 Precios       | Benefit (offer)      | Three plans, prices as given, what each includes, the Pro trial without card.                                      | `offer[*]` (name, price, description, url), `goal.secondary`          |
| 9 Preguntas     | Benefit (objections) | The three objections answered with brief facts only; prices and the no-card trial restated.                        | `audience.objections`, `offer[*]`                                     |
| 10 Cierre       | Benefit -> action    | One line on the owner's day, then "Empieza gratis".                                                                | `goal.primary`, `goal.secondary`                                      |

- **Hero headline candidates (2 or 3):**

| Candidate                                                                                                                                                                                                             | Useful | Urgent | Unique | Ultra-specific | Total | Reason                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------ | -------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Tus clientes reservan solos. Tú sigues con las tijeras."** (chosen; `h1` paired with a line that carries the keyword: "La app de reservas para peluquerías y centros de estética, con recordatorio por WhatsApp.") | 2      | 0      | 2      | 1              | 5     | Names the exact relief the audience asks for (not answering WhatsApps while working), in the salon's own world. Two-tone: first sentence ink, second muted. |
| "La app de reservas para peluquerías que recuerda cada cita por WhatsApp."                                                                                                                                            | 2      | 0      | 1      | 2              | 5     | Keyword-exact and specific, but a competitor could print it; kept as the `title` and the supporting line.                                                   |
| "Deja el WhatsApp para los clientes, no para dar citas."                                                                                                                                                              | 1      | 0      | 1      | 1              | 3     | Situation-led, but negative framing and less clear about what Turnio is.                                                                                    |

The SEO rule needs the keyword in the `h1`: the chosen line and the keyword line form one `h1` (the keyword line as its muted second part), so the `h1` reads "Tus clientes reservan solos. La app de reservas para peluquerías ..." if the two-sentence version breaks the title-like scan; the build picks the version that keeps the `h1` under three lines at 375 px and records it.

- **Proof inventory:** the brief's `proof` is empty on purpose (notes: "la landing no debe inventar testimonios, logos de clientes, cifras ni valoraciones"). No proof available: no testimonial, rating, review count, client logo, usage figure or award anywhere. The proof slot is filled with the product's own facts (the steps, the plan comparison and the no-card trial the brief states).

## Conversion plan

Written with the `conversion-psychology` skill on top of the Copy plan (the plan keeps the persuasion order; this one plans attention, choice, trust and the ending). Every element comes from the brief; nothing is invented.

- **Emotional target:** **relief** (primary), **calm** (secondary). The audience arrives tired of answering appointment messages while they cut and colour (`audience.needs`); tone words "cercano, claro, práctico" (`tone`). Relief is named plainly; no fear of losing clients.
- **Attention path:** the hero's focal point is the `h1`, then the filled "Empieza gratis" button directly under it (`goal.primary`, `https://app.example.com/registro?plan=gratis`), then the agenda mock below. Secondary action "Prueba el Pro 14 días" (`goal.secondary`) is an outlined button of the same height but no fill, placed after the primary. No gaze cue (no photo with a face). The header repeats the filled primary button only.
- **Choice:** three offers side by side (Plan Gratis 0 €, Plan Pro 19 €/mes, Plan Equipo 39 €/mes), in the brief's order. Highlighted: **Plan Pro**, with a mono tag "con recordatorios por WhatsApp" (a fact, not a popularity claim; Equipo includes them too, so the tag never says "only"), because the brief's own description centres on the WhatsApp reminder and Instagram booking, which only Pro and Equipo include; its button is the secondary goal "Prueba el Pro 14 días". Plan Gratis keeps the primary "Empieza gratis" button. No anchor beyond the real prices; no struck prices, no discounts. The comparison table lists only features named in the offer descriptions.
- **Trust and risk:** no proof available (`proof` empty). Risk is lowered with brief facts only: a free plan at 0 €, and the Pro trial "de 14 días sin tarjeta" (`offer[1].description`). Contact: `hola@example.com` (assumed) in the footer. No legal pages (no market in the brief). No guarantee: the brief states none.
- **Ending:** section 10 repeats "Empieza gratis" as the filled button, with "Prueba el Pro 14 días" as the outlined one.
- **Ethics check:**
  - [x] Every claim, price and condition comes from the brief; the times in the mocks are illustrative scene labels, not results.
  - [x] No urgency or scarcity (the brief gives none); no timers.
  - [x] Relief and calm, not fear; "nadie se olvide" is the brief's wording, no-shows are named plainly.
  - [x] No decline links to shame; no popups.
  - [x] No forms, so no pre-checked boxes.
  - [x] Every price is visible with what it includes, on the page, before any click.
  - [x] Pro is highlighted because it holds the WhatsApp reminder, the brief's central feature, not because it is dearer; Equipo is not highlighted.
  - [x] No fake social proof: no testimonials, ratings, counters, logos or awards.
  - [x] No people in any image (no photos planned, no AI images).
  - [x] Each button says what happens: "Empieza gratis" opens the free sign-up, "Prueba el Pro 14 días" the Pro sign-up.
  - [x] Not a vulnerable audience or a regulated niche.
  - [x] Nothing depends on the visitor not noticing it; the footer even says this is a demo product.

## 3D

None. The product mocks are HTML and CSS; a scene would only decorate.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |
| none  | -       | -      | -               | -                       |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings.

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages, a real sign-up flow (the buttons link to the brief's URLs), legal pages (no market).

## Decisions

1. Archetype: `product-led-saas+data-and-proof`, traits `comparison-table`, `ref:linear-app/mono-labels`, instead of the picker's top `custom` blend (reasons under Archetype blend).
2. Copy framework FAB, as ranked. Assumed: `audience.awareness` = solution-aware (in the brief's `assumed`; confirm at the checkpoint).
3. Assumed (brief `assumed`, confirm at the checkpoint): `business.name` "Turnio" (fictional SaaS for testing), `business.description`, the whole `offer` (plans and prices), `goal.primary.url` and `goal.secondary.url` (example.com sign-up), `contact.email` `hola@example.com`, `seo.primaryKeyword`. Because every business fact is assumed, the footer carries one honest line: "Turnio es un producto de demostración: planes, precios, enlaces y contacto son de ejemplo." Facts are otherwise shown exactly as the brief gives them.
4. Empty and not invented: `proof` (no proof on the page), `contact.phone`, `contact.address`, `contact.hours` (no phone, address or hours shown), `seo.serviceArea` (none), `brand.colors` and `brand.fonts` (ui-ux-pro-max decides), `brand.aiImages` (empty, so no AI images), `assets` (no customer files), `forms` (no form: every action links to sign-up).
5. Legal requirements unknown: the brief names no market (`legal` absent). No legal notice or privacy page is added; the report's `legal-pages` item will warn. A person must decide the markets before launch.
6. FAQ answers use brief facts only. The objection "mis clientes mayores no sabrán reservar por internet" can be answered only partly with brief facts (the reminder arrives on WhatsApp; booking is a link). Whether the salon can add appointments by hand for clients who phone is not in the brief: the answer will not claim it, and RUN.md asks the owner.
7. The highlighted plan is Pro (it holds the WhatsApp reminder); the page's primary action stays "Empieza gratis".
8. No photographs, no AI images and no 3D: the visuals are HTML/CSS mocks of the product with no client names, figures or ratings.
9. Deploy target: the brief asks for `cloudflare-pages`, which is the site's current `cloudflare` target; `node scripts/deploy/config.mjs --site turnio --from-brief --write` confirms it at the build. No `deploy.domain`, so `site` stays unset (absolute canonical and sitemap URLs come at the hand-off).
10. Owner review (2026-11-03): approved as proposed. Correction: the Pro tag says "con recordatorios por WhatsApp", not "el que incluye WhatsApp", because Plan Equipo includes the WhatsApp reminders too.
