# Proposal: postproduction-studio

Status: **proposed**. Waiting for approval at the checkpoint (run without `--auto`).

## Brief

- **Source:** the niche line only (no `brief.json`): every fact below is assumed and listed under Decisions.
- **Niche:** post-production studio (demo, no real customer): a small studio that edits, color-grades and finishes video for brands, musicians and creators. The page is carried by moving footage.
- **Brand (fictional or real):** fictional, **Gamma Room**, a small post-production studio (city assumed: Lisbon, working with clients remotely).
- **Goal of the page:** primary action **Book a project call**; secondary action **See the reel** (jumps to the work gallery).
- **Audience:** marketing leads at brands, music artists and their labels or managers, and independent creators who have shot footage and need it cut, graded and delivered.
- **Tone:** bold, cinematic, confident; short sentences, plain craft words, no hype.
- **Signals:** bold, premium, experimental, product-showcase, conversion-first, photo-rich
- **Language:** English (`--lang en`).
- **Site location:** `sites/postproduction-studio/`, deployed to the target in its `site.config.json` (Cloudflare Pages by default).

## References used

| Sheet                   | What we take                                                                                                                                                                                                                                                                                                                                                                                               | What we leave                                                                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `patterns/buzzy-now.md` | Full-bleed muted looping clip behind a centred statement with a strong scrim; a panel that starts in the first screen and overlaps the next band; feature rows pairing one short clip with one idea; a dark gallery of clips that load and play only in view; alternating dark and light bands; one bright accent used only for the main action; one italic serif phrase as the only typographic contrast. | The promotion strip with a countdown (dark pattern); the tool form in the hero panel; the long documentation section; the related-models carousel; many clips playing at once; third-party trackers; any of its footage, copy or code. |

**Direction in one line:** a dark screening room that shows its craft: footage fills the screen, the copy stays short, and one split-screen grade lets the visitor see what colour grading actually does.

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site postproduction-studio --refs buzzy-now` (signals of the Brief, the reference sheet, blends other sites already use). The archetype sheets in `design-archetypes/` are a starting grammar, not a template: any deviation goes in RUN.md "Design decisions".

- **Primary:** `cinematic-loop`
- **Secondary:** `bento-product-showcase`
- **Lent traits:** `bento-grid` (the recent-looks gallery as a mixed-size tile grid), `spec-chips` (each service lists its deliverables as small chips)
- **Why:** the picker ranked `bento-product-showcase + cinematic-loop` first (11.75) and the reverse blend second (11.25). The requirement argues for the second: the niche asks for a full-bleed looping hero, a clip per service and a clip gallery, which is the layout grammar of `cinematic-loop`, and only `cinematic-loop` allows `hero: video`. Bento then lends what a studio needs on top: a gallery grid of mixed tile sizes and deliverable chips. Signals: `bold`, `product-showcase` and `photo-rich` fit cinematic-loop; `premium`, `conversion-first` fit the bento secondary. The reference sheet maps onto `video-scrim-hero` and `clip-feature-rows`, both owned by the primary.
- **Twist from the requirement:** the page reads like a timeline. Each band carries a timecode (`00:00:12:00`-style, in tabular numerals of the body sans, not a mono font) as its marker, the hero's overlapping panel is an "edit list" of the four services with jump links, and the closing band is a "final frame". It comes from the ritual of the business: everything a studio delivers is placed on a timecode.
- **Impact:** the picker assumed `balanced` (no brief). The niche line says "bold, cinematic, confident", so the page aims at `bold`; `cinematic-loop` lists both levels. To confirm at the checkpoint.
- **Planned deviations:**
  1. No framed second clip in the hero panel: the overlapping panel is the edit list of services (text and chips), because a second clip in the first screen would play next to the hero clip (one clip per viewport) and the page needs its six-clip budget for the services and the gallery.
  2. The gallery mixes one clip with four still tiles (Pixabay photos) instead of a full clip masonry: the QA budget allows at most six `[data-video]` per page and the hero and the four services already use five.
  3. The colour-grading service row is not a row: it opens into its own full-bleed dark band (the signature moment) between the editing row and the motion and finishing rows.

## Signature moment

- **Section:** "Colour grading" band (section 5), dark, full-bleed.
- **What it shows:** one looping landscape clip with a vertical split: the left side shows the footage flat and washed, as it leaves a camera in a log profile ("Log"); the right side shows it graded ("Graded"). A handle on the split can be dragged or moved with the arrow keys, so the visitor wipes the grade across the frame.
- **Technique:** one `<VideoLoop />` (a single clip, so only one video plays); over it, as a child, a half-width layer with `backdrop-filter` (lower saturation and contrast, lifted blacks) clipped by `clip-path` to the left of the split; a native `<input type="range">` sets the split through a CSS custom property, with a small Astro-processed module script. The grade shown is an illustration of what grading changes, applied to a stock clip, and the caption says so.
- **Reduced motion and no JavaScript:** the clip does not play; the poster shows under the same split, fixed at 50% without JavaScript (the range input is hidden without JS), still showing "Log" and "Graded" side by side with their labels. With reduced motion the handle still works on the poster.
- **Brief facts used:** the service list of the niche (colour grading) and nothing else; no client names, no figures, no results.

## Page map

| #   | Section                      | Height  | Purpose                                                     | Layout idea                                                                                                                                                                                     |
| --- | ---------------------------- | ------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Header                       | 72 px   | Mark, three links (Services, Work, Process), primary action | Transparent over the hero clip, solid dark after the first screen (sticky); amber pill "Book a project call" on the right.                                                                      |
| 2   | Hero stage `00:00:00:00`     | 100svh  | Problem stage: what the studio does, the primary action     | Full-bleed looping clip (Pixabay, abstract light or night city, no people) under a strong scrim; centred two-line display statement with one italic serif phrase; amber pill and outlined pill. |
| 3   | Edit list panel (overlaps)   | ~0.4 vh | Map of the four services                                    | Wide rounded dark panel starting inside the first screen and overlapping the next band: four numbered rows (Editing, Colour grading, Motion, Finishing), each a jump link with its timecode.    |
| 4   | Last mile `00:00:12:00`      | ~0.8 vh | Agitate: why footage stalls before it is a film             | Light band, centred short statement and three plain lines (pacing, colour that does not match across cameras, deliverables for every platform).                                                 |
| 5   | Editing row                  | ~0.8 vh | Solution: service 1                                         | Light band; clip-feature row: rounded clip left, heading, two lines, spec chips (rough cut, picture lock, versions for each platform).                                                          |
| 6   | Colour grading (signature)   | 100svh  | Solution: service 2, the memorable moment                   | Dark full-bleed band; the Log / Graded split clip with the drag handle; short heading and chips (look development, shot matching, HDR and SDR masters).                                         |
| 7   | Motion and finishing rows    | ~1.5 vh | Solution: services 3 and 4                                  | Light band; two alternating clip-feature rows (clip right, then left) with chips (titles, lower thirds, motion graphics; sound handover, captions, mastering, delivery files).                  |
| 8   | Recent looks gallery `#work` | ~1.2 vh | "See the reel" target; show the range of looks              | Dark band; centred large word "Looks" with one italic phrase; bento grid of five tiles: one wide clip and four stills; each tile labelled by look, not by client.                               |
| 9   | Process `00:01:30:00`        | ~0.9 vh | Solution: how a project runs, lowers risk without proof     | Light band; four numbered steps in a row (Call, Plan and schedule, Cut and review rounds, Deliver), text only, timecode per step.                                                               |
| 10  | Final frame `#book`          | ~0.8 vh | Action: repeat the primary action                           | Dark band, centred statement, amber pill "Book a project call" (mailto with a subject line, sample address), outlined "See the reel", sample email as text.                                     |
| 11  | Footer                       | ~0.4 vh | Contact, credits                                            | Dark columns: studio, contact (marked sample), sections, clip and photo credits; "Videos and photos provided by Pixabay".                                                                       |

## Motion plan

| Moment                | Trigger           | Type                     | Notes                                                                                       |
| --------------------- | ----------------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| Clips (6)             | scroll into view  | play while 25% in view   | `<VideoLoop />` only; paused off-screen and in hidden tabs; pause button on each; no sound. |
| Text bands            | scroll            | `data-reveal` fade, once | Motion layer primitive; final state visible without JS and under reduced motion.            |
| Header                | scroll past hero  | solid background         | CSS and a tiny state toggle; links readable at all times.                                   |
| Grade split (playful) | drag / arrow keys | wipe the split           | Native range input; the one playful moment.                                                 |

Reduced motion: no pin, no scrub, no parallax, no smooth scroll; all content visible in its final state. Clips stay on their posters. Without JavaScript the page reads top to bottom with every section visible and every clip as its poster.

## Visual direction

- **Type:** one sans family for everything (a confident grotesk with tabular numerals for the timecodes), large display sizes on the stage and the final frame, plus one italic serif used only for a single phrase in some display lines. Sentence case. Values from ui-ux-pro-max.
- **Palette:** a near-black graphite for the dark bands, a warm bone white for the light bands, mid greys for secondary text, and one bright saturated warm accent (a tungsten amber, the warm side of a grade) used only for the primary action and the split handle. The footage supplies all other colour. Values from ui-ux-pro-max.
- **Hero type:** `video`.
- **Imagery:** footage first, every visual tagged with its source in the source order (no customer files, no AI per the niche's "video from Pixabay only", no imported Pexels photos):
  - Hero: Pixabay video (abstract light, film-like texture or a night landscape; no people), poster as the LCP image.
  - Editing row: Pixabay video (hands-free subject, for example a timeline-like motion of light or a city in time lapse).
  - Colour grading band: Pixabay video (a colourful landscape or street scene without identifiable people) for the split.
  - Motion row: Pixabay video (abstract motion graphics).
  - Finishing row: Pixabay video (a slow, high-contrast scene suited to mastering).
  - Gallery: one large Pixabay clip tile plus four Pixabay photo tiles (landscape, architecture, abstract light, a colourful street without identifiable people), each at most 1280 px, fine for tiles.
  - Clip count: six in total (hero, editing, grading, motion, finishing, gallery), exactly `video.maxPerPage` (6); no file is used twice.
  - Process and final frame: type only (sections 9 and 10 carry no image; together with the panel and the last-mile band that is 4 of 10 sections without a visual, so more than half carry one).
  - Fallback when Pixabay or `ffmpeg` is missing: Commons images and SVG art, noted in RUN.md. No clip or photo with people presented as the team or clients, no readable brands or logos.

## SEO

- **Primary keyword:** "video post-production studio" (assumed, chosen from the niche).
- **Service area:** none (remote work for brands, musicians and creators; the city is assumed and not claimed as a service area).
- **Schema type:** `ProfessionalService` (assumed), JSON-LD in `src/data/seo.ts` with name, description, URL when `site` is set, and `makesOffer` for the four services; sample contact data left out; no review or rating markup.
- **Title and description per page:** home title "Gamma Room: video post-production studio for brands and artists" trimmed to 30–60 characters, description 70–160 characters naming editing, colour grading, motion and finishing; one `h1` in the hero; keyword in title, `h1`, description and the first paragraph. Rules from `seo-audit`: on-page basics for a non-local business (title, description, headings, canonical, Open Graph image from the hero poster); local SEO rules do not apply. The 404 page is restyled and `noindex`.

## Copy plan

Chosen from `node scripts/pick-copy-framework.mjs --site postproduction-studio` (no brief: awareness `problem-aware` assumed, goal lead, no proof). Facts come from the niche line only; the writing help is the `copywriting` skill, the structure is the plan.

- **Framework:** PAS (score 5): a visitor who already has footage knows the problem (it is not finished yet); the page names it, sharpens it, then shows the four services and the process as the solution. PASTOR scored 4 but needs a Testimony stage we cannot fill.
- **Awareness:** `problem-aware` (assumed, to confirm at the checkpoint; `solution-aware` is also plausible for visitors looking for a studio).
- **Stage to section:**

| Section              | Stage    | What it says                                                                                  | Facts it uses                             |
| -------------------- | -------- | --------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Hero stage           | Problem  | Raw footage is not a film yet; the studio finishes it. Primary and secondary actions.         | niche: edits, grades, finishes; CTAs      |
| Edit list panel      | Problem  | The four things footage still needs, as a list to jump to.                                    | niche: editing, colour, motion, finishing |
| Last mile            | Agitate  | Where projects stall: pacing, mismatched colour between cameras, versions for every platform. | niche (craft facts, no figures)           |
| Editing row          | Solution | Shaping the story and pace; deliverable chips.                                                | niche: editing                            |
| Colour grading band  | Solution | One look across every shot; the split shows the difference.                                   | niche: colour grading, before/after       |
| Motion and finishing | Solution | Titles and graphics; mastering and delivery files.                                            | niche: motion, finishing                  |
| Recent looks gallery | Solution | The range of looks the studio works in (stock clips labelled as sample until the real reel).  | niche: gallery, reel                      |
| Process              | Solution | Four steps from call to delivery.                                                             | assumed process (no figures, no promises) |
| Final frame          | Solution | Book a project call; see the reel.                                                            | niche: CTAs                               |

- **Hero headline candidates (2 or 3):**
  1. "Raw footage in. _A finished film_ out." Useful 3, Urgent 1, Unique 3, Ultra-specific 2 = 9. **Chosen.**
  2. "Cut, graded and finished for _the big screen_ and every small one." Useful 3, Urgent 1, Unique 2, Ultra-specific 3 = 9 (longer; kept as the description line).
  3. "Your footage, _finished_." Useful 2, Urgent 1, Unique 2, Ultra-specific 1 = 6.
- **Proof inventory:** no proof available (no brief, no `proof` entries). The page shows no testimonials, client names, logos, figures, awards or years; the Process section and the grade split fill the trust role with process and a demonstration.

## Conversion plan

Written with the `conversion-psychology` skill on top of the Copy plan. Every element comes from the niche line; nothing is invented.

- **Emotional target:** excitement (secondary: trust). The niche is "bold, cinematic, confident" and the audience comes with footage they want to see at its best; trust comes from a plain process, not from claims.
- **Attention path:** focal point is the centred hero statement over the clip; the one primary call to action is the amber pill **"Book a project call"** (header, hero, final frame); the secondary **"See the reel"** is an outlined pill, visually weaker, linking to the gallery.
- **Choice:** four services listed side by side only as an index (the edit list), never as offers to compare: no prices (none given), no highlighted service, one call covers any mix. Anchor: none.
- **Trust and risk:** no proof available. Shown instead: the Process steps, the grade split as a demonstration, the contact block (sample email, marked sample). No legal pages (no market). No guarantee (none stated).
- **Ending:** the "Final frame" band repeats "Book a project call" with "See the reel" beside it.
- **Ethics check:**
  - [x] Every claim comes from the niche line; nothing invented (no brief, so the page carries sample markers where facts are missing).
  - [x] No urgency or scarcity; no deadline, no timer, no "few slots left".
  - [x] No fear or anger; the problem (unfinished footage) is named plainly.
  - [x] No decline flow to shame; the call is a plain mailto.
  - [x] No form, so no pre-checked boxes.
  - [x] No prices shown, none hidden behind a form.
  - [x] No option highlighted.
  - [x] No fake social proof: no testimonials, ratings, counters, client logos or awards.
  - [x] No stock person posing as the team or a client; gallery tiles are labelled sample looks from stock.
  - [x] The call to action says what happens: it opens an email to book a call.
  - [x] Not a vulnerable audience or regulated niche.
  - [x] Nothing depends on the visitor not noticing it; the before/after is labelled an illustration made with a filter on a stock clip.

## 3D

None. The footage carries the page; a scene would compete with the clips and the JavaScript budget.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |
| none  | n/a     | n/a    | n/a             | n/a                     |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings. Video: each clip within `video.maxKb` (4000 KB), at most `video.maxPerPage` (6) clips, posters for all, hero poster eager and high priority.

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages, lead forms (no brief, no access key), legal pages (no market), a map (no address), 3D, AI images or video, audio.

## Decisions

1. Assumed: no brief; business name "Gamma Room", city Lisbon, remote clients (confirm at the checkpoint). The page marks contact data as sample.
2. Assumed: contact email `hello@gammaroom.example` and the booking call as a `mailto:` with a subject line (no booking URL given); replace before launch.
3. Assumed: impact `bold` from the niche line (the picker assumed `balanced`); awareness `problem-aware` (picker default).
4. Assumed: primary keyword "video post-production studio" and schema type `ProfessionalService`.
5. Assumed: the four-step process and every deliverable chip are plausible studio practice written for this demo, not customer facts; they are listed in RUN.md "to confirm before launch".
6. The gallery uses stock clips and photos from Pixabay labelled "Sample looks, stock footage" until the studio supplies its own reel: stock footage is never presented as the studio's client work.
7. The before/after grade is an illustration made with a CSS filter over a stock clip and is captioned that way.
8. Video from Pixabay only (niche instruction): no AI images or video, no customer or owner footage; stills from Pixabay photos, Commons and SVG art only as a fallback. No person presented as the team or a client; footage without identifiable people is preferred.
9. Legal requirements unknown: there is no brief, so no market is named and no legal pages are added.
10. No map (no address), no lead form (no brief), no 3D.
11. The page uses stock footage, stock photos and sample data to replace before launch.
