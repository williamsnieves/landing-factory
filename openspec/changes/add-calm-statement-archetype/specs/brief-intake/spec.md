## ADDED Requirements

### Requirement: Impact level in the brief
The brief SHALL accept an optional `brand.impact` of `quiet`, `balanced` or `bold`, saying how striking the page should look apart from the tone of its copy. It MAY be listed in `assumed`; `brief missing` SHALL list it among the recommended fields, `summary` SHALL show it, the interview SHALL ask for it without assuming the answer, and older briefs MUST stay valid.

#### Scenario: Unknown impact
- **WHEN** a brief has `brand.impact: "loud"`
- **THEN** `brief validate` exits 1 naming the field and the allowed values

#### Scenario: Calm tone, striking look
- **WHEN** a brief has the tone `tranquilo` and `brand.impact: "bold"`
- **THEN** the brief is valid and the picker favours archetypes that list `bold`
