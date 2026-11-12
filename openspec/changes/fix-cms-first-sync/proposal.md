# Proposal: fix-cms-first-sync

## Why

The first sync of `personal-brand` after it moved to content collections (2026-11-12) added `src/content.config.ts` and `.pages.yml` to the repository but not `src/content/career.json` or `src/content/skills.json`. The cause is that `sync-export.mjs` never adds a file under a CMS path. In the clone the schema then pointed at missing files and the build would fail. The rule exists to protect what the CMS edits in the repository, but a file the repository does not have yet cannot have been edited there.

## What Changes

- **Sync seeds missing CMS files.** A file under a CMS path that exists in the factory but not in the clone is added, and listed as `added (first copy for the CMS)`.
- **Everything else is unchanged.** A file the clone already has is never changed or deleted, and a difference in content is still listed as `kept (managed by the CMS)` with the pull command. A file that exists only in the clone is kept and listed.
- **Docs.** `docs/cms.md` and CLAUDE.md "Git CMS" say so.

## Capabilities

### Modified Capabilities

- `landing-handoff`: sync adds CMS files that the clone does not have yet.

## Impact

- **Code:** `scripts/sync-export.mjs`.
- **Tests:**
  - a first sync into a clone without the CMS files adds them;
  - a later sync keeps an edited file;
  - a file that exists only in the clone stays.
- **No site changes.**
