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

- **Primary:** `calm-statement` (one idea per screen set very large, soft full-bleed colour fields, one recurring drawn shape; owns the grid, header, footer and hero type).
- **Secondary:** `warm-local-service`.
- **Lent traits:** `hours-card` (compact card with opening hours, today highlighted, next to the address and the action).
- **Why:** `calm-statement` matches all six signals and the assumed `balanced` impact (+2), and it is the one grammar in the catalog built to be striking without photographs, which is exactly what the owner missed in the first version ("correct but not striking") and what a prospect page with no customer assets needs. The picker ties `calm-statement+data-and-proof` and `calm-statement+warm-local-service` at 11.5. The first was not taken: its traits (`stat-strip`, `comparison-table`) need figures and comparisons, and this brief has no proof and its legal constraints forbid comparing with other centres. `warm-local-service` lends what a local clinic really needs: the hours next to the action. Only one trait is borrowed (`hours-card`, not `practical-strip`), so the practical facts sit in one calm two-column block between statements, as the primary's grammar asks, and the page does not drift back to the earlier version's composition (`swiss-grid-minimal+warm-local-service`, split hero, practical strip).
- **Twist from the requirement:** "el mismo fisioterapeuta de principio a fin" (`offer[1].description`). The drawn line is that thread: it starts in the hero joining the words "principio" and "fin", runs through the page and ends in the closing band under the button. In the "how a visit works" section it passes through the four parts of the first visit that the brief names (entrevista, exploración, plan por escrito, primera sesión) and ends in "un plan de ejercicios para casa". It shows order only, never minutes or results.
- **Planned deviations:** a sticky light header with the name, the phone and the button (allowed by the sheet because the brief is `conversion-first`); two or three illustrative stock photos placed large and alone (the sheet allows them) so that at least half of the sections carry a visual; the line-drawing effect is CSS (`stroke-dashoffset` with a scroll-driven animation under `@supports` and `prefers-reduced-motion: no-preference`), not one of the motion primitives, since the motion layer has no line primitive (without support the line is simply drawn).

Sections: 1. Header (sticky); 2. Hero `#inicio`; 3. Practical `#cuando`; 4. Problem `#lo-tuyo`; 5. Who we see `#que-tratamos`; 6. How a visit works `#primera-visita`; 7. The same person `#quien`; 8. Prices `#precios`; 9. Questions `#dudas`; 10. Closing `#reserva`; 11. Footer.

Rules the page follows while the business is a prospect:

- Every page is `noindex`, the sitemap is empty and the server sends `X-Robots-Tag: noindex`.
- Every page shows a notice saying it is a design proposal and not the official website.
- No logo, photo, color or font of the business is used: the images come from Wikimedia Commons or The Met and the palette and fonts are chosen from the niche.
- No AI images, no legal holder, no forms: nobody has agreed to any of them.

## Facts and sources

No sources are recorded.

## Assumed

Values chosen for the business, not read from it. Confirm each one with the business.

| Field              | Value                                              | Reason                                                                                                               |
| ------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| business.name      | Fisioterapia Ribera                                | Prospecto ficticio para la primera prueba real de landings de prospecto (2026-11-03).                                |
| business.city      | Zaragoza                                           | Ciudad elegida para la prueba.                                                                                       |
| business.country   | ES                                                 | Mercado de la prueba.                                                                                                |
| offer[0].name      | Primera valoración                                 | Servicio típico de una clínica de fisioterapia; ficticio.                                                            |
| offer[0].price     | 45 €                                               | Precio ficticio, en el rango habitual.                                                                               |
| offer[1].name      | Sesión de fisioterapia                             | Servicio típico; ficticio.                                                                                           |
| offer[1].price     | 40 €                                               | Precio ficticio, en el rango habitual.                                                                               |
| offer[2].name      | Bono de 5 sesiones                                 | Servicio típico; ficticio.                                                                                           |
| offer[2].price     | 180 €                                              | Precio ficticio, en el rango habitual.                                                                               |
| goal.primary.url   | https://reservas.example.com/fisioterapia-ribera   | Reserva de ejemplo en example.com.                                                                                   |
| contact.phone      | +34 976 000 000                                    | Teléfono de ejemplo; se marca como dato de ejemplo en la página.                                                     |
| contact.email      | hola@example.com                                   | Dominio reservado example.com.                                                                                       |
| contact.address    | Calle de Ejemplo 12, 50000 Zaragoza                | Dirección de ejemplo.                                                                                                |
| contact.hours      | Lunes a viernes de 8:00 a 14:00 y de 16:00 a 21:00 | Horario típico de una clínica de barrio; ficticio.                                                                   |
| audience.awareness | problem-aware                                      | Quien tiene dolor sabe lo que le pasa pero no si un fisio es la solución ni cuál elegir.                             |
| seo.primaryKeyword | fisioterapeuta en Zaragoza                         | Búsqueda típica de este servicio.                                                                                    |
| brand.impact       | balanced                                           | Rebuild after the owner found the first version correct but not striking; balanced is the default level, to confirm. |

## To go live

The page cannot be published as the business's site until all of this exists:

1. The business's own assets (logo, photos, colors, fonts) with the owner and written permission, recorded in `brief.json` `assets`.
2. Its consent to AI images, if you want any (`brand.aiImages`). Without it the page keeps stock and archive images only.
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
