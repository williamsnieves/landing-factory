import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  SHARED_PATHS,
  changedSites,
  isSharedPath,
} from '../scripts/changed-sites.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SITES = ['cafeteria', 'panaderia'];

test('only one site changed: just that site', () => {
  assert.deepEqual(
    changedSites({
      files: [
        'sites/panaderia/src/pages/index.astro',
        'sites/panaderia/CREDITS.md',
      ],
      sites: SITES,
    }),
    ['panaderia'],
  );
});

test('two sites changed: both, sorted', () => {
  assert.deepEqual(
    changedSites({
      files: ['sites/panaderia/a.md', 'sites/cafeteria/b.md'],
      sites: SITES,
    }),
    ['cafeteria', 'panaderia'],
  );
});

test('a shared path changed: every site', () => {
  for (const file of [
    'package.json',
    'package-lock.json',
    'src/components/motion/index.ts',
    'src/layouts/BaseLayout.astro',
    'src/styles/tokens.css',
    'scripts/qa.mjs',
    'scripts/qa/lighthouse.mjs',
    '.github/workflows/ci.yml',
  ])
    assert.deepEqual(
      changedSites({ files: [file, 'sites/panaderia/x'], sites: SITES }),
      SITES,
      file,
    );
});

test('no site changed: empty list', () => {
  assert.deepEqual(
    changedSites({
      files: [
        'README.md',
        'docs/roadmap.md',
        'patterns/x.md',
        'src/pages/index.astro',
        'sites/README.md',
      ],
      sites: SITES,
    }),
    [],
  );
  assert.deepEqual(changedSites({ files: [], sites: SITES }), []);
});

test('prefixes do not leak: sites/panaderia-2 is not panaderia, package.json.bak is not shared', () => {
  assert.deepEqual(
    changedSites({ files: ['sites/panaderia-2/x'], sites: SITES }),
    [],
  );
  assert.equal(isSharedPath('package.json.bak'), false);
  assert.equal(isSharedPath('src/stylesheet.css'), false);
  assert.equal(isSharedPath('./package.json'), true);
  assert.ok(SHARED_PATHS.includes('.github/workflows/'));
});

test('a deleted site (not in the site list) is never selected', () => {
  assert.deepEqual(changedSites({ files: ['sites/old/x'], sites: SITES }), []);
});

// --- CLI against a throwaway git repository -------------------------------------
const tmp = mkdtempSync(join(tmpdir(), 'changed-sites-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const git = (cwd, ...args) =>
  execFileSync(
    'git',
    ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
const put = (repo, file, content = 'x') => {
  mkdirSync(dirname(join(repo, file)), { recursive: true });
  writeFileSync(join(repo, file), content);
};
const cli = (repo, ...args) => {
  const r = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts/changed-sites.mjs'), '--root', repo, ...args],
    { encoding: 'utf8' },
  );
  return { ...r, list: r.stdout.trim() ? JSON.parse(r.stdout) : null };
};

function makeRepo() {
  const repo = mkdtempSync(join(tmp, 'repo-'));
  git(repo, 'init', '-q', '-b', 'main');
  put(repo, 'sites/panaderia/package.json', '{}');
  put(repo, 'sites/cafeteria/package.json', '{}');
  put(repo, 'sites/notes/PROPOSAL.md', 'docs only');
  put(repo, 'README.md');
  git(repo, 'add', '.');
  git(repo, 'commit', '-q', '-m', 'init');
  return repo;
}

test('CLI: one site changed in the last commit', () => {
  const repo = makeRepo();
  put(repo, 'sites/panaderia/src/a.astro');
  git(repo, 'add', '.');
  git(repo, 'commit', '-q', '-m', 'edit');
  const r = cli(repo);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.list, ['panaderia']);
});

test('CLI: a docs-only folder is never a site, even when it changes', () => {
  const repo = makeRepo();
  put(repo, 'sites/notes/PROPOSAL.md', 'changed');
  git(repo, 'add', '.');
  git(repo, 'commit', '-q', '-m', 'docs');
  assert.deepEqual(cli(repo).list, []);
  assert.deepEqual(cli(repo, '--all').list, ['cafeteria', 'panaderia']);
});

test('CLI: a shared path selects every site; --base compares against a branch', () => {
  const repo = makeRepo();
  git(repo, 'checkout', '-q', '-b', 'feature');
  put(repo, 'src/styles/tokens.css');
  git(repo, 'add', '.');
  git(repo, 'commit', '-q', '-m', 'shared');
  put(repo, 'README.md', 'again');
  git(repo, 'add', '.');
  git(repo, 'commit', '-q', '-m', 'docs');
  assert.deepEqual(cli(repo).list, []); // last commit only touched README
  assert.deepEqual(cli(repo, '--base', 'main').list, [
    'cafeteria',
    'panaderia',
  ]);
});

test('CLI: an unusable base falls back to every site with a warning', () => {
  const repo = makeRepo();
  const r = cli(repo, '--base', 'does-not-exist');
  assert.equal(r.status, 0);
  assert.deepEqual(r.list, ['cafeteria', 'panaderia']);
  assert.match(r.stderr, /selecting every site/);
});
