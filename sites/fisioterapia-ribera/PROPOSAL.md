# Proposal: fisioterapia-ribera

Status: **approved**. Approved by the owner at the checkpoint (2026-11-06), resumed with `--resume --auto`.

## Brief

- **Source:** `sites/fisioterapia-ribera/brief.json` (prospect brief, `prospect.status: prospect`, `sources: []`). Every fact in it is listed in `assumed` (a fictional prospect for a test of the prospect flow), so nothing on the page is presented as a verified fact of a real business; see Decisions and "Prospect: facts and sources".
- **Niche:** neighbourhood physiotherapy clinic (from `business.description`): two registered physiotherapists, back and neck pain, sports injuries and recovery after surgery, individual 50-minute sessions and an exercise plan for home.
- **Brand (fictional or real):** Fisioterapia Ribera, Zaragoza, ES (all three assumed in the brief).
- **Goal of the page:** primary action "Pide tu primera valoración" → `https://reservas.example.com/fisioterapia-ribera` (assumed URL); secondary action "Llámanos" → `tel:+34976000000`.
- **Audience:** neighbours aged 30 to 65 with back or neck pain from work, runners and amateur athletes with an injury, and people coming out of knee or hip surgery (`audience.who`). Needs: understand what is happening and what they can do, always the same person, unhurried sessions, hours that fit work. Objections: "is this for a physio or a doctor?", "I went elsewhere and they only used machines", "I have no time to go twice a week".
- **Tone:** cercano, profesional, tranquilo, claro.
- **Signals:** local-service, calm, serious, educational, conversion-first, few-assets
- **Language:** Spanish (`es`), single locale.
- **Site location:** `sites/fisioterapia-ribera/`, deployed to Cloudflare Pages (`deploy.target: cloudflare-pages`, already the default of `site.config.json`).

## References used

| Sheet | What we take                                                                                                                                                                                                | What we leave       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| none  | The brief names no liked reference and no `--refs` was given. No generic sheet in `patterns/` fits a neighbourhood health clinic (bakeries, SaaS, studios), so the archetype sheets alone give the grammar. | All of `patterns/`. |

**Direction in one line:** a calm, very large typographic page on soft warm colour fields where one hand-drawn line, the "thread" of a treatment that goes from the first visit to the exercises at home, connects every statement and ends at the booking button.

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site fisioterapia-ribera` (signals of the Brief, no reference sheets, blends other sites already use). The archetype sheets in `design-archetypes/` are a starting grammar, not a template: any deviation goes in RUN.md "Design decisions".

- **Primary:** `calm-statement` (one idea per screen set very large, soft full-bleed colour fields, one recurring drawn shape; owns the grid, header, footer and hero type).
- **Secondary:** `warm-local-service`.
- **Lent traits:** `hours-card` (compact card with opening hours, today highlighted, next to the address and the action).
- **Why:** `calm-statement` matches all six signals and the assumed `balanced` impact (+2), and it is the one grammar in the catalog built to be striking without photographs, which is exactly what the owner missed in the first version ("correct but not striking") and what a prospect page with no customer assets needs. The picker ties `calm-statement+data-and-proof` and `calm-statement+warm-local-service` at 11.5. The first was not taken: its traits (`stat-strip`, `comparison-table`) need figures and comparisons, and this brief has no proof and its legal constraints forbid comparing with other centres. `warm-local-service` lends what a local clinic really needs: the hours next to the action. Only one trait is borrowed (`hours-card`, not `practical-strip`), so the practical facts sit in one calm two-column block between statements, as the primary's grammar asks, and the page does not drift back to the earlier version's composition (`swiss-grid-minimal+warm-local-service`, split hero, practical strip).
- **Twist from the requirement:** "el mismo fisioterapeuta de principio a fin" (`offer[1].description`). The drawn line is that thread: it starts in the hero joining the words "principio" and "fin", runs through the page and ends in the closing band under the button. In the "how a visit works" section it passes through the four parts of the first visit that the brief names (entrevista, exploración, plan por escrito, primera sesión) and ends in "un plan de ejercicios para casa". It shows order only, never minutes or results.
- **Planned deviations:** a sticky light header with the name, the phone and the button (allowed by the sheet because the brief is `conversion-first`); two or three illustrative stock photos placed large and alone (the sheet allows them) so that at least half of the sections carry a visual; the line-drawing effect is CSS (`stroke-dashoffset` with a scroll-driven animation under `@supports` and `prefers-reduced-motion: no-preference`), not one of the motion primitives, since the motion layer has no line primitive (without support the line is simply drawn).

## Signature moment

The one moment a visitor should remember, at every impact level (`quiet` means a quieter moment, not none). Built from brief facts only; never invented proof, figures or results.

- **Section:** hero (section 1).
- **What it shows:** the `h1` set eight to twelve times the body size in two or three lines ("Tu fisioterapeuta en Zaragoza, de principio a fin."), and one hand-drawn line in the primary colour that leaves the word "principio", loops calmly once across the field and arrives under "fin", then continues off the bottom edge into the next section (the thread of the page).
- **Technique:** scale and a drawn shape: inline SVG (`viewBox` wider than 96) on a soft full-bleed colour field; the line draws itself once on load and its continuation draws with the scroll.
- **Reduced motion and no JavaScript:** the line is fully drawn and static; the headline and button are visible at once. The drawing is CSS only, so no JavaScript is needed for either state.
- **Brief facts used:** `offer[1].description` ("el mismo fisioterapeuta de principio a fin"), `business.city`, `seo.primaryKeyword`, `goal.primary`.

## Page map

| #   | Section                             | Height   | Purpose                                                     | Layout idea                                                                                                                                                                                                                                                   |
| --- | ----------------------------------- | -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Header (sticky)                     | 64–72 px | Name, phone and the one action always in reach              | Light bar on the ground colour: wordmark left, "Llámanos" text link and the filled button "Pide tu primera valoración" right; on phones the phone becomes an icon-sized text link                                                                             |
| 1   | Hero `#inicio`                      | 100svh   | Who, where and the action; the signature moment             | Full-bleed soft colour field; very large `h1` flush left, the drawn line between "principio" and "fin", one short paragraph (what they treat, 50-minute individual sessions), primary button and the secondary "Llámanos" link                                |
| 2   | Practical `#cuando`                 | ~60svh   | Where, when, how to book, within the second screen          | Calm two columns on the light ground: left the address and the phone (marked "dato de ejemplo"), right the `hours-card` (Monday to Friday, morning and afternoon, today highlighted with JS and plain without it) and the button                              |
| 3   | Problem `#lo-tuyo`                  | ~90svh   | Name the visitor's situation plainly                        | Statement band: one oversized line about not knowing whether the pain is for a physio or a doctor, short supporting text; the thread passes behind                                                                                                            |
| 4   | Who we see `#que-tratamos`          | ~110svh  | Amplify, without fear: the three situations the brief names | Two-column block: a large illustrative photo alone on one side (hands treating a back, "Foto ilustrativa"), on the other three short paragraphs (espalda y cuello por el trabajo; una lesión haciendo deporte; después de una operación de rodilla o cadera)  |
| 5   | How a visit works `#primera-visita` | ~120svh  | Story and solution: what happens in the first visit         | Statement line "Primero, entender qué te pasa." then the thread drawn horizontally (vertically on phones) through four named points: entrevista, exploración, plan de tratamiento por escrito, primera sesión; it ends in "y un plan de ejercicios para casa" |
| 6   | The same person `#quien`            | ~80svh   | Testimony stage with no proof: the business's own facts     | Statement band: "Dos fisioterapeutas colegiados. Siempre el mismo contigo." with 50-minute individual sessions; no names, no faces, no photo presented as the team                                                                                            |
| 7   | Prices `#precios`                   | ~90svh   | Offer: the three prices, the first visit highlighted        | Three calm columns on the light ground (never cards in a grid), each with name, price, what it includes; "Primera valoración" carries the button; a quiet note "Precios de ejemplo"                                                                           |
| 8   | Questions `#dudas`                  | ~100svh  | Response: answer the three objections                       | Two columns: a large line on the left, native `<details>` on the right (physio or doctor; "only machines"; no time twice a week); a second illustrative photo (treatment room) only if a good one exists                                                      |
| 9   | Closing `#reserva`                  | ~80svh   | Ending: repeat the action; the thread ends here             | Statement band in the deepest field colour: "Empieza por una valoración." the button, the phone, the thread ending under the button                                                                                                                           |
| 10  | Footer                              | auto     | Contact, hours, credits                                     | Quiet columns on the light ground: address, phone, email, hours (each marked as sample data), photo credits from `credits.json`, a one-line note that the data on the page are examples                                                                       |

## Motion plan

| Moment           | Trigger          | Type                                                                                       | Notes                                                                            |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Hero line draws  | page load        | CSS `stroke-dashoffset` animation, ~1.6 s, long ease                                       | Signature moment; drawn and static under reduced motion                          |
| Statements enter | scroll into view | `data-reveal` (y 48, slow)                                                                 | One per screen: sections 3, 5, 6, 9                                              |
| Thread continues | scroll           | CSS scroll-driven `animation-timeline: view()` on the line segments of sections 3, 5 and 9 | Under `@supports (animation-timeline: view())`; elsewhere the segments are drawn |
| Visit steps      | scroll into view | `data-reveal` with `data-reveal-delay` 0.1 steps                                           | Section 5, four points                                                           |
| Photos           | —                | none (no parallax)                                                                         | Photos stay still: calm grammar, one gesture per screen                          |

No pinned section and no Lenis smooth scroll (native scrolling suits an older, practical audience). Reduced motion: no pin, no scrub, no parallax, no smooth scroll; all content and every line visible in its final state. Without JavaScript the page reads top to bottom with every section visible and the lines drawn.

## Visual direction

- **Type:** one soft serif or humanist display face, set very large in sentence case with generous leading (statements 8 to 12 times the body size, two or three lines each), and a quiet, very legible sans for text (the audience reaches 65: body at 18 px or more). Open-licensed families from `@fontsource`, chosen by ui-ux-pro-max; not Fraunces, Newsreader or the earlier version's Atkinson Hyperlegible Next.
- **Palette:** a light warm ground (paper), two or three soft warm colour fields (sand, pale clay, a muted warm tint) for the statement bands, a deep ink for text, and one deep, calm primary for the button and the drawn line, from a hue family no other site uses as its primary (not green, teal, navy or royal blue, orange, red-orange, brown, violet, magenta or acid green). The closing band uses the deepest field. Values come from ui-ux-pro-max; text holds 4.5:1 on every field.
- **Hero type:** `illustration` (the drawn line is the image; type carries the rest).
- **Imagery:** the drawn thread in SVG is the main visual and appears in the hero and in sections 3, 5, 6 and 9. Photos, placed large and alone, never in a grid: section 4, hands treating a back or a shoulder (Pixabay first, Commons as fallback, 1280 px is enough for a half-width image); section 8, an empty, quiet treatment room (Pixabay or Commons), only if a good one exists, else the thread. Every photo of people is illustrative with the caption "Foto ilustrativa", shows hands rather than faces, never sits next to a name or a quote, and is never presented as the clinic's team, patients or premises. No recognisable brand or logo in any photo. No AI images (a prospect cannot consent). Every file recorded in `assets.json` and `CREDITS.md`.

## SEO

- **Primary keyword:** "fisioterapeuta en Zaragoza" (`seo.primaryKeyword`, listed as assumed in the brief). Secondary: "fisioterapia dolor de espalda Zaragoza", "fisioterapia deportiva Zaragoza", "rehabilitación tras operación de rodilla" (`seo.keywords`), used where the copy talks about each.
- **Service area:** Zaragoza (`seo.serviceArea`). The `seo-audit` local-business rules apply: city in the title, the `h1` and the description, a visible address and phone (sample here), opening hours in text.
- **Schema type:** `MedicalClinic` (`seo.schemaType`), in `src/data/seo.ts`. Every value in the brief is assumed (a fictional prospect), so the JSON-LD carries only the name, description, `areaServed: Zaragoza` and `medicalSpecialty: PhysicalTherapy`; no telephone, email, address or hours (they are sample data) and no review or rating markup (there is no proof).
- **Title and description per page:** home: title "Fisioterapeuta en Zaragoza | Fisioterapia Ribera" (48 characters), description of 140 to 155 characters naming back and neck pain, sports injuries, recovery after surgery and the 50-minute sessions; 404: its own title and description. Title 30 to 60 characters, description 70 to 160 (`report.seo`). One `h1` per page with the keyword written naturally, also in the first paragraph. The page is `noindex` while it is a prospect (set by `prospect.json`), so the sitemap stays empty; the markup is still written for the day it is sold.

## Copy plan

Chosen from `node scripts/pick-copy-framework.mjs --site fisioterapia-ribera` (the brief's awareness, kind, price, goal, proof, regulated flag and objections). Facts and proof come from the brief only; the writing help is the `copywriting` skill, the structure is the plan.

- **Framework:** PASTOR (Problem, Amplify, Story and solution, Testimony, Offer, Response). Override of the top candidate PAS, which ties with it at score 6: the brief states three concrete objections and PASTOR's Response stage answers them on the page, while PAS has no place for them; and PAS's Agitate stage pushes toward pain and worry, which a regulated health niche and the emotional target (trust, calm) rule out. The Amplify stage here describes the everyday situations the brief names, plainly, without frightening.
- **Awareness:** problem-aware (stated in the brief but listed in `assumed`: to confirm).
- **Stage to section:**

| Section             | Stage                          | What it says                                                                                                                                  | Facts it uses                                                                                                           |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1 Hero              | Problem (opening)              | A physiotherapist in Zaragoza who stays with you from the first visit to the exercises at home                                                | `business.city`, `seo.primaryKeyword`, `offer[1].description`, `business.description`, `goal.primary`, `goal.secondary` |
| 2 Practical         | Problem (practical answer)     | Where, when and how to book, before anything else                                                                                             | `contact.address`, `contact.hours`, `contact.phone` (all sample), `goal.primary`                                        |
| 3 Problem           | Problem                        | Not knowing whether your pain is for a physio or for the doctor, and what you can do                                                          | `audience.needs`, `audience.objections[0]`                                                                              |
| 4 Who we see        | Amplify                        | The three situations: neck and back from work, an injury from sport, after a knee or hip operation                                            | `audience.who`, `business.description`, `seo.keywords`                                                                  |
| 5 How a visit works | Story and solution             | The first visit: interview, examination, a written plan, the first session; then an exercise plan for home                                    | `offer[0].description`, `business.description`                                                                          |
| 6 The same person   | Testimony (no proof available) | The business's own facts in place of proof: two registered physiotherapists, individual 50-minute sessions, the same one from start to finish | `business.description`, `offer[1].description`                                                                          |
| 7 Prices            | Offer                          | The three options with what each includes; the first visit highlighted                                                                        | `offer[0..2]` (names and prices as given, marked as sample)                                                             |
| 8 Questions         | Response                       | Plain answers to the three objections, describing the service and never giving medical advice                                                 | `audience.objections`, `offer[1].description`, `offer[2].description`, `contact.hours`, `business.description`          |
| 9 Closing           | Response (action)              | Start with a first visit; call if you prefer                                                                                                  | `goal.primary`, `goal.secondary`, `contact.phone`                                                                       |

- **Hero headline candidates (2 or 3):**
  1. **"Tu fisioterapeuta en Zaragoza, de principio a fin."** (chosen) Useful 3, Urgent 1, Unique 4, Ultra-specific 3. It carries the keyword, the city and the one fact that sets the clinic apart, and gives the drawn line its two ends.
  2. "Fisioterapia en Zaragoza sin prisas: 50 minutos, siempre con la misma persona." Useful 3, Urgent 1, Unique 3, Ultra-specific 4. Specific but long for a statement set at 8 to 12 times the body size.
  3. "Primero entendemos qué te pasa. Fisioterapeuta en Zaragoza." Useful 3, Urgent 1, Unique 2, Ultra-specific 2. Kept as the line of section 5.
     No candidate uses urgency: none is true.
- **Proof inventory:** `proof` is empty: no proof available. No testimonials, ratings, review counts, figures, years of experience, awards or patient names. The Testimony stage uses the business's own facts (two registered physiotherapists, individual sessions, the same physiotherapist) instead.

## Conversion plan

Written with the `conversion-psychology` skill on top of the Copy plan (the plan keeps the persuasion order; this one plans attention, choice, trust and the ending). Every element comes from the brief; nothing is invented.

- **Emotional target:** trust, with calm as the secondary target. The tone words (cercano, profesional, tranquilo, claro) and an audience arriving with pain and doubt about whom to see call for confidence and a quiet pace; the problem is named plainly, never with fear.
- **Attention path:** hero focal point is the very large headline, then the line leads the eye from "principio" to "fin" and down to the button. One primary call to action, "Pide tu primera valoración" (`goal.primary.url`), a filled button identical in the header, the hero, section 2, the prices (first visit) and the closing band. Secondary action "Llámanos" (`tel:+34976000000`) as a text link, visually weaker. No gaze cue (no licensed photo with a face is planned).
- **Choice:** three offers side by side in section 7 (the maximum): Primera valoración 45 €, Sesión de fisioterapia 40 €, Bono de 5 sesiones 180 €, written as given and marked as sample prices. Highlighted: Primera valoración, because it is the first step every new visitor takes and it includes the first treatment session; not because of its price. No anchor or savings figure is computed (the brief states none).
- **Trust and risk:** no proof available, so trust comes from the business's own facts (two registered physiotherapists, individual 50-minute sessions, a written plan, the same physiotherapist), plain prices with what they include, and visible contact data: address, phone, email and hours near the top and in the footer (all sample, marked). No legal pages (the brief names no market). No guarantee (the brief states none). The prospect notice at the top of `<main>` says plainly that this is a design proposal.
- **Ending:** section 9, the deepest colour band, repeats "Pide tu primera valoración" with the phone as the alternative; the thread ends under the button.
- **Ethics check:**
  - [x] Every claim, price and fact comes from the brief; nothing invented or improved (all of them are assumed and labelled as sample where shown).
  - [x] No urgency or scarcity (the brief states none); no deadline, no timer.
  - [x] Fear and anger are not targets; the problem is named plainly.
  - [x] Decline is as easy as accept: there is no popup or modal to decline; every action is a plain link.
  - [x] No pre-checked boxes: the page has no form.
  - [x] Prices visible with what they include; no hidden costs.
  - [x] The highlighted option is the natural first step and includes a session; it is not the dearest one.
  - [x] No fake social proof: no testimonials, ratings, counters, logos or awards; no review markup.
  - [x] No AI images; stock people only as hands, captioned "Foto ilustrativa", never as the team or patients.
  - [x] The button says what happens next (asking for the first assessment) and goes to the booking URL.
  - [x] Vulnerable audience (people in pain, after surgery): calm, plain language, no pressure, no outcome promise (regulated niche).
  - [x] Nothing depends on the visitor not noticing it.

## 3D

None. The drawn thread is SVG; a scene would add weight without telling more of this story.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |
| none  | —       | —      | —               | —                       |

## Prospect: facts and sources

The brief is a fictional prospect for the first real test of the prospect flow: `prospect.sources` is empty and every fact is listed in `assumed`. No fact is presented as verified, and no fact was added beyond the brief.

| Fact             | Value                                              | Source | Assumed because                                                              |
| ---------------- | -------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| business.name    | Fisioterapia Ribera                                | none   | Fictional prospect for the first real test of prospect landings (2026-11-03) |
| business.city    | Zaragoza                                           | none   | City chosen for the test                                                     |
| business.country | ES                                                 | none   | Market of the test                                                           |
| offer[0]         | Primera valoración, 45 €                           | none   | Typical service and price; fictional                                         |
| offer[1]         | Sesión de fisioterapia, 40 €                       | none   | Typical service and price; fictional                                         |
| offer[2]         | Bono de 5 sesiones, 180 €                          | none   | Typical service and price; fictional                                         |
| goal.primary.url | https://reservas.example.com/fisioterapia-ribera   | none   | Example booking URL on example.com                                           |
| contact.phone    | +34 976 000 000                                    | none   | Example phone, marked as sample on the page                                  |
| contact.email    | hola@example.com                                   | none   | Reserved example.com domain                                                  |
| contact.address  | Calle de Ejemplo 12, 50000 Zaragoza                | none   | Example address                                                              |
| contact.hours    | Lunes a viernes de 8:00 a 14:00 y de 16:00 a 21:00 | none   | Typical neighbourhood clinic hours; fictional                                |

No logo, photo, colour or font of the business is used (the brief has none, and a prospect landing never uses them); palette and fonts come from the niche through ui-ux-pro-max. Images only from Pixabay and Commons. No AI images, no owner portrait, no lead forms, no legal holder. `node scripts/prospect.mjs write` runs before the build (noindex, visible notice, empty sitemap, `X-Robots-Tag`), and `node scripts/prospect.mjs kit` writes `SALES.md` at the end.

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings, no failing item in the landing report, `check-landing` passing (including `prospect`, `copy-claims`, `layout-diversity`).

## Out of scope

Online shop, cart, payments, backend forms, lead forms (a prospect cannot give an access key or consent), CMS, multiple languages, legal pages (no market), analytics, 3D.

## Decisions

1. Rebuild: this run replaces an earlier version the owner found correct but not striking (`swiss-grid-minimal+warm-local-service`, green primary, Atkinson Hyperlegible Next, split hero). The new blend, hero type, palette family and display font all differ, and the signature moment is the striking element the first version lacked.
2. Assumed: every business fact (name, city, country, offers and prices, booking URL, phone, email, address, hours) is fictional and listed in the brief's `assumed`. On the page, contact data, hours and prices carry a quiet "dato de ejemplo" / "precios de ejemplo" label; the business name is shown as the brand. (confirm at the checkpoint)
3. Assumed: `audience.awareness` problem-aware (in the brief's `assumed`). (confirm at the checkpoint)
4. Assumed: `brand.impact` balanced (in the brief's `assumed`: "rebuild after the owner found the first version correct but not striking"). If the owner wants more, `bold` is also in `calm-statement`'s impact list: bigger type and deeper colour fields, same grammar. (confirm at the checkpoint)
5. Assumed: `seo.primaryKeyword` "fisioterapeuta en Zaragoza" (in the brief's `assumed`). (confirm at the checkpoint)
6. Copy framework PASTOR instead of the tied top candidate PAS (reasons in the Copy plan). (confirm at the checkpoint)
7. Image sources: the brief notes say "Imágenes solo de Commons", but this run was started with `--sources pixabay,commons`, and Pixabay became a source after the brief was written (2026-11-04). Assumed: the command line is the owner's latest choice, so Pixabay is searched first and Commons is the fallback (both allowed for a prospect landing). Confirmed by the owner at the checkpoint (2026-11-06): Pixabay first, Commons as fallback; the brief notes now say so.
8. Regulated health niche (`legal.regulated`, `legal.constraints`): no promise of cure or results, no comparison with other centres, no medical advice. The page describes the service plainly (what the first visit includes, how long a session lasts, who treats you) and the questions section answers objections by describing the service, sending anything clinical to the first assessment or a phone call. No reviews, ratings, testimonials, awards, certifications or years-of-experience figures. "Colegiados" is used only because the brief states it.
9. No proof available (`proof` empty): the Testimony stage uses the business's own facts.
10. Legal requirements unknown: the brief names no market (`legal.markets` empty), so no legal notice or privacy policy pages are built; the page has no form, cookies or trackers. This is not legal advice.
11. Prospect landing: `noindex` on every page, the visible prospect notice, an empty sitemap and the `X-Robots-Tag` header come from `prospect.json`; no brand of the prospect, no customer files, no AI images, no lead forms, no holder data.
12. Stock photos: at most two, illustrative, hands and spaces rather than faces, captioned "Foto ilustrativa", never presented as the clinic's team, patients or premises.
13. Deploy target: `cloudflare-pages` in the brief = `cloudflare`, already in `site.config.json`.
14. No `site` domain: the brief has no `deploy.domain`, so canonical and Open Graph URLs stay relative until hand-off.
