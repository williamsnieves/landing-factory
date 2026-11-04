## MODIFIED Requirements

### Requirement: No prospect brand or consent
While `prospect.status` is `prospect`, the brief SHALL NOT carry assets, brand colors or fonts, AI image or owner portrait consent, legal holder identity or forms, and the build SHALL use only stock images (Pexels, Commons or The Met) and a palette and fonts chosen from the niche.

#### Scenario: Prospect logo in the brief
- **WHEN** a prospect brief lists an asset of kind `logo`
- **THEN** validation fails saying a prospect landing cannot use the prospect's brand

#### Scenario: Pexels photo on a prospect
- **WHEN** a prospect landing records a photo with `source: "pexels"`
- **THEN** the `prospect` rule of the final check passes it, as it passes Commons and The Met
