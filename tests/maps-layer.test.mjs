// The `maps` layer (add-maps, tasks 3.1 and 3.2): prune, add and check on fixture sites in a temporary factory root,
// the new-site copy, the pure link helpers and the component source. The real sites are never touched.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  OSM_COPYRIGHT_URL,
  directionsLinks,
  embedUrl,
  openUrl,
} from '../src/components/maps/geo.ts';
import { mapTexts } from '../src/components/maps/texts.ts';
import { COPIED_PATHS } from '../scripts/new-site.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCRIPT = join(ROOT, 'scripts/site-layers.mjs');
const tmp = mkdtempSync(join(tmpdir(), 'maps-layer-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const put = (base, path, text = '') => {
  mkdirSync(dirname(join(base, path)), { recursive: true });
  writeFileSync(join(base, path), text);
};
const component = (name) =>
  readFileSync(join(ROOT, 'src/components/maps', name), 'utf8');

function factory() {
  const root = mkdtempSync(join(tmp, 'root-'));
  put(
    root,
    'package.json',
    JSON.stringify({ name: 'fixture', dependencies: {}, devDependencies: {} }),
  );
  put(root, 'src/components/maps/LocationMap.astro', '---\n---\n<figure />\n');
  put(root, 'src/components/maps/client.ts', 'export {};\n');
  return root;
}

function site(root, slug, files = {}) {
  const dir = join(root, 'sites', slug);
  put(dir, 'package.json', JSON.stringify({ name: `site-${slug}` }));
  put(dir, 'src/components/maps/LocationMap.astro', '---\n---\n<figure />\n');
  put(dir, 'src/components/maps/client.ts', 'export {};\n');
  put(dir, 'src/pages/index.astro', '---\n---\n<h1>Home</h1>\n');
  for (const [path, text] of Object.entries(files)) put(dir, path, text);
  return dir;
}

function run(root, ...args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, LANDING_FACTORY_ROOT: root },
  });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

const USES_MAP =
  "---\nimport LocationMap from '../components/maps/LocationMap.astro';\n---\n<LocationMap />\n";

test('new-site copies the maps components, and the layer is registered', async () => {
  assert.ok(COPIED_PATHS.includes('src/components/maps'));
  const { LAYERS } = await import('../scripts/site-layers.mjs');
  assert.deepEqual(LAYERS.maps.paths, ['src/components/maps']);
  assert.equal(LAYERS.maps.requires, undefined);
});

test('check fails for an unused maps layer until prune removes it', () => {
  const root = factory();
  const dir = site(root, 'plain');
  const before = run(root, 'check', '--site', 'plain');
  assert.equal(before.code, 1);
  assert.match(before.err, /plain: holds the maps components/);
  const pruned = run(root, 'prune', '--site', 'plain');
  assert.equal(pruned.code, 0, pruned.err);
  assert.ok(!existsSync(join(dir, 'src/components/maps')));
  assert.ok(existsSync(join(dir, 'src/pages/index.astro')));
  assert.equal(run(root, 'check', '--site', 'plain').code, 0);
});

test('a page that imports the map component keeps the layer', () => {
  const root = factory();
  const dir = site(root, 'places', { 'src/pages/contact.astro': USES_MAP });
  assert.equal(run(root, 'check', '--site', 'places').code, 0);
  const result = run(root, 'prune', '--site', 'places');
  assert.equal(result.code, 0, result.err);
  assert.ok(existsSync(join(dir, 'src/components/maps/LocationMap.astro')));
});

test('add maps restores the layer from the starter and refuses when it exists', () => {
  const root = factory();
  const dir = site(root, 'again');
  assert.equal(run(root, 'prune', '--site', 'again').code, 0);
  const added = run(root, 'add', 'maps', '--site', 'again');
  assert.equal(added.code, 0, added.err);
  assert.equal(
    readFileSync(join(dir, 'src/components/maps/client.ts'), 'utf8'),
    'export {};\n',
  );
  const again = run(root, 'add', 'maps', '--site', 'again');
  assert.equal(again.code, 1);
  assert.match(again.err, /already exists/);
});

test('every existing site passes the layer check without a maps layer', () => {
  const result = spawnSync(process.execPath, [SCRIPT, 'check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('directions links are plain links built from the coordinates', () => {
  const links = directionsLinks({ lat: 41.6563, lng: -0.8784 });
  assert.equal(
    links.google,
    'https://www.google.com/maps/dir/?api=1&destination=41.6563,-0.8784',
  );
  assert.equal(links.apple, 'https://maps.apple.com/?daddr=41.6563,-0.8784');
  assert.equal(
    links.osm,
    'https://www.openstreetmap.org/directions?route=%3B41.6563%2C-0.8784',
  );
  assert.equal(
    openUrl({ lat: 41.6563, lng: -0.8784 }),
    'https://www.openstreetmap.org/?mlat=41.6563&mlon=-0.8784#map=16/41.6563/-0.8784',
  );
  assert.equal(OSM_COPYRIGHT_URL, 'https://www.openstreetmap.org/copyright');
});

test('the embed URL has a bounding box around the point, the marker and the OpenStreetMap host', () => {
  const geo = { lat: 41.6563, lng: -0.8784, zoom: 16 };
  const url = new URL(embedUrl(geo));
  assert.equal(
    url.origin + url.pathname,
    'https://www.openstreetmap.org/export/embed.html',
  );
  const [west, south, east, north] = url.searchParams
    .get('bbox')
    .split(',')
    .map(Number);
  assert.ok(west < geo.lng && geo.lng < east);
  assert.ok(south < geo.lat && geo.lat < north);
  // 1024 px of 256 px tiles at zoom 16 span 4 tiles of 360 / 2^16 degrees.
  assert.ok(Math.abs(east - west - (4 * 360) / 2 ** 16) < 1e-4);
  assert.equal(url.searchParams.get('marker'), '41.6563,-0.8784');
  assert.equal(url.searchParams.get('layer'), 'mapnik');
});

test('English and Spanish texts exist, name the address and fall back to English', () => {
  assert.equal(mapTexts('es').directionsHeading, 'Cómo llegar');
  assert.equal(mapTexts('en').directionsHeading, 'Get directions');
  assert.equal(mapTexts('es-ES').directionsHeading, 'Cómo llegar');
  assert.equal(mapTexts('de').directionsHeading, 'Get directions');
  assert.match(mapTexts('es').alt('Calle Alameda 12'), /Calle Alameda 12/);
  assert.match(mapTexts('en').alt('Calle Alameda 12'), /Calle Alameda 12/);
  for (const language of ['en', 'es']) {
    const t = mapTexts(language);
    assert.match(t.attribution, /OpenStreetMap/);
    assert.ok(t.embedTitle('x').includes('x'));
  }
});

test('the component source: tokens for the marker, the click-only embed, a module script and no third-party load', () => {
  const astro = component('LocationMap.astro');
  assert.match(astro, /var\(--color-primary\)/);
  assert.match(astro, /data-location-map/);
  assert.match(astro, /data-consent-src/);
  assert.doesNotMatch(astro, /is:inline/);
  // No src/href loads from a third party at render time: the only external hrefs are the visible attribution
  // and the directions links (plain anchors), never an iframe, script, img or link tag.
  assert.doesNotMatch(
    astro,
    /<(iframe|link|script)\b[^>]*(src|href)=["']https?:/,
  );
  assert.doesNotMatch(astro, /<img\b[^>]*src=["']https?:/);
  assert.doesNotMatch(astro, /#[0-9a-f]{3,8}\b/i, 'no hard-coded color');
  const client = component('client.ts');
  // Astro may inline this script into the page, where the report would read a host name as a load without consent.
  assert.doesNotMatch(client, /openstreetmap\.org/);
  assert.doesNotMatch(client, /fetch\(/);
  assert.match(
    component('geo.ts'),
    /not requested until the visitor clicks|plain links/i,
  );
});
