// Tests for scripts/directions.mjs and its schema on fixture sites in a temp root (the real sites/ is never touched).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
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

import {
  MAX_NOTES,
  hueFamily,
  validateDirections,
} from '../scripts/lib/directions-schema.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'directions-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const direction = (id, extra = {}) => ({
  id,
  archetype: { a: 'swiss', b: 'collage+editorial', c: 'brutalist' }[id],
  traits: ['big-type'],
  primary: { a: '#92400e', b: '#1d4ed8', c: '#15803d' }[id],
  displayFont: { a: 'Fraunces', b: 'Inter', c: 'Space Grotesk' }[id],
  bodyFont: 'Inter',
  hero: { a: 'split', b: 'typographic', c: 'collage' }[id],
  idea: `idea ${id}`,
  ...extra,
});
const record = (ids = ['a', 'b', 'c'], over = {}) => ({
  version: 1,
  directions: ids.map((id) => direction(id)),
  choice: null,
  ...over,
});

let counter = 0;
/** A temp factory root with sites/<slug> holding the record and, for `built` ids, noindex pages in dist/. */
function fixture(data, { built = ['a', 'b', 'c'], sourcePages = true } = {}) {
  const root = mkdtempSync(join(tmp, `root-${counter++}-`));
  const dir = join(root, 'sites/demo');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{}');
  if (data !== undefined)
    writeFileSync(
      join(dir, 'directions.json'),
      typeof data === 'string' ? data : JSON.stringify(data),
    );
  for (const id of built) {
    mkdirSync(join(dir, 'dist/directions', id), { recursive: true });
    writeFileSync(
      join(dir, 'dist/directions', id, 'index.html'),
      '<html><head><meta name="robots" content="noindex"></head></html>',
    );
  }
  if (sourcePages)
    mkdirSync(join(dir, 'src/pages/directions'), { recursive: true });
  return { root, dir };
}
function run(root, args) {
  return spawnSync('node', ['scripts/directions.mjs', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, LANDING_FACTORY_ROOT: root },
  });
}

test('a valid site with three built noindex pages passes check', () => {
  const { root } = fixture(record());
  const r = run(root, ['check', '--site', 'demo']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /3 directions ok/);
});

test('two directions are enough', () => {
  const { root } = fixture(record(['a', 'b']), { built: ['a', 'b'] });
  assert.equal(run(root, ['check', '--site', 'demo']).status, 0);
});

test('check names each problem', () => {
  const cases = [
    [
      record(['a']),
      ['a'],
      /must be 2 or 3 directions, found 1|there must be 2 or 3/,
    ],
    [
      {
        ...record(),
        directions: [
          direction('a'),
          direction('b', { archetype: 'swiss+collage' }),
        ],
      },
      ['a', 'b'],
      /directions a and b share the primary archetype "swiss"/,
    ],
    [
      {
        ...record(),
        directions: [
          direction('a'),
          direction('b', {
            primary: '#9a3412',
            displayFont: 'fraunces',
            hero: 'split',
          }),
        ],
      },
      ['a', 'b'],
      /share the primary color family \(orange\), display font \(Fraunces\) and hero type \(split\)/,
    ],
    [
      record(),
      ['a', 'b'],
      /direction c: dist\/directions\/c\/index\.html is missing/,
    ],
  ];
  for (const [data, built, pattern] of cases) {
    const { root } = fixture(data, { built });
    const r = run(root, ['check', '--site', 'demo']);
    assert.equal(r.status, 1, JSON.stringify(data));
    assert.match(r.stderr, pattern);
  }
});

test('a page without noindex fails check', () => {
  const { root, dir } = fixture(record());
  writeFileSync(
    join(dir, 'dist/directions/b/index.html'),
    '<html><head></head></html>',
  );
  const r = run(root, ['check', '--site', 'demo']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /direction b: the page is not noindex/);
});

test('a missing field is named by the schema', () => {
  const bad = record();
  delete bad.directions[1].bodyFont;
  bad.directions[2].hero = 'wide';
  const { root } = fixture(bad);
  const r = run(root, ['check', '--site', 'demo']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /directions\[1\]\.bodyFont: required/);
  assert.match(r.stderr, /directions\[2\]\.hero: must be one of/);
});

test('unknown keys and notes over 2000 characters fail', () => {
  assert.match(
    validateDirections({ ...record(), extra: 1 }).join('\n'),
    /extra: unknown key/,
  );
  const withKey = record();
  withKey.directions[0].color = 'red';
  assert.match(
    validateDirections(withKey).join('\n'),
    /directions\[0\]\.color: unknown key/,
  );
  const longNotes = record(undefined, {
    choice: {
      direction: 'a',
      notes: 'x'.repeat(MAX_NOTES + 1),
      date: '2026-10-27',
    },
  });
  assert.match(
    validateDirections(longNotes).join('\n'),
    /choice\.notes: longer than 2000/,
  );
  const { root } = fixture(record());
  const r = run(root, [
    'choose',
    '--site',
    'demo',
    '--direction',
    'a',
    '--notes',
    'x'.repeat(MAX_NOTES + 1),
  ]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /longer than 2000/);
});

test('choose records direction, notes and date', () => {
  const { root, dir } = fixture(record());
  const r = run(root, [
    'choose',
    '--site',
    'demo',
    '--direction',
    'b',
    '--notes',
    'warmer photos',
  ]);
  assert.equal(r.status, 0, r.stderr);
  const saved = JSON.parse(readFileSync(join(dir, 'directions.json'), 'utf8'));
  assert.deepEqual(saved.choice, {
    direction: 'b',
    notes: 'warmer photos',
    date: new Date().toISOString().slice(0, 10),
  });
  assert.equal(saved.directions.length, 3);
  const shown = run(root, ['show', '--site', 'demo']);
  assert.equal(shown.status, 0);
  assert.match(shown.stdout, /choice: b .*warmer photos/);
  assert.equal(
    JSON.parse(run(root, ['show', '--site', 'demo', '--json']).stdout).choice
      .direction,
    'b',
  );
});

test('choose refuses an unknown direction and a built site', () => {
  const { root, dir } = fixture(record(['a', 'b']), { built: ['a', 'b'] });
  const unknown = run(root, ['choose', '--site', 'demo', '--direction', 'c']);
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /unknown direction "c"/);
  const gone = fixture(record());
  rmSync(join(gone.dir, 'src/pages/directions'), { recursive: true });
  const r = run(gone.root, ['choose', '--site', 'demo', '--direction', 'a']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /already built past the directions/);
  assert.equal(
    JSON.parse(readFileSync(join(dir, 'directions.json'), 'utf8')).choice,
    null,
  );
});

test('bad usage exits 2', () => {
  const { root } = fixture(record());
  for (const args of [
    [],
    ['bogus'],
    ['check'],
    ['check', '--site', 'Bad Slug'],
    ['choose', '--site', 'demo'],
    ['choose', '--site', 'demo', '--direction', 'z'],
    ['check', '--site', 'demo', '--notes', 'x'],
    ['check', '--site', 'demo', '--bogus'],
  ])
    assert.equal(run(root, args).status, 2, args.join(' '));
  assert.equal(run(root, ['--help']).status, 0);
});

test('a missing or broken record is refused with exit 1', () => {
  const missing = fixture(undefined);
  const r = run(missing.root, ['show', '--site', 'demo']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /directions\.json does not exist/);
  const broken = fixture('{ nope');
  assert.match(
    run(broken.root, ['check', '--site', 'demo']).stderr,
    /not valid JSON/,
  );
});

test('hueFamily groups close colors and separates distant ones', () => {
  assert.equal(hueFamily('#92400e'), hueFamily('#9a3412'));
  assert.notEqual(hueFamily('#92400e'), hueFamily('#1d4ed8'));
  assert.equal(hueFamily('#777777'), 'neutral');
  assert.equal(hueFamily('nope'), 'unknown');
});
