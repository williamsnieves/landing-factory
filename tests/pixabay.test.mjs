// Unit tests for scripts/lib/pixabay.mjs with a fake fetch. No network, never the real Pixabay.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { createClient } from '../scripts/find-images.mjs';
import {
  CACHE_TTL_MS,
  PixabayError,
  apiBase,
  assertImageOrigin,
  getPixabayPhoto,
  imageOrigins,
  maskKey,
  parsePixabayRef,
  pixabayEntry,
  readKey,
  searchParams,
  searchPixabay,
  titleFromTags,
  toPixabayCandidate,
} from '../scripts/lib/pixabay.mjs';

const KEY = 'pk-' + 'x'.repeat(30);
const tmp = mkdtempSync(join(tmpdir(), 'pixabay-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const hit = (over = {}) => ({
  id: 123,
  pageURL: 'https://pixabay.com/photos/physio-back-massage-123/',
  tags: 'physiotherapy, back, massage, spa',
  largeImageURL: 'https://pixabay.com/get/abc_1280.jpg',
  imageWidth: 4000,
  imageHeight: 2667,
  user: 'anaruiz',
  user_id: 77,
  ...over,
});
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
/** A client over a fake fetch answering from a queue; records the URLs. */
function clientWith(answers, options = {}) {
  const urls = [];
  const queue = [...answers];
  const client = createClient({
    fetch: async (url) => {
      urls.push(String(url));
      return queue.shift();
    },
    sleep: async () => {},
    minIntervalMs: 0,
    ...options,
  });
  return { client, urls };
}

test('maskKey replaces the key parameter and the exact value, in plain and encoded form', () => {
  assert.equal(
    maskKey(`https://pixabay.com/api/?key=${KEY}&q=cat`, KEY),
    'https://pixabay.com/api/?key=***&q=cat',
  );
  assert.equal(
    maskKey(`failed with ${KEY} in it`, KEY),
    'failed with *** in it',
  );
  const odd = 'k e/y+1';
  assert.ok(!maskKey(`x ${encodeURIComponent(odd)} y`, odd).includes('k%20e'));
  assert.equal(maskKey('https://x/?q=a&KEY=abc'), 'https://x/?q=a&KEY=***');
  assert.equal(maskKey(undefined, KEY), '');
});

test('the key comes only from PIXABAY_API_KEY and its absence says where to set it', () => {
  assert.equal(readKey({ PIXABAY_API_KEY: ` ${KEY} ` }), KEY);
  assert.throws(
    () => readKey({}),
    (error) =>
      error instanceof PixabayError &&
      /set PIXABAY_API_KEY in the environment's settings/.test(error.message),
  );
});

test('test hooks are honored only when NODE_TEST_CONTEXT is set', () => {
  const env = {
    PIXABAY_API_URL: 'http://127.0.0.1:1/api/',
    STOCK_IMAGE_HOSTS: 'http://127.0.0.1:1',
  };
  assert.equal(apiBase(env), 'https://pixabay.com/api/');
  assert.deepEqual(imageOrigins(env), [
    'https://pixabay.com',
    'https://cdn.pixabay.com',
  ]);
  const test = { ...env, NODE_TEST_CONTEXT: 'child-v8' };
  assert.equal(apiBase(test), 'http://127.0.0.1:1/api/');
  assert.ok(imageOrigins(test).includes('http://127.0.0.1:1'));
});

test('downloads are allowed only from Pixabay origins over https', () => {
  for (const ok of [
    'https://pixabay.com/get/a.jpg',
    'https://cdn.pixabay.com/photo/a.jpg',
  ])
    assert.ok(assertImageOrigin(ok, {}));
  for (const bad of [
    'http://pixabay.com/get/a.jpg',
    'https://evil.example/pixabay.com/a.jpg',
    'https://pixabay.com.evil.example/a.jpg',
    'https://i.pexels.com/a.jpg',
    'not a url',
  ])
    assert.throws(() => assertImageOrigin(bad, {}), PixabayError, bad);
  assert.throws(
    () => assertImageOrigin('https://evil.example/a.jpg', {}),
    /evil\.example is not a Pixabay host/,
  );
});

test('refs: pixabay:<id> and photo page URLs; anything else is not a Pixabay ref', () => {
  assert.equal(parsePixabayRef('pixabay:123'), 123);
  assert.equal(
    parsePixabayRef('https://pixabay.com/photos/physio-back-massage-123/'),
    123,
  );
  assert.equal(
    parsePixabayRef('https://pixabay.com/es/photos/fisio-espalda-456/'),
    456,
  );
  assert.equal(parsePixabayRef('https://pixabay.com/photos/id-789/'), 789);
  for (const no of [
    'met:12',
    'File:X.jpg',
    '123',
    'https://evil.example/photos/x-123/',
    'https://pixabay.com/users/ana-77/',
  ])
    assert.equal(parsePixabayRef(no), null, no);
});

test('search parameters: photos, safe search, orientation, width, language and per_page limits', () => {
  const params = searchParams({
    query: 'physio room',
    orientation: 'landscape',
    minWidth: 1280,
    lang: 'es-ES',
    perPage: 500,
  });
  assert.equal(params.get('q'), 'physio room');
  assert.equal(params.get('image_type'), 'photo');
  assert.equal(params.get('safesearch'), 'true');
  assert.equal(params.get('orientation'), 'horizontal');
  assert.equal(params.get('min_width'), '1280');
  assert.equal(params.get('lang'), 'es');
  assert.equal(params.get('per_page'), '200');
  assert.equal(params.has('key'), false);
  assert.equal(searchParams({ query: 'a', perPage: 1 }).get('per_page'), '3');
  assert.equal(searchParams({ query: 'a', lang: 'xx' }).has('lang'), false);
  assert.equal(
    searchParams({ query: 'a', orientation: 'portrait' }).get('orientation'),
    'vertical',
  );
});

test('hits map to candidates: title from three tags, author, page, license and credit', () => {
  assert.equal(
    titleFromTags('physiotherapy, back, massage, spa'),
    'Physiotherapy, back, massage',
  );
  assert.equal(titleFromTags(''), 'Pixabay photo');
  const c = toPixabayCandidate(hit());
  assert.equal(c.source, 'pixabay');
  assert.equal(c.pixabayId, 123);
  assert.equal(c.title, 'Physiotherapy, back, massage');
  assert.equal(c.author, 'anaruiz');
  assert.equal(c.authorUrl, 'https://pixabay.com/users/anaruiz-77/');
  assert.equal(
    c.sourcePage,
    'https://pixabay.com/photos/physio-back-massage-123/',
  );
  assert.equal(c.orientation, 'landscape');
  assert.equal(c.mime, 'image/jpeg');
  assert.equal(c.license, 'Pixabay Content License');
  assert.equal(c.credit, true);
  // A page URL on another host is replaced by the constructed Pixabay page.
  assert.equal(
    toPixabayCandidate(hit({ pageURL: 'https://evil.example/x' })).sourcePage,
    'https://pixabay.com/photos/id-123/',
  );
  assert.equal(toPixabayCandidate(hit({ user: '' })), null);
  assert.equal(toPixabayCandidate(hit({ largeImageURL: '' })), null);
  assert.equal(toPixabayCandidate(null), null);
  const entry = pixabayEntry(c, {
    file: 'x.jpg',
    note: 'hero',
    now: new Date('2026-11-04T10:00:00Z'),
  });
  assert.deepEqual(
    {
      source: entry.source,
      pixabayId: entry.pixabayId,
      license: entry.license,
      licenseUrl: entry.licenseUrl,
      credit: entry.credit,
      retrievedAt: entry.retrievedAt,
    },
    {
      source: 'pixabay',
      pixabayId: 123,
      license: 'Pixabay Content License',
      licenseUrl: 'https://pixabay.com/service/license-summary/',
      credit: true,
      retrievedAt: '2026-11-04T10:00:00.000Z',
    },
  );
});

test('search sends the key and the parameters, maps hits and filters square and width', async () => {
  const { client, urls } = clientWith([
    json({
      totalHits: 3,
      hits: [hit(), hit({ id: 124, imageWidth: 800, imageHeight: 800 })],
    }),
  ]);
  const result = await searchPixabay({
    query: 'physio',
    orientation: 'landscape',
    minWidth: 1000,
    lang: 'es',
    client,
    key: KEY,
    env: {},
  });
  assert.equal(urls.length, 1);
  const sent = new URL(urls[0]);
  assert.equal(sent.origin + sent.pathname, 'https://pixabay.com/api/');
  assert.equal(sent.searchParams.get('key'), KEY);
  assert.equal(sent.searchParams.get('q'), 'physio');
  assert.deepEqual(
    result.usable.map((c) => c.pixabayId),
    [123],
  );
  assert.equal(result.filtered, 1);
});

test('the cache: an identical search makes no request, expires after 24 hours and never holds the key', async () => {
  const cacheDir = join(tmp, 'cache');
  let clock = 1_000_000;
  const now = () => clock;
  const answers = () => [
    json({ hits: [hit()] }),
    json({ hits: [hit({ id: 7 })] }),
    json({ hits: [hit({ id: 9 })] }),
  ];
  const { client, urls } = clientWith(answers());
  const args = { query: 'physio', client, key: KEY, cacheDir, now, env: {} };
  const first = await searchPixabay(args);
  assert.equal(first.cached, false);
  clock += 60_000;
  const second = await searchPixabay(args);
  assert.equal(second.cached, true);
  assert.equal(urls.length, 1);
  assert.deepEqual(
    second.usable.map((c) => c.pixabayId),
    [123],
  );
  // another query is another cache entry
  await searchPixabay({ ...args, query: 'other' });
  clock += CACHE_TTL_MS;
  const third = await searchPixabay(args);
  assert.equal(third.cached, false);
  assert.deepEqual(
    third.usable.map((c) => c.pixabayId),
    [9],
  );
  const names = readdirSync(cacheDir);
  assert.ok(names.every((name) => /^[0-9a-f]{64}\.json$/.test(name)));
  for (const name of names)
    assert.ok(!readFileSync(join(cacheDir, name), 'utf8').includes(KEY));
});

test('a 429 is retried with the backoff and the photo is read by id', async () => {
  const waits = [];
  const { client, urls } = clientWith(
    [
      new Response('slow down', {
        status: 429,
        headers: { 'retry-after': '3' },
      }),
      json({ hits: [hit()] }),
    ],
    { sleep: async (ms) => waits.push(ms) },
  );
  const photo = await getPixabayPhoto(123, { client, key: KEY, env: {} });
  assert.equal(photo.pixabayId, 123);
  assert.equal(urls.length, 2);
  assert.equal(new URL(urls[1]).searchParams.get('id'), '123');
  assert.ok(waits.includes(3000), `waited ${waits}`);
});

test('an error that names the request URL has the key masked', async () => {
  // A permanent 429 ends in the client's "HTTP 429 after N attempts: <url>" error.
  const { client } = clientWith(
    Array.from({ length: 10 }, () => new Response('', { status: 429 })),
    { maxRetries: 2 },
  );
  await assert.rejects(
    searchPixabay({ query: 'x', client, key: KEY, env: {} }),
    (error) => {
      assert.ok(error instanceof PixabayError);
      assert.match(error.message, /HTTP 429/);
      assert.match(error.message, /key=\*\*\*/);
      assert.ok(!error.message.includes(KEY));
      return true;
    },
  );
  // An API error status with a body.
  const bad = clientWith([
    new Response('[ERROR 400] Invalid key', { status: 400 }),
  ]);
  await assert.rejects(
    searchPixabay({ query: 'x', client: bad.client, key: KEY, env: {} }),
    (error) => {
      assert.match(error.message, /HTTP 400/);
      assert.ok(!error.message.includes(KEY));
      return true;
    },
  );
  const none = clientWith([json({ hits: [] })]);
  await assert.rejects(
    getPixabayPhoto(5, { client: none.client, key: KEY, env: {} }),
    /no such photo at Pixabay: 5/,
  );
});

test('uniqueTags keeps each Pixabay tag once, in order', async () => {
  const { uniqueTags } = await import('../scripts/lib/pixabay.mjs');
  assert.equal(
    uniqueTags('masaje, terapia, masaje, Masaje, spa, terapia'),
    'masaje, terapia, spa',
  );
});

test('largeImageWidth scales the long side to 1280 px', async () => {
  const { largeImageWidth } = await import('../scripts/lib/pixabay.mjs');
  assert.equal(largeImageWidth(3508, 2480), 1280);
  assert.equal(largeImageWidth(2480, 3508), 905);
  assert.equal(largeImageWidth(800, 600), 800);
});
