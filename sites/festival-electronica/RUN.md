# Run log: festival-electronica

Result: passed

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field           | Value                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| Niche           | Three-day electronic music festival in a former factory in Bilbao (lang es)   |
| References      | experience2026-funtech-inc, crazy-studio (generic sheets chosen in synthesis) |
| Mode            | --auto, sources commons                                                       |
| Max QA attempts | 5                                                                             |
| Started         | 2026-10-21T16:46:11Z                                                          |

## Phases

| Phase         | Status | Started              | Finished             | Notes                                     |
| ------------- | ------ | -------------------- | -------------------- | ----------------------------------------- |
| brief         | done   | 2026-10-21T16:46:11Z | 2026-10-21T16:46:40Z | goal: sell tickets                        |
| synthesis     | done   | 2026-10-21T16:46:40Z | 2026-10-21T16:47:08Z | brutalist-raw+typographic-poster, 1 scene |
| checkpoint    | done   | 2026-10-21T16:47:08Z | 2026-10-21T16:47:08Z | --auto                                    |
| design-system | done   | 2026-10-21T16:47:10Z | 2026-10-21T16:48:41Z | lime #c8ff2e, Archivo + JetBrains Mono    |
| build         | done   | 2026-10-21T16:48:45Z | 2026-10-21T17:03:10Z | 10 sections, 1 scene, 2 photos + poster   |
| qa            | done   | 2026-10-21T17:03:10Z | 2026-10-21T17:05:00Z | passed on the first run                   |
| polish        | done   | 2026-10-21T17:05:00Z | 2026-10-21T17:05:20Z | detect: 0 findings; no edits needed       |
| final-check   | done   | 2026-10-21T17:05:20Z | 2026-10-21T17:09:48Z | layout-diversity fixed (text actions)     |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins). Every deviation from the chosen archetype sheets, with the requirement or reference that justifies it.

Build phase, design-taste-frontend (`draw.mjs --sector music --tone bold --keep palette,type`, direction `name-as-monument`; the other two dealt were `colour-chapters` and `pinned-poster`). Taken from the skill: the wordmark spanning the content width, anchored to the bottom of the first screen, supporting sentence and the single action on one row above it; a calm, small-type page after the hero; the line-up as one-item-per-line poster rows with a larger first line; the ticket section as full-width rows with the primary plan on a flat lime field; the close as a flat field with one giant action link. Disagreements, where the proposal / MASTER.md / archetype sheets win:

- The skill's "Always" rules say no monospace, no 01/02/03 and no thin rules; the proposal and MASTER.md fix JetBrains Mono labels, numbered "turnos" with giant numerals and visible grid lines (brutalist-raw `visible-grid`). Kept as in the proposal.
- The skill's hero is a full-bleed photograph under the name and its footer is a name-first wordmark; the proposal fixes a typographic hero (no photo) and a columns footer under a thick rule (no giant wordmark footer). Kept as in the proposal.
- The skill wants body text >= 16 px and type >= 13 px; MASTER.md fixes `--text-base` 15 px and a 12 px `--text-xs`. The build uses 15 px for body and 13 px (`--text-sm`) as the smallest size, never `--text-xs`.
- The skill's fallback photographs (picsum.photos "City at night") are not used: photos come from `find-images.mjs` (Commons) as the pipeline requires; `assets.mjs` is not used.
- The skill's pinned-title section ("about") and slow image crossfade motion are not used: the proposal allows no pinned section and one parallax only.
- The skill's centred-bar hover and "faded inactive items" are not used; hover and focus invert to lime with dark text (MASTER.md).

Deviations from the archetype sheets (brutalist-raw primary, typographic-poster secondary):

- Dark ground and lime accent instead of the sheet's paper default (planned in the proposal).
- brutalist-raw "almost no motion, never parallax": the proposal plans one parallax (stage photo), one CSS marquee and one scrubbed scene; all are static under reduced motion. brutalist-raw `rejects: scene-backdrop` is overridden by the proposal's single `field` scene (poster first).
- typographic-poster "flat color fields alternating between sections": only two lime fields (marquee band, closing); the ticket plan row is a third, smaller one. Other sections stay on the dark ground separated by 4 px ink rules, since there is one accent.
- Hero wordmark and the giant closing link are sized as `calc(var(--text-4xl) * 1.1)` (`1.15` from 768 px) so they span the content width; `--text-4xl` alone (20vw) leaves the name at about 80% of the width. The multiplier uses the token, no raw size.
- `.display` adds `word-spacing: 0.14em`: Archivo at 62% width with negative tracking otherwise closes the gap between words.
- The scene section keeps its chapters as hard-edged plates (paper fill, 2 px ink border) over the canvas at 1024 px and up, instead of bare text over the scene as in the crazy-studio sheet, so contrast never depends on the points behind them. Below 1024 px the chapters are a bordered list under the scene (three overlays do not fit a 16:9 frame at tablet width).
- The 3D scene uses CSS-only chapters (no sticky or pinned layer); the scene `scrub` is the only scroll-linked effect besides the parallax.
- Artist names are links to their timetable (`#horarios-0N`), so the hover/focus shift is on a real interactive element.
- The `tr`s of the stage table become blocks below 1024 px (labels from `data-label`); the table keeps its `aria-label` and header cells on wide screens.

## Images

Count, sources and any photo dropped, with the reason.

3 Commons photos plus 1 self-rendered poster, all recorded in `assets.json`; credits in `CREDITS.md` and `src/data/credits.json`. Each photo is used once. The Commons API rate limit (HTTP 429) cost a few waits of 25 to 78 s.

| File               | Source                                                               | License      | Used in                                       |
| ------------------ | -------------------------------------------------------------------- | ------------ | --------------------------------------------- |
| `turbine-hall.jpg` | Commons, Lauri Veerde, industrial turbine hall (wide panorama)       | CC BY-SA 4.0 | Escenarios (parallax strip, grayscale + lime) |
| `bilbao-metro.jpg` | Commons, Fred Romero, Casco Viejo metro station, Bilbao              | CC BY 2.0    | Cómo llegar                                   |
| `field-poster.jpg` | Rendered from `src/scenes/field.ts` with `scripts/render-poster.mjs` | original     | La nave (poster of the 3D scene)              |

Dropped: `factory-hall.jpg` (Commons, "UP factory in Třebíč", CC BY 3.0): a hazy, low-contrast shot with a window reflection over the whole frame; it read as a bad photo even in grayscale, so it was removed from `assets.json` and from disk. Both photos are captioned as representative images, not the festival's venue. Both are treated with CSS only (grayscale, contrast, lime multiply overlay). The turbine panorama is an equirectangular wide shot (barrel distortion is visible, a far-away worker in a high-visibility vest is not identifiable); the metro photo has a tiny unreadable destination display.

To confirm before launch (sample data in the build): festival name, dates (12 to 14 June 2027), address, contact e-mail and phone, all artists (invented), stage names and capacities, timetable, ticket names and prices, ticket URL (`https://example.com/entradas`), transport details, house rules and bag size, stock photos.

## QA attempts

| #   | Verdict | Failures by check | Fixed | Notes                                                                            |
| --- | ------- | ----------------- | ----- | -------------------------------------------------------------------------------- |
| 1   | passed  | none              | -     | Lighthouse 98 / 100 / 100 (mobile worst); impeccable 0 findings; scene checks ok |
| 2   | passed  | none              | -     | Re-run after the button and skip-link change from the final check; same scores   |

Section screenshots at 375, 768 and 1440 px were reviewed (hero, scene, stages, tickets): no clipped type, no repeated photos.

## Final check

- `check-landing` (with both reference URLs): passed, including `layout-diversity`. The first measurement was 0.17 against `sites/samurai` (needs 0.2): shared rectangular buttons, no radii, same full-bleed share. Fix: actions became bold mono text links with a thick underline instead of outlined or filled boxes (brutalist-raw prefers text links), and the off-screen skip link is plain text until focused. Layout signature re-measured.
- `credits --check`: up to date. Prettier: clean. `check:sites`: 0 errors, 0 warnings in every site.
- Deviation added: the archetype's text-link buttons replaced the proposal's "rectangular button"; the ticket action stays obvious through size, lime colour and the thick underline.

## Totals

Wall clock about 24 minutes (16:46 to 17:10 UTC). Subagents used about 290k tokens (design system and build). No remaining failures.
