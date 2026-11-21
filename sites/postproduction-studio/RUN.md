# Run log: postproduction-studio

Result: passed

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field           | Value                                                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Niche           | post-production studio (demo, no real customer): edits, color-grades and finishes video for brands, musicians and creators; page carried by moving footage; CTA book a project call, secondary see the reel; bold, cinematic, confident; video from Pixabay only |
| Brief           | none (niche only, every decision assumed)                                                                                                                                                                                                                        |
| References      | buzzy-now (`patterns/buzzy-now.md`)                                                                                                                                                                                                                              |
| Mode            | auto (resumed 2026-11-21T10:56:12Z with `--resume --auto` after the checkpoint), sources pixabay,commons, lang en                                                                                                                                                |
| Max QA attempts | 5                                                                                                                                                                                                                                                                |
| Started         | 2026-11-21T10:31:40Z                                                                                                                                                                                                                                             |

## Phases

| Phase         | Status | Started              | Finished             | Notes                                                                                                                  |
| ------------- | ------ | -------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| brief         | done   | 2026-11-21T10:31:56Z | 2026-11-21T10:33:00Z | No brief: niche only, all decisions assumed; ref buzzy-now read                                                        |
| synthesis     | done   | 2026-11-21T10:33:00Z | 2026-11-21T10:34:57Z | PROPOSAL.md proposed: cinematic-loop+bento-product-showcase (bento-grid, spec-chips), PAS, excitement                  |
| checkpoint    | done   | 2026-11-21T10:34:57Z | 2026-11-21T10:56:12Z | Resumed with `--resume --auto`: the proposal on disk is the approved plan                                              |
| design-system | done   | 2026-11-21T10:56:12Z | 2026-11-21T11:00:30Z | MASTER.md: graphite #121314 / bone #efe9dd, amber primary #f7ad18, Inter + Playfair Display italic                     |
| build         | done   | 2026-11-21T11:00:59Z | 2026-11-21T11:13:37Z | 10 sections, 6 clips, 4 stills; credits --check, astro check and build pass                                            |
| qa            | done   | 2026-11-21T11:13:37Z | 2026-11-21T11:16:30Z | Passed on the first run; reviewer pass fixed the header overlap and empty service rows; conversion review: no findings |
| polish        | done   | 2026-11-21T11:16:30Z | 2026-11-21T11:17:00Z | impeccable detect: no edit applied (see Design decisions)                                                              |
| final-check   | done   | 2026-11-21T11:17:00Z | 2026-11-21T11:26:37Z | Layers pruned, lint, Prettier, credits, check-landing (after two layout-diversity rounds), static report, check:sites  |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins). Every deviation from the chosen archetype sheets, with the requirement or reference that justifies it.

**Copy.** Framework PAS (from `pick-copy-framework`), awareness `problem-aware` (assumed, no brief). Hero headline as planned: "Raw footage in. _A finished film_ out." No proof shown (none available): no testimonials, client names, logos, figures or awards. The four-step process and the deliverable chips are plausible demo practice, not customer facts.

Signature moment: built as planned (the Log / Graded split over one looping clip in the colour grading band, a native range input moves it; without JavaScript the split stays at 50% and the input is hidden; under reduced motion the handle still works on the poster). Change after review: the clip frame is now nearly edge to edge (see layout below).

**Design system (ui-ux-pro-max).** `paper`/`ink` are the dark band (the check needs `primary` on `paper` at 4.5:1, and amber on bone white is 1.6:1); light bands use the `bone-*` tokens. The amber pill appears on dark bands only; the focus ring on light bands is `bone-ink`. Conflicts resolved in MASTER.md: the skill's near-white CTA and pink, red or purple accents gave way to the single amber; pure black became graphite; Archivo and Space Grotesk (other sites' display fonts) became Inter; mono fonts dropped (timecodes use tabular numerals); Playfair Display limited to one italic phrase; parallax, page transitions, grain and sepia rejected.

**design-taste-frontend vs the proposal (proposal and MASTER.md won).** Direction drawn: `dense-tiles` (`draw.mjs --sector studio-portfolio --tone bold --have video --keep palette,type`), used for the gallery tiles, the tone steps of the edit list and the bold run-in phrases of the last-mile band.

1. It wants the whole page as a tile board with no bands: the cinematic-loop band grammar was kept.
2. Its two-by-two board hero was replaced by the full-bleed video stage.
3. Its block-wordmark footer was dropped (a giant wordmark footer is ruled out).
4. It forbids a styled accent word: the Playfair italic phrase is kept in the hero, the gallery heading and the final frame (the proposal's one typographic contrast).
5. It allows one centred moment: the hero, gallery heading and final frame are centred (cinematic-loop's centred statements).
6. It bans index numbering: the edit list and the process use timecodes in an `<ol>` instead of 01/02/03.
7. It bans thin rules: the amber split divider is a control, not decoration; the footer's credit rule is a token line.
8. Its "shutter image" move and its motion count (8+ moving elements) were dropped: the archetype allows clips and one fade per band (`data-reveal`).
9. Its `assets.mjs`, picsum photos and its own inspect/lint gate were not used.

**Archetype and plan deviations.**

- Timecodes are burned into the clips as chips (hero, service rows, grading, gallery), like dailies; the final frame's timecode sits under the actions as an end slate; the process band has no band-level timecode (step one carries 00:01:30:00).
- Hero h1 is `text-2xl` on phones, `text-3xl` from 640 px and MASTER.md's `text-4xl` from 1024 px, so the headline stays on two lines at every width.
- Service rows (editing, motion, finishing) are stacked, not side by side: heading and text over a wide clip strip. The first build placed a clip beside the text and padded each row to keep one clip per viewport, which left large empty bone areas; the stacked rows fill that distance with the next row's text. The heading alternates sides from row to row.
- Service and grading clips are nearly edge to edge (8 px gutter on phones, 24 px from 768 px) with the sheet's rounded corners (a framed screen), and the gallery's wide clip spans the full row above the four stills. Reasons: the cinematic-loop grammar (full-bleed footage) and the layout-diversity rule (see Final check). The proposal's framed second clip in the hero panel stays out (planned deviation 1).
- Final frame: a still of the opening shot (the hero clip's poster, `loading="lazy"`) under an 80% scrim behind the closing statement, so the page ends on its first frame. It is a still, not a seventh clip; the hero entry is referenced twice (clip and this still), within the limit of two.
- Gallery: 5 tiles (one wide clip, four stills), not a full clip masonry (planned deviation 2); on phones two stills come first so the clip sits further from the finishing clip.
- Process steps sit on one bone-surface tone (a dark-to-light ramp was dropped: bone-ink-soft on bone-line is about 4.1:1).
- Header: solid by default (works without JavaScript); a small script makes it transparent while the stage is under it and turns it solid 160 px before the stage's bottom edge, so the hero's timecode chip and pause button never show through it.
- Footer: studio, contact (marked sample) and section links in one row, credits as a four-column list in a second row under a rule; credits come from `src/data/credits.json` (author, license, link) with the "Photos and videos provided by Pixabay" line.
- `archetype-target` warning (kept as a deviation): `cols2Share` 0 (cinematic-loop expects 0.1 to 0.6). The page has no two-column section by design: the service rows are stacked strips and the grading band leads with its clip, which is what moved the layout away from the other sites.

**Polish (impeccable 4.6.0, once).** `detect` on `src/` found nothing; on `dist/index.html` it flagged `italic-serif-display` three times (the planned single italic phrase inside sans headlines, the proposal's one contrast device; kept) and `cramped-padding` ten times on the bands, the edit-list panel and the process cards (false positives from a scan without the stylesheet; the screenshots show 24 to 128 px insets). No polish edit was applied.

## Images

Count, sources and any photo dropped, with the reason.

Ten files, all from Pixabay (`PIXABAY_API_KEY` present, `pixabay.com` reachable; no Commons fallback needed). `ffmpeg` present; every clip was encoded by `find-images.mjs` (H.264, no audio, 1280 px, at most 20 s, faststart, WebP poster). No customer files (no brief), no AI images or video (the niche says video from Pixabay only), no imported Pexels photos.

**Clips (6 of `video.maxPerPage` 6):**

| File                       | Pixabay id | Author           | Duration | Size    | Where and why                                                                                        |
| -------------------------- | ---------- | ---------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `hero-mountain-dusk.mp4`   | 22555      | adege            | 16.7 s   | 799 KB  | Hero: blue-hour mountain timelapse, dark sky behind the statement, no people or signs                |
| `edit-city-bokeh.mp4`      | 130331     | blackmarketmusic | 20 s     | 1383 KB | Editing row: out-of-focus city lights, rhythm without any readable sign                              |
| `grade-cliffs-sunrise.mp4` | 230779     | Radds            | 20 s     | 1291 KB | Colour grading split (signature): warm sunrise cliffs over teal water, strong colour to wipe a grade |
| `motion-lines.mp4`         | 9812       | ArtSqb           | 10 s     | 578 KB  | Motion row: animated geometric lines, motion graphics with no text                                   |
| `finish-dark-water.mp4`    | 304019     | Mario_Krimer     | 16.5 s   | 2131 KB | Finishing row: slow, high-contrast dark water surface                                                |
| `look-coast-sunset.mp4`    | 210552     | D-GM             | 20 s     | 1437 KB | Gallery wide tile: aerial sea sunset, a saturated warm look                                          |

The hero clip's poster is also the lazy still behind the final frame (two references to one entry).

**Stills (gallery tiles, 1280 px, labelled as sample looks from stock):** `look-forest-fog.jpg` (8355748, mila-del-monte), `look-dunes.jpg` (4899497, pinzino; footprints only, no person), `look-concrete-stairs.jpg` (6517488, BeJan), `look-neon-bokeh.jpg` (2171555, huynhphu9191). No photo shows a person, so none needs the "Illustrative photo" caption; none shows a brand or logo.

**Dropped:** `hero-city-night` (Pixabay video 324817, night city timelapse): the poster showed a logo on a tower and readable billboards, which the Pixabay license rules exclude; files and manifest entry removed before the build.

AI images: none (the niche asks for Pixabay video only; no AI image was needed).

## QA attempts

| #   | Verdict | Failures by check | Fixed                                                                                                                       | Notes                                                                       |
| --- | ------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | passed  | none              | Reviewer pass on section shots: header turned solid too late (hero chip and pause button under it); empty bone service rows | Lighthouse, video, reduced-motion, overflow and impeccable all passed       |
| 2   | passed  | none              | Header switch moved; service rows stacked (text over a wide clip)                                                           | Section shots checked at 375, 768 and 1440 px                               |
| 3   | passed  | none              | (after `site-layers prune` and Prettier)                                                                                    | Re-run required by the final check                                          |
| 4   | passed  | none              | Service and grading clips nearly edge to edge                                                                               | layout-diversity round 1                                                    |
| 5   | passed  | none              | Footer columns, rounded clip frames                                                                                         | layout-diversity round 2                                                    |
| 6   | passed  | none              | Gallery wide clip on its own row, final-frame still, hero h1 at `text-4xl` from 1024 px                                     | Last QA run; the 404 page was checked by hand (375 px readable, links good) |

## Conversion review

`node scripts/conversion-audit.mjs --site postproduction-studio`: 0 warnings, 1 info.

- `legal-linked` (info, `/` footer): no legal page was built. Not applied: the run has no brief and no market, so the legal requirements are unknown (left for a person).

Changed: nothing (no warning to act on; confirmed on the section screenshots: one primary action, "Book a project call", in the header, hero and final frame; "See the reel" as the weaker outlined action; contact visible in the final frame and the footer). Every conversion plan item was honoured; the only gaps are the plan's own: no proof available and no legal pages.

## Final check

- `site-layers prune`: removed the 3D layer (`three`, `@types/three`), legal, forms and maps components; video kept. `npm install`, then `npm run lint`: ESLint, knip and the layer check pass.
- `npx prettier --check .`: pass. `credits.mjs --check`: up to date. `npm run check:sites`: 0 errors in every site.
- `check-landing --refs https://www.buzzy.now/es/models/kling-4-0`: **passed** (images-credited, credits-in-sync, photo-uses, landing-meta, tokens, contrast, diversity, layout-diversity, scenes, copy-claims, dark-patterns, visual-assets, video-assets, originality). Warning: `archetype-target` cols2Share 0 (see Design decisions). Two layout-diversity rounds were needed: first too close to clinica-dental, fisioterapia-ribera, panaderia and turnio (full-bleed share 0.1, pill buttons, minimal footer), then to turnio alone (0.09), then to clinica-dental (0.19). Fixed in the composition (full-bleed clips, footer columns, rounded framed clips, a full-row gallery clip, a full-bleed final frame, a larger hero heading), keeping the sheet's pill buttons. Final signature: full-bleed share 0.7, footer `columns`.
- `npm run report -- --site postproduction-studio --only static --skip audit`: **passed**, 0 fail, 8 warn. SEO: no `seo-*` failure; four warns need `site` in `astro.config.mjs` (absolute canonical, `og:url`, absolute sitemap, the `Sitemap:` line of robots.txt), which the owner sets with the domain. Performance warns: the VideoLoop poster `<picture>` emits PNG fallbacks of the WebP posters (up to 530 KB; browsers load the WebP/AVIF sources first), and the 404 page weight note. Legal: "requirements unknown" (no brief, no market).
- No `legal.mjs` run (no market), no map, no forms, no 3D.

### To confirm before launch

- A person must read the whole copy before publishing.
- `copy-claims`: no warnings.
- Everything about the business is sample or assumed: the name "Gamma Room", Lisbon (in the hero lead and footer), `hello@gammaroom.example` (the booking `mailto:` and the contact text, marked sample on the page), the four process steps and every deliverable chip, the primary keyword "video post-production studio" and the `ProfessionalService` schema type.
- The gallery shows stock footage and photos labelled "Sample looks, stock footage": replace with the studio's own reel; stock is never client work.
- The before/after grade is a CSS filter over a stock clip, captioned that way; a real before/after needs the studio's own log footage.
- Stock clips and photos: check by eye that none shows a recognisable brand or logo (checked on every poster and still during the build).
- Set `site` in `astro.config.mjs` to the final domain (canonical, `og:url`, sitemap, robots).
- Legal requirements unknown: no brief names a market, so there is no legal notice or privacy policy.
- Impact `bold` and awareness `problem-aware` were assumed.

### To fetch by the owner

Nothing (no brief, no links behind a login).

## Totals

Wall clock: about 55 minutes (2026-11-21T10:31:40Z to 11:26:37Z), of which the first run stopped at the checkpoint after about 3.5 minutes and the resumed run took about 30 minutes (10:56:12Z to 11:26:37Z). Subagents in the resumed run: design system about 149k tokens, build about 243k tokens. No remaining failures.

First run (to the checkpoint) usage: input 30 tokens, output 20,371, cache write 141,653, cache read 2,050,551, cost $1.9509 USD, 27 turns (reported by Claude Code).

Usage: input 170 tokens, output 58,724, cache write 274,173, cache read 18,081,745, cost $12.6957 USD, 170 turns (reported by Claude Code).
