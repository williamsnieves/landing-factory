## MODIFIED Requirements

### Requirement: Brief facts on the page
When a brief exists, the final check SHALL fail if a non-assumed fact of the brief (business name, primary call-to-action URL, contact email and phone, each product name and price) is missing from the built page, or if the page labels a customer fact as sample data, naming the field. The primary call-to-action URL SHALL count as present when a link has the same origin and path and keeps every query parameter of the brief URL with the same value, whatever extra parameters or fragment it adds. When the site's `.pages.yml` passes the CMS check and has a `content[]` entry named `offer`, the product names and prices SHALL NOT be required and the final check SHALL print the warning `brief-facts-cms-offer`; the other facts SHALL still be checked.

#### Scenario: Price dropped by the build
- **WHEN** the built page omits the price of one product listed in the brief
- **THEN** the final check fails naming `offer[1].price`

#### Scenario: Link tagged for analytics
- **WHEN** the brief's primary URL is `https://shop.example/store` and the page only links `https://shop.example/store?utm_source=landing`
- **THEN** the primary URL fact passes

#### Scenario: Different plan in the link
- **WHEN** the brief's primary URL is `https://app.example/signup?plan=free` and the page only links `https://app.example/signup?plan=pro`
- **THEN** the final check fails naming `goal.primary.url`

#### Scenario: Offer managed by the CMS
- **WHEN** the site's valid `.pages.yml` has an entry named `offer` and the owner removed a product of the brief through the CMS
- **THEN** the final check does not fail on that product, prints `brief-facts-cms-offer`, and still fails if the business name is missing

#### Scenario: Invalid CMS configuration
- **WHEN** the site's `.pages.yml` has an entry named `offer` but fails the CMS check
- **THEN** the product names and prices are still required
