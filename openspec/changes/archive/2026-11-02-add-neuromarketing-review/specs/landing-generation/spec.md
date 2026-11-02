## ADDED Requirements

### Requirement: Conversion plan before building
The `/new-landing` synthesis SHALL write a "Conversion plan" in `PROPOSAL.md` after the Copy plan, with:
- the emotional target and its reason;
- the attention path with one primary call to action;
- the offers shown (at most 3 side by side) and the highlighted one;
- trust and risk elements from the brief only;
- the closing call to action;
- the ethics checklist.

The emotional target SHALL be written into MASTER.md as an input to ui-ux-pro-max, which still picks palette and fonts.

#### Scenario: Proposal checkpoint
- **WHEN** the run stops at the checkpoint
- **THEN** `PROPOSAL.md` has a "Conversion plan" with an emotional target and exactly one primary call to action

### Requirement: One conversion review round
After QA passes and before the impeccable polish, the build SHALL run the conversion audit, look at the section screenshots and apply fixes in one round. RUN.md SHALL have a "Conversion review" listing the findings, what changed and what is left for a person, and QA SHALL pass again after the round.

#### Scenario: Review recorded
- **WHEN** a run ends with `Result: passed`
- **THEN** RUN.md has a "Conversion review" section

### Requirement: Limits of the review round
The review round MAY change:
- section order;
- call-to-action placement and labels;
- copy emphasis;
- optional form fields;
- secondary actions.

It SHALL NOT change tokens, fonts, images, facts, prices, the archetype or the layout grammar.

#### Scenario: Finding outside the allowed edits
- **WHEN** a finding would need a different palette
- **THEN** the round leaves the palette unchanged and lists the finding under "for a person" in RUN.md
