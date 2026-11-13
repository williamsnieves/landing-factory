// scripts/lib/cms-config.mjs and `scripts/cms.mjs check`: the .pages.yml rules on fixture sites. No network.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

import { main } from '../scripts/cms.mjs';
import {
  cmsOwnsOffer,
  isCmsPath,
  mentionsPath,
  readCmsConfig,
} from '../scripts/lib/cms-config.mjs';
import { validateRevisions } from '../scripts/lib/revisions-schema.mjs';
import { capture } from './deploy-helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'lf-cms-config-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const env = { NODE_TEST_CONTEXT: 'child-v8' };

const put = (base, file, content = 'x') => {
  mkdirSync(dirname(join(base, file)), { recursive: true });
  writeFileSync(join(base, file), content);
};

const CONTENT_CONFIG = `import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
export const collections = {
  jobs: defineCollection({ loader: glob({ pattern: '*.json', base: './src/content/jobs' }) }),
  site: defineCollection({ loader: file('src/content/site.json') }),
};
`;
const VALID = `content:
  - name: jobs
    label: Jobs
    type: collection
    path: src/content/jobs
    format: json
    fields:
      - { name: title, type: string }
  - name: site
    label: Site
    type: file
    path: src/content/site.json
    format: json
`;

/** A site folder with a valid configuration; `yml` and `config` replace the defaults. */
function site({ yml = VALID, config = CONTENT_CONFIG } = {}) {
  const root = mkdtempSync(join(tmp, 'root-'));
  const dir = join(root, 'sites', 'acme');
  put(dir, 'package.json', '{}');
  put(dir, 'src/content/jobs/a.json', '{"title":"A"}\n');
  put(dir, 'src/content/site.json', '{}\n');
  if (config !== null) put(dir, 'src/content.config.ts', config);
  if (yml !== null) put(dir, '.pages.yml', yml);
  return { root, dir };
}
const check = (root, slug = 'acme') => {
  const c = capture();
  const code = main(['check', '--site', slug, '--root', root], c.io, env);
  return { code, out: c.out.join('\n'), err: c.err.join('\n') };
};

test('a valid configuration lists its paths and exits 0; keys we do not rely on are ignored', () => {
  const { root, dir } = site({
    yml: `${VALID}settings:\n  hide: true\ncomponents:\n  x: { type: string }\ncache:\n  enabled: false\n`,
  });
  const r = readCmsConfig(dir);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(
    r.paths.map((p) => [p.name, p.type, p.path, p.format]),
    [
      ['jobs', 'collection', 'src/content/jobs', 'json'],
      ['site', 'file', 'src/content/site.json', 'json'],
    ],
  );
  const c = check(root);
  assert.equal(c.code, 0, c.err);
  assert.match(c.out, /valid, 2 entries/);
});

test('yaml format is accepted', () => {
  const { dir } = site({ yml: VALID.replace('format: json', 'format: yaml') });
  assert.deepEqual(readCmsConfig(dir).problems, []);
});

test('media is refused with the license reason; actions too, top-level or per entry', () => {
  const media = site({ yml: `${VALID}media:\n  input: src/assets\n` });
  const a = check(media.root);
  assert.equal(a.code, 1);
  assert.match(a.err, /media: uploads are not allowed.*license record/);
  const actions = site({ yml: `${VALID}actions:\n  - name: x\n` });
  assert.match(check(actions.root).err, /actions: not allowed/);
  const entry = site({
    yml: VALID.replace(
      '    format: json\n    fields:',
      '    format: json\n    actions: []\n    fields:',
    ),
  });
  const b = check(entry.root);
  assert.equal(b.code, 1);
  assert.match(b.err, /content "jobs": actions: not allowed/);
});

test('a path outside src/content/ is refused, naming the entry and the path', () => {
  const { root } = site({
    yml: VALID.replace('src/content/jobs', 'src/components'),
  });
  const r = check(root);
  assert.equal(r.code, 1);
  assert.match(
    r.err,
    /content "jobs": path "src\/components" is outside src\/content\//,
  );
  for (const bad of [
    '../x',
    'src/content/../pages',
    '/src/content/jobs',
    'src/content/jobs/',
    'src/content',
  ]) {
    const s = site({ yml: VALID.replace('src/content/jobs', bad) });
    assert.equal(check(s.root).code, 1, bad);
  }
});

test('a missing path, a wrong kind of path and a repeated path are refused', () => {
  const missing = site({
    yml: VALID.replace('src/content/jobs', 'src/content/nope'),
  });
  assert.match(check(missing.root).err, /"src\/content\/nope" does not exist/);
  const wrong = site({ yml: VALID.replace('type: collection', 'type: file') });
  assert.match(check(wrong.root).err, /is not a file \(type file\)/);
  const wrong2 = site({ yml: VALID.replace('type: file', 'type: collection') });
  assert.match(check(wrong2.root).err, /is not a folder \(type collection\)/);
  const twice = site({
    yml: VALID.replace('src/content/site.json', 'src/content/jobs'),
  });
  assert.match(check(twice.root).err, /listed twice/);
});

test('a bad type or format is refused', () => {
  const type = site({ yml: VALID.replace('type: collection', 'type: group') });
  assert.match(
    check(type.root).err,
    /type must be collection or file, got "group"/,
  );
  const format = site({
    yml: VALID.replace(
      'format: json\n    fields',
      'format: yaml-frontmatter\n    fields',
    ),
  });
  assert.match(check(format.root).err, /format must be json or yaml/);
  const none = site({
    yml: VALID.replace('    format: json\n    fields', '    fields'),
  });
  assert.match(check(none.root).err, /format must be json or yaml, got null/);
});

test('every path must be referenced in src/content.config.ts', () => {
  const partial = site({
    config: CONTENT_CONFIG.replace(
      "'src/content/site.json'",
      "'src/content/other.json'",
    ),
  });
  const r = check(partial.root);
  assert.equal(r.code, 1);
  assert.match(
    r.err,
    /"src\/content\/site\.json" is not referenced in src\/content\.config\.ts/,
  );
  assert.doesNotMatch(r.err, /"src\/content\/jobs" is not referenced/);
  const none = site({ config: null });
  assert.match(check(none.root).err, /src\/content\.config\.ts is missing/);
});

test('mentionsPath matches whole paths, in the forms a loader uses', () => {
  assert.equal(
    mentionsPath("base: './src/content/jobs'", 'src/content/jobs'),
    true,
  );
  assert.equal(
    mentionsPath("glob('src/content/jobs/*.json')", 'src/content/jobs'),
    true,
  );
  assert.equal(
    mentionsPath("file('src/content/site.json')", 'src/content/site.json'),
    true,
  );
  assert.equal(
    mentionsPath("base: './src/content/jobs-old'", 'src/content/jobs'),
    false,
  );
  assert.equal(
    mentionsPath("file('src/content/site.json.bak')", 'src/content/site.json'),
    false,
  );
  assert.equal(
    mentionsPath("base: './content/jobs'", 'src/content/jobs'),
    true,
  );
  assert.equal(mentionsPath('nothing', 'src/content/jobs'), false);
});

test('isCmsPath covers a file, a folder and what lies under it, not a sibling', () => {
  const paths = ['src/content/jobs', 'src/content/site.json'];
  assert.equal(isCmsPath('src/content/jobs/a.json', paths), true);
  assert.equal(isCmsPath('src/content/site.json', paths), true);
  assert.equal(isCmsPath('src/content/jobs-old/a.json', paths), false);
  assert.equal(isCmsPath('src/content/other.json', paths), false);
});

test('invalid YAML, a non-mapping and an empty content list are refused', () => {
  assert.match(check(site({ yml: 'content: [\n' }).root).err, /not valid YAML/);
  assert.match(
    check(site({ yml: '- a\n- b\n' }).root).err,
    /must be a YAML mapping/,
  );
  assert.match(
    check(site({ yml: 'settings: {}\n' }).root).err,
    /non-empty list/,
  );
});

test('usage: no .pages.yml, an unknown site, a bad slug, no command and --root outside tests exit 2', () => {
  assert.equal(check(site({ yml: null }).root).code, 2);
  const { root } = site();
  assert.equal(check(root, 'nope').code, 2);
  for (const argv of [
    ['check'],
    ['check', '--site', 'Bad Slug'],
    [],
    ['frob', '--site', 'acme'],
    ['check', '--site', 'acme', '--from', 'x'],
    ['pull', '--site', 'acme'],
  ]) {
    const c = capture();
    assert.equal(main(argv, c.io, env), 2, argv.join(' '));
  }
  const c = capture();
  assert.equal(main(['check', '--site', 'acme', '--root', root], c.io, {}), 2);
  assert.match(c.err.join(' '), /only available to tests/);
  const h = capture();
  assert.equal(main(['--help'], h.io, env), 0);
});

test('revisions.json accepts the cms kind', () => {
  const round = {
    n: 1,
    date: '2026-11-12',
    feedback: 'Add a job and change the hero heading.',
    items: [
      { kind: 'copy', summary: 'Hero heading' },
      { kind: 'cms', summary: 'New job in src/content/jobs' },
    ],
    briefChanged: false,
    files: ['src/content/en.ts'],
    result: 'passed',
  };
  assert.deepEqual(validateRevisions({ version: 1, rounds: [round] }), []);
  round.items[1].kind = 'cmss';
  assert.equal(validateRevisions({ version: 1, rounds: [round] }).length, 1);
});

test('cmsOwnsOffer: true only for a valid configuration with an entry named offer', () => {
  const offer = VALID.replace('name: jobs', 'name: offer');
  assert.equal(cmsOwnsOffer(site({ yml: offer }).dir), true);
  assert.equal(cmsOwnsOffer(site().dir), false);
  // invalid (path missing from content.config.ts) with the entry: still false
  assert.equal(
    cmsOwnsOffer(site({ yml: offer, config: 'export const x = 1;\n' }).dir),
    false,
  );
  assert.equal(cmsOwnsOffer(site({ yml: null }).dir), false);
  assert.equal(cmsOwnsOffer(site({ yml: ': : not yaml [' }).dir), false);
});

test('cms check prints that the CMS owns the offer only when it does', () => {
  const owns = check(
    site({ yml: VALID.replace('name: jobs', 'name: offer') }).root,
  );
  assert.equal(owns.code, 0, owns.err);
  assert.match(owns.out, /CMS owns the brief's offer/);
  const plain = check(site().root);
  assert.equal(plain.code, 0);
  assert.doesNotMatch(plain.out, /owns the brief/);
});
