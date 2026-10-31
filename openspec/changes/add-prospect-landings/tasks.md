# Tasks

## 1. Brief

- [x] 1.1 `scripts/lib/brief-schema.mjs`: the `prospect` section, `PROSPECT_FACT_FIELDS`, the coverage rule and the forbidden fields while `prospect` (design Decisions 1 and 2); `brief missing` asks for sources; `summary` shows status and sources.

  Verify in `tests/brief-prospect.test.mjs`:
  - a sourced prospect brief validates;
  - an uncovered fact fails naming the field;
  - a field in both `sources` and `assumed` fails;
  - each forbidden field fails with its message;
  - a bad URL or date fails;
  - a sold brief accepts assets and consent;
  - every existing brief fixture still validates.

## 2. Prospect data, layout and build

- [x] 2.1 `scripts/prospect.mjs` with `write [--check]`, `kit` and `sold` (design Decisions 3, 5 and 6); exit codes 0, 1 and 2; honors `LANDING_FACTORY_ROOT`.

  Verify in `tests/prospect.test.mjs`:
  - the written file;
  - a stale `--check`;
  - the kit headings, the sources table and the absence of any message addressed to the prospect;
  - `sold` changes only the status and `prospect.json`;
  - the refusals.
- [x] 2.2 `src/components/prospect/ProspectNotice.astro`, `BaseLayout.astro` (glob import, forced `noindex`, notice) and `seoFiles()` (empty sitemap, `X-Robots-Tag`); add them to `new-site`'s copy list (no `knip.json` entry is needed: `BaseLayout` imports the component, so knip sees it as used).

  Verify in `tests/prospect-site.test.mjs`, which scaffolds a fixture site with `new-site`, writes `prospect.json` and builds:
  - `noindex` and the notice on every page, in `es` and in `en`;
  - an empty sitemap and the header;
  - after `sold` and a rebuild, none of them.

  Also: `tests/csp.test.mjs` and the starter build stay unchanged, and `npm run lint` passes.

## 3. Final check

- [x] 3.1 `check-landing` rule `prospect` (design Decision 4).

  Verify in `tests/check-landing.test.mjs` with fixtures:
  - a passing prospect `dist/`;
  - a missing notice, a page without `noindex`, a sitemap URL, a missing header, a customer asset, an AI image, an unsourced fact and a stale `prospect.json` each fail with the rule name;
  - a sold site passes without the notice.

## 4. Skills, interface and docs

- [x] 4.1 `new-landing` skill (prospect inputs, images and palette rules, the proposal section, `prospect.mjs write` and `kit`) and `brief-intake` skill (sources per fact in prospect mode).

  Verify with skill text tests.
- [x] 4.2 MCP `get_landing` adds `prospect` (`status`, or `null`).

  Verify in `tests/mcp-tools.test.mjs`.
- [x] 4.3 `docs/prospect.md`, CLAUDE.md "Prospect landings" (and the Commands table, folder structure and `new-site` copy list) and `docs/status.md`.

  Verify by review and `npx prettier --check .`.

## 5. Checks

- [x] 5.1 `npm test`, `npm run lint`, `npm run check`, `npx prettier --check .`, `openspec validate add-prospect-landings --strict`, then the same in a clean clone of the branch. (In-repo run done; the clean-clone run is the owner's.)
