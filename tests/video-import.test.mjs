// Tests for scripts/video.mjs import: provenance flags, refusals, exit codes and the manifest entry.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { syncCredits } from '../scripts/credits.mjs';
import { main } from '../scripts/video.mjs';
import { makeClip, SKIP_REASON } from './video-helpers.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'video-import-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

function setup(brief) {
  const root = mkdtempSync(join(tmp, 'root-'));
  const site = join(root, 'sites/demo');
  mkdirSync(site, { recursive: true });
  writeFileSync(join(site, 'package.json'), '{}');
  writeFileSync(join(site, 'assets.json'), '{"images":[]}\n');
  if (brief) writeFileSync(join(site, 'brief.json'), JSON.stringify(brief));
  return root;
}
async function run(argv, root) {
  const out = [];
  const err = [];
  const code = await main(
    argv,
    { log: (m) => out.push(String(m)), error: (m) => err.push(String(m)) },
    root,
  );
  return { code, stdout: out.join('\n'), stderr: err.join('\n') };
}
const manifest = (root) =>
  JSON.parse(readFileSync(join(root, 'sites/demo/assets.json'), 'utf8'));
const video = (root) => join(root, 'sites/demo/src/assets/video');
const input = () =>
  makeClip(join(tmp, `in-${Math.random().toString(36).slice(2)}.mp4`), {
    size: '1920x1080',
    seconds: 3,
  });

test(
  'a customer clip is encoded and recorded with owner and permission',
  { skip: SKIP_REASON },
  async () => {
    const root = setup();
    const result = await run(
      [
        'import',
        'demo',
        input(),
        '--source',
        'customer',
        '--owner',
        'Clinica Ribera',
        '--permission',
        'Written permission, 2026-11-01',
        '--as',
        'clinic-loop',
        '--credit',
        '--note',
        'waiting room',
      ],
      root,
    );
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(readdirSync(video(root)).sort(), [
      'clinic-loop.mp4',
      'clinic-loop.poster.webp',
    ]);
    const [entry] = manifest(root).images;
    assert.equal(entry.kind, 'video');
    assert.equal(entry.source, 'customer');
    assert.equal(entry.owner, 'Clinica Ribera');
    assert.equal(entry.permission, 'Written permission, 2026-11-01');
    assert.equal(entry.credit, true);
    assert.equal(entry.poster, 'clinic-loop.poster.webp');
    assert.equal(entry.width, 1280);
    assert.equal(typeof entry.durationSec, 'number');
    assert.equal(
      entry.bytes,
      readFileSync(join(video(root), 'clinic-loop.mp4')).length,
    );
    assert.doesNotThrow(() => syncCredits({ slug: 'demo', root }));
  },
);

test(
  'an owner clip needs --author and records "own footage" with no public credit by default',
  { skip: SKIP_REASON },
  async () => {
    const root = setup();
    const result = await run(
      [
        'import',
        'demo',
        input(),
        '--source',
        'owner',
        '--author',
        'The Owner',
        '--as',
        'own',
      ],
      root,
    );
    assert.equal(result.code, 0, result.stderr);
    const [entry] = manifest(root).images;
    assert.equal(entry.source, 'owner');
    assert.equal(entry.author, 'The Owner');
    assert.equal(entry.credit, false);
    assert.match(entry.license, /Own footage/);
    assert.doesNotThrow(() => syncCredits({ slug: 'demo', root }));
  },
);

test('usage errors exit 2 and write nothing', async () => {
  const root = setup();
  const cases = [
    [['import', 'demo', 'x.mp4'], /--source/],
    [
      ['import', 'demo', 'x.mp4', '--source', 'customer', '--permission', 'p'],
      /--owner/,
    ],
    [
      ['import', 'demo', 'x.mp4', '--source', 'customer', '--owner', 'o'],
      /--permission/,
    ],
    [['import', 'demo', 'x.mp4', '--source', 'owner'], /--author/],
    [
      [
        'import',
        'demo',
        'x.mp4',
        '--source',
        'owner',
        '--author',
        'a',
        '--as',
        'Bad Name',
      ],
      /--as/,
    ],
    [
      ['import', 'demo', '--source', 'owner', '--author', 'a'],
      /<site-slug> and <file>/,
    ],
    [['frobnicate'], /unknown command/],
    [
      ['import', 'Bad_Slug', 'x.mp4', '--source', 'owner', '--author', 'a'],
      /invalid site slug/,
    ],
  ];
  for (const [argv, pattern] of cases) {
    const result = await run(argv, root);
    assert.equal(result.code, 2, argv.join(' '));
    assert.match(result.stderr, pattern);
  }
  assert.equal(existsSync(video(root)), false);
  assert.deepEqual(manifest(root).images, []);
});

test('a customer video on a prospect brief exits 1 and records nothing', async () => {
  const root = setup({ prospect: { status: 'prospect', sources: [] } });
  const clip = join(tmp, 'p.mp4');
  writeFileSync(clip, 'x');
  const result = await run(
    [
      'import',
      'demo',
      clip,
      '--source',
      'customer',
      '--owner',
      'o',
      '--permission',
      'p',
    ],
    root,
  );
  assert.equal(result.code, 1);
  assert.match(result.stderr, /prospect/);
  assert.equal(existsSync(video(root)), false);
  assert.deepEqual(manifest(root).images, []);
});

test(
  'missing site, missing file and a duplicate name exit 1',
  { skip: SKIP_REASON },
  async () => {
    const root = setup();
    const missingSite = await run(
      ['import', 'nope', 'x.mp4', '--source', 'owner', '--author', 'a'],
      root,
    );
    assert.equal(missingSite.code, 1);
    const missingFile = await run(
      [
        'import',
        'demo',
        join(tmp, 'absent.mp4'),
        '--source',
        'owner',
        '--author',
        'a',
      ],
      root,
    );
    assert.equal(missingFile.code, 1);
    assert.match(missingFile.stderr, /does not exist/);
    const clip = input();
    const args = [
      'import',
      'demo',
      clip,
      '--source',
      'owner',
      '--author',
      'a',
      '--as',
      'dup',
    ];
    assert.equal((await run(args, root)).code, 0);
    const again = await run(args, root);
    assert.equal(again.code, 1);
    assert.match(again.stderr, /already exists/);
    assert.equal(manifest(root).images.length, 1);
  },
);

test(
  'a file that is not a video is refused and nothing is left',
  { skip: SKIP_REASON },
  async () => {
    const root = setup();
    const text = join(tmp, 'notes.txt');
    writeFileSync(text, 'hello');
    const result = await run(
      [
        'import',
        'demo',
        text,
        '--source',
        'owner',
        '--author',
        'a',
        '--as',
        'x',
      ],
      root,
    );
    assert.equal(result.code, 1);
    assert.deepEqual(manifest(root).images, []);
    assert.equal(existsSync(join(video(root), 'x.mp4')), false);
  },
);

test('without ffmpeg the command exits 1 naming the tool and writes nothing', async () => {
  const root = setup();
  const clip = join(tmp, 'q.mp4');
  writeFileSync(clip, 'x');
  const result = spawnSync(
    process.execPath,
    [
      join(ROOT, 'scripts/video.mjs'),
      'import',
      'demo',
      clip,
      '--source',
      'owner',
      '--author',
      'a',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        LANDING_FACTORY_ROOT: root,
        NODE_TEST_CONTEXT: 'child-v8',
        FFMPEG_BIN: join(tmp, 'no-ffmpeg'),
      },
    },
  );
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /ffmpeg is not installed/);
  assert.equal(existsSync(video(root)), false);
  assert.deepEqual(manifest(root).images, []);
});

test('--help documents import and exits 0', async () => {
  const result = await run(['--help'], setup());
  assert.equal(result.code, 0);
  assert.match(result.stdout, /--source customer/);
  assert.match(result.stdout, /pixabay-video/);
});
