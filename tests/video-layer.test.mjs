// The `video` layer (add-video, tasks 2.1 and 2.2): prune, add and check on fixture sites in a temporary factory
// root, the new-site copy, the texts and the component source. The real sites are never touched.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { videoTexts } from '../src/components/video/texts.ts';
import { COPIED_PATHS } from '../scripts/new-site.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCRIPT = join(ROOT, 'scripts/site-layers.mjs');
const tmp = mkdtempSync(join(tmpdir(), 'video-layer-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const put = (base, path, text = '') => {
  mkdirSync(dirname(join(base, path)), { recursive: true });
  writeFileSync(join(base, path), text);
};
const component = (name) =>
  readFileSync(join(ROOT, 'src/components/video', name), 'utf8');

function factory() {
  const root = mkdtempSync(join(tmp, 'root-'));
  put(
    root,
    'package.json',
    JSON.stringify({ name: 'fixture', dependencies: {}, devDependencies: {} }),
  );
  put(root, 'src/components/video/VideoLoop.astro', '---\n---\n<figure />\n');
  put(root, 'src/components/video/client.ts', 'export {};\n');
  return root;
}

function site(root, slug, files = {}) {
  const dir = join(root, 'sites', slug);
  put(dir, 'package.json', JSON.stringify({ name: `site-${slug}` }));
  put(dir, 'src/components/video/VideoLoop.astro', '---\n---\n<figure />\n');
  put(dir, 'src/components/video/client.ts', 'export {};\n');
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

const USES_VIDEO =
  "---\nimport VideoLoop from '../components/video/VideoLoop.astro';\n---\n<VideoLoop />\n";

test('new-site copies the video components, and the layer is registered', async () => {
  assert.ok(COPIED_PATHS.includes('src/components/video'));
  const { LAYERS } = await import('../scripts/site-layers.mjs');
  assert.deepEqual(LAYERS.video.paths, ['src/components/video']);
  assert.equal(LAYERS.video.requires, undefined);
});

test('check fails for an unused video layer until prune removes it', () => {
  const root = factory();
  const dir = site(root, 'plain');
  const before = run(root, 'check', '--site', 'plain');
  assert.equal(before.code, 1);
  assert.match(before.err, /plain: holds the video components/);
  const pruned = run(root, 'prune', '--site', 'plain');
  assert.equal(pruned.code, 0, pruned.err);
  assert.ok(!existsSync(join(dir, 'src/components/video')));
  assert.ok(existsSync(join(dir, 'src/pages/index.astro')));
  assert.equal(run(root, 'check', '--site', 'plain').code, 0);
});

test('a page that imports VideoLoop keeps the layer', () => {
  const root = factory();
  const dir = site(root, 'films', { 'src/pages/reel.astro': USES_VIDEO });
  assert.equal(run(root, 'check', '--site', 'films').code, 0);
  const result = run(root, 'prune', '--site', 'films');
  assert.equal(result.code, 0, result.err);
  assert.ok(existsSync(join(dir, 'src/components/video/VideoLoop.astro')));
});

test('add video restores the layer from the starter and refuses when it exists', () => {
  const root = factory();
  const dir = site(root, 'again');
  assert.equal(run(root, 'prune', '--site', 'again').code, 0);
  const added = run(root, 'add', 'video', '--site', 'again');
  assert.equal(added.code, 0, added.err);
  assert.equal(
    readFileSync(join(dir, 'src/components/video/client.ts'), 'utf8'),
    'export {};\n',
  );
  const again = run(root, 'add', 'video', '--site', 'again');
  assert.equal(again.code, 1);
  assert.match(again.err, /already exists/);
});

test('every existing site passes the layer check without a video layer', () => {
  const result = spawnSync(process.execPath, [SCRIPT, 'check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('English and Spanish button labels exist and anything else falls back to English', () => {
  assert.equal(videoTexts('en').pause, 'Pause video');
  assert.match(videoTexts('es').pause, /Pausar/);
  assert.match(videoTexts('es-MX').play, /Reproducir/);
  assert.equal(videoTexts('fr').pause, 'Pause video');
  assert.equal(videoTexts().play, 'Play video');
});

test('the component source: muted, looping, inline, no autoplay, preload none, a poster picture, a button and a module script', () => {
  const astro = component('VideoLoop.astro');
  const video = /<video\s[^>]*>/.exec(astro)?.[0] ?? '';
  for (const attribute of ['muted', 'loop', 'playsinline', 'preload="none"'])
    assert.ok(video.includes(attribute), `<video> lacks ${attribute}`);
  assert.doesNotMatch(video, /\bautoplay\b/);
  assert.match(astro, /<Picture/);
  assert.match(astro, /<source src=\{video\} type="video\/mp4"/);
  assert.match(astro, /data-video-toggle/);
  assert.match(astro, /data-video\b/);
  assert.doesNotMatch(astro, /is:inline/);
  assert.doesNotMatch(astro, /#[0-9a-f]{3,8}\b/i, 'no hard-coded color');
  assert.doesNotMatch(
    astro,
    /<(iframe|link|script)\b[^>]*(src|href)=["']https?:/,
  );
  assert.doesNotMatch(astro, /<(video|source)\b[^>]*src=["']https?:/);
});

test('the client script respects reduced motion, plays in view, pauses off-screen and in hidden tabs, and disconnects on swap', () => {
  const client = component('client.ts');
  assert.match(client, /prefers-reduced-motion: reduce/);
  assert.match(client, /IntersectionObserver/);
  assert.match(client, /visibilitychange/);
  assert.match(client, /astro:before-swap/);
  assert.doesNotMatch(client, /autoplay/);
  assert.doesNotMatch(client, /fetch\(/);
});

test('the starter demo page is noindex and its clip stays small', () => {
  const page = readFileSync(join(ROOT, 'src/pages/video/index.astro'), 'utf8');
  assert.match(page, /noindex/);
  assert.match(page, /<VideoLoop/);
  const total =
    statSync(join(ROOT, 'src/assets/video/demo-loop.mp4')).size +
    statSync(join(ROOT, 'src/assets/video/demo-loop.poster.webp')).size;
  assert.ok(total < 300 * 1024, `demo is ${total} bytes`);
});
