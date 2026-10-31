# Proposal: add-landing-restyle

## Why

The casavela test (2026-10-30, `docs/status.md`, finding 1) showed that a palette change has no command:

- The owner approved the design of the first build but asked for another palette (from a Pinterest board of real-estate palettes).
- The revise skill classifies a different palette family as `rebuild`, so `npm run revise` would stop with `needs-rebuild` and point to `--directions` or a new build. Both regenerate far more than the request.
- The workaround was manual: write the palette into `directions.json` `choice.notes` by hand (`directions.mjs choose` refuses once the direction pages are gone), reset the design-system to final-check rows of `RUN.md` to `pending`, then `new-landing.sh --resume --auto`. It worked (10 minutes, $3.93), but it left no revision round, it went through the build phase again and nobody else could repeat it from the docs.

A new palette or a new font pairing on an approved layout is a common customer request ("I like it, but in our colors"). It needs a recorded, repeatable path that keeps the sections, copy and images as they are.

## What Changes

- **Restyle round.** `scripts/revise-landing.sh <slug> --restyle --feedback <file>` runs a revision round in restyle mode (`/revise-landing ... --restyle`). The `--restyle` flag is the person's approval that the look changes.
  - It re-runs the design system with ui-ux-pro-max (only) from the feedback, the brief and the current `MASTER.md`, for the palette and the font pairing.
  - It rewrites the palette and typography sections and the `landing-meta` `primary`, `display-font` and `body-font` of `design-system/<slug>/MASTER.md`, `src/styles/tokens.css` and, for a new font, the self-hosted font package and its import. It keeps the archetype, the hero type, the page map, the copy, the images and the motion.
  - It re-renders a 3D scene's poster (scenes read their colors from the tokens) and fixes any component that breaks the new contrast pairs.
  - It runs the same checks as any round: QA, the static report, the layout signature, `check-landing` (including token contrast and the primary color / display font / hero trio against the other sites), the layer check and lint.
  - Other items in the same feedback (`fact`, `copy`, `content`, `style`) are applied in the same round as today. A structural item (archetype, hero, page map) still stops the round with `needs-rebuild`.
- **New item kind and result.** `restyle` joins the item kinds: a different palette family or font family on the same layout. A normal round (no `--restyle`) that finds a `restyle` item stops before editing with `Result: needs-restyle`, and the script exits 0 naming the `--restyle` command. `rebuild` keeps covering a different archetype, hero, layout or page structure.
- **Record.** A restyle round records `restyle: { from, to }` in `revisions.json` (`primary`, `displayFont`, `bodyFont` before and after), so the look's history and the cost per restyle are read from the record. `directions.json` is not changed: it keeps the customer's original choice.
- **Agent interface.** The MCP `revise_landing` job takes `restyle?: boolean` and passes `--restyle`. It stays a `generation`-class job that a person approves.
- **Docs.** `docs/revise.md` (restyle section), CLAUDE.md "Revising a landing", the revise skill.

## Out of scope

- A change of archetype, hero type, layout, radius language or page structure (still `rebuild`: `--directions` or a new build).
- Several palettes to choose from in one run (that is `--directions`).
- Recoloring or replacing photos and AI images to match the new palette (a `content` item, asked separately).
- Restyling a transferred landing (refused like any round).

## Impact

- Code: `scripts/revise-landing.sh`, `scripts/lib/revisions-schema.mjs`, `scripts/revisions.mjs`, `scripts/mcp/tools.mjs` and `scripts/mcp/commands.mjs`, `.claude/skills/revise-landing/SKILL.md`.
- Specs: `landing-revision` (modified and added requirements), `agent-interface` (modified `revise_landing`).
- Tests: revise-landing with a stubbed `claude`, the revisions schema, the MCP tools, the skill text.
- Existing `revisions.json` files stay valid (`restyle` is optional; old kinds and results unchanged).
- A first real restyle round is optional and costs about one revision round (expected under the $3.93 of the casavela workaround); the owner decides whether to run it.
