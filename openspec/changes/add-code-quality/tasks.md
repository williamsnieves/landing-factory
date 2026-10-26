# Tasks

## 1. Lint

- [ ] 1.1 Install the pinned devDependencies with `--save-exact`: `eslint` 9, `typescript-eslint`, `eslint-plugin-astro`, `eslint-plugin-jsx-a11y`, `knip`. Add the root `eslint.config.mjs` (design Decision 1) and the `lint:code` script.

  Verify:
  - `npm run lint:code` reports exactly the 2 known findings in `estudio-arquitectura` and nothing else;
  - a fixture `.astro` file with `interface Props` parses without error (no parse errors anywhere);
  - `npm run format:check` passes.
- [ ] 1.2 Root `knip.json` (design Decision 2), the `lint:unused` script and the `lint` script (`lint:code`, `lint:unused`, `site-layers check`).

  Verify:
  - after task 2.2 the check reports nothing;
  - a temporary orphan component in a site makes it fail, naming the file;
  - `src/i18n/urls.ts` and `src/scenes/*.ts` are never reported;
  - the starter's legal components are not reported.

## 2. Layers

- [ ] 2.1 `scripts/site-layers.mjs` with `prune`, `add` and `check`, `--dry-run`, and exit codes 0, 1 and 2 (design Decision 3). Allow it in `.claude/settings.json`.

  Verify with `tests/site-layers.test.mjs` on fixture sites:
  - unused 3D and legal layers are pruned with their dependencies;
  - a used layer stays;
  - a non-literal `import(` refuses;
  - `add` restores the starter files and dependency ranges, and refuses a second time;
  - `check` lists exactly the sites with unused layers and skips the starter;
  - `--dry-run` changes nothing;
  - a bad slug exits 2.
- [ ] 2.2 Prune the eight sites, run `npm install` and commit the lockfile (design Decision 5).

  Verify:
  - only `festival-electronica` and `samurai` keep the 3D layer, and only `tupathdigital` keeps the legal layer;
  - `npm run check:sites` has 0 errors;
  - every site builds;
  - `npm run qa -- --site <slug> --skip lighthouse` passes for each site;
  - a full QA run passes for `personal-brand` and one other pruned site;
  - `node scripts/site-layers.mjs check` exits 0.
- [ ] 2.3 Fix the two accessibility findings in `estudio-arquitectura`.

  Verify:
  - `npm run lint` exits 0 for the whole repository;
  - `npm run qa -- --site estudio-arquitectura` passes, and a screenshot of the header and the projects section looks the same.

## 3. Generation and export

- [ ] 3.1 New-landing skill: a "Code architecture" section for every landing, which takes in the multi-locale structure rule, and the prune, `npm install` and lint steps before the final check (design Decision 4). Add the same contract to `sites/README.md`.

  Verify by review: the skill names the contract, the prune command and `npm run lint`, and the multi-locale section points to the shared contract instead of repeating it.
- [ ] 3.2 Export: the lint configuration for one site, the lint devDependencies pinned from the lockfile, the scripts, the `Lint` step in `templates/ci.yml`, and the refusal of a site with an unused layer (design Decision 6).

  Verify:
  - tests in `tests/export.test.mjs`: the configuration files and scripts are present, the template has a `Lint` step after the format check, and a site with an unused layer exits 1 with nothing written;
  - end to end: export `personal-brand` into a scratch folder with the lockfile, then run `npm ci`, `npm run lint`, `npm run build` and `npm run qa` there.

## 4. CI and docs

- [ ] 4.1 Add `npm run lint` to the `qa` job of `.github/workflows/ci.yml` after Prettier.

  Verify:
  - `tests/ci-workflow.test.mjs` asserts the step;
  - CI on the PR is green.
- [ ] 4.2 Update `CLAUDE.md` (commands, a "Code quality" section, the CI paragraph, the new-site and export notes) and `docs/status.md`.

  Verify:
  - `npm run format:check` passes;
  - `openspec validate add-code-quality --strict` passes;
  - the full `npm test` passes;
  - `npm run lint` passes.
