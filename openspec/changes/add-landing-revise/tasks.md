# Tasks

## 1. Records

- [ ] 1.1 `scripts/lib/revisions-schema.mjs` (design Decision 4) and a shared `isTransferred` in `scripts/lib/export-record.mjs`, together with record reading and URL normalization. `npm run export --record` also writes `noBrief`.

  Verify with tests:
  - schema accepts a valid record;
  - schema rejects unknown keys, a bad result and feedback over 4000 characters;
  - `isTransferred` handles records with and without transfer fields;
  - URL normalization equates `https`, `ssh` and `.git` forms and drops credentials;
  - the export record test sees `noBrief`.

## 2. Revision run

- [ ] 2.1 `scripts/revise-landing.sh` (design Decision 2) and the npm script `revise`.

  Verify in `tests/revise-landing.test.mjs` with a stubbed `claude`, as in the new-landing tests:
  - each refusal (missing, transferred, directions only, no finished build) exits 1 and names the reason;
  - a bad feedback file exits 2;
  - the prompt carries the round number and the feedback path;
  - usage is added to the round;
  - `Result: failed` exits non-zero and `needs-rebuild` exits 0 with its message.
- [ ] 2.2 `.claude/skills/revise-landing/SKILL.md` (design Decision 3).

  Verify by review and with a skill text test:
  - the item kinds;
  - the rebuild stop;
  - brief first for facts;
  - only `sites/<slug>/` and MASTER.md;
  - every check named;
  - no commit, push, deploy or sync.

## 3. Sync and transfer

- [ ] 3.1 `scripts/sync-export.mjs` (design Decision 5).

  Verify in `tests/sync-export.test.mjs` on a temp factory and a local bare repository as `origin`:
  - each refusal;
  - add, change and delete are mirrored;
  - `.git` and ignored paths are untouched;
  - the lockfile is kept when `package.json` is unchanged;
  - README is kept when only the export line differs;
  - `--dry-run` writes nothing;
  - a record without `noBrief` needs a flag;
  - a `--no-brief` sync never writes `brief.json`.
- [ ] 3.2 `handoff.mjs transfer-plan` and `scripts/transfer.mjs record` (design Decision 6).

  Verify with tests:
  - the plan names the transfer step, the target's secrets by name and the owner's cleanup;
  - fake secret values in the environment never appear;
  - `record` writes the fields and refuses a site without the record or already transferred;
  - after `record`, `revise-landing.sh` and `sync-export.mjs` refuse the site.

## 4. Agent interface

- [ ] 4.1 `revise_landing` job and `get_landing` fields (design Decision 7).

  Verify in the MCP tests:
  - the command entry and its validation (feedback written to the job folder, at most 4000 characters);
  - a transferred site is refused;
  - `get_landing` output;
  - the no-publishing assertion still holds;
  - `revise_landing` is not in `.claude/settings.json`.

## 5. Docs

- [ ] 5.1 `docs/revise.md`, plus updates to:
  - `docs/handoff.md`: the delivery models table marks "managed, with transfer, in the owner's account" as current, the transfer section, and sync replacing the hand refresh;
  - `docs/product-plan.md`: the decision of 2026-10-27;
  - the landing-handoff skill: sync and transfer phases;
  - `CLAUDE.md` and `docs/status.md`.

  Verify:
  - `npm run format:check`, `npm run lint` and the full `npm test` pass;
  - `openspec validate add-landing-revise --strict` passes.
