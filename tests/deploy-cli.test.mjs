// scripts/deploy.mjs: the CI-only rule, the dry-run plan, secret handling and usage errors.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { main } from '../scripts/deploy.mjs';
import { startFakeVercel } from './deploy-fake-vercel.mjs';
import {
  CI_ENV,
  ROOT,
  capture,
  fakePrivateKey,
  makeRoot,
  randomToken,
  scratch,
  sharedConfig,
  vercelConfig,
  vpsConfig,
} from './deploy-helpers.mjs';

const configs = {
  vercel: vercelConfig(),
  vps: vpsConfig(),
  shared: sharedConfig(),
};

test('a real deploy outside CI exits 1 and sends nothing', async () => {
  const fake = await startFakeVercel();
  const site = makeRoot({ config: vercelConfig() });
  for (const env of [
    {},
    { CI: 'true' },
    { GITHUB_ACTIONS: 'true' },
    { CI: 'false', GITHUB_ACTIONS: 'true' },
  ]) {
    const c = capture();
    const code = await main(['--site', 'acme', '--branch', 'main'], c.io, {
      root: site.root,
      env: { ...env, VERCEL_TOKEN: randomToken(), VERCEL_API_URL: fake.url },
    });
    assert.equal(code, 1, JSON.stringify(env));
    assert.match(c.err.join('\n'), /deploys run only from CI/);
  }
  await fake.close();
  assert.equal(fake.requests.length, 0);
});

test('rollback outside CI is refused too, and rollback needs the vps target', async () => {
  const vps = makeRoot({ config: vpsConfig() });
  const c = capture();
  assert.equal(
    await main(['--site', 'acme', '--rollback'], c.io, {
      root: vps.root,
      env: {},
    }),
    1,
  );
  const vercel = makeRoot({ config: vercelConfig() });
  assert.equal(
    await main(['--site', 'acme', '--rollback', '--dry-run'], capture().io, {
      root: vercel.root,
      env: {},
    }),
    2,
  );
});

for (const [target, config] of Object.entries(configs)) {
  test(`${target} dry run prints the plan, creates nothing and shows no secret value`, async () => {
    const site = makeRoot({ config });
    const secrets = {
      VERCEL_TOKEN: randomToken('vt'),
      DEPLOY_SSH_KEY: fakePrivateKey(),
      DEPLOY_FTP_PASSWORD: randomToken('pw'),
    };
    const fake = await startFakeVercel();
    const before = readdirSync(site.siteDir).sort();
    const c = capture();
    const code = await main(
      ['--site', 'acme', '--dry-run', '--branch', 'main'],
      c.io,
      {
        root: site.root,
        env: { ...secrets, VERCEL_API_URL: fake.url },
      },
    );
    await fake.close();
    assert.equal(code, 0, c.all());
    const text = c.all();
    assert.equal(fake.requests.length, 0, 'a dry run sends nothing');
    assert.deepEqual(
      readdirSync(site.siteDir).sort(),
      before,
      'and changes nothing locally',
    );
    assert.match(text, new RegExp(`Target: ${target}`));
    assert.match(text, /Environment: production \(branch main\)/);
    assert.match(text, /Build: .*\(\d+ files, [\d.]+ [KM]?B\)/);
    assert.match(text, /not sent or changed|nothing is sent or changed/);
    for (const [name, value] of Object.entries(secrets)) {
      assert.ok(!text.includes(value), `${name} must not be printed`);
      for (const line of value.split('\n').filter((l) => l.length > 8))
        assert.ok(!text.includes(line));
    }
    assert.match(text, /set in the environment \(value never printed\)/);
  });
}

test('the vercel dry run lists the API calls, the deployment and the generated vercel.json', async () => {
  const site = makeRoot({ config: vercelConfig() });
  const c = capture();
  await main(['--site', 'acme', '--dry-run', '--branch', 'feature/x'], c.io, {
    root: site.root,
    env: {},
  });
  const text = c.all();
  assert.match(text, /Environment: preview/);
  assert.match(
    text,
    /POST http:\/\/|POST https:\/\/api\.vercel\.com\/v2\/files\?teamId=team_abc123/,
  );
  assert.match(text, /\/v13\/deployments\?teamId=team_abc123 \(preview\)/);
  assert.match(text, /--- generated: vercel\.json ---/);
  assert.match(text, /"source": "\/_astro\/\(\.\*\)"/);
  assert.match(text, /Secret VERCEL_TOKEN: not set/);
});

test('the vps dry run shows the commands with the pinned host key and the server snippets', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const c = capture();
  await main(['--site', 'acme', '--dry-run', '--branch', 'main'], c.io, {
    root: site.root,
    env: {},
  });
  const text = c.all();
  assert.match(text, /StrictHostKeyChecking=yes/);
  assert.match(text, /UserKnownHostsFile=<tmp>\/known_hosts/);
  assert.match(text, /--link-dest=\/var\/www\/acme\/current\//);
  assert.match(text, /Pinned host key: 203\.0\.113\.10 ssh-ed25519 /);
  assert.match(text, /--- generated: Caddyfile\.snippet ---/);
  assert.match(text, /--- generated: nginx\.conf\.snippet ---/);
  assert.match(text, /^acme\.example \{$/m);
  assert.ok(!/StrictHostKeyChecking=no/.test(text));
});

test('the shared dry run shows the document root, delete-after and the .htaccess', async () => {
  const site = makeRoot({ config: sharedConfig() });
  const c = capture();
  await main(['--site', 'acme', '--dry-run', '--json'], c.io, {
    root: site.root,
    env: {},
  });
  const plan = JSON.parse(c.out[0]);
  assert.equal(plan.target, 'shared');
  assert.match(plan.steps[0].command, /--delete-after --delay-updates/);
  assert.match(plan.steps[0].command, /domains\/acme\.example\/public_html\/$/);
  assert.match(plan.generated['.htaccess'], /ErrorDocument 404 \/404\.html/);
  assert.match(
    plan.notes.join(' '),
    /removes files in domains\/acme\.example\/public_html/,
  );
});

test('a dry run on a vps site with no branch says which environment it assumed', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const c = capture();
  await main(['--site', 'acme', '--dry-run'], c.io, {
    root: site.root,
    env: {},
  });
  assert.match(c.all(), /no branch given; assuming main \(production\)/);
});

test('the cloudflare target is handled by the wrangler steps', async () => {
  const site = makeRoot({
    config: { cloudflare: { pagesProject: 'acme', productionBranch: 'main' } },
  });
  const dry = capture();
  assert.equal(
    await main(['--site', 'acme', '--dry-run'], dry.io, {
      root: site.root,
      env: {},
    }),
    0,
  );
  assert.match(dry.all(), /wrangler steps/);
  const real = capture();
  assert.equal(
    await main(['--site', 'acme'], real.io, { root: site.root, env: CI_ENV }),
    1,
  );
  assert.match(real.all(), /wrangler steps/);
});

test('a missing build exits 1 naming the folder, and a dist without _headers is refused', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const c = capture();
  assert.equal(
    await main(
      ['--site', 'acme', '--dry-run', '--dist', join(site.root, 'nope')],
      c.io,
      { root: site.root, env: {} },
    ),
    1,
  );
  assert.match(c.err.join('\n'), /does not exist; build the site first/);
  const bare = makeRoot({ config: vpsConfig() });
  writeFileSync(join(bare.dist, 'x'), '');
  const noHeaders = makeRoot({ config: vpsConfig() });
  const { unlinkSync } = await import('node:fs');
  unlinkSync(join(noHeaders.dist, '_headers'));
  const c2 = capture();
  assert.equal(
    await main(['--site', 'acme', '--dry-run'], c2.io, {
      root: noHeaders.root,
      env: {},
    }),
    1,
  );
  assert.match(c2.err.join('\n'), /_headers is missing/);
});

test('--print-config prints the generated header configuration and needs neither CI nor a branch', async () => {
  const site = makeRoot({ config: vpsConfig() });
  const c = capture();
  assert.equal(
    await main(['--site', 'acme', '--print-config'], c.io, {
      root: site.root,
      env: {},
    }),
    0,
  );
  assert.match(c.all(), /# --- Caddyfile\.snippet ---/);
  assert.match(c.all(), /# --- nginx\.conf\.snippet ---/);
});

test('bad usage exits 2: unknown option, invalid slug, missing site config, invalid configuration', async () => {
  const site = makeRoot({ config: vpsConfig() });
  for (const args of [
    ['--bogus'],
    ['--site', 'Bad Slug', '--dry-run'],
    ['--site', 'ghost', '--dry-run'],
    ['--rollback', '--print-config', '--site', 'acme'],
  ]) {
    const c = capture();
    assert.equal(
      await main(args, c.io, { root: site.root, env: {} }),
      2,
      args.join(' '),
    );
    assert.ok(c.err.length > 0);
  }
  const broken = vpsConfig();
  delete broken.vps.hostKey;
  const bad = makeRoot({ config: broken });
  const c = capture();
  assert.equal(
    await main(['--site', 'acme', '--dry-run'], c.io, {
      root: bad.root,
      env: {},
    }),
    2,
  );
  assert.match(c.err.join('\n'), /vps\.hostKey/);
});

test('--help exits 0', async () => {
  const c = capture();
  assert.equal(await main(['--help'], c.io, { env: {} }), 0);
  assert.match(c.out.join('\n'), /Real deploys run only from CI/);
});

test('--github-output appends the result and a summary after a real deploy', async () => {
  const fake = await startFakeVercel();
  const site = makeRoot({ config: vercelConfig() });
  const dir = scratch('gh');
  const output = join(dir, 'output');
  const summary = join(dir, 'summary');
  writeFileSync(output, '');
  writeFileSync(summary, '');
  const c = capture();
  const code = await main(
    ['--site', 'acme', '--branch', 'main', '--github-output'],
    c.io,
    {
      root: site.root,
      env: {
        ...CI_ENV,
        VERCEL_TOKEN: randomToken(),
        VERCEL_API_URL: fake.url,
        GITHUB_OUTPUT: output,
        GITHUB_STEP_SUMMARY: summary,
      },
      pollMs: 5,
    },
  );
  await fake.close();
  assert.equal(code, 0, c.all());
  assert.match(
    readFileSync(output, 'utf8'),
    /^url=https:\/\/acme-abc123\.vercel\.app\nalias=https:\/\/acme\.example\nenvironment=production\n$/,
  );
  assert.match(
    readFileSync(summary, 'utf8'),
    /### Deployment: vercel \(acme\)/,
  );
});

test('the script is a real CLI: help, usage error and a cloudflare dry run on the starter exit as documented', () => {
  const run = (...args) =>
    spawnSync(process.execPath, [join(ROOT, 'scripts/deploy.mjs'), ...args], {
      encoding: 'utf8',
      env: { PATH: process.env.PATH },
    });
  assert.equal(run('--help').status, 0);
  assert.equal(run('--nope').status, 2);
  const dry = run('--site', 'tupathdigital', '--dry-run');
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /wrangler steps/);
  const real = run('--site', 'tupathdigital');
  assert.equal(real.status, 1);
  assert.match(real.stderr, /only from CI/);
});

test('package.json has the deploy script and the allow-list holds dry-run entries only', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.deploy, 'node scripts/deploy.mjs');
  const settings = JSON.parse(
    readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'),
  );
  const entries = settings.permissions.allow.filter((e) => /deploy/.test(e));
  assert.ok(entries.length > 0);
  for (const entry of entries) assert.match(entry, /--dry-run\)$/, entry);
  assert.ok(
    !settings.permissions.allow.some((e) =>
      /deploy\.mjs \*\)$|npm run deploy/.test(e),
    ),
  );
});

test('no deploy source file mentions disabling host key checking', () => {
  for (const file of [
    'scripts/deploy.mjs',
    ...readdirSync(join(ROOT, 'scripts/deploy')).map(
      (f) => `scripts/deploy/${f}`,
    ),
  ]) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    assert.ok(
      !/StrictHostKeyChecking=(no|accept-new)|StrictHostKeyChecking\s+no/.test(
        text,
      ),
      file,
    );
  }
  assert.ok(existsSync(join(ROOT, 'scripts/deploy/rsync.mjs')));
});
