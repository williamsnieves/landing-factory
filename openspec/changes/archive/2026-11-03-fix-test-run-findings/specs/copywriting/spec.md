## MODIFIED Requirements

### Requirement: Deterministic framework pick
`scripts/pick-copy-framework.mjs --site <slug>` SHALL rank the frameworks from the site's brief (awareness, business kind, price, goal, `proof`, `legal.regulated`, objections) and print the top candidates with their score, reasons and stage-to-section map. The same brief MUST always give the same ranking. The goal SHALL be one of `booking`, `signup`, `buy` or `lead`, read from the primary call to action's label and URL in that order.

#### Scenario: Problem-aware audience
- **WHEN** the brief says `audience.awareness: "problem-aware"` and nothing else favors another framework
- **THEN** PAS or PASTOR ranks first and the reasons name the awareness level

#### Scenario: Awareness not answered
- **WHEN** the brief has no `audience.awareness`
- **THEN** the picker uses `problem-aware`, says it was not stated and assumed, and still exits 0

#### Scenario: Awareness stated but assumed
- **WHEN** the brief has `audience.awareness: "solution-aware"` and lists `audience.awareness` in `assumed`
- **THEN** the picker uses `solution-aware` and says the level is listed as assumed and should be confirmed with the customer, never that it is not stated

#### Scenario: Free sign-up
- **WHEN** the primary call to action is "Empieza gratis" pointing to a `/registro` URL
- **THEN** the goal is `signup` and the frameworks that list `goal:signup` among their fits gain that reason

#### Scenario: Regulated niche
- **WHEN** the brief has `legal.regulated: true`
- **THEN** promise-led frameworks rank lower and the output says that promise stages describe the service, never an outcome
