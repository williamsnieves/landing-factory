// scripts/handoff.mjs: the preflight (`check`) and the owner's checklist (`plan`) on fixture factories.
// No network, nothing is written; fake secret values are built at runtime and must never appear in the output.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
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

import { main, siteUrlOfConfig } from '../scripts/handoff.mjs';
import {
  ROOT,
  capture,
  randomToken,
  sharedConfig,
  vercelConfig,
  vpsConfig,
} from './deploy-helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'lf-handoff-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const put = (base, file, content) => {
  mkdirSync(dirname(join(base, file)), { recursive: true });
  writeFileSync(join(base, file), content);
};

const astroConfig = (site) =>
  `import { defineConfig } from 'astro/config';\nexport default defineConfig({\n  output: 'static',\n${site ? `  site: '${site}',\n` : ''}});\n`;

/** A factory root with one pruned site. */
function factory({
  slug = 'acme',
  config = vercelConfig(),
  site = 'https://example.com',
  brief,
  exported = false,
  layers = false,
} = {}) {
  const root = mkdtempSync(join(tmp, 'root-'));
  const dir = join(root, 'sites', slug);
  put(dir, 'package.json', JSON.stringify({ name: `site-${slug}` }));
  put(dir, 'src/pages/index.astro', '---\n---\n<h1>Home</h1>\n');
  put(dir, 'astro.config.mjs', astroConfig(site));
  if (config) put(dir, 'site.config.json', JSON.stringify(config));
  if (brief) put(dir, 'brief.json', JSON.stringify(brief));
  if (exported) put(dir, 'EXPORTED.json', '{}');
  if (layers) put(dir, 'src/components/legal/LegalNotice.astro', '<p />\n');
  return { root, dir };
}

const run = (root, argv) => {
  const c = capture();
  const code = main(argv, c.io, root);
  return { code, out: c.out.join('\n'), err: c.err.join('\n'), all: c.all() };
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

// --- check -------------------------------------------------------------------------------------------------

test('check: a pruned, unexported site with a valid Vercel configuration and a matching domain is ready', () => {
  const { root } = factory({
    brief: { deploy: { target: 'vercel', domain: 'example.com' } },
  });
  const r = run(root, ['check', '--site', 'acme']);
  assert.equal(r.code, 0, r.all);
  assert.match(r.out, /acme: ready to hand off/);
});

test('check: a missing site, an exported site and an unused layer are named', () => {
  const { root } = factory();
  const missing = run(root, ['check', '--site', 'nosuch']);
  assert.equal(missing.code, 1);
  assert.match(missing.out, /no site "nosuch"/);

  const exported = factory({ exported: true });
  const e = run(exported.root, ['check', '--site', 'acme']);
  assert.equal(e.code, 1);
  assert.match(e.out, /problem \[exported\].*EXPORTED\.json/);

  const layered = factory({ layers: true });
  const l = run(layered.root, ['check', '--site', 'acme']);
  assert.equal(l.code, 1);
  assert.match(l.out, /problem \[unused-layer\].*site-layers\.mjs prune/);
});

test('check: an invalid site.config.json names its field, and so does a missing one', () => {
  const { root } = factory({ config: { target: 'vercel' } });
  const r = run(root, ['check', '--site', 'acme']);
  assert.equal(r.code, 1);
  assert.match(r.out, /problem \[site-config\].*vercel/);
  const none = factory({ config: null });
  assert.match(
    run(none.root, ['check', '--site', 'acme']).out,
    /site\.config\.json does not exist/,
  );
});

test('check: no site URL exits 1 and names `site`; a non-https one is refused too', () => {
  const { root } = factory({ site: null });
  const r = run(root, ['check', '--site', 'acme']);
  assert.equal(r.code, 1);
  assert.match(r.out, /problem \[site-url\]: site is missing/);
  const plain = factory({ site: 'http://example.com' });
  assert.match(
    run(plain.root, ['check', '--site', 'acme']).out,
    /not an absolute https URL/,
  );
});

test('check: the brief domain must be the host of site (or its www twin)', () => {
  const bad = factory({
    brief: { deploy: { target: 'vercel', domain: 'other.com' } },
  });
  const r = run(bad.root, ['check', '--site', 'acme']);
  assert.equal(r.code, 1);
  assert.match(r.out, /problem \[domain-mismatch\].*other\.com.*example\.com/);
  for (const [site, domain] of [
    ['https://www.example.com', 'example.com'],
    ['https://example.com', 'www.example.com'],
    ['https://example.com', 'Example.com'],
  ]) {
    const ok = factory({ site, brief: { deploy: { domain } } });
    assert.equal(run(ok.root, ['check', '--site', 'acme']).code, 0, domain);
  }
});

test('check: the default cloudflare target while the brief names another is a problem; undecided is not', () => {
  const cf = { cloudflare: { pagesProject: 'acme', productionBranch: 'main' } };
  const bad = factory({
    config: cf,
    brief: { deploy: { target: 'vercel', domain: '' } },
  });
  const r = run(bad.root, ['check', '--site', 'acme']);
  assert.equal(r.code, 1);
  assert.match(r.out, /problem \[target-mismatch\].*vercel.*"cloudflare"/);
  const undecided = factory({
    config: cf,
    brief: { deploy: { target: 'undecided', domain: '' } },
  });
  assert.equal(run(undecided.root, ['check', '--site', 'acme']).code, 0);
  const netlify = factory({
    config: cf,
    brief: { deploy: { target: 'netlify', domain: '' } },
  });
  assert.match(
    run(netlify.root, ['check', '--site', 'acme']).out,
    /netlify is not supported/,
  );
});

test('check: every problem is listed in one run', () => {
  const { root } = factory({
    site: null,
    layers: true,
    exported: true,
    brief: { deploy: { target: 'vercel', domain: 'example.com' } },
    config: { cloudflare: { pagesProject: 'acme' } },
  });
  const r = run(root, ['check', '--site', 'acme']);
  assert.equal(r.code, 1);
  for (const id of ['exported', 'unused-layer', 'site-url', 'target-mismatch'])
    assert.match(r.out, new RegExp(`problem \\[${id}\\]`));
  assert.match(r.out, /not ready, 4 problem\(s\)/);
});

test('check: --visibility public with a brief warns, private does not, and the exit stays 0', () => {
  const { root } = factory({
    brief: { deploy: { target: 'vercel', domain: 'example.com' } },
  });
  const pub = run(root, ['check', '--site', 'acme', '--visibility', 'public']);
  assert.equal(pub.code, 0);
  assert.match(pub.out, /warning \[public-brief\].*--no-brief/);
  const priv = run(root, [
    'check',
    '--site',
    'acme',
    '--visibility',
    'private',
  ]);
  assert.ok(!/warning/.test(priv.out));
  const noBrief = factory();
  assert.ok(
    !/warning/.test(
      run(noBrief.root, ['check', '--site', 'acme', '--visibility', 'public'])
        .out,
    ),
  );
});

test('check: --json has the site, ready, problems and warnings', () => {
  const { root } = factory({ site: null, brief: { deploy: {} } });
  const r = run(root, [
    'check',
    '--site',
    'acme',
    '--visibility',
    'public',
    '--json',
  ]);
  assert.equal(r.code, 1);
  const json = JSON.parse(r.out);
  assert.equal(json.site, 'acme');
  assert.equal(json.ready, false);
  assert.deepEqual(
    json.problems.map((p) => p.id),
    ['site-url'],
  );
  assert.deepEqual(
    json.warnings.map((w) => w.id),
    ['public-brief'],
  );
});

test('bad usage exits 2: no command, unknown command, bad slug, bad visibility, plan without its options', () => {
  const { root } = factory();
  const bad = [
    [],
    ['bogus', '--site', 'acme'],
    ['check'],
    ['check', '--site', 'Bad_Slug'],
    ['check', '--site', '../acme'],
    ['check', '--site', 'acme', '--visibility', 'secret'],
    ['check', '--site', 'acme', '--repo', 'a/b'],
    ['check', '--site', 'acme', '--nope'],
    ['plan', '--site', 'acme', '--visibility', 'public'],
    ['plan', '--site', 'acme', '--repo', 'no-slash', '--visibility', 'public'],
    ['plan', '--site', 'acme', '--repo', 'a/b'],
    [
      'plan',
      '--site',
      'acme',
      '--repo',
      'a/b',
      '--visibility',
      'public',
      '--old-host',
      '$(x)',
    ],
  ];
  for (const argv of bad) {
    const r = run(root, argv);
    assert.equal(r.code, 2, argv.join(' '));
    assert.match(r.err, /Usage:/);
  }
  assert.equal(run(root, ['--help']).code, 0);
});

test('the commands change no file', () => {
  const { root } = factory({
    brief: { deploy: { target: 'vercel', domain: 'example.com' } },
  });
  const before = tree(root);
  run(root, ['check', '--site', 'acme', '--visibility', 'public']);
  run(root, [
    'plan',
    '--site',
    'acme',
    '--repo',
    'me/acme',
    '--visibility',
    'public',
  ]);
  assert.deepEqual(tree(root), before);
});

test('the real CLI honors LANDING_FACTORY_ROOT and sets the exit code', () => {
  const { root } = factory();
  const ok = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts/handoff.mjs'), 'check', '--site', 'acme'],
    { encoding: 'utf8', env: { ...process.env, LANDING_FACTORY_ROOT: root } },
  );
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const usage = spawnSync(
    process.execPath,
    [join(ROOT, 'scripts/handoff.mjs'), 'check'],
    { encoding: 'utf8', env: { ...process.env, LANDING_FACTORY_ROOT: root } },
  );
  assert.equal(usage.status, 2);
});

test('siteUrlOfConfig reads a literal site and ignores comments', () => {
  assert.equal(
    siteUrlOfConfig(astroConfig('https://a.test')),
    'https://a.test',
  );
  assert.equal(
    siteUrlOfConfig("// site: 'https://old.test',\nexport default {};\n"),
    null,
  );
  assert.equal(
    siteUrlOfConfig('export default { site: process.env.X };'),
    null,
  );
});

// --- plan --------------------------------------------------------------------------------------------------

const plan = (root, extra = [], repo = 'me/acme') =>
  run(root, [
    'plan',
    '--site',
    'acme',
    '--repo',
    repo,
    '--visibility',
    'private',
    ...extra,
  ]);

test('plan: a Vercel site on the apex keeps the apex, leaves "redirect apex to www" unchecked and redirects www with a 308', () => {
  const { root } = factory({ site: 'https://example.com' });
  const r = plan(root);
  assert.equal(r.code, 0, r.all);
  assert.match(r.out, /`VERCEL_TOKEN`/);
  assert.match(r.out, /Keep `example\.com` as the production domain/);
  assert.match(r.out, /"redirect apex to www" unchecked/);
  assert.match(
    r.out,
    /Add `www\.example\.com` too.*redirect to `example\.com`.*\(308\)/,
  );
});

test('plan: a Vercel site on www reverses the direction', () => {
  const { root } = factory({ site: 'https://www.example.com' });
  const r = plan(root);
  assert.match(r.out, /Keep `www\.example\.com` as the production domain/);
  assert.match(r.out, /"redirect www to apex" unchecked/);
  assert.match(
    r.out,
    /Add `example\.com` too.*redirect to `www\.example\.com`.*\(308\)/,
  );
});

test('plan: Cloudflare names its two secrets and the Pages custom-domain step', () => {
  const { root } = factory({
    config: {
      cloudflare: { pagesProject: 'acme-pages', productionBranch: 'main' },
    },
  });
  const r = plan(root);
  assert.match(r.out, /`CLOUDFLARE_API_TOKEN`: .*Cloudflare Pages/);
  assert.match(r.out, /`CLOUDFLARE_ACCOUNT_ID`/);
  assert.match(r.out, /Custom domains > Set up a custom domain/);
  assert.match(r.out, /acme-pages/);
  assert.match(r.out, /Redirect Rule/);
});

test('plan: VPS names DEPLOY_SSH_KEY, the server and the optional Cloudflare preview secrets; shared names its own', () => {
  const vps = plan(factory({ config: vpsConfig() }).root);
  assert.match(vps.out, /`DEPLOY_SSH_KEY`/);
  assert.match(vps.out, /203\.0\.113\.10/);
  assert.match(vps.out, /Optional, for per-branch previews/);
  assert.match(vps.out, /deploy\.mjs --site acme --dry-run/);
  const shared = plan(factory({ config: sharedConfig() }).root);
  assert.match(shared.out, /`DEPLOY_SSH_KEY`/);
  assert.match(shared.out, /domains\/acme\.example\/public_html/);
  const ftps = plan(
    factory({ config: sharedConfig({ protocol: 'ftps', port: 21 }) }).root,
  );
  assert.match(ftps.out, /`DEPLOY_FTP_PASSWORD`/);
});

test('plan: the first-run, DNS, check and cleanup sections are there, and --old-host is named', () => {
  const { root } = factory();
  const r = plan(root, ['--old-host', 'Netlify']);
  for (const heading of [
    '## 1. Repository',
    '## 2. Secrets',
    '## 3. First runs',
    '## 4. Domain',
    '## 5. Where the DNS really lives',
    '## 6. Check',
    '## 7. Cleanup',
  ])
    assert.ok(r.out.includes(heading), heading);
  assert.match(r.out, /empty: no README/);
  assert.match(r.out, /Claude GitHub App/);
  assert.match(r.out, /Actions > CI > Run workflow\*\* on the `main` branch/);
  assert.match(r.out, /name servers/);
  assert.match(r.out, /nsone\.net/);
  assert.match(r.out, /remove it from the old host \(Netlify\)/);
});

test('plan: "Fix before handing off" lists the check problems and the exit code is 1', () => {
  const { root } = factory({ site: null, exported: true });
  const r = plan(root);
  assert.equal(r.code, 1);
  const fix = r.out.slice(
    r.out.indexOf('## Fix before handing off'),
    r.out.indexOf('## 1. Repository'),
  );
  assert.match(fix, /EXPORTED\.json/);
  assert.match(fix, /site is missing/);
  assert.match(r.out, /`site` is not set/);
  const broken = factory({ config: { target: 'vercel' } });
  const b = plan(broken.root);
  assert.equal(b.code, 1);
  assert.match(b.out, /Fix before handing off/);
  assert.ok(!b.out.includes('## 1. Repository'));
});

test('plan: public visibility with a brief warns in the plan', () => {
  const { root } = factory({ brief: { deploy: {} } });
  const r = run(root, [
    'plan',
    '--site',
    'acme',
    '--repo',
    'me/acme',
    '--visibility',
    'public',
  ]);
  assert.match(r.out, /## Warnings[\s\S]*--no-brief/);
});

test('plan: secret values set in the environment never appear in the output', () => {
  const values = [
    'VERCEL_TOKEN',
    'DEPLOY_SSH_KEY',
    'CLOUDFLARE_API_TOKEN',
    'DEPLOY_FTP_PASSWORD',
  ].map((name) => [name, randomToken('s3')]);
  const saved = { ...process.env };
  try {
    for (const [name, value] of values) process.env[name] = value;
    for (const config of [vercelConfig(), vpsConfig(), sharedConfig()]) {
      const { root } = factory({ config });
      const outputs = [
        plan(root).all,
        run(root, ['check', '--site', 'acme', '--json']).all,
      ].join('\n');
      for (const [, value] of values)
        assert.ok(!outputs.includes(value), 'a secret value was printed');
    }
  } finally {
    for (const [name] of values)
      if (name in saved) process.env[name] = saved[name];
      else delete process.env[name];
  }
});

test('plan: the Markdown passes Prettier for every target', async () => {
  for (const config of [
    vercelConfig(),
    { cloudflare: { pagesProject: 'acme', productionBranch: 'main' } },
    vpsConfig(),
    sharedConfig(),
  ]) {
    const { root } = factory({ config });
    const out = plan(root, ['--old-host', 'Netlify']).out;
    const formatted = await prettier.format(`${out}\n`, { parser: 'markdown' });
    assert.equal(`${out}\n`, formatted);
  }
  const broken = factory({ site: null, exported: true, brief: { deploy: {} } });
  const out = run(broken.root, [
    'plan',
    '--site',
    'acme',
    '--repo',
    'me/acme',
    '--visibility',
    'public',
  ]).out;
  assert.equal(
    `${out}\n`,
    await prettier.format(`${out}\n`, { parser: 'markdown' }),
  );
});

// --- skill and settings --------------------------------------------------------------------------------------

test('the landing-handoff skill names its commands, its stop rules and the refresh procedure', () => {
  const skill = readFileSync(
    join(ROOT, '.claude/skills/landing-handoff/SKILL.md'),
    'utf8',
  );
  assert.match(skill, /^---\nname: landing-handoff\n/);
  for (const text of [
    'node scripts/handoff.mjs check',
    'node scripts/handoff.mjs plan',
    'npm run export',
    '--record',
    '--site-url',
    'Never ask for a secret in chat',
    'Never call `create_repository`',
    'Never change DNS',
    'Refreshing an already exported repository',
    '.github/workflows/ci.yml',
  ])
    assert.ok(skill.includes(text), text);
});

test('settings allow the read-only handoff script and the npm script exists', () => {
  const settings = JSON.parse(
    readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'),
  );
  assert.ok(
    settings.permissions.allow.includes('Bash(node scripts/handoff.mjs *)'),
  );
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.handoff, 'node scripts/handoff.mjs');
});
