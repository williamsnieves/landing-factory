// scripts/sync-export.mjs against a fixture factory and a local bare git repository as origin. No network, no
// real sites/: exports run offline (the lockfile step is skipped with --no-lockfile or never needed), and the
// clone's origin URL is the recorded https URL while a local bare repository stands behind it.
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
function managed({ record = {}, brief = true } = {}) {
  const factory = makeFactory();
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
const status = (clone) => git(clone, 'status', '--porcelain').trim();

test('an unchanged site changes nothing: the lockfile and the README export line do not count', () => {
  const m = managed();
  const before = listFiles(m.clone);
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /0 file\(s\) changed/);
  assert.match(r.out, /kept +package-lock\.json \(package\.json unchanged\)/);
  assert.equal(status(m.clone), '');
  assert.deepEqual(listFiles(m.clone), before);
});

test('a revised copy reaches the clone: one changed file, lockfile and README stay', () => {
  const m = managed();
  put(m.factory.site, 'src/components/Hero.astro', '<h2>Hello there</h2>\n');
  // A later export carries another date and commit on the README's export line.
  const readme = join(m.clone, 'README.md');
  writeFileSync(
    readme,
    readFileSync(readme, 'utf8').replace(
      /exported from landing-factory on \S+/,
      'exported from landing-factory on 2020-01-01',
    ),
  );
  git(m.clone, 'commit', '-am', 'older export line');
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /changed +src\/components\/Hero\.astro/);
  assert.match(r.out, /kept +README\.md \(only the export line differs\)/);
  assert.match(r.out, /1 file\(s\) changed: 0 added, 1 changed, 0 deleted/);
  assert.equal(
    readFileSync(join(m.clone, 'src/components/Hero.astro'), 'utf8').trim(),
    '<h2>Hello there</h2>',
  );
  assert.match(readFileSync(readme, 'utf8'), /on 2020-01-01/);
  assert.equal(status(m.clone), 'M src/components/Hero.astro');
});

test('add, change and delete are mirrored; nothing is committed', () => {
  const m = managed();
  put(m.factory.site, 'src/components/New.astro', '<p>new</p>\n');
  put(m.factory.site, 'src/components/Hero.astro', '<h2>Changed</h2>\n');
  rmSync(join(m.factory.site, 'src/components/Old.astro'));
  const head = git(m.clone, 'rev-parse', 'HEAD');
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /added +src\/components\/New\.astro/);
  assert.match(r.out, /changed +src\/components\/Hero\.astro/);
  assert.match(r.out, /deleted +src\/components\/Old\.astro/);
  assert.match(r.out, /3 file\(s\) changed: 1 added, 1 changed, 1 deleted/);
  assert.equal(existsSync(join(m.clone, 'src/components/Old.astro')), false);
  assert.equal(existsSync(join(m.clone, 'src/components/New.astro')), true);
  assert.equal(git(m.clone, 'rev-parse', 'HEAD'), head);
  assert.match(r.out, /Nothing was committed or pushed/);
});

test('.git and git-ignored paths are untouched; an ignored fresh file is not added', () => {
  const m = managed();
  mkdirSync(join(m.clone, 'node_modules/x'), { recursive: true });
  writeFileSync(join(m.clone, 'node_modules/x/index.js'), 'keep');
  writeFileSync(join(m.clone, '.env'), 'SECRET=1');
  put(m.factory.site, 'src/components/Hero.astro', '<h2>Changed</h2>\n');
  // The site now ships a file the clone's .gitignore ignores (/qa/ is ignored in exported repositories).
  put(m.factory.site, 'public/qa/note.txt', 'x');
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.equal(readFileSync(join(m.clone, '.env'), 'utf8'), 'SECRET=1');
  assert.equal(
    readFileSync(join(m.clone, 'node_modules/x/index.js'), 'utf8'),
    'keep',
  );
  assert.ok(existsSync(join(m.clone, '.git')));
  assert.equal(status(m.clone), 'M src/components/Hero.astro');
});

test('the lockfile is regenerated only when package.json changed (skipped, with a warning, offline)', () => {
  const m = managed();
  writeFileSync(
    join(m.factory.root, 'package-lock.json'),
    JSON.stringify(lock('3.16.0')),
  );
  const dry = sync(m, ['--dry-run']);
  assert.equal(dry.code, 0, dry.out + dry.err);
  assert.match(dry.out, /changed +package\.json/);
  assert.match(dry.out, /would be regenerated/);
  assert.equal(status(m.clone), '');
  const r = sync(m);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /changed +package\.json/);
  assert.match(r.out, /NOT regenerated \(--no-lockfile\)/);
  assert.equal(status(m.clone), 'M package.json');
  assert.match(readFileSync(join(m.clone, 'package.json'), 'utf8'), /3\.16\.0/);
});

test('--dry-run lists the changes and writes nothing', () => {
  const m = managed();
  put(m.factory.site, 'src/components/New.astro', '<p>new</p>\n');
  const before = listFiles(m.clone);
  const r = sync(m, ['--dry-run']);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /added +src\/components\/New\.astro/);
  assert.match(r.out, /Nothing was written/);
  assert.deepEqual(listFiles(m.clone), before);
  assert.equal(status(m.clone), '');
});

test('refusals: no record, transferred, wrong origin, dirty clone, not a work tree root; nothing is written', () => {
  const noRecord = managed();
  rmSync(join(noRecord.factory.site, 'EXPORTED.json'));
  put(noRecord.factory.site, 'src/components/Hero.astro', '<h2>X</h2>\n');
  const a = sync(noRecord);
  assert.equal(a.code, 1);
  assert.match(a.err, /not exported/);
  assert.equal(status(noRecord.clone), '');

  const moved = managed({
    record: {
      transferredTo: 'customer',
      transferredAt: '2026-10-27T10:00:00.000Z',
    },
  });
  put(moved.factory.site, 'src/components/Hero.astro', '<h2>X</h2>\n');
  const b = sync(moved);
  assert.equal(b.code, 1);
  assert.match(b.err, /was transferred to customer/);
  assert.equal(status(moved.clone), '');

  const other = managed();
  git(
    other.clone,
    'remote',
    'set-url',
    'origin',
    'https://github.com/acme/other.git',
  );
  put(other.factory.site, 'src/components/Hero.astro', '<h2>X</h2>\n');
  const c = sync(other);
  assert.equal(c.code, 1);
  assert.match(c.err, /github\.com\/acme\/other/);
  assert.match(c.err, /github\.com\/acme\/site/);
  assert.equal(status(other.clone), '');

  const dirty = managed();
  writeFileSync(join(dirty.clone, 'src/components/Hero.astro'), 'local edit\n');
  put(dirty.factory.site, 'src/components/Hero.astro', '<h2>X</h2>\n');
  const d = sync(dirty);
  assert.equal(d.code, 1);
  assert.match(d.err, /uncommitted changes/);
  assert.match(
    d.err,
    new RegExp(dirty.clone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  assert.equal(
    readFileSync(join(dirty.clone, 'src/components/Hero.astro'), 'utf8'),
    'local edit\n',
  );

  const plain = managed();
  const folder = fresh('plain');
  mkdirSync(folder);
  const e = sync({ ...plain, clone: folder });
  assert.equal(e.code, 1);
  assert.match(e.err, /not a git work tree/);
  const sub = sync({ ...plain, clone: join(plain.clone, 'src') });
  assert.equal(sub.code, 1);
  assert.match(sub.err, /not the root of its work tree/);
});

test('a record without noBrief needs --brief or --no-brief (exit 2); --no-brief never writes brief.json', () => {
  const m = managed();
  const recordFile = join(m.factory.site, 'EXPORTED.json');
  const record = JSON.parse(readFileSync(recordFile, 'utf8'));
  delete record.noBrief;
  writeFileSync(recordFile, JSON.stringify(record));
  const none = sync(m);
  assert.equal(none.code, 2);
  assert.match(none.err, /--brief .* --no-brief/);

  const both = sync(m, ['--brief', '--no-brief']);
  assert.equal(both.code, 2);

  // The clone tracks brief.json (private export); --no-brief removes it and says so.
  assert.ok(existsSync(join(m.clone, 'brief.json')));
  const r = sync(m, ['--no-brief']);
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /deleted +brief\.json/);
  assert.match(r.out, /warning: brief\.json is deleted/);

  // And a clone that never had it never gets it.
  const pub = managed({ brief: false });
  put(pub.factory.site, 'src/components/Hero.astro', '<h2>X</h2>\n');
  const p = sync(pub);
  assert.equal(p.code, 0, p.out + p.err);
  assert.equal(existsSync(join(pub.clone, 'brief.json')), false);
  git(pub.clone, 'commit', '-am', 'revision');
  const withFlag = sync(pub, ['--no-brief']);
  assert.equal(withFlag.code, 0);
  assert.equal(existsSync(join(pub.clone, 'brief.json')), false);
});

test('usage errors exit 2: bad slug, missing site, missing arguments, --root outside tests', () => {
  const m = managed();
  for (const argv of [
    ['--site', 'Bad_Slug', '--into', m.clone],
    ['--site', 'nosuch', '--into', m.clone],
    ['--site', 'acme'],
    ['--into', m.clone],
    ['--site', 'acme', '--into', m.clone, '--nope'],
  ]) {
    const c = capture();
    assert.equal(
      syncMain(['--root', m.factory.root, ...argv], c.io, env),
      2,
      argv.join(' '),
    );
  }
  const c = capture();
  assert.equal(
    syncMain(
      ['--root', m.factory.root, '--site', 'acme', '--into', m.clone],
      c.io,
      {},
    ),
    2,
  );
  assert.match(c.err.join('\n'), /only available to tests/);
});

test('a revised copy can be committed and pushed from the clone to the origin behind it', () => {
  const m = managed();
  put(m.factory.site, 'src/components/Hero.astro', '<h2>Pushed</h2>\n');
  assert.equal(sync(m).code, 0);
  git(m.clone, 'checkout', '-b', 'revise/1');
  git(m.clone, 'add', '-A');
  git(m.clone, 'commit', '-m', 'revision 1');
  git(m.clone, 'push', 'origin', 'revise/1');
  assert.match(git(m.bare, 'branch', '--list', 'revise/1'), /revise\/1/);
});
