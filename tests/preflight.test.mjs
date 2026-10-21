// Tests for scripts/preflight.mjs with an injected fetch: no network, no real Chromium lookup.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  HOST_CHECKS,
  checkSlug,
  findChromium,
  formatReport,
  runPreflight,
} from '../scripts/preflight.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'preflight-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

/** fetch stub: host -> status number | Error. Unlisted hosts answer 200. */
const stubFetch = (byHost = {}) => {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const answer = byHost[new URL(url).host] ?? 200;
    if (answer instanceof Error) throw answer;
    return { status: answer };
  };
  fn.calls = calls;
  return fn;
};
const okChromium = {
  env: { QA_CHROME_PATH: '/fake/chrome' },
  exists: () => true,
};
const sitesDir = () => mkdtempSync(join(tmp, 'sites-'));

test('all checks pass when every host answers and Chromium and the slug are fine', async () => {
  const fetch = stubFetch();
  const result = await runPreflight({
    slug: 'clinica',
    fetch,
    sitesDir: sitesDir(),
    chromium: okChromium,
  });
  assert.equal(result.ok, true);
  assert.equal(result.checks.length, HOST_CHECKS.length + 2);
  assert.match(formatReport(result), /all checks passed/);
  // Wikimedia requires a descriptive User-Agent.
  for (const call of fetch.calls)
    assert.match(call.init.headers['user-agent'], /^landing-factory\//);
});

test('a blocked host is named with the fix, and every failure is reported at once', async () => {
  const result = await runPreflight({
    slug: 'Bad Slug',
    fetch: stubFetch({
      'upload.wikimedia.org': 403,
      'commons.wikimedia.org': Object.assign(new Error('fetch failed'), {
        cause: { code: 'ENOTFOUND' },
      }),
    }),
    sitesDir: sitesDir(),
    chromium: {
      env: {},
      exists: () => false,
      playwrightPath: async () => null,
      list: () => [],
    },
  });
  assert.equal(result.ok, false);
  const report = formatReport(result);
  assert.match(report, /FAILED/);
  assert.match(report, /upload\.wikimedia\.org answered HTTP 403/);
  assert.match(
    report,
    /commons\.wikimedia\.org is not reachable \(ENOTFOUND\)/,
  );
  assert.match(report, /allow upload\.wikimedia\.org/);
  assert.match(report, /Chromium: no Chromium found/);
  assert.match(report, /Site slug: Invalid slug/);
  assert.equal(result.checks.filter((c) => !c.ok).length, 4);
  // The npm registry check still ran and passed.
  assert.ok(result.checks.find((c) => c.name === 'npm registry').ok);
});

test('429 counts as reachable, 404 on the image host too, 5xx does not', async () => {
  const ok = await runPreflight({
    fetch: stubFetch({
      'commons.wikimedia.org': 429,
      'upload.wikimedia.org': 404,
    }),
    chromium: okChromium,
  });
  assert.equal(ok.ok, true);
  const bad = await runPreflight({
    fetch: stubFetch({ 'registry.npmjs.org': 503 }),
    chromium: okChromium,
  });
  assert.equal(bad.ok, false);
  assert.match(formatReport(bad), /registry\.npmjs\.org answered HTTP 503/);
});

test('a timeout is reported as no answer', async () => {
  // AbortSignal.timeout timers are unref'd; keep the loop alive until the abort fires.
  const hang = (url, init) =>
    new Promise((_, reject) => {
      const keepAlive = setTimeout(() => {}, 5000);
      init.signal.addEventListener('abort', () => {
        clearTimeout(keepAlive);
        reject(init.signal.reason);
      });
    });
  const result = await runPreflight({
    fetch: hang,
    chromium: okChromium,
    timeoutMs: 30,
  });
  assert.equal(result.ok, false);
  assert.match(formatReport(result), /no answer within/);
});

test('findChromium prefers the env var, then Playwright, then /opt/pw-browsers (newest first)', async () => {
  assert.deepEqual(
    await findChromium({ env: { QA_CHROME_PATH: '/a' }, exists: () => true }),
    { path: '/a', source: 'QA_CHROME_PATH' },
  );
  // An env var that points nowhere is a failure, not a fallback.
  assert.equal(
    await findChromium({
      env: { CHROME_PATH: '/missing' },
      exists: () => false,
    }),
    null,
  );
  assert.deepEqual(
    await findChromium({
      env: {},
      exists: (p) => p === '/pw/chrome',
      playwrightPath: async () => '/pw/chrome',
    }),
    { path: '/pw/chrome', source: 'playwright' },
  );
  const found = await findChromium({
    env: {},
    playwrightPath: async () => null,
    list: () => [
      'chromium-1100',
      'chromium-1194',
      'ffmpeg-1011',
      'chromium_headless_shell-1194',
    ],
    exists: (p) => p.includes('chromium-1194'),
    preinstalledDir: '/opt/x',
  });
  assert.deepEqual(found, {
    path: '/opt/x/chromium-1194/chrome-linux/chrome',
    source: 'pw-browsers',
  });
});

test('checkSlug: free, planning docs only, and occupied folders', () => {
  const dir = sitesDir();
  assert.equal(checkSlug('nuevo', dir).ok, true);
  mkdirSync(join(dir, 'docs-only'));
  writeFileSync(join(dir, 'docs-only/PROPOSAL.md'), 'x');
  assert.equal(checkSlug('docs-only', dir).ok, true);
  mkdirSync(join(dir, 'taken/src'), { recursive: true });
  writeFileSync(join(dir, 'taken/package.json'), '{}');
  const taken = checkSlug('taken', dir);
  assert.equal(taken.ok, false);
  assert.match(taken.detail, /already exists \(package\.json, src\)/);
  assert.equal(checkSlug('Not A Slug', dir).ok, false);
});

test('the CLI prints help and exits 2 on bad usage', () => {
  const run = (...args) =>
    spawnSync(process.execPath, ['scripts/preflight.mjs', ...args], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  const help = run('--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--slug/);
  const bad = run('--nope');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /preflight:/);
  const extra = run('stray');
  assert.equal(extra.status, 2);
});
