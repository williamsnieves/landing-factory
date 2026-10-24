// Core of scripts/landing-report.mjs: exit codes, item model, output files, configuration, OWASP coverage.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { main } from '../scripts/landing-report.mjs';
import { resolveReportConfig } from '../scripts/report/config.mjs';
import {
  countStatuses,
  makeItem,
  summaryLine,
  verdictOf,
} from '../scripts/report/items.mjs';
import { OWASP_CATEGORIES } from '../scripts/report/owasp.mjs';
import {
  ROOT,
  itemOf,
  makeSite,
  runReport,
  statusOf,
} from './report-fixture.mjs';

const sites = [];
const fresh = () => {
  const site = makeSite();
  sites.push(site);
  return site;
};
after(() => sites.forEach((s) => s.cleanup()));

test('a clean fixture site passes with exit 0 and writes report.json, report.md and a latest link', async () => {
  const site = fresh();
  const { code, report, outDir, out, err } = await runReport(site, [
    '--only',
    'static',
  ]);
  assert.equal(code, 0, out + err);
  assert.equal(report.verdict, 'passed');
  assert.equal(report.counts.fail, 0);
  // The fixture has no brief, so the only warning is the unknown legal market.
  assert.deepEqual(
    report.items
      .filter((i) => i.status === 'fail' || i.status === 'warn')
      .map((i) => `${i.status} ${i.id}`),
    ['warn legal-pages'],
  );
  assert.ok(existsSync(join(outDir, 'report.md')));
  const latest = join(site.root, 'qa/fixture/report/latest');
  assert.ok(lstatSync(latest).isSymbolicLink());
  assert.match(out, /Report PASSED: passed: 0 fail, 1 warn/);
});

test('every item has an area, a status, a title, evidence and a fix', async () => {
  const site = fresh();
  const { report } = await runReport(site, ['--only', 'static']);
  for (const item of report.items) {
    assert.ok(
      ['security', 'performance', 'legal'].includes(item.area),
      item.id,
    );
    assert.ok(
      ['pass', 'warn', 'fail', 'na', 'not-run'].includes(item.status),
      item.id,
    );
    assert.ok(item.title, item.id);
    assert.ok(Array.isArray(item.evidence), item.id);
    assert.equal(typeof item.fix, 'string', item.id);
    if (item.area === 'security')
      assert.ok(item.owasp === null || /^A\d\d$/.test(item.owasp), item.id);
    if (item.status === 'warn' || item.status === 'fail')
      assert.ok(item.fix, `${item.id} needs a fix`);
  }
});

test('one failing item makes the run fail with exit 1 and the Markdown starts with the verdict and counts', async () => {
  const site = fresh();
  site.write('dist/brief.json', '{"business":{"name":"x"}}');
  const { code, report, outDir } = await runReport(site, ['--only', 'static']);
  assert.equal(code, 1);
  assert.equal(report.verdict, 'failed');
  assert.equal(statusOf(report, 'private-files'), 'fail');
  const md = readFileSync(join(outDir, 'report.md'), 'utf8').split('\n');
  assert.equal(md[0], '# Landing report: FAILED');
  assert.match(
    md[2],
    /^failed: 1 fail, \d+ warn, \d+ pass, \d+ n\/a, \d+ not run$/,
  );
  assert.match(md.join('\n'), /## Failures[\s\S]*dist\/brief\.json/);
});

test('warn, n/a and not run never fail the run, and the headline shows how many were not run', async () => {
  const site = fresh();
  site.remove('dist/404.html'); // a warning
  const { code, report, outDir } = await runReport(site, [
    '--only',
    'static',
    '--qa',
    join(site.root, 'missing.json'),
  ]);
  assert.equal(code, 0);
  assert.equal(statusOf(report, 'error-page'), 'warn');
  assert.equal(statusOf(report, 'lh-scores'), 'not-run');
  assert.ok(report.counts['not-run'] >= 1);
  const md = readFileSync(join(outDir, 'report.md'), 'utf8');
  assert.match(md.split('\n')[0], /^# Landing report: passed \(\d+ not run\)$/);
});

test('a bad config (an ignored advisory with no reason) exits 2 and writes no verdict', async () => {
  const site = fresh();
  writeFileSync(
    join(site.siteDir, 'qa.config.json'),
    JSON.stringify({
      report: { audit: { ignore: [{ id: 'GHSA-aaaa-bbbb-cccc' }] } },
    }),
  );
  const { code, err, report } = await runReport(site, ['--only', 'static']);
  assert.equal(code, 2);
  assert.match(
    err,
    /report\.audit\.ignore\[0\]\.reason: an ignored advisory \(GHSA-aaaa-bbbb-cccc\) needs a reason/,
  );
  assert.equal(report, null);
});

test('usage errors exit 2: unknown option, unknown group, --only live without --url, http URL', async () => {
  const site = fresh();
  for (const [args, pattern] of [
    [['--nope'], /Unknown option/i],
    [['--skip', 'bogus'], /unknown group in --skip/],
    [['--only', 'live'], /needs --url/],
    [['--only', 'weird'], /--only must be/],
    [['--url', 'http://example.org/'], /must be an https:\/\/ URL/],
  ]) {
    const { code, err } = await runReport(site, args);
    assert.equal(code, 2, args.join(' '));
    assert.match(err, pattern);
  }
  const unknownSite = await runReport({ ...site, slug: 'nope' }, [
    '--only',
    'static',
  ]);
  assert.equal(unknownSite.code, 2);
  assert.match(unknownSite.err, /No site "nope"/);
});

test('a missing dist/ is built with the build helper; a broken build exits 2 with no verdict', async () => {
  const site = fresh();
  site.remove('dist');
  const calls = [];
  const broken = await runReport(site, ['--only', 'static'], {
    build: async (dir) => {
      calls.push(dir);
      throw new Error('astro build failed with exit code 1');
    },
  });
  assert.equal(broken.code, 2);
  assert.match(broken.err, /the build failed, no verdict was written/);
  assert.equal(broken.report, null);
  assert.deepEqual(calls, [site.siteDir]);

  const rebuilt = await runReport(
    site,
    ['--only', 'static', '--skip', 'perf'],
    {
      build: async (dir) => {
        const { cpSync } = await import('node:fs');
        cpSync(
          join(ROOT, 'tests/fixtures/report/clean/build'),
          join(dir, 'dist'),
          { recursive: true },
        );
      },
    },
  );
  assert.ok(rebuilt.report, rebuilt.err);
  assert.ok(rebuilt.report.pages.includes('/'));
});

test('--help prints the usage and exits 0; the CLI runs as a process', () => {
  const help = spawnSync(
    process.execPath,
    ['scripts/landing-report.mjs', '--help'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  assert.equal(help.status, 0);
  for (const text of [
    '--site',
    '--url',
    '--external-links',
    '--only',
    '--skip',
    '--qa',
    'Exit codes',
  ])
    assert.ok(help.stdout.includes(text), text);
  const bad = spawnSync(
    process.execPath,
    ['scripts/landing-report.mjs', '--site', 'Not A Slug'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Invalid --site/);
});

test('--skip leaves a group out and says so in the report', async () => {
  const site = fresh();
  const { report } = await runReport(site, [
    '--only',
    'static',
    '--skip',
    'audit,perf',
  ]);
  assert.deepEqual(report.skipped, ['audit', 'perf']);
  assert.equal(itemOf(report, 'npm-audit'), undefined);
  assert.equal(itemOf(report, 'lh-scores'), undefined);
});

// --- OWASP coverage (task 3.2) -----------------------------------------------------------------

test('all ten OWASP Top 10:2025 categories appear in the Markdown of a clean site, each with checks or a reason', async () => {
  const site = fresh();
  const { report, outDir } = await runReport(site, ['--only', 'static']);
  assert.equal(report.owaspEdition, '2025');
  const md = readFileSync(join(outDir, 'report.md'), 'utf8');
  assert.equal(OWASP_CATEGORIES.length, 10);
  for (const category of OWASP_CATEGORIES) {
    assert.ok(md.includes(`${category.id} ${category.name}`), category.id);
    assert.ok(
      report.items.some((i) => i.owasp === category.id) || category.naReason,
      `${category.id} has neither an item nor a reason`,
    );
  }
  // A06, A07 and A09 have no checks on a clean static site: one line each with the reason.
  assert.match(md, /\*\*A06 Insecure Design\*\*: not applicable, /);
  assert.match(md, /\*\*A07 Authentication Failures\*\*: not applicable, /);
  assert.match(
    md,
    /\*\*A09 Security Logging and Alerting Failures\*\*: not applicable, /,
  );
  assert.equal(statusOf(report, 'password-fields'), 'na');
});

test('A07 warns and names the page when a built page has a password input', async () => {
  const site = fresh();
  site.write(
    'dist/about/index.html',
    site
      .read('dist/about/index.html')
      .replace(
        '<h1>About</h1>',
        '<h1>About</h1><form><input type="password" name="p"></form>',
      ),
  );
  const { report, code } = await runReport(site, ['--only', 'static']);
  assert.equal(code, 0);
  const item = itemOf(report, 'password-fields');
  assert.equal(item.status, 'warn');
  assert.equal(item.owasp, 'A07');
  assert.match(item.evidence[0], /^\/about\/:\d+ <input type="password">/);
  assert.equal(statusOf(report, 'forms'), 'pass'); // a form, none posting to a third party
});

// --- summary line, item model and config -----------------------------------------------------------

test('--summary prints the verdict line of the newest static and live run of a report folder', async () => {
  const site = fresh();
  const first = await runReport(site, ['--only', 'static']);
  assert.equal(first.code, 0);
  // A second static run replaces the first in the summary; a live run on a local server adds its own line.
  const { createServer } = await import('node:http');
  const server = createServer((req, res) => {
    res
      .writeHead(req.url === '/' ? 200 : 404, { 'content-type': 'text/html' })
      .end('<!doctype html><title>x</title>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    await new Promise((resolve) => setTimeout(resolve, 1100)); // run ids have one-second resolution
    const live = await runReport(site, [
      '--only',
      'live',
      '--url',
      url,
      '--allow-http',
    ]);
    assert.ok(live.report, live.err);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const again = await runReport(site, ['--only', 'static', '--skip', 'perf']);
    const out = [];
    const code = await main(
      ['--summary', join(site.root, 'qa/fixture/report')],
      { log: (m) => out.push(m), error: () => {} },
    );
    assert.equal(code, 0);
    assert.deepEqual(out, [
      `live: ${live.report.summary}`,
      `static: ${again.report.summary}`,
    ]);
  } finally {
    server.close();
  }
  const none = [];
  await main(['--summary', join(site.root, 'does-not-exist')], {
    log: (m) => none.push(m),
    error: () => {},
  });
  assert.deepEqual(none, []);
});

test('makeItem rejects unknown statuses and OWASP ids, and drops the fix of a pass', () => {
  assert.throws(
    () => makeItem({ id: 'x', area: 'security', status: 'ok', title: 't' }),
    /unknown status/,
  );
  assert.throws(
    () =>
      makeItem({
        id: 'x',
        area: 'security',
        owasp: 'A11',
        status: 'pass',
        title: 't',
      }),
    /OWASP/,
  );
  assert.throws(
    () => makeItem({ id: 'x', area: 'web', status: 'pass', title: 't' }),
    /area/,
  );
  assert.equal(
    makeItem({
      id: 'x',
      area: 'security',
      owasp: 'A01',
      status: 'pass',
      title: 't',
      fix: 'f',
    }).fix,
    '',
  );
  const counts = countStatuses([
    { status: 'pass' },
    { status: 'warn' },
    { status: 'na' },
    { status: 'not-run' },
  ]);
  assert.deepEqual(counts, { pass: 1, warn: 1, fail: 0, na: 1, 'not-run': 1 });
  assert.equal(
    verdictOf([{ status: 'warn' }, { status: 'not-run' }]),
    'passed',
  );
  assert.equal(verdictOf([{ status: 'fail' }]), 'failed');
  assert.equal(
    summaryLine('passed', counts),
    'passed: 0 fail, 1 warn, 1 n/a, 1 not run',
  );
});

test('report config: defaults, overrides merged by key, and every problem listed', () => {
  const config = resolveReportConfig({
    lcpMs: 3000,
    audit: { ignore: [{ id: 'GHSA-x', reason: 'dev only' }] },
  });
  assert.equal(config.lcpMs, 3000);
  assert.equal(config.maxPageKb, 1600);
  assert.deepEqual(config.externalLinks, { max: 50, gapMs: 250 });
  assert.throws(
    () =>
      resolveReportConfig({ cls: -1, externalLinks: { max: 0 }, bogus: true }),
    (error) =>
      /report\.cls/.test(error.message) &&
      /externalLinks\.max/.test(error.message) &&
      /report\.bogus: unknown key/.test(error.message),
  );
  // The root qa.config.json documents the defaults and stays in sync with them.
  const root = JSON.parse(readFileSync(join(ROOT, 'qa.config.json'), 'utf8'));
  assert.deepEqual(resolveReportConfig(root.report), resolveReportConfig({}));
});
