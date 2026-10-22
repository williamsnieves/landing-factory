# Spec Delta

## ADDED Requirements

### Requirement: Generation reads the brief
When a brief exists, landing generation SHALL validate it before any other phase, SHALL take brand, offer, audience, tone, calls to action, contact data, references, brand constraints and legal constraints from it, SHALL derive the proposal's signals from it, and SHALL use the customer's own assets before stock images.

#### Scenario: Brief with real products and prices
- **WHEN** a landing is generated from a brief that lists two products with prices and a primary call-to-action URL
- **THEN** the proposal and the page use those names, prices and URL, and none of them is labeled as sample data

#### Scenario: Invalid brief
- **WHEN** the brief fails validation
- **THEN** generation stops before the proposal with the validator's errors

### Requirement: Brief facts on the page
When a brief exists, the final check SHALL fail if a non-assumed fact of the brief (business name, primary call-to-action URL, contact email and phone, each product name and price) is missing from the built page, or if the page labels a customer fact as sample data, naming the field.

#### Scenario: Price dropped by the build
- **WHEN** the built page omits the price of one product listed in the brief
- **THEN** the final check fails naming `offer[1].price`
