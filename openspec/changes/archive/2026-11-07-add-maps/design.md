# Design: add-maps

## Static image first
A built image keeps the page free of third-party requests (Lighthouse, CSP, privacy) and works without JavaScript. The marker is HTML and CSS over the centre of the image, so it takes the site's primary colour and stays sharp, and the image itself is plain OSM tiles.

## OSM tile usage policy
`tile.openstreetmap.org` is a donated service: heavy use, bulk downloads and missing identification are not allowed. One render per landing fetches at most 16 tiles, one at a time, with a `User-Agent` naming the tool, and reuses a 7-day cache. Visitors never touch the tile server. Attribution "© OpenStreetMap contributors" is visible next to the map and links to the copyright page (ODbL requirement).

## Tile maths
Web Mercator: for zoom z, `x = (lng + 180) / 360 * 2^z`, `y = (1 - ln(tan(lat) + sec(lat)) / π) / 2 * 2^z`. The image is centred on the point; the tiles covering `width x height` (at 2x: zoom + 1 with the same area) are fetched, composed with `sharp` and cropped. Bounds are clamped; a request outside the world is refused.

## No geocoding
Nominatim has its own strict policy and is not reachable from the session. A person reads the coordinates from openstreetmap.org (right-click, "Show address") and puts them in the brief; for a prospect they are sourced or assumed like any fact.

## Interactive map
Optional, off by default. It loads only on click (the visitor's choice), through the existing `data-consent-src` placeholder convention, so the report already treats it as gated. The CSP has no `frame-src` restriction today, so no directive changes.
