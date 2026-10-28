## ADDED Requirements

### Requirement: SEO fields in the brief
The brief SHALL accept an optional `seo` object with `primaryKeyword`, `keywords`, `serviceArea` and `schemaType` (a closed list of schema.org types), reject unknown keys and types, and `brief missing` SHALL list `seo.primaryKeyword` and, for local businesses, `seo.serviceArea` as recommended. Briefs without `seo` SHALL stay valid.

#### Scenario: Unknown schema type
- **WHEN** a brief sets `seo.schemaType` to `SpaceAgency`
- **THEN** validation fails naming the field and the allowed types
