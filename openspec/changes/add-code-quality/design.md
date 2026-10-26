# Design: add-code-quality

## Context

Measured on 2026-10-26 with a scratch install, nothing committed:

- **ESLint 9.** Configuration: `typescript-eslint` recommended, `eslint-plugin-astro` recommended and `jsx-a11y-recommended`, and the TypeScript parser for `.astro` frontmatter.
  - 0 problems in the starter's `src/` and in 7 sites.
  - `estudio-arquitectura` has 2: `anchor-is-valid` in `Header.astro:8` and `no-noninteractive-tabindex` in `Proyectos.astro:64`.
  - Without the TypeScript parser for `.astro` frontmatter, every `interface Props` is a parse error, so that setting is required.
- **`knip`** (`files,dependencies`):
  - `personal-brand`: 10 unused files and `three` plus `@types/three`. The unused files are the five files of the 3D layer, the four legal components, and `src/i18n/urls.ts`, which `BaseLayout` loads with `import.meta.glob`, so that one is a false positive.
  - `tupathdigital`: the 3D layer, its dependencies, and `LegalNotice.astro`. It has a privacy page but no legal notice.
  - `panaderia`: nothing. It predates both layers.
- **Layers by site.** `festival-electronica` and `samurai` use 3D; `tupathdigital` uses the legal components. The starter uses the 3D layer for its `/3d/` demo and keeps the legal components as the template source.
- **`Props` typing.** Every `.astro` component that reads `Astro.props` already declares `Props`.

## Goals / Non-Goals

**Goals:**

- A lint gate in CI that keeps the current clean state.
- No unused layer or dependency in a site or an exported repository.
- One written architecture contract for every landing.
- Exported repositories carry the same gate.

**Non-Goals:**

- Linting `scripts/` and `tests/`.
- Type-aware rules (`astro check` already type-checks).
- Stylelint.
- Rewriting older single-language sites to move inline copy into modules.
- Custom ESLint rules.

## Decisions

1. **One root ESLint flat config.** `eslint.config.mjs` at the root has:
   - global ignores for `dist`, `.astro`, `node_modules`, `qa`, `.cache`, `scripts`, `tests` and `openspec`;
   - `tseslint.configs.recommended`, `astro.configs.recommended` and `astro.configs['jsx-a11y-recommended']`;
   - for `**/*.astro`, `parserOptions.parser = tseslint.parser` with `extraFileExtensions: ['.astro']`.

   `npm run lint:code` runs `eslint src sites/*/src`. Sites have no ESLint config of their own; the root config reaches them, the same way Prettier does. No rule is turned off to get a pass; a disable comment needs a reason on the same line (`-- reason`).

   Pinned devDependencies, exact like the other tooling pins: `eslint` 9.39.x, `typescript-eslint` 8.72.x, `eslint-plugin-astro` 1.7.x, `eslint-plugin-jsx-a11y` 6.10.x, `knip` 6.43.x. The exact versions are the ones installed by `npm install --save-dev --save-exact` during the change.

   Alternatives rejected: a config per site, which would mean eight copies to keep equal; `astro check` alone, which has no accessibility or code-quality rules.

2. **`knip` checks unused files and dependencies, not exports.** A root `knip.json`:
   - one workspace for `.` and one for `sites/*`;
   - entries: `src/pages/**/*.astro` and the Astro config (knip's Astro plugin does this), plus files loaded through `import.meta.glob`: `src/i18n/urls.ts` and `src/scenes/*.ts`;
   - ignores the layer folders `src/components/three/**` and `src/components/legal/**`, which are judged as a unit by Decision 3. Inside a layer, some files are used only by other files of the layer, and a site may use one legal component and not the other;
   - reports `files` and `dependencies` only (`--include files,dependencies`).

   Unused exports and types are left out: content type interfaces are often exported for clarity, and failing on them adds noise.

   `npm run lint:unused` runs knip. `npm run lint` runs `lint:code`, `lint:unused` and `node scripts/site-layers.mjs check`.

3. **Optional layers: `scripts/site-layers.mjs`.**

   | Layer   | Files                                                    | Dependencies              | In use when                                                                                         |
   | ------- | -------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
   | `3d`    | `src/components/three/`, `src/scenes/` (empty or not)    | `three`, `@types/three`   | a file under `src/` outside the layer imports `components/three/` (that is, `Scene3D`)              |
   | `legal` | `src/components/legal/`                                  | none                      | a file under `src/` outside the layer imports `components/legal/`                                   |

   Commands:
   - `prune --site <slug> [--dry-run]` removes each layer that is not in use, and its dependencies from the site's `package.json`. It prints what it removed and reminds you to run `npm install` (which updates the root lockfile).
   - `add <3d|legal> --site <slug>` copies the layer from the starter, the same files `new-site` copies, and restores the dependency ranges from the root `package.json`. It refuses when the layer already exists.
   - `check [--site <slug>]` exits 1 listing every site that holds a layer it does not use. With no `--site` it checks every site; the starter is never checked, since it is the template source.

   Exit codes: 0 ok, 1 check failed or refused, 2 bad usage.

   The "in use" test reads import specifiers, a static scan of `.astro`, `.ts`, `.tsx` and `.mjs` files, the same approach as the export's closure walker. It never needs a build.

   `new-site` is unchanged: it still copies both layers. A brand-new site has a placeholder page that uses neither, so `check` would fail on it until the build prunes. That is intended: the build owns the decision, and `check` catches a build that forgot to prune.

   Alternative rejected: `new-site` copies no layer and the build adds them. That changes the scaffold contract and every scaffold test for no gain, since prune gives the same final state.

4. **The architecture contract lives in the skill and in `sites/README.md`.** One section, "Code architecture", applies to every landing. It moves and extends the multi-locale rule:
   - **Copy and data:** section copy and lists (products, steps, FAQs, roles) live in typed modules. Use `src/content/<locale>.ts` for multi-locale sites, and `src/content/site.ts` or `src/data/*.ts` for single-language ones. Components receive them through props or import them; long text is never typed inline in markup.
   - **Sections:** one section per component in `src/components/sections/`, with an `interface Props` when it takes props. Shared pieces (a heading block, a card) are their own components instead of copied markup.
   - **Pages:** pages only compose the layout and sections, with no data shaping or logic beyond picking the locale.
   - **Styling:** tokens only. No raw hex outside `tokens.css`, and no sizes outside the type scale (already a rule).
   - **Lint:** `npm run lint` passes. A disable comment needs a reason.

   The build runs `node scripts/site-layers.mjs prune --site <slug>` and `npm install` before the final check, then `npm run lint`. A lint failure is fixed like a QA failure, never by turning a rule off.

   It is enforced by lint and review, not by a new check. A check of "copy inline in markup" would be a fragile heuristic, so review and the skill carry it.

5. **The existing sites in this change.**
   - `prune` runs on all eight. Expected result: the 3D layer goes from every site except `festival-electronica` and `samurai`, and the legal components go from every site except `tupathdigital`. Then `npm install` updates the lockfile.
   - `estudio-arquitectura` gets its two accessibility fixes: a real `href` or a `<button>` for the header link, and no `tabindex` on a non-interactive element (or the element becomes interactive, if it is meant to be).
   - Each pruned site must still pass `astro check`, build, and pass QA. CI runs every site because shared files change.

6. **Exported repositories.** `scripts/export/` gains:
   - **Configuration:** `eslint.config.mjs` (the root file, which works unchanged at a single-site root because its globs are relative) and a `knip.json` for one project (same entries and layer ignores, no workspaces).
   - **devDependencies:** the five lint packages, pinned from the factory lockfile.
   - **Scripts:** `lint:code` = `eslint src`, `lint:unused` = `knip --include files,dependencies`, and `lint` = both. The layer check is not exported: an exported site was pruned in the factory.
   - **Workflow:** a `Lint` step after the format check in `templates/ci.yml`.
   - **Refusal:** the export refuses a site that fails `site-layers check` (exit 1, "prune it first"), so dead layers never leave the factory.

7. **CI.** The root `qa` job runs `npm run lint` after Prettier. Lint is fast (seconds) and covers every site, so the site matrix does not repeat it.

## Risks / Trade-offs

- **New dev dependencies and audit surface.** These are dev-only tools; `npm audit --omit=dev` in the report does not see them. Their versions are pinned.
- **Knip false positives** from new dynamic loads. An `import.meta.glob` added later must be listed in `knip.json`; the lint failure names the file, and the skill says so.
- **Prune removes something a site uses through a path the static scan misses**, such as a dynamic import with a computed path.
  - `prune` refuses to remove a layer when any non-literal `import(` exists in the site's `src/`, and asks for a decision.
  - The build and QA run after prune, so a missing module fails loudly.
- **Lockfile churn**, because removing `three` from six sites changes `package-lock.json`. It is generated by `npm install`, never edited by hand.
