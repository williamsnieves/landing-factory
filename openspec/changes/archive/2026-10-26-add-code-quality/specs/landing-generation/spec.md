## ADDED Requirements

### Requirement: Clean code before the final check
The build SHALL follow the architecture contract, run `node scripts/site-layers.mjs prune --site <slug>` and `npm install`, and pass `npm run lint` before the final check. A lint failure SHALL be fixed in the code, never by turning a rule off.

#### Scenario: Landing without 3D
- **WHEN** a landing whose proposal plans no 3D scene reaches the final check
- **THEN** its site folder has no 3D layer, its `package.json` has no `three` dependency and `npm run lint` passes
