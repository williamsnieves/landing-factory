# Maps

A local business wants its place on the page. The factory shows it as a **static map made from OpenStreetMap at build time**, with a marker, a visible attribution and directions links. No Google Maps embed: that one sets cookies before any consent, sends every visitor's IP address to Google, adds third-party JavaScript and fails the report's `legal-cookies` item unless a consent mechanism exists. Design: `openspec/changes/add-maps/design.md`. Owner decision (2026-11-07): OpenStreetMap, open data under the ODbL, no key, no cookies, attribution only.

## How it works

1. The brief has `contact.geo` (`lat` -90..90, `lng` -180..180, optional `zoom` 12..18, default 16) and, optionally, `contact.mapInteractive` (default false). A person reads the coordinates on openstreetmap.org: right-click the exact spot, "Show address", then latitude and longitude. **There is no geocoding**: nothing in the factory looks an address up (Nominatim has its own strict policy), and `/brief-intake` never guesses coordinates. On a prospect brief `contact.geo` is a fact like the address: it needs a `prospect.sources` entry or an `assumed` entry.
2. `node scripts/static-map.mjs render --site <slug>` downloads only the tiles that cover the image, composes them with `sharp` and writes `sites/<slug>/src/assets/images/map.webp`. It records the entry in `assets.json`: `source: "osm"`, `license: "ODbL 1.0"`, `attribution: "© OpenStreetMap contributors"`, `url: "https://www.openstreetmap.org/copyright"`, `geo`, `zoom`, `tiles`, `createdAt`, `credit: true` (an earlier `osm` entry is replaced). Then `node scripts/credits.mjs --site <slug>`.
3. `<LocationMap />` (`src/components/maps/`, an optional layer) shows the image, the marker, the attribution and the directions links.
4. The image is committed like any other image. CI never downloads tiles, and visitors never request one: the page makes no third-party request.

## The render

`node scripts/static-map.mjs render --site <slug> [--width 1024 --height 512] [--zoom N] [--scale 1|2] [--dry-run]`

- The default image is 1024 x 512 pixels centred on the point. `--scale 2` reads tiles one zoom level deeper (sharper labels, half the area). `--zoom` overrides `contact.geo.zoom`.
- `--dry-run` prints the tile URLs and the crop; nothing is requested or written.
- Without a site: `render --lat 41.6563 --lng=-0.8784 --out <file>` writes only the image (a negative number after a flag is written with `=`). The starter's demo image was made this way.
- Exit codes: 0 ok; 1 the tiles could not be fetched, or the request was refused (nothing is written, the page keeps the address as text); 2 bad usage, or no `contact.geo` in the brief (the message names the field).
- Tests use a local fake tile server: `OSM_TILE_URL` (a template with `{z}`, `{x}`, `{y}`) is honored only when `NODE_TEST_CONTEXT` is set, and the real tile server is never called by tests or CI.

## The tile usage policy

`tile.openstreetmap.org` is a donated service (<https://operations.osmfoundation.org/policies/tiles/>): heavy use, bulk downloads and missing identification are not allowed. The script therefore:

- fetches **at most 16 tiles per render** (a request that needs more is refused before any request: use a smaller `--width` and `--height`; the default needs at most 15), **one at a time** with a pause after each request, never in parallel;
- sends a `User-Agent` that names the tool (`landing-factory/1.0 (+https://github.com/williamsnieves/landing-factory) static map at build time`, no email address);
- caches every tile for **7 days** in `.cache/osm-tiles/` (git-ignored), so a second render makes no request;
- accepts only a PNG of a sane size, and never sends a visitor to the tile server.

Do not loop the command, do not render several maps per landing, and do not run it in CI.

## Attribution (ODbL)

The map must show "© OpenStreetMap contributors" next to it, linked to <https://www.openstreetmap.org/copyright>. The component does this (`es`: "© Colaboradores de OpenStreetMap"). `credits.mjs` lists the map under a "Maps" heading in `CREDITS.md` (attribution, license, location, date) and adds one footer credit line, "Map data © OpenStreetMap contributors". The final check `map-attribution` fails a built page that shows the map (the `[data-location-map]` figure or the map image) without a visible link to the copyright page naming OpenStreetMap, or a map on a page with no `osm` entry in `assets.json`. A site with no map is not checked.

## The component

`<LocationMap image={map} geo={geo} address="..." label="..." locale="es" interactive={false} />`

- A `<figure>` with the image (`alt` names the address: "Map of ..." / "Mapa de ..."), a marker drawn in HTML and CSS at the centre in the site's primary colour (`var(--color-primary)`; the image is centred on the point), the visible attribution, the address, and "Get directions" / "Cómo llegar" links to Google Maps, Apple Maps and OpenStreetMap built from the coordinates. They are plain links: nothing is requested from any of those hosts until the visitor clicks. Texts are in `texts.ts` (`en`, `es`; any other locale shows English).
- **Interactive map (optional, off by default).** With `interactive`, a link-button "Load the interactive map" swaps the image for the OpenStreetMap embed (`https://www.openstreetmap.org/export/embed.html` with a bounding box and the marker) **only after a click**. The embed URL waits in a `data-consent-src` attribute (the placeholder convention the landing report already understands) and `client.ts`, an Astro-processed module script (never `is:inline`), creates the iframe on click. Without JavaScript the button is a link to openstreetmap.org. The CSP has no `frame-src` restriction, so no directive changes.
- **Legal.** The static image needs no mention: no request leaves the page. With `contact.mapInteractive: true`, `node scripts/legal.mjs --site <slug> --write` adds OpenStreetMap (the OpenStreetMap Foundation, United Kingdom; it receives the visitor's IP address after the click) to `processing.embeds`, so the privacy policy names it (that needs a legal market in the brief). The report classifies `openstreetmap.org` as an `embed` host: behind the click placeholder it passes `legal-cookies` with the usual "verify the consent mechanism" warning; loaded directly (an `iframe` in the HTML) it fails like any embed.
- **Layer.** `maps` is an optional layer like `3d`, `legal` and `forms` (`scripts/site-layers.mjs`): `new-site` copies `src/components/maps/` into every site, the build prunes it when no page imports it, `add maps --site <slug>` restores it.
- **Starter demo.** `/maps/` (`noindex`) shows the component with `src/assets/images/map-demo.webp`, a render of Plaza del Pilar in Zaragoza (© OpenStreetMap contributors, ODbL 1.0; made with `render --lat 41.6563 --lng=-0.8784 --out src/assets/images/map-demo.webp --width 768 --height 384`). The starter has no `assets.json`, so the demo page's own attribution line is its credit; delete the folder and the image in a real landing.

## Generation

`/new-landing` with a brief that has `contact.geo` runs `static-map.mjs render` before the build and then `credits.mjs`, and places `<LocationMap />` in the contact or location section. Prospects may use it (OpenStreetMap is not the prospect's brand) with sourced or assumed coordinates. Without `contact.geo` nothing changes. When the tile host is unreachable the render exits 1 and the page keeps the address as text.

## Out of scope

Geocoding (no Nominatim calls), custom tile styles, vector maps, routes, several markers, Google Maps, tiles downloaded in CI or by visitors.
