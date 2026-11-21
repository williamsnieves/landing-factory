// Tests for the Pixabay video source of scripts/find-images.mjs. A local HTTP server plays the Pixabay videos
// API and the CDN (serving a clip made with ffmpeg's test source); the real services are never called.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { syncCredits } from '../scripts/credits.mjs';
import { main } from '../scripts/find-images.mjs';
import {
  parsePixabayVideoRef,
  toPixabayVideoCandidate,
} from '../scripts/lib/pixabay.mjs';
import { probeVideo } from '../scripts/lib/video-encode.mjs';
import { HAS_FFMPEG, makeClip, SKIP_REASON } from './video-helpers.mjs';

const KEY = 'pk-' + 'v'.repeat(30);
const tmp = mkdtempSync(join(tmpdir(), 'find-images-video-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const requests = { api: [], cdn: [] };
let apiMode = 'ok'; // ok | foreign-host
let clip = Buffer.from('not a video');
let server;
let origin;
before(async () => {
  if (HAS_FFMPEG)
    clip = readFileSync(
      makeClip(join(tmp, 'cdn.mp4'), { size: '1920x1080', seconds: 2 }),
    );
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/cdn/')) {
      requests.cdn.push(url.pathname);
      res.writeHead(200, { 'content-type': 'video/mp4' });
      res.end(clip);
      return;
    }
    requests.api.push(url);
    if (url.searchParams.get('key') !== KEY) {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end('[ERROR 400] Invalid key');
      return;
    }
    const base = apiMode === 'foreign-host' ? 'http://127.0.0.2:9' : origin;
    const hit = (id, user, tags, duration) => ({
      id,
      pageURL: `https://pixabay.com/videos/clip-${id}/`,
      tags,
      duration,
      videos: {
        large: {
          url: `${base}/cdn/${id}_large.mp4`,
          width: 1920,
          height: 1080,
        },
        medium: {
          url: `${base}/cdn/${id}_medium.mp4`,
          width: 1280,
          height: 720,
        },
        small: { url: `${base}/cdn/${id}_small.mp4`, width: 640, height: 360 },
        tiny: { url: `${base}/cdn/${id}_tiny.mp4`, width: 426, height: 240 },
      },
      user,
      user_id: id + 1000,
    });
    const id = url.searchParams.get('id');
    const hits = id
      ? [hit(Number(id), 'clipmaker', 'ocean, waves, sea', 14)]
      : [
          hit(501, 'clipmaker', 'ocean, waves, sea', 14),
          hit(502, 'filmer', 'forest, trees, fog', 22),
        ];
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({ total: hits.length, totalHits: hits.length, hits }),
    );
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((done) => server.close(done)));

function setup() {
  const root = mkdtempSync(join(tmp, 'root-'));
  mkdirSync(join(root, 'sites/demo'), { recursive: true });
  writeFileSync(join(root, 'sites/demo/package.json'), '{}');
  writeFileSync(join(root, 'sites/demo/assets.json'), '{"images":[]}\n');
  return root;
}
const envFor = (root, extra = {}) => ({
  LANDING_FACTORY_ROOT: root,
  PIXABAY_API_KEY: KEY,
  PIXABAY_API_URL: `${origin}/api/`,
  STOCK_IMAGE_HOSTS: origin,
  NODE_TEST_CONTEXT: 'child-v8',
  ...extra,
});
async function run(argv, env) {
  const saved = { ...process.env };
  const out = [];
  const err = [];
  const savedError = console.error;
  Object.assign(process.env, env);
  console.error = (...args) => err.push(args.join(' '));
  try {
    const code = await main(
      argv,
      { log: (m) => out.push(String(m)), error: (m) => err.push(String(m)) },
      { sleep: async () => {}, minIntervalMs: 0 },
    );
    return { code, stdout: out.join('\n'), stderr: err.join('\n') };
  } finally {
    console.error = savedError;
    for (const name of Object.keys(process.env))
      if (!(name in saved)) delete process.env[name];
    Object.assign(process.env, saved);
  }
}
const manifest = (root) =>
  JSON.parse(readFileSync(join(root, 'sites/demo/assets.json'), 'utf8'));

test('parsePixabayVideoRef reads the short ref and video page URLs only', () => {
  assert.equal(parsePixabayVideoRef('pixabay-video:501'), 501);
  assert.equal(
    parsePixabayVideoRef('https://pixabay.com/videos/ocean-waves-501/'),
    501,
  );
  assert.equal(parsePixabayVideoRef('pixabay:501'), null);
  assert.equal(
    parsePixabayVideoRef('https://pixabay.com/photos/some-photo-124/'),
    null,
  );
  assert.equal(
    parsePixabayVideoRef('https://evil.example/videos/x-501/'),
    null,
  );
});

test('a hit becomes a candidate on the medium rendition, or null without one', () => {
  const candidate = toPixabayVideoCandidate({
    id: 9,
    user: 'u',
    tags: 'a, b',
    duration: 8,
    videos: {
      small: { url: 'https://cdn.pixabay.com/s.mp4', width: 640, height: 360 },
    },
  });
  assert.equal(candidate.rendition, 'small');
  assert.equal(candidate.kind, 'video');
  assert.equal(toPixabayVideoCandidate({ id: 9, user: 'u', videos: {} }), null);
});

test('search lists Pixabay video hits with ref, size, duration and author, sends the key and caches', async () => {
  apiMode = 'ok';
  const root = setup();
  requests.api.length = 0;
  const first = await run(
    ['search', 'ocean', '--source', 'pixabay-video', '--lang', 'es'],
    envFor(root),
  );
  assert.equal(first.code, 0, first.stderr);
  assert.match(first.stdout, /pixabay-video:501/);
  assert.match(first.stdout, /1280x720 landscape, 14 s/);
  assert.match(first.stdout, /clipmaker/);
  assert.equal(requests.api.length, 1);
  assert.equal(requests.api[0].pathname, '/api/videos/');
  const sent = requests.api[0].searchParams;
  assert.equal(sent.get('key'), KEY);
  assert.equal(sent.get('lang'), 'es');
  assert.equal(sent.get('safesearch'), 'true');
  assert.equal(sent.has('image_type'), false);
  assert.ok(!first.stdout.includes(KEY) && !first.stderr.includes(KEY));
  const second = await run(
    ['search', 'ocean', '--source', 'pixabay-video', '--lang', 'es'],
    envFor(root),
  );
  assert.equal(second.code, 0);
  assert.equal(requests.api.length, 1, 'the second search is cached');
  // The cache never holds the key.
  const cacheDir = join(root, '.cache/pixabay');
  for (const f of readdirSync(cacheDir))
    assert.ok(!readFileSync(join(cacheDir, f), 'utf8').includes(KEY));
});

test(
  'get downloads from the CDN, encodes it and records a video entry',
  { skip: SKIP_REASON },
  async () => {
    apiMode = 'ok';
    const root = setup();
    requests.cdn.length = 0;
    const result = await run(
      [
        'get',
        'demo',
        'pixabay-video:501',
        '--as',
        'ocean-loop',
        '--note',
        'hero',
      ],
      envFor(root),
    );
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(requests.cdn, ['/cdn/501_medium.mp4']);
    const dir = join(root, 'sites/demo/src/assets/video');
    assert.deepEqual(readdirSync(dir).sort(), [
      'ocean-loop.mp4',
      'ocean-loop.poster.webp',
    ]);
    const probe = await probeVideo(join(dir, 'ocean-loop.mp4'));
    assert.equal(probe.hasAudio, false);
    assert.ok(probe.width <= 1280);
    const [entry] = manifest(root).images;
    assert.equal(entry.file, 'ocean-loop.mp4');
    assert.equal(entry.kind, 'video');
    assert.equal(entry.poster, 'ocean-loop.poster.webp');
    assert.equal(entry.source, 'pixabay');
    assert.equal(entry.pixabayId, 501);
    assert.equal(entry.license, 'Pixabay Content License');
    assert.equal(entry.credit, true);
    assert.equal(entry.author, 'clipmaker');
    assert.equal(entry.sourcePage, 'https://pixabay.com/videos/clip-501/');
    assert.equal(entry.note, 'hero');
    assert.equal(typeof entry.durationSec, 'number');
    assert.equal(entry.bytes, readFileSync(join(dir, 'ocean-loop.mp4')).length);
    assert.equal(entry.width, probe.width);
    assert.equal(entry.height, probe.height);
    // credits.mjs accepts the entry.
    assert.doesNotThrow(() => syncCredits({ slug: 'demo', root }));
    assert.ok(!result.stdout.includes(KEY) && !result.stderr.includes(KEY));
  },
);

test('get refuses a download host other than the Pixabay CDN before downloading', async () => {
  apiMode = 'foreign-host';
  const root = setup();
  requests.cdn.length = 0;
  const result = await run(['get', 'demo', 'pixabay-video:501'], envFor(root));
  apiMode = 'ok';
  assert.equal(result.code, 1);
  assert.match(result.stderr, /not cdn\.pixabay\.com/);
  assert.equal(requests.cdn.length, 0);
  assert.equal(existsSync(join(root, 'sites/demo/src/assets/video')), false);
  assert.deepEqual(manifest(root).images, []);
});

test('get without ffmpeg exits 1 naming the tool, requests nothing and writes nothing', async () => {
  apiMode = 'ok';
  const root = setup();
  requests.cdn.length = 0;
  requests.api.length = 0;
  const result = await run(
    ['get', 'demo', 'pixabay-video:501'],
    envFor(root, { FFMPEG_BIN: join(tmp, 'no-ffmpeg') }),
  );
  assert.equal(result.code, 1);
  assert.match(result.stderr, /ffmpeg is not installed/);
  assert.equal(requests.cdn.length, 0);
  assert.equal(existsSync(join(root, 'sites/demo/src/assets/video')), false);
  assert.deepEqual(manifest(root).images, []);
});

test(
  'a clip over video.maxKb is refused and nothing is recorded',
  { skip: SKIP_REASON },
  async () => {
    apiMode = 'ok';
    const root = setup();
    writeFileSync(
      join(root, 'sites/demo/qa.config.json'),
      JSON.stringify({ video: { maxKb: 1 } }),
    );
    const result = await run(
      ['get', 'demo', 'pixabay-video:501'],
      envFor(root),
    );
    assert.equal(result.code, 1);
    assert.match(result.stderr, /KB after a stronger pass/);
    assert.deepEqual(manifest(root).images, []);
    assert.equal(
      readdirSync(join(root, 'sites/demo/src/assets/video')).length,
      0,
    );
  },
);

test('a bad --as is a failure, not a path', { skip: SKIP_REASON }, async () => {
  const root = setup();
  const result = await run(
    ['get', 'demo', 'pixabay-video:501', '--as', '../x.mp4'],
    envFor(root),
  );
  assert.equal(result.code, 1);
  assert.match(result.stderr, /--as/);
});

test('--help documents pixabay-video', () => {
  const out = execFileSync('node', ['scripts/find-images.mjs', '--help'], {
    encoding: 'utf8',
  });
  assert.match(out, /pixabay-video/);
});
