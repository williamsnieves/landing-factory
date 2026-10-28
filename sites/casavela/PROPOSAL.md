# Proposal: casavela

Status: **draft**. Fill every section; the checkpoint waits for approval unless the run is automatic.

## Brief

- **Source:** `sites/casavela/brief.json` (the customer's requirement; fields listed in its `assumed` array, and empty ones, are not customer facts and are listed under Decisions).
- **Niche:** neighbourhood real-estate agency and mortgage advice in Valencia (`business.kind: service`).
- **Brand (fictional or real):** Casavela Inmobiliaria, Valencia, ES (the name is listed as assumed in the brief: a fictional business for an end-to-end test).
- **Goal of the page:** primary "Pide tu valoración gratuita por WhatsApp" (`https://wa.me/34600000000`, assumed number); secondary "Llámanos" (`tel:+34600000000`, assumed number).
- **Audience:** owners in Valencia and its metropolitan area who are thinking of selling, and buyers who need a mortgage. Needs: know what their home is worth, sell without losing time, understand how much mortgage they can ask for. Objections: distrust of agencies, unclear fees, fear of low appraisals.
- **Tone:** cercano, claro, confiable, profesional.
- **Signals:** local-service, conversion-first, serious, educational, data-heavy, few-assets
- **Language:** Spanish (`es`), single locale.

Status of this run: `--directions`. Only the Brief, the signals and the references are filled here; the page map, motion plan and the rest are written by the full build from the chosen direction.

- **Site location:** `sites/casavela/`, deployed to the target in its `site.config.json` (Cloudflare Pages by default).

## References used

| Sheet                    | What we take                                                                                                                                                                                                                | What we leave                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patterns/stripe-com.md` | Customer's reason: "Claridad y una franja de cifras que da confianza." Two-tone headline hierarchy, one saturated action color on a calm page, a strip of figures as proof, a clear primary plus outlined secondary pair.   | The generative WebGL hero, logo walls, carousels, invented statistics (regulated niche: only figures that are facts of the offer or of the calculator). |
| `patterns/framer-com.md` | Customer's reason: "Un panel fijo que acompaña mientras se lee: ideal para la calculadora hipotecaria." A sticky split where a fixed panel (the mortgage calculator) stays while explanations scroll, with CSS sticky only. | Dark media-heavy shell, autoplay video, mosaics of customer sites, glow effects.                                                                        |

**Direction in one line:**

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site casavela` (signals of the Brief, the reference sheets above, blends other sites already use). The archetype sheets in `design-archetypes/` are a starting grammar, not a template: any deviation goes in RUN.md "Design decisions".

- **Primary:** (owns the layout grammar; or `custom` when the references lead)
- **Secondary:** (optional)
- **Lent traits:** (one or two; `ref:<sheet>/<trait>` when a reference supplies one)
- **Why:** the signals and references that led here, and why the top candidate was or was not taken.
- **Twist from the requirement:** one idea that comes from this business, not from a catalog.
- **Planned deviations:**

## Page map

| #   | Section | Height | Purpose | Layout idea |
| --- | ------- | ------ | ------- | ----------- |

## Motion plan

| Moment | Trigger | Type | Notes |
| ------ | ------- | ---- | ----- |

Reduced motion: no pin, no scrub, no parallax, no smooth scroll; all content visible in its final state. Without JavaScript the page reads top to bottom with every section visible.

## Visual direction

- **Type:**
- **Palette:**
- **Hero type:** one of the types listed in the new-landing skill (full-bleed-photo, split, typographic, video, illustration, collage).
- **Imagery:** openly licensed photos only; every one recorded in `assets.json` and `CREDITS.md`. No images from the references.

## SEO

- **Primary keyword:** from `seo.primaryKeyword` in the brief; if the brief has none, chosen here from the niche and marked assumed.
- **Service area:** from `seo.serviceArea` (cities or regions), or none for an online business.
- **Schema type:** from `seo.schemaType` (a schema.org type, JSON-LD in `src/data/seo.ts` with customer facts only; no review or rating markup without real reviews).
- **Title and description per page (and per locale):** within the report limits (title 30 to 60 characters, description 70 to 160), one `h1`, the keyword written naturally.

## 3D

None, or up to two scenes (`<Scene3D />`, built from code, no external models). For each scene: purpose, poster (rendered with `scripts/render-poster.mjs` or a credited museum image), scroll behavior (`scrub` or a looping clock), and the reduced-motion fallback (the poster; no canvas, no JavaScript, no WebGL). Default: none.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings.

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages.

## Decisions

1.
