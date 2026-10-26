## ADDED Requirements

### Requirement: Lint in the exported repository
The exported repository SHALL include the lint configuration for one site, the pinned lint devDependencies and an `npm run lint` script, and its workflow SHALL run `npm run lint` after the format check. The export SHALL refuse a site that holds an unused layer (exit 1, asking to prune it first).

#### Scenario: Exporting a pruned site
- **WHEN** a pruned site is exported and `npm ci && npm run lint` runs in the output folder
- **THEN** lint passes with no file of the factory present

#### Scenario: Exporting a site with an unused layer
- **WHEN** the site still holds the 3D layer without any scene
- **THEN** the export exits 1 naming the layer and writes nothing
