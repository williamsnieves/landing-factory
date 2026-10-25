// The rsync adapters: exact argv plans, path safety, and real rsync from one local folder to another
// (a test-only local transport replaces ssh; the CLI never offers it). The FTPS plan is unit-tested only.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { ConfigError, resolveConfig } from '../scripts/deploy/config.mjs';
import {
  PlainFtpRefused,
  lftpScript,
  planFtps,
} from '../scripts/deploy/ftps.mjs';
import {
  displayArgv,
  planRollback,
  planShared,
  planVps,
  releaseId,
  sshOptions,
  sshTransport,
} from '../scripts/deploy/rsync.mjs';
import { main } from '../scripts/deploy.mjs';
import {
  CI_ENV,
  capture,
  fakePrivateKey,
  makeDist,
  makeRoot,
  randomToken,
  scratch,
  sharedConfig,
  vpsConfig,
} from './deploy-helpers.mjs';

const KEY = '/tmp/k/id';
const KNOWN = '/tmp/k/known_hosts';
const ssh = (section) =>
  sshTransport({ ...section, keyPath: KEY, knownHostsPath: KNOWN });
const OPTIONS = [
  '-F',
  '/dev/null',
  '-i',
  KEY,
  '-p',
  '22',
  '-o',
  'IdentitiesOnly=yes',
  '-o',
  `UserKnownHostsFile=${KNOWN}`,
  '-o',
  'GlobalKnownHostsFile=/dev/null',
  '-o',
  'StrictHostKeyChecking=yes',
  '-o',
  'BatchMode=yes',
  '-o',
  'ConnectTimeout=20',
];
const ID = '20261024T101500Z-abc1234';

test('rsync and ssh are installed (apt-get install -y rsync openssh-client)', () => {
  for (const tool of ['rsync', 'ssh'])
    try {
      execFileSync(tool, tool === 'ssh' ? ['-V'] : ['--version'], {
        stdio: 'ignore',
      });
    } catch {
      assert.fail(
        `${tool} is not installed: run apt-get install -y rsync openssh-client`,
      );
    }
});

test('ssh options pin the host key, never relax checking, and ignore the user configuration', () => {
  const options = sshOptions({ keyPath: KEY, knownHostsPath: KNOWN, port: 22 });
  assert.deepEqual(options, OPTIONS);
  const text = options.join(' ');
  assert.match(text, /StrictHostKeyChecking=yes/);
  assert.ok(!/StrictHostKeyChecking=(no|accept-new|ask)/.test(text));
  assert.ok(!/UserKnownHostsFile=\/dev\/null/.test(text));
});

test('VPS plan: exact argv for upload, atomic switch and pruning', () => {
  const vps = resolveConfig(vpsConfig()).vps;
  const steps = planVps({
    vps,
    dist: '/work/dist',
    id: ID,
    transport: ssh(vps),
  });
  assert.deepEqual(
    steps.map((s) => s.id),
    ['prepare', 'upload', 'switch'],
  );
  assert.deepEqual(steps[0].argv, [
    'ssh',
    ...OPTIONS,
    'deploy@203.0.113.10',
    'mkdir -p /var/www/acme/releases',
  ]);
  assert.deepEqual(steps[1].argv, [
    'rsync',
    '-az',
    '--delete',
    '--chmod=D755,F644',
    '--link-dest=/var/www/acme/current/',
    '-e',
    `ssh ${OPTIONS.join(' ')}`,
    '/work/dist/',
    `deploy@203.0.113.10:/var/www/acme/releases/${ID}/`,
  ]);
  assert.deepEqual(steps[1].onFail, [
    'ssh',
    ...OPTIONS,
    'deploy@203.0.113.10',
    `rm -rf -- /var/www/acme/releases/${ID}`,
  ]);
  assert.deepEqual(steps[2].argv.slice(0, -1), [
    'ssh',
    ...OPTIONS,
    'deploy@203.0.113.10',
  ]);
  const script = steps[2].argv.at(-1);
  assert.match(
    script,
    /^set -eu\ncd \/var\/www\/acme\nln -sfn releases\/20261024T101500Z-abc1234 current\.tmp\nmv -Tf current\.tmp current\n/,
  );
  assert.match(script, /tail -n \+6 /, 'keeps the last 5');
  assert.match(
    script,
    /\[ "\$old" = "\$now" \] \|\| rm -rf -- "releases\/\$old"/,
  );
  // The pruning loop only ever names entries of releases/ that match the release id pattern.
  assert.match(
    script,
    /grep -E '\^\[0-9\]\{8\}T\[0-9\]\{6\}Z-\[0-9a-f\]\{7\}\$'/,
  );
});

test('VPS plan: keep is configurable and the rollback script goes to the previous release', () => {
  const vps = resolveConfig(vpsConfig({ keep: 3 })).vps;
  const script = planVps({
    vps,
    dist: '/d',
    id: ID,
    transport: ssh(vps),
  })[2].argv.at(-1);
  assert.match(script, /tail -n \+4 /);
  const rollback = planRollback({ vps, transport: ssh(vps) })[0];
  assert.equal(rollback.capture, true);
  assert.match(rollback.argv.at(-1), /awk -v c="\$cur" '\$0 < c'/);
  assert.match(rollback.argv.at(-1), /mv -Tf current\.tmp current/);
});

test('shared plan: delay-updates, delete-after, well-known kept, exact argv', () => {
  const shared = resolveConfig(sharedConfig({ port: 65002 })).shared;
  const transport = sshTransport({
    ...shared,
    keyPath: KEY,
    knownHostsPath: KNOWN,
  });
  const [step] = planShared({ shared, staging: '/tmp/s/staging', transport });
  const options = OPTIONS.map((o) => (o === '22' ? '65002' : o));
  assert.deepEqual(step.argv, [
    'rsync',
    '-az',
    '--delete-after',
    '--delay-updates',
    '--chmod=D755,F644',
    '--exclude=/.well-known/',
    '-e',
    `ssh ${options.join(' ')}`,
    '/tmp/s/staging/',
    'u123456789@srv123.hstgr.io:domains/acme.example/public_html/',
  ]);
});

test('path validation refuses unsafe deploy folders in the plans too', () => {
  const vps = resolveConfig(vpsConfig()).vps;
  const shared = resolveConfig(sharedConfig()).shared;
  for (const path of [
    '/',
    '',
    '~',
    '/var',
    '/var/www/a b',
    '/var/www/a;id',
    '/var/www/$(id)',
    '/var/../etc',
  ])
    assert.throws(
      () =>
        planVps({
          vps: { ...vps, path },
          dist: '/d',
          id: ID,
          transport: ssh(vps),
        }),
      ConfigError,
      path,
    );
  for (const path of [
    '/',
    '',
    '~',
    'public_html/../..',
    'domains/x/private',
    'domains/x/public_html;id',
  ])
    assert.throws(
      () =>
        planShared({
          shared: { ...shared, path },
          staging: '/s',
          transport: ssh(shared),
        }),
      ConfigError,
      path,
    );
  assert.doesNotThrow(() =>
    planShared({
      shared: {
        ...shared,
        path: 'sites/x/htdocs',
        allowPath: ['sites/x/htdocs'],
      },
      staging: '/s',
      transport: ssh(shared),
    }),
  );
  assert.throws(
    () =>
      planVps({ vps, dist: '/d', id: 'not-a-release', transport: ssh(vps) }),
    /release id/,
  );
});

test('release ids sort by time and carry the commit', () => {
  assert.equal(
    releaseId(new Date('2026-10-24T10:15:00Z'), 'ABCDEF0123456'),
    '20261024T101500Z-abcdef0',
  );
  assert.equal(
    releaseId(new Date('2026-10-24T10:15:00Z'), ''),
    '20261024T101500Z-0000000',
  );
});

test('displayArgv quotes only what needs it', () => {
  assert.equal(displayArgv(['rsync', '-az', 'a b']), "rsync -az 'a b'");
});

test('FTPS plan: TLS forced, certificate verified, password only through the environment', () => {
  const raw = sharedConfig({ protocol: 'ftps', port: undefined });
  delete raw.shared.hostKey;
  const shared = resolveConfig(raw).shared;
  const [step] = planFtps({ shared, staging: '/tmp/s/staging' });
  assert.equal(step.argv[0], 'lftp');
  assert.ok(step.argv.includes('--env-password'));
  assert.deepEqual(step.envFrom, { LFTP_PASSWORD: 'DEPLOY_FTP_PASSWORD' });
  assert.equal(step.argv.at(-1), 'ftp://srv123.hstgr.io:21');
  assert.deepEqual(step.argv.slice(-3, -1), ['-u', 'u123456789']);
  const script = lftpScript({ shared, staging: '/tmp/s/staging' });
  for (const setting of [
    'set ftp:ssl-force true',
    'set ftp:ssl-protect-data true',
    'set ssl:verify-certificate true',
  ])
    assert.ok(script.includes(setting), setting);
  assert.ok(
    !/ssl-allow false|verify-certificate false|ssl-force false/.test(script),
  );
  assert.match(
    script,
    /mirror --reverse --delete .*"\/tmp\/s\/staging" "domains\/acme\.example\/public_html"/,
  );
  assert.ok(
    !step.argv.join(' ').includes(','),
    'no user,password pair in argv',
  );
  assert.throws(
    () => planFtps({ shared: { ...shared, protocol: 'ftp' }, staging: '/s' }),
    PlainFtpRefused,
  );
});

// --- real rsync, local folders ---------------------------------------------------------------

function realRsync() {
  return execFileSync('which', ['rsync'], { encoding: 'utf8' }).trim();
}

async function deployVps({
  site,
  serverRoot,
  minute = 0,
  extraDeps = {},
  branch = 'main',
  args = [],
  env = {},
}) {
  const c = capture();
  const key = fakePrivateKey();
  const tmpBase = scratch('tmpbase');
  const code = await main(
    ['--site', 'acme', '--branch', branch, ...args],
    c.io,
    {
      root: site.root,
      localRoot: serverRoot,
      tmpBase,
      now: new Date(Date.UTC(2026, 9, 24, 10, minute, 0)),
      env: { ...CI_ENV, DEPLOY_SSH_KEY: key, ...env },
      ...extraDeps,
    },
  );
  return { code, c, key, tmpBase };
}

const releases = (serverRoot) =>
  readdirSync(join(serverRoot, 'var/www/acme/releases')).sort();
const current = (serverRoot) =>
  readlinkSync(join(serverRoot, 'var/www/acme/current'));

test('VPS deploy: release folder, atomic current symlink, key folder removed, no secret printed', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const serverRoot = scratch('server');
  const { code, c, key, tmpBase } = await deployVps({ site, serverRoot });
  assert.equal(code, 0, c.all());
  const [id] = releases(serverRoot);
  assert.match(id, /^20261024T100000Z-abcdef0$/);
  assert.equal(current(serverRoot), `releases/${id}`);
  const base = join(serverRoot, 'var/www/acme');
  assert.ok(lstatSync(join(base, 'current')).isSymbolicLink());
  assert.equal(
    readFileSync(join(base, 'current/index.html'), 'utf8'),
    readFileSync(join(site.dist, 'index.html'), 'utf8'),
  );
  assert.ok(existsSync(join(base, 'current/_astro/app.abc123.js')));
  assert.ok(!existsSync(join(base, 'current.tmp')));
  assert.deepEqual(JSON.parse(c.out.at(-1)), {
    target: 'vps',
    environment: 'production',
    url: 'https://acme.example',
    release: id,
  });
  // The temporary key folder is gone, and the key never reached the output.
  assert.deepEqual(readdirSync(tmpBase), []);
  for (const line of key.split('\n').filter((l) => l.length > 8))
    assert.ok(!c.all().includes(line));
});

test('VPS deploy keeps the last 5 releases, links unchanged files, and rolls back one release at a time', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const serverRoot = scratch('server');
  for (let minute = 0; minute < 7; minute += 1) {
    if (minute === 5)
      writeFileSync(join(site.dist, 'index.html'), '<h1>changed</h1>');
    const { code, c } = await deployVps({ site, serverRoot, minute });
    assert.equal(code, 0, c.all());
  }
  const all = releases(serverRoot);
  assert.equal(all.length, 5);
  assert.equal(
    all[0],
    '20261024T100200Z-abcdef0',
    'the two oldest were pruned',
  );
  assert.equal(current(serverRoot), `releases/${all.at(-1)}`);
  // Unchanged files are hard links to the previous release; the changed one is not.
  const file = (id, name) =>
    statSync(join(serverRoot, 'var/www/acme/releases', id, name));
  assert.equal(file(all[3], '404.html').ino, file(all[4], '404.html').ino);
  assert.notEqual(
    file(all[2], 'index.html').ino,
    file(all[3], 'index.html').ino,
  );

  const rollback = await deployVps({
    site,
    serverRoot,
    minute: 8,
    args: ['--rollback'],
  });
  assert.equal(rollback.code, 0, rollback.c.all());
  assert.equal(current(serverRoot), `releases/${all[3]}`);
  assert.equal(JSON.parse(rollback.c.out.at(-1)).release, all[3]);
  const again = await deployVps({
    site,
    serverRoot,
    minute: 9,
    args: ['--rollback'],
  });
  assert.equal(current(serverRoot), `releases/${all[2]}`, again.c.all());
  assert.ok(
    !readFileSync(
      join(serverRoot, 'var/www/acme/current/index.html'),
      'utf8',
    ).includes('changed'),
  );
  assert.deepEqual(
    releases(serverRoot),
    all,
    'rollback does not delete releases',
  );
});

test('rollback with a single release exits 1 and leaves current alone', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const serverRoot = scratch('server');
  await deployVps({ site, serverRoot });
  const before = current(serverRoot);
  const { code, c } = await deployVps({
    site,
    serverRoot,
    minute: 3,
    args: ['--rollback'],
  });
  assert.equal(code, 1);
  assert.match(c.all(), /no previous release/);
  assert.equal(current(serverRoot), before);
});

test('an interrupted upload leaves current on the previous release and removes the half release', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const serverRoot = scratch('server');
  assert.equal((await deployVps({ site, serverRoot })).code, 0);
  const before = current(serverRoot);
  // A wrapper that uploads part of the build, then reports rsync's "partial transfer" exit code.
  const wrapper = join(scratch('bin'), 'rsync');
  writeFileSync(
    wrapper,
    `#!/bin/sh\n${realRsync()} --exclude='*.css' "$@"\nexit 23\n`,
  );
  chmodSync(wrapper, 0o755);
  const { code, c } = await deployVps({
    site,
    serverRoot,
    minute: 1,
    extraDeps: { bins: { rsync: wrapper } },
  });
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /step "upload" failed with exit code 23/);
  assert.equal(current(serverRoot), before);
  assert.deepEqual(
    releases(serverRoot),
    [before.replace('releases/', '')],
    'the half release was removed',
  );
});

test('a missing rsync fails with an install hint and changes nothing', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const serverRoot = scratch('server');
  const { code, c, tmpBase } = await deployVps({
    site,
    serverRoot,
    extraDeps: { bins: { rsync: '/nonexistent/rsync' } },
  });
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /install it: apt-get install -y rsync/);
  assert.equal(existsSync(join(serverRoot, 'var/www/acme/current')), false);
  assert.deepEqual(readdirSync(tmpBase), []);
});

test('VPS deploys publish from the production branch only', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const serverRoot = scratch('server');
  const { code, c } = await deployVps({ site, serverRoot, branch: 'change/x' });
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /publish from main only/);
  assert.equal(existsSync(join(serverRoot, 'var')), false);
});

test('the key is validated before anything is touched', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const serverRoot = scratch('server');
  const missing = await deployVps({
    site,
    serverRoot,
    env: { DEPLOY_SSH_KEY: '' },
  });
  assert.equal(missing.code, 2);
  assert.match(missing.c.err.join('\n'), /DEPLOY_SSH_KEY is not set/);
  const bad = randomToken('not-a-key');
  const wrong = await deployVps({
    site,
    serverRoot,
    env: { DEPLOY_SSH_KEY: bad },
  });
  assert.equal(wrong.code, 2);
  assert.ok(!wrong.c.all().includes(bad));
  assert.equal(existsSync(join(serverRoot, 'var')), false);
});

test('the local transport is for tests only: it is refused without the test context', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const serverRoot = scratch('server');
  const env = { ...CI_ENV, DEPLOY_SSH_KEY: fakePrivateKey() };
  delete env.NODE_TEST_CONTEXT;
  const c = capture();
  const code = await main(['--site', 'acme', '--branch', 'main'], c.io, {
    root: site.root,
    localRoot: serverRoot,
    env,
  });
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /tests only/);
  assert.equal(existsSync(join(serverRoot, 'var')), false);
});

test('a "transport" setting in site.config.json is rejected as unknown', async () => {
  const site = makeRoot({ config: vpsConfig({ transport: 'local' }) });
  const c = capture();
  const code = await main(['--site', 'acme', '--dry-run'], c.io, {
    root: site.root,
    env: {},
  });
  assert.equal(code, 2);
  assert.match(c.err.join('\n'), /vps\.transport/);
});

test('shared hosting: build replaces the document root with delete-after, .htaccess in place, .well-known kept', async () => {
  const site = makeRoot({ config: sharedConfig() });
  const serverRoot = scratch('server');
  const docRoot = join(serverRoot, 'domains/acme.example/public_html');
  mkdirSync(join(docRoot, '.well-known'), { recursive: true });
  mkdirSync(join(docRoot, 'old'), { recursive: true });
  writeFileSync(join(docRoot, 'stale.html'), 'stale');
  writeFileSync(join(docRoot, 'old/page.html'), 'old');
  writeFileSync(join(docRoot, '.well-known/acme-challenge'), 'token');
  const c = capture();
  const key = fakePrivateKey();
  const tmpBase = scratch('tmpbase');
  // Shared hosting resolves its path inside the document root of the fake server.
  const code = await main(['--site', 'acme', '--branch', 'main'], c.io, {
    root: site.root,
    localRoot: serverRoot,
    tmpBase,
    env: { ...CI_ENV, DEPLOY_SSH_KEY: key },
  });
  assert.equal(code, 0, c.all());
  assert.equal(
    readFileSync(join(docRoot, 'index.html'), 'utf8'),
    readFileSync(join(site.dist, 'index.html'), 'utf8'),
  );
  assert.ok(
    !existsSync(join(docRoot, 'stale.html')),
    'files that are not in the build are removed',
  );
  assert.ok(!existsSync(join(docRoot, 'old')), 'including folders');
  assert.equal(
    readFileSync(join(docRoot, '.well-known/acme-challenge'), 'utf8'),
    'token',
  );
  const htaccess = readFileSync(join(docRoot, '.htaccess'), 'utf8');
  assert.match(htaccess, /ErrorDocument 404 \/404\.html/);
  assert.match(htaccess, /Header always set Strict-Transport-Security/);
  assert.deepEqual(JSON.parse(c.out.at(-1)), {
    target: 'shared',
    environment: 'production',
    url: 'https://acme.example',
  });
  assert.deepEqual(
    readdirSync(tmpBase),
    [],
    'the staging and key folder is removed',
  );
  assert.ok(
    !existsSync(join(site.dist, '.htaccess')),
    'the build folder itself is not changed',
  );
});

test('shared hosting refuses a document root outside public_html before connecting', async () => {
  const site = makeRoot({
    config: sharedConfig({ path: 'domains/acme.example/everything' }),
  });
  const c = capture();
  const code = await main(['--site', 'acme', '--dry-run'], c.io, {
    root: site.root,
    env: {},
  });
  assert.equal(code, 2);
  assert.match(c.err.join('\n'), /shared\.path/);
});

test('shared hosting over FTPS asks for the password and reports a missing lftp', async () => {
  const raw = sharedConfig({ protocol: 'ftps', port: undefined });
  delete raw.shared.hostKey;
  const site = makeRoot({ config: raw });
  const c1 = capture();
  assert.equal(
    await main(['--site', 'acme', '--branch', 'main'], c1.io, {
      root: site.root,
      env: { ...CI_ENV },
    }),
    2,
  );
  assert.match(c1.err.join('\n'), /DEPLOY_FTP_PASSWORD is not set/);
  const password = randomToken('pw');
  const c2 = capture();
  const code = await main(['--site', 'acme', '--branch', 'main'], c2.io, {
    root: site.root,
    env: { ...CI_ENV, DEPLOY_FTP_PASSWORD: password },
    bins: { lftp: '/nonexistent/lftp' },
  });
  assert.equal(code, 1);
  assert.ok(!c2.all().includes(password));
});

test('the exec hook receives the password through the environment, never argv', async () => {
  const raw = sharedConfig({ protocol: 'ftps', port: undefined });
  delete raw.shared.hostKey;
  const site = makeRoot({ config: raw });
  const password = randomToken('pw');
  const calls = [];
  const c = capture();
  const code = await main(['--site', 'acme', '--branch', 'main'], c.io, {
    root: site.root,
    env: { ...CI_ENV, DEPLOY_FTP_PASSWORD: password },
    exec: async (argv, { env }) => {
      calls.push({ argv, env });
      return { code: 0, stdout: '', stderr: '' };
    },
  });
  assert.equal(code, 0, c.all());
  assert.equal(calls.length, 1);
  assert.equal(calls[0].env.LFTP_PASSWORD, password);
  assert.ok(!JSON.stringify(calls[0].argv).includes(password));
  assert.match(calls[0].argv.at(-3), /^-u$/);
  assert.ok(!c.all().includes(password));
});

test('makeDist is deterministic for the helpers', () => {
  const dir = makeDist(scratch('dist'));
  assert.ok(existsSync(join(dir, '_headers')));
});
