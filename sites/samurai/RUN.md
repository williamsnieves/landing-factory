# Run log: samurai

Result: passed

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field           | Value                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Niche           | Educational Spanish landing on the samurai: origins, armor, swords, way of life, end of the class (Meiji); 3D in code; museum public-domain photos |
| References      | crazy-studio, experience2026-funtech-inc (sources commons,met)                                                                                     |
| Mode            | --auto, lang es                                                                                                                                    |
| Max QA attempts | 5                                                                                                                                                  |
| Started         | 2026-10-21T10:55:18Z                                                                                                                               |

## Phases

| Phase         | Status | Started              | Finished             | Notes                                                                      |
| ------------- | ------ | -------------------- | -------------------- | -------------------------------------------------------------------------- |
| brief         | done   | 2026-10-21T10:55:18Z | 2026-10-21T10:56:00Z | goal, audience, tone decided                                               |
| synthesis     | done   | 2026-10-21T10:56:00Z | 2026-10-21T10:58:00Z | PROPOSAL.md proposed                                                       |
| checkpoint    | done   | 2026-10-21T10:58:00Z | 2026-10-21T10:58:00Z | --auto                                                                     |
| design-system | done   | 2026-10-21T10:58:00Z | 2026-10-21T10:59:32Z | Newsreader + Inter, vermilion on lacquer black, typographic hero           |
| build         | done   | 2026-10-21T10:59:40Z | 2026-10-21T11:19:30Z | 10 sections, 14 Met photos, 2 scenes (ink, blade), posters rendered        |
| qa            | done   | 2026-10-21T11:19:32Z | 2026-10-21T11:23:13Z | passed on the 4th run (3 fix rounds, all mobile performance)               |
| polish        | done   | 2026-10-21T11:23:13Z | 2026-10-21T11:25:09Z | impeccable detect: 0 findings, no edits needed; section-shots reviewed     |
| final-check   | done   | 2026-10-21T11:25:09Z | 2026-10-21T11:26:31Z | prettier, credits, check-landing (with refs), check:sites, final qa passed |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins).

- ui-ux-pro-max `--design-system` suggested a light playful style (Claymorphism, indigo and orange) and warned against dark modes; the proposal's dark lacquer ground with one vermilion accent won. Display font Newsreader (not Fraunces, used by panaderia).
- design-taste-frontend (`editorial-report`, `--keep palette,type`) discourages eyebrow labels, thin rules, numbered 01/02/03 labels and heavy grotesk headlines; the proposal asks for tracked eyebrows, chapter cards with a rule and chapter numerals, so those stayed (Roman numerals I to V, Newsreader light). Its "narrow text, wide headline with a photo at the bottom" hero was not used: the hero is type over the ink scene.
- Taken from the direction: a 42% text axis, a gutterless photo mosaic in chapter III, staggered step lines.
- The blade scene's rim light was weakened so the blade reads as steel.
- Performance fixes (QA rounds): inline the single stylesheet (`build.inlineStylesheets: 'always'` in `sites/samurai/astro.config.mjs`), hero `h1` and eyebrow no longer start hidden by `data-reveal` (the LCP text must paint without JavaScript), and a `preload` of the Newsreader latin font file.
- The skip link in the site's own `BaseLayout.astro` is in Spanish ("Saltar al contenido").
- The hero poster was rendered from a scene-only temporary page because `render-poster.mjs` screenshots whatever sits over the canvas (it captured the hero text). The temp page was deleted.

## Images

14 distinct photos, all The Met Open Access (public domain), each used once; nothing from Commons (the Met had better matches). Plus two self-rendered scene posters (`source: "self"`).

- Chapter I: Battle of Yashima screen (met:45182).
- Chapter II: Dō-maru (22505), Rokumai-dō gusoku (894743), kabuto (22097), sō-menpō (22459).
- Chapter III: tachi (22123), katana (22101), wakizashi (21880), tsuba (30056).
- Chapter IV: black raku bowl (62898), calligraphy scroll (78063), "Samurai, Yokohama" 1864-65 (285902).
- Chapter V: "Actor in Samurai Armor" 1870s (283170, captioned as an actor posing, not a warrior), infantry 1869 (764802).
- Dropped: the Noh mask (met:60220), a 524 px black-and-white scan.
- Captions repeat only the museum record's title, date and materials. A tiny catalog number on the kabuto stand and a small red one on the katana blade were judged not readable.

## QA attempts

| #   | Verdict | Failures by check                    | Fixed                                                | Notes                                                                     |
| --- | ------- | ------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | failed  | lighthouse 1 (mobile performance 84) | Inlined the stylesheet                               | LCP 3.6 s, FCP 3.0 s                                                      |
| 2   | failed  | lighthouse 1 (mobile performance 87) | Removed `data-reveal` from the hero eyebrow and `h1` | FCP fixed, LCP 3.8 s                                                      |
| 3   | failed  | lighthouse 1 (mobile performance 88) | Preloaded the Newsreader latin woff2                 | LCP was the giant `h1` waiting on the display font swap                   |
| 4   | passed  | 0                                    |                                                      | mobile 93, desktop 100, a11y/SEO 100, impeccable 0, 3D 137 KB gzip of 200 |
| 5   | passed  | 0                                    | Prettier only                                        | final run after formatting                                                |

An earlier layout-only pass during the build (`--skip lighthouse,impeccable`) was clean.

## Final check

- `npx prettier --check .`: passed.
- `node scripts/credits.mjs --site samurai --check`: up to date.
- `node scripts/check-landing.mjs --site samurai --refs https://crazy.studio/en,https://experience2026.funtech.inc/`: PASSED (images-credited, credits-in-sync, photo-uses, landing-meta, tokens, contrast, diversity, scenes, originality).
- `npm run check:sites`: 0 errors, 0 warnings, 0 hints.
- `npm run qa -- --site samurai`: passed. The impeccable detector scanned `.astro` files with regex rules only (element rules such as tiny text and low contrast did not run on source); the built page was covered by Lighthouse accessibility 100.
- Section screenshots (`qa/samurai/sections/`) reviewed at 375, 768 and 1440 px: no repeated photos, overlaps or clipped type in the ones opened (hero, chapters II, III, V); not every one of the 48 images was opened.

## To confirm before launch

- Atlas Bushi is a fictional guide with no contact data; the footer says so.
- Photos are museum stock, credited in the footer and the Fuentes list. The Fuentes list in `src/data/sources.ts` is hand-kept and must match `assets.json`.
- A historian should review the Spanish historical copy, especially: katana "a partir de la época Muromachi", daishō in the Edo period, the ninja/samurai myth row, ō-yoroi "asociada con los guerreros a caballo", and the "en menos de diez años" framing of the end of the class (1868 to 1876).
- The katana is a schematic drawn in code and captioned as such.
- The ink poster is a still of an unseeded loop, so the swap to the canvas shows a small shift.
- Contrast ratios in `design-system/samurai/MASTER.md` were computed by hand except the standard pairs the checker verifies.

## Totals

Wall clock about 31 minutes (10:55 to 11:26 UTC). Subagent tokens reported: design system about 85k, build about 303k; orchestrator tokens not reported. No remaining failures. Nothing was committed, pushed or deployed.
