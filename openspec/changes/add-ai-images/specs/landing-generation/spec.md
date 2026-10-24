# landing-generation Specification Delta

## ADDED Requirements

### Requirement: AI images during generation
Generation SHALL use AI images only for illustrative, abstract or generic subjects, only when the customer allowed them or there is no brief, after the customer's own files and never for subjects archives cover with real photos the page claims as real, and SHALL record in the run log each AI image with its reason and the count against the cap.

#### Scenario: Customer allows AI images
- **WHEN** a landing is generated from a brief with AI images allowed and the art direction asks for an abstract hero image
- **THEN** the hero image may be generated, the page carries the AI disclosure and the run log names the image and its reason

#### Scenario: Customer does not allow AI images
- **WHEN** the brief does not allow AI images
- **THEN** no AI image is generated or imported and the run log says so
