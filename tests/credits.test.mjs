// Tests for scripts/credits.mjs on a fixture site (copied to a temp folder; never written in place).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
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
  creditList,
  groupBySource,
  main,
  markdownTable,
  renderCreditsFile,
  syncCredits,
  validateManifest,
} from '../scripts/credits.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/credits');
const tmp = mkdtempSync(join(tmpdir(), 'credits-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

/** A copy of the fixture root, so tests can write. */
const freshRoot = () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
};
const read = (root, file) =>
  readFileSync(join(root, 'sites/demo', file), 'utf8');
const quiet = { log() {}, error() {} };

test('crops of one source photo share a row; only credited photos reach the footer list', () => {
  const root = freshRoot();
  const { images } = JSON.parse(read(root, 'assets.json'));
  const groups = groupBySource(images);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups[0].files, ['hero.jpg', 'loaf-crop.jpg']);
  assert.deepEqual(groups[0].notes, ['hero', 'crop of the loaf']);
  assert.deepEqual(creditList(images), [
    {
      author: 'Ana Pan',
      license: 'CC BY 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Sample_loaf.jpg',
    },
    {
      author: 'Bo | Cy',
      license: 'CC BY-SA 3.0',
      url: 'https://commons.wikimedia.org/wiki/File:Clay_oven.jpg',
    },
  ]);
});

test('sync writes the photo table between the markers and keeps the rest of CREDITS.md', () => {
  const root = freshRoot();
  const before = read(root, 'CREDITS.md');
  const { written } = syncCredits({ slug: 'demo', root });
  assert.deepEqual(written, ['CREDITS.md', 'src/data/credits.json']);
  const after = read(root, 'CREDITS.md');
  // Everything outside the markers is untouched.
  assert.equal(
    after.slice(0, after.indexOf('<!-- credits:start -->')),
    before.slice(0, before.indexOf('<!-- credits:start -->')),
  );
  assert.match(
    after,
    /\| Inter\s+\| https:\/\/fonts\.google\.com\/specimen\/Inter/,
  );
  assert.ok(after.includes('Intro written by hand stays.'));
  assert.ok(after.endsWith('Closing note written by hand stays.\n'));
  assert.ok(!after.includes('old table'));
  assert.match(
    after,
    /\| `hero\.jpg`, `loaf-crop\.jpg`\s+\| https:\/\/commons\.wikimedia\.org\/wiki\/File:Sample_loaf\.jpg \| Ana Pan\s+\| CC BY 4\.0, https:\/\/creativecommons\.org\/licenses\/by\/4\.0\s+\| yes\s+\| hero; crop of the loaf \|/,
  );
  // A pipe in an author name is escaped so the table keeps its columns.
  assert.ok(after.includes('Bo \\| Cy'));
  assert.match(after, /\| `croissant\.jpg`.*\| CC0\s+\| no /);
  const credits = JSON.parse(read(root, 'src/data/credits.json'));
  assert.equal(credits.length, 2);
});

test('sync is idempotent and --check reports exactly what is stale', () => {
  const root = freshRoot();
  assert.deepEqual(syncCredits({ slug: 'demo', root, check: true }).stale, [
    'CREDITS.md',
    'src/data/credits.json',
  ]);
  syncCredits({ slug: 'demo', root });
  const snapshot = [
    read(root, 'CREDITS.md'),
    read(root, 'src/data/credits.json'),
  ];
  assert.deepEqual(syncCredits({ slug: 'demo', root }).written, []);
  assert.deepEqual(
    [read(root, 'CREDITS.md'), read(root, 'src/data/credits.json')],
    snapshot,
  );
  assert.deepEqual(syncCredits({ slug: 'demo', root, check: true }).stale, []);
  // Editing the manifest makes both files stale again; --check does not write.
  const manifest = JSON.parse(read(root, 'assets.json'));
  manifest.images[2].author = 'Someone Else';
  writeFileSync(join(root, 'sites/demo/assets.json'), JSON.stringify(manifest));
  assert.deepEqual(syncCredits({ slug: 'demo', root, check: true }).stale, [
    'CREDITS.md',
    'src/data/credits.json',
  ]);
  assert.deepEqual(
    [read(root, 'CREDITS.md'), read(root, 'src/data/credits.json')],
    snapshot,
  );
  // Hand edits inside the markers are detected too.
  syncCredits({ slug: 'demo', root });
  writeFileSync(
    join(root, 'sites/demo/CREDITS.md'),
    read(root, 'CREDITS.md').replace('Someone Else', 'Hacker'),
  );
  assert.deepEqual(syncCredits({ slug: 'demo', root, check: true }).stale, [
    'CREDITS.md',
  ]);
});

test('without markers a Photographs section is appended once; with no images it says so', () => {
  const text = '# Credits: x\n\nFonts here.\n';
  const once = renderCreditsFile(text, []);
  assert.match(once, /## Photographs/);
  assert.match(
    once,
    /<!-- credits:start -->\n\nNo photographs are used yet\.\n\n<!-- credits:end -->\n$/,
  );
  assert.equal(renderCreditsFile(once, []), once);
  assert.throws(
    () => renderCreditsFile('a <!-- credits:start --> b', []),
    /only one of/,
  );
  assert.throws(
    () =>
      renderCreditsFile('<!-- credits:end --> a <!-- credits:start -->', []),
    /only one of|wrong order/,
  );
});

test('manifest validation names the missing field', () => {
  assert.throws(() => validateManifest({}), /expected/);
  assert.throws(
    () => validateManifest({ images: [{ file: 'a.jpg' }] }),
    /a\.jpg\) has no "title"/,
  );
  assert.throws(
    () =>
      validateManifest({
        images: [
          {
            file: 'a.jpg',
            title: 't',
            sourcePage: 's',
            author: 'a',
            license: 'l',
            credit: 'yes',
          },
        ],
      }),
    /"credit" must be true or false/,
  );
});

test('the table is aligned the way Prettier prints it', () => {
  assert.equal(
    markdownTable(
      ['A', 'Long header'],
      [
        ['x', 'y'],
        ['wide cell', ''],
      ],
    ),
    '| A         | Long header |\n| --------- | ----------- |\n| x         | y           |\n| wide cell |             |',
  );
});

test('generated CREDITS.md passes prettier --check', () => {
  const root = freshRoot();
  syncCredits({ slug: 'demo', root });
  const prettier = join(ROOT, 'node_modules/prettier/bin/prettier.cjs');
  const result = spawnSync(
    process.execPath,
    [
      prettier,
      '--config',
      join(ROOT, '.prettierrc.json'),
      '--check',
      join(root, 'sites/demo/CREDITS.md'),
      join(root, 'sites/demo/src/data/credits.json'),
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('CLI exit codes: 0 up to date, 1 stale with --check, 2 for bad usage or an unreadable site', () => {
  const root = freshRoot();
  assert.equal(main(['--site', 'demo', '--check'], quiet, root), 1);
  assert.equal(main(['--site', 'demo'], quiet, root), 0);
  assert.equal(main(['--site', 'demo', '--check'], quiet, root), 0);
  assert.equal(main([], quiet, root), 2);
  assert.equal(main(['--bogus'], quiet, root), 2);
  assert.equal(main(['--site', 'missing'], quiet, root), 2);
  assert.equal(main(['--site', 'Bad Slug'], quiet, root), 2);
  const help = spawnSync(process.execPath, ['scripts/credits.mjs', '--help'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--check/);
});
