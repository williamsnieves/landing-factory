# Tasks: fix-cms-first-sync

- [ ] 1.1 `sync-export.mjs` adds a CMS file the clone does not have (listed as `added (first copy for the CMS)`); it still never changes or deletes one the clone has. Verify: sync tests for the first sync, an edited file kept, and a file that exists only in the clone kept.
- [ ] 1.2 `docs/cms.md` and CLAUDE.md "Git CMS". Then run `npx prettier --check .`, `npm run lint`, `npm run check`, `npm test` and `openspec validate --all --strict`.
