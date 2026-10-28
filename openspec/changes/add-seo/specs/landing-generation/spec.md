## ADDED Requirements

### Requirement: SEO in generation
The `/new-landing` synthesis SHALL record the primary keyword, service area and schema type (from the brief, else marked assumed), and the build SHALL write titles and descriptions within the report's limits for every locale, one `h1` per page, and JSON-LD of the schema type from customer facts only, never with review or rating markup the customer did not give.

#### Scenario: Real estate agency
- **WHEN** a landing is built from a brief with `seo.schemaType` `RealEstateAgent` and a primary keyword
- **THEN** the home page carries `RealEstateAgent` JSON-LD with the brief's name and contact data, the keyword appears in its title and `h1`, and the report's `seo` area has no failing item
