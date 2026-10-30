// End-to-end runs of scripts/qa.mjs against tiny static fixtures (--dist), so no build is needed.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = mkdtempSync(join(tmpdir(), 'qa-test-'));
after(() => rmSync(out, { recursive: true, force: true }));

function runQa(fixture, extra = []) {
  const outDir = mkdtempSync(join(out, 'run-'));
  const result = spawnSync(
    process.execPath,
    [
      'scripts/qa.mjs',
      '--dist',
      `tests/fixtures/qa/${fixture}`,
      '--out',
      outDir,
      ...extra,
    ],
    { cwd: ROOT, encoding: 'utf8', timeout: 240000 },
  );
  const latest = join(outDir, 'latest');
  const report = existsSync(latest)
    ? JSON.parse(readFileSync(join(latest, 'report.json'), 'utf8'))
    : null;
  return { ...result, outDir, latest, report };
}

const FAST = ['--skip', 'lighthouse,impeccable'];

test('overflow fixture fails at 375 px and names the element', () => {
  const r = runQa('overflow-375', FAST);
  assert.equal(r.status, 1, r.stderr);
  const failures = r.report.failures.filter((f) => f.check === 'overflow');
  assert.ok(failures.length > 0);
  assert.ok(
    failures.every((f) => f.viewport === 375),
    'only 375 px overflows',
  );
  const element = failures.find((f) => f.selector);
  assert.match(element.selector, /div\.wide/);
  assert.equal(element.measured, 616);
  assert.equal(r.report.verdict, 'failed');
});

test('invisible [data-reveal] fails the reduced-motion check', () => {
  const r = runQa('reveal-invisible', FAST);
  assert.equal(r.status, 1, r.stderr);
  const failure = r.report.failures.find((f) => f.check === 'reduced-motion');
  assert.ok(failure, 'expected a reduced-motion failure');
  assert.equal(failure.measured, 0);
  assert.match(failure.selector, /p:nth-of-type\(1\)/);
});

test('a reveal that ends shifted fails reveal-end-state, a settled one passes', () => {
  const bad = runQa('reveal-shifted', FAST);
  assert.equal(bad.status, 1, bad.stderr);
  const failure = bad.report.failures.find(
    (f) => f.check === 'reveal-end-state',
  );
  assert.ok(failure, 'expected a reveal-end-state failure');
  assert.equal(failure.viewport, 1440);
  assert.equal(failure.metric, 'transform');
  assert.match(failure.measured, /matrix\(1, 0, 0, 1, 0, 32\)/);
  assert.match(failure.selector, /p:nth-of-type\(1\)/);

  const good = runQa('reveal-settled', FAST);
  assert.equal(
    good.status,
    0,
    good.stderr + JSON.stringify(good.report?.failures),
  );
  assert.equal(good.report.pages[0].revealEndState.pass, true);

  const skipped = runQa('reveal-shifted', [
    '--skip',
    'lighthouse,impeccable,reveal-end-state',
  ]);
  assert.equal(skipped.status, 0, skipped.stderr);
});

test('clipped text fails unless data-qa-allow-clip is set', () => {
  const r = runQa('clipped-text', FAST);
  assert.equal(r.status, 1, r.stderr);
  const clipped = r.report.failures.filter((f) => f.check === 'clipped-text');
  assert.equal(clipped.length, 3, 'one failing paragraph per viewport');
  assert.ok(clipped.every((f) => f.selector.includes('p.clip:nth-of-type(1)')));
});

test('a passing fixture exits 0 with screenshots, reports, latest link and a closed server', async () => {
  const r = runQa('ok', ['--skip', 'impeccable']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.report.verdict, 'passed');
  const runDir = realpathSync(r.latest);
  assert.deepEqual(readdirSync(join(runDir, 'screens')).sort(), [
    'index-1440.png',
    'index-375.png',
    'index-768.png',
  ]);
  assert.ok(existsSync(join(runDir, 'report.md')));
  const lh = r.report.pages[0].lighthouse;
  for (const cat of ['performance', 'accessibility', 'seo'])
    assert.ok(lh.worst[cat] >= 90, `${cat} ${lh.worst[cat]}`);
  await assert.rejects(
    fetch(r.report.source.baseUrl),
    'server must be shut down after the run',
  );
});

test('raising a Lighthouse threshold to 101 fails the run with the top audits', () => {
  const config = join(out, 'strict.json');
  writeFileSync(
    config,
    JSON.stringify({ lighthouse: { thresholds: { performance: 101 } } }),
  );
  const r = runQa('ok', [
    '--skip',
    'impeccable,layout,reduced-motion',
    '--config',
    config,
  ]);
  assert.equal(r.status, 1, r.stderr);
  const failure = r.report.failures.find(
    (f) => f.check === 'lighthouse' && f.metric === 'performance',
  );
  assert.ok(failure);
  assert.equal(failure.threshold, 101);
  assert.ok(failure.measured >= 90);
});

test('an invalid config is a run error (exit 2), not a pass', () => {
  const config = join(out, 'broken.json');
  writeFileSync(
    config,
    JSON.stringify({ lighthouse: { thresholds: { performance: 'high' } } }),
  );
  const r = runQa('ok', [...FAST, '--config', config]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Invalid QA config/);
});

// --- Privacy record (add-legal-compliance, design Decision 1) --------------------------

test('the privacy record holds cookie names, storage keys and third-party hosts, never their values, and the verdict is unchanged', () => {
  const r = runQa('privacy', FAST);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.report.verdict, 'passed');
  const record = r.report.pages[0].privacy;
  assert.equal(record.viewport, 1440);
  assert.deepEqual(record.cookies, [
    {
      name: '_ga',
      domain: '127.0.0.1',
      path: '/',
      session: true,
      thirdParty: false,
    },
  ]);
  assert.deepEqual(record.storage, {
    local: ['fx_pref'],
    session: ['fx_tab'],
  });
  assert.deepEqual(record.thirdPartyHosts, ['localhost']);
  // The values the page stored never reach the report, in any form.
  for (const file of ['report.json', 'report.md']) {
    const text = readFileSync(join(r.latest, file), 'utf8');
    for (const value of ['COOKIEVALUE', 'STORAGEVALUE', 'SESSIONVALUE'])
      assert.ok(!text.includes(value), `${file} leaks ${value}`);
  }
  assert.match(
    readFileSync(join(r.latest, 'report.md'), 'utf8'),
    /Privacy record \(1440px; names and keys only, never values\): cookies: _ga \(127\.0\.0\.1\)/,
  );
});

test('a page that stores nothing has an empty privacy record', () => {
  const r = runQa('ok', FAST);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.report.pages[0].privacy, {
    viewport: 1440,
    cookies: [],
    storage: { local: [], session: [] },
    thirdPartyHosts: [],
  });
});

test('skipping the layout check skips the privacy record', () => {
  const r = runQa('ok', ['--skip', 'lighthouse,impeccable,layout']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.report.pages[0].privacy, null);
});

// --- 3D scene checks (design.md Decision 5) -----------------------------------------

const SCENES = ['--skip', 'lighthouse,impeccable,layout'];
const sceneFailures = (r, check) =>
  r.report.failures.filter((f) => f.check === check);

test('a page with a well-behaved scene passes every scene check', () => {
  const r = runQa('scene-ok', SCENES);
  assert.equal(r.status, 0, r.stderr);
  const scenes = r.report.pages[0].scenes;
  assert.deepEqual(scenes.names, ['demo']);
  assert.equal(scenes.reducedMotion.pass, true);
  assert.equal(scenes.noJs.pass, true);
  assert.equal(scenes.runtime.pass, true);
  assert.equal(scenes.budget.chunks.length, 1);
  assert.match(scenes.budget.chunks[0].url, /three-chunk\.js$/);
  assert.match(
    readFileSync(join(r.latest, 'report.md'), 'utf8'),
    /3D budget: pass/,
  );
});

test('a canvas under reduced motion fails scene-reduced-motion naming the scene', () => {
  const r = runQa('scene-canvas-reduced', SCENES);
  assert.equal(r.status, 1, r.stderr);
  const f = sceneFailures(r, 'scene-reduced-motion').find(
    (x) => x.metric === 'canvas',
  );
  assert.ok(f, 'expected a scene-reduced-motion canvas failure');
  assert.equal(f.selector, '[data-scene="demo"]');
  assert.match(f.message, /scene "demo" created a canvas/);
});

test('a scene without a poster fails with and without JavaScript', () => {
  const r = runQa('scene-no-poster', SCENES);
  assert.equal(r.status, 1, r.stderr);
  assert.ok(sceneFailures(r, 'scene-no-js').length > 0, 'no-js failure');
  assert.ok(
    sceneFailures(r, 'scene-reduced-motion').some((f) => f.metric === 'poster'),
    'reduced-motion poster failure',
  );
});

test('a scene that throws fails scene-runtime with the error message', () => {
  const r = runQa('scene-throws', SCENES);
  assert.equal(r.status, 1, r.stderr);
  const runtime = sceneFailures(r, 'scene-runtime');
  assert.ok(
    runtime.some(
      (f) => f.metric === 'error' && /WebGLRenderer/.test(f.message),
    ),
    'page error reported',
  );
  assert.ok(
    runtime.some((f) => f.metric === 'canvas'),
    'missing canvas reported',
  );
});

test('an oversized 3D chunk fails scene-budget with measured size and budget', () => {
  const dist = mkdtempSync(join(out, 'oversized-'));
  const fixture = join(ROOT, 'tests/fixtures/qa/scene-ok');
  writeFileSync(
    join(dist, 'index.html'),
    readFileSync(join(fixture, 'index.html')),
  );
  // Incompressible filler: the chunk keeps the three marker and weighs well over 20 KB gzip.
  let seed = 7;
  let filler = '';
  for (let i = 0; i < 40000; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    filler += seed.toString(36);
  }
  writeFileSync(
    join(dist, 'three-chunk.js'),
    `// WebGLRenderer\nwindow.__blob="${filler}";\n`,
  );
  const config = join(out, 'budget.json');
  writeFileSync(config, JSON.stringify({ threeD: { maxGzipKb: 20 } }));
  const r = spawnSync(
    process.execPath,
    [
      'scripts/qa.mjs',
      '--dist',
      dist,
      '--out',
      join(out, 'budget-run'),
      '--config',
      config,
      ...SCENES,
    ],
    { cwd: ROOT, encoding: 'utf8', timeout: 240000 },
  );
  assert.equal(r.status, 1, r.stderr);
  const report = JSON.parse(
    readFileSync(join(out, 'budget-run', 'latest', 'report.json'), 'utf8'),
  );
  const f = report.failures.find((x) => x.check === 'scene-budget');
  assert.ok(f, 'expected a scene-budget failure');
  assert.equal(f.threshold, 20);
  assert.ok(f.measured > 20, `measured ${f.measured}`);
  assert.match(f.message, /KB gzip \(budget 20 KB\)/);
});
