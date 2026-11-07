// OpenStreetMap tiles for scripts/static-map.mjs: Web Mercator tile maths, the list of tiles that cover a centred
// image, a polite one-at-a-time fetch with a 7-day cache, and the composition with sharp.
// Design: openspec/changes/add-maps/design.md. Usage policy: https://operations.osmfoundation.org/policies/tiles/
//
// tile.openstreetmap.org is a donated service: at most MAX_TILES tiles per render, never in parallel, an identifying
// User-Agent (no email), and the cache below so a re-render makes no request. Visitors never touch the tile server.
//
// Test hook, honored only when NODE_TEST_CONTEXT is set (the Node test runner sets it): OSM_TILE_URL (a template with
// {z}, {x} and {y}, for a local fake server). No flag or production setting can pick another server.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const USER_AGENT =
  'landing-factory/1.0 (+https://github.com/williamsnieves/landing-factory) static map at build time';
export const TILE_SIZE = 256;
export const MAX_TILES = 16;
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Pause after each network request (the cache hits need none). */
export const REQUEST_DELAY_MS = 250;
const MAX_TILE_BYTES = 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
/** Latitude limit of Web Mercator. */
export const MAX_LATITUDE = 85.0511;
export const MAX_ZOOM = 19;

/** An error whose message is safe to print. */
export class TileError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TileError';
  }
}

/** The tile URL template: the fake one from OSM_TILE_URL only in a test run. */
export function tileTemplate(env = process.env) {
  return env.NODE_TEST_CONTEXT && env.OSM_TILE_URL
    ? env.OSM_TILE_URL
    : TILE_URL;
}

/** Fractional tile coordinates of a point at a zoom (Web Mercator, slippy map). */
export function pointToTile(lat, lng, zoom) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    throw new TileError('the coordinates are not numbers');
  if (Math.abs(lat) > MAX_LATITUDE)
    throw new TileError(
      `latitude ${lat} is outside the map (Web Mercator stops at ${MAX_LATITUDE})`,
    );
  if (Math.abs(lng) > 180)
    throw new TileError(`longitude ${lng} is outside -180..180`);
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > MAX_ZOOM)
    throw new TileError(`zoom ${zoom} is outside 0..${MAX_ZOOM}`);
  const n = 2 ** zoom;
  const rad = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * n;
  const y = ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * n;
  return { x, y };
}

/**
 * The plan for an image of `width` x `height` pixels centred on a point: the tiles to fetch, the size of the stitched
 * canvas and where to crop. `scale` 2 reads tiles one zoom level deeper (sharper text, half the area).
 * Throws TileError when the point is off the map or more than `maxTiles` tiles would be needed.
 */
export function planTiles({
  lat,
  lng,
  zoom,
  width,
  height,
  scale = 1,
  maxTiles = MAX_TILES,
}) {
  if (!Number.isInteger(width) || !Number.isInteger(height))
    throw new TileError('width and height must be whole numbers of pixels');
  if (width < 64 || height < 64 || width > 2048 || height > 2048)
    throw new TileError('width and height must be between 64 and 2048 pixels');
  if (scale !== 1 && scale !== 2) throw new TileError('scale must be 1 or 2');
  const tileZoom = zoom + (scale === 2 ? 1 : 0);
  const { x, y } = pointToTile(lat, lng, tileZoom);
  const n = 2 ** tileZoom;
  const left = x * TILE_SIZE - width / 2;
  const top = y * TILE_SIZE - height / 2;
  const x0 = Math.floor(left / TILE_SIZE);
  const x1 = Math.floor((left + width - 1) / TILE_SIZE);
  const y0 = Math.floor(top / TILE_SIZE);
  const y1 = Math.floor((top + height - 1) / TILE_SIZE);
  if (y0 < 0 || y1 >= n)
    throw new TileError(
      'the image would reach past the north or south edge of the map; lower the size or the zoom',
    );
  const cols = x1 - x0 + 1;
  const rows = y1 - y0 + 1;
  if (cols * rows > maxTiles)
    throw new TileError(
      `the image needs ${cols * rows} tiles (${cols} x ${rows}); the limit is ${maxTiles} per render. Use a smaller --width/--height`,
    );
  const tiles = [];
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++)
      tiles.push({
        z: tileZoom,
        // The world repeats horizontally.
        x: ((tx % n) + n) % n,
        y: ty,
        col: tx - x0,
        row: ty - y0,
      });
  return {
    tileZoom,
    tiles,
    cols,
    rows,
    crop: {
      left: Math.round(left - x0 * TILE_SIZE),
      top: Math.round(top - y0 * TILE_SIZE),
      width,
      height,
    },
  };
}

export const tileUrl = (template, { z, x, y }) =>
  template.replace('{z}', z).replace('{x}', x).replace('{y}', y);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * Fetch the tiles one at a time (cache first). Returns [{ ...tile, bytes, cached }] in plan order. Nothing is
 * written to disk but the cache. Throws TileError naming the tile on any failure.
 */
export async function fetchTiles(
  tiles,
  {
    cacheDir,
    template = tileTemplate(),
    fetchFn = fetch,
    delayMs = REQUEST_DELAY_MS,
    now = Date.now(),
  } = {},
) {
  if (tiles.length > MAX_TILES)
    throw new TileError(
      `refusing ${tiles.length} tiles; the limit is ${MAX_TILES}`,
    );
  const out = [];
  for (const tile of tiles) {
    const name = `${tile.z}-${tile.x}-${tile.y}.png`;
    const file = cacheDir ? join(cacheDir, name) : null;
    if (
      file &&
      existsSync(file) &&
      now - statSync(file).mtimeMs < CACHE_TTL_MS
    ) {
      out.push({ ...tile, bytes: readFileSync(file), cached: true });
      continue;
    }
    const url = tileUrl(template, tile);
    let response;
    try {
      response = await fetchFn(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'image/png' },
      });
    } catch (error) {
      throw new TileError(
        `tile ${tile.z}/${tile.x}/${tile.y} could not be fetched (${error.cause?.code ?? error.message})`,
      );
    }
    if (!response.ok)
      throw new TileError(
        `tile ${tile.z}/${tile.x}/${tile.y} answered HTTP ${response.status}`,
      );
    const bytes = Buffer.from(await response.arrayBuffer());
    if (
      bytes.length > MAX_TILE_BYTES ||
      !bytes.subarray(0, 4).equals(PNG_SIGNATURE)
    )
      throw new TileError(
        `tile ${tile.z}/${tile.x}/${tile.y} is not a PNG image of a sane size`,
      );
    if (file) {
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(file, bytes);
    }
    out.push({ ...tile, bytes, cached: false });
    await sleep(delayMs);
  }
  return out;
}

/** Stitch the tiles and crop: returns a WebP buffer of plan.crop.width x plan.crop.height pixels. */
export async function composeImage(plan, fetched, { quality = 80 } = {}) {
  const canvas = sharp({
    create: {
      width: plan.cols * TILE_SIZE,
      height: plan.rows * TILE_SIZE,
      channels: 3,
      background: '#e8e4dc',
    },
  }).composite(
    fetched.map((tile) => ({
      input: tile.bytes,
      left: tile.col * TILE_SIZE,
      top: tile.row * TILE_SIZE,
    })),
  );
  const stitched = await canvas.png().toBuffer();
  return sharp(stitched).extract(plan.crop).webp({ quality }).toBuffer();
}
