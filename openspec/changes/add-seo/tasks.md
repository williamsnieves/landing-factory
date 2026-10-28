# Tasks

## 1. Vendored skills

- [ ] 1.1 Add `seo-audit` and `schema` from `coreyhaines31/marketingskills` at commit `0cd9b3a0ef4c411a1d690419ce843f2a1da32cce` to `agent-tooling.lock.json`, then run `FORCE=1 npm run setup:agent`. Support two subpaths of one repository in `setup-agent.sh` if needed. Add `third-party-licenses/marketingskills.LICENSE`. In `CLAUDE.md`, the skills table gets roles and a "never edit" note.

  Verify:
  - `npm run setup:verify` passes;
  - deleting `.claude/skills/schema/` and running `npm run setup:agent` restores it byte-identical;
  - the existing setup tests pass.

## 2. Starter

- [ ] 2.1 Add to `BaseLayout`:
  - the `jsonLd` prop, escaped;
  - Open Graph and Twitter tags.

  Add the sitemap and `robots.txt` (design Decision 3, with the mechanism checked with the astro-docs MCP), and have `new-site` copy them.

  Verify:
  - a test builds the starter and a `new-site` fixture;
  - `dist/sitemap.xml` lists the indexable pages and no `noindex` page;
  - `robots.txt` has the `Sitemap:` line;
  - JSON-LD with `</script>` in a value stays inside its block;
  - `tests/csp.test.mjs` passes;
  - `npm run qa` passes on the starter.

## 3. Brief

- [ ] 3.1 Add the `seo` object (design Decision 2) to `brief-schema.mjs`, `brief.mjs` (`missing`, `summary`) and the `/brief-intake` skill.

  Verify with brief tests:
  - a valid `seo` object;
  - an unknown key, an unknown `schemaType` and too many keywords each fail;
  - `missing` lists the two recommended fields only when they apply;
  - older briefs are still valid.

## 4. Report

- [ ] 4.1 Write `scripts/report/seo.mjs`, add the `seo` area to `landing-report.mjs` (`--skip seo`), add `report.seo` to the config, and skip JSON-LD in the inline-script inventory (design Decision 4).

  Verify with `tests/report-seo.test.mjs` on fixture `dist/` folders:
  - every item's pass, warn and fail cases, including `noindex` pages being skipped;
  - the keyword match with accents;
  - review markup without reviews;
  - `--skip seo`;
  - the Markdown section.

  Then run `npm run report -- --site <slug> --only static` on each of the eight sites and the starter: no new fail anywhere. Record the warn counts.

## 5. Generation and docs

- [ ] 5.1 Add the SEO step (design Decision 5) to `.claude/skills/new-landing/SKILL.md`, and add `docs/seo.md`. Update:
  - `CLAUDE.md`;
  - `docs/channels.md` (the two-track decision, the repository staying public for now, prospect landings without brand assets and `noindex` until sold);
  - `docs/status.md`.

  Verify:
  - a skill text test names `seo-audit`, `schema`, `src/data/seo.ts`, customer facts only and no review markup without reviews;
  - `npm run format:check`, `npm run lint` and the full `npm test` pass;
  - `openspec validate add-seo --strict` passes.
