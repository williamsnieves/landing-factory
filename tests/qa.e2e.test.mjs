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
