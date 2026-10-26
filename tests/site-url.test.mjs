// scripts/report/site-url.mjs and the --site-url option of the landing report: the origin of the canonical URL,
// the refusals and a live run against a host that cannot be reached. No network: fetch is stubbed.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  SiteUrlError,
  originFromHtml,
  readSiteUrl,
} from '../scripts/report/site-url.mjs';
import { ROOT, makeSite, runReport } from './report-fixture.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'lf-siteurl-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const page = (head) => `<!doctype html><html><head>${head}</head></html>`;

test('an absolute canonical URL gives its origin', () => {
  assert.equal(
    originFromHtml(
      page('<link rel="canonical" href="https://example.com/some/page/">'),
    ),
    'https://example.com',
  );
});

test('a relative canonical URL, none, or a non-http one is refused with the reason', () => {
  assert.throws(
    () => originFromHtml(page('<link rel="canonical" href="/">')),
    (e) => e instanceof SiteUrlError && /relative/.test(e.message),
  );
  assert.throws(
    () => originFromHtml(page('<title>x</title>')),
    (e) => e instanceof SiteUrlError && /no canonical/.test(e.message),
  );
  assert.throws(
    () => originFromHtml(page('<link rel="canonical" href="ftp://x.test/">')),
    /not an http/,
  );
});

test('readSiteUrl needs dist/index.html', () => {
  const dir = join(tmp, 'empty');
  mkdirSync(dir);
  assert.throws(() => readSiteUrl(dir), /build the site first/);
  writeFileSync(
    join(dir, 'index.html'),
    page('<link rel="canonical" href="https://a.test/">'),
  );
  assert.equal(readSiteUrl(dir), 'https://a.test');
});

test('the command prints the origin, and exits 1 without output on stdout when there is none', () => {
  const dir = join(tmp, 'cli');
  mkdirSync(dir);
  writeFileSync(
    join(dir, 'index.html'),
    page('<link rel="canonical" href="https://b.test/x">'),
  );
  const ok = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts/report/site-url.mjs'), dir],
    { encoding: 'utf8' },
  );
  assert.equal(ok.status, 0);
  assert.equal(ok.stdout, 'https://b.test\n');
  writeFileSync(join(dir, 'index.html'), page('<title>x</title>'));
  const none = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts/report/site-url.mjs'), dir],
    { encoding: 'utf8' },
  );
  assert.equal(none.status, 1);
  assert.equal(none.stdout, '');
  assert.match(none.stderr, /no canonical/);
});

test('--site-url with --url is bad usage (exit 2)', async () => {
  const site = makeSite();
  try {
    const { code, err } = await runReport(site, [
      '--only',
      'live',
      '--site-url',
      '--url',
      'https://x.test',
    ]);
    assert.equal(code, 2);
    assert.match(err, /cannot be used together/);
  } finally {
    site.cleanup();
  }
});

test('--site-url with a relative canonical URL exits 2 with the reason', async () => {
  const site = makeSite();
  try {
    site.write('dist/index.html', page('<link rel="canonical" href="/">'));
    const { code, err } = await runReport(site, [
      '--only',
      'live',
      '--site-url',
    ]);
    assert.equal(code, 2);
    assert.match(err, /--site-url: .*relative/);
  } finally {
    site.cleanup();
  }
});

test('--site-url on an unreachable domain gives only not-run items and exit 0', async () => {
  const site = makeSite();
  const seen = [];
  try {
    const { code, report, out } = await runReport(
      site,
      ['--only', 'live', '--site-url'],
      {
        fetchImpl: async (url) => {
          seen.push(String(url));
          throw new TypeError('fetch failed');
        },
      },
    );
    assert.equal(code, 0, out);
    assert.equal(report.mode, 'live');
    assert.equal(report.url, 'https://fixture.example');
    assert.ok(report.items.length > 0);
    assert.ok(report.items.every((i) => i.status === 'not-run'));
    assert.ok(seen.every((u) => u.startsWith('https://fixture.example')));
  } finally {
    site.cleanup();
  }
});

test('--only live still needs --url or --site-url', async () => {
  const site = makeSite();
  try {
    const { code, err } = await runReport(site, ['--only', 'live']);
    assert.equal(code, 2);
    assert.match(err, /--url <deployed-url> or --site-url/);
  } finally {
    site.cleanup();
  }
});
