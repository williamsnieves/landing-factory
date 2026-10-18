# Tasks

## 1. Workspaces and scaffold

- [x] 1.1 Add `"workspaces": ["sites/*"]` to the root `package.json` and verify `npm ci` still installs and the root `npm run build`, `npm run check` and `npm test` pass
- [x] 1.2 Implement `scripts/new-site.mjs` (`npm run new-site -- <slug>`) per design decision 2, with tests for slug validation, refusing existing folders and the expected file list; verify the tests pass
- [x] 1.3 Scaffold `sites/panaderia` with the command (keeping its existing `PROPOSAL.md`), run `npm ci`, and verify `npm run build -w site-panaderia` produces `sites/panaderia/dist/index.html` and the root build output is unchanged

## 2. QA per site

- [x] 2.1 Add `--site <slug>` to `scripts/qa.mjs` per design decision 3 with a test; verify `npm run qa -- --site panaderia` passes and writes `qa/panaderia/latest/report.json`, and that `npm run qa` without the flag behaves as before

## 3. CI

- [x] 3.1 Implement `scripts/changed-sites.mjs` with unit tests covering: only one site changed, a shared path changed, no site changed; verify the tests pass
- [x] 3.2 Add the `sites` and `site-qa-deploy` jobs to `ci.yml` per design decision 5 (secrets gate, project create, deploy, URL capture, per-site sticky comment); verify the YAML parses and passes `@action-validator/cli`
- [x] 3.3 Verify on this change's PR that the `panaderia` site job runs QA, deploys a preview to its own Pages project and posts its own comment, while the root starter jobs still pass (verified on PR #10: `site panaderia` deployed to `panaderia-a3o` with its own sticky comment; all jobs green)

## 4. Docs and dependent change

- [x] 4.1 Document sites in `CLAUDE.md` (structure, `new-site`, `qa --site`, CI per site) and add `sites/README.md`; verify the documented commands work as written
- [x] 4.2 Update `openspec/changes/add-new-landing-skill/design.md` decision 1 and its task 1.1 to build on `sites/<slug>/` workspaces instead of moving the starter; verify `openspec validate add-new-landing-skill --strict` passes

## Workflow follow-up

- Open PR, review and merge.
- `/opsx:archive add-site-workspaces` after merge.
