# project-guidelines Specification

## Purpose
Captures in the repo itself the rules any agent or person must follow when generating landings, so quality, accessibility and ethical use of references do not depend on each session's memory.

## Requirements

### Requirement: Rules file for agents
The repo SHALL include a `CLAUDE.md` at the root describing the stack, commands, folder structure and the OpenSpec workflow.

#### Scenario: New agent session
- **WHEN** an agent opens the repo for the first time
- **THEN** it finds in `CLAUDE.md` the dev, build, check and QA commands and where each kind of piece lives

### Requirement: Extract patterns, don't clone
The rules MUST forbid copying images, videos, 3D models, logos, copy, illustrations or literal code from reference sites into landings, and MUST state that only abstract pattern sheets in `patterns/` are kept from references.

#### Scenario: Request to copy an asset
- **WHEN** an agent reads the rules before building a section inspired by a reference
- **THEN** the rules explicitly tell it that it cannot reuse that reference's assets or text

### Requirement: Explicit quality budgets
The rules SHALL state the MVP acceptance thresholds: Lighthouse ≥ 90 in performance, accessibility and SEO; no overflow at 375, 768 and 1440 px; `prefers-reduced-motion` respected.

#### Scenario: Looking up thresholds
- **WHEN** an agent needs to know whether a landing is done
- **THEN** it finds the numeric thresholds in `CLAUDE.md`

### Requirement: Licensing of external resources
The rules MUST require every external image or component used to have a compatible license, and its attribution to be recorded in the site's repo.

#### Scenario: Using an image from an open collection
- **WHEN** an image from an open collection is added to a landing
- **THEN** its source, author and license are recorded in the site's credits file
