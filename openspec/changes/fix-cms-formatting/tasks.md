# Tasks: fix-cms-formatting

- [ ] 1.1 The exported `.prettierignore` lists the CMS paths (a file as `/<path>`, a collection as `/<path>/`), and the export's Prettier pass skips them. Verify: an export test with a CMS file written as `JSON.stringify(value, null, 2)` passes `prettier --check` in the output.
- [ ] 1.2 `cms.mjs pull` formats the files it writes with the factory's Prettier. Verify: a pull test where the clone's file is unformatted and the pulled file passes `prettier --check`.
- [ ] 1.3 `sync-export.mjs` compares CMS files by parsed value (JSON, YAML) and falls back to bytes when a file does not parse. Verify: sync tests (same value, different formatting: nothing kept; a changed value: kept).
- [ ] 1.4 `docs/cms.md` and CLAUDE.md "Git CMS". Then run `npx prettier --check .`, `npm run lint`, `npm run check`, `npm test` and `openspec validate --all --strict`.
