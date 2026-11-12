# Proposal: fix-cms-formatting

## Why

Pages CMS writes a JSON file with `JSON.stringify(value, null, 2)`, which Prettier reformats: it joins short arrays onto one line and adds the final newline. The CI of an exported repository starts with `npm run format:check`. So every save made in the CMS would fail that check, and CI would deploy nothing.

Found while moving `personal-brand` to content collections (2026-11-12) by checking a file written the way Pages CMS writes it: `prettier --check` exits 1. The same difference would also make `sync-export.mjs` list every CMS file as `kept` after any edit, even after a pull, because it compares bytes.

## What Changes

- **Export.** The exported `.prettierignore` lists every CMS path of `.pages.yml`: a file entry as `/<path>`, a collection as `/<path>/`. The CMS owns the formatting of those files, so `format:check` never fails on them. The export's own Prettier pass skips them too.
- **Pull.** `cms.mjs pull` formats the files it writes with the factory's Prettier, so the factory's own `format:check` stays green after a pull.
- **Sync.** `sync-export.mjs` compares a CMS file by its content, not its bytes: JSON and YAML are parsed and compared as values. A file is listed as `kept (managed by the CMS)` only when the values differ or the file exists on one side only. When a file does not parse, sync falls back to comparing bytes.
- **Docs.** `docs/cms.md` and CLAUDE.md "Git CMS" say that the CMS owns the formatting of its files in the repository.

## Capabilities

### Modified Capabilities

- `site-export`: the exported `.prettierignore` lists the CMS paths.
- `git-cms`: pull formats what it writes.
- `landing-handoff`: sync compares CMS files by value.

## Impact

- Code: `scripts/export.mjs`, `scripts/cms.mjs`, `scripts/sync-export.mjs`, `scripts/lib/cms-config.mjs`.
- Tests:
  - the exported `.prettierignore` lists the CMS paths, and `format:check` passes in the export with a CMS file written like Pages CMS writes it;
  - pull formats what it writes;
  - sync lists no `kept` file when the content is equal but formatted differently, and does list one when a value differs.
- No site changes.
