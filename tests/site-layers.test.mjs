// Tests for scripts/site-layers.mjs on fixture sites in a temporary factory root; the real sites are never touched.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCRIPT = join(ROOT, 'scripts/site-layers.mjs');
const tmp = mkdtempSync(join(tmpdir(), 'site-layers-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const put = (base, path, text = '') => {
  mkdirSync(dirname(join(base, path)), { recursive: true });
  writeFileSync(join(base, path), text);
};
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** A fake factory root: a starter with both layers and a root package.json holding the dependency ranges. */
function factory() {
  const root = mkdtempSync(join(tmp, 'root-'));
  put(
    root,
    'package.json',
    JSON.stringify({
      name: 'fixture',
      dependencies: { astro: '^7.0.0', three: '^0.186.1' },
      devDependencies: { '@types/three': '^0.186.0', typescript: '^6.0.0' },
    }),
  );
  put(root, 'src/components/three/Scene3D.astro', '---\n---\n<figure />\n');
  put(root, 'src/components/three/helpers.ts', 'export const a = 1;\n');
  put(root, 'src/components/legal/LegalNotice.astro', '---\n---\n<p />\n');
  put(root, 'src/components/legal/texts.ts', 'export const texts = {};\n');
  return root;
}

/** A site with both layers copied; `files` are extra files under the site (path -> text). */
function site(root, slug, files = {}) {
  const dir = join(root, 'sites', slug);
  put(
    dir,
    'package.json',
    JSON.stringify(
      {
        name: `site-${slug}`,
        dependencies: { astro: '^7.0.0', three: '^0.186.1' },
        devDependencies: {
          '@types/three': '^0.186.0',
          typescript: '^6.0.0',
        },
      },
      null,
      2,
    ),
  );
  put(dir, 'src/components/three/Scene3D.astro', '---\n---\n<figure />\n');
  put(dir, 'src/components/three/helpers.ts', 'export const a = 1;\n');
  put(dir, 'src/components/legal/LegalNotice.astro', '---\n---\n<p />\n');
  put(dir, 'src/components/legal/texts.ts', 'export const texts = {};\n');
  put(dir, 'src/scenes/.gitkeep', '');
  put(dir, 'src/pages/index.astro', '---\n---\n<h1>Home</h1>\n');
  for (const [path, text] of Object.entries(files)) put(dir, path, text);
  return dir;
}

function run(root, ...args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, LANDING_FACTORY_ROOT: root },
  });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

const USES_3D =
  "---\nimport Scene3D from '../components/three/Scene3D.astro';\n---\n<Scene3D />\n";
const USES_LEGAL =
  "---\nimport LegalNotice from '../components/legal/LegalNotice.astro';\n---\n<LegalNotice />\n";

test('prune removes both unused layers with their dependencies and keeps the rest', () => {
  const root = factory();
  const dir = site(root, 'plain');
  const result = run(root, 'prune', '--site', 'plain');
  assert.equal(result.code, 0, result.err);
  assert.match(result.out, /npm install/);
  assert.ok(!existsSync(join(dir, 'src/components/three')));
  assert.ok(!existsSync(join(dir, 'src/scenes')));
  assert.ok(!existsSync(join(dir, 'src/components/legal')));
  assert.ok(existsSync(join(dir, 'src/pages/index.astro')));
  const pkg = readJson(join(dir, 'package.json'));
  assert.deepEqual(pkg.dependencies, { astro: '^7.0.0' });
  assert.deepEqual(pkg.devDependencies, { typescript: '^6.0.0' });
});

test('a layer that a file outside it imports stays, the other one goes', () => {
  const root = factory();
  const dir = site(root, 'scene', {
    'src/components/sections/Hero.astro': USES_3D.replace(
      '../components/',
      '../',
    ),
  });
  const result = run(root, 'prune', '--site', 'scene');
  assert.equal(result.code, 0, result.err);
  assert.ok(existsSync(join(dir, 'src/components/three/Scene3D.astro')));
  assert.ok(existsSync(join(dir, 'src/scenes')));
  assert.ok(!existsSync(join(dir, 'src/components/legal')));
  assert.equal(
    readJson(join(dir, 'package.json')).dependencies.three,
    '^0.186.1',
  );
});

test('a used legal layer stays, and a direct `three` import keeps the 3D layer', () => {
  const root = factory();
  const dir = site(root, 'both', {
    'src/pages/privacy.astro': USES_LEGAL,
    'src/lib/own.ts': "import * as THREE from 'three';\nexport { THREE };\n",
  });
  const result = run(root, 'prune', '--site', 'both');
  assert.equal(result.code, 0, result.err);
  assert.match(result.out, /no unused layer/);
  assert.ok(existsSync(join(dir, 'src/components/legal')));
  assert.ok(existsSync(join(dir, 'src/components/three')));
});

test('imports in comments do not count as use', () => {
  const root = factory();
  const dir = site(root, 'commented', {
    'src/pages/old.ts':
      "// import Scene3D from '../components/three/Scene3D.astro';\nexport {};\n",
  });
  assert.equal(run(root, 'prune', '--site', 'commented').code, 0);
  assert.ok(!existsSync(join(dir, 'src/components/three')));
});

test('a non-literal import() refuses and changes nothing', () => {
  const root = factory();
  const dir = site(root, 'dyn', {
    'src/pages/load.ts':
      'export const load = (n: string) => import(`./x/${n}.ts`);\n',
  });
  const result = run(root, 'prune', '--site', 'dyn');
  assert.equal(result.code, 1);
  assert.match(result.err, /load\.ts/);
  assert.match(result.err, /not a string literal/);
  assert.ok(existsSync(join(dir, 'src/components/three')));
  assert.equal(
    readJson(join(dir, 'package.json')).dependencies.three,
    '^0.186.1',
  );
});

test('a literal import() of a layer counts as use', () => {
  const root = factory();
  const dir = site(root, 'lazy', {
    'src/pages/load.ts':
      "export const load = () => import('../components/legal/texts');\n",
  });
  assert.equal(run(root, 'prune', '--site', 'lazy').code, 0);
  assert.ok(existsSync(join(dir, 'src/components/legal')));
  assert.ok(!existsSync(join(dir, 'src/components/three')));
});

test('--dry-run lists the removal and changes nothing', () => {
  const root = factory();
  const dir = site(root, 'dry');
  const before = readFileSync(join(dir, 'package.json'), 'utf8');
  const result = run(root, 'prune', '--site', 'dry', '--dry-run');
  assert.equal(result.code, 0, result.err);
  assert.match(result.out, /would remove/);
  assert.match(result.out, /src\/components\/three\//);
  assert.ok(existsSync(join(dir, 'src/components/three/Scene3D.astro')));
  assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), before);
});

test('add restores the starter files and the dependency ranges, and refuses a second time', () => {
  const root = factory();
  const dir = site(root, 'again');
  assert.equal(run(root, 'prune', '--site', 'again').code, 0);

  const dry = run(root, 'add', '3d', '--site', 'again', '--dry-run');
  assert.equal(dry.code, 0, dry.err);
  assert.ok(!existsSync(join(dir, 'src/components/three')));

  const addThree = run(root, 'add', '3d', '--site', 'again');
  assert.equal(addThree.code, 0, addThree.err);
  assert.equal(
    readFileSync(join(dir, 'src/components/three/helpers.ts'), 'utf8'),
    'export const a = 1;\n',
  );
  assert.ok(existsSync(join(dir, 'src/scenes/.gitkeep')));
  const pkg = readJson(join(dir, 'package.json'));
  assert.equal(pkg.dependencies.three, '^0.186.1');
  assert.equal(pkg.devDependencies['@types/three'], '^0.186.0');
  assert.deepEqual(Object.keys(pkg.dependencies), ['astro', 'three']);

  const again = run(root, 'add', '3d', '--site', 'again');
  assert.equal(again.code, 1);
  assert.match(again.err, /already exists/);

  const addLegal = run(root, 'add', 'legal', '--site', 'again');
  assert.equal(addLegal.code, 0, addLegal.err);
  assert.ok(existsSync(join(dir, 'src/components/legal/LegalNotice.astro')));
  assert.equal(run(root, 'add', 'legal', '--site', 'again').code, 1);
});

test('check lists exactly the sites with unused layers and never looks at the starter', () => {
  const root = factory();
  site(root, 'dirty');
  site(root, 'clean', {
    'src/pages/a.astro': USES_3D,
    'src/pages/b.astro': USES_LEGAL,
  });
  const dirtyOnly = run(root, 'check');
  assert.equal(dirtyOnly.code, 1);
  assert.match(dirtyOnly.err, /dirty: holds the 3D layer/);
  assert.match(dirtyOnly.err, /dirty: holds the legal components/);
  assert.doesNotMatch(dirtyOnly.err, /clean:/);
  assert.equal(run(root, 'check', '--site', 'clean').code, 0);
  assert.equal(run(root, 'prune', '--site', 'dirty').code, 0);
  const ok = run(root, 'check');
  assert.equal(ok.code, 0, ok.err);
  // The starter's own layers (root src/components/...) were never a problem.
  assert.ok(existsSync(join(root, 'src/components/three')));
});

test('a site that never had a layer passes check', () => {
  const root = factory();
  const dir = join(root, 'sites', 'old');
  put(
    dir,
    'package.json',
    JSON.stringify({ name: 'site-old', dependencies: { astro: '^7.0.0' } }),
  );
  put(dir, 'src/pages/index.astro', '<h1>old</h1>\n');
  assert.equal(run(root, 'check').code, 0);
});

test('bad usage exits 2', () => {
  const root = factory();
  site(root, 'ok');
  for (const args of [
    ['prune'],
    ['prune', '--site', 'Bad_Slug'],
    ['prune', '--site', 'missing'],
    ['add', 'nope', '--site', 'ok'],
    ['add', '--site', 'ok'],
    ['check', '--site', '../x'],
    ['explode'],
    [],
  ])
    assert.equal(run(root, ...args).code, 2, args.join(' '));
});

test('the new-landing skill and sites/README.md name the architecture contract, the prune step and lint', () => {
  const skill = readFileSync(
    join(ROOT, '.claude/skills/new-landing/SKILL.md'),
    'utf8',
  );
  const readme = readFileSync(join(ROOT, 'sites/README.md'), 'utf8');
  for (const needle of [
    'Code architecture',
    'src/content/',
    'interface Props',
    'node scripts/site-layers.mjs prune --site <slug>',
    'npm install',
    'npm run lint',
  ])
    assert.ok(skill.includes(needle), `skill: ${needle}`);
  for (const needle of [
    'Code architecture',
    'src/content/',
    'interface Props',
    'site-layers.mjs prune',
    'npm run lint',
  ])
    assert.ok(readme.includes(needle), `sites/README.md: ${needle}`);
  // The multi-locale section points to the shared contract instead of repeating it.
  assert.match(skill, /the Code architecture contract above applies/);
});
