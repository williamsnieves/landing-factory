// scripts/legal.mjs: legal.json from the brief (--write, --check, pending values), and the legal components.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
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

import { legalData, main, renderLegalJson } from '../scripts/legal.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/brief');
const tmp = mkdtempSync(join(tmpdir(), 'legal-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const fixture = () =>
  JSON.parse(readFileSync(join(FIXTURE, 'brief.json'), 'utf8'));

/** A factory root holding sites/<slug>/ with the given brief (and the fixture's assets folder). */
function factory(brief = fixture(), slug = 'tienda') {
  const root = mkdtempSync(join(tmp, 'root-'));
  const siteDir = join(root, 'sites', slug);
  mkdirSync(siteDir, { recursive: true });
  cpSync(join(FIXTURE, 'assets'), join(siteDir, 'assets'), { recursive: true });
  const setBrief = (b) =>
    writeFileSync(join(siteDir, 'brief.json'), JSON.stringify(b, null, 2));
  setBrief(brief);
  return {
    root,
    siteDir,
    slug,
    setBrief,
    file: join(siteDir, 'src/data/legal.json'),
    read: () =>
      JSON.parse(readFileSync(join(siteDir, 'src/data/legal.json'), 'utf8')),
  };
}

function cli(f, args) {
  const out = [];
  const err = [];
  const code = main(
    ['--site', f.slug, ...args],
    { log: (m) => out.push(m), error: (m) => err.push(m) },
    f.root,
  );
  return { code, out: out.join('\n'), err: err.join('\n') };
}

test('--write builds legal.json from the ES brief: pages, holder, processing and hosting, nothing pending', () => {
  const f = factory();
  const r = cli(f, ['--write']);
  assert.equal(r.code, 0, r.err);
  const data = f.read();
  assert.equal(data.language, 'es');
  assert.deepEqual(data.markets, ['ES']);
  assert.deepEqual(data.pages, ['notice', 'privacy']);
  assert.equal(data.holder.taxId, 'B00000000');
  assert.equal(data.privacyContact, 'privacidad@example.com');
  assert.equal(data.processing.analytics, 'none');
  assert.deepEqual(data.hosting, {
    target: 'cloudflare-pages',
    name: 'Cloudflare Pages',
  });
  assert.deepEqual(data.pending, []);
  assert.deepEqual(data.thirdPartyHosts, []);
  assert.match(r.out, /pages required: notice, privacy; markets: ES/);
  assert.ok(!/PENDING/.test(r.out));
});

test('a missing tax id is listed as pending and the output says so; nothing is invented', () => {
  const brief = fixture();
  brief.legal.holder.taxId = '';
  const f = factory(brief);
  const r = cli(f, ['--write']);
  assert.equal(r.code, 0, r.err);
  const data = f.read();
  assert.deepEqual(data.pending, ['holder.taxId']);
  assert.equal(data.holder.taxId, '');
  assert.match(r.out, /PENDING .*holder\.taxId/);
});

test('--check exits 1 when the file is stale against the brief and 0 once it is rewritten', () => {
  const f = factory();
  assert.equal(cli(f, ['--check']).code, 1, 'no file yet');
  assert.equal(cli(f, ['--write']).code, 0);
  assert.equal(cli(f, ['--check']).code, 0);
  const brief = fixture();
  brief.legal.holder.address = 'Otra calle 2, Valencia';
  f.setBrief(brief);
  const stale = cli(f, ['--check']);
  assert.equal(stale.code, 1);
  assert.match(stale.err, /out of date.*--write/);
  assert.equal(cli(f, ['--write']).code, 0);
  assert.equal(cli(f, ['--check']).code, 0);
  assert.equal(f.read().holder.address, 'Otra calle 2, Valencia');
});

test('without --write or --check the data is printed and nothing is written', () => {
  const f = factory();
  const r = cli(f, []);
  assert.equal(r.code, 0);
  assert.match(r.out, /"taxId": "B00000000"/);
  assert.ok(!existsSync(f.file));
});

test('the output is stable under Prettier, long lists included', () => {
  const brief = fixture();
  brief.legal.processing.embeds = [
    'YouTube (privacy-enhanced mode)',
    'Google Maps',
    'Vimeo with do-not-track',
    'Calendly booking widget',
  ];
  brief.legal.markets = [
    'ES',
    'DE',
    'FR',
    'IT',
    'PT',
    'NL',
    'BE',
    'IE',
    'AT',
    'PL',
    'US',
    'GB',
  ];
  const f = factory(brief);
  assert.equal(cli(f, ['--write']).code, 0);
  const prettier = join(ROOT, 'node_modules/.bin/prettier');
  const result = spawnSync(prettier, ['--check', f.file], {
    encoding: 'utf8',
    cwd: f.siteDir,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  // And rendering the parsed data again gives the same bytes.
  const text = readFileSync(f.file, 'utf8');
  assert.equal(renderLegalJson(JSON.parse(text)), text);
});

test('no market: nothing is written and the requirements are reported unknown; an old file makes --check fail', () => {
  const brief = fixture();
  brief.legal.markets = [];
  const f = factory(brief);
  const r = cli(f, ['--write']);
  assert.equal(r.code, 0);
  assert.match(r.out, /names no market/);
  assert.match(r.out, /unknown/);
  assert.ok(!existsSync(f.file));
  assert.equal(cli(f, ['--check']).code, 0);
  mkdirSync(join(f.siteDir, 'src/data'), { recursive: true });
  writeFileSync(f.file, '{}\n');
  assert.equal(cli(f, ['--check']).code, 1);
});

test('market rule sets decide the pages: EU needs a privacy contact, US has no rule set', () => {
  const eu = fixture();
  eu.legal.markets = ['DE'];
  eu.legal.holder.email = '';
  eu.legal.privacyContact = '';
  const f = factory(eu);
  assert.equal(cli(f, ['--write']).code, 0);
  assert.deepEqual(f.read().pages, ['privacy']);
  assert.deepEqual(f.read().pending, ['privacyContact']);

  const us = fixture();
  us.legal.markets = ['US'];
  const g = factory(us);
  const r = cli(g, ['--write']);
  assert.equal(r.code, 0);
  assert.deepEqual(g.read().pages, []);
  assert.deepEqual(g.read().unknownMarkets, ['US']);
  assert.match(r.err, /no rule set for US/);
});

test('the analytics answer is pending when a privacy policy is required and the brief does not give it', () => {
  const brief = fixture();
  brief.legal.processing.analytics = '';
  const f = factory(brief);
  assert.equal(cli(f, ['--write']).code, 0);
  assert.deepEqual(f.read().pending, ['processing.analytics']);
});

test('a page language without a template falls back to English and warns', () => {
  const brief = fixture();
  brief.language = 'fr';
  const f = factory(brief);
  const r = cli(f, ['--write']);
  assert.equal(r.code, 0);
  assert.equal(f.read().language, 'en');
  assert.match(r.err, /no legal text for the page language "fr"/);
  assert.equal(legalData({ ...brief, language: 'es-MX' }).data.language, 'es');
});

test('third-party hosts come from the build; without a build the recorded hosts are kept', () => {
  const f = factory();
  mkdirSync(join(f.siteDir, 'dist'), { recursive: true });
  writeFileSync(
    join(f.siteDir, 'dist/index.html'),
    '<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=x"></head><body>' +
      '<script type="text/plain" data-consent="analytics" src="https://www.googletagmanager.com/gtag/js"></script></body></html>',
  );
  assert.equal(cli(f, ['--write']).code, 0);
  // A consent-gated script is inert, so it is not listed as a host the page contacts.
  assert.deepEqual(f.read().thirdPartyHosts, ['fonts.googleapis.com']);
  rmSync(join(f.siteDir, 'dist'), { recursive: true });
  assert.equal(
    cli(f, ['--check']).code,
    0,
    'no build: the recorded hosts stay',
  );
  assert.deepEqual(f.read().thirdPartyHosts, ['fonts.googleapis.com']);
});

test('usage and brief errors: no site, both flags, a missing or invalid brief', () => {
  const f = factory();
  assert.equal(main([], { log() {}, error() {} }, f.root), 2);
  assert.equal(cli(f, ['--write', '--check']).code, 2);
  assert.equal(
    main(['--site', 'Bad Slug'], { log() {}, error() {} }, f.root),
    2,
  );
  assert.equal(main(['--site', 'nope'], { log() {}, error() {} }, f.root), 2);
  const broken = fixture();
  broken.legal.markets = ['Spain'];
  f.setBrief(broken);
  const r = cli(f, ['--write']);
  assert.equal(r.code, 1);
  assert.match(r.err, /legal\.markets\[0\]/);
  assert.ok(!existsSync(f.file));
  const help = [];
  assert.equal(
    main(['--help'], { log: (m) => help.push(m), error() {} }, f.root),
    0,
  );
  assert.match(help.join('\n'), /not legal advice/);
});

test('the generator is wired: npm script, allow list, and the process runs', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.legal, 'node scripts/legal.mjs');
  const allow = JSON.parse(
    readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'),
  ).permissions.allow;
  assert.ok(allow.includes('Bash(node scripts/legal.mjs *)'));
  assert.ok(!allow.some((p) => /^Bash\(node (\*|scripts\/\*)/.test(p)));
  const f = factory();
  const run = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts/legal.mjs'), '--site', f.slug, '--check'],
    { encoding: 'utf8', env: { ...process.env, LANDING_FACTORY_ROOT: f.root } },
  );
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, /out of date/);
});
