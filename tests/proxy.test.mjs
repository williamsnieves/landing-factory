import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, request } from 'node:http';
import { connect } from 'node:net';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  REEXEC_MARKER,
  chromiumProxyOption,
  createWarningFilter,
  needsProxyReexec,
} from '../.claude/skills/analyze-reference/scripts/proxy.mjs';

const SCRIPT = fileURLToPath(
  new URL(
    '../.claude/skills/analyze-reference/scripts/check-robots.mjs',
    import.meta.url,
  ),
);

test('needsProxyReexec: only with a proxy, no Node switch and no loop marker', () => {
  assert.equal(needsProxyReexec({}), false);
  assert.equal(needsProxyReexec({ HTTPS_PROXY: 'http://p:1' }), true);
  assert.equal(needsProxyReexec({ http_proxy: 'http://p:1' }), true);
  assert.equal(
    needsProxyReexec({ HTTPS_PROXY: 'http://p:1', NODE_USE_ENV_PROXY: '1' }),
    false,
  );
  assert.equal(
    needsProxyReexec({ HTTPS_PROXY: 'http://p:1', [REEXEC_MARKER]: '1' }),
    false,
  );
});

test('chromiumProxyOption: undefined without a proxy; server, credentials and bypass otherwise', () => {
  assert.equal(chromiumProxyOption({}), undefined);
  const o = chromiumProxyOption({
    HTTPS_PROXY: 'http://user:p%40ss@proxy.test:3128/',
    NO_PROXY: 'internal.test',
  });
  assert.equal(o.server, 'http://proxy.test:3128');
  assert.equal(o.username, 'user');
  assert.equal(o.password, 'p@ss');
  assert.match(o.bypass, /internal\.test/);
  assert.match(o.bypass, /127\.0\.0\.1/);
  assert.equal(
    chromiumProxyOption({ HTTP_PROXY: 'proxy.test:8080' }).server,
    'http://proxy.test:8080',
  );
});

test('warning filter drops only the experimental env-proxy warning', () => {
  const out = [];
  const f = createWarningFilter((s) => out.push(s));
  f.push(
    '(node:1) [UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental, expect them to change at any time.\n(Use `node --trace-warnings ...` to show where the warning was created)\nreal error\n(Use `node --trace-warnings ...` to show where the warning was created)\npartial',
  );
  f.end();
  assert.deepEqual(out, [
    'real error\n',
    '(Use `node --trace-warnings ...` to show where the warning was created)\n',
    'partial',
  ]);
});

/**
 * Forwarding proxy that records what it was asked for. Node's env proxy tunnels even plain-HTTP targets
 * with CONNECT, so that is what it implements (plus absolute-URI forwarding for completeness).
 */
async function startProxy() {
  const seen = [];
  const server = createServer((req, res) => {
    seen.push(req.url);
    const target = new URL(req.url);
    const up = request(
      {
        host: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method: req.method,
        headers: req.headers,
      },
      (r) => {
        res.writeHead(r.statusCode, r.headers);
        r.pipe(res);
      },
    );
    up.on('error', () => res.writeHead(502).end());
    req.pipe(up);
  });
  const sockets = new Set();
  server.on('connect', (req, client, head) => {
    seen.push(req.url);
    const [host, port] = req.url.split(':');
    const upstream = connect(Number(port), host, () => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    for (const s of [client, upstream]) {
      sockets.add(s);
      s.on('error', () => s.destroy());
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return {
    seen,
    url: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((done) => {
        for (const s of sockets) s.destroy();
        server.closeAllConnections?.();
        server.close(done);
      }),
  };
}

async function startTarget() {
  const server = createServer((req, res) => {
    if (req.url !== '/') return void res.writeHead(404).end();
    res
      .writeHead(200, { 'content-type': 'text/html' })
      .end('<html><head><title>t</title></head><body>ok</body></html>');
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () =>
      new Promise((done) => {
        server.closeAllConnections?.();
        server.close(done);
      }),
  };
}

const runCli = (args, env) =>
  new Promise((done) => {
    const c = spawn(process.execPath, [SCRIPT, ...args], { env });
    let stdout = '';
    let stderr = '';
    c.stdout.on('data', (d) => (stdout += d));
    c.stderr.on('data', (d) => (stderr += d));
    c.on('close', (code) => done({ code, stdout, stderr }));
  });

const cleanEnv = () => {
  const env = { ...process.env };
  for (const k of Object.keys(env))
    if (/^(https?_proxy|no_proxy|node_use_env_proxy)$/i.test(k)) delete env[k];
  delete env[REEXEC_MARKER];
  return env;
};

test('check-robots CLI routes through HTTP_PROXY without NODE_USE_ENV_PROXY and hides the experimental warning', async () => {
  const proxy = await startProxy();
  const target = await startTarget();
  try {
    const viaProxy = await runCli([target.url], {
      ...cleanEnv(),
      HTTP_PROXY: proxy.url,
      NO_PROXY: '',
    });
    assert.equal(viaProxy.code, 0, viaProxy.stderr + viaProxy.stdout);
    assert.match(viaProxy.stdout, /ALLOWED/i);
    assert.ok(
      proxy.seen.some(
        (u) => target.url.includes(u) || u.startsWith(target.url),
      ),
      `the proxy saw: ${proxy.seen.join()}`,
    );
    assert.doesNotMatch(viaProxy.stderr, /UNDICI-EHPA|EnvHttpProxyAgent/);

    const seenBefore = proxy.seen.length;
    const direct = await runCli([target.url], cleanEnv());
    assert.equal(direct.code, 0, direct.stderr);
    assert.equal(proxy.seen.length, seenBefore, 'no proxy, no proxied request');
  } finally {
    await proxy.close();
    await target.close();
  }
});

test('the exit code of the re-executed child is passed through', async () => {
  const proxy = await startProxy();
  try {
    const bad = await runCli(['--nope'], {
      ...cleanEnv(),
      HTTP_PROXY: proxy.url,
    });
    assert.notEqual(bad.code, 0);
    const help = await runCli(['--help'], {
      ...cleanEnv(),
      HTTP_PROXY: proxy.url,
    });
    assert.equal(help.code, 0);
    assert.match(help.stdout, /check-robots|Usage/i);
  } finally {
    await proxy.close();
  }
});
