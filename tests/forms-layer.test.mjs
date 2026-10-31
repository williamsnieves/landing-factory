// The `forms` layer (add-lead-forms, task 3.2): prune, add and check on fixture sites in a temporary factory root,
// the new-site copy and the export closure. The real sites are never touched.
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

import { COPIED_PATHS } from '../scripts/new-site.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCRIPT = join(ROOT, 'scripts/site-layers.mjs');
const tmp = mkdtempSync(join(tmpdir(), 'forms-layer-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const put = (base, path, text = '') => {
  mkdirSync(dirname(join(base, path)), { recursive: true });
  writeFileSync(join(base, path), text);
};

function factory() {
  const root = mkdtempSync(join(tmp, 'root-'));
  put(
    root,
    'package.json',
    JSON.stringify({ name: 'fixture', dependencies: {}, devDependencies: {} }),
  );
  put(root, 'src/components/forms/LeadForm.astro', '---\n---\n<form />\n');
  put(root, 'src/components/forms/client.ts', 'export {};\n');
  put(root, 'src/components/legal/texts.ts', 'export const texts = {};\n');
  return root;
}

function site(root, slug, files = {}) {
  const dir = join(root, 'sites', slug);
  put(dir, 'package.json', JSON.stringify({ name: `site-${slug}` }));
  put(dir, 'src/components/forms/LeadForm.astro', '---\n---\n<form />\n');
  put(dir, 'src/components/forms/client.ts', 'export {};\n');
  // The real LeadForm imports the legal helpers; the layer scan must not count that as a use of legal.
  put(
    dir,
    'src/components/forms/uses-legal.ts',
    "import { texts } from '../legal/texts';\nexport { texts };\n",
  );
  put(dir, 'src/components/legal/texts.ts', 'export const texts = {};\n');
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

const USES_FORMS =
  "---\nimport LeadForm from '../components/forms/LeadForm.astro';\n---\n<LeadForm />\n";

test('new-site copies the forms components, and the layer is registered', async () => {
  assert.ok(COPIED_PATHS.includes('src/components/forms'));
  const { LAYERS } = await import('../scripts/site-layers.mjs');
  assert.deepEqual(LAYERS.forms.paths, ['src/components/forms']);
  assert.deepEqual(LAYERS.forms.requires, ['legal']);
});

test('check fails for an unused forms layer until prune removes it (and the legal layer it leaned on)', () => {
  const root = factory();
  const dir = site(root, 'plain');
  const before = run(root, 'check', '--site', 'plain');
  assert.equal(before.code, 1);
  assert.match(before.err, /plain: holds the lead forms components/);
  assert.match(before.err, /plain: holds the legal components/);
  const pruned = run(root, 'prune', '--site', 'plain');
  assert.equal(pruned.code, 0, pruned.err);
  assert.ok(!existsSync(join(dir, 'src/components/forms')));
  assert.ok(!existsSync(join(dir, 'src/components/legal')));
  assert.ok(existsSync(join(dir, 'src/pages/index.astro')));
  assert.equal(run(root, 'check', '--site', 'plain').code, 0);
});

test('a page that imports the form component keeps forms and the legal layer it needs', () => {
  const root = factory();
  const dir = site(root, 'leads', { 'src/pages/contact.astro': USES_FORMS });
  assert.equal(run(root, 'check', '--site', 'leads').code, 0);
  const result = run(root, 'prune', '--site', 'leads');
  assert.equal(result.code, 0, result.err);
  assert.ok(existsSync(join(dir, 'src/components/forms/LeadForm.astro')));
  assert.ok(existsSync(join(dir, 'src/components/legal/texts.ts')));
});

test('add forms restores the layer from the starter and refuses when it exists', () => {
  const root = factory();
  const dir = site(root, 'again');
  assert.equal(run(root, 'prune', '--site', 'again').code, 0);
  const added = run(root, 'add', 'forms', '--site', 'again');
  assert.equal(added.code, 0, added.err);
  assert.equal(
    readFileSync(join(dir, 'src/components/forms/client.ts'), 'utf8'),
    'export {};\n',
  );
  const again = run(root, 'add', 'forms', '--site', 'again');
  assert.equal(again.code, 1);
  assert.match(again.err, /already exists/);
});

test('every existing site passes the layer check without a forms layer', () => {
  const result = spawnSync(process.execPath, [SCRIPT, 'check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
});
