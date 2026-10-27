# Design: add-landing-preview

## Context

- `new-landing.sh` already has a checkpoint after `PROPOSAL.md`, but it is text, and customers judge what they see.
- `pick-archetypes` ranks blends from the brief signals and excludes blends other sites use. ui-ux-pro-max owns palette and fonts.
- design-taste-frontend is expensive: run once per landing, in the build.
- Tailwind v4 compiles a utility such as `bg-primary` to `var(--color-primary)` and `font-display` to `var(--font-display)`. Redefining those variables on an element restyles everything inside it.
- Every site with a changed folder gets a Pages preview per branch from CI.

## Goals / Non-Goals

**Goals:**

- 2 or 3 visibly different directions, real pages at a shareable URL, for about $1 to $1.50 each.
- A recorded choice and comments that the full build must follow.
- No new deploy path, no backend, no change for existing sites.

**Non-Goals:**

- `revise_landing`.
- A choice form or a web app.
- Directions for a landing that is already built.
- A cost gate.

## Decisions

1. **Directions live inside the site, scoped by page.** Each direction has:
   - a page `src/pages/directions/<id>/index.astro` (`noindex`, BaseLayout);
   - a stylesheet `src/styles/directions/<id>.css` that redefines the token variables (`--color-*`, `--font-*`, radii) under `[data-direction="<id>"]` and imports its own `@fontsource` packages;
   - a root element on the page carrying `data-direction="<id>"`.

   Sections for directions live in `src/components/directions/<id>/`. The home page is a `noindex` index with one link per direction and its one-line idea.

   **Why:** one workspace, one build, one Pages project and one preview URL, so CI and QA run unchanged. The rejected alternative was a workspace per direction (`sites/<slug>-a`). It would mean lockfile churn, three Pages projects, and three entries in diversity checks and the CI matrix for throwaway pages.

2. **The directions phase of the skill (`--directions`).** It runs:
   1. Brief phase.
   2. The synthesis' signals and references only, with no page map.
   3. `pick-archetypes --site <slug> --top 8`. Choose `count` blends whose **primary archetypes all differ**; a `custom` blend counts as its own primary.
   4. Per direction, one subagent using ui-ux-pro-max only. It produces the palette and fonts as a MASTER-style block inside `DIRECTIONS.md` (not a `design-system/<slug>/MASTER.md`), the scoped stylesheet, then the hero and one section from the brief's real copy. It obeys the brief's brand constraints and the AI image rules, uses images through `find-images` and credits them, and adds no motion beyond reveals.
   5. `credits.mjs`.
   6. `npm run qa -- --site <slug>` until it passes or attempts run out.
   7. `directions.mjs check`.
   8. RUN.md with `Result: directions`, and the usage line in `DIRECTIONS.md`.

   No design-taste-frontend, impeccable polish or layout signature in this phase.

3. **`sites/<slug>/directions.json`:**

   ```json
   {
     "version": 1,
     "directions": [
       {
         "id": "a",
         "archetype": "<primary>[+<secondary>]",
         "traits": [],
         "primary": "#rrggbb",
         "displayFont": "...",
         "bodyFont": "...",
         "hero": "split",
         "idea": "one line"
       }
     ],
     "choice": null | { "direction": "b", "notes": "...", "date": "YYYY-MM-DD" }
   }
   ```

   Validated by a schema module in `scripts/lib/directions-schema.mjs`, used by the script, the MCP tool and the skill. Unknown keys fail. Notes are free text (at most 2000 characters) and are always the customer's words relayed, never invented.

4. **`scripts/directions.mjs`.**
   - **`check`** fails, naming each problem, when:
     - there are fewer than 2 or more than 3 directions;
     - a field is missing;
     - two directions share a primary archetype;
     - two share the trio of primary hue family, display font and hero type (the hue families used by `check-landing` diversity);
     - a page is missing from `dist/directions/<id>/index.html`;
     - a page lacks `noindex`.
   - **`choose`** refuses an unknown id, and a site already built past directions (no direction pages left).
   - Exit codes: 0, 1 (failed or refused), 2 (bad usage).

5. **Resume after the choice.** On `--resume` with `directions.json` present:
   - no choice: refuse, naming `node scripts/directions.mjs choose ...`;
   - with a choice: the synthesis takes the chosen blend as the "Archetype blend" (no new `pick-archetypes` choice);
   - the design system starts from the chosen palette and fonts (ui-ux-pro-max may refine; conflicts are listed in MASTER.md);
   - the notes become fixed inputs in the proposal's Decisions;
   - before the build it removes `src/pages/directions/`, `src/styles/directions/`, `src/components/directions/` and the unused fonts, and replaces the index page.

   `directions.json` and `DIRECTIONS.md` stay as the record. Assets of rejected directions that the build does not reuse are dropped from `assets.json`, and the credits are regenerated.

6. **Agent interface.**
   - `preview_landing` takes `{ slug, niche?, refs?, lang?, count?, model? }`. Its command is `new-landing.sh <slug> --directions --count N ...`, a fixed table entry validated like `propose`.
   - `choose_direction` takes `{ slug, direction, notes? }`, goes through the schema, and writes only `directions.json`.
   - `get_landing` adds `directions` (ids, ideas, preview paths) and `choice`.
   - Permissions: `choose_direction` allowed; `preview_landing` not allowed (a person approves long jobs).

## Risks / Trade-offs

- **Directions are lighter than the final page** (no taste-skill art direction, little motion). The final build refines the chosen one; the preview index says it is a draft direction.
- **Fonts per direction add weight to the index build.** Each page loads only its own fonts. QA judges each page's Lighthouse.
- **Brief data on a public preview URL.** Same exposure as today's site previews: they are `noindex` drafts, and the brief's facts are meant for the page anyway.
- **Cost estimate unproven.** The first real run measures it and `docs/status.md` records it.
