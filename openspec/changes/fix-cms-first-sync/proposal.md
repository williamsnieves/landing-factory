# Proposal: fix-cms-first-sync

## Why

The first sync of `personal-brand` after it moved to content collections (2026-11-12) added `src/content.config.ts` and `.pages.yml` to the repository but not `src/content/career.json` or `src/content/skills.json`. The cause is that `sync-export.mjs` never adds a file under a CMS path. In the clone the schema then pointed at missing files and the build would fail. The rule exists to protect what the CMS edits in the repository, but a file the repository does not have yet cannot have been edited there.

## What Changes

- **Sync seeds CMS paths the clone never had.** When nothing exists in the clone at a CMS path (the file of a `file` entry, the folder of a `collection`), sync adds the factory's files there once, each listed as `added <file> (first copy for the CMS)`. Once the path exists the CMS owns it: a file deleted through the CMS is not added back.
- **Everything else is unchanged.** A file the clone already has is never changed or deleted, and a difference in content is still listed as `kept (managed by the CMS)` with the pull command. A file that exists only in the clone is kept and listed.
- **Docs.** `docs/cms.md` and CLAUDE.md "Git CMS" say so.

## Capabilities

### Modified Capabilities

- `landing-handoff`: sync adds CMS files that the clone does not have yet.

## Impact

- **Code:** `scripts/sync-export.mjs`.
- **Tests:**
  - a first sync into a clone without the CMS path adds its files, and a file deleted afterwards through the CMS is not added back;
  - a later sync keeps an edited file;
  - a file that exists only in the clone stays.
- **No site changes.**
