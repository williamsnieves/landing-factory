import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  REQUIRED_SECTIONS,
  validatePattern,
} from '../scripts/validate-pattern.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'validate-pattern-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const FRONT = `---
url: https://reference.example/landing
slug: demo
date: 2026-10-17
focus: pinned storytelling
libraries: [gsap, lenis]
---
`;
const sectionsText = (overrides = {}) =>
  REQUIRED_SECTIONS.map(
    (name) =>
      `## ${name}\n\n${name in overrides ? overrides[name] : `Abstract notes about ${name}.`}\n`,
  ).join('\n');
const sheet = (overrides = {}, front = FRONT) =>
  `${front}\n# demo\n\n${sectionsText(overrides)}`;

const rules = (text, options) =>
  validatePattern(text, options).map((v) => v.rule);

test('a well-formed sheet is valid', () => {
  assert.deepEqual(validatePattern(sheet(), { expectedSlug: 'demo' }), []);
});

test('the real template, once filled in with dummy data, passes', () => {
  const template = readFileSync(join(ROOT, 'patterns/_template.md'), 'utf8');
  const filled = template
    .replace(/'\{\{url\}\}'/, 'https://reference.example/')
    .replace(/'\{\{slug\}\}'/, 'dummy')
    .replace(/'\{\{YYYY-MM-DD\}\}'/, '2026-10-17')
    .replace(/\{\{[^}]*\}\}/g, 'dummy value');
  assert.deepEqual(validatePattern(filled, { expectedSlug: 'dummy' }), []);
});

test('the raw template fails: unfilled placeholders are reported', () => {
  const template = readFileSync(join(ROOT, 'patterns/_template.md'), 'utf8');
  assert.ok(rules(template).includes('placeholder'));
});

test('a missing section fails and names it', () => {
  const text = sheet().replace('## Motion', '## Movement');
  const v = validatePattern(text);
  assert.equal(v.length, 1);
  assert.equal(v[0].rule, 'section-missing');
  assert.match(v[0].message, /## Motion/);
});

test('an empty section fails with its line number', () => {
  const text = sheet({ Palette: '' });
  const v = validatePattern(text);
  assert.deepEqual(
    v.map((x) => x.rule),
    ['section-empty'],
  );
  assert.equal(text.split('\n')[v[0].line - 1], '## Palette');
});

test('missing frontmatter keys fail', () => {
  const front = FRONT.replace('focus: pinned storytelling\n', '');
  assert.match(
    validatePattern(sheet({}, front))[0].message,
    /Missing frontmatter key "focus"/,
  );
  assert.deepEqual(rules('# no frontmatter\n'), [
    'frontmatter',
    ...REQUIRED_SECTIONS.map(() => 'section-missing'),
  ]);
});

test('slug must match the expected file name', () => {
  assert.deepEqual(rules(sheet(), { expectedSlug: 'other' }), ['frontmatter']);
});

test('image, video, font and model URLs fail with the line number', () => {
  for (const url of [
    'https://cdn.example/hero.jpg',
    'https://cdn.example/a/clip.MP4?x=1',
    'https://cdn.example/f.woff2',
    'https://cdn.example/model.glb',
    '/assets/logo.svg',
  ]) {
    const text = sheet({ Hero: `Uses ${url} as backdrop.` });
    const v = validatePattern(text);
    assert.deepEqual(
      v.map((x) => x.rule),
      ['media-url'],
      url,
    );
    assert.match(text.split('\n')[v[0].line - 1], /backdrop/);
  }
  assert.deepEqual(
    rules(sheet({ Hero: 'See https://reference.example/about for context.' })),
    [],
  );
});

test('fenced code blocks longer than 3 lines fail, short ones pass', () => {
  const long = '```css\na {}\nb {}\nc {}\nd {}\n```';
  const short = '```text\nx\ny\nz\n```';
  assert.deepEqual(rules(sheet({ Hero: long })), ['code-block']);
  assert.deepEqual(rules(sheet({ Hero: short })), []);
});

test('hex colors fail in all lengths, anchors and issue numbers do not', () => {
  for (const hex of ['#abc', '#aabbcc', '#AABBCCDD']) {
    assert.deepEqual(
      rules(sheet({ Palette: `Background ${hex} and more.` })),
      ['hex-color'],
      hex,
    );
  }
  assert.deepEqual(
    rules(sheet({ Palette: 'Item #1, anchor https://x.example/p#abc ok.' })),
    [],
  );
});

test('rgb() and hsl() literals fail', () => {
  assert.deepEqual(rules(sheet({ Palette: 'Text rgb(10, 10, 10).' })), [
    'color-literal',
  ]);
  assert.deepEqual(rules(sheet({ Palette: 'Accent hsla(20 80% 50% / 1).' })), [
    'color-literal',
  ]);
});

test('quoted strings over 12 words fail unless on a "> note:" line', () => {
  const quote =
    '"one two three four five six seven eight nine ten eleven twelve thirteen"';
  assert.deepEqual(rules(sheet({ Summary: `Headline reads ${quote}.` })), [
    'long-quote',
  ]);
  assert.deepEqual(
    rules(sheet({ Summary: `Headline reads “${quote.slice(1, -1)}”.` })),
    ['long-quote'],
  );
  assert.deepEqual(
    rules(sheet({ Summary: `> note: own remark ${quote}` })),
    [],
  );
  assert.deepEqual(
    rules(sheet({ Summary: 'Short label "one two three" is fine.' })),
    [],
  );
});

test('the note exemption does not cover hex colors', () => {
  assert.deepEqual(rules(sheet({ Summary: '> note: color #ff0000' })), [
    'hex-color',
  ]);
});

test('CLI: reports file:line and exits 1 for an invalid sheet, 0 for a valid one', () => {
  const bad = join(tmp, 'demo.md');
  writeFileSync(
    bad,
    sheet({ Hero: 'Backdrop https://cdn.example/h.png here.' }),
  );
  const run = (file) =>
    spawnSync(process.execPath, ['scripts/validate-pattern.mjs', file], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  const r = run(bad);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /demo\.md:\d+: \[media-url\]/);
  const good = join(tmp, 'good.md');
  writeFileSync(good, sheet().replace('slug: demo', 'slug: good'));
  assert.equal(run(good).status, 0);
  assert.equal(run(join(tmp, 'missing.md')).status, 2);
});

test('npm run validate:patterns passes on the committed sheets', () => {
  const r = spawnSync(process.execPath, ['scripts/validate-pattern.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
});

test('--help exits 0', () => {
  const r = spawnSync(
    process.execPath,
    ['scripts/validate-pattern.mjs', '--help'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage/);
});
