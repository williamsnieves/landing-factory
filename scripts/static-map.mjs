#!/usr/bin/env node
// A static OpenStreetMap image for a landing, composed at build time from the brief's coordinates.
//
//   node scripts/static-map.mjs render --site <slug> [--width 1024 --height 512] [--zoom N] [--scale 1|2] [--dry-run]
//   node scripts/static-map.mjs render --lat <n> --lng <n> --out <file> [--zoom N] [--width W --height H] [--scale 1|2] [--dry-run]
//
// Reads contact.geo of sites/<slug>/brief.json, downloads only the tiles that cover the image (at most 16, one at a
// time, with a User-Agent that names landing-factory, cached 7 days in .cache/osm-tiles/), composes them with sharp and
// writes sites/<slug>/src/assets/images/map.webp. It records the entry in sites/<slug>/assets.json (source "osm",
// ODbL 1.0, the attribution, the coordinates; an earlier osm entry is replaced) and never geocodes. With --out and
// --lat/--lng it writes just the image there (no site, no manifest).
// Visitors never request a tile: the image is part of the build. Guide: docs/maps.md.
// Exit codes: 0 ok, 1 the tiles could not be fetched or the request was refused (nothing is written), 2 bad usage or
// no contact.geo in the brief.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  GEO_ZOOM_DEFAULT,
  getPath,
  validateBrief,
} from './lib/brief-schema.mjs';
import {
  MAX_TILES,
  TileError,
  composeImage,
  fetchTiles,
  planTiles,
  tileTemplate,
  tileUrl,
} from './lib/osm-tiles.mjs';
import { reexecWithEnvProxy } from './lib/proxy.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';

const FACTORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = () =>
  process.env.LANDING_FACTORY_ROOT
    ? resolve(process.env.LANDING_FACTORY_ROOT)
    : FACTORY_ROOT;

export const MAP_FILE = 'map.webp';
export const OSM_LICENSE = 'ODbL 1.0';
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
export const DEFAULT_WIDTH = 1024;
export const DEFAULT_HEIGHT = 512;

const HELP = `Usage: node scripts/static-map.mjs render (--site <slug> | --lat <n> --lng <n> --out <file>) [options]

Composes a static map image from OpenStreetMap tiles (docs/maps.md).

  --site <slug>     read contact.geo from sites/<slug>/brief.json; write src/assets/images/${MAP_FILE} and record it in assets.json
  --lat, --lng      coordinates without a site (needs --out); write a negative value as --lng=-0.88
  --out <file>      write only the image here: no manifest entry
  --width, --height size in pixels (default ${DEFAULT_WIDTH} x ${DEFAULT_HEIGHT}); the render may need at most ${MAX_TILES} tiles
  --zoom <12..18>   default: contact.geo.zoom, else ${GEO_ZOOM_DEFAULT}
  --scale 1|2       2 reads tiles one zoom level deeper: sharper text, half the area (default 1)
  --dry-run         print the tiles and the crop; no request, nothing written

Tiles are fetched one at a time with an identifying User-Agent and cached for 7 days in .cache/osm-tiles/.
Exit codes: 0 ok, 1 tiles could not be fetched or request refused, 2 bad usage or no contact.geo.
`;

class Usage extends Error {}

function readBrief(slug) {
  const file = join(repoRoot(), 'sites', slug, 'brief.json');
  if (!existsSync(file))
    throw new Usage(`sites/${slug}/brief.json does not exist`);
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Usage(
      `sites/${slug}/brief.json is not valid JSON: ${error.message}`,
    );
  }
}

const numberOption = (name, value) => {
  const n = Number(value);
  if (value === undefined || value === '' || !Number.isFinite(n))
    throw new Usage(`--${name} must be a number, got "${value}"`);
  return n;
};

function stamp() {
  return new Date().toISOString();
}

/** The entry for assets.json. */
export function mapEntry({ geo, zoom, tiles, title, scale, size }) {
  return {
    file: MAP_FILE,
    title,
    source: 'osm',
    license: OSM_LICENSE,
    attribution: OSM_ATTRIBUTION,
    url: OSM_COPYRIGHT_URL,
    geo: { lat: geo.lat, lng: geo.lng },
    zoom,
    scale,
    width: size.width,
    height: size.height,
    tiles,
    createdAt: stamp(),
    credit: true,
  };
}

export async function render(
  argv,
  io = { log: console.log, error: console.error },
) {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        site: { type: 'string' },
        lat: { type: 'string' },
        lng: { type: 'string' },
        out: { type: 'string' },
        width: { type: 'string' },
        height: { type: 'string' },
        zoom: { type: 'string' },
        scale: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    }));
  } catch (error) {
    io.error(`static-map: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  try {
    if (positionals[0] !== 'render' || positionals.length !== 1)
      throw new Usage('the only command is "render"');
    const slug = values.site;
    const bare = values.lat !== undefined || values.lng !== undefined;
    if (slug !== undefined && bare)
      throw new Usage('use --site or --lat/--lng, not both');
    let geo;
    let siteName = '';
    if (slug !== undefined) {
      if (!SLUG_PATTERN.test(slug)) throw new Usage(`invalid --site "${slug}"`);
      if (!existsSync(join(repoRoot(), 'sites', slug)))
        throw new Usage(`No site "${slug}" under sites/.`);
      const brief = readBrief(slug);
      const problems = validateBrief(brief, {
        baseDir: join(repoRoot(), 'sites', slug),
      }).filter((e) => e.path.startsWith('contact.geo'));
      if (problems.length)
        throw new Usage(
          `contact.geo is invalid: ${problems.map((e) => `${e.path} ${e.message}`).join('; ')}`,
        );
      const raw = getPath(brief, 'contact.geo');
      if (typeof raw?.lat !== 'number' || typeof raw?.lng !== 'number')
        throw new Usage(
          `sites/${slug}/brief.json has no contact.geo (latitude and longitude); read them on openstreetmap.org and add them with the brief tools, or leave the address as text`,
        );
      geo = { lat: raw.lat, lng: raw.lng, zoom: raw.zoom };
      siteName =
        getPath(brief, 'contact.address') || brief.business?.name || slug;
    } else if (bare && values.out) {
      geo = {
        lat: numberOption('lat', values.lat),
        lng: numberOption('lng', values.lng),
      };
    } else
      throw new Usage(
        'give --site <slug>, or --lat and --lng with --out <file>',
      );
    if (slug !== undefined && values.out)
      throw new Usage('--out is for a render without --site');

    const zoom =
      values.zoom !== undefined
        ? numberOption('zoom', values.zoom)
        : (geo.zoom ?? GEO_ZOOM_DEFAULT);
    if (!Number.isInteger(zoom) || zoom < 12 || zoom > 18)
      throw new Usage('--zoom must be a whole number from 12 to 18');
    const width =
      values.width !== undefined
        ? numberOption('width', values.width)
        : DEFAULT_WIDTH;
    const height =
      values.height !== undefined
        ? numberOption('height', values.height)
        : DEFAULT_HEIGHT;
    const scale =
      values.scale !== undefined ? numberOption('scale', values.scale) : 1;

    let plan;
    try {
      plan = planTiles({
        lat: geo.lat,
        lng: geo.lng,
        zoom,
        width,
        height,
        scale,
      });
    } catch (error) {
      if (error instanceof TileError) {
        io.error(`static-map: ${error.message}`);
        return 1;
      }
      throw error;
    }

    const template = tileTemplate();
    io.log(
      `static-map: ${geo.lat}, ${geo.lng} at zoom ${zoom}${scale === 2 ? ' (tiles one level deeper)' : ''}, ${width} x ${height} px, ${plan.tiles.length} tile(s) of level ${plan.tileZoom}`,
    );
    if (values['dry-run']) {
      for (const tile of plan.tiles) io.log(`  ${tileUrl(template, tile)}`);
      io.log(
        `crop: ${plan.crop.width} x ${plan.crop.height} at ${plan.crop.left},${plan.crop.top} of ${plan.cols * 256} x ${plan.rows * 256}. Dry run: nothing fetched or written.`,
      );
      return 0;
    }

    const root = repoRoot();
    let fetched;
    try {
      fetched = await fetchTiles(plan.tiles, {
        cacheDir: join(root, '.cache/osm-tiles'),
        template,
      });
    } catch (error) {
      if (error instanceof TileError) {
        io.error(
          `static-map: ${error.message}. Nothing was written; keep the address as text, or retry later (tile.openstreetmap.org must be reachable).`,
        );
        return 1;
      }
      throw error;
    }
    const image = await composeImage(plan, fetched);
    const network = fetched.filter((t) => !t.cached).length;

    if (values.out) {
      const target = resolve(values.out);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, image);
      io.log(
        `Saved ${target} (${(image.length / 1024).toFixed(0)} KB); ${network} tile(s) fetched, ${fetched.length - network} from the cache.`,
      );
      return 0;
    }

    const siteDir = join(root, 'sites', slug);
    const target = join(siteDir, 'src/assets/images', MAP_FILE);
    const manifestPath = join(siteDir, 'assets.json');
    const manifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, 'utf8'))
      : { images: [] };
    if (!manifest || !Array.isArray(manifest.images))
      throw new Usage(`sites/${slug}/assets.json: expected {"images": [...]}`);
    const clash = manifest.images.find(
      (e) => e.file === MAP_FILE && e.source !== 'osm',
    );
    if (clash)
      throw new Usage(
        `assets.json already lists ${MAP_FILE} from another source; rename that image first`,
      );
    manifest.images = manifest.images.filter((e) => e.source !== 'osm');
    manifest.images.push(
      mapEntry({
        geo,
        zoom,
        scale,
        size: { width, height },
        tiles: plan.tiles.length,
        title: `Map of ${siteName}`,
      }),
    );
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(`${target}.tmp`, image);
    renameSync(`${target}.tmp`, target);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    io.log(
      `Saved sites/${slug}/src/assets/images/${MAP_FILE} (${(image.length / 1024).toFixed(0)} KB); ${network} tile(s) fetched, ${fetched.length - network} from the cache.\nRecorded the osm entry in sites/${slug}/assets.json. Next: node scripts/credits.mjs --site ${slug}`,
    );
    return 0;
  } catch (error) {
    if (error instanceof Usage) {
      io.error(`static-map: ${error.message}\n\n${HELP}`);
      return 2;
    }
    throw error;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url) &&
  !reexecWithEnvProxy()
) {
  render(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(`static-map: ${error.message}`);
      process.exitCode = 1;
    },
  );
}
