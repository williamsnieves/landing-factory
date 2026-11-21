# Run log: postproduction-studio

Result: checkpoint

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field           | Value                                                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Niche           | post-production studio (demo, no real customer): edits, color-grades and finishes video for brands, musicians and creators; page carried by moving footage; CTA book a project call, secondary see the reel; bold, cinematic, confident; video from Pixabay only |
| Brief           | none (niche only, every decision assumed)                                                                                                                                                                                                                        |
| References      | buzzy-now (`patterns/buzzy-now.md`)                                                                                                                                                                                                                              |
| Mode            | checkpoint (no `--auto`), sources pixabay,commons, lang en                                                                                                                                                                                                       |
| Max QA attempts | 5                                                                                                                                                                                                                                                                |
| Started         | 2026-11-21T10:31:40Z                                                                                                                                                                                                                                             |

## Phases

| Phase         | Status  | Started              | Finished             | Notes                                                                                                 |
| ------------- | ------- | -------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| brief         | done    | 2026-11-21T10:31:56Z | 2026-11-21T10:33:00Z | No brief: niche only, all decisions assumed; ref buzzy-now read                                       |
| synthesis     | done    | 2026-11-21T10:33:00Z | 2026-11-21T10:34:57Z | PROPOSAL.md proposed: cinematic-loop+bento-product-showcase (bento-grid, spec-chips), PAS, excitement |
| checkpoint    | waiting | 2026-11-21T10:34:57Z |                      | No `--auto`: review PROPOSAL.md, then resume with `--resume --auto`                                   |
| design-system | pending |                      |                      |                                                                                                       |
| build         | pending |                      |                      |                                                                                                       |
| qa            | pending |                      |                      |                                                                                                       |
| polish        | pending |                      |                      |                                                                                                       |
| final-check   | pending |                      |                      |                                                                                                       |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins). Every deviation from the chosen archetype sheets, with the requirement or reference that justifies it.

## Images

Count, sources and any photo dropped, with the reason.

## QA attempts

| #   | Verdict | Failures by check | Fixed | Notes |
| --- | ------- | ----------------- | ----- | ----- |

## Conversion review

The findings of `node scripts/conversion-audit.mjs --site postproduction-studio`, what the single review round changed, and what is left for a person.

## Final check

Result of `check-landing`, `credits --check`, Prettier and `astro check`.

## Totals

Wall clock, approximate tokens when the session reports them, remaining failures if the run did not finish.

Stopped at the checkpoint after about 3.5 minutes (2026-11-21T10:31:40Z to 10:34:57Z): brief and synthesis done, nothing built. Pixabay video search answered during the synthesis; `ffmpeg` is checked in the build.

Usage: input 30 tokens, output 20,371, cache write 141,653, cache read 2,050,551, cost $1.9509 USD, 27 turns (reported by Claude Code).
