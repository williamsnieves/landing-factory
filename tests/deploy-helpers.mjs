// Shared helpers for the deploy tests (not a test file). Every credential is built at runtime from
// random parts, so no key-shaped literal sits in the repository.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const randomToken = (prefix = 'tok') =>
  `${prefix}${randomBytes(12).toString('hex')}`;

/** A fake OpenSSH-looking private key; the body is random, so it is never a real key. */
export function fakePrivateKey() {
  const body = randomBytes(96)
    .toString('base64')
    .match(/.{1,60}/g)
    .join('\n');
  return [
    ['-----BEGIN', 'OPENSSH', 'PRIVATE KEY-----'].join(' '),
    body,
    ['-----END', 'OPENSSH', 'PRIVATE KEY-----'].join(' '),
  ].join('\n');
}

/** A known_hosts line shaped like a real one (random key bytes). */
export const fakeHostKey = (host = '203.0.113.10', port = 22) =>
  `${port === 22 ? host : `[${host}]:${port}`} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${randomBytes(24).toString('base64').replace(/[+/=]/g, 'A')}`;

export const scratch = (name = 'deploy') =>
  mkdtempSync(join(tmpdir(), `lf-test-${name}-`));

export const STARTER_HEADERS = readFileSync(
  join(ROOT, 'public/_headers'),
  'utf8',
);

/** A small build: pages, a hashed asset, the headers file and a 404 page. */
export function makeDist(dir, { headers = STARTER_HEADERS, extra = {} } = {}) {
  const files = {
    'index.html': '<!doctype html><title>Home</title><h1>Home</h1>',
    '404.html': '<!doctype html><title>404</title><h1>Not found</h1>',
    'about/index.html': '<!doctype html><title>About</title>',
    '_astro/app.abc123.js': 'console.log("app");',
    '_astro/app.abc123.css': 'body{margin:0}',
    _headers: headers,
    ...extra,
  };
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

/** A repository root holding sites/<slug>/site.config.json and a built dist. */
export function makeRoot({ slug = 'acme', config, dist = {} } = {}) {
  const root = scratch('root');
  const siteDir = slug ? join(root, 'sites', slug) : root;
  mkdirSync(siteDir, { recursive: true });
  writeFileSync(
    join(siteDir, 'site.config.json'),
    JSON.stringify(config, null, 2),
  );
  makeDist(join(siteDir, 'dist'), dist);
  return { root, siteDir, dist: join(siteDir, 'dist'), slug };
}

export const CI_ENV = {
  CI: 'true',
  GITHUB_ACTIONS: 'true',
  NODE_TEST_CONTEXT: 'child-v8',
  GITHUB_REF_NAME: 'main',
  GITHUB_SHA: 'abcdef0123456789abcdef0123456789abcdef01',
};

/** An io that records what is printed. */
export function capture() {
  const out = [];
  const err = [];
  return {
    io: { log: (m) => out.push(String(m)), error: (m) => err.push(String(m)) },
    out,
    err,
    all: () => [...out, ...err].join('\n'),
  };
}

export const vpsConfig = (over = {}) => ({
  target: 'vps',
  previews: 'cloudflare',
  cloudflare: { pagesProject: 'acme', productionBranch: 'main' },
  vps: {
    host: '203.0.113.10',
    user: 'deploy',
    path: '/var/www/acme',
    hostKey: fakeHostKey(),
    url: 'https://acme.example',
    ...over,
  },
});

export const sharedConfig = (over = {}) => ({
  target: 'shared',
  previews: 'none',
  shared: {
    host: 'srv123.hstgr.io',
    port: 65002,
    user: 'u123456789',
    path: 'domains/acme.example/public_html',
    hostKey: fakeHostKey('srv123.hstgr.io', 65002),
    url: 'https://acme.example',
    ...over,
  },
});

export const vercelConfig = (over = {}) => ({
  target: 'vercel',
  vercel: {
    project: 'acme',
    team: 'team_abc123',
    productionBranch: 'main',
    ...over,
  },
});
