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
  AI_REQUIRED_FIELDS,
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

test('customer files get their own part; credit shows in the footer only when true; a stock-only site is unchanged', () => {
  const root = freshRoot();
  const before = syncCredits({ slug: 'demo', root });
  assert.ok(before.written.length);
  const stockCredits = read(root, 'CREDITS.md');
  const stockJson = read(root, 'src/data/credits.json');
  assert.ok(!stockCredits.includes('Provided by the customer'));

  const manifestPath = join(root, 'sites/demo/assets.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.images.push(
    {
      file: 'logo.svg',
      source: 'customer',
      owner: 'Taller Plantilla',
      permission: 'Free use on the business website',
      credit: false,
      note: 'Own logo.',
    },
    {
      file: 'founder.jpg',
      source: 'customer',
      owner: 'Ana Taller',
      permission: 'Photo by the owner, used with permission',
      credit: true,
    },
  );
  writeFileSync(manifestPath, JSON.stringify(manifest));
  syncCredits({ slug: 'demo', root });
  const credits = read(root, 'CREDITS.md');
  const section = credits.slice(
    credits.indexOf('### Provided by the customer'),
  );
  assert.match(
    section,
    /\| `logo\.svg`\s+\| Taller Plantilla\s+\| Free use on the business website\s+\| no\s+\| Own logo\s+\|/,
  );
  assert.match(
    section,
    /\| `founder\.jpg`\s+\| Ana Taller\s+\| Photo by the owner, used with permission\s+\| yes/,
  );
  // The stock photo table above it is the same as before, and the section sits between the markers.
  assert.ok(
    credits.indexOf('### Provided by the customer') <
      credits.indexOf('<!-- credits:end -->'),
  );
  const footer = JSON.parse(read(root, 'src/data/credits.json'));
  assert.deepEqual(footer.slice(0, 2), JSON.parse(stockJson));
  assert.deepEqual(footer.slice(2), [
    {
      author: 'Ana Taller',
      license: 'Photo by the owner, used with permission',
      url: '',
    },
  ]);
  assert.equal(
    syncCredits({ slug: 'demo', root, check: true }).stale.length,
    0,
  );
  // Only customer files: no stock table, still a valid block.
  const only = renderCreditsFile(
    '# Credits\n',
    manifest.images.filter((e) => e.source === 'customer'),
  );
  assert.ok(!only.includes('No photographs are used yet.'));
  assert.ok(only.includes('### Provided by the customer'));
});

test('a customer entry needs owner and permission, not the stock fields; stock entries still need theirs', () => {
  const entry = { file: 'logo.svg', source: 'customer', credit: false };
  assert.throws(() => validateManifest({ images: [entry] }), /has no "owner"/);
  assert.throws(
    () => validateManifest({ images: [{ ...entry, owner: 'A' }] }),
    /has no "permission"/,
  );
  validateManifest({ images: [{ ...entry, owner: 'A', permission: 'p' }] });
  assert.throws(
    () =>
      validateManifest({
        images: [
          {
            file: 'a.jpg',
            source: 'commons',
            owner: 'A',
            permission: 'p',
            credit: false,
          },
        ],
      }),
    /has no "title"/,
  );
});

const aiEntry = (extra = {}) => ({
  file: 'hero-glass.webp',
  title: 'Abstract glass shapes',
  source: 'ai',
  generator: 'openai',
  model: 'gpt-image-1.5',
  prompt: 'An abstract gradient of light and glass shapes',
  revisedPrompt: '',
  size: '1536x1024',
  quality: 'high',
  createdAt: '2026-10-25T10:00:00.000Z',
  terms: 'https://openai.com/policies/terms-of-use/',
  credit: false,
  note: '',
  ...extra,
});

test('an AI entry needs the provenance fields and nothing of the stock ones', () => {
  validateManifest({ images: [aiEntry()] });
  for (const field of AI_REQUIRED_FIELDS) {
    const entry = aiEntry();
    delete entry[field];
    assert.throws(
      () => validateManifest({ images: [entry] }),
      new RegExp(`has no "${field}"`),
      field,
    );
  }
  assert.throws(
    () => validateManifest({ images: [aiEntry({ credit: 'no' })] }),
    /"credit" must be true or false/,
  );
});

test('AI images get their own table with tool, model, date and terms, no footer credit, and stock-only output is unchanged', () => {
  const root = freshRoot();
  syncCredits({ slug: 'demo', root });
  const stockCredits = read(root, 'CREDITS.md');
  const stockJson = read(root, 'src/data/credits.json');
  assert.ok(!stockCredits.includes('AI-generated images'));

  const manifestPath = join(root, 'sites/demo/assets.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.images.push(
    aiEntry(),
    aiEntry({
      file: 'cover.png',
      generator: 'Midjourney',
      model: 'v7',
      imported: true,
      createdAt: '2026-10-20T00:00:00.000Z',
      note: 'Made by the owner.',
    }),
  );
  writeFileSync(manifestPath, JSON.stringify(manifest));
  syncCredits({ slug: 'demo', root });
  const credits = read(root, 'CREDITS.md');
  const section = credits.slice(credits.indexOf('### AI-generated images'));
  assert.match(
    section,
    /\| `hero-glass\.webp`\s+\| openai gpt-image-1\.5\s+\| 2026-10-25\s+\| https:\/\/openai\.com\/policies\/terms-of-use\/\s+\|/,
  );
  assert.match(
    section,
    /\| `cover\.png`\s+\| Midjourney v7 \(imported\)\s+\| 2026-10-20\s+\|.*\| Made by the owner\s+\|/,
  );
  assert.ok(
    credits.indexOf('### AI-generated images') <
      credits.indexOf('<!-- credits:end -->'),
  );
  // The stock table and the footer list are exactly what they were; AI images add no credit line.
  assert.equal(read(root, 'src/data/credits.json'), stockJson);
  assert.ok(
    credits.startsWith(
      stockCredits.slice(0, stockCredits.indexOf('<!-- credits:end -->') - 2),
    ),
  );
  assert.equal(
    syncCredits({ slug: 'demo', root, check: true }).stale.length,
    0,
  );
  // Even credit: true does not put an AI image (no source page) in the footer list.
  assert.deepEqual(creditList([aiEntry({ credit: true })]), []);
  // Only AI images: no stock table, still a valid block; and the table passes prettier.
  const only = renderCreditsFile('# Credits\n', [aiEntry()]);
  assert.ok(!only.includes('No photographs are used yet.'));
  assert.ok(only.includes('### AI-generated images'));
  const prettier = join(ROOT, 'node_modules/prettier/bin/prettier.cjs');
  const result = spawnSync(
    process.execPath,
    [
      prettier,
      '--config',
      join(ROOT, '.prettierrc.json'),
      '--check',
      join(root, 'sites/demo/CREDITS.md'),
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('an owner portrait is listed under AI-generated images, noting it is a portrait of the owner made with their consent', () => {
  const root = freshRoot();
  const manifestPath = join(root, 'sites/demo/assets.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.images.push(
    aiEntry({
      file: 'owner.png',
      imported: true,
      subject: 'owner',
      note: 'Made with ChatGPT.',
    }),
    aiEntry({ file: 'plain.webp' }),
  );
  writeFileSync(manifestPath, JSON.stringify(manifest));
  syncCredits({ slug: 'demo', root });
  const credits = read(root, 'CREDITS.md');
  assert.match(
    credits,
    /\| `owner\.png`[^\n]*\| Portrait of the owner, made with their consent\. Made with ChatGPT\s+\|/,
  );
  const plain = credits.split('\n').find((l) => l.includes('`plain.webp`'));
  assert.doesNotMatch(plain, /Portrait of the owner/);
  // It adds no footer credit line, like any AI image.
  assert.doesNotMatch(read(root, 'src/data/credits.json'), /owner\.png/);
});
