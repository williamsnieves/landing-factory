# Tasks: fix-cms-first-sync

- [x] 1.1 `sync-export.mjs` adds the files of a CMS path the clone has never had (listed as `added <file> (first copy for the CMS)`); once the path exists it never adds, changes or deletes there. Verify: sync tests for the first sync, a file deleted through the CMS not added back, and an edited file kept.
- [x] 1.2 `docs/cms.md` and CLAUDE.md "Git CMS". Then run `npx prettier --check .`, `npm run lint`, `npm run check`, `npm test` and `openspec validate --all --strict`.
