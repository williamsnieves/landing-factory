# Tasks

## 1. Catalog and picker

- [x] 1.1 `scripts/lib/copy-frameworks.mjs`: `FRAMEWORKS`, `AWARENESS_LEVELS`, the derivation of signals from a brief and the scoring (design Decision 2).

  Verify in `tests/copy-frameworks.test.mjs`:
  - every framework has stages, sections and fit signals;
  - each signal derives correctly from fixture briefs.
- [x] 1.2 `scripts/pick-copy-framework.mjs --site <slug> [--top N] [--json] [--list]`, honoring `LANDING_FACTORY_ROOT`; exit codes 0 and 2.

  Verify in the same test file:
  - the ranking for one fixture per awareness level, a regulated brief, a high price and no proof;
  - the assumed-awareness note;
  - the same output on two runs;
  - bad usage exits 2.

## 2. Brief

- [x] 2.1 `proof` and `audience.awareness` in `scripts/lib/brief-schema.mjs`; `brief missing`, `summary` and the prospect source rule (design Decision 5).

  Verify in the brief tests:
  - valid values of both fields;
  - an unknown awareness or proof kind fails naming the allowed list;
  - awareness may be assumed;
  - assumed proof fails;
  - prospect proof without a source fails;
  - every existing brief fixture and every `sites/*/brief.json` still validates.

## 3. Claims rule

- [x] 3.1 `scripts/lib/copy-claims.mjs` and the `copy-claims` rule in `scripts/check-landing.mjs` (design Decision 4).

  Verify in `tests/copy-claims.test.mjs`, with fixtures:
  - each fail id in `es` and `en`;
  - each warn id;
  - fair sentences that must not match;
  - the brief exception, which ignores assumed fields;
  - the skip of `404.html` and the legal pages;
  - the "not covered" warning for another language.

## 4. Skills and vendoring

- [x] 4.1 Vendor `copywriting` (lock entry, `FORCE=1 npm run setup:agent`, `setup:verify`).

  Verify:
  - the folder matches the pinned commit;
  - `setup:verify` lists it;
  - the setup tests pass.
- [x] 4.2 Write `.claude/skills/copy-frameworks/` (SKILL.md and `references/frameworks.md`, `references/headlines.md`), in our own words.

  Verify:
  - every catalog id is described;
  - the skill names the picker, the Copy plan format and the role split with `copywriting`.
- [x] 4.3 Update the `new-landing` skill (Copy plan in the synthesis, writing from the plan, proof only from `proof`, the RUN.md items), `brief-intake` (the proof and awareness questions) and `revise-landing` (`copy` items keep the framework).

  Verify by reading the diffs against design Decisions 3 and 5.
- [x] 4.4 `.claude/settings.json`: allow `node scripts/pick-copy-framework.mjs` (it only reads).

  Verify: the settings JSON still parses.

## 5. Docs and real sites

- [x] 5.1 `docs/copy.md`; CLAUDE.md "Copy" section, the command row, the vendored skills table; `docs/status.md`.

  Verify: `npm run format:check`.
- [x] 5.2 Run the picker and `check-landing` on every existing site with a brief, and list the findings in the pull request without fixing them.

  Verify: the outputs are in the pull request description.
- [x] 5.3 Final checks: `npm test`, `npm run lint`, `npm run check`, `npm run validate:archetypes`, `openspec validate add-copy-frameworks --strict`.

  Verify: all pass in a clean clone.
