// Static security checks of the landing report, one fixture per rule (tasks 4.1 to 4.4).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { auditItem } from '../scripts/report/audit.mjs';
import {
  effectiveScriptPolicy,
  evaluateScriptPolicy,
  headersForPath,
  parseHeadersFile,
} from '../scripts/report/headers.mjs';
import { mask } from '../scripts/report/mask.mjs';
import { scanText } from '../scripts/report/source-scan.mjs';
import {
  ROOT,
  itemOf,
  makeSite,
  runReport,
  statusOf,
} from './report-fixture.mjs';

const sites = [];
const site = () => {
  const s = makeSite();
  sites.push(s);
  return s;
};
after(() => sites.forEach((s) => s.cleanup()));

/** Mutate a fresh clean site, run the static report and return its parsed report. */
async function reportAfter(mutate, args = []) {
  const s = site();
  await mutate(s);
  const result = await runReport(s, ['--only', 'static', ...args]);
  return { ...result, site: s };
}
const HEADERS = 'dist/_headers';
const dropLine = (s, rel, line) =>
  s.write(rel, s.read(rel).replace(new RegExp(`^.*${line}.*\\n`, 'm'), ''));

// --- 4.1 headers ---------------------------------------------------------------------------------------

test('_headers parser: patterns, splats, placeholders, joined values and detached headers', () => {
  const rules = parseHeadersFile(`# comment
/*
  X-Test: a
  Cache-Control: no-store
/docs/*
  X-Test: b
  ! Cache-Control
/:section/page
  X-Section: yes
`);
  assert.deepEqual(headersForPath(rules, '/'), {
    'x-test': 'a',
    'cache-control': 'no-store',
  });
  assert.deepEqual(headersForPath(rules, '/docs/x'), { 'x-test': 'a, b' });
  assert.deepEqual(headersForPath(rules, '/blog/page'), {
    'x-test': 'a',
    'cache-control': 'no-store',
    'x-section': 'yes',
  });
});

test('CSP evaluation: hashes pass, unsafe-inline alone and wildcard fail, hash keeps unsafe-inline ignored', () => {
  assert.equal(
    evaluateScriptPolicy("script-src 'self' 'sha256-AbC='").restricts,
    true,
  );
  assert.deepEqual(
    evaluateScriptPolicy("script-src 'self' 'sha256-AbC='").hashes,
    ["'sha256-AbC='"],
  );
  assert.equal(
    evaluateScriptPolicy("script-src 'self' 'unsafe-inline'").restricts,
    false,
  );
  assert.equal(
    evaluateScriptPolicy("script-src 'self' 'unsafe-inline' 'sha256-x='")
      .restricts,
    true,
  );
  assert.equal(evaluateScriptPolicy('script-src *').restricts, false);
  assert.equal(evaluateScriptPolicy("default-src 'self'").restricts, true);
  assert.equal(evaluateScriptPolicy("frame-ancestors 'self'").restricts, false);
  assert.equal(effectiveScriptPolicy([]).restricts, false);
  assert.equal(
    effectiveScriptPolicy(["frame-ancestors 'self'", "script-src 'self'"])
      .restricts,
    true,
  );
});

for (const [line, label] of [
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'Referrer-Policy'],
  ['Content-Security-Policy: frame-ancestors', 'frame-ancestors'],
]) {
  test(`a missing ${label} in _headers fails the baseline and names the line to add`, async () => {
    const { report, code } = await reportAfter((s) =>
      dropLine(s, HEADERS, line),
    );
    assert.equal(code, 1);
    const item = itemOf(report, 'headers-baseline');
    assert.equal(item.status, 'fail');
    assert.equal(item.owasp, 'A02');
    assert.ok(item.evidence.some((e) => e.endsWith('MISSING')));
    assert.match(item.fix, /X-Content-Type-Options: nosniff/);
  });
}

test('a missing _headers file fails the baseline', async () => {
  const { report, code } = await reportAfter((s) => s.remove(HEADERS));
  assert.equal(code, 1);
  assert.equal(statusOf(report, 'headers-baseline'), 'fail');
  assert.match(
    itemOf(report, 'headers-baseline').title,
    /dist\/_headers does not exist/,
  );
});

for (const [line, id] of [
  ['Strict-Transport-Security', 'headers-hsts'],
  ['Cross-Origin-Opener-Policy', 'headers-coop'],
  ['Permissions-Policy', 'headers-permissions'],
]) {
  test(`a missing ${line} warns (${id}) and does not fail the run`, async () => {
    const { report, code } = await reportAfter((s) =>
      dropLine(s, HEADERS, line),
    );
    assert.equal(code, 0);
    assert.equal(statusOf(report, id), 'warn');
    assert.match(itemOf(report, id).fix, new RegExp(line));
  });
}

test('no CSP in the pages or the headers warns that scripts are not restricted, pointing at the starter setup', async () => {
  const { report, code } = await reportAfter((s) => {
    for (const page of [
      'dist/index.html',
      'dist/about/index.html',
      'dist/404.html',
    ])
      s.write(
        page,
        s
          .read(page)
          .replace(
            /<meta[^>]*http-equiv="content-security-policy"[^>]*>/is,
            '',
          ),
      );
  });
  assert.equal(code, 0);
  const csp = itemOf(report, 'csp-scripts');
  assert.equal(csp.status, 'warn');
  assert.match(
    csp.title,
    /3 of 3 page\(s\) have no Content-Security-Policy that restricts scripts/,
  );
  assert.match(csp.fix, /security\.csp/);
  // The inline script is then not covered either.
  assert.equal(statusOf(report, 'inline-scripts'), 'warn');
});

test('a CSP meta tag with hashes passes, and covers the inline script', async () => {
  const { report } = await reportAfter(() => {});
  assert.equal(statusOf(report, 'csp-scripts'), 'pass');
  assert.equal(statusOf(report, 'inline-scripts'), 'pass');
  assert.match(
    itemOf(report, 'inline-scripts').title,
    /1 inline script\(s\) or handler\(s\): 1 covered by a CSP hash, 0 before the CSP meta tag, 0 not covered/,
  );
});

test("'unsafe-inline' without a hash warns, and so does an inline script whose hash is not in the CSP", async () => {
  const unsafe = await reportAfter((s) => {
    const page = 'dist/index.html';
    s.write(
      page,
      s
        .read(page)
        .replace(
          /script-src 'self' 'sha256-[^']+'/,
          "script-src 'self' 'unsafe-inline'",
        ),
    );
  });
  assert.equal(statusOf(unsafe.report, 'csp-scripts'), 'warn');
  assert.match(
    itemOf(unsafe.report, 'csp-scripts').evidence.join('\n'),
    /^\/:.*'unsafe-inline' with no hash or nonce/m,
  );

  const stale = await reportAfter((s) => {
    const page = 'dist/index.html';
    s.write(
      page,
      s.read(page).replace('window.__fixture = 1;', 'window.__fixture = 2;'),
    );
  });
  assert.equal(statusOf(stale.report, 'csp-scripts'), 'pass');
  assert.equal(statusOf(stale.report, 'inline-scripts'), 'warn');
});

test('an inline script before the CSP meta tag is listed as outside the policy, not as an injection point; a header CSP covers everything', async () => {
  const before = await reportAfter((s) => {
    const page = 'dist/about/index.html';
    s.write(
      page,
      s.read(page).replace('<meta', '<script>window.boot = 1;</script><meta'),
    );
  });
  const item = itemOf(before.report, 'inline-scripts');
  assert.equal(item.status, 'pass');
  assert.match(item.title, /1 before the CSP meta tag/);
  assert.match(
    item.evidence[0],
    /^\/about\/:\d+ inline <script> .* before the CSP <meta> tag/,
  );

  // With the policy in a response header there is no "before": the same script is simply uncovered.
  const header = await reportAfter((s) => {
    const page = 'dist/about/index.html';
    s.write(
      page,
      s.read(page).replace('<meta', '<script>window.boot = 1;</script><meta'),
    );
    s.write(
      HEADERS,
      `${s.read(HEADERS)}  Content-Security-Policy: script-src 'self'\n`,
    );
  });
  assert.equal(statusOf(header.report, 'inline-scripts'), 'warn');
});

// --- 4.2 dist scan ----------------------------------------------------------------------------------------

for (const file of [
  '.env',
  '.git/HEAD',
  'keys/site.pem',
  'deploy.key',
  'brief.json',
]) {
  test(`private file dist/${file} fails`, async () => {
    const { report, code } = await reportAfter((s) =>
      s.write(`dist/${file}`, 'x'),
    );
    assert.equal(code, 1);
    const item = itemOf(report, 'private-files');
    assert.equal(item.status, 'fail');
    assert.equal(item.owasp, 'A01');
    assert.ok(
      item.evidence.some((e) => e.startsWith(`dist/${file} `)),
      item.evidence.join(),
    );
    assert.match(item.fix, /public\//);
  });
}

test('source maps and package.json warn but do not fail', async () => {
  const { report, code } = await reportAfter((s) => {
    s.write('dist/_astro/app.js.map', '{}');
    s.write('dist/package.json', '{}');
  });
  assert.equal(code, 0);
  const item = itemOf(report, 'source-maps');
  assert.equal(item.status, 'warn');
  assert.deepEqual(
    item.evidence.map((e) => e.split(' ')[0]),
    ['dist/_astro/app.js.map', 'dist/package.json'],
  );
});

test('mixed content fails naming the page and the URL, and plain http:// links only warn', async () => {
  const { report, code } = await reportAfter((s) => {
    s.write(
      'dist/about/index.html',
      s
        .read('dist/about/index.html')
        .replace(
          '<h1>About</h1>',
          '<h1>About</h1><img src="http://cdn.example/pic.png" alt=""><a href="http://old.example/page">old</a>',
        ),
    );
  });
  assert.equal(code, 1);
  const mixed = itemOf(report, 'mixed-content');
  assert.equal(mixed.status, 'fail');
  assert.match(
    mixed.evidence[0],
    /^\/about\/:\d+ <img> http:\/\/cdn\.example\/pic\.png$/,
  );
  const links = itemOf(report, 'http-links');
  assert.equal(links.status, 'warn');
  assert.match(links.evidence[0], /\/about\/.*http:\/\/old\.example\/page/);
});

test('javascript: URLs fail', async () => {
  const { report, code } = await reportAfter((s) =>
    s.write(
      'dist/about/index.html',
      s
        .read('dist/about/index.html')
        .replace('<h1>About</h1>', '<a href="javascript:alert(1)">x</a>'),
    ),
  );
  assert.equal(code, 1);
  const item = itemOf(report, 'javascript-urls');
  assert.equal(item.status, 'fail');
  assert.match(
    item.evidence[0],
    /^\/about\/:\d+ <a href="javascript:\.\.\.">$/,
  );
});

test('an external script without integrity fails and an external stylesheet without it warns; with integrity both pass', async () => {
  const bad = await reportAfter((s) =>
    s.write(
      'dist/index.html',
      s
        .read('dist/index.html')
        .replace(
          '</head>',
          '<script src="https://cdn.example/lib.js"></script><link rel="stylesheet" href="https://fonts.example/css?family=X"></head>',
        ),
    ),
  );
  assert.equal(bad.code, 1);
  assert.equal(statusOf(bad.report, 'external-scripts-sri'), 'fail');
  assert.match(
    itemOf(bad.report, 'external-scripts-sri').evidence[0],
    /^\/:\d+ <script> https:\/\/cdn\.example\/lib\.js$/,
  );
  assert.equal(statusOf(bad.report, 'external-styles-sri'), 'warn');

  const good = await reportAfter((s) =>
    s.write(
      'dist/index.html',
      s
        .read('dist/index.html')
        .replace(
          '</head>',
          '<script src="https://cdn.example/lib.js" integrity="sha384-abc" crossorigin="anonymous"></script><link rel="stylesheet" href="https://fonts.example/a.css" integrity="sha384-def" crossorigin="anonymous"></head>',
        ),
    ),
  );
  assert.equal(statusOf(good.report, 'external-scripts-sri'), 'pass');
  assert.equal(statusOf(good.report, 'external-styles-sri'), 'pass');
});

test('the third-party origin inventory lists each origin with what it loads and where; more than the limit warns', async () => {
  const { report } = await reportAfter((s) =>
    s.write(
      'dist/index.html',
      s
        .read('dist/index.html')
        .replace(
          '</head>',
          [1, 2, 3, 4]
            .map(
              (n) =>
                `<script src="https://cdn${n}.example/a.js" integrity="sha384-x" crossorigin="anonymous"></script>`,
            )
            .join('') +
            '<link rel="preconnect" href="https://fonts.example"></head>',
        ),
    ),
  );
  const item = itemOf(report, 'third-party-origins');
  assert.equal(item.status, 'warn');
  assert.equal(item.evidence.length, 5);
  assert.ok(item.evidence.includes('https://cdn1.example (script) on /'));
  assert.ok(item.evidence.includes('https://fonts.example (preconnect) on /'));
  const clean = await reportAfter(() => {});
  assert.equal(statusOf(clean.report, 'third-party-origins'), 'pass');
  assert.deepEqual(itemOf(clean.report, 'third-party-origins').evidence, []);
});

test('broken internal links and assets fail naming the page and the link; a broken #fragment only warns', async () => {
  const { report, code } = await reportAfter((s) =>
    s.write(
      'dist/index.html',
      s
        .read('dist/index.html')
        .replace(
          '<h1>Fixture landing</h1>',
          '<h1>Fixture landing</h1><a href="/precios/">Precios</a><img src="/img/missing.png" alt=""><a href="/about/#nope">x</a>',
        ),
    ),
  );
  assert.equal(code, 1);
  const item = itemOf(report, 'broken-links');
  assert.equal(item.status, 'fail');
  assert.ok(
    item.evidence.some((e) => /^\/:\d+ <a> \/precios\/$/.test(e)),
    item.evidence.join(),
  );
  assert.ok(item.evidence.some((e) => /<img> \/img\/missing\.png$/.test(e)));
  const anchors = itemOf(report, 'broken-anchors');
  assert.equal(anchors.status, 'warn');
  assert.match(anchors.evidence[0], /\/about\/#nope/);
});

test('target="_blank" without noopener warns', async () => {
  const { report, code } = await reportAfter((s) =>
    s.write(
      'dist/index.html',
      s
        .read('dist/index.html')
        .replace(
          'target="_blank" rel="noopener noreferrer"',
          'target="_blank"',
        ),
    ),
  );
  assert.equal(code, 0);
  const item = itemOf(report, 'target-blank');
  assert.equal(item.status, 'warn');
  assert.match(
    item.evidence[0],
    /^\/:\d+ <a href="https:\/\/example\.org\/">$/,
  );
});

test('a missing 404.html warns', async () => {
  const { report, code } = await reportAfter((s) => s.remove('dist/404.html'));
  assert.equal(code, 0);
  assert.equal(statusOf(report, 'error-page'), 'warn');
});

test('forms: one posting to a third party warns (A06), a password input warns (A07), a local form passes', async () => {
  const third = await reportAfter((s) =>
    s.write(
      'dist/about/index.html',
      s
        .read('dist/about/index.html')
        .replace(
          '<h1>About</h1>',
          '<form action="https://forms.example/submit" method="post"></form>',
        ),
    ),
  );
  assert.equal(statusOf(third.report, 'forms'), 'warn');
  assert.match(
    itemOf(third.report, 'forms').evidence[0],
    /^\/about\/:\d+ <form action="https:\/\/forms\.example\/submit">$/,
  );
  assert.equal(itemOf(third.report, 'forms').owasp, 'A06');
  const local = await reportAfter((s) =>
    s.write(
      'dist/about/index.html',
      s
        .read('dist/about/index.html')
        .replace('<h1>About</h1>', '<form action="/about/"></form>'),
    ),
  );
  assert.equal(statusOf(local.report, 'forms'), 'pass');
});

// --- 4.3 source scan and secrets ------------------------------------------------------------------------------

// Fake credentials are assembled at runtime so no file of the repo holds a string that looks like a real token.
const fakeGithub = () => 'ghp_' + 'A1b2C3d4'.repeat(5);
const fakePem = () => '-----BEGIN ' + 'RSA PRIVATE KEY-----';
const fakeAws = () => 'AKIA' + 'IOSFODNN7EXAMPLE';
const fakeStripe = () => 'sk_' + 'live_' + 'Z9y8X7w6V5u4T3s2R1q0';
const fakeGeneric = () => 'Zq8vK2mP9xL4nB7cD1fG5hJ3';

test('injection sinks in the source warn with file and line; comments are skipped', async () => {
  const { report, code } = await reportAfter((s) => {
    s.write(
      'src/components/Rich.astro',
      [
        '---',
        'const html = "<b>x</b>";',
        '---',
        '<div set:html={html} />',
        '<script>',
        '  document.body.innerHTML = "x";',
        '  // innerHTML in a comment',
        '  eval("1");',
        '</script>',
      ].join('\n'),
    );
  });
  assert.equal(code, 0);
  const item = itemOf(report, 'injection-sinks');
  assert.equal(item.status, 'warn');
  assert.deepEqual(item.evidence, [
    'sites/fixture/src/components/Rich.astro:4 set:html',
    'sites/fixture/src/components/Rich.astro:6 innerHTML',
    'sites/fixture/src/components/Rich.astro:8 eval',
  ]);
});

test('secret patterns: provider keys fail with file, line and pattern name, the generic pattern only warns', async () => {
  const { report, code } = await reportAfter((s) => {
    s.write(
      'src/data/config.ts',
      `export const token = '${fakeGithub()}';\nexport const aws = "${fakeAws()}";\nexport const stripe = '${fakeStripe()}';\n`,
    );
    s.write('notes/key.txt', `${fakePem()}\nabc\n`);
    s.write(
      'src/data/generic.ts',
      `export const apiKey = '${fakeGeneric()}';\n`,
    );
  });
  assert.equal(code, 1);
  const secrets = itemOf(report, 'secrets');
  assert.equal(secrets.status, 'fail');
  assert.equal(secrets.owasp, 'A04');
  const evidence = secrets.evidence.join('\n');
  assert.match(
    evidence,
    /sites\/fixture\/src\/data\/config\.ts:1 GitHub token ghp_\.\.\. \(44 chars\)/,
  );
  assert.match(
    evidence,
    /config\.ts:2 AWS access key id AKIA\.\.\. \(20 chars\)/,
  );
  assert.match(evidence, /config\.ts:3 Stripe live key sk_l\.\.\./);
  assert.match(
    evidence,
    /notes\/key\.txt:1 private key ----\.\.\. \(31 chars\)/,
  );
  assert.ok(!evidence.includes('generic.ts'));
  const generic = itemOf(report, 'secrets-generic');
  assert.equal(generic.status, 'warn');
  assert.match(generic.evidence[0], /generic\.ts:1 Zq8v\.\.\. \(24 chars\)/);

  // Only the generic pattern: warns, exit 0.
  const only = await reportAfter((s) =>
    s.write(
      'src/data/generic.ts',
      `export const apiKey = '${fakeGeneric()}';\n`,
    ),
  );
  assert.equal(only.code, 0);
  assert.equal(statusOf(only.report, 'secrets'), 'pass');
  assert.equal(statusOf(only.report, 'secrets-generic'), 'warn');
});

test('secrets are found in the build too, and placeholders do not count', async () => {
  const { report } = await reportAfter((s) => {
    s.write('dist/_astro/leak.js', `var t="${fakeGithub()}";`);
    s.write(
      'src/data/example.ts',
      `export const password = 'your-password-goes-here-please';\n`,
    );
  });
  assert.match(
    itemOf(report, 'secrets').evidence.join('\n'),
    /sites\/fixture\/dist\/_astro\/leak\.js:1 GitHub token/,
  );
  assert.equal(statusOf(report, 'secrets-generic'), 'pass');
});

test('.env files in the site folder fail even though git ignores them; .env.example does not', async () => {
  const { report, code } = await reportAfter((s) => {
    s.write('.env', 'FOO=bar\n');
    s.write('.env.local', 'FOO=bar\n');
    s.write('.env.example', 'FOO=\n');
  });
  assert.equal(code, 1);
  const evidence = itemOf(report, 'secrets').evidence;
  assert.equal(itemOf(report, 'secrets').status, 'fail');
  assert.ok(evidence.some((e) => e.startsWith('sites/fixture/.env ')));
  assert.ok(evidence.some((e) => e.startsWith('sites/fixture/.env.local ')));
  assert.ok(!evidence.some((e) => e.includes('.env.example')));
});

test('mask() keeps four characters and the length; scanText never returns the raw value', () => {
  assert.equal(mask('ghp_abcdefghijklmnop'), 'ghp_... (20 chars)');
  assert.equal(mask(''), '(empty)');
  const token = fakeGithub();
  const hits = scanText(`const t = "${token}";`);
  assert.equal(hits.length, 1);
  assert.ok(!JSON.stringify(hits).includes(token));
});

test('a fake token never appears in stdout, stderr, report.json or report.md (run as a process)', () => {
  const s = site();
  const token = fakeGithub();
  const aws = fakeAws();
  s.write(
    'src/data/config.ts',
    `export const t = '${token}';\nexport const a = '${aws}';\n`,
  );
  const result = spawnSync(
    process.execPath,
    [
      'scripts/landing-report.mjs',
      '--site',
      'fixture',
      '--only',
      'static',
      '--skip',
      'audit',
      '--qa',
      s.qaFile,
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, LANDING_FACTORY_ROOT: s.root },
    },
  );
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const dir = join(s.root, 'qa/fixture/report');
  const run = readdirSync(dir).find((n) => n !== 'latest');
  const written = [
    join(dir, run, 'report.json'),
    join(dir, run, 'report.md'),
  ].map((f) => readFileSync(f, 'utf8'));
  for (const text of [result.stdout, result.stderr, ...written]) {
    assert.ok(!text.includes(token), 'token leaked');
    assert.ok(!text.includes(aws), 'aws key leaked');
  }
  assert.match(written[1], /GitHub token ghp_\.\.\. \(44 chars\)/);
});

// --- 4.4 npm audit ------------------------------------------------------------------------------------------------

const vuln = (name, severity, ghsa, extra = {}) => ({
  name,
  severity,
  via: [
    {
      source: 1,
      name,
      title: `${name} problem`,
      url: `https://github.com/advisories/${ghsa}`,
      severity,
      range: '<2.0.0',
    },
  ],
  fixAvailable: { name, version: '2.0.0', isSemVerMajor: false },
  ...extra,
});
const auditJson = (vulnerabilities) =>
  JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: { total: Object.keys(vulnerabilities).length },
      dependencies: { prod: 12 },
    },
  });
const runner =
  (stdout, code = 0, stderr = '') =>
  async () => ({ code, stdout, stderr });

test('npm audit: a critical advisory fails naming the package, the advisory and the fixed version', async () => {
  const item = await auditItem({
    root: '.',
    site: 'fixture',
    runner: runner(
      auditJson({ badpkg: vuln('badpkg', 'critical', 'GHSA-aaaa-bbbb-cccc') }),
      1,
    ),
  });
  assert.equal(item.status, 'fail');
  assert.equal(item.owasp, 'A03');
  assert.match(
    item.evidence[0],
    /badpkg <2\.0\.0 critical: badpkg problem \(GHSA-aaaa-bbbb-cccc; fix: badpkg@2\.0\.0\)/,
  );
});

test('npm audit: moderate warns, an ignored advisory warns with its reason, a clean audit passes', async () => {
  const moderate = await auditItem({
    root: '.',
    runner: runner(
      auditJson({ m: vuln('m', 'moderate', 'GHSA-mmmm-mmmm-mmmm') }),
      1,
    ),
  });
  assert.equal(moderate.status, 'warn');
  const ignored = await auditItem({
    root: '.',
    ignore: [{ id: 'GHSA-aaaa-bbbb-cccc', reason: 'dev server only' }],
    runner: runner(
      auditJson({ badpkg: vuln('badpkg', 'high', 'GHSA-aaaa-bbbb-cccc') }),
      1,
    ),
  });
  assert.equal(ignored.status, 'warn');
  assert.match(
    ignored.evidence[0],
    /^IGNORED badpkg .* - reason: dev server only$/,
  );
  const clean = await auditItem({ root: '.', runner: runner(auditJson({})) });
  assert.equal(clean.status, 'pass');
  assert.match(clean.title, /0 advisories .* \(12 packages\)/);
  // A high advisory next to an ignored one still fails.
  const mixed = await auditItem({
    root: '.',
    ignore: [{ id: 'GHSA-aaaa-bbbb-cccc', reason: 'x' }],
    runner: runner(
      auditJson({
        a: vuln('a', 'high', 'GHSA-aaaa-bbbb-cccc'),
        b: vuln('b', 'high', 'GHSA-bbbb-bbbb-bbbb'),
      }),
      1,
    ),
  });
  assert.equal(mixed.status, 'fail');
});

test('npm audit: a network error or ENOAUDIT is not run, never a pass', async () => {
  const enoaudit = await auditItem({
    root: '.',
    runner: runner(
      JSON.stringify({
        error: {
          code: 'ENOAUDIT',
          summary: 'Audit endpoint returned an error',
        },
      }),
      1,
    ),
  });
  assert.equal(enoaudit.status, 'not-run');
  const offline = await auditItem({
    root: '.',
    runner: runner(
      '',
      1,
      'npm error code ENOTFOUND\nnpm error network request failed',
    ),
  });
  assert.equal(offline.status, 'not-run');
  assert.match(offline.evidence[0], /ENOTFOUND/);
  const crashed = await auditItem({
    root: '.',
    runner: runner('', -1, 'spawn npm ENOENT'),
  });
  assert.equal(crashed.status, 'not-run');
});

test('npm audit arguments: a site workspace, or the root package for the starter', async () => {
  const seen = [];
  const spy = async (args) => (
    seen.push(args),
    { code: 0, stdout: auditJson({}), stderr: '' }
  );
  await auditItem({ root: '.', site: 'tienda', runner: spy });
  await auditItem({ root: '.', runner: spy });
  assert.deepEqual(seen[0], [
    'audit',
    '--omit=dev',
    '--json',
    '--workspace=site-tienda',
  ]);
  assert.deepEqual(seen[1], [
    'audit',
    '--omit=dev',
    '--json',
    '--workspaces=false',
  ]);
});

test('a report run uses the injected audit runner and records the item', async () => {
  const s = site();
  const { report, code } = await runReport(s, ['--only', 'static'], {
    runner: runner(
      auditJson({ badpkg: vuln('badpkg', 'critical', 'GHSA-aaaa-bbbb-cccc') }),
      1,
    ),
  });
  assert.equal(code, 1);
  assert.equal(statusOf(report, 'npm-audit'), 'fail');
  assert.equal(statusOf(report, 'lockfile'), 'pass');
});
