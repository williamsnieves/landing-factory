# Tasks

## 1. Record and script

- [x] 1.1 `scripts/lib/directions-schema.mjs` and `scripts/directions.mjs` (`check`, `choose`, `show`; design Decisions 3 and 4). Add the npm script `directions` and allow `Bash(node scripts/directions.mjs *)` in `.claude/settings.json`.

  Verify with `tests/directions.test.mjs` on fixture sites:
  - each `check` problem is named;
  - a valid site with 3 built `noindex` pages exits 0;
  - `choose` records direction, notes and date;
  - `choose` refuses an unknown id and a built site;
  - unknown keys and notes over 2000 characters fail;
  - bad usage exits 2.

## 2. Generation

- [x] 2.1 `scripts/new-landing.sh`: `--directions` and `--count 2|3` (only with `--directions`), passed to the skill. On `--resume`, refuse a site whose `directions.json` has no choice.

  Verify in `tests/new-landing.test.mjs` (the existing stubbed `claude`):
  - the prompt carries the flags;
  - `--count` without `--directions` exits 2;
  - the resume refusal names `directions.mjs choose`.
- [x] 2.2 `.claude/skills/new-landing/SKILL.md`: the "Directions" phase (design Decisions 1 and 2) and the resume rule (Decision 5).

  Verify by review and with a skill text test:
  - distinct primaries;
  - ui-ux-pro-max only;
  - `noindex`;
  - removal before the build;
  - customer notes as fixed inputs.
- [x] 2.3 Starter support for scoped tokens: confirm that a page wrapping its content in `[data-direction]` with redefined variables restyles Tailwind utilities.

  Verify with a fixture page in a test: built and loaded in Chromium, computed colors and fonts follow the scope.

## 3. Agent interface

- [x] 3.1 `preview_landing` job, `choose_direction` tool, and `get_landing` directions (design Decision 6); permissions in `.claude/settings.json`.

  Verify in the MCP tests:
  - the command table entry and its argument validation;
  - `choose_direction` writes only `directions.json` and rejects invalid input;
  - `get_landing` output;
  - the no-publishing assertion still holds.

## 4. Docs

- [x] 4.1 `docs/preview.md`, and updates to `CLAUDE.md`, `docs/agent-interface.md` and `docs/status.md`.

  Verify:
  - `npm run format:check`, `npm run lint` and the full `npm test` pass;
  - `openspec validate add-landing-preview --strict` passes.
