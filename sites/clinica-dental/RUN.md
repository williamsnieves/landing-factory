# Run log: clinica-dental

Result: passed

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field           | Value                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Niche           | Clínica dental de barrio en Valencia: odontología general, higiene, ortodoncia invisible e implantes; tono cercano y tranquilizador; objetivo: pedir cita |
| References      | none (no generic sheet fits a dental clinic)                                                                                                              |
| Mode            | --auto, lang es                                                                                                                                           |
| Max QA attempts | 5                                                                                                                                                         |
| Started         | 2026-10-18T17:24:30Z                                                                                                                                      |

## Phases

| Phase         | Status | Started              | Finished             | Notes                                                                       |
| ------------- | ------ | -------------------- | -------------------- | --------------------------------------------------------------------------- |
| brief         | done   | 2026-10-18T17:24:30Z | 2026-10-18T17:24:40Z | goal: book an appointment                                                   |
| synthesis     | done   | 2026-10-18T17:24:40Z | 2026-10-18T17:27:00Z | PROPOSAL.md proposed, no refs                                               |
| checkpoint    | done   | 2026-10-18T17:27:00Z | 2026-10-18T17:27:00Z | --auto                                                                      |
| design-system | done   | 2026-10-18T17:27:00Z | 2026-10-18T17:30:00Z | Figtree + Noto Sans, teal, check-landing ok (contrast ratios hand-computed) |
| build         | done   | 2026-10-18T17:30:00Z | 2026-10-18T18:25:00Z | 10 sections, 7 distinct photos (Commons rate limits)                        |
| qa            | done   | 2026-10-18T18:25:00Z | 2026-10-18T18:27:00Z | passed on first run; section shots reviewed                                 |
| polish        | done   | 2026-10-18T18:27:00Z | 2026-10-18T18:28:00Z | impeccable detect: 0 findings (regex engine only); no edits                 |
| final-check   | done   | 2026-10-18T18:28:00Z | 2026-10-18T18:31:00Z | all checks pass                                                             |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins).

- ui-ux-pro-max vs proposal: the skill suggested sky blue + yellow, Soft UI shadows, Swiss 0px radii, children-style fonts and a testimonial pattern. The proposal won: teal, coral, flat panels, soft radii, Figtree + Noto Sans, no testimonials. Details in `design-system/clinica-dental/MASTER.md` section 2.
- design-taste-frontend (`split-stage`, art direction only) vs proposal: its hero, no-accordion FAQ, contact form bar, price menu, founder letter, zigzag itinerary, drag gallery, photo-half footer and scaling wordmark were replaced by the proposal's split hero, native `<details>`, tel/mailto links, plain cards without prices, pinned steps, parallax strip and ink footer. Kept: the fixed-photo-beside-scrolling-column idea for the first visit.
- Added `data-pin-steps` logic to this site's own motion `index.ts` (copied from panaderia).

## Images

7 distinct photos from Wikimedia Commons (rate limits made downloads very slow), each used at most twice and never twice in one section: hero plant window (CC0, Amanda Mocci), dental explorer (CC BY-SA 4.0), toothbrushes (public domain), aligners (CC BY-SA 4.0), implant bridge model (CC BY-SA 3.0), waiting room (CC0), orange blossom (CC BY 3.0).

Dropped: a waiting room with readable signs and a TV; two toothbrush photos with visible brands.

Caveats: brand text on the toothbrush handle and on the instrument is hidden by CSS crop only. The aligners photo is weak (yellowish, small brand text on a tray, zoomed crop) and should be replaced. The waiting room is not bright and has small framed pictures and a fire alarm at the edges. There is no Valencia street photo (the orange blossom stands in). The hero and the clinic strip share the plant photo; the first visit and the clinic strip share the waiting room.

## QA attempts

| #   | Verdict | Failures by check | Fixed | Notes                                   |
| --- | ------- | ----------------- | ----- | --------------------------------------- |
| 1   | passed  | none              | n/a   | full run: Lighthouse 100s, impeccable 0 |

## Final check

- `npx prettier --check .`: pass
- `credits.mjs --check`: up to date
- `check-landing`: passed (originality skipped, no refs)
- `npm run check:sites`: 0 errors, 0 warnings
- `npm run qa -- --site clinica-dental`: passed; Lighthouse 100/100/100 (best-practices 100) on mobile and desktop; no overflow at 375/768/1440; reduced motion ok; impeccable 0 findings
- Not verified: WCAG contrast ratios in MASTER.md were hand-computed (sandbox blocked scripts); the pinned section and breathing circle were not checked in a real browser with JS on.

### To confirm before launch

- Sample data: address "Carrer de Mostra, 12", phone +34 960 00 00 00, email hola@dentalazahar.example, hours (Mon-Thu 9-14 and 16-20, Fri 9-14, weekend closed), map link, mailto subject/body.
- Footer legal placeholders (privacy, legal notice) not added; only sample-data and stock-photo notes.
- All photos are stock; replace with the clinic's own, and replace the aligners photo first.
- Business name "Dental Azahar" is fictional.

## Totals

Wall clock about 1h 7min (17:24 to about 18:31 UTC; the build phase took about 55 min, mostly Commons throttling). Subagent tokens: design about 81k, build about 240k. QA: 1 run, no fix rounds, no remaining failures.
