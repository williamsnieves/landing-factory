# Proposal: casavela

Status: **proposed**. Built from the customer's chosen visual direction (`directions.json`: direction **a**, with the owner's notes of 2026-10-30) and approved by `--auto`.

## Brief

- **Source:** `sites/casavela/brief.json` (the customer's requirement; fields listed in its `assumed` array, and empty ones, are not customer facts and are listed under Decisions).
- **Niche:** neighbourhood real-estate agency and mortgage advice in Valencia (`business.kind: service`).
- **Brand (fictional or real):** Casavela Inmobiliaria, Valencia, ES (the name is listed as assumed in the brief: a fictional business for an end-to-end test).
- **Goal of the page:** primary "Pide tu valoración gratuita por WhatsApp" (`https://wa.me/34600000000`, assumed number); secondary "Llámanos" (`tel:+34600000000`, assumed number).
- **Audience:** owners in Valencia and its metropolitan area who are thinking of selling, and buyers who need a mortgage. Needs: know what their home is worth, sell without losing time, understand how much mortgage they can ask for. Objections: distrust of agencies, unclear fees, fear of low appraisals.
- **Tone:** cercano, claro, confiable, profesional.
- **Signals:** local-service, conversion-first, serious, educational, data-heavy, few-assets
- **Language:** Spanish (`es`), single locale.
- **Site location:** `sites/casavela/`, deployed to the target in its `site.config.json` (Cloudflare Pages, as the brief asks: `deploy.target: cloudflare-pages`).

## References used

| Sheet                    | What we take                                                                                                                                                                                                                                                                      | What we leave                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patterns/stripe-com.md` | Customer's reason: "Claridad y una franja de cifras que da confianza." Two-tone headline hierarchy (first sentence in ink, the rest muted), hairline frame rails, one saturated action color on a calm page, a strip of figures as proof, a primary plus outlined secondary pair. | The generative WebGL hero, logo walls, carousels, the live counter, invented statistics (regulated niche: only figures that are facts of the offer or of the calculator). |
| `patterns/framer-com.md` | Customer's reason: "Un panel fijo que acompaña mientras se lee: ideal para la calculadora hipotecaria." A sticky split where a fixed panel (the mortgage calculator) stays while explanations scroll, with CSS `position: sticky` only; rounded hairline frames.                  | Dark media-heavy shell, autoplay video, logo strips, mosaics of customer sites, glow effects.                                                                             |
| Direction c (this site)  | The owner's notes: the full-bleed Valencia street photograph and the practical strip (where, when, how to reach the agency), so the page feels like a neighbourhood agency.                                                                                                       | c's olive palette, its rounded display face (Calistoga) and its full-bleed photo hero (the hero stays a's split).                                                         |

No disliked references in the brief.

**Direction in one line:** a's product-like clarity (split hero with the free-valuation card, hairline rails, a sticky mortgage calculator beside short explanations) made local and warm with a real Valencia street photograph, a practical "where, when, how" strip and a warm, trustworthy real-estate palette.

## Archetype blend

Not a new `pick-archetypes` choice: the customer chose direction a, so the blend is a's (`directions.json`), extended with what the owner's notes take from c.

- **Primary:** `custom` (reference-led): `stripe-com` drives the hero (two-tone headline, button pair, rails) and the figures; `framer-com` drives the calculator section (sticky split).
- **Secondary (fills gaps):** `data-and-proof` for the services comparison and the sourced figures; `warm-local-service` for the practical strip, the hours card and the closing contact section (the owner's request to keep c's local feel).
- **Lent traits:** `ref:framer-com/split-sticky`, `ref:stripe-com/stat-strip` (the chosen direction's), plus `practical-strip` from warm-local-service (the owner's notes).
- **Why:** the customer picked a, and the owner asked to keep a's grammar while adding c's photo and practical strip; `custom` was also the top candidate of `pick-archetypes` for these signals and references.
- **Twist from the requirement:** the agency's split working day (morning and afternoon, the brief's `contact.hours`) drawn as a one-day bar in the hours card, with the lunch gap visible, in the same hairline style as the calculator: a "data" picture of a fact the business gave.
- **Planned deviations:** no count-up on the figures (data-and-proof's motion): figures are static, because they are few and two of them are sample data. A full-bleed photo band after the hero in a split-hero page (warm-local-service puts photos beside text): asked for by the owner. No map embed (a third-party host and cookies; an address link to a map instead).

## Page map

| #   | Section                        | Height   | Purpose                                                   | Layout idea                                                                                                                                                                                                                                              |
| --- | ------------------------------ | -------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Header                         | ~0.08 vh | Name, way around, the action                              | Name left; links Valoración, Vender, Calculadora, Contacto; the phone as text and the primary action as a filled button right. On phones: name, phone icon link and the action; links collapse into a no-JS `<details>` menu.                            |
| 1   | Hero (`#inicio`)               | ~0.9 vh  | Say what it is and get the WhatsApp click                 | Split inside hairline rails: left a two-tone headline with the keyword, a line, primary (WhatsApp) and outlined secondary (Llámanos) buttons; right a framed card "Tu valoración · Gratis" with the three steps of the visit and the service-area chips. |
| 2   | Photo band + practical strip   | ~0.8 vh  | Make it local: a real Valencia street, where, when, how   | Full-bleed street photograph (Commons, cropped in CSS, caption chip); a framed strip overlaps its lower edge with three cells: dirección, horario, cómo contactar (WhatsApp, phone, email). Sample values tagged.                                        |
| 3   | Figures (`stat-strip`)         | ~0.35 vh | Proof without invented numbers                            | Three figures between hairlines: 0 € valuation, 3 services, 4 municipalities, each with its label and its source line.                                                                                                                                   |
| 4   | Services (`#servicios`)        | ~0.9 vh  | What the agency does, plainly                             | Section opener (two-tone heading left, short paragraph right), then three framed columns: name, what it includes, price ("Gratis" for the valuation; "Honorarios pendientes de confirmar" for the others), a text link to WhatsApp.                      |
| 5   | How we sell (`#vender`)        | ~0.7 vh  | Answer the distrust objection with a clear process        | Numbered steps on a hairline timeline from the brief's own words: valoración, fotografía, publicación, visitas filtradas, negociación, firma en notaría. Two columns on desktop: the steps left, a short "what you always know" note right.              |
| 6   | Calculator (`#calculadora`)    | ~1.6 vh  | The customer's requested tool; educate buyers             | Sticky split (a): four short explanation blocks scroll on the left, the calculator panel is CSS sticky on the right from 1024 px; the brief's notice under the result; server-rendered example values without JavaScript.                                |
| 7   | Questions (`#preguntas`)       | ~0.7 vh  | Objections: fees, low appraisals, valuation vs. appraisal | Native `<details>` list in one column with hairlines. Educational answers only; nothing the customer did not say is stated as their policy.                                                                                                              |
| 8   | Contact and area (`#contacto`) | ~0.8 vh  | Close: where, when and the action again                   | Two columns: left the closing two-tone heading, the WhatsApp button and the phone; right the hours card (the split-day bar twist), the address with a map link and the four municipalities.                                                              |
| 9   | Footer                         | ~0.35 vh | Tidy facts and credits                                    | Columns: name and line, contact, area, photo credits from `src/data/credits.json`; the sample-data notice and the calculator notice.                                                                                                                     |

The conversion action (WhatsApp valuation) appears in the header, the hero, the services section (mid-page), the calculator closing line and the contact section.

## Motion plan

| Moment           | Trigger | Type                     | Notes                                                                   |
| ---------------- | ------- | ------------------------ | ----------------------------------------------------------------------- |
| Section openers  | scroll  | `data-reveal`            | Heading blocks and figures fade and rise once.                          |
| Calculator panel | scroll  | CSS `position: sticky`   | Not a GSAP pin; stays beside the blocks from 1024 px, static on phones. |
| Photo band       | scroll  | `data-parallax` (subtle) | The one playful moment: the photo moves a little slower than the page.  |

At most one pinned-like section (the sticky calculator, CSS only) and one playful moment (the photo parallax). Reduced motion: no pin, no scrub, no parallax, no smooth scroll; all content visible in its final state. Without JavaScript the page reads top to bottom with every section visible, and the calculator shows its server-rendered example.

## Visual direction

- **Type:** one clean, neutral sans for headings and text, like a's DM Sans (the design system may choose another clean sans with tabular figures, never a rounded display face); medium heading scale with tight tracking; figures in a heavier weight with tabular numerals.
- **Palette:** new, from ui-ux-pro-max only: warm and trustworthy for real estate, neither a's cold violet nor c's olive. A warm neutral paper, a deep warm ink, one saturated warm action color (for example a deep terracotta, brick or clay) and a quiet secondary tone for frames.
- **Hero type:** `split`.
- **Imagery:** one real Valencia street photograph (`c-balcons-valldigna.jpg`, Commons, CC BY-SA 4.0, already in `assets.json`, cropped so the lettered banner never shows), used once in the photo band; at most one more licensed Valencia street or facade photo from Commons for the contact section if a clean one exists (no signs, brands or faces). No customer assets (the brief has none). No AI images (`brand.aiImages` is empty, so not allowed). The calculator, the figures and the hours bar are drawn in HTML and CSS.

## SEO

- **Primary keyword:** "valoración de vivienda gratis en Valencia" (`seo.primaryKeyword`, listed as assumed in the brief; it is used as given, and Decisions says it is assumed). Secondary: "vender piso en Valencia", "calculadora hipoteca", "asesor hipotecario Valencia", "inmobiliaria Valencia".
- **Service area:** Valencia, Burjassot, Paterna, Mislata (`seo.serviceArea`).
- **Schema type:** `RealEstateAgent` (`seo.schemaType`), JSON-LD in `src/data/seo.ts` with name, description, telephone, email, address (`PostalAddress`), `areaServed` and opening hours from the brief; no review or rating markup (the brief has none). No `url` while `deploy.domain` is empty.
- **seo-audit rules that apply:** local SEO (`references/local-seo.md`): name, address and phone consistent between page, footer and JSON-LD; city names in headings where natural; one `h1` with the keyword; descriptive link text. Title 30 to 60 characters, description 70 to 160 (`report.seo` in `qa.config.json`).
- **Title and description:** "Valoración de vivienda gratis en Valencia · Casavela" and a description of about 150 characters with the keyword, the calculator and the area.

## 3D

None. The calculator and the figures carry the page; a scene would only decorate.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |
| none  | -       | -      | -               | -                       |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings.

## Out of scope

Online shop, cart, payments, backend forms (leads go to WhatsApp and phone; forms arrive with a later change), CMS, multiple languages, property listings.

## Decisions

1. **Direction:** the customer chose **a**. The owner's notes, in their words (fixed input): "Owner's choice (2026-10-30): a mix of a and c with a as the base. Keep a's grammar: split hero with the free-valuation card, the sticky mortgage calculator beside the educational blocks, hairline rails, the product-like clarity. Take from c: the real full-bleed Valencia photograph (or another licensed Valencia street or facade photo) and the practical local strip (where, when, how to reach the agency) so it feels like a neighbourhood agency, not a SaaS. Palette: neither a's cold violet nor c's olive as-is; choose a new palette that reads as real estate and trust (ui-ux-pro-max only), warm rather than cold. Typography: a clean sans like a's, not c's rounded display."
2. Assumed: business name "Casavela Inmobiliaria" (a fictional business for the end-to-end test) (confirm at the checkpoint).
3. Assumed: phone, WhatsApp number, email, address and hours (`contact.*`, `goal.primary.url`, `goal.secondary.url`): shown exactly as the brief gives them, with a visible "dato de ejemplo" tag and the sample-data notice in the footer (confirm at the checkpoint).
4. Assumed: the offer (three services, only the valuation priced "Gratis"): shown as given; the fees of the sale and the mortgage advice are not in the brief and the page says "pendientes de confirmar" (confirm at the checkpoint).
5. Assumed: the primary keyword "valoración de vivienda gratis en Valencia" (confirm at the checkpoint).
6. Regulated niche (`legal.regulated: true`, mortgage advice): no promise of results, no "best price" or "sell in N days" claims, no invented reviews, ratings, awards, years of experience or sales figures. Figures are only brief facts (0 €, 3 services, 4 municipalities). The calculator is labeled with the brief's notice ("La calculadora es orientativa: no es una oferta vinculante ni asesoramiento financiero personalizado.") right under its result and in the footer; its interest rate is an example the visitor changes. The "best price" wording of the business description is kept only where it quotes the brief's own description in the meta, and nowhere as a promise in a heading.
7. Legal requirements unknown: the brief names no market (`legal.markets` is empty), so no legal notice or privacy page is added. Before launch in Spain, LSSI-CE normally requires a legal notice and a privacy policy: the owner must give the market and the holder data.
8. Customer assets: none in the brief. The photograph is stock from Commons, captioned as "una calle del centro de Valencia", never as the agency's office or a property.
9. Deploy target: the brief asks for `cloudflare-pages`, which is the site's current `cloudflare` target. `deploy.domain` is empty, so `site` stays unset and canonical and sitemap URLs stay relative (the report warns; the owner sets it at hand-off).
10. No customer reviews, so no testimonials section.
