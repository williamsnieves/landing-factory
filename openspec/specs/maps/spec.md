# maps Specification

## Purpose
A business location shown as a static OpenStreetMap image composed at build time (no key, no cookies, no third-party request at page load), with the visible ODbL attribution, directions links and an optional click-to-load embed, and the checks that keep the attribution on the page.

## Requirements

### Requirement: Static map from OpenStreetMap at build time
`scripts/static-map.mjs render --site <slug>` SHALL compose a map image centred on the brief's `contact.geo` from at most 16 OpenStreetMap tiles fetched one at a time with an identifying `User-Agent` and a 7-day cache, write it into the site's images and record it in `assets.json` with `source: "osm"`, the ODbL license, the attribution and the coordinates. It SHALL exit 2 without `contact.geo` and 1 when the tiles cannot be fetched, writing nothing.

#### Scenario: Render
- **WHEN** the brief has `contact.geo` `{ lat: 41.65, lng: -0.88 }` and the tile server answers
- **THEN** `src/assets/images/map.webp` exists and `assets.json` has one `osm` entry with those coordinates and `credit: true`

#### Scenario: No coordinates
- **WHEN** the brief has no `contact.geo`
- **THEN** the command exits 2 naming the field and writes nothing

### Requirement: Location map component
The maps layer SHALL render the image with an `alt` naming the address, a marker at its centre, the visible attribution linked to the OpenStreetMap copyright page and directions links to Google Maps, Apple Maps and OpenStreetMap, and SHALL make no third-party request before the visitor clicks. The interactive map SHALL load only after a click.

#### Scenario: Page load
- **WHEN** a page with `<LocationMap />` loads
- **THEN** no request goes to a host other than the page's own

### Requirement: Map attribution check
`check-landing` SHALL fail (`map-attribution`) when `assets.json` has an `osm` entry and a built page shows the map without the visible attribution linked to `https://www.openstreetmap.org/copyright`.

#### Scenario: Attribution removed
- **WHEN** the map image is on the home page and the attribution is not
- **THEN** `check-landing` exits 1 naming `map-attribution` and the page
