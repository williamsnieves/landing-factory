# Tasks

## 1. Audit

- [x] 1.1 `scripts/lib/conversion-audit.mjs` and `scripts/conversion-audit.mjs --site <slug> [--json]`, honoring `LANDING_FACTORY_ROOT` (design Decision 4). The code reuses the `check-landing` HTML helpers.

  Verify in `tests/conversion-audit.test.mjs`, with small `dist/` fixtures:
  - each finding, both hit and miss;
  - a multi-locale fixture;
  - no brief;
  - exit 0 with findings, and exit 2 for bad usage or no build;
  - the `--json` shape.

## 2. Dark patterns

- [x] 2.1 `scripts/lib/dark-patterns.mjs` and the `dark-patterns` rule in `scripts/check-landing.mjs` (design Decision 5).

  Verify in `tests/dark-patterns.test.mjs`:
  - a pre-checked box, a `data-countdown` element and a ticking script all fail;
  - confirmshaming fails in `es` and `en`;
  - the fair cases pass: an unchecked box, a date in text, "No, gracias", "No thanks";
  - `404.html` is skipped;
  - every existing `check-landing` test still passes.

## 3. Skills and vendoring

- [x] 3.1 Vendor `cro` and `marketing-psychology`: lock entries, `npm run setup:agent`, `setup:verify` (design Decision 7).

  Verify:
  - the folders match the pinned commit;
  - `setup:verify` lists both;
  - the setup and lock tests pass.
- [x] 3.2 Write `.claude/skills/conversion-psychology/` (SKILL.md, `references/principles.md`, `references/ethics.md`) in our own words, with the guide mapping and evidence levels (design Decisions 1–3, 6). Copy no text from the course material or the vendored skills.

  Verify in `tests/conversion-skills.test.mjs`:
  - every area has principles with an evidence level and a constraint;
  - the ten guide strategies are mapped;
  - the skill names the audit, the plan fields, the allowed edits and the role split.
- [x] 3.3 Update `new-landing` (the Conversion plan in the synthesis, the "Emotional target" in MASTER.md, the review round after QA and before the polish, the RUN.md section) and `revise-landing` (run the audit after `copy` or `content` items and note new findings). Add the "Emotional target" line to `design-system/_template.md` and the "Conversion plan" heading to the PROPOSAL template in `scripts/new-site.mjs`.

  Verify:
  - read the diffs against design Decisions 3 and 6;
  - `tests/new-site.test.mjs` passes.
- [x] 3.4 `.claude/settings.json`: allow `node scripts/conversion-audit.mjs` (it only reads).

  Verify: the JSON still parses.

## 4. Docs and real sites

- [x] 4.1 Write `docs/conversion.md`. Update CLAUDE.md: a "Conversion" section, the command row, the vendored skills rows, and the `check-landing` description of `dark-patterns`. Update `docs/status.md`.

  Verify: `npm run format:check`.
- [x] 4.2 Run the audit and `check-landing` on every existing site. List the findings in the pull request, without fixing them.

  Verify: the outputs are in the pull request description.
- [x] 4.3 Final checks in a clean clone: `npm test`, `npm run lint`, `npm run check`, `npm run check:sites`, `npm run validate:archetypes`, `npm run setup:verify`, `openspec validate add-neuromarketing-review --strict`.

  Verify: all pass.
