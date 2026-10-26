## ADDED Requirements

### Requirement: Lint gate
The repository SHALL provide `npm run lint`, which runs ESLint with the TypeScript, Astro and accessibility recommended rules on the starter's `src/` and on every site's `src/`, then the unused-code check and the layer check. CI SHALL run it in the `qa` job and fail on any error. A rule MUST NOT be turned off to get a pass, and an inline disable comment MUST give a reason.

#### Scenario: Accessibility error in a site
- **WHEN** a component of a site has an anchor without a valid `href`
- **THEN** `npm run lint` exits non-zero naming the file, the line and `jsx-a11y/anchor-is-valid`, and the CI `qa` job fails

#### Scenario: Clean repository
- **WHEN** no file breaks a rule
- **THEN** `npm run lint` exits 0

### Requirement: Unused files and dependencies
The unused-code check SHALL fail on a source file that no page reaches and on a dependency that no file imports, at the root and in each site workspace. Files loaded through `import.meta.glob` SHALL be declared as entries so they never count as unused. Unused exports MUST NOT fail the check.

#### Scenario: Orphan component
- **WHEN** a site holds `src/components/sections/Old.astro` that nothing imports
- **THEN** the check fails naming `sites/<slug>/src/components/sections/Old.astro`

### Requirement: Optional site layers
`node scripts/site-layers.mjs` SHALL manage two optional layers, `3d` and `legal`, which are in use when a file of the site's `src/` outside the layer imports them: `prune` removes each unused layer and its dependencies, `add` copies a layer back from the starter, and `check` exits 1 listing every site (never the starter) that holds an unused layer. `prune` SHALL refuse when the site has a non-literal dynamic import.

#### Scenario: Site without a scene
- **WHEN** `prune --site personal-brand` runs on a site where no file outside the layer imports `components/three/`
- **THEN** `src/components/three/` and `src/scenes/` are removed, and `three` and `@types/three` leave its `package.json`

#### Scenario: Site with a scene
- **WHEN** `prune --site samurai` runs and a section imports `Scene3D`
- **THEN** the 3D layer stays

#### Scenario: Restore a layer
- **WHEN** `add legal --site personal-brand` runs after the legal layer was pruned
- **THEN** the legal components are copied from the starter and a second `add legal` is refused

### Requirement: Architecture contract
Every landing SHALL keep section copy and data in typed modules (`src/content/` or `src/data/`), one section per component with a `Props` interface when it takes props, pages that only compose the layout and sections, and colors and sizes from the tokens only. The contract SHALL be written in the `/new-landing` skill and in `sites/README.md`.

#### Scenario: Reviewing a generated section
- **WHEN** a reviewer opens a section component of a new landing
- **THEN** its copy comes from a typed content or data module and its props are typed
