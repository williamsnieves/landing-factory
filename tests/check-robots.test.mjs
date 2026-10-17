import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  blockingFromXRobotsTag,
  checkPermissions,
  parseMetaTags,
  parseRobots,
  robotsAllows,
} from '../.claude/skills/analyze-reference/scripts/check-robots.mjs';

const SCRIPT = fileURLToPath(
  new URL(
    '../.claude/skills/analyze-reference/scripts/check-robots.mjs',
    import.meta.url,
  ),
);
const SITE = 'https://site.test';

/** fetch stub: map of absolute URL -> { status, headers, body } | Error | 'hang'. Unknown URLs are 404. */
function stubFetch(map) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push(String(url));
    const entry = map[url];
    if (entry === 'hang')
      return new Promise((_, reject) =>
        init.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        ),
      );
    if (entry instanceof Error) throw entry;
    const { status = 404, headers = {}, body = '' } = entry ?? {};
    return {
      status,
      url,
      headers: new Headers(headers),
      text: async () => body,
    };
  };
  fn.calls = calls;
  return fn;
}
const page = (
  body = '<html><head><title>t</title></head></html>',
  headers = {},
) => ({
  status: 200,
  headers: { 'content-type': 'text/html', ...headers },
  body,
});
const robots = (body, status = 200) => ({ status, body });
const check = (map, url = `${SITE}/`, opts = {}) =>
  checkPermissions(url, { fetch: stubFetch(map), timeoutMs: 200, ...opts });

test('no robots.txt (404) and a clean page is allowed', async () => {
  const r = await check({ [`${SITE}/`]: page() });
  assert.equal(r.verdict, 'allowed');
  assert.deepEqual(r.reasons, []);
});

test('robots.txt allowing everything is allowed', async () => {
  const r = await check({
    [`${SITE}/robots.txt`]: robots('User-agent: *\nDisallow:\n'),
    [`${SITE}/`]: page(),
  });
  assert.equal(r.verdict, 'allowed');
});

for (const agent of ['*', 'ClaudeBot', 'anthropic-ai', 'GPTBot']) {
  test(`robots.txt disallowing ${agent} aborts`, async () => {
    const r = await check({
      [`${SITE}/robots.txt`]: robots(`User-agent: ${agent}\nDisallow: /\n`),
      [`${SITE}/`]: page(),
    });
    assert.equal(r.verdict, 'blocked');
    assert.match(
      r.reasons.join('\n'),
      new RegExp(`disallows .* for ${agent.replace('*', '\\*')}`),
    );
  });
}

test('robots.txt that disallows only another path allows this one', async () => {
  const map = {
    [`${SITE}/robots.txt`]: robots('User-agent: *\nDisallow: /private/\n'),
    [`${SITE}/work`]: page(),
  };
  assert.equal((await check(map, `${SITE}/work`)).verdict, 'allowed');
  const blocked = await check(
    { ...map, [`${SITE}/private/x`]: page() },
    `${SITE}/private/x`,
  );
  assert.equal(blocked.verdict, 'blocked');
});

test('longest match wins and Allow beats Disallow on ties', () => {
  const p = parseRobots(
    'User-agent: *\nDisallow: /a/\nAllow: /a/public\nDisallow: /b\nAllow: /b\n# comment\n',
  );
  assert.equal(robotsAllows(p, '*', '/a/secret').allowed, false);
  assert.equal(robotsAllows(p, '*', '/a/public/x').allowed, true);
  assert.equal(robotsAllows(p, '*', '/b').allowed, true);
});

test('wildcards and $ anchors in robots rules', () => {
  const p = parseRobots(
    'User-agent: *\nDisallow: /*.pdf$\nDisallow: /tmp*/x\n',
  );
  assert.equal(robotsAllows(p, '*', '/a/file.pdf').allowed, false);
  assert.equal(robotsAllows(p, '*', '/a/file.pdf?x=1').allowed, true);
  assert.equal(robotsAllows(p, '*', '/tmp123/x').allowed, false);
});

test('a specific group overrides the * group for that agent', () => {
  const p = parseRobots(
    'User-agent: *\nDisallow: /\n\nUser-agent: ClaudeBot\nUser-agent: GPTBot\nDisallow:\n',
  );
  assert.equal(robotsAllows(p, 'ClaudeBot', '/x').allowed, true);
  assert.equal(robotsAllows(p, 'GPTBot', '/x').allowed, true);
  assert.equal(robotsAllows(p, 'anthropic-ai', '/x').allowed, false);
});

test('robots.txt 401 and 403 are treated as disallowed', async () => {
  for (const status of [401, 403]) {
    const r = await check({
      [`${SITE}/robots.txt`]: robots('', status),
      [`${SITE}/`]: page(),
    });
    assert.equal(r.verdict, 'blocked', String(status));
    assert.match(r.reasons[0], new RegExp(`HTTP ${status}`));
  }
});

test('robots.txt 5xx, network error and timeout abort as "cannot verify"', async () => {
  const cases = {
    503: robots('', 503),
    error: new Error('ECONNRESET'),
    timeout: 'hang',
  };
  for (const [name, entry] of Object.entries(cases)) {
    const r = await check({
      [`${SITE}/robots.txt`]: entry,
      [`${SITE}/`]: page(),
    });
    assert.equal(r.verdict, 'unverifiable', name);
    assert.equal(r.allowed, false);
    assert.match(r.reasons[0], /cannot verify permissions/);
  }
});

test('robots.txt TDM-Reservation: 1 aborts', async () => {
  const r = await check({
    [`${SITE}/robots.txt`]: robots(
      'User-agent: *\nAllow: /\nTDM-Reservation: 1\n',
    ),
    [`${SITE}/`]: page(),
  });
  assert.equal(r.verdict, 'blocked');
  assert.match(r.reasons.join(), /TDM-Reservation/);
});

test('/.well-known/tdmrep.json reservation aborts only for matching locations', async () => {
  const file = {
    status: 200,
    body: JSON.stringify([{ location: '/blog', 'tdm-reservation': 1 }]),
  };
  const map = {
    [`${SITE}/.well-known/tdmrep.json`]: file,
    [`${SITE}/blog/post`]: page(),
    [`${SITE}/work`]: page(),
  };
  assert.equal((await check(map, `${SITE}/blog/post`)).verdict, 'blocked');
  assert.equal((await check(map, `${SITE}/work`)).verdict, 'allowed');
  const all = {
    ...map,
    [`${SITE}/.well-known/tdmrep.json`]: {
      status: 200,
      body: '[{"location":"/*","tdm-reservation":1}]',
    },
  };
  assert.equal((await check(all, `${SITE}/work`)).verdict, 'blocked');
  const zero = {
    ...map,
    [`${SITE}/.well-known/tdmrep.json`]: {
      status: 200,
      body: '[{"location":"/","tdm-reservation":0}]',
    },
  };
  assert.equal((await check(zero, `${SITE}/work`)).verdict, 'allowed');
});

test('invalid tdmrep.json or a 5xx on it cannot be verified', async () => {
  for (const f of [
    { status: 200, body: '{nope' },
    { status: 500, body: '' },
  ]) {
    const r = await check({
      [`${SITE}/.well-known/tdmrep.json`]: f,
      [`${SITE}/`]: page(),
    });
    assert.equal(r.verdict, 'unverifiable');
  }
});

test('<meta name="tdm-reservation" content="1"> aborts; content 0 does not', async () => {
  const meta = (c) =>
    `<head><meta name="tdm-reservation" content="${c}"></head>`;
  assert.equal(
    (await check({ [`${SITE}/`]: page(meta(1)) })).verdict,
    'blocked',
  );
  assert.equal(
    (await check({ [`${SITE}/`]: page(meta(0)) })).verdict,
    'allowed',
  );
});

test('tdm-reservation response header aborts', async () => {
  const r = await check({
    [`${SITE}/`]: page('<html></html>', { 'tdm-reservation': '1' }),
  });
  assert.equal(r.verdict, 'blocked');
});

test('X-Robots-Tag: noai / noindex / none abort; unrelated bots and values do not', async () => {
  for (const v of [
    'noai',
    'noindex, nofollow',
    'none',
    'claudebot: noai',
    'noimageai',
  ]) {
    const r = await check({
      [`${SITE}/`]: page('<html></html>', { 'x-robots-tag': v }),
    });
    assert.equal(r.verdict, 'blocked', v);
  }
  for (const v of ['nofollow', 'googlebot: noindex', 'all']) {
    const r = await check({
      [`${SITE}/`]: page('<html></html>', { 'x-robots-tag': v }),
    });
    assert.equal(r.verdict, 'allowed', v);
  }
  assert.deepEqual(
    blockingFromXRobotsTag('otherbot: noindex, claudebot: noai'),
    ['claudebot: noai'],
  );
});

test('<meta name="robots"> noindex/noai abort; index,follow does not', async () => {
  const meta = (name, c) => `<head><meta name="${name}" content="${c}"></head>`;
  assert.equal(
    (await check({ [`${SITE}/`]: page(meta('robots', 'noindex')) })).verdict,
    'blocked',
  );
  assert.equal(
    (await check({ [`${SITE}/`]: page(meta('GPTBot', 'noai')) })).verdict,
    'blocked',
  );
  assert.equal(
    (await check({ [`${SITE}/`]: page(meta('robots', 'index, follow')) }))
      .verdict,
    'allowed',
  );
  assert.deepEqual(
    parseMetaTags("<meta content='noai' name='robots'>").robots,
    ['noai'],
  );
});

test('page 403 means not public; page 404 unreachable; page 5xx cannot verify', async () => {
  assert.equal(
    (await check({ [`${SITE}/`]: { status: 403 } })).verdict,
    'blocked',
  );
  assert.equal(
    (await check({ [`${SITE}/`]: { status: 404 } })).verdict,
    'blocked',
  );
  assert.equal(
    (await check({ [`${SITE}/`]: { status: 502 } })).verdict,
    'unverifiable',
  );
});

test('invalid and non-http URLs cannot be verified', async () => {
  assert.equal((await check({}, 'not a url')).verdict, 'unverifiable');
  assert.equal((await check({}, 'file:///etc/passwd')).verdict, 'unverifiable');
});

test('a reservation stops before the page is fetched', async () => {
  const f = stubFetch({
    [`${SITE}/robots.txt`]: robots('User-agent: *\nDisallow: /\n'),
    [`${SITE}/`]: page(),
  });
  const r = await checkPermissions(`${SITE}/`, { fetch: f, timeoutMs: 200 });
  assert.equal(r.verdict, 'blocked');
  assert.ok(!f.calls.includes(`${SITE}/`));
});

test('CLI against a local server: exit 0 allowed, 1 on reservation, 2 on 5xx robots', async () => {
  // robots.txt always lives at the origin root, so each scenario swaps the root routes before a run.
  const scenarios = {
    ok: [200, 'User-agent: *\nDisallow:\n'],
    res: [200, 'User-agent: GPTBot\nDisallow: /\n'],
    err: [500, 'boom'],
  };
  let current = scenarios.ok;
  const server = createServer((req, res) => {
    if (req.url === '/robots.txt') res.writeHead(current[0]).end(current[1]);
    else if (req.url === '/page')
      res.writeHead(200, { 'content-type': 'text/html' }).end('<html></html>');
    else res.writeHead(404).end();
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const { port } = server.address();
  // spawnSync would block this event loop (and the server), so run the CLI asynchronously.
  const run = (name) => {
    current = scenarios[name];
    return new Promise((done) => {
      const c = spawn(process.execPath, [
        SCRIPT,
        `http://127.0.0.1:${port}/page`,
      ]);
      let out = '';
      c.stdout.on('data', (d) => (out += d));
      c.on('close', (code) => done({ code, out }));
    });
  };
  try {
    const ok = await run('ok');
    assert.equal(ok.code, 0, ok.out);
    const res = await run('res');
    assert.equal(res.code, 1, res.out);
    assert.match(res.out, /BLOCKED/);
    const err = await run('err');
    assert.equal(err.code, 2, err.out);
    assert.match(err.out, /CANNOT VERIFY/);
  } finally {
    server.closeAllConnections?.();
    await new Promise((done) => server.close(done));
  }
});

test('CLI --help exits 0 and a missing URL is a usage error', () => {
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--help']).status, 0);
  assert.equal(spawnSync(process.execPath, [SCRIPT]).status, 3);
});
