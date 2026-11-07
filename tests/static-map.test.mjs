// scripts/lib/osm-tiles.mjs and scripts/static-map.mjs against a local fake tile server (tiles are PNGs generated at
// runtime). The real tile server is never called by the tests.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import {
  CACHE_TTL_MS,
  MAX_TILES,
  TILE_URL,
  TileError,
  USER_AGENT,
  fetchTiles,
  planTiles,
  pointToTile,
  tileTemplate,
} from '../scripts/lib/osm-tiles.mjs';
import { render } from '../scripts/static-map.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCRIPT = join(ROOT, 'scripts/static-map.mjs');
const tmp = mkdtempSync(join(tmpdir(), 'static-map-test-'));

let server;
let base;
let tilePng;
const requests = [];
let mode = 'ok';
let inFlight = 0;
let maxInFlight = 0;

before(async () => {
  tilePng = await sharp({
    create: { width: 256, height: 256, channels: 3, background: '#9cc' },
  })
    .png()
    .toBuffer();
  server = createServer((req, res) => {
    requests.push({ url: req.url, agent: req.headers['user-agent'] });
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    setTimeout(() => {
      inFlight--;
      if (mode === 'fail') {
        res.writeHead(503).end('busy');
      } else if (mode === 'text') {
        res.writeHead(200, { 'content-type': 'image/png' }).end('not a png');
      } else res.writeHead(200, { 'content-type': 'image/png' }).end(tilePng);
    }, 5);
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}/{z}/{x}/{y}.png`;
});
after(() => {
  server.close();
  rmSync(tmp, { recursive: true, force: true });
});

const quiet = () => {
  const lines = [];
  return {
    log: (m) => lines.push(m),
    error: (m) => lines.push(m),
    text: () => lines.join('\n'),
  };
};

function factory(geo = { lat: 41.6563, lng: -0.8784 }) {
  const root = mkdtempSync(join(tmp, 'root-'));
  const dir = join(root, 'sites/demo');
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"name":"site-demo"}');
  writeFileSync(
    join(dir, 'brief.json'),
    JSON.stringify({
      version: 1,
      language: 'en',
      business: { name: 'Demo Clinic', description: 'A clinic.' },
      contact: { address: 'Plaza del Pilar, Zaragoza', geo },
    }),
  );
  writeFileSync(join(dir, 'assets.json'), '{"images":[]}\n');
  return { root, dir };
}

/** Run render() in-process with the fake server and the temporary root. */
async function run(root, args) {
  process.env.LANDING_FACTORY_ROOT = root;
  process.env.OSM_TILE_URL = base;
  const io = quiet();
  const before = requests.length;
  const code = await render(args, io);
  return { code, out: io.text(), requested: requests.length - before };
}

test('tile numbers of known points', () => {
  // London at zoom 10 is tile 511/340; (0, 0) is the corner shared by the four tiles of zoom 1.
  const london = pointToTile(51.5074, -0.1278, 10);
  assert.equal(Math.floor(london.x), 511);
  assert.equal(Math.floor(london.y), 340);
  assert.deepEqual(pointToTile(0, 0, 1), { x: 1, y: 1 });
  const pilar = pointToTile(41.6563, -0.8784, 16);
  assert.equal(Math.floor(pilar.x), 32608);
  assert.equal(Math.floor(pilar.y), 24412);
});

test('points off the map and bad zoom are refused', () => {
  assert.throws(() => pointToTile(86, 0, 10), TileError);
  assert.throws(() => pointToTile(0, 181, 10), TileError);
  assert.throws(() => pointToTile(0, 0, 25), TileError);
  assert.throws(
    () => planTiles({ lat: 85, lng: 0, zoom: 2, width: 1024, height: 512 }),
    /north or south edge/,
  );
});

test('the plan covers the image, wraps the date line and stays within the cap', () => {
  const plan = planTiles({
    lat: 41.6563,
    lng: -0.8784,
    zoom: 16,
    width: 1024,
    height: 512,
  });
  assert.ok(plan.tiles.length <= MAX_TILES);
  assert.equal(plan.tiles.length, plan.cols * plan.rows);
  assert.ok(plan.cols * 256 >= plan.crop.left + 1024);
  assert.ok(plan.rows * 256 >= plan.crop.top + 512);
  const wrap = planTiles({
    lat: 0,
    lng: 179.99,
    zoom: 12,
    width: 512,
    height: 256,
  });
  assert.ok(wrap.tiles.every((t) => t.x >= 0 && t.x < 2 ** 12));
  assert.ok(
    wrap.tiles.some((t) => t.x === 0) && wrap.tiles.some((t) => t.x === 4095),
  );
  const deeper = planTiles({
    lat: 41.6563,
    lng: -0.8784,
    zoom: 16,
    width: 512,
    height: 256,
    scale: 2,
  });
  assert.equal(deeper.tileZoom, 17);
});

test('more than the cap needs is refused before any request', async () => {
  assert.throws(
    () =>
      planTiles({ lat: 41.6, lng: -0.9, zoom: 16, width: 2048, height: 2048 }),
    /limit is 16/,
  );
  await assert.rejects(
    fetchTiles(Array.from({ length: 17 }, (_, i) => ({ z: 1, x: i, y: 0 }))),
    /limit is 16/,
  );
});

test('the production template is the OSM server; OSM_TILE_URL needs a test run', () => {
  assert.equal(tileTemplate({}), TILE_URL);
  assert.equal(tileTemplate({ OSM_TILE_URL: base }), TILE_URL);
  assert.equal(
    tileTemplate({ OSM_TILE_URL: base, NODE_TEST_CONTEXT: '1' }),
    base,
  );
  assert.match(
    USER_AGENT,
    /^landing-factory\/1\.0 \(\+https:\/\/github\.com\/.+\)/,
  );
  assert.doesNotMatch(USER_AGENT, /@/);
});

test('fetch is sequential, identifies itself and caches for 7 days', async () => {
  const cacheDir = join(tmp, 'cache');
  const tiles = [
    { z: 3, x: 1, y: 1 },
    { z: 3, x: 2, y: 1 },
    { z: 3, x: 3, y: 1 },
  ];
  requests.length = 0;
  maxInFlight = 0;
  const first = await fetchTiles(tiles, {
    cacheDir,
    template: base,
    delayMs: 0,
  });
  assert.equal(requests.length, 3);
  assert.equal(maxInFlight, 1);
  assert.ok(requests.every((r) => r.agent === USER_AGENT));
  assert.ok(first.every((t) => !t.cached));
  const again = await fetchTiles(tiles, {
    cacheDir,
    template: base,
    delayMs: 0,
  });
  assert.equal(requests.length, 3, 'a cache hit makes no request');
  assert.ok(again.every((t) => t.cached));
  // An old cache entry is fetched again.
  const old = join(cacheDir, '3-1-1.png');
  const past = new Date(Date.now() - CACHE_TTL_MS - 60_000);
  utimesSync(old, past, past);
  await fetchTiles(tiles, { cacheDir, template: base, delayMs: 0 });
  assert.equal(requests.length, 4);
});

test('an error status or a body that is not a PNG fails naming the tile', async () => {
  mode = 'fail';
  await assert.rejects(
    fetchTiles([{ z: 3, x: 4, y: 4 }], { template: base, delayMs: 0 }),
    /tile 3\/4\/4 answered HTTP 503/,
  );
  mode = 'text';
  await assert.rejects(
    fetchTiles([{ z: 3, x: 4, y: 4 }], { template: base, delayMs: 0 }),
    /not a PNG/,
  );
  mode = 'ok';
});

test('render writes map.webp and one osm entry with the coordinates, and replaces it on a second run', async () => {
  const { root, dir } = factory();
  const result = await run(root, ['render', '--site', 'demo']);
  assert.equal(result.code, 0, result.out);
  assert.ok(result.requested > 0 && result.requested <= MAX_TILES);
  const file = join(dir, 'src/assets/images/map.webp');
  const meta = await sharp(file).metadata();
  assert.deepEqual([meta.format, meta.width, meta.height], ['webp', 1024, 512]);
  const manifest = JSON.parse(readFileSync(join(dir, 'assets.json'), 'utf8'));
  assert.equal(manifest.images.length, 1);
  const [entry] = manifest.images;
  assert.equal(entry.file, 'map.webp');
  assert.equal(entry.source, 'osm');
  assert.equal(entry.license, 'ODbL 1.0');
  assert.equal(entry.attribution, '© OpenStreetMap contributors');
  assert.equal(entry.url, 'https://www.openstreetmap.org/copyright');
  assert.deepEqual(entry.geo, { lat: 41.6563, lng: -0.8784 });
  assert.equal(entry.zoom, 16);
  assert.equal(entry.credit, true);
  assert.equal(entry.tiles, result.requested);
  assert.match(entry.createdAt, /^\d{4}-\d\d-\d\dT/);
  // Second run: tiles come from the cache, and there is still one entry.
  const second = await run(root, ['render', '--site', 'demo', '--zoom', '15']);
  assert.equal(second.code, 0);
  const again = JSON.parse(readFileSync(join(dir, 'assets.json'), 'utf8'));
  assert.equal(again.images.length, 1);
  assert.equal(again.images[0].zoom, 15);
});

test('--dry-run lists the tiles and writes and requests nothing', async () => {
  const { root, dir } = factory();
  const result = await run(root, ['render', '--site', 'demo', '--dry-run']);
  assert.equal(result.code, 0);
  assert.equal(result.requested, 0);
  assert.match(result.out, /\/16\/\d+\/\d+\.png/);
  assert.ok(!existsSync(join(dir, 'src/assets')));
  assert.equal(
    readFileSync(join(dir, 'assets.json'), 'utf8'),
    '{"images":[]}\n',
  );
});

test('exit 2 without contact.geo or with bad usage, writing nothing', async () => {
  const { root, dir } = factory({});
  const result = await run(root, ['render', '--site', 'demo']);
  assert.equal(result.code, 2);
  assert.match(result.out, /no contact\.geo/);
  assert.equal(result.requested, 0);
  assert.ok(!existsSync(join(dir, 'src/assets')));
  assert.equal((await run(root, ['render'])).code, 2);
  assert.equal((await run(root, ['render', '--site', 'nope'])).code, 2);
  assert.equal((await run(root, ['render', '--site', 'Bad Slug'])).code, 2);
  assert.equal(
    (await run(root, ['render', '--site', 'demo', '--zoom', '30'])).code,
    2,
  );
  const bad = factory({ lat: 95, lng: 0 });
  const invalid = await run(bad.root, ['render', '--site', 'demo']);
  assert.equal(invalid.code, 2);
  assert.match(invalid.out, /contact\.geo\.lat/);
});

test('exit 1 when the tiles cannot be fetched, writing nothing', async () => {
  const { root, dir } = factory();
  mode = 'fail';
  const result = await run(root, ['render', '--site', 'demo']);
  mode = 'ok';
  assert.equal(result.code, 1);
  assert.match(result.out, /HTTP 503/);
  assert.ok(!existsSync(join(dir, 'src/assets')));
  assert.equal(
    readFileSync(join(dir, 'assets.json'), 'utf8'),
    '{"images":[]}\n',
  );
  const tooBig = await run(root, [
    'render',
    '--site',
    'demo',
    '--width',
    '2000',
    '--height',
    '2000',
  ]);
  assert.equal(tooBig.code, 1);
  assert.match(tooBig.out, /limit is 16/);
});

test('--out with --lat and --lng writes only the image', async () => {
  const { root } = factory();
  const out = join(tmp, 'solo', 'map.webp');
  const result = await run(root, [
    'render',
    '--lat',
    '41.6563',
    '--lng=-0.8784',
    '--out',
    out,
    '--width',
    '512',
    '--height',
    '256',
  ]);
  assert.equal(result.code, 0, result.out);
  assert.equal((await sharp(out).metadata()).width, 512);
  assert.equal(
    (await run(root, ['render', '--lat', '1', '--lng', '2'])).code,
    2,
  );
});

test('a real process: usage and --dry-run exit codes', () => {
  const env = { ...process.env, LANDING_FACTORY_ROOT: tmp };
  delete env.OSM_TILE_URL;
  const help = spawnSync(process.execPath, [SCRIPT, '--help'], {
    encoding: 'utf8',
    env,
  });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /render/);
  const none = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', env });
  assert.equal(none.status, 2);
  const dry = spawnSync(
    process.execPath,
    [
      SCRIPT,
      'render',
      '--lat',
      '41.6563',
      '--lng=-0.8784',
      '--out',
      join(tmp, 'x.webp'),
      '--dry-run',
    ],
    { encoding: 'utf8', env },
  );
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /tile\.openstreetmap\.org/);
});
