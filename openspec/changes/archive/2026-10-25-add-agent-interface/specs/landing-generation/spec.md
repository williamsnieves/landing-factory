# landing-generation Specification Delta

## MODIFIED Requirements

### Requirement: Run log
Every generation SHALL leave a log with the inputs used, design decisions, QA attempts with their result, and total duration, and, when Claude Code reports them, the run's token usage and cost.

#### Scenario: Later review
- **WHEN** the log of a finished generation is opened
- **THEN** it shows the sheets used, the number of QA attempts and the final result

#### Scenario: Usage reported
- **WHEN** a generation finishes and Claude Code reported usage
- **THEN** the Totals section of the run log shows input and output tokens and the cost, and otherwise says they were not reported
