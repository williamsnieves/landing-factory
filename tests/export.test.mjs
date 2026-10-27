// npm run export: the import closure, the exported package.json, the workflow and README templates and the
// CLI against a fixture factory. No network: exports run with --no-lockfile; credentials are built at runtime.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { after, test } from 'node:test';

import { main as exportMain, ENTRY_POINTS } from '../scripts/export.mjs';
import {
  ClosureError,
  findImports,
  importClosure,
} from '../scripts/export/closure.mjs';
import {
  PackageError,
  buildPackageJson,
  lockedVersion,
  needsWrangler,
} from '../scripts/export/package.mjs';
import {
  readTemplate,
  renderReadme,
  singleSiteGuide,
} from '../scripts/export/readme.mjs';
import { resolveConfig } from '../scripts/deploy/config.mjs';
import { ROOT, capture, vercelConfig, vpsConfig } from './deploy-helpers.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'lf-export-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
let counter = 0;
const fresh = (name) => join(tmp, `${name}-${counter++}`);

const put = (base, file, content = 'x') => {
  mkdirSync(dirname(join(base, file)), { recursive: true });
  writeFileSync(join(base, file), content);
};
const listFiles = (dir, base = dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listFiles(join(dir, entry.name), base)
      : [relative(base, join(dir, entry.name)).split('\\').join('/')],
  );

// --- 2.1 closure -----------------------------------------------------------------------

test('closure: the real entry points reach QA, report, deploy and lib modules and nothing else', () => {
  const files = importClosure({ root: ROOT, entries: ENTRY_POINTS });
  for (const needed of [
    'scripts/qa.mjs',
    'scripts/qa/config.mjs',
    'scripts/qa/lighthouse.mjs',
    'scripts/qa/site.mjs',
    'scripts/landing-report.mjs',
    'scripts/report/legal.mjs',
    'scripts/report/source-scan.mjs',
    'scripts/report/mask.mjs',
    'scripts/deploy.mjs',
    'scripts/deploy/config.mjs',
    'scripts/deploy/vercel.mjs',
    'scripts/deploy/rsync.mjs',
    'scripts/deploy/ftps.mjs',
    'scripts/lib/sites.mjs',
    'scripts/lib/brief-schema.mjs',
    'scripts/lib/proxy.mjs',
    'scripts/parse-wrangler-output.mjs',
  ])
    assert.ok(files.includes(needed), `${needed} is in the closure`);
  for (const file of files) {
    assert.ok(file.startsWith('scripts/'), file);
    assert.ok(!file.startsWith('scripts/mcp/'), file);
    assert.ok(!file.includes('.claude'), file);
    assert.ok(!file.startsWith('tests/'), file);
  }
  assert.deepEqual(files, [...files].sort());
});

test('closure: every file in it is read by following imports (a module nobody imports is absent)', () => {
  const files = importClosure({ root: ROOT, entries: ENTRY_POINTS });
  for (const absent of [
    'scripts/new-site.mjs',
    'scripts/check-landing.mjs',
    'scripts/ai-images.mjs',
    'scripts/export.mjs',
  ])
    assert.ok(!files.includes(absent), absent);
});

test('closure: an import that leaves scripts/ fails naming it', () => {
  const root = fresh('closure-out');
  put(root, 'scripts/a.mjs', "import { x } from '../outside.mjs';\n");
  put(root, 'outside.mjs', 'export const x = 1;\n');
  assert.throws(
    () => importClosure({ root, entries: ['scripts/a.mjs'] }),
    (error) =>
      error instanceof ClosureError &&
      error.specifier === '../outside.mjs' &&
      error.importer === 'scripts/a.mjs' &&
      /outside scripts\//.test(error.message),
  );
});

test('closure: a non-literal import() fails; a literal one is followed', () => {
  const root = fresh('closure-dyn');
  put(root, 'scripts/a.mjs', 'const m = await import(`./${name}.mjs`);\n');
  assert.throws(
    () => importClosure({ root, entries: ['scripts/a.mjs'] }),
    (error) =>
      error instanceof ClosureError &&
      /not a string literal/.test(error.message),
  );
  put(root, 'scripts/b.mjs', "const m = await import('./c.mjs');\n");
  put(root, 'scripts/c.mjs', 'export const c = 1;\n');
  assert.deepEqual(importClosure({ root, entries: ['scripts/b.mjs'] }), [
    'scripts/b.mjs',
    'scripts/c.mjs',
  ]);
});

test('closure: multi-line imports, re-exports and side-effect imports are followed; comments and packages are not', () => {
  const source = `// import { z } from './commented.mjs';
/**
 * import { y } from './doc.mjs'
 */
import { createHash } from 'node:crypto';
import playwright from 'playwright';
import {
  a,
  b,
} from './multi.mjs';
export * from './reexport.mjs';
import './side.mjs';
const url = 'https://example.com/x';
const later = await import("./lazy.mjs");
`;
  const found = findImports(source);
  assert.deepEqual(found.specifiers.sort(), [
    './lazy.mjs',
    './multi.mjs',
    './reexport.mjs',
    './side.mjs',
  ]);
  assert.deepEqual(found.dynamic, []);
});

test('closure: a missing relative import fails naming it', () => {
  const root = fresh('closure-missing');
  put(root, 'scripts/a.mjs', "import './gone.mjs';\n");
  assert.throws(
    () => importClosure({ root, entries: ['scripts/a.mjs'] }),
    (error) =>
      error instanceof ClosureError && error.specifier === './gone.mjs',
  );
});

// --- 2.2 package.json ------------------------------------------------------------------

const lock = {
  packages: {
    '': {},
    'node_modules/astro': { version: '7.4.0' },
    'node_modules/gsap': { version: '3.15.0' },
    'sites/acme/node_modules/gsap': { version: '3.9.9' },
    'node_modules/typescript': { version: '6.0.3' },
    'node_modules/chrome-launcher': { version: '1.2.2' },
    'node_modules/lighthouse': { version: '13.5.0' },
    'node_modules/playwright': { version: '1.56.1' },
    'node_modules/prettier': { version: '3.9.10' },
    'node_modules/prettier-plugin-astro': { version: '1.1.1' },
    'node_modules/sharp': { version: '0.35.5' },
    'node_modules/wrangler': { version: '4.151.1' },
    'node_modules/eslint': { version: '9.39.5' },
    'node_modules/eslint-plugin-astro': { version: '1.7.0' },
    'node_modules/eslint-plugin-jsx-a11y': { version: '6.10.2' },
    'node_modules/knip': { version: '6.43.0' },
    'node_modules/typescript-eslint': { version: '8.72.1' },
  },
};
const sitePackage = {
  dependencies: { astro: '^7.4.0', gsap: '^3.15.0' },
  devDependencies: { typescript: '^6.0.3' },
};
const rootPackage = { engines: { node: '>=22.22.0' } };
const build = (siteConfig, over = {}) =>
  buildPackageJson({
    slug: 'acme',
    sitePackage,
    rootPackage,
    lock,
    siteConfig,
    ...over,
  });

test('package: exact pins, and the site-local lockfile entry wins over the hoisted one', () => {
  const pkg = build(vercelConfig());
  assert.equal(pkg.dependencies.astro, '7.4.0');
  assert.equal(pkg.dependencies.gsap, '3.9.9');
  assert.equal(pkg.devDependencies.typescript, '6.0.3');
  assert.equal(pkg.name, 'acme');
  assert.deepEqual(pkg.engines, rootPackage.engines);
  for (const version of [
    ...Object.values(pkg.dependencies),
    ...Object.values(pkg.devDependencies),
  ])
    assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(lockedVersion(lock, 'acme', 'gsap'), '3.9.9');
  assert.equal(lockedVersion(lock, 'other', 'gsap'), '3.15.0');
  assert.equal(lockedVersion(lock, 'acme', 'nope'), null);
});

test('package: tooling devDependencies come from the lockfile; scripts run the copied scripts', () => {
  const pkg = build(vercelConfig());
  for (const name of [
    'lighthouse',
    'chrome-launcher',
    'playwright',
    'prettier',
    'prettier-plugin-astro',
    'sharp',
  ])
    assert.ok(pkg.devDependencies[name], name);
  assert.equal(pkg.scripts.qa, 'node scripts/qa.mjs');
  assert.equal(pkg.scripts.report, 'node scripts/landing-report.mjs');
  assert.equal(pkg.scripts.deploy, 'node scripts/deploy.mjs');
  assert.equal(pkg.scripts['format:check'], 'prettier --check .');
  assert.deepEqual(
    Object.keys(pkg.dependencies),
    [...Object.keys(pkg.dependencies)].sort(),
  );
});

test('package: a package missing from the lockfile fails naming it', () => {
  assert.throws(
    () =>
      build(vercelConfig(), {
        sitePackage: {
          dependencies: {
            astro: '^7',
            'left-pad-ish': '^1',
            'also-gone': '^2',
          },
        },
      }),
    (error) =>
      error instanceof PackageError &&
      error.packages.join() === 'left-pad-ish,also-gone' &&
      /left-pad-ish/.test(error.message),
  );
});

test('package: wrangler for cloudflare and for a Cloudflare preview fallback, not for vercel', () => {
  const cloudflare = {
    target: 'cloudflare',
    cloudflare: { pagesProject: 'acme', productionBranch: 'main' },
  };
  assert.equal(build(cloudflare).devDependencies.wrangler, '4.151.1');
  assert.equal(build(vercelConfig()).devDependencies.wrangler, undefined);
  assert.equal(build(vpsConfig()).devDependencies.wrangler, '4.151.1');
  assert.equal(needsWrangler(cloudflare), true);
  assert.equal(needsWrangler(vercelConfig()), false);
  assert.equal(needsWrangler(vpsConfig({})), true);
  assert.equal(needsWrangler({ ...vpsConfig(), previews: 'none' }), false);
});

test('package: credits and legal are authoring tools of the factory and get no npm script', () => {
  const pkg = build(vercelConfig());
  assert.equal(pkg.scripts.credits, undefined);
  assert.equal(pkg.scripts.legal, undefined);
});

// --- 2.3 templates ---------------------------------------------------------------------

/** Jobs and steps of the workflow template, read as text (no YAML library is a dependency). */
function parseJobs(source) {
  const jobs = {};
  const lines = source.split('\n');
  const start = lines.indexOf('jobs:');
  let job = null;
  let step = null;
  lines.forEach((line, i) => {
    if (i <= start) return;
    const jobMatch = /^ {2}([a-z][\w-]*):\s*$/.exec(line);
    if (jobMatch) {
      job = jobMatch[1];
      jobs[job] = { steps: [], head: '' };
      step = null;
      return;
    }
    if (!job) return;
    const stepMatch = /^ {6}- (?:name: (.+)|uses: (.+)|run: (.+))$/.exec(line);
    if (stepMatch) {
      step = {
        name: (stepMatch[1] ?? stepMatch[2] ?? stepMatch[3]).trim(),
        body: line,
      };
      jobs[job].steps.push(step);
    } else if (step) step.body += `\n${line}`;
    else jobs[job].head += `\n${line}`;
  });
  return jobs;
}
const workflow = readTemplate('ci.yml');
const jobs = parseJobs(workflow);
const stepOf = (job, name) => {
  const found = jobs[job].steps.find((s) => s.name === name);
  assert.ok(found, `${job}: no step "${name}"`);
  return found;
};
const orderOf = (job, name) =>
  jobs[job].steps.findIndex((s) => s.name === name);

test('package: the lint tooling is pinned from the lockfile and the scripts run it on one site', () => {
  const pkg = build(vercelConfig());
  assert.equal(pkg.devDependencies.eslint, '9.39.5');
  assert.equal(pkg.devDependencies.knip, '6.43.0');
  for (const name of [
    'eslint-plugin-astro',
    'eslint-plugin-jsx-a11y',
    'typescript-eslint',
  ])
    assert.match(pkg.devDependencies[name], /^\d+\.\d+\.\d+$/, name);
  assert.equal(pkg.scripts['lint:code'], 'eslint src');
  assert.match(
    pkg.scripts['lint:unused'],
    /^knip --include files,dependencies/,
  );
  assert.equal(pkg.scripts.lint, 'npm run lint:code && npm run lint:unused');
  assert.ok(!JSON.stringify(pkg.scripts).includes('site-layers'));
  assert.throws(
    () =>
      build(vercelConfig(), {
        lock: {
          packages: { ...lock.packages, 'node_modules/knip': undefined },
        },
      }),
    PackageError,
  );
});

test('workflow: has the qa and deploy jobs, and every line is valid enough to parse (indentation and keys)', () => {
  assert.deepEqual(Object.keys(jobs), ['qa', 'deploy']);
  assert.ok(!workflow.includes('\t'));
  assert.match(workflow, /^name: CI$/m);
  assert.match(workflow, /^on:\n {2}pull_request:\n {2}push:/m);
  assert.match(workflow, /node-version-file: \.nvmrc/);
});

test('workflow: the qa job runs ci, format check, astro check, QA with 3 runs and the static report, then uploads dist', () => {
  const order = [
    'npm ci',
    'Format check',
    'Lint (ESLint, unused files and dependencies)',
    'Types and Astro diagnostics',
    'Install Chromium',
    'QA (build, screenshots, overflow, reduced motion, Lighthouse, impeccable)',
    'Landing report (static checks)',
    'Upload built site',
  ].map((name) => orderOf('qa', name === 'npm ci' ? 'npm ci' : name));
  assert.ok(
    order.every((i) => i >= 0),
    JSON.stringify(order),
  );
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
  );
  assert.match(stepOf('qa', 'Format check').body, /npm run format:check/);
  assert.match(
    stepOf('qa', 'Lint (ESLint, unused files and dependencies)').body,
    /npm run lint$/m,
  );
  assert.match(
    stepOf('qa', 'Types and Astro diagnostics').body,
    /npm run check$/m,
  );
  assert.match(
    stepOf(
      'qa',
      'QA (build, screenshots, overflow, reduced motion, Lighthouse, impeccable)',
    ).body,
    /npm run qa -- --runs 3/,
  );
  assert.match(
    stepOf('qa', 'Landing report (static checks)').body,
    /npm run report -- --only static/,
  );
  assert.match(stepOf('qa', 'Upload built site').body, /name: site-dist/);
});

test('workflow: the deploy job needs qa, reads the target and gates on booleans only', () => {
  assert.match(jobs.deploy.head, /needs: qa/);
  assert.match(jobs.deploy.head, /needs\.qa\.result == 'success'/);
  assert.match(
    stepOf('deploy', 'Read deploy target').body,
    /node scripts\/deploy\/config\.mjs --branch "\$BRANCH" --github-output/,
  );
  const gate = stepOf('deploy', 'Check deploy prerequisites').body;
  const refs = [...gate.matchAll(/\$\{\{\s*secrets\.(\w+)([^}]*)\}\}/g)];
  assert.ok(refs.length >= 4);
  for (const [whole, , rest] of refs)
    assert.match(rest.trim(), /^!= ''$/, `gate uses a secret value: ${whole}`);
  assert.match(
    gate,
    /github\.event\.pull_request\.head\.repo\.full_name != github\.repository/,
  );
  assert.match(gate, /::warning title=Deploy skipped/);
  assert.match(gate, /enabled=false/);
  // The secrets' values are only used by the job environment (Cloudflare) and the deploy step.
  for (const [index, step] of jobs.deploy.steps.entries()) {
    if (step.name === 'Check deploy prerequisites') continue;
    for (const m of step.body.matchAll(/\$\{\{\s*secrets\.(\w+)\s*\}\}/g))
      assert.ok(
        step.name === "Deploy to the site's target" ||
          /^CLOUDFLARE_/.test(m[1]),
        `${step.name} (${index}) reads secrets.${m[1]}`,
      );
  }
  assert.ok(!/echo[^\n]*\$\{\{\s*secrets\./.test(workflow));
});

test('workflow: both deploy paths, the live report with continue-on-error, the comment marker and a last failing step', () => {
  const wrangler = jobs.deploy.steps.filter((s) =>
    /deploy_via == 'wrangler'/.test(s.body),
  );
  assert.ok(wrangler.length >= 4);
  assert.match(
    stepOf('deploy', 'Ensure the Pages project exists').body,
    /wrangler pages project create/,
  );
  assert.match(
    stepOf('deploy', 'Deploy to Cloudflare Pages').body,
    /wrangler pages deploy dist /,
  );
  const script = stepOf('deploy', "Deploy to the site's target");
  assert.match(script.body, /deploy_via == 'script'/);
  assert.match(
    script.body,
    /node scripts\/deploy\.mjs --branch "\$BRANCH" --github-output/,
  );
  assert.match(
    stepOf('deploy', 'Install lftp (FTPS fallback only)').body,
    /needs_lftp == 'true'/,
  );
  const live = stepOf('deploy', 'Landing report (live checks)');
  assert.match(live.body, /continue-on-error: true/);
  assert.match(live.body, /npm run report -- --only live --url "\$DEPLOY_URL"/);
  const last = jobs.deploy.steps.at(-1);
  assert.equal(last.name, 'Fail when the live report failed');
  assert.match(last.body, /steps\.live_report\.outcome == 'failure'/);
  assert.ok(
    orderOf('deploy', 'Comment preview URL on the pull request') <
      orderOf('deploy', 'Fail when the live report failed'),
  );
  const markers = workflow.match(/<!-- site-preview -->/g) ?? [];
  assert.equal(markers.length, 2);
  assert.ok(!workflow.includes('landing-factory-preview'));
});

test('workflow: the production-only domain report runs after the deployment report and the last step covers both', () => {
  const domain = stepOf('deploy', 'Landing report (live, site domain)');
  assert.match(domain.body, /id: domain_report/);
  assert.match(domain.body, /continue-on-error: true/);
  assert.match(domain.body, /steps\.target\.outputs\.is_production == 'true'/);
  assert.match(domain.body, /steps\.gate\.outputs\.enabled == 'true'/);
  assert.match(
    domain.body,
    /npm run report -- --only live --site-url --out qa-domain/,
  );
  // No site URL, no domain check: the step must not fail an exported site without `site`.
  assert.match(domain.body, /scripts\/report\/site-url\.mjs dist/);
  assert.ok(
    orderOf('deploy', 'Landing report (live checks)') <
      orderOf('deploy', 'Landing report (live, site domain)'),
  );
  assert.ok(
    orderOf('deploy', 'Landing report (live, site domain)') <
      orderOf('deploy', 'Summarize live report'),
  );
  assert.match(
    stepOf('deploy', 'Upload domain report').body,
    /is_production == 'true'/,
  );
  const summary = stepOf('deploy', 'Summarize live report');
  assert.match(summary.body, /qa-domain\/report/);
  assert.match(summary.body, /GITHUB_STEP_SUMMARY/);
  const last = jobs.deploy.steps.at(-1);
  assert.equal(last.name, 'Fail when the live report failed');
  assert.match(last.body, /steps\.live_report\.outcome == 'failure'/);
  assert.match(last.body, /steps\.domain_report\.outcome == 'failure'/);
  // The deployment report is not replaced by the domain one.
  assert.ok(
    !/--out qa-domain/.test(
      stepOf('deploy', 'Landing report (live checks)').body,
    ),
  );
});

test('workflow: no --site, no sites/ paths and no secret values anywhere', () => {
  assert.ok(!/--site(?![-\w])/.test(workflow)); // --site-url is the report option, not a site selector
  assert.ok(!/sites\//.test(workflow));
  assert.ok(!/\$\{\{\s*matrix\./.test(workflow));
  assert.ok(!/SITE\b/.test(workflow));
});

test('README: names the target secrets, the domain step and the brief note', () => {
  const render = (siteConfig, over = {}) =>
    renderReadme({
      title: 'Acme',
      config: resolveConfig(siteConfig),
      node: '22',
      date: '2026-10-25',
      commit: 'abcdef0123456789',
      withBrief: true,
      domain: 'acme.example',
      ...over,
    });
  const vercel = render(vercelConfig());
  assert.match(vercel, /^# Acme/);
  assert.match(vercel, /`VERCEL_TOKEN`/);
  assert.match(vercel, /Target: \*\*vercel\*\*/);
  assert.match(vercel, /Project > Settings > Domains/);
  assert.match(vercel, /`acme\.example`/);
  assert.match(vercel, /brief\.json/);
  assert.match(vercel, /abcdef0/);
  assert.ok(!/\{\{/.test(vercel));
  const cloudflare = render({
    target: 'cloudflare',
    cloudflare: { pagesProject: 'acme', productionBranch: 'main' },
  });
  assert.match(cloudflare, /`CLOUDFLARE_API_TOKEN`/);
  assert.match(cloudflare, /`CLOUDFLARE_ACCOUNT_ID`/);
  assert.match(cloudflare, /Custom domains/);
  const vps = render(vpsConfig(), { withBrief: false });
  assert.match(vps, /`DEPLOY_SSH_KEY`/);
  assert.match(vps, /`CLOUDFLARE_API_TOKEN`/);
  assert.ok(!/brief\.json/.test(vps));
});

test('deploy guide: rewritten for a single-site repository', () => {
  const text = singleSiteGuide(
    readFileSync(join(ROOT, 'docs/deploy/vercel.md'), 'utf8'),
  );
  assert.ok(!/--site/.test(text));
  assert.ok(!/sites\/<slug>/.test(text));
  assert.match(text, /site\.config\.json/);
});

// --- 2.4 CLI against a fixture factory --------------------------------------------------

const fakeKey = () => `ghp_${randomBytes(20).toString('hex').slice(0, 36)}`;

/** A small factory: stub scripts that import each other, one site 'acme', docs and a lockfile. */
function makeFactory({ config = vercelConfig(), brief = true } = {}) {
  const root = fresh('factory');
  put(
    root,
    'scripts/qa.mjs',
    "import './qa/one.mjs';\nimport './lib/sites.mjs';\n",
  );
  put(root, 'scripts/qa/one.mjs', 'export const one = 1;\n');
  put(root, 'scripts/lib/sites.mjs', 'export const sites = [];\n');
  put(root, 'scripts/landing-report.mjs', "import './report/mask.mjs';\n");
  put(root, 'scripts/report/mask.mjs', 'export const mask = (v) => v;\n');
  put(root, 'scripts/deploy.mjs', "import './deploy/config.mjs';\n");
  put(root, 'scripts/deploy/config.mjs', 'export const config = {};\n');
  put(root, 'scripts/parse-wrangler-output.mjs', 'export const parse = 1;\n');
  put(root, 'scripts/mcp/server.mjs', 'export const server = 1;\n');
  put(root, 'scripts/new-site.mjs', 'export const newSite = 1;\n');
  put(root, '.claude/settings.json', '{}\n');
  put(root, '.nvmrc', '22\n');
  put(root, 'eslint.config.mjs', 'export default [];\n');
  put(
    root,
    '.prettierrc.json',
    readFileSync(join(ROOT, '.prettierrc.json'), 'utf8'),
  );
  put(root, 'qa.config.json', '{ "pages": { "exclude": ["404.html"] } }\n');
  put(root, 'package.json', JSON.stringify({ engines: { node: '>=22.22.0' } }));
  put(root, 'package-lock.json', JSON.stringify(lock));
  put(
    root,
    'docs/deploy/vercel.md',
    '# Deploy to Vercel\n\nRun `node scripts/deploy.mjs --site <slug> --dry-run`.\n',
  );
  put(root, 'docs/deploy/cloudflare.md', '# Deploy to Cloudflare\n');
  put(root, 'design-system/acme/MASTER.md', '# Acme design system\n');
  put(root, 'design-system/other/MASTER.md', '# Other\n');
  const site = join(root, 'sites/acme');
  put(site, 'package.json', JSON.stringify(sitePackage));
  put(
    site,
    'astro.config.mjs',
    "export default { site: 'https://acme.example' };\n",
  );
  put(site, 'tsconfig.json', '{}\n');
  put(site, 'site.config.json', JSON.stringify(config));
  put(site, 'assets.json', '{ "images": [] }\n');
  put(site, 'CREDITS.md', '# Credits: acme\n');
  put(site, 'README.md', '# factory readme of acme\n');
  put(site, 'PROPOSAL.md', '# Proposal\n');
  put(site, 'RUN.md', '# Run\n');
  put(site, 'CONTENT.md', '# Content\n');
  put(site, 'layout-signature.json', '{}\n');
  put(site, 'src/pages/index.astro', '---\n---\n\n<h1>Acme</h1>\n');
  put(site, 'src/data/credits.json', '[]\n');
  put(site, 'public/_headers', '/*\n  X-Content-Type-Options: nosniff\n');
  put(site, 'public/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  put(site, 'assets/logo.txt', 'customer file');
  if (brief)
    put(site, 'brief.json', JSON.stringify({ business: { name: 'Acme Ltd' } }));
  // Never copied.
  put(site, 'dist/index.html', '<h1>built</h1>');
  put(site, 'node_modules/x/index.js', 'x');
  put(site, '.astro/types.d.ts', 'x');
  put(site, '.run.log', 'log');
  put(site, '.run-usage.json', '{}');
  put(site, '.env', 'TOKEN=1');
  put(site, '.env.example', 'TOKEN=');
  put(site, 'src/.env.local', 'TOKEN=2');
  put(site, 'src/.DS_Store', 'junk');
  put(site, 'EXPORTED.json', '{}');
  put(site, '.taste-skill/state.json', '{}');
  return { root, site };
}

const env = { NODE_TEST_CONTEXT: 'child-v8' };
function run(factory, out, extra = [], over = {}) {
  const c = capture();
  const code = exportMain(
    [
      '--root',
      factory.root,
      '--site',
      'acme',
      '--out',
      out,
      '--no-lockfile',
      ...extra,
    ],
    c.io,
    { ...env, ...over },
  );
  return { code, c };
}
const snapshot = (dir) => (existsSync(dir) ? listFiles(dir) : null);

test('refusals exit 2 and write nothing: bad slug, missing site, missing arguments', () => {
  const factory = makeFactory();
  const out = fresh('out');
  for (const argv of [
    ['--site', 'Bad_Slug', '--out', out],
    ['--site', '../acme', '--out', out],
    ['--site', 'nosuch', '--out', out],
    ['--site', 'acme'],
    ['--out', out],
    ['--site', 'acme', '--out', out, '--record', 'http://github.com/x/y'],
    ['--site', 'acme', '--out', out, '--record', 'not a url'],
    ['--site', 'acme', '--out', out, '--nope'],
  ]) {
    const c = capture();
    const code = exportMain(
      ['--root', factory.root, '--no-lockfile', ...argv],
      c.io,
      env,
    );
    assert.equal(code, 2, argv.join(' '));
    assert.equal(existsSync(out), false, argv.join(' '));
  }
  assert.equal(existsSync(join(factory.site, 'EXPORTED.json')), true);
});

test('refusals: an --out inside the factory (also through a symlink) and a non-empty --out', () => {
  const factory = makeFactory();
  const before = listFiles(factory.root);
  for (const out of [
    join(factory.root, 'exported'),
    join(factory.root, 'sites/acme/copy'),
    factory.root,
  ]) {
    const { code, c } = run(factory, out);
    assert.equal(code, 2, out);
    assert.match(c.err.join('\n'), /inside the factory/);
  }
  const link = fresh('link');
  symlinkSync(factory.root, link);
  const viaLink = run(factory, join(link, 'exported'));
  assert.equal(viaLink.code, 2);
  assert.match(viaLink.c.err.join('\n'), /inside the factory/);
  assert.deepEqual(listFiles(factory.root), before);

  const full = fresh('full');
  put(full, 'keep.txt', 'mine');
  const nonEmpty = run(factory, full);
  assert.equal(nonEmpty.code, 2);
  assert.match(nonEmpty.c.err.join('\n'), /not empty/);
  assert.match(
    nonEmpty.c.err.join('\n'),
    new RegExp(full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
  assert.deepEqual(listFiles(full), ['keep.txt']);
  assert.equal(readFileSync(join(full, 'keep.txt'), 'utf8'), 'mine');
});

test('--root is refused outside the test runner', () => {
  const factory = makeFactory();
  const c = capture();
  const code = exportMain(
    ['--root', factory.root, '--site', 'acme', '--out', fresh('out')],
    c.io,
    {},
  );
  assert.equal(code, 2);
  assert.match(c.err.join('\n'), /only available to tests/);
});

test('a provider key in the site exits 1, prints only the masked form and writes nothing', () => {
  const factory = makeFactory();
  const key = fakeKey();
  put(factory.site, 'src/pages/leak.astro', `---\nconst k = '${key}';\n---\n`);
  const out = fresh('out');
  const { code, c } = run(factory, out);
  assert.equal(code, 1);
  const text = c.all();
  assert.ok(!text.includes(key), 'the raw key is never printed');
  assert.match(
    text,
    /sites\/acme\/src\/pages\/leak\.astro:2 GitHub token ghp_\.\.\. \(40 chars\)/,
  );
  assert.equal(existsSync(out), false);
  // An empty folder given as --out stays empty too.
  const empty = fresh('empty');
  mkdirSync(empty);
  assert.equal(run(factory, empty).code, 1);
  assert.deepEqual(readdirSync(empty), []);
});

test('a full export has the expected files and none of the private or generated ones', () => {
  const factory = makeFactory();
  const out = fresh('out');
  const { code, c } = run(factory, out);
  assert.equal(code, 0, c.all());
  const files = listFiles(out);
  for (const expected of [
    '.github/workflows/ci.yml',
    '.gitignore',
    '.nvmrc',
    '.prettierignore',
    '.prettierrc.json',
    'CREDITS.md',
    'README.md',
    'assets.json',
    'assets/logo.txt',
    'astro.config.mjs',
    'brief.json',
    'eslint.config.mjs',
    'knip.json',
    'docs/deploy.md',
    'package.json',
    'public/_headers',
    'public/favicon.svg',
    'qa.config.json',
    'scripts/qa.mjs',
    'scripts/qa/one.mjs',
    'scripts/lib/sites.mjs',
    'scripts/landing-report.mjs',
    'scripts/report/mask.mjs',
    'scripts/deploy.mjs',
    'scripts/deploy/config.mjs',
    'scripts/parse-wrangler-output.mjs',
    'site.config.json',
    'src/data/credits.json',
    'src/pages/index.astro',
    'tsconfig.json',
  ])
    assert.ok(files.includes(expected), `${expected} is exported`);
  // Not copied.
  for (const name of files) {
    assert.ok(
      !/^(dist|node_modules|\.astro|qa|sites|\.claude|\.taste-skill)\//.test(
        name,
      ),
      name,
    );
    assert.ok(
      !/(^|\/)(\.run\.log|\.run-usage\.json|EXPORTED\.json|\.DS_Store)$/.test(
        name,
      ),
      name,
    );
    assert.ok(!/(^|\/)\.env(\.|$)/.test(name) || /\.example$/.test(name), name);
  }
  assert.ok(!files.includes('scripts/mcp/server.mjs'));
  assert.ok(!files.includes('scripts/new-site.mjs'));
  assert.ok(!files.includes('package-lock.json'), '--no-lockfile writes none');
  assert.match(c.all(), /package-lock\.json was not written/);
  // The README was regenerated, not copied.
  const readme = readFileSync(join(out, 'README.md'), 'utf8');
  assert.match(readme, /^# Acme Ltd/);
  assert.match(readme, /`VERCEL_TOKEN`/);
  assert.ok(!readme.includes('factory readme'));
  // The package.json is the pinned one and the guide is single-site.
  const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies.gsap, '3.9.9');
  assert.ok(
    !readFileSync(join(out, 'docs/deploy.md'), 'utf8').includes('--site'),
  );
  // Factory sources are untouched.
  assert.equal(existsSync(join(factory.site, '.env')), true);
});

test("planning documents go under docs/factory/, the design system is the site's own", () => {
  const factory = makeFactory();
  const out = fresh('out');
  assert.equal(run(factory, out).code, 0);
  const files = listFiles(out).filter((f) => f.startsWith('docs/factory/'));
  assert.deepEqual(files, [
    'docs/factory/CONTENT.md',
    'docs/factory/MASTER.md',
    'docs/factory/PROPOSAL.md',
    'docs/factory/RUN.md',
    'docs/factory/layout-signature.json',
  ]);
  assert.match(
    readFileSync(join(out, 'docs/factory/MASTER.md'), 'utf8'),
    /Acme design system/,
  );
  assert.ok(!existsSync(join(out, 'PROPOSAL.md')));
  assert.ok(!existsSync(join(out, 'RUN.md')));
});

test('the output is formatted by Prettier with the copied config', () => {
  const factory = makeFactory();
  put(factory.root, 'scripts/qa/one.mjs', 'export const   one =   "1"\n');
  const out = fresh('out');
  assert.equal(run(factory, out).code, 0);
  assert.equal(
    readFileSync(join(out, 'scripts/qa/one.mjs'), 'utf8'),
    "export const one = '1';\n",
  );
});

test('--no-brief leaves out brief.json and says so in the README', () => {
  const factory = makeFactory();
  const out = fresh('out');
  const { code, c } = run(factory, out, ['--no-brief']);
  assert.equal(code, 0, c.all());
  assert.ok(!existsSync(join(out, 'brief.json')));
  const readme = readFileSync(join(out, 'README.md'), 'utf8');
  assert.ok(!/brief\.json/.test(readme));
  assert.ok(!/brief\.json was included/.test(c.all()));
  const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.legal, undefined);
  // With the brief, the summary says it travelled.
  const withBrief = run(factory, fresh('out'));
  assert.match(withBrief.c.all(), /brief\.json was included/);
});

test('--dry-run prints the files, dependencies and workflow and writes nothing', () => {
  const factory = makeFactory();
  const out = fresh('out');
  const { code, c } = run(factory, out, ['--dry-run']);
  assert.equal(code, 0, c.all());
  assert.equal(existsSync(out), false);
  const text = c.out.join('\n');
  assert.match(text, /src\/pages\/index\.astro/);
  assert.match(text, /astro@7\.4\.0/);
  assert.match(text, /gsap@3\.9\.9/);
  assert.match(text, /\.github\/workflows\/ci\.yml/);
  assert.match(text, /Nothing was written/);
  // A dry run into an empty existing folder leaves it empty.
  const empty = fresh('empty');
  mkdirSync(empty);
  assert.equal(run(factory, empty, ['--dry-run']).code, 0);
  assert.deepEqual(readdirSync(empty), []);
  assert.equal(existsSync(join(factory.site, 'EXPORTED.json')), true);
});

test('an empty existing --out folder is accepted and a failure afterwards removes what was written', () => {
  const factory = makeFactory();
  const empty = fresh('empty');
  mkdirSync(empty);
  assert.equal(run(factory, empty).code, 0);
  assert.ok(listFiles(empty).length > 10);
  // A package missing from the lockfile stops before anything is written.
  put(
    factory.site,
    'package.json',
    JSON.stringify({ dependencies: { 'gone-pkg': '^1' } }),
  );
  const out = fresh('out');
  const missing = run(factory, out);
  assert.equal(missing.code, 1);
  assert.match(missing.c.err.join('\n'), /gone-pkg/);
  assert.equal(existsSync(out), false);
});

test('the exported lint configuration is for one site: eslint config copied, knip without workspaces', () => {
  const factory = makeFactory();
  const out = fresh('lint');
  const { code, c } = run(factory, out);
  assert.equal(code, 0, c.all());
  assert.equal(
    readFileSync(join(out, 'eslint.config.mjs'), 'utf8').trim(),
    'export default [];',
  );
  const knip = JSON.parse(readFileSync(join(out, 'knip.json'), 'utf8'));
  assert.equal(knip.workspaces, undefined);
  assert.ok(knip.entry.includes('src/i18n/urls.ts'));
  assert.ok(knip.entry.includes('src/scenes/*.ts'));
  assert.ok(knip.ignore.includes('src/components/three/**'));
  const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.lint, 'npm run lint:code && npm run lint:unused');
  assert.equal(pkg.devDependencies['typescript-eslint'], '8.72.1');
  const ci = readFileSync(join(out, '.github/workflows/ci.yml'), 'utf8');
  assert.ok(ci.indexOf('npm run format:check') < ci.indexOf('npm run lint'));
  assert.ok(ci.indexOf('npm run lint') < ci.indexOf('npm run check'));
});

test('a site that holds an unused layer exits 1 naming it and writes nothing', () => {
  const factory = makeFactory();
  put(factory.site, 'src/components/three/Scene3D.astro', '---\n---\n');
  const out = fresh('layer');
  const { code, c } = run(factory, out);
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /3D layer/);
  assert.match(c.err.join('\n'), /prune it first/);
  assert.equal(existsSync(out), false);
  // Once a page imports it the layer is in use and the export goes through.
  put(
    factory.site,
    'src/pages/scene.astro',
    "---\nimport Scene3D from '../components/three/Scene3D.astro';\n---\n<Scene3D />\n",
  );
  const again = run(factory, fresh('layer-ok'));
  assert.equal(again.code, 0, again.c.all());
});

test('an import outside scripts/ stops the export with exit 1 and leaves --out empty', () => {
  const factory = makeFactory();
  put(factory.root, 'scripts/qa/one.mjs', "import '../../outside.mjs';\n");
  put(factory.root, 'outside.mjs', 'export const x = 1;\n');
  const out = fresh('empty');
  mkdirSync(out);
  const { code, c } = run(factory, out);
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /\.\.\/\.\.\/outside\.mjs/);
  assert.deepEqual(readdirSync(out), []);
});

test('--record writes EXPORTED.json with the four fields; without it nothing is written', () => {
  const factory = makeFactory();
  rmSync(join(factory.site, 'EXPORTED.json'));
  const first = run(factory, fresh('out'));
  assert.equal(first.code, 0);
  assert.equal(existsSync(join(factory.site, 'EXPORTED.json')), false);
  const dry = run(factory, fresh('out'), [
    '--dry-run',
    '--record',
    'https://github.com/acme/site',
  ]);
  assert.equal(dry.code, 0);
  assert.equal(existsSync(join(factory.site, 'EXPORTED.json')), false);
  const url = 'https://github.com/acme/site';
  const out = fresh('out');
  const { code, c } = run(factory, out, ['--record', url]);
  assert.equal(code, 0, c.all());
  const record = JSON.parse(
    readFileSync(join(factory.site, 'EXPORTED.json'), 'utf8'),
  );
  assert.deepEqual(Object.keys(record).sort(), [
    'exportedAt',
    'factoryCommit',
    'repository',
    'target',
  ]);
  assert.equal(record.repository, url);
  assert.equal(record.target, 'vercel');
  assert.ok(!Number.isNaN(Date.parse(record.exportedAt)));
  assert.ok(record.factoryCommit);
  // The record never travels into the exported repository.
  assert.ok(!listFiles(out).includes('EXPORTED.json'));
});

test('a Cloudflare site exports wrangler and the cloudflare guide', () => {
  const factory = makeFactory({
    config: {
      target: 'cloudflare',
      cloudflare: { pagesProject: 'acme', productionBranch: 'main' },
    },
  });
  const out = fresh('out');
  assert.equal(run(factory, out).code, 0);
  const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'));
  assert.equal(pkg.devDependencies.wrangler, '4.151.1');
  assert.match(readFileSync(join(out, 'docs/deploy.md'), 'utf8'), /Cloudflare/);
  assert.match(
    readFileSync(join(out, 'README.md'), 'utf8'),
    /`CLOUDFLARE_API_TOKEN`/,
  );
});

test('an invalid site.config.json exits 1 naming the field', () => {
  const factory = makeFactory({ config: { target: 'vercel', vercel: {} } });
  const out = fresh('out');
  const { code, c } = run(factory, out);
  assert.equal(code, 1);
  assert.match(c.err.join('\n'), /vercel\.project/);
  assert.equal(existsSync(out), false);
});
