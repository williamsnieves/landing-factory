// Tests for scripts/lib/brief-schema.mjs and scripts/brief.mjs. The fixture customer is fictional
// (tests/fixtures/brief/); every case that writes works in a temp folder (LANDING_FACTORY_ROOT for --site).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { main } from '../scripts/brief.mjs';
import {
  emptyBrief,
  getPath,
  isAssumed,
  missingFields,
  summarizeBrief,
  validateBrief,
} from '../scripts/lib/brief-schema.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/brief');
const tmp = mkdtempSync(join(tmpdir(), 'brief-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const fixture = () =>
  JSON.parse(readFileSync(join(FIXTURE, 'brief.json'), 'utf8'));
const options = { baseDir: FIXTURE, patternsDir: join(ROOT, 'patterns') };
const errorsOf = (brief) => validateBrief(brief, options);
const paths = (errors) => errors.map((e) => e.path);

/** Run main() capturing output. */
function cli(args, env = {}) {
  const out = [];
  const err = [];
  const saved = process.env.LANDING_FACTORY_ROOT;
  if (env.LANDING_FACTORY_ROOT)
    process.env.LANDING_FACTORY_ROOT = env.LANDING_FACTORY_ROOT;
  try {
    const code = main(args, {
      log: (m) => out.push(m),
      error: (m) => err.push(m),
    });
    return { code, stdout: out.join('\n'), stderr: err.join('\n') };
  } finally {
    if (saved === undefined) delete process.env.LANDING_FACTORY_ROOT;
    else process.env.LANDING_FACTORY_ROOT = saved;
  }
}

test('the fixture brief is valid and its assumed fields are recognized', () => {
  const brief = fixture();
  assert.deepEqual(errorsOf(brief), []);
  assert.ok(isAssumed(brief, 'tone'));
  assert.ok(isAssumed(brief, 'contact.hours'));
  assert.ok(!isAssumed(brief, 'contact.email'));
  assert.equal(getPath(brief, 'offer[1].price'), '59');
});

test('each required field missing or empty is reported with its path', () => {
  for (const path of [
    'language',
    'business.name',
    'business.description',
    'goal.primary.label',
  ]) {
    const brief = fixture();
    const parts = path.split('.');
    const last = parts.pop();
    const holder = parts.reduce((o, k) => o[k], brief);
    holder[last] = '  ';
    assert.deepEqual(paths(errorsOf(brief)), [path], `${path} empty`);
    delete holder[last];
    assert.deepEqual(paths(errorsOf(brief)), [path], `${path} missing`);
  }
  const noVersion = fixture();
  delete noVersion.version;
  assert.deepEqual(paths(errorsOf(noVersion)), ['version']);
});

test('unknown keys fail at every level, naming the allowed keys', () => {
  const brief = fixture();
  brief.bussiness = {};
  brief.contact.phon = '1';
  brief.offer[0].prise = '1';
  const errors = errorsOf(brief);
  assert.deepEqual(paths(errors).sort(), [
    'bussiness',
    'contact.phon',
    'offer[0].prise',
  ]);
  assert.match(
    errors.find((e) => e.path === 'contact.phon').message,
    /unknown key; allowed here: email, phone/,
  );
});

test('malformed URLs, emails, phones, colors and domains are named with the expected format', () => {
  const brief = fixture();
  brief.offer[1].url = 'example.com/curso';
  brief.goal.primary.url = 'ftp://example.com/x';
  brief.contact.email = 'hola(at)example.com';
  brief.contact.phone = 'call me';
  brief.brand.colors = ['#1f3a5f', 'blue'];
  brief.deploy.domain = 'https://example.com/';
  brief.contact.social[0].url = 'not a url';
  brief.language = 'Spanish';
  const errors = errorsOf(brief);
  assert.deepEqual(paths(errors).sort(), [
    'brand.colors[1]',
    'contact.email',
    'contact.phone',
    'contact.social[0].url',
    'deploy.domain',
    'goal.primary.url',
    'language',
    'offer[1].url',
  ]);
  const message = (path) => errors.find((e) => e.path === path).message;
  assert.match(
    message('offer[1].url'),
    /expected a URL starting with https:\/\//,
  );
  assert.match(message('goal.primary.url'), /mailto: or tel:/);
  assert.match(message('contact.email'), /name@domain\.com/);
  assert.match(message('contact.phone'), /7 to 15 digits/);
  assert.match(message('brand.colors[1]'), /#rrggbb/);
  // mailto: and tel: are fine for the call to action; a tel: with a plus too.
  const ok = fixture();
  ok.goal.primary.url = 'tel:+34600123456';
  assert.deepEqual(errorsOf(ok), []);
});

test('closed values and types are enforced', () => {
  const brief = fixture();
  brief.business.kind = 'shop';
  brief.assets[0].kind = 'sticker';
  brief.deploy.target = 'heroku';
  brief.tone = 'warm';
  brief.legal.regulated = 'no';
  brief.offer[0].price = 29;
  const errors = errorsOf(brief);
  assert.deepEqual(paths(errors).sort(), [
    'assets[0].kind',
    'business.kind',
    'deploy.target',
    'legal.regulated',
    'offer[0].price',
    'tone',
  ]);
  assert.match(
    errors.find((e) => e.path === 'business.kind').message,
    /expected one of product, service, event, content, other, got "shop"/,
  );
  assert.match(
    errors.find((e) => e.path === 'tone').message,
    /expected an array/,
  );
});

test('an asset needs an existing local file or a URL, and no path may leave the site folder', () => {
  const brief = fixture();
  brief.assets.push({ kind: 'photo', path: 'assets/missing.jpg' });
  brief.assets.push({ kind: 'photo' });
  brief.assets.push({ kind: 'photo', path: '../secret.jpg' });
  brief.assets.push({ kind: 'photo', path: '/etc/passwd' });
  brief.assets.push({ kind: 'video', url: 'https://example.com/drive/folder' });
  const errors = errorsOf(brief);
  assert.deepEqual(paths(errors), [
    'assets[1].path',
    'assets[3].path',
    'assets[4].path',
    'assets[2]',
  ]);
  assert.match(errors[0].message, /file not found/);
  assert.match(errors[3].message, /needs a "path"/);
  // Without a base folder the existence check is skipped.
  assert.deepEqual(
    paths(
      validateBrief({
        ...fixture(),
        assets: [{ kind: 'photo', path: 'nope.jpg' }],
      }),
    ),
    [],
  );
});

test('a liked reference sheet must exist in patterns/', () => {
  const brief = fixture();
  brief.references.liked[0].sheet = 'no-such-sheet';
  brief.references.liked.push({
    url: 'https://example.com/b',
    sheet: '../etc',
  });
  const errors = errorsOf(brief);
  assert.deepEqual(paths(errors), [
    'references.liked[0].sheet',
    'references.liked[1].sheet',
  ]);
  assert.match(errors[0].message, /patterns\/no-such-sheet\.md does not exist/);
});

test('assumed entries must point at an existing, non-empty field and give a reason', () => {
  const brief = fixture();
  brief.assumed = [
    { field: 'contact.phone', reason: 'x' }, // empty: a missing value stays empty
    { field: 'contact.fax', reason: 'x' }, // does not exist
    { field: 'offer[5].price', reason: 'x' }, // does not exist
    { field: 'Contact Phone', reason: 'x' }, // malformed
    { field: 'tone', reason: '' }, // no reason
    { field: 'offer[0]', reason: 'prices proposed by the agent' }, // fine, an assumed parent
  ];
  const errors = errorsOf(brief);
  assert.deepEqual(paths(errors), [
    'assumed[0].field',
    'assumed[1].field',
    'assumed[2].field',
    'assumed[3].field',
    'assumed[4].reason',
  ]);
  assert.match(
    errors[0].message,
    /is empty; an assumption is a value chosen for the customer/,
  );
  assert.ok(isAssumed(brief, 'offer[0].price'));
  assert.ok(!isAssumed(brief, 'offer[1].price'));
});

test('a secondary action URL needs a label; a non-object brief is rejected', () => {
  const brief = fixture();
  brief.goal.secondary.label = '';
  assert.deepEqual(paths(errorsOf(brief)), ['goal.secondary.label']);
  assert.deepEqual(paths(errorsOf([])), ['brief']);
});

test('a skeleton is valid except for the required fields still empty, and missing lists them first', () => {
  const brief = emptyBrief({ language: 'es', niche: 'tienda de plantillas' });
  assert.deepEqual(paths(errorsOf(brief)), [
    'business.name',
    'goal.primary.label',
  ]);
  const missing = missingFields(brief);
  assert.deepEqual(
    missing.filter((m) => m.required).map((m) => m.path),
    ['business.name', 'goal.primary.label'],
  );
  assert.ok(
    !missing.some((m) => m.path === 'business.description'),
    'seeded from the niche',
  );
  const recommended = missing.filter((m) => !m.required).map((m) => m.path);
  assert.equal(recommended[0], 'business.kind');
  assert.ok(recommended.indexOf('offer') < recommended.indexOf('audience.who'));
  assert.ok(
    recommended.indexOf('audience.who') < recommended.indexOf('contact.email'),
  );
  assert.ok(
    recommended.indexOf('contact.email') < recommended.indexOf('assets'),
  );
  assert.ok(
    recommended.indexOf('assets') < recommended.indexOf('brand.colors'),
  );
  assert.ok(
    recommended.indexOf('brand.colors') <
      recommended.indexOf('references.liked'),
  );
  assert.ok(
    recommended.indexOf('references.liked') <
      recommended.indexOf('deploy.target'),
  );
});

test('init without --lang leaves the page language empty and required (nothing assumes a language)', () => {
  const brief = emptyBrief({ niche: 'x' });
  assert.equal(brief.language, '');
  assert.equal(missingFields(brief)[1].path, 'language');
  assert.ok(paths(errorsOf(brief)).includes('language'));
});

test('missing reports only what the fixture lacks; summary marks assumed values', () => {
  const brief = fixture();
  assert.deepEqual(
    missingFields(brief).map((m) => m.path),
    ['contact.phone', 'contact.address', 'brand.fonts'],
  );
  const summary = summarizeBrief(brief);
  assert.match(summary, /^Taller Plantilla \[es\]/);
  assert.match(summary, /Tone: cercano, claro, sin jerga \(assumed\)/);
  assert.match(summary, /Offer 2: Curso Orden en 5 días, 59 EUR/);
});

test('CLI validate: exit 0 for the fixture, 1 with field paths for a broken brief, 2 for bad usage', () => {
  const ok = cli(['validate', '--file', join(FIXTURE, 'brief.json')]);
  assert.equal(ok.code, 0);
  const broken = join(tmp, 'broken.json');
  const brief = fixture();
  brief.offer[1].price = 59;
  brief.surprise = true;
  writeFileSync(broken, JSON.stringify(brief));
  const bad = cli(['validate', '--file', broken]);
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /offer\[1\]\.price: expected a string, got number/);
  assert.match(bad.stderr, /surprise: unknown key/);
  const json = cli(['validate', '--file', broken, '--json']);
  assert.equal(json.code, 1);
  assert.equal(JSON.parse(json.stdout).valid, false);
  writeFileSync(join(tmp, 'syntax.json'), '{ nope');
  assert.equal(cli(['validate', '--file', join(tmp, 'syntax.json')]).code, 1);
  for (const args of [
    [],
    ['frobnicate'],
    ['validate'],
    ['validate', '--site', 'a', '--file', 'b'],
    ['validate', '--site', 'Bad Slug'],
    ['validate', '--file', join(tmp, 'nope.json')],
    ['summary', '--file', join(tmp, 'syntax.json')],
    ['init'],
    ['validate', '--bogus'],
  ]) {
    assert.equal(cli(args).code, 2, args.join(' '));
  }
});

test('CLI init writes a valid-but-incomplete skeleton, seeds the niche and refuses to overwrite', () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  const env = { LANDING_FACTORY_ROOT: root };
  const made = cli(
    [
      'init',
      '--site',
      'tienda',
      '--niche',
      'plantillas\nde Notion',
      '--lang',
      'en',
    ],
    env,
  );
  assert.equal(made.code, 0, made.stderr);
  const path = join(root, 'sites/tienda/brief.json');
  const brief = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(brief.language, 'en');
  assert.equal(brief.business.description, 'plantillas de Notion');
  const validation = cli(['validate', '--site', 'tienda'], env);
  assert.equal(validation.code, 1);
  assert.match(validation.stderr, /business\.name: required, but empty/);
  assert.match(validation.stderr, /goal\.primary\.label/);
  assert.ok(!/business\.description/.test(validation.stderr));
  const again = cli(['init', '--site', 'tienda'], env);
  assert.equal(again.code, 2);
  assert.match(again.stderr, /already exists; use --force/);
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).language, 'en');
  assert.equal(cli(['init', '--site', 'tienda', '--force'], env).code, 0);
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).language, '');
  assert.equal(
    cli(['init', '--site', 'tienda', '--lang', 'Spanish'], env).code,
    2,
  );
});

test('CLI missing: exit 1 while a required field is empty, 0 once they are filled; --json lists the hints', () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  const env = { LANDING_FACTORY_ROOT: root };
  cli(['init', '--site', 'x', '--niche', 'a shop'], env);
  const first = cli(['missing', '--site', 'x'], env);
  assert.equal(first.code, 1);
  assert.match(first.stdout, /REQUIRED\s+business\.name/);
  const path = join(root, 'sites/x/brief.json');
  const brief = JSON.parse(readFileSync(path, 'utf8'));
  brief.language = 'en';
  brief.business.name = 'Shop';
  brief.goal.primary.label = 'Buy';
  writeFileSync(path, JSON.stringify(brief));
  const second = cli(['missing', '--site', 'x', '--json'], env);
  assert.equal(second.code, 0);
  const report = JSON.parse(second.stdout);
  assert.equal(report.requiredMissing, 0);
  assert.equal(report.missing[0].path, 'business.kind');
  assert.match(report.missing[0].hint, /products, services/);
});

test('CLI import copies the brief and its local assets into the site, and validates the copy', () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  const env = { LANDING_FACTORY_ROOT: root };
  const done = cli(
    ['import', '--file', join(FIXTURE, 'brief.json'), '--site', 'copy'],
    env,
  );
  assert.equal(done.code, 0, done.stderr);
  assert.ok(existsSync(join(root, 'sites/copy/brief.json')));
  assert.ok(existsSync(join(root, 'sites/copy/assets/logo.svg')));
  assert.equal(cli(['validate', '--site', 'copy'], env).code, 0);
  // An invalid source is not copied.
  const broken = join(tmp, 'broken-import.json');
  writeFileSync(broken, JSON.stringify({ ...fixture(), language: '' }));
  const failed = cli(['import', '--file', broken, '--site', 'nope'], env);
  assert.equal(failed.code, 1);
  assert.ok(!existsSync(join(root, 'sites/nope')));
  assert.equal(cli(['import', '--site', 'x'], env).code, 2);
});

test("CLI import onto the brief's own location is a no-op and keeps the assets", () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  const env = { LANDING_FACTORY_ROOT: root };
  const site = join(root, 'sites/yaaqui');
  cpSync(FIXTURE, site, { recursive: true });
  const before = readFileSync(join(site, 'brief.json'), 'utf8');
  const done = cli(
    ['import', '--file', join(site, 'brief.json'), '--site', 'yaaqui'],
    env,
  );
  assert.equal(done.code, 0, done.stderr);
  assert.match(done.stdout, /already in place/);
  assert.equal(readFileSync(join(site, 'brief.json'), 'utf8'), before);
  assert.ok(existsSync(join(site, 'assets/logo.svg')));
});

test('the script runs as a process: help exits 0, --site reads the repo sites/ folder without LANDING_FACTORY_ROOT', () => {
  const help = spawnSync(process.execPath, ['scripts/brief.mjs', '--help'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /init\s+--site/);
  const missingSite = spawnSync(
    process.execPath,
    ['scripts/brief.mjs', 'validate', '--site', 'zz-no-such-site'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(missingSite.status, 2);
  const fileMode = spawnSync(
    process.execPath,
    [
      'scripts/brief.mjs',
      'validate',
      '--file',
      'tests/fixtures/brief/brief.json',
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(fileMode.status, 0, fileMode.stderr);
});

test('new-site accepts a folder that holds a brief.json next to Markdown docs and keeps it', async () => {
  const { scaffoldSite } = await import('../scripts/new-site.mjs');
  const sitesDir = mkdtempSync(join(tmp, 'sites-'));
  const site = join(sitesDir, 'tienda');
  mkdirSync(site);
  writeFileSync(join(site, 'brief.json'), '{"keep":"me"}');
  writeFileSync(join(site, 'PROPOSAL.md'), 'my proposal');
  const { kept, created } = scaffoldSite({
    slug: 'tienda',
    sitesDir,
    allowExistingDocs: true,
  });
  assert.deepEqual(kept, ['PROPOSAL.md', 'brief.json']);
  assert.ok(created.includes('package.json'));
  assert.equal(readFileSync(join(site, 'brief.json'), 'utf8'), '{"keep":"me"}');
  // Anything else still refuses.
  const other = join(sitesDir, 'otra');
  mkdirSync(other);
  writeFileSync(join(other, 'notes.json'), '{}');
  assert.throws(
    () => scaffoldSite({ slug: 'otra', sitesDir, allowExistingDocs: true }),
    /other than Markdown docs, brief\.json or its assets folder/,
  );
});

test('the fixture is self-contained: copying it elsewhere keeps it valid', () => {
  const dir = mkdtempSync(join(tmp, 'copy-'));
  cpSync(FIXTURE, dir, { recursive: true });
  assert.equal(cli(['validate', '--file', join(dir, 'brief.json')]).code, 0);
});

test('the brief-intake skill names its commands, the topic order, the language rules and the no-invention rule', () => {
  const skill = readFileSync(
    join(ROOT, '.claude/skills/brief-intake/SKILL.md'),
    'utf8',
  );
  assert.match(skill, /^---\nname: brief-intake\n/);
  assert.match(skill, /\nuser-invocable: true\n/);
  assert.match(skill, /\nargument-hint: /);
  for (const needle of [
    'node scripts/brief.mjs init --site <slug>',
    'node scripts/brief.mjs missing --site <slug>',
    'node scripts/brief.mjs validate --site <slug>',
    'node scripts/brief.mjs summary --site <slug>',
    'npm run new-landing -- <slug> --brief sites/<slug>/brief.json',
    'interactive only',
    'Never invent',
    'assumed',
    'Interview language',
    'Page language',
  ])
    assert.ok(skill.includes(needle), needle);
  const order = [
    'business, offer',
    'audience',
    'goal',
    'tone',
    'contact',
    'assets',
    'brand',
    'references',
    'legal',
    'deploy',
  ];
  const at = order.map((topic) =>
    skill.indexOf(topic, skill.indexOf('Find the gaps')),
  );
  assert.ok(
    at.every((i) => i > 0),
    'every topic is named',
  );
  assert.deepEqual(
    [...at].sort((a, b) => a - b),
    at,
    'topics in interview order',
  );
  for (const word of [
    'prices',
    'reviews',
    'ratings',
    'results',
    'certifications',
    'quotes',
  ])
    assert.ok(skill.includes(word), word);
  // The interview language follows the user; nothing assumes Spanish.
  assert.doesNotMatch(skill, /customer's language/);
});

test('the allow list has the brief script and nothing broader', () => {
  const allow = JSON.parse(
    readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'),
  ).permissions.allow;
  assert.ok(allow.includes('Bash(node scripts/brief.mjs *)'));
  assert.ok(!allow.some((p) => /^Bash\(node (\*|scripts\/\*)/.test(p)));
});

test('the new-landing skill reads the brief: validation, assumed fields, references, customer assets and brief-facts', () => {
  const skill = readFileSync(
    join(ROOT, '.claude/skills/new-landing/SKILL.md'),
    'utf8',
  );
  for (const needle of [
    '--brief sites/<slug>/brief.json',
    'node scripts/brief.mjs validate --site <slug>',
    'node scripts/brief.mjs summary --site <slug>',
    '`assumed`',
    'references.liked[].sheet',
    'references.disliked',
    'to analyze',
    '"source": "customer"',
    'To fetch by the owner',
    'brief-facts',
    'brand.colors',
    '`photo-rich` when the brief lists 5 or more photos',
    'never labeled sample',
  ])
    assert.ok(skill.includes(needle), needle);
  assert.doesNotMatch(skill, /panaderia|clinica-dental|samurai/i);
});

test('the proposal template points at the brief, and preflight accepts a folder with only a brief and docs', async () => {
  const { proposalFile } = await import('../scripts/new-site.mjs');
  assert.match(proposalFile('x'), /brief\.json/);
  const { checkSlug } = await import('../scripts/preflight.mjs');
  const sitesDir = mkdtempSync(join(tmp, 'pre-'));
  mkdirSync(join(sitesDir, 'tienda'));
  writeFileSync(join(sitesDir, 'tienda/brief.json'), '{}');
  writeFileSync(join(sitesDir, 'tienda/PROPOSAL.md'), 'x');
  assert.equal(checkSlug('tienda', sitesDir).ok, true);
  writeFileSync(join(sitesDir, 'tienda/other.json'), '{}');
  assert.equal(checkSlug('tienda', sitesDir).ok, false);
});
