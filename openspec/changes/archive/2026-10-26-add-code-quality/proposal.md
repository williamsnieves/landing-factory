# Proposal: add-code-quality

## Why

QA and the landing report judge what a landing does: speed, accessibility, security, overflow, motion and design. Nothing judges how its code is written. A measurement on 2026-10-26 found that the code is already in good shape:

- ESLint with the Astro and accessibility rules finds 0 errors in 7 of the 8 sites and in the starter, and 2 accessibility errors in `estudio-arquitectura`;
- every component that reads `Astro.props` declares its `Props`.

Three gaps remain:

- **No gate protects the clean state.** No linter runs in CI, so the next landing can break it unnoticed.
- **Unused layers.** `new-site` copies the 3D layer (five files, about 500 lines, plus `three` and `@types/three`) and the legal components into every site, used or not. In `personal-brand`, `knip` reports 10 unused files and 2 unused dependencies, all from those layers. Exported repositories now carry them to the customer.
- **The architecture rules are partial.** The skill requires copy in typed content modules only for multi-locale landings. A single-language landing may write its copy inline in the markup.

The owner's landing moves to its own repository next. This change comes first so that repository starts with the linter and without dead code.

## What Changes

- **Linter.** A root `eslint.config.mjs`, using ESLint 9 flat config, applies the recommended rules of `typescript-eslint` and `eslint-plugin-astro`, plus the accessibility rules of `eslint-plugin-jsx-a11y` through the Astro plugin. It covers the starter's `src/` and every `sites/*/src/`. `npm run lint` runs it and CI runs it in the `qa` job.
- **Unused code check.** `knip` reports unused files and unused dependencies, at the root and per site workspace, and fails on them. Unused exports are only reported. Files loaded through `import.meta.glob` are declared as entries, so they never count as unused. It runs inside `npm run lint`.
- **Optional layers on demand.** A new `scripts/site-layers.mjs` handles two optional layers: `3d` (the 3D layer, `src/scenes/` and the `three` dependencies) and `legal` (the legal components).
  - `prune --site <slug>` removes a layer the built site does not use;
  - `add <layer> --site <slug>` copies it back from the starter;
  - `--dry-run` previews either.

  `new-site` keeps copying everything. The `/new-landing` build prunes before its final check. The eight existing sites are pruned in this change.
- **Architecture contract for every landing**, written in the `/new-landing` skill and in `sites/README.md`:
  - section copy and data in typed modules (`src/content/` or `src/data/`), never inline in markup, for single-language landings too;
  - one section per component, with a `Props` interface when it takes props;
  - pages only compose sections;
  - no logic in pages;
  - tokens only, with no raw hex outside `tokens.css`.
- **Fix:** the 2 accessibility findings in `estudio-arquitectura`.
- **Exported repositories:** the export writes `eslint.config.mjs` and `knip.json` for the single site and adds the lint devDependencies. Its workflow runs `npm run lint` after the format check.

## Capabilities

### New Capabilities

- `code-quality`: the linter, the unused code check, optional site layers and the architecture contract that every landing's source must follow.

### Modified Capabilities

- `landing-generation`: the build follows the architecture contract, prunes unused layers and passes `npm run lint` before its final check.
- `site-export`: the exported repository has its lint configuration and its CI runs `npm run lint`.

## Impact

- **New files:**
  - `eslint.config.mjs`, `knip.json`;
  - `scripts/site-layers.mjs`;
  - tests (`tests/site-layers.test.mjs`, lint config tests).
- **Changed code and configuration:**
  - `package.json`: the `lint` script and pinned devDependencies `eslint`, `typescript-eslint`, `eslint-plugin-astro`, `eslint-plugin-jsx-a11y`, `knip`, with `package-lock.json` updated;
  - `.github/workflows/ci.yml`: the lint step;
  - `scripts/export/`: the exported config, devDependencies and template step;
  - `.claude/skills/new-landing/SKILL.md`: the contract and the prune step (our own skill, not vendored);
  - `.claude/settings.json`: allow `node scripts/site-layers.mjs`;
  - `sites/*`: unused layers pruned and their `package.json` updated; `estudio-arquitectura`'s two fixes.
- **Docs:** `CLAUDE.md`, `sites/README.md`, `docs/status.md`.
- **CI:** the change touches every site, so CI runs QA for all of them once. A pruned site must build and pass QA as before.
- **Out of scope:**
  - lint rules for `scripts/` and `tests/`;
  - type-aware lint rules (slower; `astro check` already type-checks);
  - rewriting older single-language sites to move inline copy into content modules: the contract applies to new landings and to sites as they are edited;
  - Stylelint.
