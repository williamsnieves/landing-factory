// Tests for the stock sources of scripts/find-images.mjs (Pixabay and the manual Pexels import).
// A local HTTP server plays the Pixabay API and image host; the real services are never called.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
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
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createClient, main, searchAll } from '../scripts/find-images.mjs';
import { syncCredits } from '../scripts/credits.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const KEY = 'pk-' + 'x'.repeat(30);
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(64, 7),
]);
const tmp = mkdtempSync(join(tmpdir(), 'find-images-stock-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

// --- the fake services -----------------------------------------------------------------------------
const requests = { api: [], images: [] };
let apiMode = 'ok'; // ok | bad-key | foreign-host
let server;
let origin;
before(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/img/')) {
      requests.images.push(url.pathname);
      res.writeHead(200, { 'content-type': 'image/jpeg' });
      res.end(JPEG);
      return;
    }
    requests.api.push(url);
    if (apiMode === 'bad-key' || url.searchParams.get('key') !== KEY) {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end('[ERROR 400] Invalid key');
      return;
    }
    const base = apiMode === 'foreign-host' ? 'http://127.0.0.2:9' : origin;
    const hit = (id, user, tags) => ({
      id,
      pageURL: `https://pixabay.com/photos/photo-${id}/`,
      tags,
      largeImageURL: `${base}/img/${id}_1280.jpg`,
      imageWidth: 4000,
      imageHeight: 2667,
      user,
      user_id: id + 1000,
    });
    const id = url.searchParams.get('id');
    const hits = id
      ? [hit(Number(id), 'anaruiz', 'physiotherapy, back, massage, spa')]
      : [
          hit(123, 'anaruiz', 'physiotherapy, back, massage, spa'),
          hit(124, 'joseperez', 'treatment room, clinic'),
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

/** A fresh factory root holding sites/demo, and the environment of a test run. */
function setup() {
  const root = mkdtempSync(join(tmp, 'root-'));
  mkdirSync(join(root, 'sites/demo'), { recursive: true });
  writeFileSync(join(root, 'sites/demo/package.json'), '{}');
  writeFileSync(join(root, 'sites/demo/assets.json'), '{"images":[]}\n');
  return root;
}
function envFor(root, extra = {}) {
  return {
    LANDING_FACTORY_ROOT: root,
    PIXABAY_API_KEY: KEY,
    PIXABAY_API_URL: `${origin}/api/`,
    STOCK_IMAGE_HOSTS: origin,
    NODE_TEST_CONTEXT: 'child-v8',
    ...extra,
  };
}
/** Run main() in this process with the environment set, capturing output. */
async function run(argv, env) {
  const saved = { ...process.env };
  const out = [];
  const err = [];
  const savedError = console.error;
  Object.assign(process.env, env);
  for (const name of ['PIXABAY_API_KEY'])
    if (!(name in env)) delete process.env[name];
  // The client logs retries through console.error: capture it too.
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
function allFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? allFiles(join(dir, e.name)) : [join(dir, e.name)],
  );
}
function assertNoKey(root, ...outputs) {
  for (const text of outputs) assert.ok(!text.includes(KEY), 'key in output');
  for (const file of allFiles(root)) {
    if (/\.(jpe?g|png|webp)$/.test(file)) continue;
    assert.ok(!readFileSync(file, 'utf8').includes(KEY), `key in ${file}`);
  }
}

// --- Pixabay ---------------------------------------------------------------------------------------
test('search lists Pixabay hits with ref, size, user and tags, sends the key and caches the result', async () => {
  apiMode = 'ok';
  const root = setup();
  requests.api.length = 0;
  const first = await run(
    [
      'search',
      'physio room',
      '--source',
      'pixabay',
      '--lang',
      'es',
      '--min-width',
      '1280',
    ],
    envFor(root),
  );
  assert.equal(first.code, 0, first.stderr);
  assert.match(first.stdout, /pixabay:123/);
  assert.match(first.stdout, /4000x2667 landscape/);
  assert.match(first.stdout, /anaruiz/);
  assert.match(first.stdout, /physiotherapy, back, massage, spa/);
  assert.match(first.stdout, /pixabay\.com\/photos\/photo-123/);
  assert.equal(requests.api.length, 1);
  const sent = requests.api[0].searchParams;
  assert.equal(sent.get('key'), KEY);
  assert.equal(sent.get('lang'), 'es');
  assert.equal(sent.get('image_type'), 'photo');
  assert.equal(sent.get('safesearch'), 'true');
  assert.equal(sent.get('min_width'), '1280');
  // The same search again is answered from .cache/pixabay/.
  const second = await run(
    [
      'search',
      'physio room',
      '--source',
      'pixabay',
      '--lang',
      'es',
      '--min-width',
      '1280',
    ],
    envFor(root),
  );
  assert.equal(second.code, 0);
  assert.equal(requests.api.length, 1);
  const cacheDir = join(root, '.cache/pixabay');
  assert.equal(readdirSync(cacheDir).length, 1);
  assertNoKey(root, first.stdout, first.stderr, second.stdout, second.stderr);
});

test('search --json returns candidates and a missing key exits 1 saying to set PIXABAY_API_KEY', async () => {
  apiMode = 'ok';
  const root = setup();
  const ok = await run(
    ['search', 'physio', '--source', 'pixabay', '--json'],
    envFor(root),
  );
  const list = JSON.parse(ok.stdout);
  assert.deepEqual(
    list.map((c) => c.pixabayId),
    [123, 124],
  );
  const env = envFor(root);
  delete env.PIXABAY_API_KEY;
  const none = await run(['search', 'physio', '--source', 'pixabay'], env);
  assert.equal(none.code, 1);
  assert.match(
    none.stderr,
    /set PIXABAY_API_KEY in the environment's settings/,
  );
  // Next to Commons the missing key is a warning and the other source still answers: here Commons is
  // not reachable offline, so only the warning is asserted.
  assert.doesNotMatch(none.stderr, /Usage:/);
});

test('get writes the file and a complete manifest entry from a Pixabay host', async () => {
  apiMode = 'ok';
  const root = setup();
  requests.images.length = 0;
  const result = await run(
    ['get', 'demo', 'pixabay:123', '--as', 'treatment-room', '--note', 'hero'],
    envFor(root),
  );
  assert.equal(result.code, 0, result.stderr);
  const file = join(root, 'sites/demo/src/assets/images/treatment-room.jpg');
  assert.ok(readFileSync(file).equals(JPEG));
  const [entry] = manifest(root).images;
  assert.equal(entry.file, 'treatment-room.jpg');
  assert.equal(entry.source, 'pixabay');
  assert.equal(entry.pixabayId, 123);
  assert.equal(entry.title, 'Physiotherapy, back, massage');
  assert.equal(entry.sourcePage, 'https://pixabay.com/photos/photo-123/');
  assert.equal(entry.author, 'anaruiz');
  assert.equal(entry.authorUrl, 'https://pixabay.com/users/anaruiz-1123/');
  assert.equal(entry.license, 'Pixabay Content License');
  assert.equal(
    entry.licenseUrl,
    'https://pixabay.com/service/license-summary/',
  );
  assert.equal(entry.credit, true);
  assert.equal(entry.note, 'hero');
  assert.match(entry.retrievedAt, /^\d{4}-\d\d-\d\dT/);
  // credits.mjs accepts the entry and lists the photographer and the provider.
  assert.deepEqual(syncCredits({ slug: 'demo', root }).written.sort(), [
    'CREDITS.md',
    'src/data/credits.json',
  ]);
  assertNoKey(root, result.stdout, result.stderr);
});

test('get accepts a Pixabay photo page URL and the default name carries the id', async () => {
  apiMode = 'ok';
  const root = setup();
  const result = await run(
    ['get', 'demo', 'https://pixabay.com/photos/some-photo-124/'],
    envFor(root),
  );
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(readdirSync(join(root, 'sites/demo/src/assets/images')), [
    'physiotherapy-back-massage-124.jpg',
  ]);
});

test('a download URL on another host exits 1 naming it; nothing is written and nothing is fetched', async () => {
  apiMode = 'foreign-host';
  const root = setup();
  requests.images.length = 0;
  const result = await run(['get', 'demo', 'pixabay:123'], envFor(root));
  apiMode = 'ok';
  assert.equal(result.code, 1);
  assert.match(result.stderr, /127\.0\.0\.2:9 is not a Pixabay host/);
  assert.equal(requests.images.length, 0);
  assert.equal(existsSync(join(root, 'sites/demo/src/assets/images')), false);
  assert.deepEqual(manifest(root).images, []);
});

test('an API error that names the request URL prints key=*** and the key appears nowhere', async () => {
  const root = setup();
  const env = envFor(root, { PIXABAY_API_KEY: KEY });
  apiMode = 'bad-key';
  const rejected = await run(['search', 'physio', '--source', 'pixabay'], env);
  apiMode = 'ok';
  assert.equal(rejected.code, 1);
  assert.match(rejected.stderr, /HTTP 400/);
  assert.match(rejected.stderr, /key=\*\*\*/);
  assertNoKey(root, rejected.stdout, rejected.stderr);
  // A network failure puts the URL in the client's error too.
  const down = await run(['search', 'physio', '--source', 'pixabay'], {
    ...env,
    PIXABAY_API_URL: 'http://127.0.0.1:9/api/',
  });
  assert.equal(down.code, 1);
  assert.match(down.stderr, /key=\*\*\*/);
  assertNoKey(root, down.stdout, down.stderr);
});

test('through the CLI process the key never reaches stdout, stderr, assets.json, CREDITS.md or .cache', () => {
  const root = setup();
  const env = {
    ...process.env,
    ...envFor(root),
    HTTPS_PROXY: '',
    HTTP_PROXY: '',
  };
  // The process needs the fake server, which lives in this process: use the async spawn instead.
  return new Promise((done, fail) => {
    {
      const child = spawn(
        process.execPath,
        [
          join(ROOT, 'scripts/find-images.mjs'),
          'get',
          'demo',
          'pixabay:123',
          '--as',
          'a',
        ],
        { env, cwd: ROOT },
      );
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => (stdout += d));
      child.stderr.on('data', (d) => (stderr += d));
      child.on('close', (code) => {
        try {
          assert.equal(code, 0, stderr);
          syncCredits({ slug: 'demo', root });
          assertNoKey(root, stdout, stderr);
          done();
        } catch (error) {
          fail(error);
        }
      });
    }
  });
});

// --- Pexels import ---------------------------------------------------------------------------------
const PAGE =
  'https://www.pexels.com/photo/woman-stretching-in-a-studio-1234567/';
const importArgs = (file, extra = []) => [
  'import',
  'demo',
  file,
  '--source',
  'pexels',
  '--page',
  PAGE,
  '--author',
  'Ana Ruiz',
  ...extra,
];
function photoFile(name = 'pexels-photo-1234567.jpeg', bytes = JPEG) {
  const file = join(mkdtempSync(join(tmp, 'dl-')), name);
  writeFileSync(file, bytes);
  return file;
}

test('import copies the photo and records the Pexels entry without any network request', async () => {
  const root = setup();
  requests.api.length = 0;
  const file = photoFile();
  const result = await run(
    importArgs(file, [
      '--author-url',
      'https://www.pexels.com/@ana-ruiz/',
      '--title',
      'Stretching',
      '--as',
      'studio',
    ]),
    // PIXABAY_API_URL points at a closed port: any request would fail the run.
    envFor(root, { PIXABAY_API_URL: 'http://127.0.0.1:9/api/' }),
  );
  assert.equal(result.code, 0, result.stderr);
  assert.ok(
    readFileSync(join(root, 'sites/demo/src/assets/images/studio.jpg')).equals(
      JPEG,
    ),
  );
  const [entry] = manifest(root).images;
  assert.deepEqual(
    { ...entry, retrievedAt: 'x' },
    {
      file: 'studio.jpg',
      title: 'Stretching',
      sourcePage: PAGE,
      author: 'Ana Ruiz',
      authorUrl: 'https://www.pexels.com/@ana-ruiz/',
      license: 'Pexels License',
      licenseUrl: 'https://www.pexels.com/license/',
      credit: true,
      source: 'pexels',
      pexelsId: 1234567,
      imported: true,
      retrievedAt: 'x',
      note: '',
    },
  );
  assert.equal(requests.api.length, 0);
  // The default name is the sanitized file name; the default title names the photographer.
  const second = await run(
    importArgs(photoFile('Studio Photo.JPG'), []).map((x) =>
      x === PAGE ? PAGE.replace('1234567', '7654321') : x,
    ),
    envFor(root),
  );
  assert.equal(second.code, 0, second.stderr);
  const added = manifest(root).images[1];
  assert.equal(added.file, 'studio-photo.jpg');
  assert.equal(added.title, 'Photo by Ana Ruiz');
  assert.equal(added.pexelsId, 7654321);
});

test('import refuses a page that is not a www.pexels.com/photo/ URL (exit 2) and writes nothing', async () => {
  const root = setup();
  const file = photoFile();
  for (const page of [
    'https://example.com/photo/x-1/',
    'https://www.pexels.com/search/spa/',
    'http://www.pexels.com/photo/x-1/',
    'https://images.pexels.com/photos/1/x.jpeg',
    'not a url',
  ]) {
    const args = importArgs(file);
    args[args.indexOf('--page') + 1] = page;
    const result = await run(args, envFor(root));
    assert.equal(result.code, 2, page);
  }
  const noAuthor = importArgs(file).slice(0, -2);
  assert.equal((await run(noAuthor, envFor(root))).code, 2);
  const wrongSource = importArgs(file);
  wrongSource[wrongSource.indexOf('pexels')] = 'pixabay';
  assert.equal((await run(wrongSource, envFor(root))).code, 2);
  assert.equal(existsSync(join(root, 'sites/demo/src/assets/images')), false);
  assert.deepEqual(manifest(root).images, []);
});

test('import refuses a file that is not an image and an existing target (exit 1)', async () => {
  const root = setup();
  const text = photoFile('notes.jpg', Buffer.from('<html>challenge</html>'));
  const notImage = await run(importArgs(text), envFor(root));
  assert.equal(notImage.code, 1);
  assert.match(notImage.stderr, /not a JPEG, PNG or WebP/);
  const gif = photoFile('a.gif', Buffer.from('GIF89a....'));
  assert.equal((await run(importArgs(gif), envFor(root))).code, 1);
  const missing = await run(importArgs(join(tmp, 'nope.jpg')), envFor(root));
  assert.equal(missing.code, 1);

  const file = photoFile();
  assert.equal(
    (await run(importArgs(file, ['--as', 'one']), envFor(root))).code,
    0,
  );
  const again = await run(importArgs(file, ['--as', 'one']), envFor(root));
  assert.equal(again.code, 1);
  assert.match(again.stderr, /already exists/);
  assert.equal(manifest(root).images.length, 1);
  // An extension that does not match the content is refused.
  const png = await run(importArgs(file, ['--as', 'two.png']), envFor(root));
  assert.equal(png.code, 1);
  assert.equal(manifest(root).images.length, 1);
  // A missing site is a problem with the site, not with usage.
  const args = importArgs(file);
  args[1] = 'nosuchsite';
  assert.equal((await run(args, envFor(root))).code, 1);
});

test('credits list a Pexels import and a Pixabay download with the provider lines', async () => {
  apiMode = 'ok';
  const root = setup();
  assert.equal(
    (await run(['get', 'demo', 'pixabay:123', '--as', 'p'], envFor(root))).code,
    0,
  );
  assert.equal(
    (await run(importArgs(photoFile(), ['--as', 'q']), envFor(root))).code,
    0,
  );
  syncCredits({ slug: 'demo', root });
  const credits = readFileSync(join(root, 'sites/demo/CREDITS.md'), 'utf8');
  assert.match(credits, /anaruiz/);
  assert.match(credits, /Ana Ruiz/);
  assert.match(
    credits,
    /Photos provided by \[Pixabay\]\(https:\/\/pixabay\.com\)/,
  );
  assert.match(
    credits,
    /Photos provided by \[Pexels\]\(https:\/\/www\.pexels\.com\)/,
  );
});

test('--help documents pixabay and import and an unknown source still exits 2', () => {
  const help = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts/find-images.mjs'), '--help'],
    { encoding: 'utf8' },
  );
  assert.equal(help.status, 0);
  for (const word of ['pixabay', 'import', 'PIXABAY_API_KEY'])
    assert.ok(help.stdout.includes(word), word);
  const bad = spawnSync(
    process.execPath,
    [
      join(ROOT, 'scripts/find-images.mjs'),
      'search',
      'x',
      '--source',
      'flickr',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(bad.status, 2);
});

test('searchAll skips Pixabay with a warning when the key is missing and other sources are searched', async () => {
  const urls = [];
  const client = createClient({
    fetch: async (url) => {
      urls.push(String(url));
      return new Response(JSON.stringify({ query: { pages: [] } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
    sleep: async () => {},
    minIntervalMs: 0,
  });
  const warnings = [];
  const result = await searchAll(client, 'physio', {
    sources: ['pixabay', 'commons'],
    env: {},
    warn: (m) => warnings.push(m),
  });
  assert.deepEqual(result.usable, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /skipping Pixabay: .*PIXABAY_API_KEY/);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /commons\.wikimedia\.org/);
  // Alone, a missing key is an error.
  await assert.rejects(
    searchAll(client, 'physio', { sources: ['pixabay'], env: {} }),
    /PIXABAY_API_KEY/,
  );
});
