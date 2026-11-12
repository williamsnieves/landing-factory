# Tasks: add-git-cms

## 1. Configuration check

- [ ] 1.1 `yaml` as a direct devDependency; `scripts/lib/cms-config.mjs` reads `.pages.yml` and returns the CMS paths and the problems (type, path inside `src/content/` and existing, format `json`/`yaml`, path referenced in `src/content.config.ts`, no `media`, no `actions`). Verify: unit tests with fixtures for each rule.
- [ ] 1.2 `scripts/cms.mjs check --site <slug>` with exit codes 0, 1, 2 and `--help`. Verify: CLI tests.

## 2. Pull and sync

- [ ] 2.1 Move the clone checks of `sync-export.mjs` (recorded origin, clean work tree, transferred) into a shared helper in `scripts/lib/`, unchanged behaviour. Verify: existing sync tests pass.
- [ ] 2.2 `cms.mjs pull --site <slug> --from <clone>`: copies, changes and deletes inside the CMS paths only, prints the files, never commits; the four refusals. Verify: tests with a local bare repository and clone.
- [ ] 2.3 `sync-export.mjs` keeps every file under a CMS path in the clone, lists differences as `kept (managed by the CMS)` with the pull command, and syncs `.pages.yml` itself. Verify: sync tests (edit in the clone kept, new factory file under a CMS path not added, `.pages.yml` change synced, site without `.pages.yml` unchanged).

## 3. Export, handoff and revision

- [ ] 3.1 Export runs the check and copies `.pages.yml` to the repository root. Verify: export test with a fixture site, and with an invalid configuration (exit 1, nothing written).
- [ ] 3.2 `handoff.mjs plan` adds the Pages CMS steps only for a site with `.pages.yml`. Verify: plan tests with and without.
- [ ] 3.3 `revise-landing` skill: the `cms` kind, "Edit in the CMS" in `REVISION.md`; `revisions-schema.mjs` accepts `cms`. Verify: schema test and skill review.

## 4. Docs and checks

- [ ] 4.1 `docs/cms.md` (what can be edited, collections with schemas, the `.pages.yml` rules, setup in Pages CMS, how a save reaches production, pull before a revision round, first real edit owed); CLAUDE.md ("Git CMS", "Scope discipline", "Revising a landing", commands table), `docs/revise.md`, `docs/handoff.md`, `docs/status.md`.
- [ ] 4.2 `npx prettier --check .`, `npm run lint`, `npm run check`, `npm run check:sites`, `npm run validate:patterns`, `npm run validate:archetypes`, `npm test`, `npm run qa`, `openspec validate --all --strict`.
