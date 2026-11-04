# Sales kit: Fisioterapia Ribera

Site: `sites/fisioterapia-ribera/`. Written by `node scripts/prospect.mjs kit --site fisioterapia-ribera`; running it again overwrites this file. Not legal advice.

## Summary

- **Business:** Fisioterapia Ribera, Zaragoza. Clínica de fisioterapia de barrio con dos fisioterapeutas colegiados. Tratan dolor de espalda y cuello, lesiones deportivas y recuperación tras una operación, con sesiones individuales de 50 minutos y un plan de ejercicios para casa.
- **Status:** prospect. The business has not bought or agreed to anything; the page is a design proposal, not its website.
- **Build result:** passed.
- **Language:** es.

Preview: <from the pull request comment>

## What was built

Archetype blend (from `PROPOSAL.md`):

Chosen from `node scripts/pick-archetypes.mjs --site fisioterapia-ribera` (signals of the Brief, no reference sheets, blends other sites already use). The archetype sheets in `design-archetypes/` are a starting grammar, not a template: any deviation goes in RUN.md "Design decisions".

- **Primary:** `swiss-grid-minimal` (owns the grid, flush-left type, rectangular photos, quiet footer).
- **Secondary:** `warm-local-service`.
- **Lent traits:** `practical-strip`, `hours-card`.
- **Why:** the signals `calm`, `serious`, `educational` fit swiss-grid-minimal and `local-service`, `conversion-first` fit warm-local-service; this is candidate 3 of 5 tied at score 5. The top candidate (`data-and-proof+warm-local-service`) was not taken because its grammar is "each section makes one claim and proves it" with figures and comparison tables, and this brief has no proof, is a regulated health niche, and its constraints forbid comparing with other centres: the evidence grammar would be empty or invented. `warm-local-service` as primary (candidates 4 and 5) was set aside because its hero wants honest photos of the real place and people, and a prospect page with only Commons stock (`few-assets`) cannot provide them; the Swiss grid lets type and space carry the page.
- **Twist from the requirement:** the 50-minute session. One section lays the session out as a measured horizontal ruler on the grid (0 to 50, minute ticks), with the stages of the visit hanging from it in order (listen, explore, treat, exercises for home) and the line "el mismo fisioterapeuta de principio a fin". The ruler shows the length of the session only; it assigns no minutes to each stage (the brief does not give them).
- **Planned deviations:** a filled, rectangular primary button (2 px radius at most) instead of the Swiss outline button, because `conversion-first` needs one obvious action on every screen; a sticky header with the action and the phone (warm-local-service header) instead of the Swiss header with no background; one colour field for the closing call to action (Swiss prefers space over colour bands), so the ending is unmistakable.

Sections: 1. Header (sticky); 2. Hero (`#inicio`); 3. Practical strip (`#datos`); 4. Qué tratamos (`#tratamos`); 5. Una sesión, 50 minutos (`#sesion`); 6. La primera visita (`#primera-visita`); 7. Precios (`#precios`); 8. Preguntas (`#preguntas`); 9. Horario y contacto (`#contacto`); 10. Cierre (`#reserva`); 11. Footer.

Rules the page follows while the business is a prospect:

- Every page is `noindex`, the sitemap is empty and the server sends `X-Robots-Tag: noindex`.
- Every page shows a notice saying it is a design proposal and not the official website.
- No logo, photo, color or font of the business is used: the images come from Wikimedia Commons or The Met and the palette and fonts are chosen from the niche.
- No AI images, no legal holder, no forms: nobody has agreed to any of them.

## Facts and sources

No sources are recorded.

## Assumed

Values chosen for the business, not read from it. Confirm each one with the business.

| Field              | Value                                              | Reason                                                                                   |
| ------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| business.name      | Fisioterapia Ribera                                | Prospecto ficticio para la primera prueba real de landings de prospecto (2026-11-03).    |
| business.city      | Zaragoza                                           | Ciudad elegida para la prueba.                                                           |
| business.country   | ES                                                 | Mercado de la prueba.                                                                    |
| offer[0].name      | Primera valoración                                 | Servicio típico de una clínica de fisioterapia; ficticio.                                |
| offer[0].price     | 45 €                                               | Precio ficticio, en el rango habitual.                                                   |
| offer[1].name      | Sesión de fisioterapia                             | Servicio típico; ficticio.                                                               |
| offer[1].price     | 40 €                                               | Precio ficticio, en el rango habitual.                                                   |
| offer[2].name      | Bono de 5 sesiones                                 | Servicio típico; ficticio.                                                               |
| offer[2].price     | 180 €                                              | Precio ficticio, en el rango habitual.                                                   |
| goal.primary.url   | https://reservas.example.com/fisioterapia-ribera   | Reserva de ejemplo en example.com.                                                       |
| contact.phone      | +34 976 000 000                                    | Teléfono de ejemplo; se marca como dato de ejemplo en la página.                         |
| contact.email      | hola@example.com                                   | Dominio reservado example.com.                                                           |
| contact.address    | Calle de Ejemplo 12, 50000 Zaragoza                | Dirección de ejemplo.                                                                    |
| contact.hours      | Lunes a viernes de 8:00 a 14:00 y de 16:00 a 21:00 | Horario típico de una clínica de barrio; ficticio.                                       |
| audience.awareness | problem-aware                                      | Quien tiene dolor sabe lo que le pasa pero no si un fisio es la solución ni cuál elegir. |
| seo.primaryKeyword | fisioterapeuta en Zaragoza                         | Búsqueda típica de este servicio.                                                        |

## To go live

The page cannot be published as the business's site until all of this exists:

1. The business's own assets (logo, photos, colors, fonts) with the owner and written permission, recorded in `brief.json` `assets`.
2. Its consent to AI images, if you want any (`brand.aiImages`). Without it the page keeps archive images only.
3. Legal holder data: name, tax id, address, email and the privacy contact (`legal.holder`, `legal.privacyContact`); markets not set yet (`legal.markets`). The legal pages are built from them; nothing is invented.
4. A domain the business controls (`deploy.domain`) and a hosting target.
5. Mark the prospect as a customer: `node scripts/prospect.mjs sold --site fisioterapia-ribera`. This removes the notice and the `noindex` on the next build.
6. Fill the brief with the customer: `/brief-intake fisioterapia-ribera`, then bring in their assets and copy with a revision round (`npm run revise -- fisioterapia-ribera --feedback <file>`), and check that the build is indexable.
7. Hand the landing over: `/landing-handoff fisioterapia-ribera`.

## Talking points

Taken from the brief, never invented results:

- What their audience needs: Saber qué les pasa y qué pueden hacer, que les atienda siempre la misma persona, sesiones sin prisas y un horario compatible con el trabajo.
- What holds their audience back: No sé si lo mío es para un fisio o para el médico; ya fui a otro sitio y solo me pusieron aparatos; no tengo tiempo para ir dos veces por semana.
- Show the page next to their current site and let them say what is missing.

## First contact

You write the first message yourself, by hand. This kit does not contain one.

- Unsolicited commercial email is restricted. In Spain the LSSI forbids it, businesses included, and other markets have similar rules (opt-in or prior relationship). Do not send the preview link in a mass or cold email.
- Prefer a contact the business can answer on its own terms: in person, by phone, or through its own public contact channel (its contact form, its listed WhatsApp or business address), and say plainly who you are and what you made.
- Say that the page is a draft built from public information and that it is not published as their site.
- This is a note, not legal advice. Check the rules of the market you contact.
