## ADDED Requirements

### Requirement: Copy plan before building
The `/new-landing` synthesis SHALL run the framework picker and write a "Copy plan" section in `PROPOSAL.md`. The plan SHALL contain:
- the chosen framework and the reason, plus any override and its reason;
- every section mapped to a stage, with the facts it uses;
- two or three hero headline candidates checked with the 4U test;
- the inventory of real proof from the brief.

The build SHALL write the copy from that plan and list the framework in RUN.md "Design decisions".

#### Scenario: Proposal checkpoint
- **WHEN** the run stops at the checkpoint
- **THEN** `PROPOSAL.md` has a "Copy plan" naming the framework and mapping every planned section to a stage

#### Scenario: No real proof
- **WHEN** the brief has no `proof` entries
- **THEN** the plan marks the proof stage "no proof available" and the page shows no invented proof

### Requirement: A person reads the copy
Every RUN.md SHALL list under "to confirm before launch" that a person must read the whole copy before publishing.

#### Scenario: Finished run
- **WHEN** a run ends with `Result: passed`
- **THEN** RUN.md "to confirm before launch" contains the copy read-through item
