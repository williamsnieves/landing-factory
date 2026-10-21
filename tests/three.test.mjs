// Unit tests for the 3D layer's pure logic (gating, progress) and for the helpers of
// render-poster and the scene QA checks. No browser needed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cappedPixelRatio,
  isWebGLUnavailable,
  loopProgress,
  sceneNameFromPath,
  sceneSkipReason,
  scrollProgress,
} from '../src/components/three/gating.ts';
import {
  scrollForProgress,
  selfEntry,
  upsertEntry,
} from '../scripts/render-poster.mjs';
import {
  budgetResult,
  sceneNames,
  threeChunks,
} from '../scripts/qa/scene-checks.mjs';

test('gating: reduced motion wins, then missing WebGL, otherwise run', () => {
  assert.equal(
    sceneSkipReason({ reducedMotion: true, webgl: true }),
    'reduced-motion',
  );
  assert.equal(
    sceneSkipReason({ reducedMotion: true, webgl: false }),
    'reduced-motion',
  );
  assert.equal(
    sceneSkipReason({ reducedMotion: false, webgl: false }),
    'no-webgl',
  );
  assert.equal(sceneSkipReason({ reducedMotion: false, webgl: true }), null);
});

test('pixel ratio is capped at 2, and at 1.5 under 768 px', () => {
  assert.equal(cappedPixelRatio(3, 1440), 2);
  assert.equal(cappedPixelRatio(3, 375), 1.5);
  assert.equal(cappedPixelRatio(1, 375), 1);
  assert.equal(cappedPixelRatio(0, 1440), 1);
});

test('scene names come from glob keys', () => {
  assert.equal(sceneNameFromPath('/src/scenes/demo.ts'), 'demo');
  assert.equal(sceneNameFromPath('/src/scenes/hero-blade.ts'), 'hero-blade');
  assert.equal(sceneNameFromPath('/src/scenes/'), null);
});

test('scroll progress runs 0 to 1 while a section crosses the viewport', () => {
  const height = 600;
  const vh = 900;
  assert.equal(scrollProgress({ top: vh, height }, vh), 0);
  assert.equal(scrollProgress({ top: vh + 50, height }, vh), 0);
  assert.equal(scrollProgress({ top: -height, height }, vh), 1);
  const mid = scrollProgress({ top: (vh - height) / 2, height }, vh);
  assert.ok(Math.abs(mid - 0.5) < 1e-9);
});

test('loop progress wraps every period', () => {
  assert.equal(loopProgress(0, 20), 0);
  assert.equal(loopProgress(10000, 20), 0.5);
  assert.equal(loopProgress(20000, 20), 0);
});

test('only an unavailable WebGL context counts as an environment limit', () => {
  assert.equal(
    isWebGLUnavailable(
      new Error('THREE.WebGLRenderer: Error creating WebGL context.'),
    ),
    true,
  );
  assert.equal(isWebGLUnavailable(new Error('x is not a function')), false);
});

test('render-poster scroll offset puts the section at the requested progress', () => {
  const placement = { top: 1000, height: 600 };
  const y = scrollForProgress(placement, 900, 0.5);
  assert.equal(
    scrollProgress({ top: placement.top - y, height: 600 }, 900),
    0.5,
  );
  assert.equal(scrollForProgress({ top: 100, height: 600 }, 900, 0), 0);
});

test('render-poster records a self-made poster, replacing an older entry', () => {
  const entry = selfEntry({
    file: 'hero-poster.jpg',
    scene: 'hero',
    page: '/',
    retrievedAt: '2026-10-21T00:00:00.000Z',
  });
  assert.equal(entry.source, 'self');
  assert.equal(entry.credit, false);
  assert.equal(entry.license, 'Original (rendered from site code)');
  const once = upsertEntry({ images: [{ file: 'a.jpg' }] }, entry);
  const twice = upsertEntry(once, { ...entry, note: 'again' });
  assert.deepEqual(
    twice.images.map((i) => i.file),
    ['a.jpg', 'hero-poster.jpg'],
  );
  assert.equal(twice.images[1].note, 'again');
});

test('QA helpers find scenes in HTML and Three.js chunks by content marker', () => {
  assert.deepEqual(
    sceneNames('<figure data-scene="a"></figure><div data-scene=\'b\'>'),
    ['a', 'b'],
  );
  assert.deepEqual(sceneNames('<p>data-scenery</p>'), []);
  const chunks = threeChunks([
    { url: 'http://x/a.js', body: Buffer.from('class X{} // WebGLRenderer') },
    { url: 'http://x/b.js', body: Buffer.from('console.log(1)') },
  ]);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].url, 'http://x/a.js');
  const ok = budgetResult(chunks, 200);
  assert.equal(ok.pass, true);
  assert.equal(budgetResult(chunks, 0.001).pass, false);
});
