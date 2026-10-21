# Run log: app-finanzas

Result: passed

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field           | Value                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Niche           | Personal finance mobile app for young professionals in Spain (auto budgets, savings goals, spending analysis); goal: app downloads |
| References      | none (no generic sheet fits a fintech app)                                                                                         |
| Mode            | --auto, lang es                                                                                                                    |
| Max QA attempts | 5                                                                                                                                  |
| Started         | 2026-10-21T17:10:16Z                                                                                                               |

## Phases

| Phase         | Status | Started              | Finished             | Notes                                                 |
| ------------- | ------ | -------------------- | -------------------- | ----------------------------------------------------- |
| brief         | done   | 2026-10-21T17:10:16Z | 2026-10-21T17:11:00Z | goal: downloads; es                                   |
| synthesis     | done   | 2026-10-21T17:11:00Z | 2026-10-21T17:11:09Z | data-and-proof+swiss-grid-minimal                     |
| checkpoint    | done   | 2026-10-21T17:11:09Z | 2026-10-21T17:11:09Z | --auto                                                |
| design-system | done   | 2026-10-21T17:11:09Z | 2026-10-21T17:13:02Z | Manrope + Onest, primary #4a35d4                      |
| build         | done   | 2026-10-21T17:13:02Z | 2026-10-21T17:17:06Z | 10 sections, no photos                                |
| qa            | done   | 2026-10-21T17:17:06Z | 2026-10-21T17:19:00Z | passed on run 3 (2 fix rounds)                        |
| polish        | done   | 2026-10-21T17:19:00Z | 2026-10-21T17:20:00Z | detect clean, section shots reviewed, no edits needed |
| final-check   | done   | 2026-10-21T17:20:00Z | 2026-10-21T17:21:27Z | all checks passed                                     |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins). Every deviation from the chosen archetype sheets, with the requirement or reference that justifies it.

design-taste-frontend dealt "The product performs" (sector saas, `--keep palette,type`, tone quiet). Adopted: the idea (the product itself is the imagery: real-size, believable interface fragments with consistent numbers, one sample month everywhere), a short plain left-aligned headline, rectangular buttons, no device-photo collage. Disagreements, each settled in favour of PROPOSAL.md and MASTER.md:

- Section blueprints (command-list with search input, drag-through-stages slider, figure set by a slider, single giant price, question index with a sticky answer pane, three-tile CTA, one-line footer) replaced by the approved page map: 3-column "Qué hace", CSS-sticky steps, bar table plus stat strip, privacy table, Gratis/Premium comparison table, native `details` FAQ, ink closing band, column footer. Reason: the proposal's page map and the data-and-proof grammar (tables with text alternatives, no JS needed) win; no React islands planned.
- Direction asks for at least four real photographs and a "shutter image" hero motion: no photographs (PROPOSAL "few-assets", MASTER "no decorative photos"), so the floor is not met on purpose. Motion stays `data-reveal` only; no clip-path shutter.
- Direction says no thin rules; the MASTER style uses 1 px `line` rules instead of shadows (Swiss grid lend), kept. Direction says no violet; the primary is the fixed indigo-violet `#4a35d4`, kept.
- Direction hero (saturated stage with a cut corner, 620 px fragment bleeding off the edge): replaced by the approved split hero with a whole 288 px phone mockup drawn in code (MASTER: phone frame at most 12 px radius). A phone frame is used because the requirement is a mobile app; fragments are inside the phone, not a browser frame.
- Cream/neutral ground and rect store buttons agree with the direction; the cool off-white ground from MASTER stays.

Deviations from the archetype sheets (data-and-proof primary, swiss-grid-minimal lending `split-sticky`, `flush-left-axis`):

- Hero is a large code-drawn phone (illustration) instead of small framed screenshots; already in the proposal.
- Store buttons are 8 px rectangles with a two-line label (hint plus store name); text only, no store logos or badges.
- Header carries a second link row on phones instead of a menu button (4 short links, no script).
- Footer is a three-column list plus a note row, not a giant wordmark; the "Empresa y legal" items are plain placeholder text, not links, because no legal pages exist.
- BaseLayout (this site's copy only): skip link text changed to "Saltar al contenido" and `rounded-pill` replaced by `rounded-md`.
- Comparison "tick" cells use a text glyph with an `sr-only` "Incluido / No incluido" label instead of icons.
- `archetype-target` warning (`cols3Share` 0, data-and-proof expects 0.2 to 0.8): the page is built on 4/8 and 5/7 splits and one three-up row that stacks; three-column grids would have cramped the data tables. Deliberate.
- The bar column of the analysis table is hidden below 640 px (decorative, `aria-hidden`; the amounts and limits stay in the table) so no horizontal scroll is needed.
- The chart is the table itself (bars in a table column, `aria-hidden`), so the text alternative and the chart cannot drift apart; the budget limit is a vertical tick on each bar.

To confirm before launch (all placeholders): Premium price 4,99 EUR/month and the Free/Premium limits (1 vs up to 5 accounts, 2 vs unlimited goals, month comparison Premium only); the sample month "Marzo" (budgets, spending, objectives, 160,00 EUR monthly contribution); the read-only bank connection and the list of banks (FAQ says it appears in the app); two-step verification, export/delete from settings and every statement in "Privacidad y seguridad" (legal review); contact `hola@trazo.example`; store links (all point to `#descarga`); legal pages.

## Images

No photographs (few-assets, as planned): the app is drawn in code with HTML and CSS in token colors (`Phone.astro`, bars, table), so `assets.json` stays empty and the footer credits only the fonts (Manrope and Onest, SIL OFL 1.1).

## QA attempts

| #   | Verdict | Failures by check                            | Fixed                                                                                                                       | Notes                                                                                                   |
| --- | ------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | failed  | overflow 5, clipped-text 24                  | Tables had `min-w` inside grid children without `min-w-0`; sr-only "Incluido" labels were clipped inside the scroll wrapper | Replaced with `role="img"` + `aria-label` on ✓ / – glyphs, removed the scroll wrappers, added `min-w-0` |
| 2   | failed  | overflow 3 (tables 440 px and 380 px at 375) | Chart column hidden below `sm` (decorative, `aria-hidden`; values stay in the table), tighter cell padding on phones        |                                                                                                         |
| 3   | passed  | none                                         |                                                                                                                             | Lighthouse and impeccable green; section shots reviewed at 375/768/1440                                 |

## Final check

- `npx prettier --check .`: passed.
- `credits.mjs --check`: up to date.
- `check-landing`: PASSED (layout-diversity ok); one `archetype-target` warning, explained under Design decisions. Originality skipped (no `--refs`).
- `npm run check:sites`: 0 errors.
- `npm run qa -- --site app-finanzas`: PASSED, re-run after the last file change.

## Totals

Wall clock about 11 minutes (2026-10-21T17:10:16Z to 17:21:27Z). Token count not reported by the session. No remaining failures.
