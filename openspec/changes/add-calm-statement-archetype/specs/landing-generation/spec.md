## ADDED Requirements

### Requirement: Signature moment in every proposal
Every proposal SHALL name one signature moment a visitor should remember: the section it lives in, what it shows, the technique, its reduced-motion and no-JavaScript form and the brief facts it uses, at every impact level and without invented proof. The build SHALL record in RUN.md "Design decisions" whether the moment was built as planned or why it changed.

#### Scenario: Proposal template
- **WHEN** `new-site` scaffolds a site
- **THEN** its `PROPOSAL.md` has a "Signature moment" section right after "Archetype blend"

#### Scenario: Quiet impact
- **WHEN** a brief asks for `quiet` impact
- **THEN** the proposal still names a signature moment, a quieter one
