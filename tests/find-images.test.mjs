// Tests for scripts/find-images.mjs on recorded Commons API fixtures. No network.
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
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  USER_AGENT,
  candidatesFromResponse,
  chooseFileName,
  classifyLicense,
  createClient,
  downloadTarget,
  fileStem,
  filterCandidates,
  getImage,
  lookupParams,
  main,
  parseRetryAfter,
  pickWidth,
  searchImages,
  stripHtml,
} from '../scripts/find-images.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixture = (name) =>
  JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/commons', name), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'find-images-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
const noSleep = { sleep: async () => {}, minIntervalMs: 0 };
/** Client whose fetch answers from a queue of Responses (or a function) and records the calls. */
function clientWith(answers, options = {}) {
  const calls = [];
  const queue = typeof answers === 'function' ? [] : [...answers];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const next =
      typeof answers === 'function' ? answers(String(url)) : queue.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  const client = createClient({ fetch, ...noSleep, ...options });
  client.calls = calls;
  return client;
}

test('license allow-list: CC0, public domain, CC BY and CC BY-SA pass; NC, ND, GFDL and unknown do not', () => {
  const ok = (name, credit) => {
    const r = classifyLicense(name);
    assert.equal(r.allowed, true, name);
    assert.equal(r.credit, credit, name);
  };
  ok('CC0', false);
  ok('CC0 1.0', false);
  ok('Public domain', false);
  ok('PD-old-70', false);
  ok('PDM 1.0', false);
  ok('CC BY 4.0', true);
  ok('CC BY 2.0', true);
  ok('CC BY-SA 3.0', true);
  ok('CC BY-SA 4.0', true);
  ok('CC BY 2.5 es', true);
  ok('CC BY-SA 3.0 de', true);
  for (const name of [
    'CC BY-NC 4.0',
    'CC BY-NC-SA 2.0',
    'CC BY-ND 2.0',
    'CC BY-NC-ND 3.0',
    'GFDL',
    'Fair use',
    'All rights reserved',
    '',
  ])
    assert.equal(classifyLicense(name).allowed, false, name || '(empty)');
  assert.match(classifyLicense('CC BY-NC 4.0').reason, /NonCommercial/);
  assert.match(classifyLicense('GFDL').reason, /allow-list/);
  assert.match(classifyLicense('').reason, /no license/);
  // Usage terms catch an NC license whose short name is vague.
  assert.equal(
    classifyLicense('CC BY 4.0', 'Attribution-NonCommercial').allowed,
    false,
  );
});

test('stripHtml removes tags, decodes entities and collapses whitespace', () => {
  assert.equal(
    stripHtml(
      '<a href="//commons.wikimedia.org/wiki/User:Ana" title="User:Ana">Ana &quot;Pan&quot; Garc&#237;a</a>  &amp; <span>Bo</span><br/>x',
    ),
    'Ana "Pan" García & Bo x',
  );
  assert.equal(stripHtml(undefined), '');
  assert.equal(stripHtml('a &unknown; b'), 'a &unknown; b');
});

test('candidates from the recorded dental search: author extracted, license read, orientation derived', () => {
  const candidates = candidatesFromResponse(fixture('search-dental.json'));
  assert.equal(candidates.length, 3);
  const [chair, aspen, orleans] = candidates;
  assert.equal(
    chair.title,
    'File:A dental chair in a dentist clinic in North Carolina, United States.jpg',
  );
  assert.equal(chair.author, 'Harrison Keely');
  assert.equal(chair.license, 'CC BY 4.0');
  assert.equal(chair.credit, true);
  assert.equal(chair.licenseUrl, 'https://creativecommons.org/licenses/by/4.0');
  assert.equal(chair.orientation, 'landscape');
  assert.equal(chair.allowed, true);
  assert.match(
    chair.sourcePage,
    /^https:\/\/commons\.wikimedia\.org\/wiki\/File:A_dental_chair/,
  );
  // The query string of the original URL is dropped.
  assert.equal(
    chair.originalUrl,
    'https://upload.wikimedia.org/wikipedia/commons/9/92/A_dental_chair_in_a_dentist_clinic_in_North_Carolina%2C_United_States.jpg',
  );
  assert.equal(aspen.width, 3973);
  assert.equal(orleans.license, 'CC BY-SA 4.0');
  assert.equal(orleans.orientation, 'portrait');
});

test('mixed licenses: rejected ones carry a reason; svg, missing author and unknown license are dropped', () => {
  const candidates = candidatesFromResponse(fixture('search-licenses.json'));
  const byTitle = Object.fromEntries(
    candidates.map((c) => [c.title.slice(5), c]),
  );
  assert.equal(byTitle['Cc zero loaf.jpg'].allowed, true);
  assert.equal(byTitle['Cc zero loaf.jpg'].credit, false);
  assert.equal(byTitle['Cc zero loaf.jpg'].author, 'Ana "Pan" García');
  assert.equal(byTitle['Public domain bridge.jpg'].author, 'Unknown author');
  assert.equal(byTitle['By loaf.jpg'].author, 'Bo & Cy');
  assert.equal(byTitle['Bysa square.png'].orientation, 'square');
  assert.match(byTitle['Noncommercial.jpg'].rejection, /NonCommercial/);
  assert.match(byTitle['No derivs.jpg'].rejection, /NoDerivatives/);
  assert.match(byTitle['Gfdl only.jpg'].rejection, /allow-list/);
  assert.match(byTitle['Unknown license.jpg'].rejection, /no license/);
  assert.match(byTitle['By without author.jpg'].rejection, /author missing/);
  assert.match(
    byTitle['Vector drawing.svg'].rejection,
    /only JPEG, PNG and WebP/,
  );
  const { usable, rejected, filtered } = filterCandidates(candidates, {
    minWidth: 1000,
    orientation: 'landscape',
  });
  assert.deepEqual(
    usable.map((c) => c.title.slice(5)),
    ['Cc zero loaf.jpg', 'Public domain bridge.jpg'],
  );
  assert.equal(rejected.length, 6);
  // By loaf (portrait), Bysa square (square) and Small by (too narrow) are filtered by size/orientation.
  assert.equal(filtered, 3);
});

test('searchImages sends the Commons generator query with the User-Agent and honors --limit', async () => {
  const client = clientWith([json(fixture('search-licenses.json'))]);
  const result = await searchImages(client, 'artisan bread', { limit: 2 });
  assert.equal(result.usable.length, 2);
  const url = new URL(client.calls[0].url);
  assert.equal(
    url.origin + url.pathname,
    'https://commons.wikimedia.org/w/api.php',
  );
  assert.equal(url.searchParams.get('generator'), 'search');
  assert.equal(url.searchParams.get('gsrnamespace'), '6');
  assert.equal(
    url.searchParams.get('gsrsearch'),
    'artisan bread filetype:bitmap',
  );
  assert.equal(url.searchParams.get('prop'), 'imageinfo');
  assert.match(url.searchParams.get('iiprop'), /extmetadata/);
  assert.equal(url.searchParams.get('iiurlwidth'), '960');
  assert.equal(client.calls[0].init.headers['user-agent'], USER_AGENT);
});

test('retries 429 and 503 honoring Retry-After, with exponential backoff capped at maxWaitMs', async () => {
  const waits = [];
  const client = clientWith(
    [
      new Response('slow down', {
        status: 429,
        headers: { 'retry-after': '7' },
      }),
      new Response('busy', { status: 503 }),
      new Response('busy', { status: 503 }),
      json({ ok: true }),
    ],
    { sleep: async (ms) => waits.push(ms), minIntervalMs: 0, maxWaitMs: 3500 },
  );
  const response = await client.request('https://example.test/x');
  assert.equal(response.status, 200);
  // 7 s asked but capped at 3.5 s; then 2^1 = 2 s; then 2^2 = 4 s capped at 3.5 s.
  assert.deepEqual(waits, [3500, 2000, 3500]);
  assert.equal(client.stats.retries, 3);
  assert.equal(client.stats.requests, 4);
});

test('Retry-After longer than the backoff wins; gives up after maxRetries with a clear error', async () => {
  const waits = [];
  const client = clientWith(
    [
      new Response('', { status: 429, headers: { 'retry-after': '5' } }),
      json({}),
    ],
    { sleep: async (ms) => waits.push(ms), minIntervalMs: 0 },
  );
  await client.request('https://example.test/x');
  assert.deepEqual(waits, [5000]);

  const always429 = clientWith(() => new Response('', { status: 429 }), {
    ...noSleep,
    maxRetries: 2,
  });
  await assert.rejects(
    () => always429.request('https://example.test/x'),
    /HTTP 429 after 3 attempts/,
  );
  assert.equal(always429.calls.length, 3);
});

test('network errors are retried, other statuses are returned untouched', async () => {
  const client = clientWith([
    Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNRESET' } }),
    new Response('nope', { status: 404 }),
  ]);
  const response = await client.request('https://example.test/x');
  assert.equal(response.status, 404);
  assert.equal(client.stats.retries, 1);
});

test('requests are throttled to at least minIntervalMs apart', async () => {
  let clock = 0;
  const sleeps = [];
  const client = createClient({
    fetch: async () => new Response('{}'),
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    minIntervalMs: 1000,
  });
  await client.request('https://example.test/1');
  clock += 200;
  await client.request('https://example.test/2');
  await client.request('https://example.test/3');
  assert.deepEqual(sleeps, [800, 1000]);
});

test('parseRetryAfter reads seconds and HTTP dates', () => {
  assert.equal(parseRetryAfter('12'), 12);
  assert.equal(parseRetryAfter(null), null);
  assert.equal(parseRetryAfter('garbage'), null);
  const now = Date.parse('2026-01-01T00:00:00Z');
  assert.equal(parseRetryAfter('Thu, 01 Jan 2026 00:00:30 GMT', now), 30);
});

test('download targets use upload.wikimedia.org thumbnails at standard widths, or the original when smaller', () => {
  const candidate = {
    width: 4032,
    originalUrl:
      'https://upload.wikimedia.org/wikipedia/commons/9/92/A_dental_chair.jpg',
  };
  assert.deepEqual(downloadTarget(candidate, 960), {
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/A_dental_chair.jpg/960px-A_dental_chair.jpg',
    width: 960,
    original: false,
  });
  assert.equal(downloadTarget(candidate).width, 1920);
  assert.equal(downloadTarget(candidate, 1000).width, 1280);
  assert.equal(downloadTarget(candidate, 5000).width, 1920);
  assert.ok(!downloadTarget(candidate).url.includes('thumb.wikimedia.org'));
  const small = { ...candidate, width: 1200 };
  assert.deepEqual(downloadTarget(small, 1920), {
    url: candidate.originalUrl,
    width: 1200,
    original: true,
  });
  assert.equal(pickWidth(), 1920);
  assert.throws(
    () =>
      downloadTarget({
        width: 5000,
        originalUrl: 'https://upload.wikimedia.org/odd.jpg',
      }),
    /unexpected image URL/,
  );
});

test('file names: slug of the title, --as validated, extension from the MIME type', () => {
  assert.equal(
    fileStem('File:Boulangerie traditionnelle (Ain, França).JPG'),
    'boulangerie-traditionnelle-ain-franca',
  );
  assert.equal(
    chooseFileName({ title: 'File:Swiss Bread LCD.jpg', mime: 'image/jpeg' }),
    'swiss-bread-lcd.jpg',
  );
  assert.equal(
    chooseFileName({ title: 'File:X.png', mime: 'image/png' }, 'hero'),
    'hero.png',
  );
  assert.equal(
    chooseFileName({ title: 'File:X.png', mime: 'image/png' }, 'hero.webp'),
    'hero.webp',
  );
  assert.throws(
    () => chooseFileName({ mime: 'image/png' }, '../evil.png'),
    /plain file name/,
  );
  assert.throws(
    () => chooseFileName({ mime: 'image/png' }, 'Bad Name.png'),
    /lowercase/,
  );
  assert.throws(
    () => chooseFileName({ mime: 'image/png' }, 'x.svg'),
    /lowercase/,
  );
});

test('lookupParams accepts titles, page ids and Commons URLs', () => {
  assert.deepEqual(lookupParams('12345'), { pageids: '12345' });
  assert.deepEqual(lookupParams('File:Swiss_Bread_LCD.jpg'), {
    titles: 'File:Swiss Bread LCD.jpg',
  });
  assert.deepEqual(lookupParams('Swiss Bread LCD.jpg'), {
    titles: 'File:Swiss Bread LCD.jpg',
  });
  assert.deepEqual(
    lookupParams(
      'https://commons.wikimedia.org/wiki/File:Orange_almond_cake_(48839116778).jpg',
    ),
    { titles: 'File:Orange almond cake (48839116778).jpg' },
  );
  assert.throws(
    () => lookupParams('https://example.com/wiki/File:X.jpg'),
    /not a Commons URL/,
  );
});

/** A fake root with sites/<slug>/. */
function fakeRoot(slug = 'demo') {
  const root = mkdtempSync(join(tmp, 'root-'));
  mkdirSync(join(root, 'sites', slug), { recursive: true });
  return root;
}
const imageBytes = Buffer.from('fake-jpeg-bytes');
const downloadResponse = () =>
  new Response(imageBytes, {
    status: 200,
    headers: { 'content-type': 'image/jpeg' },
  });

test('get downloads from upload.wikimedia.org, writes the file and appends a complete manifest entry', async () => {
  const root = fakeRoot();
  const client = clientWith([
    json(fixture('lookup-by.json')),
    downloadResponse(),
  ]);
  const now = new Date('2026-10-18T12:00:00Z');
  const result = await getImage(client, {
    slug: 'demo',
    ref: 'File:By loaf.jpg',
    width: 960,
    note: 'hero candidate',
    root,
    now,
  });
  assert.equal(result.entry.file, 'by-loaf.jpg');
  const saved = join(root, 'sites/demo/src/assets/images/by-loaf.jpg');
  assert.deepEqual(readFileSync(saved), imageBytes);
  // 1200 px wide original, 960 requested: a thumbnail on upload.wikimedia.org (never thumb.wikimedia.org).
  assert.equal(
    client.calls[1].url,
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/By_loaf.jpg/960px-By_loaf.jpg',
  );
  const manifest = JSON.parse(
    readFileSync(join(root, 'sites/demo/assets.json'), 'utf8'),
  );
  assert.deepEqual(manifest, {
    images: [
      {
        file: 'by-loaf.jpg',
        title: 'File:By loaf.jpg',
        sourcePage: 'https://commons.wikimedia.org/wiki/File:By_loaf.jpg',
        author: 'Bo & Cy',
        license: 'CC BY 3.0',
        licenseUrl: 'https://example.org/CC-BY-3.0',
        credit: true,
        retrievedAt: '2026-10-18T12:00:00.000Z',
        note: 'hero candidate',
      },
    ],
  });
});

test('get keeps existing manifest entries, uses the original when it is small and refuses to overwrite', async () => {
  const root = fakeRoot();
  const manifestPath = join(root, 'sites/demo/assets.json');
  writeFileSync(
    manifestPath,
    JSON.stringify({ images: [{ file: 'old.jpg' }] }),
  );
  const client = clientWith([
    json(fixture('lookup-by.json')),
    downloadResponse(),
  ]);
  await getImage(client, {
    slug: 'demo',
    ref: 'By loaf.jpg',
    as: 'loaf',
    root,
  });
  assert.equal(
    client.calls[1].url,
    'https://upload.wikimedia.org/wikipedia/commons/a/ab/By_loaf.jpg',
  );
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.deepEqual(
    manifest.images.map((e) => e.file),
    ['old.jpg', 'loaf.jpg'],
  );
  const again = clientWith([json(fixture('lookup-by.json'))]);
  await assert.rejects(
    () =>
      getImage(again, { slug: 'demo', ref: 'By loaf.jpg', as: 'loaf', root }),
    /already exists/,
  );
});

test('get rejects a disallowed license before downloading anything', async () => {
  const root = fakeRoot();
  const nc = fixture('search-licenses.json');
  nc.query.pages = nc.query.pages.filter((p) =>
    p.title.includes('Noncommercial'),
  );
  const client = clientWith([json(nc)]);
  await assert.rejects(
    () => getImage(client, { slug: 'demo', ref: 'Noncommercial.jpg', root }),
    /rejected: .*NonCommercial/,
  );
  assert.equal(client.calls.length, 1);
  assert.ok(!existsSync(join(root, 'sites/demo/assets.json')));
});

test('get refuses unknown sites, bad slugs, missing files and non-image downloads', async () => {
  const root = fakeRoot();
  await assert.rejects(
    () => getImage(clientWith([]), { slug: 'nope', ref: 'x', root }),
    /does not exist/,
  );
  await assert.rejects(
    () => getImage(clientWith([]), { slug: 'Bad Slug', ref: 'x', root }),
    /slug/i,
  );
  const missing = clientWith([
    json({ query: { pages: [{ title: 'File:Nope.jpg', missing: true }] } }),
  ]);
  await assert.rejects(
    () => getImage(missing, { slug: 'demo', ref: 'Nope.jpg', root }),
    /no such file/,
  );
  const html = clientWith([
    json(fixture('lookup-by.json')),
    new Response('<html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }),
  ]);
  await assert.rejects(
    () => getImage(html, { slug: 'demo', ref: 'By loaf.jpg', root }),
    /not an image/,
  );
  assert.ok(
    !existsSync(join(root, 'sites/demo/src/assets/images/by-loaf.jpg')),
  );
});

test('CLI search prints usable photos and exit codes follow the results', async () => {
  const out = [];
  const err = [];
  const io = { log: (m) => out.push(m), error: (m) => err.push(m) };
  const fetch = async () => json(fixture('search-dental.json'));
  const code = await main(
    ['search', 'dental clinic', '--limit', '2', '--min-width', '4000'],
    io,
    {
      fetch,
      ...noSleep,
    },
  );
  assert.equal(code, 0);
  assert.match(
    out.join('\n'),
    /1\. File:A dental chair.*\n.*4032x3024 landscape, CC BY 4\.0 \(credit required\), author: Harrison Keely/,
  );
  assert.match(out.join('\n'), /1 usable/);
  const none = await main(['search', 'dental', '--orientation', 'square'], io, {
    fetch,
    ...noSleep,
  });
  assert.equal(none, 1);
  const asJson = [];
  await main(
    ['search', 'dental', '--json'],
    { log: (m) => asJson.push(m), error() {} },
    { fetch, ...noSleep },
  );
  assert.equal(JSON.parse(asJson[0]).length, 3);
});

test('CLI usage errors exit 2 and a failing request exits 1', async () => {
  const io = { log() {}, error() {} };
  for (const argv of [
    [],
    ['search'],
    ['search', 'a', 'b'],
    ['get', 'only-slug'],
    ['frobnicate'],
    ['search', 'x', '--orientation', 'wide'],
    ['search', 'x', '--limit', '0'],
    ['--nope'],
  ])
    assert.equal(await main(argv, io, noSleep), 2, argv.join(' '));
  const failing = await main(['search', 'x'], io, {
    ...noSleep,
    maxRetries: 0,
    fetch: async () => new Response('', { status: 503 }),
  });
  assert.equal(failing, 1);
  const help = spawnSync(
    process.execPath,
    ['scripts/find-images.mjs', '--help'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(help.status, 0);
  assert.match(help.stdout, /CC BY-SA/);
});
