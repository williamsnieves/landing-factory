# Proposal: clinica-dental

Status: **proposed**. Generated in `--auto` mode; the Decisions marked "Assumed" are to be confirmed.

## Brief

- **Niche:** neighborhood dental clinic in Valencia: general dentistry, hygiene, clear aligners (invisible orthodontics) and implants.
- **Brand (fictional):** "Dental Azahar", a small clinic in Valencia. Address, phone, email and hours are placeholders.
- **Goal of the page:** get people to ask for an appointment. Primary action: "Pedir cita" (a phone link and an email link, no backend form); secondary: "Cómo es la primera visita" (anchor to the visit steps).
- **Audience:** locals of the neighborhood, many of them anxious about the dentist, who postponed going; adults considering aligners or implants.
- **Tone:** close, calm and reassuring; plain words, short sentences, no jargon, no pressure. Never infantile.
- **Language:** Spanish (`es`), original copy.
- **Site location:** `sites/clinica-dental/`, its own Cloudflare Pages project.

## References used

| Sheet | What we take                                                                                                                      | What we leave                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| none  | No pattern sheet fits a dental clinic; `patterns/` only holds bakery sheets and the starter demo. Structure comes from the brief. | Everything from the bakery sheets. |

**Direction in one line:** A quiet, airy clinic page: soft sea-green and white, rounded friendly type, light-filled photos of Valencia and calm spaces, and every section answering one fear ("¿me va a doler?", "¿cuánto cuesta?", "¿y si me pongo nervioso?").

## Page map

| #   | Section          | Height                 | Purpose                        | Layout idea                                                                                                                                                                                                |
| --- | ---------------- | ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Header           | thin                   | Navigation and the main action | Wordmark left, 3 anchor links, solid "Pedir cita" button; phone number visible from `md` up                                                                                                                |
| 2   | Hero             | 1 viewport             | Reassure and invite            | Split: statement and two buttons on the left ("Pedir cita", "Cómo es la primera visita"), calm photo in a large rounded frame on the right; a line "Sin prisas, sin juicios"                               |
| 3   | Fear and promise | ~0.7 viewport          | Name the fear honestly         | Tinted panel; one large sentence ("Si te da miedo ir al dentista, no eres el único."); three small commitments (we explain before we start, you can stop whenever you raise your hand, we go at your pace) |
| 4   | Treatments       | ~1 viewport            | What we do                     | Heading left, 4 cards (Odontología general, Higiene dental, Ortodoncia invisible, Implantes), each with a photo, a plain two-line description and "Pregúntanos"; no prices as promises                     |
| 5   | First visit      | ~2 viewports of scroll | Remove the unknown             | Pinned from `md`: a photo on the left changes through 4 steps (hablamos, revisamos, te lo explicamos, decides tú) while the texts advance on the right; stacked on mobile                                  |
| 6   | Calm moment      | ~0.6 viewport          | The one playful moment         | A large soft circle that slowly "breathes" with the line "Respira. Vamos a tu ritmo." and a short list of what helps (music, breaks, explanations); CSS only, static under reduced motion                  |
| 7   | The clinic       | ~0.8 viewport          | Humanize the place             | Asymmetric strip of 3 photos with light parallax and a short text about a small team and unhurried appointments (no invented staff names or figures)                                                       |
| 8   | Questions        | ~0.8 viewport          | Handle objections              | Accordion of 5 short questions using native `details` (pain, nerves, payment options "pregúntanos", emergencies, first visit)                                                                              |
| 9   | Pedir cita       | ~0.6 viewport          | Conversion and practical info  | Large call to action (phone and email), address, hours table (sample), "Cómo llegar" link; sample-data note                                                                                                |
| 10  | Footer           | ~0.5 viewport          | Close                          | Wordmark, legal placeholders, photo credits                                                                                                                                                                |

## Motion plan

| Moment                     | Trigger | Type                                                | Notes                                            |
| -------------------------- | ------- | --------------------------------------------------- | ------------------------------------------------ |
| Hero statement             | load    | reveal (fade and rise, staggered)                   | Photo does not move                              |
| Headings, cards, questions | scroll  | reveal (`data-reveal`)                              | Existing primitive                               |
| First visit (5)            | scroll  | pin + step change (`data-pin`, `data-pin-min="md"`) | The only pinned section                          |
| Clinic strip (7)           | scroll  | parallax (`data-parallax`, subtle)                  | Never on text                                    |
| Calm moment (6)            | load    | CSS breathing animation on a circle                 | The one playful moment; off under reduced motion |
| Whole page                 | scroll  | smooth scroll (Lenis, `smooth`)                     | Off under reduced motion                         |

Reduced motion: no pin, no scrub, no parallax, no smooth scroll, no breathing; all content visible in its final state. Without JavaScript the page reads top to bottom with every section visible.

## Visual direction

- **Type:** a friendly rounded-geometric grotesque for display, large in the hero, the fear sentence and the calm moment; a clean humanist sans for body. Open-licensed `@fontsource` families; final pairing by ui-ux-pro-max. Different from the bakery's serif display.
- **Palette:** off-white with a faint cool tint, a pale sea-green panel, deep teal-green ink and primary, one warm coral accent reserved for tiny marks. Primary color family teal, not brown. Final values by ui-ux-pro-max.
- **Hero type:** `split`.
- **Imagery:** openly licensed photos from Wikimedia Commons only (via `scripts/find-images.mjs`): bright calm interiors and waiting-room details, plants, natural light, Valencia streets, orange blossom and tiled facades, toothbrushes and neutral dental equipment without brands. No identifiable faces, readable signs or logos. No images from references.

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings. Hero photo optimized (responsive sizes, modern format, preloaded).

## Out of scope

Online booking engine, backend forms, patient area, payments, CMS, multiple languages.

## Decisions

1. Assumed: brand "Dental Azahar" in Valencia, fictional; address, phone, email and hours are sample data (confirm at the checkpoint).
2. Assumed: the call to action is a phone link and an email link; no form.
3. Regulated niche (dental): the copy promises no results, makes no diagnosis or treatment claims (no "indoloro", "sin dolor", "garantizado", "resultados perfectos"), and invents no reviews, ratings, testimonials, awards, certifications, license numbers, professional names or "years of experience" figures. Services are described plainly, with what happens in the appointment, and every treatment ends in "Pregúntanos" or "Pide cita y te lo explicamos". Prices are not shown; payment options are an "ask us" item. Fear is addressed with what the clinic does (explains, pauses on request), not with medical guarantees. Aligner and implant text says the dentist decides whether a treatment fits after an examination.
4. The page uses stock photos and sample data to replace before launch; photos are representative and never presented as the clinic's own.
5. Diversity: the bakery uses brown / Fraunces / full-bleed-photo; this site uses teal-green, a rounded grotesque and a split hero.
