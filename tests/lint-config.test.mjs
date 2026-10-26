// The lint configuration: the root ESLint flat config parses Astro frontmatter with TypeScript, reports the
// accessibility rules, and the root knip.json lists the files `import.meta.glob` loads as entries.
// No browser and no network: ESLint runs on text.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const eslint = new ESLint({ cwd: ROOT });
const lint = async (
  code,
  file = 'sites/fixture/src/components/Fixture.astro',
) => (await eslint.lintText(code, { filePath: join(ROOT, file) }))[0];
const readJson = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));

test('an Astro component with `interface Props` and typed frontmatter parses and passes', async () => {
  const result = await lint(`---
interface Props {
  title: string;
  items?: string[];
}
const { title, items = [] } = Astro.props;
---

<section>
  <h2>{title}</h2>
  <ul>{items.map((item) => <li>{item}</li>)}</ul>
  <a href="#contact">Contact</a>
</section>
`);
  assert.deepEqual(
    result.messages.map((m) => `${m.ruleId ?? 'parse'}: ${m.message}`),
    [],
  );
});

test('the accessibility rules report an anchor without a valid href, naming the rule and the line', async () => {
  const result = await lint(`---
---

<header>
  <a href="#" class="brand">Home</a>
</header>
`);
  const finding = result.messages.find((m) =>
    /anchor-is-valid/.test(m.ruleId ?? ''),
  );
  assert.ok(finding, JSON.stringify(result.messages));
  assert.equal(finding.severity, 2);
  assert.equal(finding.line, 5);
});

test('tabindex on a non-interactive element is reported, and an unused disable directive is an error', async () => {
  const bad = await lint(`---
---

<div tabindex="0" role="region" aria-label="Scroller">x</div>
`);
  assert.ok(
    bad.messages.some((m) => /no-noninteractive-tabindex/.test(m.ruleId ?? '')),
  );
  const unused = await lint(`---
// eslint-disable-next-line no-var -- nothing to disable here
const a = 1;
---

<p>{a}</p>
`);
  assert.ok(
    unused.messages.some((m) => /Unused eslint-disable/.test(m.message)),
    JSON.stringify(unused.messages),
  );
});

test('TypeScript files and script blocks follow the recommended rules (no var)', async () => {
  const result = await lint(
    'var x = 1;\nexport { x };\n',
    'sites/fixture/src/data/x.ts',
  );
  assert.ok(result.messages.some((m) => m.ruleId === 'no-var'));
});

test('scripts/, tests/ and openspec/ are outside the lint scope', async () => {
  for (const file of ['scripts/a.mjs', 'tests/a.test.mjs', 'openspec/a.mjs'])
    assert.equal(await eslint.isPathIgnored(join(ROOT, file)), true, file);
  assert.equal(
    await eslint.isPathIgnored(join(ROOT, 'sites/x/src/a.astro')),
    false,
  );
});

test('knip.json: a root and a sites/* workspace, glob-loaded files as entries, layers ignored per site', () => {
  const knip = readJson('knip.json');
  assert.deepEqual(Object.keys(knip.workspaces), ['.', 'sites/*']);
  const site = knip.workspaces['sites/*'];
  for (const entry of ['src/i18n/urls.ts', 'src/scenes/*.ts'])
    assert.ok(site.entry.includes(entry), entry);
  assert.ok(knip.workspaces['.'].entry.includes('src/scenes/*.ts'));
  for (const layer of ['src/components/three/**', 'src/components/legal/**'])
    assert.ok(site.ignore.includes(layer), layer);
  // The starter keeps its legal and i18n components (template source); its 3D layer is used by /3d/.
  assert.ok(knip.workspaces['.'].ignore.includes('src/components/legal/**'));
});

test('package.json: pinned lint tooling and the lint scripts', () => {
  const pkg = readJson('package.json');
  for (const name of [
    'eslint',
    'typescript-eslint',
    'eslint-plugin-astro',
    'eslint-plugin-jsx-a11y',
    'knip',
  ])
    assert.match(pkg.devDependencies[name], /^\d+\.\d+\.\d+$/, name);
  assert.match(pkg.scripts['lint:code'], /^eslint src /);
  assert.match(
    pkg.scripts['lint:unused'],
    /^knip --include files,dependencies/,
  );
  assert.equal(
    pkg.scripts.lint,
    'npm run lint:code && npm run lint:unused && node scripts/site-layers.mjs check',
  );
  // Sites carry no lint tooling of their own.
  for (const slug of ['personal-brand', 'samurai'])
    assert.ok(
      !JSON.stringify(readJson(`sites/${slug}/package.json`)).includes(
        'eslint',
      ),
    );
});
