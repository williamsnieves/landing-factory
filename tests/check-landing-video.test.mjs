// Tests for the `video-assets` rule of scripts/check-landing.mjs (add-video, task 3.2) on the fixture root
// tests/fixtures/landing, copied to a temp folder and given a clip, its poster and a build.
import assert from 'node:assert/strict';
import {
  cpSync,
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

import { syncCredits } from '../scripts/credits.mjs';
import {
  builtVideoMatches,
  heroPosterProblems,
  runChecks,
} from '../scripts/check-landing.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/landing');
const tmp = mkdtempSync(join(tmpdir(), 'check-landing-video-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const put = (path, text = 'x') => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};

const pixabayClip = (extra = {}) => ({
  file: 'loop.mp4',
  poster: 'loop.poster.webp',
  kind: 'video',
  title: 'Ocean, waves',
  sourcePage: 'https://pixabay.com/videos/clip-501/',
  author: 'clipmaker',
  license: 'Pixabay Content License',
  credit: true,
  source: 'pixabay',
  durationSec: 12,
  bytes: 2000,
  width: 1280,
  height: 720,
  ...extra,
});

const HERO = (
  img = '<img src="/_astro/loop.poster.webp" alt="" loading="eager" fetchpriority="high" decoding="sync">',
) =>
  `<!doctype html><html lang="en"><head><title>t</title></head><body><main id="main"><section><figure data-video>${img}<video muted loop playsinline preload="none"><source src="/_astro/loop.AbC123xy.mp4" type="video/mp4"></video></figure><h1>Hello</h1></section><section><h2>More</h2><p>text</p></section></main></body></html>`;

/** A fixture root with a clip, its poster, the manifest entry, fresh credits and a build. */
function setup({ entry = pixabayClip(), html = HERO(), mp4 = true } = {}) {
  const root = mkdtempSync(join(tmp, 'root-'));
  cpSync(FIXTURE, root, { recursive: true });
  const site = join(root, 'sites/good');
  put(join(site, 'src/assets/video/loop.mp4'));
  put(join(site, 'src/assets/video/loop.poster.webp'));
  const manifestPath = join(site, 'assets.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (entry) manifest.images.push(entry);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  put(join(site, 'dist/index.html'), html);
  if (mp4) put(join(site, 'dist/_astro/loop.AbC123xy.mp4'));
  try {
    syncCredits({ slug: 'good', root });
  } catch {
    // an invalid entry: credits-in-sync reports it
  }
  return { root, site };
}
const failures = async (root, rule = 'video-assets') =>
  (await runChecks({ slug: 'good', root })).failures.filter(
    (f) => f.rule === rule,
  );

test('a recorded clip, its poster and an eager hero poster pass, and the poster is not an uncredited image', async () => {
  const { root } = setup();
  const result = await runChecks({ slug: 'good', root });
  assert.deepEqual(
    result.failures.filter((f) =>
      ['video-assets', 'uncredited-image', 'credits-stale'].includes(f.rule),
    ),
    [],
  );
  assert.ok(result.checks.some((c) => c.name === 'video-assets' && c.ok));
});

test('a site with no video does not run the rule', async () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  cpSync(FIXTURE, root, { recursive: true });
  const result = await runChecks({ slug: 'good', root });
  assert.ok(!result.checks.some((c) => c.name === 'video-assets'));
});

test('a served .mp4 without an assets.json entry fails naming the file', async () => {
  const { root, site } = setup();
  put(join(site, 'dist/_astro/stray.ZzZ999aa.mp4'));
  const found = await failures(root);
  assert.equal(found.length, 1);
  assert.match(found[0].message, /stray\.ZzZ999aa\.mp4 is served/);
});

test('an .mp4 in the build with no video entries at all still runs the rule', async () => {
  const { root } = setup({ entry: null });
  const found = await failures(root);
  assert.ok(found.some((f) => /loop\.AbC123xy\.mp4 is served/.test(f.message)));
});

test('a video entry needs a license, or an owner and a permission for a customer file', async () => {
  let { root } = setup({ entry: pixabayClip({ license: '' }) });
  assert.match((await failures(root))[0].message, /no "license"/);
  ({ root } = setup({
    entry: pixabayClip({
      source: 'customer',
      owner: 'Clinica',
      permission: '',
      license: undefined,
    }),
  }));
  assert.ok(
    (await failures(root)).some((f) => /no "permission"/.test(f.message)),
  );
  ({ root } = setup({
    entry: pixabayClip({
      source: 'customer',
      owner: 'Clinica',
      permission: 'Written, 2026-11-01',
      license: undefined,
      credit: false,
    }),
  }));
  assert.deepEqual(await failures(root), []);
});

test('a video entry without a poster, or whose poster file is gone, fails', async () => {
  let { root } = setup({ entry: pixabayClip({ poster: undefined }) });
  assert.ok((await failures(root)).some((f) => /no "poster"/.test(f.message)));
  const made = setup();
  rmSync(join(made.site, 'src/assets/video/loop.poster.webp'));
  assert.ok(
    (await failures(made.root)).some((f) =>
      /loop\.poster\.webp of loop\.mp4 does not exist/.test(f.message),
    ),
  );
});

test('an entry whose clip file is gone fails', async () => {
  const made = setup();
  rmSync(join(made.site, 'src/assets/video/loop.mp4'));
  assert.ok(
    (await failures(made.root)).some((f) =>
      /no such file exists in src\/assets/.test(f.message),
    ),
  );
});

test('a hero poster that is lazy, not high priority or missing fails', async () => {
  const lazy = setup({
    html: HERO(
      '<img src="/p.webp" alt="" loading="lazy" fetchpriority="high">',
    ),
  });
  assert.match((await failures(lazy.root))[0].message, /loaded lazily/);
  const plain = setup({ html: HERO('<img src="/p.webp" alt="">') });
  assert.match((await failures(plain.root))[0].message, /fetchpriority="high"/);
  const none = setup({ html: HERO('') });
  assert.match((await failures(none.root))[0].message, /no poster image/);
});

test('a clip that is not in the first section is not a hero', () => {
  const html =
    '<html><body><main><section><h1>Hi</h1></section><section><figure data-video><img src="/p.webp" loading="lazy"><video></video></figure></section></main></body></html>';
  assert.deepEqual(heroPosterProblems(html, '/'), []);
});

test('fingerprinted names match their manifest file and nothing else', () => {
  assert.ok(builtVideoMatches('loop.mp4', 'loop.mp4'));
  assert.ok(builtVideoMatches('loop.AbC123xy.mp4', 'loop.mp4'));
  assert.equal(builtVideoMatches('loop-two.AbC123xy.mp4', 'loop.mp4'), false);
  assert.equal(builtVideoMatches('other.AbC123xy.mp4', 'loop.mp4'), false);
});

test('a clip imported in three places is not a photo overuse', async () => {
  const { root, site } = setup();
  for (const name of ['a', 'b', 'c'])
    put(
      join(site, `src/components/${name}.astro`),
      "---\nimport clip from '../assets/video/loop.mp4';\nimport poster from '../assets/video/loop.poster.webp';\n---\n<p>{clip}{poster}</p>\n",
    );
  assert.deepEqual(await failures(root, 'photo-overuse'), []);
});
