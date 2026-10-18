---
name: new-landing
description: 'Generate a complete, original landing in sites/<slug>/ from a niche and 0-3 pattern sheets: brief, proposal (PROPOSAL.md) with a review checkpoint, per-niche design system (MASTER.md and tokens), build with openly licensed Commons photos and credits, a QA loop until `npm run qa -- --site <slug>` passes, impeccable polish, final check and a run log (RUN.md). Use when the user runs /new-landing <slug> --niche "..." [--refs a,b] [--auto] [--dry-run] [--resume] [--max-attempts N] [--lang es], or asks to generate, build or create a whole landing page for a niche. Normally started by scripts/new-landing.sh. Not for editing an existing landing or for analyzing a reference (use analyze-reference).'
user-invocable: true
argument-hint: '<slug> --niche "..." [--refs a,b] [--auto] [--dry-run] [--resume] [--max-attempts N] [--lang es]'
---

# new-landing

One command, one landing. This skill is the orchestrator: it runs the phases below in order, delegates the design system, build and QA to subagents (one design skill each), and writes every phase result to disk so a run can resume. It never edits another site, the root starter, or the vendored skills under `.claude/skills/{ui-ux-pro-max,design-taste-frontend,impeccable}/`.

Read `CLAUDE.md` first (language, extract-patterns-don't-clone, licensing, quality budgets, QA loop). All files, comments and RUN.md entries are in English; the page copy is in `--lang` (default `es`).

## Arguments

`<slug>` (required, `^[a-z0-9]+(-[a-z0-9]+)*$`), `--niche "..."` (required), `--refs a,b` (slugs of `patterns/<slug>.md`, 0 to 3), `--auto` (do not stop at the checkpoint), `--dry-run` (stop after the design system), `--resume`, `--max-attempts N` (default 5), `--lang` (default `es`).

`scripts/new-landing.sh` has already run the preflight and `npm run new-site -- <slug>`, so `sites/<slug>/` exists with `PROPOSAL.md`, `RUN.md` and `assets.json` templates. If it does not (the skill was typed by hand), run `node scripts/preflight.mjs --slug <slug>` and `npm run new-site -- <slug> --lang <lang>` then `npm install --no-audit --no-fund`, and stop on any failure with its message.

Headless runs (`claude -p`) cannot ask questions: make a sensible choice, and write it in the proposal under Decisions as "Assumed: ... (confirm at the checkpoint)".

Run every subagent and every long command in the **foreground** (Agent tool with `run_in_background: false`, Bash without `run_in_background`) and wait for its result before the next step. In `claude -p` the run ends as soon as you end your turn, and background work left running is stopped; never end a turn to "wait for a report". The run is finished only when RUN.md has its final `Result:`.

## Run log and resume rules

`sites/<slug>/RUN.md` is the state. Before each phase set its row in the Phases table to `in-progress` with the start time, and at the end to `done` (or `failed`) with the finish time and a one-line note. Get timestamps with `date -u +%Y-%m-%dT%H:%M:%SZ`. The `Result:` line near the top is read by `scripts/new-landing.sh` for its exit code: `checkpoint`, `dry-run-done`, `passed` or `failed`.

With `--resume` (or when RUN.md already has finished phases), skip a phase only when its row is `done` AND its artifact exists:

| Phase         | Artifact that must exist                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| brief         | RUN.md Inputs table filled                                                                                    |
| synthesis     | `PROPOSAL.md` with no empty section and `Status:` no longer `draft`                                           |
| checkpoint    | passed when `--auto` or `--dry-run` is given, or the user re-ran with `--resume --auto`                       |
| design-system | `design-system/<slug>/MASTER.md` with a valid `landing-meta` block, and the site's `tokens.css` derived from it |
| build         | a real `src/pages/index.astro` (no `noindex`), `assets.json` with images, `node scripts/credits.mjs --site <slug> --check` passing |
| qa            | `qa/<slug>/latest/report.json` with verdict `passed`                                                          |
| polish        | row `done`                                                                                                    |
| final-check   | row `done`                                                                                                    |

A row left `in-progress` or an artifact that is missing means: redo that phase from its start, keeping the files that are already good. Never delete the user's edits to `PROPOSAL.md`: on resume, the proposal on disk is the approved plan.

## Phases

### 1. Brief

Fill the RUN.md Inputs table (niche, references, mode, max attempts, start time). Decide goal, audience, tone and language from the niche. Read each `--refs` sheet in `patterns/`. If no refs are given, read `patterns/README.md` and pick up to two generic sheets that fit the niche, or none.

### 2. Synthesis

Write `sites/<slug>/PROPOSAL.md` from the template already in the folder; keep its headings. `sites/panaderia/PROPOSAL.md` is the worked example.

- Brand: a fictional business name and city if the niche gives none. Contact data is placeholder and the proposal says so.
- References: a table of what is taken from each sheet and what is left, plus a "Direction in one line".
- Page map: 7 to 10 sections with height, purpose and layout idea. One conversion action named in the brief, repeated in header, a mid-page block and the closing section.
- Motion plan: only primitives in `sites/<slug>/src/components/motion/README.md` (reveal, pin, parallax, ...). At most one pinned section and one playful moment. State the reduced-motion and no-JS behavior.
- Visual direction: type and palette in words (the design system step fixes values), the hero type (one of `full-bleed-photo`, `split`, `typographic`, `video`, `illustration`, `collage`) and the imagery plan (photos from Commons only).
- Diversity: list the other sites' choices with `grep -A6 landing-meta design-system/*/MASTER.md` and pick a primary color family, display font and hero type that do not repeat any single site's trio; prefer differing in all three.
- Regulated niches (health, dental, legal, finance, supplements): the copy makes no promise of results, no diagnosis or treatment claims, no invented reviews, ratings, testimonials, awards, certifications or "years of experience" figures. Say in Decisions what the page does instead (services described plainly, "ask us" calls to action).
- Add to Decisions: the page uses stock photos and sample data to replace before launch.

Run `npx prettier --write sites/<slug>/PROPOSAL.md`, set `Status: **proposed**` in it, mark synthesis `done`.

### 3. Checkpoint

If neither `--auto` nor `--dry-run` was given: set `Result: checkpoint` in RUN.md, mark the checkpoint row `waiting`, print the path of `PROPOSAL.md`, and stop. Do not write any code. The user reviews and continues with `scripts/new-landing.sh <slug> --niche "..." --resume --auto`. Otherwise mark it `done` and continue.

### 4. Design system (subagent, ui-ux-pro-max only)

Spawn a subagent with this brief: the `Direction in one line` and the Visual direction section of the proposal, the niche, the language, the other sites' `landing-meta` to avoid, and the instruction to use only the `ui-ux-pro-max` skill (not design-taste-frontend, not impeccable). It must:

1. Query the skill with the direction, not just the niche: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<niche + direction keywords>" --design-system -p "<Brand>"`, then `--domain color`, `--domain typography`, `--domain style`. Record the queries.
2. Write `design-system/<slug>/MASTER.md` following `design-system/panaderia/MASTER.md`: queries run, conflicts between the skill and the proposal (the approved proposal wins; list each), chosen style, a Palette section whose table holds every color as `#RRGGBB` plus the WCAG contrast of each pair used (text >= 4.5, large text and non-text >= 3; do not compute ratios by hand: `node scripts/check-landing.mjs --site <slug>` checks the standard text pairs of `tokens.css` and names any pair under 4.5), typography (open-licensed families that exist as `@fontsource-variable/<name>`, or `@fontsource/<name>`; check with `npm view <package> version`), type scale, spacing and radii, motion tokens, do/don't for the build, and a final fenced block:

   ````
   ```landing-meta
   primary: #rrggbb
   display-font: Family
   body-font: Family
   hero: full-bleed-photo
   ```
   ````

3. Translate it into `sites/<slug>/src/styles/tokens.css` (same shape as `sites/panaderia/src/styles/tokens.css`: `@theme` colors, fonts, type scale, spacing, radii, motion) and the font imports in `src/styles/global.css`. Install the font packages with `npm install -w site-<slug> @fontsource-variable/<name>`. Add each font to the fonts table in `sites/<slug>/CREDITS.md` (source URL, author, SIL OFL 1.1).
4. Verify: `node scripts/check-landing.mjs --site <slug> --json` shows `tokens`, `contrast`, `landing-meta` and `diversity` ok (other checks may still fail before the build). Fix MASTER.md or tokens until they are.

Mark the phase `done`. With `--dry-run`: set `Result: dry-run-done`, write the Totals section and stop here.

### 5. Build (subagent, design-taste-frontend for art direction)

Spawn a subagent with: `PROPOSAL.md`, `MASTER.md` and `tokens.css` as fixed inputs, and this role split: design-taste-frontend gives art direction (composition, section rhythm, type usage, photo treatment); palette, fonts and the page map are not up for debate. It runs `node .claude/skills/design-taste-frontend/scripts/draw.mjs ... --keep palette,type` (see that skill), and wherever its rules disagree with the proposal or MASTER.md (for example it discourages a cream ground, pill buttons or photos under headlines), the proposal and MASTER.md win; each disagreement goes into RUN.md "Design decisions". Do not use the skill's `assets.mjs` (it ignores the proxy); photos come from our script.

**Images**
- Search and download only with `node scripts/find-images.mjs search "<query>" --min-width 1600 --orientation landscape` and `... get <slug> "<title>" --as <name>` (see `--help`). One process at a time: the Commons rate limit is shared, and the script throttles and backs off on its own. Note waits in RUN.md.
- One image need per section, product or step. Open every downloaded file with the Read tool and look at it before using it. Reject photos with readable signs, brands, watermarks or identifiable faces; pick another candidate instead of cropping files. Crop with CSS (`object-fit`, `object-position`, `aspect-ratio`).
- The photo must show what the text names: a product tile uses a photo of that product. Dietary or technical variants ("sin gluten") need their own matching photo or no photo.
- Each source photo is used at most twice on the page and never twice in one section; check what you reference with `node scripts/check-landing.mjs --site <slug>` while building.
- After every change to `assets.json` run `node scripts/credits.mjs --site <slug>`. The footer imports `src/data/credits.json` and shows author, license and a link per credited photo (see `sites/panaderia/src/components/sections/Footer.astro`).
- Representative stock is fine but never present it as the client's own work: no photo of a named real place or person unless the file is of that.

**Page**
- Replace the placeholder `src/pages/index.astro`: no `noindex`, a real title and description, `<Motion />` in the head slot, sections in `src/components/sections/` (`.astro` first; React islands only for real interaction with `client:*`).
- Motion through the existing `data-*` primitives; every effect has a reduced-motion state and the page is complete without JavaScript.
- Copy is original and in `--lang`. No text from the references. Sample contact data is marked as sample in the footer. Prices, hours and figures are plausible placeholders that RUN.md lists under "to confirm before launch". Regulated niches: obey the Synthesis rule above.
- Tokens only: no raw hex in components, no sizes outside the type scale.

Mark the phase `done` only when `node scripts/credits.mjs --site <slug> --check` and `npm run check -w site-<slug>` pass and the page builds.

### 6. QA loop (subagent)

`--max-attempts N` is the number of fix-and-rerun rounds after the first run, so QA runs at most N + 1 times (N = 0: one run, no fixes).

Each attempt: `npm run qa -- --site <slug>`. If it exits 2 with "Chromium not found", run `node scripts/preflight.mjs --chromium-path` and retry with `QA_CHROME_PATH=<that path>` in front. Read `qa/<slug>/latest/report.json` (`failures` first) and the failing `screens/*.png`. Exit 0 ends the loop. Otherwise fix the cause in `sites/<slug>/src/` using each failure's `selector`, `file` and `line`, in this order: overflow, clipped text, reduced motion, accessibility, SEO, performance, impeccable. Never lower a threshold in `qa.config.json`. Append a row to the RUN.md QA attempts table: number, verdict, failure counts by check, what was fixed.

If attempts run out: write the remaining failures (check, page, metric, message) under QA attempts, set `Result: failed`, mark qa `failed`, write Totals and stop. Do not polish a failing site.

After a pass, look at the result like a reviewer. Full-page screenshots show pinned sections as empty space and hide per-viewport problems, so run `node scripts/section-shots.mjs --site <slug>` (it serves `sites/<slug>/dist` itself and always stops its server) and open the images in `qa/<slug>/sections/` with the Read tool: one viewport per section (`section[id]`, header, footer) at 375, 768 and 1440 px. Check: repeated photos, photo-text mismatch, cramped, clipped or overlapping type, unreadable contrast over images, empty areas. Fix findings and re-run QA (counts as an attempt). Never leave a server running: do not start `astro preview` or `astro dev` by hand; if you must, run it as a background task and stop it with the task tool.

Known fixes from the pilot (`docs/pilot-panaderia-lessons.md`):
- Do: `aria-label` on a table instead of an `sr-only` caption (QA flags the caption as clipped text).
- Do: put `data-qa-allow-clip` only on a deliberately clipped marquee word, never to hide an overflow bug.
- Do: outlined giant type with `-webkit-text-stroke` on a variable font: fill with the page color and use a doubled stroke with `paint-order: stroke fill` to avoid overlapping contours.
- Do: wrap giant or wordmark type in `overflow-x: clip` and check 375, 768 and 1440 px.
- Don't: use one photo a third time to fill a gap; search another.
- Don't: trust a green QA as "done"; it does not see repeated or wrong photos.
- Don't: leave `astro preview` or other server processes running.

### 7. Polish (impeccable, once)

Mark polish `in-progress`. Run `npx impeccable@4.6.0 detect sites/<slug>/src` and the impeccable critique on the built page; apply only findings that clearly improve hierarchy, copy, spacing or accessibility, with small edits that keep tokens and the proposal intact. Re-run `npm run qa -- --site <slug>`; if the polish turned QA red, undo the edit that caused it. One polish round only.

### 8. Final check

Run, and fix until all pass:

1. `npx prettier --write sites/<slug> design-system/<slug>` then `npx prettier --check .`
2. `node scripts/credits.mjs --site <slug> --check`
3. `node scripts/check-landing.mjs --site <slug> --refs <the url: values from the used sheets' frontmatter>` (only if sheets were used; needs `sites/<slug>/dist/`, which the last QA run built). A `copy-match` failure means a sentence must be rewritten.
4. `npm run check:sites`
5. `npm run qa -- --site <slug>` once more if any file changed after the last QA pass.

Then fill RUN.md: Images (count, sources, anything dropped), Design decisions, Final check results, "to confirm before launch" (sample contact data, prices, hours, stock photos), Totals (wall clock from the phase times, approximate tokens if the session reports them). Set `Result: passed` and mark the last rows `done`.

Never commit, push or deploy: the person running this reviews the diff, commits and opens the PR, and CI deploys the preview.
