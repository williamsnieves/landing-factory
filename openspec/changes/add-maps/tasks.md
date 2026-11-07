# Tasks: add-maps

## 1. Brief
- [x] 1.1 `contact.geo` and `contact.mapInteractive` in the schema, `contact.geo` in `PROSPECT_FACT_FIELDS`, `missing` (after `contact.address`, only with an address), `summary`. Verify: brief tests (valid, out of range, prospect uncovered, missing order).
- [x] 1.2 `/brief-intake` skill asks for coordinates (how to read them on openstreetmap.org), never geocodes. Verify: review.

## 2. Static map
- [x] 2.1 `scripts/lib/osm-tiles.mjs`: tile maths, tile list for a centred image (2x), fetch one at a time with the User-Agent, 7-day cache in `.cache/osm-tiles/`, cap 16 tiles, `OSM_TILE_URL` only under `NODE_TEST_CONTEXT`. Verify: unit tests (known tile numbers for a point, tile count cap, cache hit makes no request).
- [x] 2.2 `scripts/static-map.mjs render` composes with sharp, crops, writes `map.webp`, records the `osm` entry (replacing an earlier one), `--dry-run` prints the tile list. Verify: test with a local fake tile server (PNG tiles generated at runtime), exit codes 0, 1, 2.
- [x] 2.3 One real render on fisioterapia-ribera is NOT part of this change (the site is not edited); a real render into the scratch folder confirms the host works. Verify: manual run with `--out` to a temporary path, or `--dry-run` plus a single tile fetch.

## 3. Maps layer
- [x] 3.1 `src/components/maps/` (LocationMap.astro, texts.ts `en`/`es`, client.ts for the interactive swap), starter demo page `/maps/` (`noindex`, a committed demo image from the fake renderer or a real one with its `assets.json` entry and credit) if the layer needs a reachable user for knip, else a knip entry like the legal components.
- [x] 3.2 `site-layers.mjs` gets the `maps` layer; `new-site` copies it; prune removes it when unused. Verify: site-layers tests.
- [x] 3.3 QA: the demo page passes `npm run qa` (no overflow, Lighthouse, reduced motion) and no third-party request at load.

## 4. Credits, checks, report, legal
- [x] 4.1 `credits.mjs`: "Maps" section and footer line. Verify: credits tests.
- [x] 4.2 `check-landing` `map-attribution`. Verify: fixture pass and fail.
- [x] 4.3 `legal-rules.mjs`: `www.openstreetmap.org` as `embed`. Verify: report test, gated placeholder warns, direct iframe fails.
- [x] 4.4 `legal.mjs` adds OpenStreetMap to `processing.embeds` when the brief has `contact.mapInteractive: true`. Verify: legal test.

## 5. Generation and docs
- [x] 5.1 `new-landing` skill: when `contact.geo` exists, render the map before the build and use `<LocationMap />` in the contact or location section; prospects allowed with sourced or assumed coordinates.
- [x] 5.2 `docs/maps.md` (usage policy, attribution, coordinates, interactive option), CLAUDE.md (commands table, folder structure, Generating a landing, Customer brief, Code quality layers, Legal), `docs/status.md`.
- [x] 5.3 `npx prettier --check .`, `npm run lint`, `npm run check`, `npm run check:sites`, `npm run validate:patterns`, `npm run validate:archetypes`, `npm test`, `npm run qa`, `openspec validate --all --strict`.
