# brief-intake Specification Delta

## ADDED Requirements

### Requirement: AI image consent
The brief SHALL hold whether the customer allows AI-generated images (`allowed`, `not-allowed` or empty) and the interview SHALL ask for it; an empty value counts as not allowed for generation, and the value MUST NOT be listed as assumed.

#### Scenario: Consent assumed
- **WHEN** the brief lists the AI-image field in `assumed`
- **THEN** validation fails saying the customer must decide it

#### Scenario: Older brief
- **WHEN** a brief written before this field existed is validated
- **THEN** it is still valid and the field reads as empty
