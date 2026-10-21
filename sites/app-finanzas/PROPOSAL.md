# Proposal: app-finanzas

Status: **proposed**. Fill every section; the checkpoint waits for approval unless the run is automatic.

## Brief

- **Niche:** personal finance mobile app for young professionals in Spain: automatic budgets, savings goals and spending analysis.
- **Brand (fictional or real):** "Trazo", a fictional app by a fictional company in Madrid. Contact data, store links and legal text are placeholders and are marked as sample on the page.
- **Goal of the page:** primary action: download the app (App Store and Google Play buttons, placeholder links). Secondary action: read how it works and the plans.
- **Audience:** employed people of about 24 to 38 in Spain who earn a first steady salary, share rent, and want to know where their money goes without a spreadsheet.
- **Tone:** clear, close (tú), trustworthy. Short sentences, no jargon, no hype, no promise of returns.
- **Signals:** product-showcase, conversion-first, data-heavy, educational, calm, few-assets
- **Language:** Spanish (`es`).
- **Site location:** `sites/app-finanzas/`, its own Cloudflare Pages project.

## References used

| Sheet | What we take                                       | What we leave |
| ----- | -------------------------------------------------- | ------------- |
| none  | No reference sheet fits; the archetypes lead here. | -             |

**Direction in one line:** a calm, evidence-first page where the app is drawn in code (phone mockups, bars and a table with sample data), every claim sits next to its proof, and one download action stays obvious.

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site app-finanzas` (signals of the Brief, no reference sheets, blends other sites already use).

- **Primary:** data-and-proof
- **Secondary:** swiss-grid-minimal
- **Lent traits:** `split-sticky`, `flush-left-axis`
- **Why:** it is the top candidate. The signals conversion-first, data-heavy and educational are exactly what data-and-proof fits (claim, then evidence); swiss-grid-minimal adds calm and the order a finance tool needs. `few-assets` is respected because the visuals are code-drawn charts and phone screens, not photos. The primary differs from the other swiss-primary site, so the composition does not repeat.
- **Twist from the requirement:** the page is built around one sample month. The same fictional month of spending ("Marzo, datos de ejemplo") appears in the hero phone, the three steps, the analysis chart and the plans table, so the visitor sees one coherent budget instead of unrelated screenshots.
- **Planned deviations:** the hero uses a code-drawn phone mockup (an illustration), larger than the sheet's small framed screenshots, because showing the app is a stated requirement; buttons are lightly rounded rectangles (store buttons).

## Page map

| #   | Section                  | Height  | Purpose                                                                 | Layout idea                                                                                      |
| --- | ------------------------ | ------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0   | Header                   | 72 px   | Name, links (Cómo funciona, Seguridad, Planes, FAQ), download button    | Flush-left bar, thin bottom rule                                                                 |
| 1   | Hero                     | 100 svh | Say what Trazo does and get the download                                | Split: claim and store buttons left, phone mockup with the sample month right                    |
| 2   | Qué hace                 | 90 vh   | Three jobs: budgets, goals, analysis                                    | Three-column evidence cards, each with a small CSS/SVG visual and one claim                      |
| 3   | Cómo funciona en 3 pasos | 160 vh  | Connect, set goals, see what changes                                    | Split-sticky: heading and step index stay while the three steps scroll, each with a phone screen |
| 4   | Análisis de gastos       | 100 vh  | Prove the analysis with the sample month                                | Bar chart in SVG with a text table alternative, stat-strip of sample figures with units          |
| 5   | Privacidad y seguridad   | 100 vh  | Say plainly what is done with data and what is never done               | Two columns: "Lo que hacemos" and "Lo que no hacemos" as a real table, method note               |
| 6   | Planes                   | 100 vh  | Free and Premium, without return promises                               | Comparison table with ticks, prices as sample values, download action under it                   |
| 7   | Preguntas frecuentes     | 90 vh   | Remove doubts (cost, banks, data, cancel)                               | Native `details` list, flush-left, narrow column                                                 |
| 8   | Descarga                 | 70 vh   | Closing download action                                                 | Large claim, both store buttons, sample QR-free note                                             |
| 9   | Footer                   | 40 vh   | Columns: producto, seguridad, empresa, legal; sample-data note; credits | Columns footer                                                                                   |

## Motion plan

| Moment           | Trigger | Type          | Notes                                                       |
| ---------------- | ------- | ------------- | ----------------------------------------------------------- |
| Section headings | scroll  | `data-reveal` | Short lift and fade, once                                   |
| Evidence cards   | scroll  | `data-reveal` | Staggered with `data-reveal-delay`                          |
| Chart bars       | scroll  | `data-reveal` | Bars rise once with the reveal; final values in the markup  |
| Hero phone       | load    | `data-reveal` | Single fade, no parallax                                    |
| Steps column     | scroll  | CSS `sticky`  | No pin primitive; sticky from `md` up, plain stack on phone |

No pinned section, no parallax. Reduced motion: no pin, no scrub, no parallax, no smooth scroll; all content visible in its final state. Without JavaScript the page reads top to bottom with every section visible.

## Visual direction

- **Type:** a clean geometric or grotesque sans for headings and text, with tabular figures for amounts; large numerals carry emphasis; moderate heading scale; flush-left everywhere.
- **Palette:** light, calm ground (cool off-white) with deep ink text; one saturated indigo-violet primary for actions and chart bars, a soft green only for "ahorro" and a muted amber for "alerta" used sparingly. Not repeating blue, teal, lime, coral or brown of the other sites.
- **Hero type:** `illustration` (a phone and charts drawn in HTML, CSS and SVG).
- **Imagery:** no photographs planned (`few-assets`): the app is drawn in code with sample data; no faces, no brands, no bank logos. If a photo is added it comes from Commons and is credited.

## 3D

None.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |
| none  | -       | -      | -               | -                       |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings.

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages.

## Decisions

1. Regulated niche (finance): the copy makes no promise of returns, savings amounts or results; no invented ratings, reviews, download counts, awards, certifications, licences or "bank-grade" claims; no statement that the company is authorised by any regulator. Security is described plainly (what data is read, what is never sold, how to delete it) with sample wording to confirm with legal before launch.
2. Assumed: the app reads transactions through the user's bank connection (read only); this is described as a product behavior to confirm (confirm at the checkpoint).
3. Assumed: Premium price 4,99 EUR/month and the Free plan limits are placeholders (confirm at the checkpoint).
4. The page uses sample data (the "Marzo" month, amounts, categories) to replace before launch. All figures in charts are labeled "datos de ejemplo".
5. Store buttons are placeholder links; contact data is sample and marked as such in the footer.
6. No stock photos are planned; the credits list only fonts.
