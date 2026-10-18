// `scripts/qa.mjs --site <slug>`: path resolution (unit) and runs against fixture sites.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { listSites } from '../scripts/lib/sites.mjs';
import {
  resolveImpeccableTarget,
  resolveQaPaths,
} from '../scripts/qa/site.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SITES = join(ROOT, 'tests/fixtures/sites');
const out = mkdtempSync(join(tmpdir(), 'qa-site-test-'));
after(() => rmSync(out, { recursive: true, force: true }));

function runQa(site, extra = []) {
  const outDir = mkdtempSync(join(out, 'run-'));
  const result = spawnSync(
    process.execPath,
    [
      'scripts/qa.mjs',
      '--site',
      site,
      '--sites-dir',
      'tests/fixtures/sites',
      '--dist',
      'tests/fixtures/qa/ok',
      '--out',
      outDir,
      ...extra,
    ],
    { cwd: ROOT, encoding: 'utf8', timeout: 240000 },
  );
  const latest = join(outDir, site, 'latest');
  const report = existsSync(latest)
    ? JSON.parse(readFileSync(join(latest, 'report.json'), 'utf8'))
    : null;
  return { ...result, outDir, latest, report };
}

test('without --site the paths are the root starter ones', () => {
  const paths = resolveQaPaths({ root: ROOT });
  assert.equal(paths.site, null);
  assert.equal(paths.projectDir, ROOT);
  assert.equal(paths.configPath, join(ROOT, 'qa.config.json'));
  assert.equal(paths.outRoot, join(ROOT, 'qa'));
  assert.equal(
    resolveImpeccableTarget({
      root: ROOT,
      projectDir: paths.projectDir,
      target: 'src',
    }),
    'src',
  );
});

test('with --site the paths point inside sites/<slug>', () => {
  const paths = resolveQaPaths({ root: ROOT, site: 'strict', sitesDir: SITES });
  assert.equal(paths.projectDir, join(SITES, 'strict'));
  assert.equal(paths.configPath, join(SITES, 'strict/qa.config.json'));
  assert.equal(paths.outRoot, join(ROOT, 'qa/strict'));
  assert.equal(
    resolveImpeccableTarget({
      root: ROOT,
      projectDir: paths.projectDir,
      target: 'src',
    }),
    'tests/fixtures/sites/strict/src',
  );
  // Falls back to the root config when the site has none; --config and --src win.
  const plain = resolveQaPaths({ root: ROOT, site: 'plain', sitesDir: SITES });
  assert.equal(plain.configPath, join(ROOT, 'qa.config.json'));
  const forced = resolveQaPaths({
    root: ROOT,
    site: 'strict',
    sitesDir: SITES,
    config: 'qa.config.json',
    out: 'elsewhere',
  });
  assert.equal(forced.configPath, join(ROOT, 'qa.config.json'));
  assert.equal(forced.outRoot, join(ROOT, 'elsewhere/strict'));
  assert.equal(
    resolveImpeccableTarget({
      root: ROOT,
      projectDir: forced.projectDir,
      src: 'custom',
      target: 'src',
    }),
    'custom',
  );
});

test('an unknown, docs-only or malformed site is refused', () => {
  for (const site of ['missing', 'docs-only'])
    assert.throws(
      () => resolveQaPaths({ root: ROOT, site, sitesDir: SITES }),
      /No site/,
    );
  assert.throws(
    () => resolveQaPaths({ root: ROOT, site: '../x', sitesDir: SITES }),
    /Invalid --site/,
  );
});

test('listSites returns only folders with a package.json', () => {
  assert.deepEqual(listSites(SITES), ['plain', 'strict']);
  assert.deepEqual(listSites(join(SITES, 'nope')), []);
});

test('--site runs against the site, writes qa/<slug>/latest and uses the root config as fallback', () => {
  const r = runQa('plain', ['--skip', 'lighthouse,impeccable']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.report.site, 'plain');
  assert.equal(r.report.verdict, 'passed');
  assert.equal(r.report.config.lighthouse.thresholds.performance, 90);
  assert.ok(existsSync(join(realpathSync(r.latest), 'screens/index-375.png')));
  assert.match(
    readFileSync(join(r.latest, 'report.md'), 'utf8'),
    /Site: `sites\/plain`/,
  );
});

test('the site-level qa.config.json is honoured: a threshold of 101 fails with the top audits', () => {
  const r = runQa('strict', ['--skip', 'impeccable,layout,reduced-motion']);
  assert.equal(r.status, 1, r.stderr);
  assert.equal(r.report.config.lighthouse.thresholds.performance, 101);
  const failure = r.report.failures.find(
    (f) => f.check === 'lighthouse' && f.metric === 'performance',
  );
  assert.ok(failure);
  assert.equal(failure.threshold, 101);
});

test('QA for a site that does not exist is a run error (exit 2) and writes nothing', () => {
  const r = runQa('missing', ['--skip', 'lighthouse,impeccable']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /No site "missing"/);
  assert.equal(r.report, null);
});
