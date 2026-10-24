// The Vercel adapter against a local fake Vercel API (VERCEL_API_URL); the real API is never called.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { main } from '../scripts/deploy.mjs';
import { startFakeVercel } from './deploy-fake-vercel.mjs';
import {
  CI_ENV,
  capture,
  makeRoot,
  randomToken,
  vercelConfig,
} from './deploy-helpers.mjs';

const sha1 = (buffer) => createHash('sha1').update(buffer).digest('hex');

async function deploy({
  respond,
  states,
  branch = 'main',
  env = {},
  config = vercelConfig(),
  deps = {},
} = {}) {
  const fake = await startFakeVercel(respond, { states });
  const site = makeRoot({ config });
  const token = randomToken('vtok');
  const c = capture();
  try {
    const code = await main(['--site', 'acme', '--branch', branch], c.io, {
      root: site.root,
      env: { ...CI_ENV, VERCEL_TOKEN: token, VERCEL_API_URL: fake.url, ...env },
      pollMs: 5,
      timeoutMs: 2000,
      ...deps,
    });
    return { code, fake, site, c, token };
  } finally {
    await fake.close();
  }
}

test('production deploy: files uploaded by SHA-1, deployment created with target production, URL printed', async () => {
  const { code, fake, site, c, token } = await deploy({});
  assert.equal(code, 0, c.all());
  const uploads = fake.requests.filter((r) => r.path === '/v2/files');
  assert.ok(uploads.length >= 7, 'every unique file plus vercel.json');
  for (const upload of uploads) {
    assert.equal(upload.method, 'POST');
    assert.equal(upload.headers.authorization, `Bearer ${token}`);
    assert.equal(upload.headers['x-vercel-digest'], sha1(upload.raw));
    assert.equal(Number(upload.headers['content-length']), upload.raw.length);
    assert.equal(upload.query.teamId, 'team_abc123');
  }
  const create = fake.requests.find(
    (r) => r.method === 'POST' && r.path === '/v13/deployments',
  );
  assert.equal(create.query.teamId, 'team_abc123');
  assert.equal(create.json.name, 'acme');
  assert.equal(create.json.project, 'acme');
  assert.equal(create.json.target, 'production');
  assert.deepEqual(create.json.projectSettings, {
    framework: null,
    buildCommand: null,
    installCommand: null,
    outputDirectory: null,
  });
  assert.equal(create.json.meta.branch, 'main');
  assert.equal(create.json.meta.commit, CI_ENV.GITHUB_SHA);
  const files = create.json.files;
  assert.ok(files.find((f) => f.file === 'index.html'));
  assert.ok(files.find((f) => f.file === '_astro/app.abc123.js'));
  const vercelJson = files.find((f) => f.file === 'vercel.json');
  assert.ok(vercelJson, 'vercel.json is part of the deployment');
  const sentJson = uploads.find(
    (u) => u.headers['x-vercel-digest'] === vercelJson.sha,
  );
  assert.equal(JSON.parse(sentJson.raw).headers.length, 2);
  // Every file listed was uploaded with its digest.
  for (const f of files)
    assert.ok(
      uploads.some((u) => u.headers['x-vercel-digest'] === f.sha),
      f.file,
    );
  // The result line is JSON on stdout; the alias is the production alias.
  const result = JSON.parse(c.out.at(-1));
  assert.deepEqual(result, {
    target: 'vercel',
    environment: 'production',
    url: 'https://acme-abc123.vercel.app',
    aliasUrl: 'https://acme.example',
  });
  assert.ok(site.root);
});

test('polling runs until READY', async () => {
  const { code, fake } = await deploy({
    states: ['QUEUED', 'BUILDING', 'BUILDING', 'READY'],
  });
  assert.equal(code, 0);
  assert.equal(fake.requests.filter((r) => r.method === 'GET').length, 4);
});

test('a preview deployment on another branch has no target and prints the deployment URL', async () => {
  const { code, fake, c } = await deploy({ branch: 'change/new-hero' });
  assert.equal(code, 0, c.all());
  const create = fake.requests.find(
    (r) => r.method === 'POST' && r.path === '/v13/deployments',
  );
  assert.equal('target' in create.json, false);
  assert.equal(create.json.meta.branch, 'change/new-hero');
  const result = JSON.parse(c.out.at(-1));
  assert.equal(result.environment, 'preview');
  assert.equal(result.url, 'https://acme-abc123.vercel.app');
  assert.equal(result.aliasUrl, undefined);
});

test('without a team there is no team query', async () => {
  const { code, fake } = await deploy({
    config: vercelConfig({ team: undefined }),
  });
  assert.equal(code, 0);
  assert.ok(
    fake.requests.every((r) => !('teamId' in r.query) && !('slug' in r.query)),
  );
});

test('a deployment that ends in ERROR exits 1 with the reason', async () => {
  const { code, c } = await deploy({ states: ['BUILDING', 'ERROR'] });
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /ERROR: Build failed/);
});

test('a deployment that never becomes ready times out with exit 1', async () => {
  const { code, c } = await deploy({
    states: ['BUILDING'],
    deps: { timeoutMs: 80 },
  });
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /was not ready after/);
});

test('a token echoed by the API in an error is masked everywhere', async () => {
  const token = randomToken('vtok');
  const { code, c } = await deploy({
    env: { VERCEL_TOKEN: token },
    respond: (r) =>
      r.path === '/v2/files'
        ? {
            status: 403,
            body: {
              error: { message: `Invalid token ${token} for Bearer ${token}` },
            },
          }
        : null,
  });
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /HTTP 403/);
  assert.ok(!c.all().includes(token), 'the token must not be printed');
  assert.ok(
    !c.all().includes(token.slice(0, 12)) || c.all().includes('[redacted]'),
  );
});

test('a missing token exits 2 before any request', async () => {
  const fake = await startFakeVercel();
  const site = makeRoot({ config: vercelConfig() });
  const c = capture();
  const code = await main(['--site', 'acme', '--branch', 'main'], c.io, {
    root: site.root,
    env: { ...CI_ENV, VERCEL_API_URL: fake.url },
  });
  await fake.close();
  assert.equal(code, 2);
  assert.match(c.err.join('\n'), /VERCEL_TOKEN is not set/);
  assert.equal(fake.requests.length, 0);
});

test('identical files are uploaded once', async () => {
  const fake = await startFakeVercel();
  const site = makeRoot({
    config: vercelConfig(),
    dist: { extra: { 'copy-a.txt': 'same', 'copy-b.txt': 'same' } },
  });
  const c = capture();
  const code = await main(['--site', 'acme', '--branch', 'main'], c.io, {
    root: site.root,
    env: {
      ...CI_ENV,
      VERCEL_TOKEN: randomToken('v'),
      VERCEL_API_URL: fake.url,
    },
    pollMs: 5,
  });
  await fake.close();
  assert.equal(code, 0, c.all());
  const digests = fake.requests
    .filter((r) => r.path === '/v2/files')
    .map((r) => r.headers['x-vercel-digest']);
  assert.equal(new Set(digests).size, digests.length);
  const create = fake.requests.find(
    (r) => r.method === 'POST' && r.path === '/v13/deployments',
  );
  assert.ok(
    create.json.files.some((f) => f.file === 'copy-a.txt') &&
      create.json.files.some((f) => f.file === 'copy-b.txt'),
  );
});
