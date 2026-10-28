# landing-revision Specification

## Purpose
Rounds of customer changes on a built landing in the managed model: targeted edits from the customer's feedback, checked and recorded per round, stopped when the request needs a rebuild, and refused once the landing is transferred.

## Requirements

### Requirement: Revision round
`scripts/revise-landing.sh <slug> --feedback <file>` SHALL apply the customer's feedback to a built landing as targeted edits in `sites/<slug>/`, run QA, the static report, the layout signature and `check-landing`, and record the round in `sites/<slug>/revisions.json` with the feedback as given, the files changed, the result and the usage. It MUST NOT commit, push, deploy or sync.

#### Scenario: Copy change
- **WHEN** a round asks to shorten the hero heading of a built landing
- **THEN** only files under `sites/<slug>/` change, QA and `check-landing` pass, and `revisions.json` gains round 1 with result `passed`

#### Scenario: Price change
- **WHEN** the feedback gives a new price for a product
- **THEN** `brief.json` is updated and validated before the page is edited, and the round records `briefChanged: true`

### Requirement: Rebuild requests stop the round
A round whose feedback asks for a different look, archetype, palette family or page structure SHALL stop before editing with `Result: needs-rebuild` and the reason, and the script SHALL exit 0 naming `--directions` or a new build.

#### Scenario: New look requested
- **WHEN** the feedback asks for "a completely different style, darker and more editorial"
- **THEN** no file outside `revisions.json` and `REVISION.md` changes and the result is `needs-rebuild`

### Requirement: Revision refusals
`revise-landing.sh` SHALL refuse (exit 1, naming the reason) a missing site, a transferred site, a site with direction pages and no build, and a site without a finished build. An empty feedback file, one over 4000 characters or a missing file SHALL exit 2.

#### Scenario: Transferred site
- **WHEN** `revise-landing.sh` runs on a site whose `EXPORTED.json` has `transferredTo`
- **THEN** it exits 1 saying the landing was transferred and `claude` is not started
