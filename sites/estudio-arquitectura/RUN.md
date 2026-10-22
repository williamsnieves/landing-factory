# Run log: estudio-arquitectura

Result: passed

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field           | Value                                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Niche           | Small architecture studio in Madrid: housing rehabilitation and workspaces; sober, precise, cultured; 4-6 projects with plans and photos, method, commission leads |
| References      | none (generic archetypes only)                                                                                                                                     |
| Mode            | --auto, lang es, sources commons                                                                                                                                   |
| Max QA attempts | 5                                                                                                                                                                  |
| Started         | 2026-10-21T17:22:55Z                                                                                                                                               |

## Phases

| Phase         | Status | Started              | Finished             | Notes                                                                |
| ------------- | ------ | -------------------- | -------------------- | -------------------------------------------------------------------- |
| brief         | done   | 2026-10-21T17:22:55Z | 2026-10-21T17:23:30Z | goal: commission enquiries; audience private clients and small firms |
| synthesis     | done   | 2026-10-21T17:23:30Z | 2026-10-21T17:27:00Z | swiss-grid-minimal+horizontal-chapter-story                          |
| checkpoint    | done   | 2026-10-21T17:27:00Z | 2026-10-21T17:27:00Z | --auto                                                               |
| design-system | done   | 2026-10-21T17:27:00Z | 2026-10-21T17:30:00Z | primary #17356b, Schibsted Grotesk + Hanken Grotesk                  |
| build         | done   | 2026-10-21T17:30:00Z | 2026-10-21T17:57:57Z | 6 photos, 6 SVG plans                                                |
| qa            | done   | 2026-10-21T17:57:57Z | 2026-10-21T18:00:00Z | passed on run 2 (768 px overflow in the project index fixed)         |
| polish        | done   | 2026-10-21T18:00:00Z | 2026-10-21T18:00:30Z | impeccable detect: no findings; no edits needed                      |
| final-check   | done   | 2026-10-21T18:00:30Z | 2026-10-21T18:07:43Z | layout-diversity needed a recomposition; QA re-run passed            |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins). Every deviation from the chosen archetype sheets, with the requirement or reference that justifies it.

Art direction run: `draw.mjs --sector architecture --tone editorial --sections work,how-it-works,about,gallery,contact,footer --keep palette,type --options 3`, then `--direction contact-sheet` (the dealt options were contact-sheet, uneven-photographs, name-as-monument). Chosen because its "quiet ledger" and "drag row of moments" blueprints match the approved plan (a ruled project index and a sideways track). Palette and type were kept from MASTER.md. The skill's assets.mjs and the dealt picsum photographs were not used.

Disagreements between the skill (design-taste-frontend) and PROPOSAL/MASTER.md, resolved in favour of the proposal:

- Idea and hero: the contact-sheet hero (a wall of photographs, text in a small panel, no header) and its need for 24+ frames were not built. The proposal fixes a `split` hero (statement left, drawn plan right), a header with the action, and 5 projects; there are not enough honest openly licensed photographs for a contact sheet. Idea used instead: "the architect's drawing sheet becomes the page", with every project as photograph plus original SVG plan.
- Sections not taken from the dealt sheet: team on colour tiles, masonry gallery, three-cell form bar, footer of tiles, marquee strip and the 12 px captions. The page map is fixed by the proposal; there is no team, no form and no gallery.
- "No thin rules, no 01/02/03 numerals, no cream ground, no monospace": the proposal and the Swiss archetype require thin 1 px rules, numbered chapters (I to VI) and a warm paper ground, so rules, numerals and paper stay. No monospace is used.
- Body text 16 px or more and nothing under 13 px: followed. Captions and small meta rows use the token step `text-sm` (14 px); the 12 px step `text-xs` is not used anywhere.
- Shutter image motion and "one moving picture": not used. The proposal limits motion to `data-reveal` and the plan drawing; no clip-path shutter, no video.

Deviations from the archetype sheets (the primary swiss-grid-minimal, the secondary horizontal-chapter-story):

- Projects track is a native CSS scroll-snap row, not a pinned ScrollTrigger section (already planned in PROPOSAL "Planned deviations"). It is a focusable region (`tabindex="0"` with an `aria-label`), works without JavaScript and needs no reduced-motion fallback. The chapter-story rule "full-screen quiet moments" is met once, by the Pausa section.
- Hero is `split` with a drawn plan, not a photograph (PROPOSAL). The plan draws with CSS `stroke-dashoffset` (about 2.5 s, once); the finished drawing is the default state, so it is complete without JavaScript and under reduced motion.
- Sticky label column in Metodo is CSS `position: sticky` from `md` up (lent trait `split-sticky` of the primary). No second sticky element.
- A small "Arquitectura · Madrid" label sits above the hero heading (the only eyebrow on the page; the other chapter labels are the narrow-column numerals of the `chapter-index` trait, not eyebrows).
- Chapter numerals I to VI sit in the narrow column; the chapter-story archetype asks for a fixed index that follows the visitor, but the proposal keeps the index static (`data-reveal` only), so it is a ruled row at the foot of the hero plus the footer column.
- Full-bleed share: only the Pausa photograph is full-bleed (the sheet's `fullBleedShare` range of the secondary is not met; the primary's is).
- Layout file edit: `src/layouts/BaseLayout.astro` got a `skipLabel` prop (default unchanged) so the skip link is in Spanish; nothing else in the layout changed. `global.css` gained a small `@layer components` block (`.wrap`, `.btn`, `.btn-outline`, `.link`).

Components: `Plan.astro` (inline SVG, six variants from `src/data/plans.ts`: `hero`, `vivienda`, `altillo`, `escalera`, `cocina`, `oficina`; walls as thick strokes, windows as triple lines, doors as leaf plus arc, labels, scale bar, north arrow; colours through CSS classes and tokens only), `Photo.astro` (astro:assets `<Picture>` avif/webp/jpg with widths and sizes), `Cta.astro` (mailto with prepared subject and body), `Chapter.astro`. Copy, sample facts and project data live in `src/data/site.ts` and `src/data/projects.ts`.

## Images

Six distinct photographs downloaded with `scripts/find-images.mjs` (Wikimedia Commons only; 5 need credit and are shown in the footer through `src/data/credits.json`, 1 is CC0). Used at most twice each and never twice in a section:

| File                  | Source and licence            | Used in                                  |
| --------------------- | ----------------------------- | ---------------------------------------- |
| `vivienda-salon.jpg`  | Chris Olszewski, CC BY-SA 4.0 | Project 1                                |
| `cocina-escalera.jpg` | Philippstargard, CC BY-SA 4.0 | Project 2, Ámbitos (Vivienda)            |
| `escalera.jpg`        | Bart Lumber, CC0              | Project 3                                |
| `cocina.jpg`          | Shixart1985, CC BY 2.0        | Project 4                                |
| `oficina-reforma.jpg` | Influence Media, CC BY 4.0    | Project 5, Ámbitos (Espacios de trabajo) |
| `pausa-luz.jpg`       | aismallard, CC BY-SA 3.0      | Pausa (full-bleed)                       |

All are captioned as "Imagen de archivo" and never as the studio's work. Images are downscaled at build by astro:assets (avif, webp, jpg). Waits: Commons answered with HTTP 429 often; downloads at 1920 px failed repeatedly, so most files were fetched at 1280 or 960 px (the full-bleed Pausa photograph is 1920 px).

Dropped after looking at them:

- `cocina.jpg` first candidate (Brisbane apartment kitchen, Chris Olszewski): a visible brand name on the fridge and the same flat as the living-room photograph.
- Fábrica de Tabacos courtyard (Madrid): dark, and wrought-iron lettering readable in the frame.
- "Working in open office space" (Crew crew, Unsplash on Commons): an identifiable person working at a laptop.
- Not downloaded: "Ornate office space" and "Plant in a coworking space" (rate limit).

Not found: a brick or stone restoration photograph and a Madrid courtyard; Commons searches returned only unrelated buildings. Fewer photographs than planned (6 instead of 7 to 8); the two housing and workspace images are reused once each, with a different crop, in Ámbitos.

## QA attempts

| #   | Verdict | Failures by check    | Fixed                                                           | Notes                                                  |
| --- | ------- | -------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | failed  | overflow: 6 (768 px) | Project index row used a 5-column grid from `md`; moved to `lg` | index row 64 px wider than its column at 768 px        |
| 2   | passed  | none                 | -                                                               | Lighthouse and impeccable green                        |
| 3   | passed  | none                 | -                                                               | re-run after the final-check recomposition (see below) |

## Final check

- `check-landing`: passed (credits, photo reuse, tokens, contrast, diversity, layout-diversity, scenes). Originality skipped: no reference sheets were used.
- `credits --check`, `prettier --check .`, `npm run check:sites` (0 errors, 0 warnings): passed.
- Section screenshots reviewed at 375, 768 and 1440 px. One defect found by eye and fixed: the "III Método" chapter label was dark on the blue band (`Chapter` got a `tone="light"` prop).
- `layout-diversity` failed first against app-finanzas (also Swiss grid) and samurai (distance 0.04 to 0.19, threshold 0.2). Recomposed, not recolored: Método is now a full-bleed primary-color band with five columns; hero is a full-width headline with the plan below; Ámbitos uses two full-bleed photographs with text under each; Contacto opens with a full-bleed photograph; Encargo stages are four columns; the CTA is a ruled text action instead of a filled button; chapter labels are small tracked capitals; the footer is two blocks; photos have a 6 px radius.
- `archetype-target` warnings (deviations, all deliberate): `cols1Share` 0.75 and `cols2Share` 0.13 (full-width bands and rows), `imageRadius` 6 (the sheet allows up to 4), `headingScale` 6.7 (hero headline), `fullBleedShare` 0.38 (the chapter-story's full-screen moments). They exist to keep the page distinct from the other Swiss-grid site; the grid, flush-left axis, rules and sober type remain.

Extra design decisions from the final check: Método is a color band (the Swiss sheet prefers space over bands; the blueprint inversion is the page's one strong moment); the hero plan now sits below the headline, partly under the fold at 1440 px; `escalera.jpg` is reused (decorative, empty alt) at the top of Contacto, so it appears twice on the page; a type step `--text-5xl` and a radius `--radius-xl` were added to `tokens.css`.

## To confirm before launch

- Studio name "Estudio Larrea Vidal Arquitectura" and the claim "equipo reducido" (no team size is published).
- Sample contact data in `src/data/site.ts`: e-mail `hola@example.com`, phone `+34 910 000 000`, address "Calle de Ejemplo 12, 1.º B, 28000 Madrid", hours "Lunes a viernes, de 9:30 a 18:00". The footer says these are sample data.
- Sample projects in `src/data/projects.ts`: names, kinds, surfaces (72, 56, 28 per floor, 10 and 128 m²) and years (2022 to 2024). Replace them with real projects and with the real plans (the SVG plans are original schematic drawings that match the sample descriptions only loosely).
- Method, enquiry stages and "what to bring" are plausible generic text; check them against how the studio really works. No fees are published; the page says fees are agreed after the first visit.
- All photographs are representative stock from Wikimedia Commons (credited in the footer), not the studio's work; replace them with the studio's own photographs. The Pausa photograph is a phone-quality snapshot of an empty room.
- The prepared e-mail subject and body (`mailto` in `src/data/site.ts`).
- Social image: none is set (`ogImage`); add one when real photographs exist.

## Totals

Wall clock about 45 minutes (2026-10-21T17:22:55Z to 18:07:43Z; the build subagent took about 33 minutes). Tokens: design-system subagent about 64k, build subagent about 261k; the orchestrator's own count is not reported. Remaining failures: none.
