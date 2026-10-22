# Tasks

## 1. Brief file and tool

- [x] 1.1 `scripts/lib/brief-schema.mjs`: schema and validator (design Decision 1). Verify: `tests/brief.test.mjs` covers a valid fixture, each required field missing, unknown key, bad URL/email/phone/color, closed values, missing asset file, unknown pattern sheet, `assumed` pointing at an empty or nonexistent field. (verified: tests/brief.test.mjs, 23 tests pass)
- [x] 1.2 `scripts/brief.mjs` with `init`, `validate`, `missing`, `summary` and exit codes 0/1/2; `npm run brief`; `new-site --allow-existing-docs` accepts a folder with `brief.json`. Verify: tests for each command and for `init` refusing to overwrite; `new-site` test with a pre-existing brief. (verified: init/validate/missing/summary/import tests, new-site and preflight with brief.json)
- [x] 1.3 Fixture `tests/fixtures/brief/` for a fictional customer (digital products: two products with prices, an email, a primary URL, one local logo, one liked reference with a sheet, one disliked, two assumed fields). Verify: `brief.mjs validate --file` passes. (verified: `brief.mjs validate --file tests/fixtures/brief/brief.json` exits 0)

## 2. Intake interview

- [x] 2.1 `.claude/skills/brief-intake/SKILL.md` (design Decision 3) and the allow-list entry for `node scripts/brief.mjs *`. Verify: a test asserts the skill names the commands it runs, the topic order and the no-invention rule, and that the allow list has the entry and nothing broader. (verified: skill and allow-list tests pass)

## 3. Generation reads the brief

- [x] 3.1 `new-landing.sh --brief <file>`: copy, validate (stop on failure), `--niche` optional with a brief, `--lang` from the brief, `--brief` in the prompt. Verify: `tests/new-landing.test.mjs` cases for a valid brief (stub records the prompt), an invalid brief (exit 1, nothing run), no niche and no brief (exit 2). (verified: tests/new-landing.test.mjs brief cases pass)
- [x] 3.2 `/new-landing` skill: brief and synthesis phases read the brief (design Decision 4); proposal template Brief section points at it. Verify: skill test asserts the brief commands and rules are present; dry run in 4.1. (verified: skill test passes; dry run is 4.1)
- [x] 3.3 Customer assets: `source: "customer"` in `credits.mjs` and `check-landing` `images-credited` (design Decision 5). Verify: tests for a customer entry with and without `owner`/`permission`, and its section in `CREDITS.md`. (verified: credits and check-landing tests pass; credits --check unchanged for all six sites)
- [x] 3.4 `check-landing` `brief-facts` (design Decision 6), `brief.sampleWords` in `qa.config.json`. Verify: fixture dist pages for pass, a missing price, a missing phone, an assumed phone not required, a fact labeled "ejemplo", and price normalization. (verified: check-landing brief-facts tests pass; all six sites unchanged except pre-existing layout-diversity on panaderia and clinica-dental)

## 4. Validation and docs

- [ ] 4.1 `new-landing.sh <fixture-slug> --brief tests/fixtures/brief/brief.json --dry-run`: the proposal uses the brief's business, products, prices, URL and email, lists the assumed fields under Decisions, derives `Signals:` from the brief and passes the liked sheet to `pick-archetypes`; the throwaway site is removed afterwards. Verify: read the proposal and RUN.md, record the run time.
- [x] 4.2 Docs: `CLAUDE.md` (commands, generating a landing, brief), `docs/status.md`, `sites/README.md`. Verify: `npx prettier --check .`, `openspec validate add-brief-intake --strict`. (verified: prettier --check and openspec validate --strict pass; docs/status.md left to the main session)

## Workflow follow-up

- Open PR, review and merge.
- `openspec archive add-brief-intake` after merge.
- Then the owner's digital-products landing as the first real customer test, starting with `/brief-intake`.
