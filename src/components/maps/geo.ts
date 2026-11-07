// Coordinates to links for <LocationMap />: plain links (nothing is requested until the visitor clicks) and the
// bounding box of the OpenStreetMap embed. Pure functions; tests/maps-layer.test.mjs checks them.

export interface Geo {
  lat: number;
  lng: number;
  /** 12..18, default 16 (the zoom of the static image). */
  zoom?: number;
}

export const DEFAULT_ZOOM = 16;
export const OSM_ORIGIN = 'https://www.openstreetmap.org';
export const OSM_COPYRIGHT_URL = `${OSM_ORIGIN}/copyright`;
export const OSM_EMBED_URL = `${OSM_ORIGIN}/export/embed.html`;

/** A coordinate as a short decimal string (no exponent, at most 6 decimals). */
const coordinate = (value: number): string => String(Number(value.toFixed(6)));

export const directionsLinks = ({ lat, lng }: Geo) => {
  const point = `${coordinate(lat)},${coordinate(lng)}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${point}`,
    apple: `https://maps.apple.com/?daddr=${point}`,
    osm: `${OSM_ORIGIN}/directions?route=%3B${encodeURIComponent(point)}`,
  };
};

/** The page of the place on openstreetmap.org: the no-JavaScript target of the interactive map button. */
export const openUrl = ({ lat, lng, zoom = DEFAULT_ZOOM }: Geo): string =>
  `${OSM_ORIGIN}/?mlat=${coordinate(lat)}&mlon=${coordinate(lng)}#map=${zoom}/${coordinate(lat)}/${coordinate(lng)}`;

/**
 * The OpenStreetMap embed URL: a bounding box around the point (about `width` x `height` pixels at the zoom, in
 * 256 px tiles) and the marker. Loaded only after a click.
 */
export function embedUrl(
  { lat, lng, zoom = DEFAULT_ZOOM }: Geo,
  width = 1024,
  height = 512,
): string {
  const lngSpan = ((width / 256) * 360) / 2 ** zoom;
  // A degree of latitude shrinks with cos(lat) in Web Mercator.
  const latSpan =
    (((height / 256) * 360) / 2 ** zoom) * Math.cos((lat * Math.PI) / 180);
  const box = [
    lng - lngSpan / 2,
    lat - latSpan / 2,
    lng + lngSpan / 2,
    lat + latSpan / 2,
  ]
    .map(coordinate)
    .join(',');
  return `${OSM_EMBED_URL}?bbox=${encodeURIComponent(box)}&layer=mapnik&marker=${encodeURIComponent(`${coordinate(lat)},${coordinate(lng)}`)}`;
}
