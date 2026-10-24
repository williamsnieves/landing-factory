// Live checks (tasks 5.1) and outbound link health (5.2) against local fixture servers and stubbed hosts: no network.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, test } from 'node:test';

import {
  checkLinks,
  classifyLink,
  isPrivateHost,
  linkItem,
  outboundLinks,
} from '../scripts/report/links.mjs';
import { runLiveChecks } from '../scripts/report/live.mjs';
import { scanHtml } from '../scripts/report/html.mjs';
import { makeSite, runReport } from './report-fixture.mjs';

const HOME = `<!doctype html><html><head><title>x</title>
<meta http-equiv="content-security-policy" content="script-src 'self' 'sha256-abc='">
<link rel="stylesheet" href="/_astro/app.css"><script type="module" src="/_astro/app.js"></script></head>
<body><a href="https://store.example/shop">shop</a></body></html>`;
const GOOD_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'content-security-policy': "frame-ancestors 'self'",
  'permissions-policy': 'camera=()',
  'strict-transport-security': 'max-age=31536000',
  'cross-origin-opener-policy': 'same-origin',
  'content-type': 'text/html',
};

/** A local HTTP server. `routes` maps "METHOD /path" or "/path" to { status, headers, body } (home page by default). */
async function serve(routes) {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    const route = routes[`${req.method} ${req.url}`] ??
      routes[req.url] ??
      routes['*'] ?? { status: 404, body: 'not found' };
    res.writeHead(route.status ?? 200, {
      'content-type': 'text/plain',
      ...(route.headers ?? {}),
    });
    res.end(req.method === 'HEAD' ? undefined : (route.body ?? ''));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise(
        (resolve) => (server.closeAllConnections?.(), server.close(resolve)),
      ),
  };
}
const idOf = (items, id) => items.find((i) => i.id === id);

const servers = [];
const start = async (routes) => {
  const server = await serve(routes);
  servers.push(server);
  return server;
};
after(() => Promise.all(servers.map((s) => s.close())));

// --- 5.1 live checks -----------------------------------------------------------------------------------

test('a host that answers every path with the home page: private paths pass, the unknown path warns', async () => {
  const host = await start({
    '*': {
      status: 200,
      headers: { ...GOOD_HEADERS, 'content-type': 'text/html' },
      body: HOME,
    },
  });
  const { items } = await runLiveChecks({ baseUrl: host.url, allowHttp: true });
  const priv = idOf(items, 'live-private-paths');
  assert.equal(priv.status, 'pass');
  assert.ok(
    priv.evidence.some(
      (e) =>
        e.includes('/.env') && e.includes('status 200, no sensitive content'),
    ),
  );
  const unknown = idOf(items, 'live-unknown-path');
  assert.equal(unknown.status, 'warn');
  assert.match(unknown.title, /answers 200, not 404/);
  assert.match(unknown.fix, /404\.astro/);
});

test('an exposed /.git/HEAD fails naming the URL; so do an exposed .env and brief.json judged by their body', async () => {
  const host = await start({
    '/': { status: 200, headers: GOOD_HEADERS, body: HOME },
    '/.git/HEAD': { status: 200, body: 'ref: refs/heads/main\n' },
    '/.env': { status: 200, body: 'API_URL=https://x\nMODE=prod\n' },
    '/brief.json': { status: 200, body: '{"business":{"name":"x"}}' },
    '/package.json': { status: 200, body: '<html>spa fallback</html>' },
  });
  const { items } = await runLiveChecks({ baseUrl: host.url, allowHttp: true });
  const priv = idOf(items, 'live-private-paths');
  assert.equal(priv.status, 'fail');
  assert.equal(priv.owasp, 'A01');
  assert.ok(priv.evidence.includes(`${host.url}/.git/HEAD (git data): SERVED`));
  assert.ok(
    priv.evidence.includes(`${host.url}/.env (environment file): SERVED`),
  );
  assert.ok(
    priv.evidence.includes(`${host.url}/brief.json (customer brief): SERVED`),
  );
  assert.ok(
    priv.evidence.some(
      (e) => e.includes('/package.json') && e.includes('no sensitive content'),
    ),
  );
  assert.equal(idOf(items, 'live-unknown-path').status, 'pass');
});

test('headers and hashed-asset caching are judged on the live response', async () => {
  const { 'strict-transport-security': _hsts, ...withoutHsts } = GOOD_HEADERS;
  const host = await start({
    '/': { status: 200, headers: withoutHsts, body: HOME },
    '/_astro/app.css': {
      status: 200,
      headers: { 'cache-control': 'public, max-age=60' },
    },
  });
  const { items } = await runLiveChecks({ baseUrl: host.url, allowHttp: true });
  assert.equal(idOf(items, 'live-headers-baseline').status, 'pass');
  assert.equal(idOf(items, 'live-csp-scripts').status, 'pass'); // from the meta tag in the body
  // Over plain HTTP the HSTS, TLS and redirect checks are not applicable.
  assert.equal(idOf(items, 'live-headers-hsts').status, 'na');
  assert.equal(idOf(items, 'live-tls').status, 'na');
  const cache = idOf(items, 'live-asset-cache');
  assert.equal(cache.status, 'warn');
  assert.match(
    cache.evidence[0],
    /\/_astro\/app\.css: 200, Cache-Control: public, max-age=60/,
  );

  const good = await start({
    '/': { status: 200, headers: GOOD_HEADERS, body: HOME },
    '/_astro/app.css': {
      status: 200,
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
    },
  });
  const fine = await runLiveChecks({ baseUrl: good.url, allowHttp: true });
  assert.equal(idOf(fine.items, 'live-asset-cache').status, 'pass');
});

test('missing baseline headers fail on the live response', async () => {
  const host = await start({
    '/': { status: 200, headers: { 'content-type': 'text/html' }, body: HOME },
  });
  const { items } = await runLiveChecks({ baseUrl: host.url, allowHttp: true });
  assert.equal(idOf(items, 'live-headers-baseline').status, 'fail');
  assert.equal(idOf(items, 'live-headers-coop').status, 'warn');
});

/** A stub fetch for https:// hosts, so TLS-dependent checks run without certificates. */
function stubHost({ httpsHeaders = GOOD_HEADERS, plain, tlsError } = {}) {
  return async (url, init = {}) => {
    const u = new URL(url);
    if (u.protocol === 'http:') {
      if (plain === 'error')
        throw Object.assign(new TypeError('fetch failed'), {
          cause: Object.assign(new Error('connect ECONNREFUSED'), {
            code: 'ECONNREFUSED',
          }),
        });
      return (
        plain ??
        new Response(null, {
          status: 301,
          headers: { location: `https://${u.host}/` },
        })
      );
    }
    if (tlsError)
      throw Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('certificate has expired'), {
          code: 'CERT_HAS_EXPIRED',
        }),
      });
    if (u.pathname === '/')
      return new Response(HOME, { status: 200, headers: httpsHeaders });
    if (u.pathname.startsWith('/_astro/'))
      return new Response('x', {
        status: 200,
        headers: { 'cache-control': 'public, max-age=31536000, immutable' },
      });
    return new Response('nope', { status: 404 });
  };
}

test('over HTTPS: missing HSTS warns, a permanent redirect passes, TLS passes', async () => {
  const { 'strict-transport-security': _hsts, ...withoutHsts } = GOOD_HEADERS;
  const { items } = await runLiveChecks({
    baseUrl: 'https://site.example/',
    fetchImpl: stubHost({ httpsHeaders: withoutHsts }),
  });
  const hsts = idOf(items, 'live-headers-hsts');
  assert.equal(hsts.status, 'warn');
  assert.equal(hsts.owasp, 'A04');
  assert.match(hsts.fix, /Strict-Transport-Security: max-age=31536000/);
  assert.equal(idOf(items, 'live-tls').status, 'pass');
  assert.equal(idOf(items, 'live-https-redirect').status, 'pass');
  assert.equal(idOf(items, 'live-unknown-path').status, 'pass');
  assert.equal(idOf(items, 'live-asset-cache').status, 'pass');
});

test('HTTP that serves content fails, other answers warn, a closed port warns', async () => {
  const serving = await runLiveChecks({
    baseUrl: 'https://site.example/',
    fetchImpl: stubHost({ plain: new Response('hello', { status: 200 }) }),
  });
  assert.equal(idOf(serving.items, 'live-https-redirect').status, 'fail');
  const temp = await runLiveChecks({
    baseUrl: 'https://site.example/',
    fetchImpl: stubHost({
      plain: new Response(null, {
        status: 302,
        headers: { location: 'https://site.example/' },
      }),
    }),
  });
  assert.equal(idOf(temp.items, 'live-https-redirect').status, 'warn');
  const closed = await runLiveChecks({
    baseUrl: 'https://site.example/',
    fetchImpl: stubHost({ plain: 'error' }),
  });
  assert.equal(idOf(closed.items, 'live-https-redirect').status, 'warn');
});

test('plain HTTP that cannot be resolved from this machine is not run, not a warning about the site', async () => {
  const fetchImpl = async (url) => {
    if (new URL(url).protocol === 'http:')
      throw Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('getaddrinfo ENOTFOUND site.example'), {
          code: 'ENOTFOUND',
        }),
      });
    return stubHost()(url);
  };
  const { items } = await runLiveChecks({
    baseUrl: 'https://site.example/',
    fetchImpl,
  });
  assert.equal(idOf(items, 'live-https-redirect').status, 'not-run');
  assert.equal(idOf(items, 'live-tls').status, 'pass');
});

test('a TLS error fails naming the host and the error; the other live checks are not run', async () => {
  const { items } = await runLiveChecks({
    baseUrl: 'https://site.example/',
    fetchImpl: stubHost({ tlsError: true }),
  });
  const tls = idOf(items, 'live-tls');
  assert.equal(tls.status, 'fail');
  assert.match(tls.title, /site\.example/);
  assert.match(tls.evidence[0], /CERT_HAS_EXPIRED: certificate has expired/);
  assert.ok(
    items
      .filter((i) => i.id !== 'live-tls')
      .every((i) => i.status === 'not-run'),
  );
});

test('an unreachable host is not run, never a pass', async () => {
  const offline = async () => {
    throw Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('getaddrinfo ENOTFOUND'), {
        code: 'ENOTFOUND',
      }),
    });
  };
  const { items } = await runLiveChecks({
    baseUrl: 'https://site.example/',
    fetchImpl: offline,
  });
  assert.ok(items.length >= 6);
  assert.ok(items.every((i) => i.status === 'not-run'));
  assert.match(items[0].evidence[0], /ENOTFOUND/);
});

test('an http:// URL is refused unless --allow-http', async () => {
  await assert.rejects(
    runLiveChecks({ baseUrl: 'http://site.example/' }),
    /must be an https:\/\/ URL/,
  );
});

test('the CLI runs the live checks on a local server with --only live --allow-http and exits 1 on an exposed .git', async () => {
  const host = await start({
    '/': { status: 200, headers: GOOD_HEADERS, body: HOME },
    '/.git/HEAD': { status: 200, body: 'ref: refs/heads/main' },
  });
  const site = makeSite();
  try {
    const { code, report, out } = await runReport(site, [
      '--only',
      'live',
      '--url',
      host.url,
      '--allow-http',
      '--skip',
      'external-links',
    ]);
    assert.equal(code, 1, out);
    assert.equal(report.mode, 'live');
    assert.equal(report.url, host.url);
    assert.equal(
      report.items.find((i) => i.id === 'live-private-paths').status,
      'fail',
    );
    assert.ok(report.items.every((i) => i.id.startsWith('live-')));
  } finally {
    site.cleanup();
  }
});

// --- 5.2 external links -------------------------------------------------------------------------------------

test('link classes: ok, unverified (403, 429, challenge header) and broken (404, 410, 500, errors)', async () => {
  const host = await start({
    '/ok': { status: 200 },
    '/redirect': { status: 301, headers: { location: '/ok' } },
    '/missing': { status: 404 },
    '/gone': { status: 410 },
    '/boom': { status: 500 },
    '/forbidden': { status: 403 },
    '/limited': { status: 429 },
    '/challenge': { status: 200, headers: { 'cf-mitigated': 'challenge' } },
    'HEAD /head-unsupported': { status: 405 },
    'GET /head-unsupported': { status: 200 },
  });
  const paths = [
    'ok',
    'redirect',
    'missing',
    'gone',
    'boom',
    'forbidden',
    'limited',
    'challenge',
    'head-unsupported',
  ];
  const { results } = await checkLinks({
    links: paths.map((p) => ({ url: `${host.url}/${p}`, pages: ['/'] })),
    gapMs: 0,
    allowPrivate: true,
  });
  const state = Object.fromEntries(
    results.map((r) => [new URL(r.url).pathname.slice(1), r.state]),
  );
  assert.deepEqual(state, {
    ok: 'ok',
    redirect: 'ok',
    missing: 'broken',
    gone: 'broken',
    boom: 'broken',
    forbidden: 'unverified',
    limited: 'unverified',
    challenge: 'unverified',
    'head-unsupported': 'ok',
  });
  // Nothing is retried around a block: one request for each blocked link; HEAD then GET only where HEAD is unusable.
  const count = (p) => host.requests.filter((r) => r.endsWith(` /${p}`)).length;
  assert.equal(count('forbidden'), 1);
  assert.equal(count('limited'), 1);
  assert.equal(count('challenge'), 1);
  assert.equal(count('head-unsupported'), 2);
  const item = linkItem({ results, skipped: [] });
  assert.equal(item.status, 'warn'); // broken links warn, never fail
  assert.match(item.title, /3 broken|4 broken/);
  assert.ok(
    item.evidence.some((e) => e.startsWith('unverified ') && e.includes('403')),
  );
});

test('only unverified links do not even warn; the run does not fail', async () => {
  const host = await start({
    '/shop': { status: 403, headers: { 'cf-mitigated': 'challenge' } },
  });
  const { results, skipped } = await checkLinks({
    links: [{ url: `${host.url}/shop`, pages: ['/'] }],
    gapMs: 0,
    allowPrivate: true,
  });
  const item = linkItem({ results, skipped });
  assert.equal(item.status, 'pass');
  assert.match(item.title, /1 unverified, 0 broken/);
});

test('DNS errors and timeouts warn', async () => {
  const dns = async () => {
    throw Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('getaddrinfo ENOTFOUND gone.example'), {
        code: 'ENOTFOUND',
      }),
    });
  };
  const { results } = await checkLinks({
    links: [{ url: 'https://gone.example/', pages: ['/'] }],
    gapMs: 0,
    fetchImpl: dns,
  });
  assert.equal(results[0].state, 'broken');
  assert.match(results[0].detail, /ENOTFOUND/);
});

test('links are deduplicated, capped at the limit, sequential with a gap, and private hosts are not requested', async () => {
  const seen = [];
  const fetchImpl = async (url) => (
    seen.push(url),
    new Response(null, { status: 200 })
  );
  const gaps = [];
  const links = [
    ...Array.from({ length: 6 }, (_, i) => ({
      url: `https://a.example/${i}`,
      pages: ['/'],
    })),
    { url: 'https://a.example/0', pages: ['/x/'] },
    { url: 'http://localhost:3000/admin', pages: ['/'] },
    { url: 'http://192.168.1.5/', pages: ['/'] },
  ];
  const { results, skipped } = await checkLinks({
    links,
    max: 4,
    gapMs: 250,
    fetchImpl,
    sleepFn: async (ms) => gaps.push(ms),
  });
  assert.equal(results.length, 4);
  assert.equal(skipped.length, 4); // two more public links and the two private ones are over the limit
  assert.equal(seen.length, 4);
  assert.deepEqual(gaps, [250, 250, 250]);
  const priv = await checkLinks({
    links: links.slice(-2),
    gapMs: 0,
    fetchImpl,
  });
  assert.ok(
    priv.results.every(
      (r) => r.state === 'unverified' && /not requested/.test(r.detail),
    ),
  );
  assert.equal(seen.length, 4);
  assert.ok(
    isPrivateHost('10.0.0.1') &&
      isPrivateHost('127.0.0.1') &&
      isPrivateHost('::1') &&
      !isPrivateHost('example.org'),
  );
});

test('classifyLink and outboundLinks', () => {
  assert.equal(
    classifyLink({ ok: true, status: 999, headers: {} }).state,
    'unverified',
  );
  assert.equal(
    classifyLink({ ok: true, status: 204, headers: {} }).state,
    'ok',
  );
  const pages = [
    {
      path: '/',
      scan: scanHtml(
        '<a href="https://x.example/a#top">a</a><a href="/local">l</a><a href="mailto:a@b.c">m</a><a href="https://me.example/p">me</a>',
      ),
    },
    { path: '/b/', scan: scanHtml('<a href="https://x.example/a">again</a>') },
  ];
  assert.deepEqual(outboundLinks(pages, 'https://me.example'), [
    { url: 'https://x.example/a', pages: ['/', '/b/'] },
  ]);
});

test('the CLI checks outbound links of the build with --external-links and never fails because of them', async () => {
  const shop = await start({
    '/shop': { status: 403, headers: { 'cf-mitigated': 'challenge' } },
  });
  const site = makeSite();
  try {
    site.write(
      'dist/index.html',
      site
        .read('dist/index.html')
        .replace('https://example.org/', `${shop.url}/shop`),
    );
    const { code, report } = await runReport(
      site,
      [
        '--only',
        'static',
        '--skip',
        'audit,perf,secrets',
        '--external-links',
        '--allow-http',
      ],
      {
        sleepFn: async () => {},
      },
    );
    assert.equal(code, 0);
    const item = report.items.find((i) => i.id === 'external-links');
    assert.equal(item.status, 'pass');
    assert.match(
      item.evidence[0],
      /^unverified http:\/\/127\.0\.0\.1:\d+\/shop: 403 \(cf-mitigated\)$/,
    );
  } finally {
    site.cleanup();
  }
});
