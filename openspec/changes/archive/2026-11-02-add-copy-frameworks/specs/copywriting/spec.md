## ADDED Requirements

### Requirement: Framework catalog
The factory SHALL hold a closed catalog of copywriting frameworks (at least AIDA, PAS, FAB, BAB, 4P, PASTOR, QUEST, ACCA, a story frame and SLAP). Each framework SHALL list its stages, what each stage must say, the landing sections that can carry each stage, and the signals it fits and avoids.

#### Scenario: Reading the catalog
- **WHEN** a person runs `node scripts/pick-copy-framework.mjs --list`
- **THEN** every framework is printed with its stages and fit signals

### Requirement: Deterministic framework pick
`scripts/pick-copy-framework.mjs --site <slug>` SHALL rank the frameworks from the site's brief (awareness, business kind, price, goal, `proof`, `legal.regulated`, objections) and print the top candidates with their score, reasons and stage-to-section map. The same brief MUST always give the same ranking.

#### Scenario: Problem-aware audience
- **WHEN** the brief says `audience.awareness: "problem-aware"` and nothing else favors another framework
- **THEN** PAS or PASTOR ranks first and the reasons name the awareness level

#### Scenario: Awareness not answered
- **WHEN** the brief has no `audience.awareness`
- **THEN** the picker uses `problem-aware`, says it was assumed and still exits 0

#### Scenario: Regulated niche
- **WHEN** the brief has `legal.regulated: true`
- **THEN** promise-led frameworks rank lower and the output says that promise stages describe the service, never an outcome

### Requirement: Visitor awareness in the brief
The brief SHALL accept an optional `audience.awareness` from `unaware`, `problem-aware`, `solution-aware`, `product-aware` and `most-aware`. The field MAY be listed in `assumed`. `brief missing` SHALL list it among the recommended fields, and older briefs MUST stay valid.

#### Scenario: Unknown value
- **WHEN** a brief has `audience.awareness: "curious"`
- **THEN** `brief validate` exits 1 naming the field and the allowed values

### Requirement: Customer proof in the brief
The brief SHALL accept an optional `proof` list of at most 10 entries `{ kind, text, source? }`. `kind` SHALL be one of `testimonial`, `figure`, `credential`, `award` or `press`, and `source` SHALL be an optional `https` URL. Validation SHALL fail when `proof` or one of its entries is listed in `assumed`. On a prospect brief, an entry without a `source` SHALL fail validation.

#### Scenario: Assumed proof
- **WHEN** a brief lists `proof[0]` in `assumed`
- **THEN** `brief validate` exits 1 saying proof cannot be assumed

### Requirement: Claims that fail
`check-landing` SHALL run a `copy-claims` rule on the visible text of every built page except `404.html` and the legal pages, in Spanish and English. The rule SHALL fail on:
- guaranteed results;
- results within a time span;
- absolute superlatives;
- health promises;
- money promises.

#### Scenario: Promise of results
- **WHEN** a Spanish page says "resultados garantizados en 7 días" and the brief does not state it
- **THEN** `check-landing` fails `copy-claims`, naming the page, the phrase and the reason

### Requirement: Claims that warn
The `copy-claims` rule SHALL warn, without failing, on:
- unsourced percentages or multipliers;
- unnamed studies;
- large round numbers;
- urgency or scarcity wording.

A failing match SHALL become a warning when the brief's own, non-assumed text states the same claim. A page in another language SHALL get one "not covered" warning.

#### Scenario: Figure without a source
- **WHEN** a page says "el 87% de los clientes repite"
- **THEN** the rule warns and does not fail

#### Scenario: The customer's own guarantee
- **WHEN** the page offers a money-back guarantee and an offer description in the brief describes that guarantee
- **THEN** the rule gives a warning asking a person to confirm it, not a failure
