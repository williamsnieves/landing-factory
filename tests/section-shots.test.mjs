// Tests for scripts/section-shots.mjs on a tiny fixture dist; also checks that no server is left listening.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { captureSections, main } from '../scripts/section-shots.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/sections');
const tmp = mkdtempSync(join(tmpdir(), 'section-shots-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const quiet = { log() {}, error() {} };

test('writes one screenshot per section per width and leaves no server listening', async () => {
  const out = join(tmp, 'shots');
  const realListen = (await import('node:http')).Server.prototype.listen;
  const servers = [];
  (await import('node:http')).Server.prototype.listen = function (...args) {
    servers.push(this);
    return realListen.apply(this, args);
  };
  try {
    const files = await captureSections({
      distDir: FIXTURE,
      outDir: out,
      widths: [375, 768],
    });
    assert.deepEqual(readdirSync(out).sort(), [
      'index-01-header-375.png',
      'index-01-header-768.png',
      'index-02-one-375.png',
      'index-02-one-768.png',
      'index-03-two-375.png',
      'index-03-two-768.png',
      'index-04-footer-375.png',
      'index-04-footer-768.png',
    ]);
    assert.equal(files.length, 8);
    for (const f of files) assert.ok(statSync(f).size > 500, f);
    assert.ok(servers.length >= 1);
    for (const s of servers) assert.equal(s.listening, false);
  } finally {
    (await import('node:http')).Server.prototype.listen = realListen;
  }
});

test('CLI exit codes: 2 for bad usage, 1 when dist is missing, 0 on success', async () => {
  assert.equal(await main([], quiet), 2);
  assert.equal(await main(['--site', 'Bad Slug'], quiet), 2);
  assert.equal(await main(['--dist', FIXTURE, '--widths', 'ten'], quiet), 2);
  assert.equal(await main(['--site', 'no-such-site-here'], quiet), 1);
  const out = join(tmp, 'cli');
  assert.equal(
    await main(['--dist', FIXTURE, '--widths', '375', '--out', out], quiet),
    0,
  );
  assert.equal(readdirSync(out).length, 4);
  const help = spawnSync(
    process.execPath,
    ['scripts/section-shots.mjs', '--help'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(help.status, 0);
  assert.ok(!existsSync(join(ROOT, 'qa/no-such-site-here')));
});

test('404.html is skipped unless --include-404 is given', async () => {
  const dist = join(tmp, 'dist-404');
  mkdirSync(dist, { recursive: true });
  copyFileSync(join(FIXTURE, 'index.html'), join(dist, 'index.html'));
  copyFileSync(join(FIXTURE, 'index.html'), join(dist, '404.html'));
  const without = join(tmp, 'no-404');
  assert.equal(
    await main(['--dist', dist, '--widths', '375', '--out', without], quiet),
    0,
  );
  assert.ok(!readdirSync(without).some((f) => f.startsWith('404')));
  const withIt = join(tmp, 'with-404');
  assert.equal(
    await main(
      ['--dist', dist, '--widths', '375', '--out', withIt, '--include-404'],
      quiet,
    ),
    0,
  );
  assert.ok(readdirSync(withIt).some((f) => f.startsWith('404-')));
});
