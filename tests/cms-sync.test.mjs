// The CMS side of sync and export, and `scripts/cms.mjs pull`, against a fixture factory and a local bare git
// repository as origin (the pattern of sync-export.test.mjs). No network, no GitHub, no Pages CMS.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
import { dirname, join, relative } from 'node:path';
import { after, test } from 'node:test';

import { main as cmsMain } from '../scripts/cms.mjs';
import { main as exportMain } from '../scripts/export.mjs';
import { main as syncMain } from '../scripts/sync-export.mjs';
import { ROOT, capture, vercelConfig } from './deploy-helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'lf-sync-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
let counter = 0;
const fresh = (name) => join(tmp, `${name}-${counter++}`);
const env = { NODE_TEST_CONTEXT: 'child-v8' };
const REPO = 'https://github.com/acme/site';

const put = (base, file, content = 'x') => {
  mkdirSync(dirname(join(base, file)), { recursive: true });
  writeFileSync(join(base, file), content);
};
const listFiles = (dir, base = dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.name !== '.git')
    .flatMap((e) =>
      e.isDirectory()
        ? listFiles(join(dir, e.name), base)
        : [relative(base, join(dir, e.name)).split('\\').join('/')],
    )
    .sort();
const git = (cwd, ...args) =>
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      '-C',
      cwd,
      ...args,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

const lock = (gsap = '3.15.0') => ({
  packages: {
    '': {},
    'node_modules/astro': { version: '7.4.0' },
    'node_modules/gsap': { version: gsap },
    'node_modules/typescript': { version: '6.0.3' },
    'node_modules/chrome-launcher': { version: '1.2.2' },
    'node_modules/lighthouse': { version: '13.5.0' },
    'node_modules/playwright': { version: '1.56.1' },
    'node_modules/prettier': { version: '3.9.10' },
    'node_modules/prettier-plugin-astro': { version: '1.1.1' },
    'node_modules/sharp': { version: '0.35.5' },
    'node_modules/wrangler': { version: '4.151.1' },
    'node_modules/eslint': { version: '9.39.5' },
    'node_modules/eslint-plugin-astro': { version: '1.7.0' },
    'node_modules/eslint-plugin-jsx-a11y': { version: '6.10.2' },
    'node_modules/knip': { version: '6.43.0' },
    'node_modules/typescript-eslint': { version: '8.72.1' },
  },
});

/** A small factory with one site "acme" (the shape of the export tests' fixture). */
function makeFactory() {
  const root = fresh('factory');
  put(
    root,
    'scripts/qa.mjs',
    "import './qa/one.mjs';\nimport './lib/sites.mjs';\n",
  );
  put(root, 'scripts/qa/one.mjs', 'export const one = 1;\n');
  put(root, 'scripts/lib/sites.mjs', 'export const sites = [];\n');
  put(root, 'scripts/landing-report.mjs', "import './report/mask.mjs';\n");
  put(root, 'scripts/report/mask.mjs', 'export const mask = (v) => v;\n');
  put(root, 'scripts/deploy.mjs', "import './deploy/config.mjs';\n");
  put(root, 'scripts/deploy/config.mjs', 'export const config = {};\n');
  put(root, 'scripts/parse-wrangler-output.mjs', 'export const parse = 1;\n');
  put(root, '.nvmrc', '22\n');
  put(root, 'eslint.config.mjs', 'export default [];\n');
  put(
    root,
    '.prettierrc.json',
    readFileSync(join(ROOT, '.prettierrc.json'), 'utf8'),
  );
  put(root, 'qa.config.json', '{ "pages": { "exclude": ["404.html"] } }\n');
  put(root, 'package.json', JSON.stringify({ engines: { node: '>=22.22.0' } }));
  put(root, 'package-lock.json', JSON.stringify(lock()));
  put(root, 'docs/deploy/vercel.md', '# Deploy to Vercel\n');
  put(root, 'design-system/acme/MASTER.md', '# Acme design system\n');
  const site = join(root, 'sites/acme');
  put(
    site,
    'package.json',
    JSON.stringify({
      dependencies: { astro: '^7.4.0', gsap: '^3.15.0' },
      devDependencies: { typescript: '^6.0.3' },
    }),
  );
  put(
    site,
    'astro.config.mjs',
    "export default { site: 'https://acme.example' };\n",
  );
  put(site, 'tsconfig.json', '{}\n');
  put(site, 'site.config.json', JSON.stringify(vercelConfig()));
  put(site, 'assets.json', '{ "images": [] }\n');
  put(site, 'CREDITS.md', '# Credits: acme\n');
  put(site, 'PROPOSAL.md', '# Proposal\n');
  put(site, 'RUN.md', '# Run\n');
  put(site, 'src/pages/index.astro', '---\n---\n\n<h1>Acme</h1>\n');
  put(site, 'src/components/Hero.astro', '<h2>Welcome</h2>\n');
  put(site, 'src/components/Old.astro', '<p>old</p>\n');
  put(site, 'public/_headers', '/*\n  X-Content-Type-Options: nosniff\n');
  put(site, 'brief.json', JSON.stringify({ business: { name: 'Acme Ltd' } }));
  return { root, site };
}

function exportTo(factory, out, extra = []) {
  const c = capture();
  const code = exportMain(
    [
      '--root',
      factory.root,
      '--site',
      'acme',
      '--out',
      out,
      '--no-lockfile',
      ...extra,
    ],
    c.io,
    env,
  );
  assert.equal(code, 0, c.all());
}

/**
 * A factory exported once, a bare origin holding that export plus the lockfile, and a clone of it whose origin
 * URL is the recorded https URL. `record` is the EXPORTED.json content (default: a private, with-brief export).
 */
function managedFrom(factory, { record = {}, brief = true } = {}) {
  const first = fresh('first');
  exportTo(factory, first, brief ? [] : ['--no-brief']);
  put(first, 'package-lock.json', JSON.stringify(lock(), null, 2) + '\n');
  const bare = fresh('bare.git');
  mkdirSync(bare);
  git(bare, 'init', '--bare', '-b', 'main');
  git(first, 'init', '-b', 'main');
  git(first, 'add', '-A');
  git(first, 'commit', '-m', 'first export');
  git(first, 'remote', 'add', 'origin', bare);
  git(first, 'push', 'origin', 'main');
  const clone = fresh('clone');
  execFileSync('git', ['clone', '-q', bare, clone]);
  git(clone, 'remote', 'set-url', 'origin', `${REPO}.git`);
  git(clone, 'config', `url.${bare}.insteadOf`, `${REPO}.git`);
  put(
    factory.site,
    'EXPORTED.json',
    JSON.stringify({
      repository: REPO,
      exportedAt: '2026-10-27T00:00:00.000Z',
      factoryCommit: 'abc',
      target: 'vercel',
      noBrief: !brief,
      ...record,
    }),
  );
  return { factory, clone, bare };
}

function sync(m, extra = [], over = {}) {
  const c = capture();
  const code = syncMain(
    [
      '--root',
      m.factory.root,
      '--site',
      'acme',
      '--into',
      m.clone,
      '--no-lockfile',
      ...extra,
    ],
    c.io,
    { ...env, ...over },
  );
  return { code, out: c.out.join('\n'), err: c.err.join('\n'), c };
}

const CONTENT_CONFIG = `import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
export const collections = {
  jobs: defineCollection({ loader: glob({ pattern: '*.json', base: './src/content/jobs' }) }),
};
`;
const PAGES_YML = `content:
  - name: jobs
    label: Jobs
    type: collection
    path: src/content/jobs
    format: json
`;

/** Like sync-export.test.mjs's managed(), for a site that has the jobs collection and a .pages.yml. */
function cmsManaged(opts) {
  const factory = makeFactory();
  put(factory.site, 'src/content.config.ts', CONTENT_CONFIG);
  put(factory.site, 'src/content/jobs/a.json', '{"title":"A"}\n');
  put(factory.site, 'src/content/jobs/b.json', '{"title":"B"}\n');
  put(factory.site, '.pages.yml', PAGES_YML);
  return managedFrom(factory, opts);
}

const cmsRun = (m, argv) => {
  const c = capture();
  const code = cmsMain(
    ['--root', m.factory.root, '--site', 'acme', ...argv],
    c.io,
    env,
  );
  return { code, out: c.out.join('\n'), err: c.err.join('\n') };
};
const pull = (m, extra = [], clone = m.clone) =>
  cmsRun(m, ['pull', '--from', clone, ...extra]);
const status = (clone) => git(clone, 'status', '--porcelain').trim();
const commitIn = (clone, msg = 'edit') => {
  git(clone, 'add', '-A');
  git(clone, 'commit', '-m', msg);
};
// --- export ----------------------------------------------------------------------------------------------

test('export copies .pages.yml to the repository root unchanged', () => {
  const factory = makeFactory();
  put(factory.site, 'src/content.config.ts', CONTENT_CONFIG);
  put(factory.site, 'src/content/jobs/a.json', '{"title":"A"}\n');
  put(factory.site, '.pages.yml', PAGES_YML);
  const out = fresh('out');
  exportTo(factory, out);
  assert.equal(readFileSync(join(out, '.pages.yml'), 'utf8'), PAGES_YML);
  assert.equal(existsSync(join(out, 'src/content/jobs/a.json')), true);
});

test('export of an invalid .pages.yml exits 1 and writes nothing', () => {
  for (const bad of [
    `${PAGES_YML}media:\n  input: x\n`,
    PAGES_YML.replace('src/content/jobs', 'src/pages'),
  ]) {
    const factory = makeFactory();
    put(factory.site, 'src/content.config.ts', CONTENT_CONFIG);
    put(factory.site, 'src/content/jobs/a.json', '{}\n');
    put(factory.site, '.pages.yml', bad);
    const out = fresh('out');
    const c = capture();
    const code = exportMain(
      ['--root', factory.root, '--site', 'acme', '--out', out, '--no-lockfile'],
      c.io,
      env,
    );
    assert.equal(code, 1, c.all());
    assert.match(c.all(), /\.pages\.yml is not valid/);
    assert.equal(existsSync(out), false);
  }
});

test('a site without .pages.yml exports no CMS file', () => {
  const factory = makeFactory();
  const out = fresh('out');
  exportTo(factory, out);
  assert.equal(existsSync(join(out, '.pages.yml')), false);
});

const PRETTIER_BIN = join(ROOT, 'node_modules/prettier/bin/prettier.cjs');
const prettierCheck = (cwd, ...files) => {
  try {
    execFileSync(process.execPath, [PRETTIER_BIN, '--check', ...files], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
};
// What Pages CMS writes: JSON.stringify(value, null, 2), no final newline.
const cmsJson = (value) => JSON.stringify(value, null, 2);

test('export lists the CMS paths in .prettierignore, so a file saved by the CMS passes format:check', () => {
  const factory = makeFactory();
  put(
    factory.site,
    'src/content.config.ts',
    `${CONTENT_CONFIG}// src/content/site.json\n`,
  );
  put(factory.site, 'src/content/jobs/a.json', '{"title":"A"}\n');
  put(factory.site, 'src/content/site.json', '{"a":1}\n');
  put(
    factory.site,
    '.pages.yml',
    `${PAGES_YML}  - name: site\n    label: Site\n    type: file\n    path: src/content/site.json\n    format: json\n`,
  );
  const out = fresh('out');
  exportTo(factory, out);
  const ignore = readFileSync(join(out, '.prettierignore'), 'utf8');
  assert.match(ignore, /^\/src\/content\/jobs\/$/m);
  assert.match(ignore, /^\/src\/content\/site\.json$/m);
  const file = join(out, 'src/content/jobs/a.json');
  writeFileSync(file, cmsJson({ title: 'A', tags: ['x', 'y'] }));
  writeFileSync(join(out, 'src/content/site.json'), cmsJson({ a: [1, 2] }));
  assert.equal(
    prettierCheck(out, 'src/content/jobs/a.json', 'src/content/site.json'),
    true,
  );
  // without the ignore entry the same file fails the check (the problem this change fixes)
  writeFileSync(join(out, '.prettierignore'), 'package-lock.json\n');
  assert.equal(prettierCheck(out, 'src/content/jobs/a.json'), false);
});

test('a site without .pages.yml gets the unchanged .prettierignore', () => {
  const out = fresh('out');
  exportTo(makeFactory(), out);
  assert.equal(
    readFileSync(join(out, '.prettierignore'), 'utf8'),
    'package-lock.json\ndist/\n.astro/\nnode_modules/\n/qa/\n/docs/factory/\n/.pages.yml\n',
  );
});

// --- sync ------------------------------------------------------------------------------------------------

test('sync keeps an edit made through the CMS, lists it and names the pull command', () => {
  const m = cmsManaged();
  put(m.clone, 'src/content/jobs/a.json', '{"title":"Edited in the CMS"}\n');
  commitIn(m.clone);
  put(m.factory.site, 'src/components/Hero.astro', '<h2>Other</h2>\n');
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(
    r.out,
    /kept \(managed by the CMS\): src\/content\/jobs\/a\.json/,
  );
  assert.match(r.out, /node scripts\/cms\.mjs pull --site acme --from /);
  assert.match(r.out, /changed +src\/components\/Hero\.astro/);
  assert.match(r.out, /1 file\(s\) changed/);
  assert.equal(
    readFileSync(join(m.clone, 'src/content/jobs/a.json'), 'utf8'),
    '{"title":"Edited in the CMS"}\n',
  );
  assert.equal(status(m.clone), 'M src/components/Hero.astro');
});

test('sync does not add, change or delete under a CMS path', () => {
  const m = cmsManaged();
  // a job added and one removed in the CMS; the factory adds another and changes b
  put(m.clone, 'src/content/jobs/c.json', '{"title":"C"}\n');
  rmSync(join(m.clone, 'src/content/jobs/b.json'));
  commitIn(m.clone);
  put(m.factory.site, 'src/content/jobs/d.json', '{"title":"D"}\n');
  const head = git(m.clone, 'rev-parse', 'HEAD');
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  for (const f of ['b', 'c', 'd'])
    assert.match(
      r.out,
      new RegExp(`kept \\(managed by the CMS\\): src/content/jobs/${f}\\.json`),
    );
  assert.doesNotMatch(r.out, /(added|changed|deleted) +src\/content\/jobs/);
  assert.match(r.out, /0 file\(s\) changed/);
  assert.deepEqual(readdirSync(join(m.clone, 'src/content/jobs')).sort(), [
    'a.json',
    'c.json',
  ]);
  assert.equal(status(m.clone), '');
  assert.equal(git(m.clone, 'rev-parse', 'HEAD'), head);
});

test('the first sync after a site moves to the CMS adds the CMS files once', () => {
  // exported before the CMS existed: the clone has no content folder and no .pages.yml
  const m = managedFrom(makeFactory());
  put(m.factory.site, 'src/content.config.ts', CONTENT_CONFIG);
  put(m.factory.site, 'src/content/jobs/a.json', '{"title":"A"}\n');
  put(m.factory.site, 'src/content/jobs/b.json', '{"title":"B"}\n');
  put(m.factory.site, '.pages.yml', PAGES_YML);
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  for (const f of ['a', 'b'])
    assert.match(
      r.out,
      new RegExp(
        `added +src/content/jobs/${f}\\.json \\(first copy for the CMS\\)`,
      ),
    );
  assert.match(r.out, /added +\.pages\.yml/);
  assert.doesNotMatch(r.out, /managed by the CMS/);
  assert.deepEqual(readdirSync(join(m.clone, 'src/content/jobs')).sort(), [
    'a.json',
    'b.json',
  ]);
  // once the folder exists the CMS owns it: a deletion made there is not undone by the next sync
  commitIn(m.clone, 'first sync');
  rmSync(join(m.clone, 'src/content/jobs/b.json'));
  commitIn(m.clone, 'deleted in the CMS');
  const again = sync(m);
  assert.equal(again.code, 0, again.out + again.err);
  assert.doesNotMatch(again.out, /first copy for the CMS/);
  assert.match(
    again.out,
    /kept \(managed by the CMS\): src\/content\/jobs\/b\.json/,
  );
  assert.deepEqual(readdirSync(join(m.clone, 'src/content/jobs')), ['a.json']);
});

test('sync with CMS files identical on both sides prints no hint and syncs .pages.yml itself', () => {
  const m = cmsManaged();
  const clean = sync(m);
  assert.equal(clean.code, 0, clean.out + clean.err);
  assert.doesNotMatch(clean.out, /managed by the CMS/);
  assert.doesNotMatch(clean.out, /cms\.mjs pull/);
  put(m.factory.site, '.pages.yml', `${PAGES_YML}settings:\n  hide: true\n`);
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /changed +\.pages\.yml/);
  assert.match(readFileSync(join(m.clone, '.pages.yml'), 'utf8'), /hide: true/);
});

test('a path removed from .pages.yml in the factory is no longer protected', () => {
  const m = cmsManaged();
  put(m.clone, 'src/content/jobs/a.json', '{"title":"Edited"}\n');
  commitIn(m.clone);
  // the factory's configuration now lists a different (existing) file only
  put(m.factory.site, 'src/content/site.json', '{}\n');
  put(
    m.factory.site,
    'src/content.config.ts',
    `${CONTENT_CONFIG}// src/content/site.json\n`,
  );
  put(
    m.factory.site,
    '.pages.yml',
    'content:\n  - name: site\n    type: file\n    path: src/content/site.json\n    format: json\n',
  );
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /changed +src\/content\/jobs\/a\.json/);
  // a CMS path the clone never had is added once
  assert.match(
    r.out,
    /added +src\/content\/site\.json \(first copy for the CMS\)/,
  );
});

test('sync lists no kept file when the CMS file has the same values in another formatting', () => {
  const m = cmsManaged();
  put(m.clone, 'src/content/jobs/a.json', cmsJson({ title: 'A' }));
  commitIn(m.clone);
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.doesNotMatch(r.out, /managed by the CMS/);
  assert.equal(
    readFileSync(join(m.clone, 'src/content/jobs/a.json'), 'utf8'),
    cmsJson({ title: 'A' }),
  );
});

test('sync keeps a CMS file whose value differs, and compares unparsable files by bytes', () => {
  const m = cmsManaged();
  put(m.clone, 'src/content/jobs/a.json', cmsJson({ title: 'Other' }));
  put(m.clone, 'src/content/jobs/b.json', '{ not json');
  commitIn(m.clone);
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(
    r.out,
    /kept \(managed by the CMS\): src\/content\/jobs\/a\.json/,
  );
  assert.match(
    r.out,
    /kept \(managed by the CMS\): src\/content\/jobs\/b\.json/,
  );
});

test('sync compares YAML CMS files by value', () => {
  const factory = makeFactory();
  put(factory.site, 'src/content.config.ts', '// src/content/site.yml\n');
  put(factory.site, 'src/content/site.yml', 'title: A\nlist: [1, 2]\n');
  put(
    factory.site,
    '.pages.yml',
    'content:\n  - name: site\n    type: file\n    path: src/content/site.yml\n    format: yaml\n',
  );
  const m = managedFrom(factory);
  put(m.clone, 'src/content/site.yml', 'list:\n  - 1\n  - 2\ntitle: A\n');
  commitIn(m.clone);
  let r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.doesNotMatch(r.out, /managed by the CMS/);
  put(m.clone, 'src/content/site.yml', 'list:\n  - 1\ntitle: A\n');
  commitIn(m.clone);
  r = sync(m);
  assert.match(r.out, /kept \(managed by the CMS\): src\/content\/site\.yml/);
});

// --- pull ------------------------------------------------------------------------------------------------

test('pull copies an added job, a changed one and a deletion, only inside the CMS paths', () => {
  const m = cmsManaged();
  put(m.clone, 'src/content/jobs/c.json', '{"title":"New job"}\n');
  put(m.clone, 'src/content/jobs/a.json', '{"title":"A2"}\n');
  rmSync(join(m.clone, 'src/content/jobs/b.json'));
  put(
    m.clone,
    'src/components/Hero.astro',
    '<h2>Edited in the repository</h2>\n',
  );
  commitIn(m.clone);
  const before = readFileSync(
    join(m.factory.site, 'src/components/Hero.astro'),
    'utf8',
  );
  const head = git(m.clone, 'rev-parse', 'HEAD');
  const r = pull(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /added +src\/content\/jobs\/c\.json/);
  assert.match(r.out, /changed +src\/content\/jobs\/a\.json/);
  assert.match(r.out, /deleted +src\/content\/jobs\/b\.json/);
  assert.match(r.out, /3 file\(s\) changed: 1 added, 1 changed, 1 deleted/);
  assert.deepEqual(
    readdirSync(join(m.factory.site, 'src/content/jobs')).sort(),
    ['a.json', 'c.json'],
  );
  assert.deepEqual(
    JSON.parse(
      readFileSync(join(m.factory.site, 'src/content/jobs/a.json'), 'utf8'),
    ),
    { title: 'A2' },
  );
  assert.equal(
    readFileSync(join(m.factory.site, 'src/components/Hero.astro'), 'utf8'),
    before,
  );
  assert.equal(git(m.clone, 'rev-parse', 'HEAD'), head);
  assert.equal(status(m.clone), '');
  // a second pull finds nothing to do
  assert.match(pull(m).out, /0 file\(s\) changed/);
});

test('pull formats what it writes with the factory Prettier and keeps the values', () => {
  const m = cmsManaged();
  put(
    m.clone,
    'src/content/jobs/c.json',
    cmsJson({ title: 'C', tags: ['x', 'y'] }),
  );
  put(m.clone, 'src/content/jobs/a.json', cmsJson({ title: 'A2' }));
  commitIn(m.clone);
  const r = pull(m);
  assert.equal(r.code, 0, r.out + r.err);
  const jobs = join(m.factory.site, 'src/content/jobs');
  assert.equal(
    prettierCheck(ROOT, join(jobs, 'c.json'), join(jobs, 'a.json')),
    true,
  );
  assert.deepEqual(JSON.parse(readFileSync(join(jobs, 'c.json'), 'utf8')), {
    title: 'C',
    tags: ['x', 'y'],
  });
  // pulling again finds nothing to do: the formatting alone is no change
  const again = pull(m);
  assert.match(again.out, /0 file\(s\) changed/);
});

test('pull --dry-run writes nothing for an unformatted file', () => {
  const m = cmsManaged();
  put(m.clone, 'src/content/jobs/c.json', cmsJson({ title: 'C' }));
  commitIn(m.clone);
  const r = pull(m, ['--dry-run']);
  assert.equal(r.code, 0, r.out + r.err);
  assert.equal(
    existsSync(join(m.factory.site, 'src/content/jobs/c.json')),
    false,
  );
});

test('pull --dry-run writes nothing; a pulled factory then syncs without a hint', () => {
  const m = cmsManaged();
  put(m.clone, 'src/content/jobs/c.json', '{"title":"New job"}\n');
  commitIn(m.clone);
  const dry = pull(m, ['--dry-run']);
  assert.equal(dry.code, 0, dry.out + dry.err);
  assert.match(dry.out, /would change/);
  assert.equal(
    existsSync(join(m.factory.site, 'src/content/jobs/c.json')),
    false,
  );
  assert.equal(pull(m).code, 0);
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.doesNotMatch(r.out, /managed by the CMS/);
});

test('pull refuses (exit 1, nothing written): no .pages.yml, no record, transferred, wrong origin, dirty clone', () => {
  // no .pages.yml
  const plain = managedFrom(makeFactory());
  const a = pull(plain);
  assert.equal(a.code, 1);
  assert.match(a.err, /does not use the Pages CMS/);

  const noRecord = cmsManaged();
  put(noRecord.clone, 'src/content/jobs/c.json', '{}\n');
  commitIn(noRecord.clone);
  rmSync(join(noRecord.factory.site, 'EXPORTED.json'));
  const b = pull(noRecord);
  assert.equal(b.code, 1);
  assert.match(b.err, /not exported/);
  assert.equal(
    existsSync(join(noRecord.factory.site, 'src/content/jobs/c.json')),
    false,
  );

  const moved = cmsManaged({
    record: {
      transferredTo: 'customer',
      transferredAt: '2026-10-27T10:00:00.000Z',
    },
  });
  put(moved.clone, 'src/content/jobs/c.json', '{}\n');
  commitIn(moved.clone);
  const c = pull(moved);
  assert.equal(c.code, 1);
  assert.match(c.err, /was transferred to customer/);
  assert.equal(
    existsSync(join(moved.factory.site, 'src/content/jobs/c.json')),
    false,
  );

  const other = cmsManaged();
  put(other.clone, 'src/content/jobs/c.json', '{}\n');
  commitIn(other.clone);
  git(
    other.clone,
    'remote',
    'set-url',
    'origin',
    'https://github.com/acme/other.git',
  );
  const d = pull(other);
  assert.equal(d.code, 1);
  assert.match(d.err, /github\.com\/acme\/other/);
  assert.match(d.err, /github\.com\/acme\/site/);
  assert.equal(
    existsSync(join(other.factory.site, 'src/content/jobs/c.json')),
    false,
  );

  const dirty = cmsManaged();
  put(dirty.clone, 'src/content/jobs/c.json', '{}\n');
  const e = pull(dirty);
  assert.equal(e.code, 1);
  assert.match(e.err, /uncommitted changes/);
  assert.equal(
    existsSync(join(dirty.factory.site, 'src/content/jobs/c.json')),
    false,
  );

  const folder = fresh('plain');
  mkdirSync(folder);
  const f = pull(cmsManaged(), [], folder);
  assert.equal(f.code, 1);
  assert.match(f.err, /not a git work tree/);
});

test('pull refuses an invalid .pages.yml in the factory', () => {
  const m = cmsManaged();
  put(m.factory.site, '.pages.yml', `${PAGES_YML}media:\n  input: x\n`);
  const r = pull(m);
  assert.equal(r.code, 1);
  assert.match(r.err, /not valid/);
});
