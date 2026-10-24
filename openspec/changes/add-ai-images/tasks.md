# Tasks

## 1. Brief consent

- [x] 1.1 `scripts/lib/brief-schema.mjs`: `brand.aiImages` (`allowed`, `not-allowed` or `''`). It can't be assumed, and `missing` lists it after `brand` (design Decision 4). The `/brief-intake` skill asks for it. Verify:
  - tests in `tests/brief.test.mjs`: valid values, a bad value, assumed fails, `missing` order;
  - every `sites/*/brief.json` and fixture still validates;
  - the skill test asserts the question and the never-assume rule. (verified: tests/brief.test.mjs covers the valid values, a bad value, an assumed value (error), the `missing` order and an older brief; every `sites/*/brief.json` and the fixture validate; the brief-intake skill test asserts the question and the never-assume rule)

## 2. Adapter, policy and tool

- [x] 2.1 `scripts/lib/openai-images.mjs` (design Decision 1). Verify, with tests against a local fake HTTP server via `OPENAI_BASE_URL`:
  - request path, body and auth header;
  - base64 decoding;
  - error mapping;
  - a key echoed in an error body is masked;
  - a missing key fails before any request. (verified: tests/openai-images.test.mjs, against a local fake server via `OPENAI_BASE_URL`: path, body and auth header, base64 decoding, error mapping, a key echoed in an error body masked, a missing key failing before any request)

- [x] 2.2 `scripts/lib/ai-prompt-policy.mjs` (design Decision 3). Verify: one test per rule, in English and Spanish, plus allowed prompts (abstract, texture, generic object) and the brand rule built from a brief fixture. (verified: tests/ai-prompt-policy.test.mjs, one test per rule in English and Spanish, allowed abstract, texture and generic-object prompts, and the brand rule from the brief fixture)

- [x] 2.3 `scripts/ai-images.mjs`:
  - `generate`, `import`, `count` and `--dry-run`;
  - consent and cap;
  - the `aiImages` config (defaults and validation in `scripts/qa/config.mjs`, section in `qa.config.json`);
  - the `ai-images` npm script and the allow-list entry.

  Verify: tests with the fake server and a temporary site folder:
  - a generate writes the file and the full entry;
  - a dry run writes nothing and makes no request;
  - `not-allowed` exits 1;
  - the cap exits 1;
  - an import without a prompt exits 2;
  - an import of a file writes the entry with `imported: true`;
  - stdout and stderr never contain the fake key. (verified: tests/ai-images.test.mjs, with the fake server and temporary site folders: generate writes the file and the full entry, dry run writes nothing and sends nothing, `not-allowed` and empty exit 1, the cap exits 1, an import without a prompt exits 2, an import writes `imported: true`, stdout and stderr never contain the fake key, plus a process-level run; tests/config.test.mjs covers the `aiImages` defaults and validation)

## 3. Credits and final check

- [x] 3.1 `scripts/credits.mjs`: `isAi`, `AI_REQUIRED_FIELDS` and the "AI-generated images" table. Verify:
  - tests for validation and the table;
  - `credits --check` unchanged for all seven sites. (verified: tests/credits.test.mjs covers validation and the table; `node scripts/credits.mjs --site <slug> --check` exits 0 for all seven sites)

- [x] 3.2 `check-landing` `ai-provenance` (design Decision 5). Verify, with fixtures:
  - a missing `model` fails;
  - a missing file fails;
  - a brief `not-allowed` with an AI entry fails;
  - a missing `data-ai-disclosure` fails;
  - a policy-breaking prompt fails;
  - a clean AI site passes;
  - all seven existing sites keep their current results. (verified: tests/check-landing.test.mjs covers a missing model, a missing file, a `not-allowed` brief, a missing or hidden disclosure, a policy-breaking prompt and a clean AI site; `check-landing` output on all seven sites is byte-identical to before the change)

## 4. Generation skill

- [x] 4.1 `/new-landing` skill: image source order, AI only when allowed and for illustrative subjects, the footer disclosure element (`en`, `es`), the `RUN.md` Images entries, and the no-key fallback (design Decision 6). Verify: the skill test asserts these rules and commands. (verified: tests/ai-images.test.mjs skill test asserts the source order, the allowed-only rule, the disclosure element in `en` and `es`, the RUN.md entries, the no-key fallback and the commands) (verified: tests/ai-images.test.mjs skill test asserts the source order, the allowed-only rule, the disclosure element in `en` and `es`, the RUN.md entries, the no-key fallback and the commands)

## 5. Docs

- [x] 5.1 Docs:
  - `CLAUDE.md`: commands, "Generating a landing" images, a new "AI images" section, "Licensing and credits", and the environment needs (`OPENAI_API_KEY`, `api.openai.com`);
  - `README.md` and `scripts/README.md`;
  - `docs/legal.md`: the AI disclosure line;
  - `docs/status.md`.

  Verify: `npx prettier --check .` and `openspec validate add-ai-images --strict`. (verified: `npx prettier --check .` and `openspec validate add-ai-images --strict` exit 0)

## 6. Real generation and full run

- [ ] 6.1 (not run: no OPENAI_API_KEY and api.openai.com not allowed in this environment) Real smoke test. Needs `OPENAI_API_KEY` in the environment and `api.openai.com` allowed:
  - run `node scripts/ai-images.mjs generate <throwaway-slug> --prompt "abstract ..." --as smoke --quality low` on a throwaway site;
  - check the file, the entry, the credits table, and `check-landing` `ai-provenance` with a disclosure element;
  - confirm or correct the default model;
  - remove the throwaway site.

  Verify: the output is recorded in the PR. Without the key and the domain, leave this unchecked and say so in the PR.
- [x] 6.2 Full pre-push run in a clean clone: `npm ci && npx prettier --check . && npm run check && npm run check:sites && npm run validate:patterns && npm run validate:archetypes && npm test && npm run qa`, plus `npm run qa -- --site tupathdigital`, `npm run report -- --site tupathdigital` and `openspec validate --all --strict`. Verify: every command exits 0. (verified: run in the working tree, every command exits 0: prettier --check, check, check:sites, validate:patterns, validate:archetypes, npm test (467 tests, 0 fail), npm run qa, npm run qa -- --site tupathdigital, npm run report -- --site tupathdigital (passed, 0 fail), openspec validate --all --strict; the main session repeats it in a clean clone)

## Workflow follow-up

- After the user confirms the merge: `openspec archive add-ai-images --yes` as the first commit of the next branch (`change/add-deploy-adapters`, or the tupathdigital legal follow-up if the owner has the data).
