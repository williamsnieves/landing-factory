# Proposal: add-maps

## Why

Local businesses (a clinic, a bakery, an estate agency) want their location on the page. Today a landing shows the address as text only. The usual answer, a Google Maps embed, sets cookies before any consent, sends every visitor's IP address to Google, adds third-party JavaScript and fails `legal-cookies` unless a consent mechanism exists, which the factory does not ship. The owner chose OpenStreetMap (2026-11-07): open data under the ODbL, no key, no cookies, attribution only.

## What Changes

- **Brief.** `contact.geo` (optional): `{ lat, lng, zoom? }`, latitude -90..90, longitude -180..180, zoom 12..18 (default 16), plus `contact.mapInteractive` (optional boolean, default false). On a prospect brief `contact.geo` is a fact: it needs a source or an `assumed` entry like the address. `brief missing` asks for it when the brief has an address; `summary` shows it; `/brief-intake` asks "what are the coordinates? (right-click the place in openstreetmap.org)", never geocodes and never invents them.
- **Static map at build time.** `node scripts/static-map.mjs render --site <slug> [--width 1200 --height 630] [--zoom N] [--dry-run]` reads `contact.geo`, downloads only the tiles that cover the image (at most 16, sequential, a `User-Agent` that names landing-factory, never parallel), caches them for 7 days in `.cache/osm-tiles/`, composes a 2x image with `sharp` and writes `sites/<slug>/src/assets/images/map.webp`. It records the entry in `assets.json`: `source: "osm"`, `license: "ODbL 1.0"`, `attribution: "© OpenStreetMap contributors"`, `url: "https://www.openstreetmap.org/copyright"`, `geo`, `zoom`, `tiles`, `createdAt`, `credit: true`. Visitors never request a tile: the image is part of the build. `OSM_TILE_URL` overrides the tile server only under `NODE_TEST_CONTEXT` (tests use a local fake). Exit codes 0, 1 (network or refused), 2 (bad usage, no `contact.geo`).
- **Maps layer.** `src/components/maps/` (a new optional layer, copied by `new-site`, pruned when unused): `<LocationMap image geo address label locale interactive />` renders a `<figure>` with the image (`alt` naming the address), a marker drawn in HTML and CSS at the centre in the site's primary colour, the visible attribution linked to the OSM copyright page, the address, and "Cómo llegar" / "Get directions" links to Google Maps, Apple Maps and OpenStreetMap built from the coordinates (plain links: nothing is requested until the visitor clicks). With `interactive`, a button swaps the figure for the OpenStreetMap embed (`https://www.openstreetmap.org/export/embed.html` with a bounding box and marker) only on click, through an Astro-processed module script and a `data-consent-src` placeholder; without JavaScript the button is a link to openstreetmap.org. Texts in `en` and `es`.
- **Credits and checks.** `credits.mjs` lists OSM maps under a "Maps" heading with the attribution and license, and adds "Map data © OpenStreetMap contributors" to the footer credits. `check-landing` rule `map-attribution` (only when `assets.json` has an `osm` entry): fails when a built page that shows the map image lacks the visible attribution linked to `https://www.openstreetmap.org/copyright`, or when the entry is not in `assets.json`. The landing report classifies `www.openstreetmap.org` as an `embed` host: behind the click placeholder it passes with the usual "verify the consent mechanism" warning; loaded directly it fails `legal-cookies` like any embed.
- **Legal text.** When a site uses the interactive map, `legal.mjs` adds OpenStreetMap to `processing.embeds`, so the privacy policy names it (the OpenStreetMap Foundation, United Kingdom, receives the IP address only after the visitor clicks). The static image needs no mention: no request leaves the page.
- **Generation.** `/new-landing` uses the map in the contact or location section when the brief has `contact.geo` (runs `static-map.mjs render` before the build, then `credits.mjs`); prospects may use it (OSM is not the prospect's brand) with the coordinates sourced or assumed. Without `contact.geo` nothing changes.

## Capabilities

### New Capabilities

- `maps`: static OpenStreetMap images at build time, the maps layer and its checks.

### Modified Capabilities

- `brief-intake`: `contact.geo` and `contact.mapInteractive`.
- `legal-compliance`: the interactive map named in the privacy policy and classified as an embed.

## Impact

- New: `scripts/static-map.mjs`, `scripts/lib/osm-tiles.mjs` (tile maths, fetch, cache), `src/components/maps/` (component, texts, client script), `docs/maps.md`, tests (`tests/static-map.test.mjs` with a fake tile server, `tests/maps-layer.test.mjs`, check-landing and report fixtures).
- Modified: `scripts/lib/brief-schema.mjs`, `scripts/brief.mjs` (missing, summary), `scripts/site-layers.mjs` (`maps` layer), `scripts/new-site.mjs` (copy it), `knip.json` if needed, `scripts/credits.mjs`, `scripts/check-landing.mjs`, `scripts/report/legal-rules.mjs`, `scripts/legal.mjs`, the `new-landing` and `brief-intake` skills, CLAUDE.md, `docs/status.md`.
- Network: `tile.openstreetmap.org` is in the session's allowed hosts (owner, 2026-11-07); without it the script exits 1 and the build keeps the address as text. CI never downloads tiles: map images are committed like any other image.
- Out of scope: geocoding (no Nominatim calls: coordinates come from the brief), custom tile styles, vector maps, routes, several markers, Google Maps.
