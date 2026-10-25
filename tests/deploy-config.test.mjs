// scripts/deploy/config.mjs: the target per site, defaults, validation and the CI dispatch.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  ConfigError,
  applyBriefTarget,
  checkRemotePath,
  dispatch,
  githubOutputLines,
  loadSiteConfig,
  main,
  mapBriefTarget,
  resolveConfig,
} from '../scripts/deploy/config.mjs';
import {
  ROOT,
  capture,
  fakeHostKey,
  makeRoot,
  scratch,
  sharedConfig,
  vercelConfig,
  vpsConfig,
} from './deploy-helpers.mjs';

const fails = (raw, field) =>
  assert.throws(
    () => resolveConfig(raw),
    (error) =>
      error instanceof ConfigError &&
      error.field === field &&
      error.message.includes(field),
    `expected ${field} to be named`,
  );

test('a configuration without target means cloudflare', () => {
  const config = resolveConfig({
    cloudflare: { pagesProject: 'acme', productionBranch: 'main' },
  });
  assert.equal(config.target, 'cloudflare');
  assert.equal(config.previews, 'native');
  assert.deepEqual(config.cloudflare, {
    pagesProject: 'acme',
    productionBranch: 'main',
  });
});

test('the root and every existing site configuration still validate as cloudflare', () => {
  const slugs = readdirSync(join(ROOT, 'sites'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  assert.ok(slugs.length >= 7);
  for (const slug of ['', ...slugs]) {
    const config = loadSiteConfig(ROOT, slug);
    assert.equal(config.target, 'cloudflare', slug || 'root');
    assert.equal(dispatch(config, 'change/x').deployVia, 'wrangler');
  }
});

test('an unknown target or setting stops with the field named', () => {
  fails({ target: 'netlify', cloudflare: {} }, 'target');
  fails({ cloudflare: { pagesProject: 'a' }, extra: 1 }, 'extra');
  fails(
    { cloudflare: { pagesProject: 'a', surprise: true } },
    'cloudflare.surprise',
  );
  fails({}, 'cloudflare');
  fails(
    { cloudflare: { productionBranch: 'main' } },
    'cloudflare.pagesProject',
  );
  fails([], '(file)');
});

test('vercel: project is required, team optional, previews native only', () => {
  const config = resolveConfig(vercelConfig());
  assert.equal(config.vercel.project, 'acme');
  assert.equal(config.vercel.team, 'team_abc123');
  assert.equal(
    resolveConfig({ target: 'vercel', vercel: { project: 'acme' } }).vercel
      .team,
    undefined,
  );
  fails({ target: 'vercel' }, 'vercel');
  fails({ target: 'vercel', vercel: {} }, 'vercel.project');
  fails({ ...vercelConfig(), previews: 'none' }, 'previews');
});

test('vps: every required field is named when missing', () => {
  const ok = resolveConfig(vpsConfig());
  assert.equal(ok.vps.port, 22);
  assert.equal(ok.vps.keep, 5);
  assert.equal(ok.previews, 'cloudflare');
  for (const field of ['host', 'user', 'path', 'hostKey', 'url']) {
    const raw = vpsConfig();
    delete raw.vps[field];
    fails(raw, `vps.${field}`);
  }
  fails({ target: 'vps' }, 'vps');
});

test('vps without a pinned host key never gets as far as connecting', () => {
  const raw = vpsConfig();
  delete raw.vps.hostKey;
  fails(raw, 'vps.hostKey');
  fails(vpsConfig({ hostKey: 'not a known hosts line' }), 'vps.hostKey');
  fails(vpsConfig({ hostKey: fakeHostKey('198.51.100.7') }), 'vps.hostKey');
  fails(
    vpsConfig({ hostKey: 'x ssh-ed25519 AAAA\nsecond line' }),
    'vps.hostKey',
  );
});

test('vps: root user, relative or shallow paths and a non-https URL are refused', () => {
  fails(vpsConfig({ user: 'root' }), 'vps.user');
  fails(vpsConfig({ path: 'var/www/acme' }), 'vps.path');
  fails(vpsConfig({ path: '/var' }), 'vps.path');
  fails(vpsConfig({ path: '/' }), 'vps.path');
  fails(vpsConfig({ url: 'http://acme.example' }), 'vps.url');
  fails(vpsConfig({ keep: 1 }), 'vps.keep');
  fails(vpsConfig({ port: 70000 }), 'vps.port');
  fails(vpsConfig({ transport: 'local' }), 'vps.transport');
});

test('vps: a non-default port needs the bracketed host in the known_hosts line', () => {
  const host = '203.0.113.10';
  assert.equal(
    resolveConfig(vpsConfig({ port: 2222, hostKey: fakeHostKey(host, 2222) }))
      .vps.port,
    2222,
  );
  fails(vpsConfig({ port: 2222 }), 'vps.hostKey');
});

test('shared: ssh by default on the Hostinger port, document root rule, ftps without a host key', () => {
  const ok = resolveConfig(sharedConfig());
  assert.equal(ok.shared.protocol, 'ssh');
  assert.equal(ok.shared.port, 65002);
  assert.equal(
    resolveConfig(sharedConfig({ port: undefined })).shared.port,
    65002,
  );
  fails(sharedConfig({ path: 'domains/acme.example/other' }), 'shared.path');
  assert.equal(
    resolveConfig(
      sharedConfig({
        path: 'sites/acme/htdocs',
        allowPath: ['sites/acme/htdocs'],
      }),
    ).shared.path,
    'sites/acme/htdocs',
  );
  const raw = sharedConfig({ protocol: 'ftps', port: undefined });
  delete raw.shared.hostKey;
  const ftps = resolveConfig(raw);
  assert.equal(ftps.shared.port, 21);
  assert.equal(ftps.shared.protocol, 'ftps');
  const noKey = sharedConfig();
  delete noKey.shared.hostKey;
  fails(noKey, 'shared.hostKey');
});

test('plain ftp is refused because it sends the password in clear text', () => {
  assert.throws(
    () => resolveConfig(sharedConfig({ protocol: 'ftp' })),
    (error) =>
      error.field === 'shared.protocol' && /clear text/.test(error.message),
  );
  fails(sharedConfig({ protocol: 'sftp' }), 'shared.protocol');
});

test('previews: native for cloudflare and vercel, cloudflare by default for vps and shared, none allowed', () => {
  assert.equal(resolveConfig(vpsConfig()).previews, 'cloudflare');
  const noCf = sharedConfig();
  assert.equal(resolveConfig(noCf).previews, 'none');
  const bare = vpsConfig();
  delete bare.previews;
  assert.equal(resolveConfig(bare).previews, 'cloudflare');
  fails({ ...vpsConfig(), previews: 'native' }, 'previews');
  fails({ ...vpsConfig(), previews: 'sometimes' }, 'previews');
  // previews: cloudflare needs the Cloudflare section.
  const missing = vpsConfig();
  delete missing.cloudflare;
  fails(missing, 'cloudflare');
});

test('checkRemotePath refuses unsafe folders', () => {
  for (const bad of [
    '',
    '/',
    '~',
    '~/',
    '.',
    '..',
    '/var/www/../etc',
    'a b',
    'a;rm',
    '$(id)',
    'x`y`',
    '/var/www/a\nb',
  ])
    assert.throws(
      () => checkRemotePath(bad, 'p', 'vps'),
      ConfigError,
      JSON.stringify(bad),
    );
  for (const bad of ['', '/', '~', 'domains', 'public_html/../x'])
    assert.throws(
      () => checkRemotePath(bad, 'p', 'shared'),
      ConfigError,
      JSON.stringify(bad),
    );
  assert.equal(checkRemotePath('public_html', 'p', 'shared'), 'public_html');
  assert.equal(checkRemotePath('/var/www/a/', 'p', 'vps'), '/var/www/a');
});

test('dispatch: cloudflare sites always use wrangler and the Cloudflare secrets', () => {
  const d = dispatch(
    resolveConfig({
      cloudflare: { pagesProject: 'a', productionBranch: 'main' },
    }),
    'feature',
  );
  assert.deepEqual(
    {
      via: d.deployVia,
      eff: d.effectiveTarget,
      fallback: d.previewFallback,
      secrets: d.secrets,
    },
    {
      via: 'wrangler',
      eff: 'cloudflare',
      fallback: false,
      secrets: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    },
  );
});

test('dispatch: vercel uses the script on every branch and VERCEL_TOKEN', () => {
  for (const branch of ['main', 'feature']) {
    const d = dispatch(resolveConfig(vercelConfig()), branch);
    assert.equal(d.deployVia, 'script');
    assert.equal(d.effectiveTarget, 'vercel');
    assert.deepEqual(d.secrets, ['VERCEL_TOKEN']);
    assert.equal(d.previewFallback, false);
  }
  assert.equal(
    dispatch(resolveConfig(vercelConfig()), 'main').isProduction,
    true,
  );
  assert.equal(
    dispatch(resolveConfig(vercelConfig()), 'feature').isProduction,
    false,
  );
});

test('dispatch: vps production uses the script and the SSH key; a preview falls back to cloudflare', () => {
  const config = resolveConfig(vpsConfig());
  const prod = dispatch(config, 'main');
  assert.deepEqual(
    [prod.deployVia, prod.effectiveTarget, prod.secrets, prod.previewFallback],
    ['script', 'vps', ['DEPLOY_SSH_KEY'], false],
  );
  const preview = dispatch(config, 'change/x');
  assert.deepEqual(
    [
      preview.deployVia,
      preview.effectiveTarget,
      preview.secrets,
      preview.previewFallback,
    ],
    [
      'wrangler',
      'cloudflare',
      ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
      true,
    ],
  );
});

test('dispatch: previews none deploys nothing on a branch; shared ftps needs lftp and the FTP password', () => {
  const shared = resolveConfig(sharedConfig());
  const preview = dispatch(shared, 'change/x');
  assert.deepEqual(
    [
      preview.deployVia,
      preview.effectiveTarget,
      preview.secrets,
      preview.previewFallback,
    ],
    ['none', 'none', [], true],
  );
  assert.equal(dispatch(shared, 'main').needsLftp, false);
  const raw = sharedConfig({ protocol: 'ftps', port: undefined });
  delete raw.shared.hostKey;
  const ftps = dispatch(resolveConfig(raw), 'main');
  assert.deepEqual(
    [ftps.needsLftp, ftps.secrets],
    [true, ['DEPLOY_FTP_PASSWORD']],
  );
  assert.equal(dispatch(resolveConfig(raw), 'change/x').needsLftp, false);
  assert.deepEqual(dispatch(shared, 'main').secrets, ['DEPLOY_SSH_KEY']);
});

test('--github-output appends the dispatch to $GITHUB_OUTPUT', () => {
  const { root } = makeRoot({ config: vpsConfig() });
  const file = join(scratch('gho'), 'out');
  writeFileSync(file, '');
  const c = capture();
  const code = main(
    ['--site', 'acme', '--branch', 'change/x', '--github-output'],
    c.io,
    { GITHUB_OUTPUT: file },
    root,
  );
  assert.equal(code, 0);
  const text = readFileSync(file, 'utf8');
  assert.match(text, /^target=vps$/m);
  assert.match(text, /^effective_target=cloudflare$/m);
  assert.match(text, /^deploy_via=wrangler$/m);
  assert.match(text, /^preview_fallback=true$/m);
  assert.match(text, /^secrets=CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID$/m);
  assert.deepEqual(
    text.trim().split('\n'),
    githubOutputLines(dispatch(resolveConfig(vpsConfig()), 'change/x')),
  );
});

test('the CLI exits 2 naming the field for an invalid configuration', () => {
  const raw = vpsConfig();
  delete raw.vps.hostKey;
  const { root } = makeRoot({ config: raw });
  const c = capture();
  assert.equal(main(['--site', 'acme'], c.io, {}, root), 2);
  assert.match(c.err.join('\n'), /vps\.hostKey/);
  assert.equal(main(['--bogus'], capture().io, {}, root), 2);
});

test('the brief mapping: cloudflare-pages and shared-hosting rename, netlify is unsupported, undecided keeps the default', () => {
  assert.equal(mapBriefTarget('cloudflare-pages'), 'cloudflare');
  assert.equal(mapBriefTarget('shared-hosting'), 'shared');
  assert.equal(mapBriefTarget('vps'), 'vps');
  assert.equal(mapBriefTarget('vercel'), 'vercel');
  assert.equal(mapBriefTarget('undecided'), null);
  assert.equal(mapBriefTarget(undefined), null);
  assert.throws(() => mapBriefTarget('netlify'), /not supported/);
});

test('applying a brief target: vercel is completed, vps and shared wait for their settings', () => {
  const base = {
    cloudflare: { pagesProject: 'acme', productionBranch: 'main' },
  };
  const vercel = applyBriefTarget(base, 'vercel', 'acme');
  assert.equal(vercel.applied, true);
  assert.equal(vercel.raw.target, 'vercel');
  assert.equal(resolveConfig(vercel.raw).vercel.project, 'acme');
  const vps = applyBriefTarget(base, 'vps', 'acme');
  assert.equal(vps.applied, false);
  assert.deepEqual(vps.raw, base);
  assert.match(vps.note, /hostKey|host, user, path/);
  assert.equal(applyBriefTarget(base, 'undecided', 'acme').applied, false);
});

test('--from-brief --write updates site.config.json from the brief', () => {
  const { root, siteDir } = makeRoot({
    config: { cloudflare: { pagesProject: 'acme', productionBranch: 'main' } },
  });
  writeFileSync(
    join(siteDir, 'brief.json'),
    JSON.stringify({ deploy: { target: 'vercel' } }),
  );
  const c = capture();
  assert.equal(
    main(['--site', 'acme', '--from-brief', '--write'], c.io, {}, root),
    0,
  );
  assert.equal(
    JSON.parse(readFileSync(join(siteDir, 'site.config.json'), 'utf8')).target,
    'vercel',
  );
  writeFileSync(
    join(siteDir, 'brief.json'),
    JSON.stringify({ deploy: { target: 'netlify' } }),
  );
  assert.equal(
    main(['--site', 'acme', '--from-brief'], capture().io, {}, root),
    1,
  );
  mkdirSync(join(root, 'sites', 'nobrief'), { recursive: true });
});
