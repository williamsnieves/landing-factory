// Transfer of a managed landing to its customer: `handoff.mjs transfer-plan` (read-only checklist),
// `transfer.mjs record` (EXPORTED.json) and the refusals that follow in revise-landing.sh and sync-export.mjs.
// No network; fake secret values are built at runtime and must never appear in the output.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
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

import * as prettier from 'prettier';

import { main as handoffMain } from '../scripts/handoff.mjs';
import { main as syncMain } from '../scripts/sync-export.mjs';
import { main as transferMain } from '../scripts/transfer.mjs';
import { isTransferred } from '../scripts/lib/export-record.mjs';
import {
  ROOT,
  capture,
  randomToken,
  sharedConfig,
  vercelConfig,
  vpsConfig,
} from './deploy-helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'lf-transfer-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const put = (base, file, content) => {
  mkdirSync(dirname(join(base, file)), { recursive: true });
  writeFileSync(join(base, file), content);
};
const RECORD = {
  repository: 'https://github.com/owner/acme-site',
  exportedAt: '2026-10-27T00:00:00.000Z',
  factoryCommit: 'abc1234',
  target: 'vercel',
  noBrief: false,
};

function factory({
  config = vercelConfig(),
  site = 'https://example.com',
  record = RECORD,
  run = true,
} = {}) {
  const root = mkdtempSync(join(tmp, 'root-'));
  const dir = join(root, 'sites/acme');
  put(dir, 'package.json', JSON.stringify({ name: 'site-acme' }));
  put(dir, 'src/pages/index.astro', '---\n---\n<h1>Home</h1>\n');
  put(dir, 'astro.config.mjs', `export default { site: '${site}' };\n`);
  put(dir, 'site.config.json', JSON.stringify(config));
  if (run) put(dir, 'RUN.md', '# Run\n\nResult: passed\n');
  if (record) put(dir, 'EXPORTED.json', JSON.stringify(record));
  return { root, dir };
}

const plan = (root, extra = ['--to', 'customer']) => {
  const c = capture();
  const code = handoffMain(
    ['transfer-plan', '--site', 'acme', ...extra],
    c.io,
    root,
  );
  return { code, out: c.out.join('\n'), err: c.err.join('\n'), all: c.all() };
};
const record = (root, extra = ['--to', 'customer'], now) => {
  const c = capture();
  const code = transferMain(
    ['record', '--site', 'acme', ...extra],
    c.io,
    root,
    now,
  );
  return { code, out: c.out.join('\n'), err: c.err.join('\n') };
};
const tree = (dir, base = dir) =>
  readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? tree(join(dir, e.name), base)
        : [
            `${relative(base, join(dir, e.name))}:${readFileSync(join(dir, e.name), 'utf8')}`,
          ],
    )
    .sort();

// --- transfer-plan --------------------------------------------------------------------------------------------

test('transfer-plan names the transfer, the record, the secrets by name, the first run, the domain and the owner cleanup', () => {
  const { root } = factory();
  const r = plan(root);
  assert.equal(r.code, 0, r.all);
  for (const text of [
    '# Transfer plan: acme',
    'github.com/owner/acme-site',
    'Settings > General > Danger Zone > Transfer ownership',
    '`customer`',
    'The Claude GitHub App cannot do this',
    'node scripts/transfer.mjs record --site acme --to customer',
    '`VERCEL_TOKEN`',
    'Actions > CI > Run workflow',
    '`example.com`',
    'Project > Settings > Domains',
    'Cleanup by the owner',
    "owner's repository secrets",
    'Claude GitHub App access',
  ])
    assert.ok(r.out.includes(text), text);
});

test('transfer-plan follows the target: Cloudflare, VPS and shared name their own secrets', () => {
  const cloudflare = plan(
    factory({
      config: {
        cloudflare: { pagesProject: 'acme', productionBranch: 'main' },
      },
    }).root,
  ).out;
  assert.match(cloudflare, /`CLOUDFLARE_API_TOKEN`/);
  assert.match(cloudflare, /`CLOUDFLARE_ACCOUNT_ID`/);
  assert.match(cloudflare, /Custom domains/);
  assert.match(
    plan(factory({ config: vpsConfig() }).root).out,
    /`DEPLOY_SSH_KEY`/,
  );
  assert.match(
    plan(factory({ config: sharedConfig() }).root).out,
    /`DEPLOY_FTP_PASSWORD`|`DEPLOY_SSH_KEY`/,
  );
});

test('transfer-plan: fake secret values in the environment never appear', () => {
  const names = [
    'VERCEL_TOKEN',
    'DEPLOY_SSH_KEY',
    'CLOUDFLARE_API_TOKEN',
    'DEPLOY_FTP_PASSWORD',
  ];
  const values = names.map((name) => [name, randomToken('s3')]);
  const saved = { ...process.env };
  try {
    for (const [name, value] of values) process.env[name] = value;
    for (const config of [vercelConfig(), vpsConfig(), sharedConfig()]) {
      const { root } = factory({ config });
      const all = plan(root).all;
      for (const [, value] of values)
        assert.ok(!all.includes(value), 'a secret value was printed');
    }
  } finally {
    for (const name of names)
      if (name in saved) process.env[name] = saved[name];
      else delete process.env[name];
  }
});

test('transfer-plan refuses a site that is not exported or already transferred (exit 1) and changes no file', () => {
  const unexported = factory({ record: null });
  const a = plan(unexported.root);
  assert.equal(a.code, 1);
  assert.match(a.err, /no EXPORTED\.json/);
  const moved = factory({
    record: {
      ...RECORD,
      transferredTo: 'someone',
      transferredAt: '2026-10-27T00:00:00.000Z',
    },
  });
  const b = plan(moved.root);
  assert.equal(b.code, 1);
  assert.match(b.err, /already transferred to someone/);
  const missing = handoffMain(
    ['transfer-plan', '--site', 'ghost', '--to', 'x'],
    capture().io,
    unexported.root,
  );
  assert.equal(missing, 1);
  const { root } = factory();
  const before = tree(root);
  plan(root);
  assert.deepEqual(tree(root), before);
});

test('transfer-plan bad usage exits 2', () => {
  const { root } = factory();
  for (const extra of [
    [],
    ['--to', 'bad owner'],
    ['--to', '-lead'],
    ['--to', 'customer', '--repo', 'a/b'],
    ['--to', 'customer', '--json'],
    ['--to', 'customer', '--visibility', 'public'],
  ]) {
    const r = plan(root, extra);
    assert.equal(r.code, 2, extra.join(' '));
  }
  // --to belongs only to transfer-plan.
  const c = capture();
  assert.equal(
    handoffMain(['check', '--site', 'acme', '--to', 'x'], c.io, root),
    2,
  );
});

test('transfer-plan Markdown passes Prettier', async () => {
  for (const config of [vercelConfig(), vpsConfig(), sharedConfig()]) {
    const { root } = factory({ config });
    const out = plan(root).out;
    assert.equal(
      `${out}\n`,
      await prettier.format(`${out}\n`, { parser: 'markdown' }),
    );
  }
});

// --- record -----------------------------------------------------------------------------------------------------

test('record writes transferredTo, transferredAt and the new repository URL', () => {
  const { root, dir } = factory();
  const now = new Date('2026-11-02T09:30:00.000Z');
  const r = record(root, ['--to', 'customer'], now);
  assert.equal(r.code, 0, r.err);
  const data = JSON.parse(readFileSync(join(dir, 'EXPORTED.json'), 'utf8'));
  assert.equal(data.transferredTo, 'customer');
  assert.equal(data.transferredAt, '2026-11-02T09:30:00.000Z');
  assert.equal(data.repository, 'https://github.com/customer/acme-site');
  assert.equal(data.factoryCommit, 'abc1234');
  assert.equal(data.noBrief, false);
  assert.equal(isTransferred(data), true);
  // An explicit --repository wins.
  const other = factory();
  const o = record(other.root, [
    '--to',
    'customer',
    '--repository',
    'https://github.com/customer/landing',
  ]);
  assert.equal(o.code, 0, o.err);
  assert.equal(
    JSON.parse(readFileSync(join(other.dir, 'EXPORTED.json'), 'utf8'))
      .repository,
    'https://github.com/customer/landing',
  );
});

test('record refuses a site without the record or already transferred; bad usage exits 2', () => {
  const none = factory({ record: null });
  const a = record(none.root);
  assert.equal(a.code, 1);
  assert.match(a.err, /never exported/);
  const done = factory();
  assert.equal(record(done.root).code, 0);
  const again = record(done.root, ['--to', 'another']);
  assert.equal(again.code, 1);
  assert.match(again.err, /already transferred to customer/);
  assert.equal(
    JSON.parse(readFileSync(join(done.dir, 'EXPORTED.json'), 'utf8'))
      .transferredTo,
    'customer',
  );
  for (const extra of [
    [],
    ['--to', 'bad owner'],
    ['--to', 'customer', '--repository', 'http://github.com/customer/x'],
    ['--to', 'customer', '--repository', 'https://u:p@github.com/customer/x'],
    ['--to', 'customer', '--repository', 'nonsense'],
    ['--to', 'customer', '--repository', 'https://github.com/customer'],
  ]) {
    assert.equal(record(factory().root, extra).code, 2, extra.join(' '));
  }
  const c = capture();
  assert.equal(
    transferMain(['record', '--site', 'ghost', '--to', 'x'], c.io, none.root),
    2,
  );
});

// --- after the record -------------------------------------------------------------------------------------------

test('after record, revise-landing.sh and sync-export.mjs refuse the site', () => {
  const { root, dir } = factory();
  assert.equal(record(root).code, 0);

  const stubDir = mkdtempSync(join(tmp, 'bin-'));
  const marker = join(stubDir, 'claude-ran');
  writeFileSync(
    join(stubDir, 'claude'),
    `#!/usr/bin/env bash\ntouch "${marker}"\n`,
  );
  chmodSync(join(stubDir, 'claude'), 0o755);
  const feedback = join(stubDir, 'feedback.txt');
  writeFileSync(feedback, 'Shorten the heading.');
  const revise = spawnSync(
    'bash',
    [join(ROOT, 'scripts/revise-landing.sh'), 'acme', '--feedback', feedback],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${stubDir}:${process.env.PATH}`,
        LANDING_FACTORY_ROOT: root,
      },
    },
  );
  assert.equal(revise.status, 1, revise.stdout + revise.stderr);
  assert.match(revise.stderr, /was transferred to customer/);
  assert.throws(() => readFileSync(marker), 'claude was not started');

  const c = capture();
  const clone = mkdtempSync(join(tmp, 'clone-'));
  const code = syncMain(
    ['--root', root, '--site', 'acme', '--into', clone],
    c.io,
    { NODE_TEST_CONTEXT: 'child-v8' },
  );
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /was transferred to customer/);
  assert.ok(dir);
});

test('the landing-handoff skill covers the sync and the transfer phases', () => {
  const skill = readFileSync(
    join(ROOT, '.claude/skills/landing-handoff/SKILL.md'),
    'utf8',
  );
  for (const text of [
    'node scripts/sync-export.mjs --site <slug> --into <clone>',
    '--dry-run',
    '`--brief`',
    '`--no-brief`',
    'Sync after a revision',
    'Transfer to the customer',
    'node scripts/handoff.mjs transfer-plan --site <slug> --to <github-owner>',
    'node scripts/transfer.mjs record --site <slug> --to <github-owner>',
    'Never force-push',
    'Result: needs-rebuild',
  ])
    assert.ok(skill.includes(text), text);
});
