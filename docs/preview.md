# Visual directions before the build

A full landing costs about $5 and 30 to 70 minutes. If the customer does not like the result, all of it is thrown away. A directions run shows 2 or 3 short visual directions first, as real pages, and the full build starts from the one the customer picks. Each direction costs a fraction of a build; the real figure per direction is measured by the first real run (estimate: $1 to $1.50).

## The flow

1. **Brief.** A valid `sites/<slug>/brief.json` (or a niche), as for any run.
2. **Directions run.** `scripts/new-landing.sh <slug> --brief sites/<slug>/brief.json --directions [--count 2|3]` (default 3), or the `preview_landing` MCP job (a person approves it). It runs the brief, the signals, 2 or 3 directions, QA and `node scripts/directions.mjs check`, and stops with `Result: directions`. The full build does not run.
3. **Preview.** Push the branch and open the pull request as for any site. CI deploys the site's Pages preview, and the customer gets `https://<branch-alias>.<project>.pages.dev/directions/<id>/` for `a`, `b` and `c`, and the index at `/` linking them. The pages are `noindex` drafts.
4. **Choice.** A person relays the customer's choice and comments:

   ```bash
   node scripts/directions.mjs choose --site <slug> --direction b --notes "warmer photos, keep the price table"
   ```

   or the `choose_direction` MCP tool. Notes are the customer's words, at most 2000 characters, never invented. `node scripts/directions.mjs show --site <slug>` prints the record.

5. **Full build.** `scripts/new-landing.sh <slug> --brief sites/<slug>/brief.json --resume --auto`. A site with `directions.json` and no choice is refused (exit 1, naming `directions.mjs choose`). With a choice, the proposal's "Archetype blend" and the design system start from the chosen direction, the notes are fixed inputs, and the direction pages, their scoped styles and components are removed before the build.

## What a run leaves

- `src/pages/directions/<id>/index.astro`, `src/styles/directions/<id>.css` and `src/components/directions/<id>/` per direction. Each page wraps its content in `data-direction="<id>"`; the stylesheet redefines the token variables (`--color-*`, `--font-*`, radii) under that attribute, so Tailwind utilities restyle inside the page only and one build serves every direction.
- A `noindex` index page at `/`.
- `sites/<slug>/directions.json`: per direction the archetype blend, traits, primary color, fonts, hero type and a one-line idea, plus the `choice` (`null` until recorded). `DIRECTIONS.md`: a paragraph and the blend per direction, the palette and fonts, and the cost of the run. Both stay as the record after the build.

`node scripts/directions.mjs check` fails when there are not 2 or 3 directions, a field is missing, two directions share a primary archetype or the trio of primary color family, display font and hero type, or a page is not built or not `noindex`.

## What to send the customer

The preview URL of each direction and one sentence each (the `idea` line). Ask which one is closest and what to change. A direction is lighter than the final page (no art-direction pass, little motion); the build refines the chosen one.

## Limits

Directions are made for a site that is not built yet. There is no choice form, no comments on the pages and no side-by-side app; a person relays the answer. Brief facts appear on a public `noindex` preview URL, the same exposure as any site preview. Editing a delivered landing from feedback is a separate change.
