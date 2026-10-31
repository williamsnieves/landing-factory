# Design: add-landing-restyle

## Context

Revision rounds (`add-landing-revise`) change a built landing with targeted edits and stop with `needs-rebuild` for "a different look, archetype, palette family or page structure". The casavela test showed that a new palette on an approved layout is much closer to a revision than to a rebuild: tokens are the single source of the theme (CLAUDE.md "Stack", "tokens only"), so a palette or font pairing change lands mostly in `tokens.css`, `MASTER.md` and the font import. The workaround (`--resume` from the design-system phase) cost $3.93 and 10 minutes, but it re-entered the build phase and left no round in `revisions.json`.

## Decisions

### 1. A mode of the revision round, not of `new-landing.sh`

`scripts/revise-landing.sh <slug> --restyle --feedback <file>`.

- The revision round already has what a restyle needs: the refusals (missing, transferred, directions-only, unfinished build), the record and its usage, the sync of an exported landing, and the MCP job.
- `new-landing.sh --resume` goes through the build phase, whose instructions are to build sections. Teaching it to "build but do not touch sections" is harder to keep honest than adding a bounded step to the revise skill.
- Alternative rejected: `new-landing.sh --restyle --notes`. It would need its own record, its own refusals and a second path to the MCP interface.

### 2. Item kinds: `restyle` between `style` and `rebuild`

| Kind      | Example                                                         | Normal round        | `--restyle` round   |
| --------- | --------------------------------------------------------------- | ------------------- | ------------------- |
| `style`   | a darker shade of the same primary, larger body size            | applied             | applied             |
| `restyle` | another palette family, another display or body font family     | stop, needs-restyle | applied             |
| `rebuild` | another archetype, hero type, layout, radius language, page map | stop, needs-rebuild | stop, needs-rebuild |

- The flag is the person's approval that the look changes, so a normal round never restyles silently: it stops with `needs-restyle` (exit 0) and the script prints the exact `--restyle` command.
- `rebuild` wins over `restyle`: a round with both stops with `needs-rebuild`.
- The skill's test stays "same landing, adjusted" versus "another landing". A restyle is "the same landing in other colors or type".

### 3. What the restyle step changes

The skill, in a `--restyle` round, before the other edits:

1. Read the feedback, the brief (brand constraints, colors named by the customer), the current `MASTER.md` (archetype, hero, chosen style) and `layout-signature.json`.
2. Query ui-ux-pro-max (only, per CLAUDE.md "Vendored skills") for a palette and a font pairing that fit the request and the existing style. A color the customer names is used as given.
3. Rewrite the MASTER.md "Palette" and "Typography" sections and the `landing-meta` `primary`, `display-font` and `body-font`; record the queries in "Skill queries run". `archetype`, `traits` and `hero` stay.
4. Rewrite `src/styles/tokens.css` (the same token names, new values). A new font: install its `@fontsource` or `@fontsource-variable` package with the build's allowed install form, change the import in `global.css`, remove the old package when nothing uses it, `npm install` so the lockfile follows.
5. Search `src/` for anything that bypasses tokens (raw colors, an `rgba()` with fixed numbers, a gradient stop) and move it onto tokens; a component whose text pair falls under 4.5:1 is fixed in the component or the token, never in a threshold.
6. A site with a scene re-renders its poster with `render-poster.mjs` and updates its `assets.json` entry; `credits.mjs` runs after.

It does not touch section components' structure, copy modules, images, motion or the page map. The QA loop, the section screenshots and the checks then run as in any round.

### 4. Record

`revisions.json` round gains an optional `restyle`:

```json
"restyle": {
  "from": { "primary": "#1f3a5f", "displayFont": "Fraunces", "bodyFont": "Inter" },
  "to": { "primary": "#232d47", "displayFont": "IBM Plex Sans", "bodyFont": null }
}
```

- Read from the `landing-meta` block before the step and after it. `bodyFont` is `null` when `landing-meta` has none.
- `RESULTS` gains `needs-restyle`, `ITEM_KINDS` gains `restyle`. Validation: `restyle` only with `from` and `to`, each with exactly these three keys, `primary` as `#rrggbb`. Older records stay valid.
- `scripts/revisions.mjs` gets `meta --site <slug>` (prints the three values from `landing-meta` as JSON) so the skill does not parse MASTER.md by hand.
- `directions.json` keeps the customer's original choice; the restyle history lives in the rounds.

### 5. Script and interface

- `revise-landing.sh`: `--restyle` adds `--restyle` to the skill prompt; the result switch gains `needs-restyle` (exit 0, prints the `--restyle` command with the same feedback path); usage is attached as for `needs-rebuild`.
- MCP `revise_landing`: `restyle?: boolean`; the command table builds `["--restyle"]` only from that boolean, never from free text. Permission unchanged (a person approves the job).

## Risks

- **Over-reach.** The skill could "improve" sections while restyling. Mitigation: the hard rule "no section structure or copy changes in the restyle step", and the round's `files` list is reviewed in the PR; a test of the skill text asserts the rule.
- **Diversity.** The new primary and display font could match another site. `check-landing` already fails on the trio; the skill picks again.
- **Images that clash** with the new palette are not recolored (out of scope); REVISION.md lists them under "To confirm with the customer" when the reviewer pass sees a clash.
- **Cost.** One ui-ux-pro-max query plus a QA loop; expected under the $3.93 of the workaround. Measured on the first real run.

## Verification

Tests with a stubbed `claude` (no network, no real model) for the script, the schema, the MCP command and the skill text; the full suite, lint, format, `openspec validate --strict` and a clean-clone run before the push. A real restyle round is optional and the owner decides (for example on casavela, discarding the result).
