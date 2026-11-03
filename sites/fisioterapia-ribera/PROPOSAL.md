# Proposal: fisioterapia-ribera

Status: **proposed**. Fill every section; the checkpoint waits for approval unless the run is automatic.

## Brief

- **Source:** `sites/fisioterapia-ribera/brief.json` (prospect brief, `prospect.status: prospect`). Every fact in it is listed in `assumed` (a fictional test prospect, no public sources); fields listed in `assumed`, and empty ones, are not customer facts and are listed under Decisions.
- **Niche:** neighbourhood physiotherapy clinic with two registered physiotherapists: back and neck pain, sports injuries and recovery after surgery; individual 50-minute sessions and an exercise plan for home (`business.description`, a customer fact).
- **Brand (fictional or real):** "Fisioterapia Ribera", Zaragoza, ES (name, city and country assumed: fictional prospect).
- **Goal of the page:** primary action "Pide tu primera valoración" to `https://reservas.example.com/fisioterapia-ribera` (URL assumed, example domain); secondary, quiet action "Llámanos" to `tel:+34976000000`.
- **Audience:** neighbours aged 30 to 65 with back or neck pain from work, runners and amateur athletes with an injury, and people coming out of a knee or hip operation. Needs: understand what is happening and what they can do, the same person attending them, unhurried sessions, hours compatible with work. Objections: "is this for a physio or a doctor", "elsewhere they only put machines on me", "no time to go twice a week".
- **Tone:** cercano, profesional, tranquilo, claro.
- **Signals:** local-service, calm, serious, conversion-first, educational, few-assets
- **Language:** Spanish (`es`), single language.
- **Site location:** `sites/fisioterapia-ribera/`, deployed to the target in its `site.config.json` (Cloudflare Pages: the brief asks for `cloudflare-pages`).

## Prospect: facts and sources

This is a prospect landing: a design proposal the owner shows a business that has not bought anything. `prospect.sources` is empty, because the business is fictional (first real run of the prospect flow, per `brief.notes`); every fact is listed in `assumed` instead. Nothing was read from any prospect website, and no logo, photo, colour or font of a business is used.

| Fact                  | Value                                              | Source | Assumed reason (from the brief)                                 |
| --------------------- | -------------------------------------------------- | ------ | --------------------------------------------------------------- |
| `business.name`       | Fisioterapia Ribera                                | none   | Fictional prospect for the first real test of prospect landings |
| `business.city`       | Zaragoza                                           | none   | City chosen for the test                                        |
| `business.country`    | ES                                                 | none   | Market of the test                                              |
| `offer[0].name/price` | Primera valoración, 45 €                           | none   | Typical service of a physiotherapy clinic; fictional price      |
| `offer[1].name/price` | Sesión de fisioterapia, 40 €                       | none   | Typical service; fictional price                                |
| `offer[2].name/price` | Bono de 5 sesiones, 180 €                          | none   | Typical service; fictional price                                |
| `goal.primary.url`    | `https://reservas.example.com/fisioterapia-ribera` | none   | Example booking URL on example.com                              |
| `contact.phone`       | +34 976 000 000                                    | none   | Example phone; marked as example data on the page               |
| `contact.email`       | hola@example.com                                   | none   | Reserved domain example.com                                     |
| `contact.address`     | Calle de Ejemplo 12, 50000 Zaragoza                | none   | Example address                                                 |
| `contact.hours`       | Lunes a viernes de 8:00 a 14:00 y de 16:00 a 21:00 | none   | Typical neighbourhood clinic hours; fictional                   |

Also assumed: `audience.awareness` (problem-aware) and `seo.primaryKeyword` ("fisioterapeuta en Zaragoza"). The build runs `node scripts/prospect.mjs write --site fisioterapia-ribera` first, so every page is `noindex` and opens `<main>` with the prospect notice; the sales kit (`SALES.md`) is written at the end.

## References used

No reference sheet: the brief names no liked or disliked site and no `--refs` were given. The existing sheets in `patterns/` (bakeries, SaaS products, studios, a contractor template) do not fit a health clinic, so none is borrowed.

| Sheet | What we take | What we leave |
| ----- | ------------ | ------------- |
| none  | n/a          | n/a           |

**Direction in one line:** a quiet, orderly clinic page on a strict grid, where the practical facts (what we treat, when, how much, how to book) are as easy to find as on a well-run reception desk, and the 50-minute session is the one idea the page is built around.

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site fisioterapia-ribera` (signals of the Brief, no reference sheets, blends other sites already use). The archetype sheets in `design-archetypes/` are a starting grammar, not a template: any deviation goes in RUN.md "Design decisions".

- **Primary:** `swiss-grid-minimal` (owns the grid, flush-left type, rectangular photos, quiet footer).
- **Secondary:** `warm-local-service`.
- **Lent traits:** `practical-strip`, `hours-card`.
- **Why:** the signals `calm`, `serious`, `educational` fit swiss-grid-minimal and `local-service`, `conversion-first` fit warm-local-service; this is candidate 3 of 5 tied at score 5. The top candidate (`data-and-proof+warm-local-service`) was not taken because its grammar is "each section makes one claim and proves it" with figures and comparison tables, and this brief has no proof, is a regulated health niche, and its constraints forbid comparing with other centres: the evidence grammar would be empty or invented. `warm-local-service` as primary (candidates 4 and 5) was set aside because its hero wants honest photos of the real place and people, and a prospect page with only Commons stock (`few-assets`) cannot provide them; the Swiss grid lets type and space carry the page.
- **Twist from the requirement:** the 50-minute session. One section lays the session out as a measured horizontal ruler on the grid (0 to 50, minute ticks), with the stages of the visit hanging from it in order (listen, explore, treat, exercises for home) and the line "el mismo fisioterapeuta de principio a fin". The ruler shows the length of the session only; it assigns no minutes to each stage (the brief does not give them).
- **Planned deviations:** a filled, rectangular primary button (2 px radius at most) instead of the Swiss outline button, because `conversion-first` needs one obvious action on every screen; a sticky header with the action and the phone (warm-local-service header) instead of the Swiss header with no background; one colour field for the closing call to action (Swiss prefers space over colour bands), so the ending is unmistakable.

## Page map

| #   | Section                               | Height   | Purpose                                               | Layout idea                                                                                                                                                                |
| --- | ------------------------------------- | -------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Header (sticky)                       | 64-72 px | Name, 3-4 anchors, phone, primary action              | Name on the left column line, anchors on grid columns, phone as a text link, the filled primary button at the right; the prospect notice strip sits above `<main>` content |
| 1   | Hero (`#inicio`)                      | ~90 vh   | Problem stage: name the three reasons people come     | Split 7 + 5: `h1` with the keyword and a short lead flush left on 7 columns, primary and secondary action; one rectangular Commons photo (hands treating, no face) on 5    |
| 2   | Practical strip (`#datos`)            | ~120 px  | Where, when, phone, book, in one line each            | `practical-strip`: four cells on a 3-3-3-3 grid separated by thin rules; values in tabular figures; example data labelled "dato de ejemplo"                                |
| 3   | Qué tratamos (`#tratamos`)            | ~70 vh   | Problem: back and neck, sport injuries, after surgery | 3 + 9 rows: a number and a short title in the narrow column, two plain sentences in the wide one; one Commons photo (runner's legs or a knee) on 4 columns of one row      |
| 4   | Una sesión, 50 minutos (`#sesion`)    | ~100 vh  | Solution and twist: how a session works               | The ruler across 12 columns; stages hang from it in four 3-column cells; sticky label column on the left (the only sticky element besides the header)                      |
| 5   | La primera visita (`#primera-visita`) | ~60 vh   | Solution: what the first assessment includes          | 4 + 8: title left; a numbered list (interview, examination, written treatment plan, first treatment session) right, with the primary action under it                       |
| 6   | Precios (`#precios`)                  | ~70 vh   | Offer: three services side by side                    | Three 4-column cells, rectangular, thin rules; name, price large in tabular figures, what it includes; "Primera valoración" highlighted with a primary rule and the action |
| 7   | Preguntas (`#preguntas`)              | ~70 vh   | Solution: answer the three objections                 | 4 + 8: native `<details>` list, one per objection; answers only from brief facts                                                                                           |
| 8   | Horario y contacto (`#contacto`)      | ~60 vh   | Where and when, all contact data visible              | `hours-card` (week list, hours set large) on 5 columns beside address, phone, email on 7; a plain "Cómo llegar" link to OpenStreetMap, no embedded map                     |
| 9   | Cierre (`#reserva`)                   | ~50 vh   | Final action                                          | One colour field (primary), flush-left heading on 8 columns, primary action and the phone                                                                                  |
| 10  | Footer                                | ~240 px  | Address, hours, links, photo credits, prospect line   | Quiet four-column grid aligned with the sections; credits from `src/data/credits.json`; no wordmark                                                                        |

The primary action appears in the header, the hero, after the first-visit list (mid-page), on the highlighted price and in the closing section.

## Motion plan

Only primitives from `sites/fisioterapia-ribera/src/components/motion/README.md`.

| Moment                    | Trigger          | Type                                       | Notes                                                                                 |
| ------------------------- | ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Section blocks            | scroll into view | reveal (fade and rise)                     | Slow and short distance, one per block, never on the `h1` or the LCP photo            |
| The 50-minute ruler       | scroll into view | reveal of the ruler line, stages staggered | The playful moment: the line draws from 0 to 50 once, then the stages appear in order |
| Sticky label in `#sesion` | scroll           | CSS `position: sticky`                     | Not a ScrollTrigger pin; the section has no pinned scroll                             |

Reduced motion: no pin, no scrub, no parallax, no smooth scroll; all content visible in its final state (the ruler fully drawn). Without JavaScript the page reads top to bottom with every section visible.

## Visual direction

- **Type:** one humanist sans in two or three sizes and two weights for headings and text (small contrast between heading and lead, per the Swiss sheet); tabular figures for prices, hours and the ruler. Open-licensed, self-hosted through `@fontsource`. Not Figtree (used by the other clinic site).
- **Palette:** a calm off-white ground, a near-black ink, and one primary in a deep reed or river green (the "ribera" of the name), with a soft light tint of it for the hours card. Not teal (the other clinic) and not navy or blue (three other sites). Contrast: text >= 4.5, large text and non-text >= 3. The design system fixes the values with ui-ux-pro-max.
- **Hero type:** `split`.
- **Imagery:** no customer files (prospect). Three Commons photos at most, each tagged with its source: hero, hands of a physiotherapist treating a back or a shoulder, no identifiable face (Commons); "Qué tratamos", legs of a runner or a knee (Commons); "Una sesión", an exercise with an elastic band or a simple home exercise (Commons). All are illustrative stock, captioned "Foto ilustrativa" and never presented as the clinic, its team or its patients. No AI images (prospect: nobody can consent). Rectangular, no radius, placed at whole column spans with a caption on the grid. Openly licensed photos only; every one recorded in `assets.json` and `CREDITS.md`. No images from references.

## SEO

- **Primary keyword:** "fisioterapeuta en Zaragoza" (from `seo.primaryKeyword`; listed as assumed in the brief). Secondary: the brief's `seo.keywords` (back pain, sports physiotherapy, rehabilitation after knee surgery), used where the sections already talk about them.
- **Service area:** Zaragoza (`seo.serviceArea`).
- **Schema type:** `MedicalClinic` (`seo.schemaType`), JSON-LD in `src/data/seo.ts`. Only non-assumed facts go in: `description` (`business.description`), `areaServed` (Zaragoza), `url` when `site` is set. Name, telephone, email, address and hours are all assumed in this brief, so they stay out of the markup until the prospect confirms them. No review or rating markup (no reviews).
- **Rules that apply:** `seo-audit` on-page rules (one `h1` with the keyword, keyword in title, description and first paragraph, descriptive headings) and the local-business part of `references/local-seo.md` (consistent name, address and phone on the page; no Google Business Profile work, out of scope). Every page is `noindex` while the status is `prospect`, so ranking is not a goal yet.
- **Title and description per page:** within the report limits (title 30 to 60 characters, description 70 to 160), one `h1`, the keyword written naturally. Home: "Fisioterapeuta en Zaragoza | Fisioterapia Ribera" (48 characters). The 404 page gets its own title and description.

## Copy plan

Chosen from `node scripts/pick-copy-framework.mjs --site fisioterapia-ribera` (the brief's awareness, kind, price, goal, proof, regulated flag and objections). Facts and proof come from the brief only; the writing help is the `copywriting` skill, the structure is the plan.

- **Framework:** `pas` (PAS, score 6: problem-aware visitor +4, kind service +1, goal booking +1). Tied with PASTOR (6), which was not taken because its Testimony stage would be empty (no proof). Binding adjustment for a regulated health niche and the calm emotional target: the Agitate stage names the objections plainly ("you do not know if this is for a physio", "you were only put on machines") and never amplifies pain or fear.
- **Awareness:** `problem-aware` (stated in the brief but listed in `assumed`; to confirm with the customer).
- **Stage to section:**

| Section                | Stage              | What it says                                                                                                                                    | Facts it uses                                                                  |
| ---------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Hero                   | Problem            | A physiotherapist in Zaragoza for back and neck pain, sports injuries and after an operation; book or call                                      | `business.description`, `seo.primaryKeyword`, `goal.primary`, `goal.secondary` |
| Practical strip        | Problem            | Where, when, how to call and book, without searching                                                                                            | `contact.address`, `contact.hours`, `contact.phone`, `goal.primary`            |
| Qué tratamos           | Problem            | The three reasons people come, described in their words (work posture, a running injury, after knee or hip surgery)                             | `business.description`, `audience.who`                                         |
| Una sesión, 50 minutos | Agitate → Solution | Elsewhere you were left with a machine; here the session is individual, 50 minutes, the same physio from start to end, with exercises for home  | `audience.objections`, `offer[1].description`, `business.description`          |
| La primera visita      | Solution           | What the first assessment includes: interview, examination, written plan, first session                                                         | `offer[0].description`, `goal.primary`                                         |
| Precios                | Solution           | Three services with their prices and what each includes                                                                                         | `offer[0..2]`                                                                  |
| Preguntas              | Solution           | The three objections answered with facts only (what the first visit is for, individual sessions, hours morning and evening, exercises for home) | `audience.objections`, `offer[*].description`, `contact.hours`                 |
| Horario y contacto     | Solution           | Hours, address, phone, email, how to get there                                                                                                  | `contact.*`                                                                    |
| Cierre                 | Solution           | Start with a first assessment; book online or call                                                                                              | `goal.primary`, `goal.secondary`                                               |

- **Hero headline candidates (4U, urgency only when true):**
  1. "Fisioterapeuta en Zaragoza para tu espalda, tu lesión o tu operación" — useful 3, urgent 1, unique 2, ultra-specific 3 (total 9).
  2. "Fisioterapeuta en Zaragoza: 50 minutos con la misma persona, sin prisas" — useful 3, urgent 1, unique 3, ultra-specific 3 (total 10). **Chosen**: it carries the keyword, the twist and the need "sin prisas" from the audience; the lead under it names the problem (back and neck, injuries, after an operation), so the Problem stage stays first. "La misma persona" refers to the 50-minute session ("el mismo fisioterapeuta de principio a fin"), never to every session of a treatment, which the brief does not state.
  3. "Te duele la espalda o la rodilla. Empieza por saber qué te pasa." — useful 3, urgent 1, unique 2, ultra-specific 2 (total 8); kept as the opening line of the lead.
- **Proof inventory:** no proof available. The brief's `proof` is empty and its notes forbid inventing testimonials, ratings or figures. The page shows no testimonial, rating, review count, "years of experience" or patient name. "Dos fisioterapeutas colegiados" is the customer's own description and may be stated as a fact of the clinic, not as proof of results.

## Conversion plan

Written with the `conversion-psychology` skill on top of the Copy plan (the plan keeps the persuasion order; this one plans attention, choice, trust and the ending). Every element comes from the brief; nothing is invented.

- **Emotional target:** trust (primary), calm (secondary). Reason: the audience is in pain and unsure who to ask (`audience.needs`, `audience.objections`), the tone words are "cercano, profesional, tranquilo, claro", and the niche is regulated health, where pressure is out of place. Never fear.
- **Attention path:** the hero's focal point is the `h1` on the left of the split, with the photo as a quiet second element; then the one primary call to action "Pide tu primera valoración" (filled primary button, `goal.primary.url`); the secondary "Llámanos" (`tel:`) is a text link with the phone number beside it, visually weaker. No gaze cue (the photo shows no face).
- **Choice:** three offers side by side (the brief's three, no more). "Primera valoración" is highlighted, because every new patient starts there and it is the page's one action, not because of its price. No anchor or savings arithmetic: the bono's price is shown as given ("180 €, cinco sesiones, válidas durante tres meses"), with no "you save" line and no struck-through price.
- **Trust and risk:** no proof is shown (none in the brief). Trust comes from facts: two registered physiotherapists, individual 50-minute sessions, the same physio from start to end of the session, a written treatment plan, prices visible with what they include, full contact data and hours on the page (all example data labelled as such). No guarantee (the brief states none). Legal pages: none, because the brief names no market ("legal requirements unknown"). The prospect notice tells visitors this is a design proposal.
- **Ending:** the closing section repeats "Pide tu primera valoración" with the phone as the quiet alternative.
- **Ethics check** (`.claude/skills/conversion-psychology/references/ethics.md`):
  - [x] Every claim, price and fact comes from the brief; assumed values are labelled as example data on the page.
  - [x] No urgency or scarcity (the brief states none); no timer.
  - [x] No fear or anger; the problem is named plainly.
  - [x] Decline as easy as accept: no popups or modals; nothing to decline.
  - [x] No pre-checked boxes: the page has no form.
  - [x] Prices visible with what they include, no hidden costs.
  - [x] The highlighted option is the entry point every new patient needs, not the dearest one.
  - [x] No fake social proof, no rating markup.
  - [x] No AI images; stock photos show no face and are captioned as illustrative, never as the team or patients.
  - [x] Every call to action says what happens next (book the first assessment, call).
  - [x] Vulnerable audience (people in pain, after surgery): calm, plain language, no outcome promise, no medical advice.
  - [x] Nothing depends on the visitor not noticing it.

## 3D

None. A 3D scene would not tell this story better than a ruler and plain type, and the audience wants practical facts quickly.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |
| none  | n/a     | n/a    | n/a             | n/a                     |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings.

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages, lead forms (a prospect cannot consent and the brief has none), legal pages (no market in the brief), an embedded map (it would set third-party cookies).

## Decisions

1. Prospect landing: every page `noindex` with the visible prospect notice (`prospect.mjs write` before the build), images from Commons only, no AI images, no owner portrait, no forms, no legal holder; palette and fonts are picked from the niche with ui-ux-pro-max only, never from any business's look.
2. Assumed (from the brief, confirm at the checkpoint): business name, city and country; the three offer names and prices; the booking URL (example.com); phone, email, address and hours. On the page these are shown as given and marked as example data ("dato de ejemplo") where they appear, and RUN.md lists them under "to confirm before launch".
3. Assumed: `audience.awareness` = problem-aware and `seo.primaryKeyword` = "fisioterapeuta en Zaragoza" (from the brief's `assumed`; confirm at the checkpoint).
4. Empty in the brief and needed later: `proof` (the page shows none), `contact.social` (no profile links), `legal.markets` (see 5), `deploy.domain` (no `site` in `astro.config.mjs`, so canonical and sitemap URLs stay relative; the sitemap is empty anyway while the page is a prospect), `references.liked` and `references.disliked` (no reference sheet used).
5. Legal requirements unknown: the brief names no market, so no legal notice or privacy page is added. Once a market and holder data exist (after a sale), `node scripts/legal.mjs` writes the data for those pages. Nothing on the page is legal advice or a certification.
6. Regulated health niche: no promise of cure or results, no diagnosis or treatment claims, no medical advice, no comparison with other centres (`legal.constraints`), no invented reviews, ratings, testimonials, awards or "years of experience". Services are described plainly, and the calls to action invite the visitor to book an assessment or to ask. The FAQ answer to "no time to go twice a week" uses only brief facts (morning and evening hours, exercises for home) and does not state a session frequency, which the brief does not give: confirm with the customer.
7. JSON-LD carries only non-assumed facts (description, area served); name, phone, address and hours are added once the prospect confirms them.
8. Archetype: `swiss-grid-minimal+warm-local-service` (candidate 3) instead of the top `data-and-proof+warm-local-service`, because there is no proof and comparisons are forbidden (see "Archetype blend").
9. Copy framework: PAS, with the Agitate stage softened to naming objections plainly (regulated niche, calm target).
10. Photos are representative Commons stock, captioned as illustrative, with no identifiable faces; they are never presented as the clinic, its team or its patients.
11. Deploy target: the brief's `cloudflare-pages` maps to `cloudflare`, the default of `site.config.json` (`node scripts/deploy/config.mjs --from-brief --write` in the build confirms it).
