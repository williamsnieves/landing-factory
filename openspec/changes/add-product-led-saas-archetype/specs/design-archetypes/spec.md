## ADDED Requirements

### Requirement: Product-led software archetype
The catalog SHALL include a `product-led-saas` archetype for software product pages that owns the lendable traits `ui-frame-hero`, `two-tone-heading` and `logo-strip-under-hero`, fits the signals `technical`, `premium`, `conversion-first`, `product-showcase`, `calm` and `few-assets`, and uses the existing hero types only.

#### Scenario: Software brief
- **WHEN** a brief's signals are `technical`, `premium`, `conversion-first` and `few-assets` and no other site uses the archetype
- **THEN** `pick-archetypes` ranks a blend with `product-led-saas` as primary first

#### Scenario: Reference traits
- **WHEN** a run's references include a sheet describing a framed interface hero, two-tone headings and a logo row under the hero
- **THEN** the ranking offers `ref:<sheet>/ui-frame-hero`, `ref:<sheet>/two-tone-heading` and `ref:<sheet>/logo-strip-under-hero`

### Requirement: No invented product proof
The `product-led-saas` sheet SHALL require that an interface frame shows the customer's own screenshots or an abstract mock without invented metrics, names or features, and that a logo strip uses only marks the customer supplied with permission, otherwise being left out or replaced by brief facts.

#### Scenario: No customer logos
- **WHEN** a landing built with `logo-strip-under-hero` has no customer marks in its brief assets
- **THEN** the page shows no logo strip of placeholder or invented marks
