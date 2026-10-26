# Tasks

## 1. Lint

- [x] 1.1 Install the pinned devDependencies with `--save-exact`: `eslint` 9, `typescript-eslint`, `eslint-plugin-astro`, `eslint-plugin-jsx-a11y`, `knip`. Add the root `eslint.config.mjs` (design Decision 1) and the `lint:code` script.

  Verify:
  - `npm run lint:code` reports exactly the 2 known findings in `estudio-arquitectura` and nothing else; (verified: before the fixes, `npm run lint:code` reported 11 problems: the 2 known ones plus 9 `no-var` errors in `sites/samurai/src/components/sections/Swords.astro` (an `is:inline` ES5 script; the measurement missed them because it did not lint script blocks the same way); no parse error anywhere; the samurai `var`s became `const`, QA of samurai passes. Installed exactly eslint 9.39.5, typescript-eslint 8.72.1, eslint-plugin-astro 1.7.0, eslint-plugin-jsx-a11y 6.10.2, knip 6.43.0 at the root only; the script is `eslint src "sites/*/src/**"` because ESLint 9 does not accept the bare glob `sites/*/src`)
  - a fixture `.astro` file with `interface Props` parses without error (no parse errors anywhere); (verified: tests/lint-config.test.mjs lints an `.astro` text with `interface Props` through the root config: no message, no parse error; the same file reports `anchor-is-valid` at its line, `no-noninteractive-tabindex`, an unused disable directive and `no-var` in a `.ts` file, and `scripts/`, `tests/`, `openspec/` are ignored; 7 tests pass)
  - `npm run format:check` passes. (verified: `All matched files use Prettier code style!`)
- [x] 1.2 Root `knip.json` (design Decision 2), the `lint:unused` script and the `lint` script (`lint:code`, `lint:unused`, `site-layers check`).

  Verify:
  - after task 2.2 the check reports nothing; (verified: `npm run lint:unused` exits 0 after the prune, `npm run lint` exits 0; the root workspace also needs `scripts/**/*.mjs` and `tests/**/*.mjs` as entries (otherwise `tailwindcss`, `lighthouse`, `chrome-launcher` read as unused) and `*.css` in `project` (knip's Tailwind plugin compiles the CSS that imports `tailwindcss` and the `@fontsource-variable/*` packages); `eslint-plugin-jsx-a11y` is in the root `ignoreDependencies` because only the Astro plugin loads it, by name; `--no-config-hints` silences the "remove from ignore" hints of sites that no longer hold a layer)
  - a temporary orphan component in a site makes it fail, naming the file; (verified: adding `sites/panaderia/src/components/sections/Orphan.ts` and `sites/panaderia/src/components/Old.astro` (one at a time) gave `Unused files (1)` naming the file and exit 1; both removed afterwards)
  - `src/i18n/urls.ts` and `src/scenes/*.ts` are never reported; (verified: personal-brand (has `src/i18n/urls.ts`), samurai and festival-electronica (have scenes) are clean; tests/lint-config.test.mjs asserts both entries)
  - the starter's legal components are not reported. (verified: the root workspace ignores `src/components/legal/**` and `src/components/i18n/**` (template source); the 3D layer is used by the `/3d/` demo and its scene is an entry)

## 2. Layers

- [x] 2.1 `scripts/site-layers.mjs` with `prune`, `add` and `check`, `--dry-run`, and exit codes 0, 1 and 2 (design Decision 3). Allow it in `.claude/settings.json`.

  Verify with `tests/site-layers.test.mjs` on fixture sites:
  - unused 3D and legal layers are pruned with their dependencies;
  - a used layer stays;
  - a non-literal `import(` refuses;
  - `add` restores the starter files and dependency ranges, and refuses a second time;
  - `check` lists exactly the sites with unused layers and skips the starter;
  - `--dry-run` changes nothing;
  - a bad slug exits 2. (verified: tests/site-layers.test.mjs, 12 tests on fixture factories (`LANDING_FACTORY_ROOT`), all pass: both unused layers pruned with `three` and `@types/three`; a layer imported from `components/sections/` stays while the other goes; a legal import keeps legal and a direct `import 'three'` keeps 3D; imports in comments do not count; a template-literal `import()` exits 1 naming the file and changes nothing; a literal `import()` of a layer counts as use; `--dry-run` prints "would remove" and changes nothing; `add` restores the starter files, `src/scenes/.gitkeep` and the dependency ranges in sorted order and a second `add` exits 1 "already exists"; `check` lists exactly the sites with unused layers (`dirty` yes, `clean` no) and the starter is never read; bad slug, missing site, unknown layer or command, no arguments all exit 2; the settings entry is `Bash(node scripts/site-layers.mjs *)` (`npm run *` already covers the npm scripts); the layer paths and dependency names come from `COPIED_PATHS`, `SHARED_DEPENDENCIES` and `SHARED_DEV_DEPENDENCIES` of `scripts/new-site.mjs`, which throws at load if they drift; the import scan reuses `findImports` and `stripComments` of `scripts/export/closure.mjs`)
- [x] 2.2 Prune the eight sites, run `npm install` and commit the lockfile (design Decision 5).

  Verify:
  - only `festival-electronica` and `samurai` keep the 3D layer, and only `tupathdigital` keeps the legal layer; (verified: prune results: app-finanzas, estudio-arquitectura, tupathdigital lost the 3D layer and `three`/`@types/three`; personal-brand lost the 3D layer and the legal components; clinica-dental and panaderia had no layer (they predate both); festival-electronica and samurai keep 3D; tupathdigital keeps legal; `npm install` updated `package-lock.json`)
  - `npm run check:sites` has 0 errors; (verified: 8 of 8 sites report `0 errors`; root `npm run check` 0 errors)
  - every site builds; (verified: each `npm run qa -- --site <slug>` builds it first and all passed)
  - `npm run qa -- --site <slug> --skip lighthouse` passes for each site; (verified: exit 0 for app-finanzas, clinica-dental, estudio-arquitectura, festival-electronica, panaderia, personal-brand, samurai and tupathdigital)
  - a full QA run passes for `personal-brand` and one other pruned site; (verified: full runs passed for personal-brand (Lighthouse worst 98/100/100 on `/` and `/es/`), estudio-arquitectura (99/100/100) and tupathdigital (98/100/100 and 100/100/100); 0 failures, impeccable included)
  - `node scripts/site-layers.mjs check` exits 0. (verified: `Layers: 8 site(s) checked, no unused layer.`)
- [x] 2.3 Fix the two accessibility findings in `estudio-arquitectura`.

  Verify:
  - `npm run lint` exits 0 for the whole repository; (verified: exit 0; fixes: `Header.astro` brand link `href="#"` became `href="/"` (the page is a single page, so the link goes home); the horizontal project track in `Proyectos.astro` holds no focusable child, so its `tabindex="0"` is what makes it keyboard-scrollable (WCAG 2.1.1) and works without JavaScript: it stays, wrapped in `{/* eslint-disable astro/jsx-a11y/no-noninteractive-tabindex -- reason */}` ... `{/* eslint-enable ... */}` with the reason on the same line, as the lint-gate spec allows; `-next-line` and HTML comments did not apply to an attribute line)
  - `npm run qa -- --site estudio-arquitectura` passes, and a screenshot of the header and the projects section looks the same. (verified: full QA passed (99/100/100); `section-shots` of the header and the projects section at 1440 px look the same as the page design (brand link, nav, CTA; project index and track), and nothing visual changed in the markup)

## 3. Generation and export

- [x] 3.1 New-landing skill: a "Code architecture" section for every landing, which takes in the multi-locale structure rule, and the prune, `npm install` and lint steps before the final check (design Decision 4). Add the same contract to `sites/README.md`.

  Verify by review: the skill names the contract, the prune command and `npm run lint`, and the multi-locale section points to the shared contract instead of repeating it. (verified: the skill has a "Code architecture" block before the multi-locale section (typed content modules, one section per component with `interface Props`, pages only compose, tokens only, lint, unused layers) and step 1 of the final check runs `node scripts/site-layers.mjs prune --site <slug>`, `npm install` and `npm run lint`; the multi-locale Structure bullet says "the Code architecture contract above applies"; `sites/README.md` has the "Code architecture" and "Optional layers" sections; tests/site-layers.test.mjs asserts these strings and tests/i18n-skills.test.mjs still passes; vendored skills untouched)
- [x] 3.2 Export: the lint configuration for one site, the lint devDependencies pinned from the lockfile, the scripts, the `Lint` step in `templates/ci.yml`, and the refusal of a site with an unused layer (design Decision 6).

  Verify:
  - tests in `tests/export.test.mjs`: the configuration files and scripts are present, the template has a `Lint` step after the format check, and a site with an unused layer exits 1 with nothing written; (verified: tests/export.test.mjs, 35 pass: package pins and scripts (`lint`, `lint:code` = `eslint src`, `lint:unused`), `eslint.config.mjs` and a workspace-free `knip.json` in the output, the `Lint` step between the format check and `astro check`, a fixture site holding `src/components/three/` without an importer exits 1 with "prune it first" and `--out` absent, and exports once a page imports it; the exported template's step order is asserted in tests/export.test.mjs)
  - end to end: export `personal-brand` into a scratch folder with the lockfile, then run `npm ci`, `npm run lint`, `npm run build` and `npm run qa` there. (verified: scratch folder `cq-export`: `npm run export -- --site personal-brand --out <scratch>` wrote 106 files with the lockfile, then `npm ci` (683 packages), `npm run lint` (eslint and knip exit 0), `format:check`, `npm run check` (0 errors), `npm run build` and `npm run qa` (PASSED, 0 failures) all succeeded with no factory file present; the exported knip config also lists `scripts/**/*.mjs` as entries so the tooling packages count as used)

## 4. CI and docs

- [x] 4.1 Add `npm run lint` to the `qa` job of `.github/workflows/ci.yml` after Prettier.

  Verify:
  - `tests/ci-workflow.test.mjs` asserts the step; (verified: new test: `Lint` is the step right after `Prettier` in the `qa` job, before the type checks, has no `if:` or `continue-on-error`, and the other jobs do not repeat it; 21 tests pass)
  - CI on the PR is green. (verified: not verifiable here (no push); the same commands pass locally: `npm run format:check`, `npm run lint`, `npm run check`, `npm run check:sites`, `npm test`, so the main session confirms CI on the PR)
- [x] 4.2 Update `CLAUDE.md` (commands, a "Code quality" section, the CI paragraph, the new-site and export notes) and `docs/status.md`.

  Verify:
  - `npm run format:check` passes; (verified: all files use Prettier code style)
  - `openspec validate add-code-quality --strict` passes; (verified: `Change 'add-code-quality' is valid`)
  - the full `npm test` passes; (verified: 765 tests, 765 pass, 0 fail)
  - `npm run lint` passes. (verified: eslint, knip and the layer check all exit 0)
