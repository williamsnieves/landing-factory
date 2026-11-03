## MODIFIED Requirements

### Requirement: Brief facts on the page
When a brief exists, the final check SHALL fail if a non-assumed fact of the brief (business name, primary call-to-action URL, contact email and phone, each product name and price) is missing from the built page, or if the page labels a customer fact as sample data, naming the field. The primary call-to-action URL SHALL count as present when a link has the same origin and path and keeps every query parameter of the brief URL with the same value, whatever extra parameters or fragment it adds.

#### Scenario: Price dropped by the build
- **WHEN** the built page omits the price of one product listed in the brief
- **THEN** the final check fails naming `offer[1].price`

#### Scenario: Link tagged for analytics
- **WHEN** the brief's primary URL is `https://shop.example/store` and the page only links `https://shop.example/store?utm_source=landing`
- **THEN** the primary URL fact passes

#### Scenario: Different plan in the link
- **WHEN** the brief's primary URL is `https://app.example/signup?plan=free` and the page only links `https://app.example/signup?plan=pro`
- **THEN** the final check fails naming `goal.primary.url`
