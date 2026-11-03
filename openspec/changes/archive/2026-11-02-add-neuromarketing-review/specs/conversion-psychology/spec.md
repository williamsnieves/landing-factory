## ADDED Requirements

### Requirement: Principle catalog with evidence levels
The factory SHALL hold a catalog of conversion principles covering attention, fluency, emotion, trust, risk, choice, price, memory, reciprocity and ethics. Each principle SHALL have its landing application, its evidence level (`strong`, `mixed` or `weak`), the factory constraint it respects and the version it must never become. A `weak` principle SHALL never override legibility, contrast, QA or a brief fact.

#### Scenario: Color and emotion
- **WHEN** the catalog is read for color
- **THEN** it marks the evidence as weak and says the emotional target is an input to ui-ux-pro-max, which picks the palette

### Requirement: Conversion audit of a built page
`scripts/conversion-audit.mjs --site <slug> [--json]` SHALL read the built page and the brief without a browser and without writing, and report heuristic findings as warnings or info. It SHALL exit 0 with findings and 2 on bad usage or a missing build.

#### Scenario: Call to action missing at the end
- **WHEN** the last section before the footer has no link to `goal.primary.url`
- **THEN** the audit reports `closing-cta` as a warning naming the page and exits 0

#### Scenario: No build
- **WHEN** the site has no `dist/index.html`
- **THEN** the audit exits 2 saying to build first

### Requirement: Audit heuristics
The audit SHALL report:
- a missing `h1` or primary call to action in the hero;
- no primary call to action in the closing section;
- more than 3 call-to-action destinations;
- forms with more than 5 fields;
- more than 3 offers side by side;
- each `proof` entry found or not, and proof markup without brief proof;
- brief contact data missing from the page;
- the legal pages linked or not.

#### Scenario: Testimonials without brief proof
- **WHEN** the page shows a quoted testimonial and the brief has no `proof`
- **THEN** the audit reports `proof-without-brief` as a warning

### Requirement: Dark patterns fail
`check-landing` SHALL run a `dark-patterns` rule on every built page except `404.html`. It SHALL fail on:
- a pre-checked checkbox inside a form;
- a countdown timer;
- a confirmshaming decline in Spanish or English.

It SHALL pass an unchecked consent box, a deadline written as a date, and a plain decline.

#### Scenario: Pre-checked newsletter box
- **WHEN** a form has `<input type="checkbox" name="newsletter" checked>`
- **THEN** `check-landing` fails `dark-patterns`, naming the page and the field

#### Scenario: Polite decline
- **WHEN** a button says "No, gracias"
- **THEN** the rule does not fail
