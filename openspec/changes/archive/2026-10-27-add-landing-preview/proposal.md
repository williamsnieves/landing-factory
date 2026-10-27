# Proposal: add-landing-preview

## Why

Today a landing goes from the brief to a full build in one run: about $5 and 30 to 70 minutes. If the customer does not like the result, all of that is thrown away. Showing short visual directions first is the cheapest way to avoid a discarded build. Each direction is a hero plus one section, built from one of the archetype blends `pick-archetypes` ranks. The customer picks one, and the full build starts from the approved direction. This is step 11 of `docs/product-plan.md`, with an estimated cost of $1 to $1.50 per direction, still to be measured.

Owner decisions (2026-10-27):
- `revise_landing`, which edits a delivered landing from feedback, is a separate change.
- In this first version a person relays the customer's choice: the owner or the agent records it with a command. No form or backend.

## What Changes

- **Directions run.** `scripts/new-landing.sh <slug> --directions [--count 2|3]` (default 3) runs the brief, the synthesis signals, then 2 or 3 directions inside the site, then QA, and stops with `Result: directions`. Nothing of the full build runs.
  - Each direction comes from a different primary archetype among the top `pick-archetypes` blends. It has its own palette and fonts from ui-ux-pro-max, a hero and one section with the brief's real copy, and images from the usual sources.
  - Each direction is a real `noindex` page at `/directions/<id>/` (`a`, `b`, `c`). Its tokens are scoped to the page, so one build serves all of them.
  - The site's home page becomes a `noindex` index linking the directions.
  - The run writes `sites/<slug>/directions.json` (machine record) and `sites/<slug>/DIRECTIONS.md` (one paragraph and the blend per direction, plus the cost of the run).
- **Preview URL.** Nothing new to deploy. The site's own branch and PR deploy a Pages preview as today, and the customer gets `https://<branch-alias>.<project>.pages.dev/directions/<id>/`.
- **`scripts/directions.mjs`** (no new dependency):
  - `check --site <slug>`: 2 or 3 directions, each with a recorded blend, primary color, fonts and hero type. Directions must differ in primary archetype and must not share the trio of primary color family, display font and hero type. Each page must be built and `noindex`.
  - `choose --site <slug> --direction <id> [--notes "..."]`: records the choice and the customer's comments in `directions.json`, with the date.
  - `show --site <slug>`: prints the record.
- **Build from the chosen direction.** `new-landing.sh <slug> --resume` on a site with a chosen direction:
  - the proposal's "Archetype blend" and the design system start from the chosen direction;
  - the customer's notes are fixed inputs;
  - the direction pages, their scoped tokens and the index are removed before the build.

  A site with directions but no choice refuses to build (exit 1, naming `directions.mjs choose`).
- **Agent interface:**
  - a `preview_landing` job (the fixed command table gains the `--directions` form of `new-landing.sh`);
  - a `choose_direction` tool, which writes only `directions.json`;
  - `get_landing` shows the directions and the choice.

  `preview_landing` needs a person's approval like the other long jobs. `choose_direction` is allowed like `brief_update`.
- **Docs:** `docs/preview.md` (the flow, what to send the customer, costs), plus updates to `CLAUDE.md`, `docs/agent-interface.md` and `docs/status.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `landing-generation`: a directions run before the full build, the recorded choice, and the build from the chosen direction.
- `agent-interface`: the `preview_landing` job and the `choose_direction` tool.

## Impact

- **New:**
  - `scripts/directions.mjs`;
  - `tests/directions.test.mjs`;
  - `docs/preview.md`.
- **Changed:**
  - `scripts/new-landing.sh`;
  - `.claude/skills/new-landing/SKILL.md` (a "Directions" phase and the resume rule);
  - `scripts/mcp/{commands,tools,landings}.mjs` and their tests;
  - `.claude/settings.json` (`node scripts/directions.mjs` and `mcp__landing-factory__choose_direction` allowed);
  - `package.json` (`directions` script);
  - `CLAUDE.md`, `docs/agent-interface.md`, `docs/status.md`.
- **Existing sites:** unchanged. They have no `directions.json`, so the build behaves as before.
- **Out of scope:**
  - `revise_landing` (its own change);
  - a choice form or comments on the preview page;
  - side-by-side previews in a web app (step 12);
  - generating directions for an already built landing;
  - a cost gate (the run records the cost and never stops on it).
- **Follow-up:** the first real directions run, on its own `change/<slug>-directions` branch after this merges, measures the cost per direction for `docs/status.md`.
