# Tasks

## 1. Record

- [ ] 1.1 `scripts/lib/revisions-schema.mjs`: `restyle` in `ITEM_KINDS`, `needs-restyle` in `RESULTS`, the optional round field `restyle: { from, to }` (design Decision 4).

  Verify in `tests/revisions-schema.test.mjs`:
  - a round with a valid `restyle` passes;
  - unknown keys in `restyle`, `from` or `to`, a bad `primary`, a missing `to` fail with the field path;
  - an older record without `restyle` passes;
  - `needs-restyle` and the `restyle` kind are accepted.
- [ ] 1.2 `scripts/revisions.mjs meta --site <slug>`: prints `{ primary, displayFont, bodyFont }` from the `landing-meta` block of `design-system/<slug>/MASTER.md`; exit 1 when the block or `primary` is missing.

  Verify with tests on a fixture MASTER.md (with and without `body-font`, and without the block).

## 2. Script

- [ ] 2.1 `scripts/revise-landing.sh --restyle` (design Decision 5) and its `--help`.

  Verify in `tests/revise-landing.test.mjs` with the stubbed `claude`:
  - the prompt carries `--restyle` only with the flag;
  - `Result: needs-restyle` exits 0, prints the `--restyle` command with the feedback path and attaches usage;
  - refusals and the other results are unchanged.

## 3. Skill

- [ ] 3.1 `.claude/skills/revise-landing/SKILL.md`: the `restyle` kind and the table of design Decision 2, the `needs-restyle` stop, the restyle step of Decision 3 with its hard rules (ui-ux-pro-max only; tokens, MASTER.md and fonts only; no section structure, copy, image or motion change; poster re-render), the `restyle` record, REVISION.md notes. Update the skill's description and argument hint.

  Verify with the skill text test: the kinds, both stops, `--restyle`, ui-ux-pro-max only, the files the step may change, the record field.

## 4. Agent interface

- [ ] 4.1 MCP `revise_landing` takes `restyle?: boolean` (schema, validation, command table).

  Verify in `tests/mcp-tools.test.mjs` and `tests/mcp-jobs.test.mjs`:
  - `restyle: true` gives `--restyle` in the job's argv;
  - a non-boolean `restyle` is a tool error;
  - the forbidden-command test still passes.

## 5. Docs

- [ ] 5.1 `docs/revise.md` (restyle section with an example), CLAUDE.md "Revising a landing" and "Agent interface", `docs/agent-interface.md`.

  Verify by review and `npx prettier --check .`.

## 6. Checks

- [ ] 6.1 `npm test`, `npm run lint`, `npx prettier --check .`, `openspec validate add-landing-restyle --strict`, then the same in a clean clone of the branch.
