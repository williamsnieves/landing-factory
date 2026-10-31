// scripts/prospect.mjs: write/--check, kit, sold and the refusals (design Decisions 3, 5 and 6).
import assert from 'node:assert/strict';
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
import { after, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { main } from '../scripts/prospect.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/prospect/brief.json');
const tmp = mkdtempSync(join(tmpdir(), 'prospect-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const slug = 'alameda';
const site = join(tmp, 'sites', slug);
const briefPath = join(site, 'brief.json');
const dataPath = join(site, 'src/data/prospect.json');
const readBrief = () => JSON.parse(readFileSync(briefPath, 'utf8'));
const writeBrief = (b) => writeFileSync(briefPath, JSON.stringify(b, null, 2));

beforeEach(() => {
  rmSync(site, { recursive: true, force: true });
  mkdirSync(site, { recursive: true });
  cpSync(FIXTURE, briefPath);
});

function cli(args) {
  const out = [];
  const err = [];
  const code = main(
    args,
    { log: (m) => out.push(m), error: (m) => err.push(m) },
    tmp,
  );
  return { code, stdout: out.join('\n'), stderr: err.join('\n') };
}

test('write creates prospect.json with status, business and language', () => {
  const run = cli(['write', '--site', slug]);
  assert.equal(run.code, 0, run.stderr);
  assert.deepEqual(JSON.parse(readFileSync(dataPath, 'utf8')), {
    status: 'prospect',
    business: 'Clínica Dental Alameda',
    language: 'es',
  });
  assert.equal(cli(['write', '--site', slug]).code, 0);
  assert.match(cli(['write', '--site', slug]).stdout, /up to date/);
});

test('a multi-locale brief adds the locales', () => {
  const brief = readBrief();
  brief.languages = ['es', 'en'];
  writeBrief(brief);
  cli(['write', '--site', slug]);
  assert.deepEqual(JSON.parse(readFileSync(dataPath, 'utf8')).locales, [
    'es',
    'en',
  ]);
});

test('--check exits 1 when the file is missing or stale and writes nothing', () => {
  const missing = cli(['write', '--site', slug, '--check']);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /out of date/);
  assert.equal(existsSync(dataPath), false);
  cli(['write', '--site', slug]);
  assert.equal(cli(['write', '--site', slug, '--check']).code, 0);
  const brief = readBrief();
  brief.business.name = 'Clínica Alameda Norte';
  brief.prospect.sources[0].field = 'business.name';
  writeBrief(brief);
  assert.equal(cli(['write', '--site', slug, '--check']).code, 1);
});

test('an invalid brief exits 1 and nothing is written', () => {
  const brief = readBrief();
  brief.assets = [{ kind: 'logo', url: 'https://example.com/logo.svg' }];
  writeBrief(brief);
  const run = cli(['write', '--site', slug]);
  assert.equal(run.code, 1);
  assert.match(run.stderr, /prospect's brand/);
  assert.equal(existsSync(dataPath), false);
});

test('a brief without a prospect section: write is a usage error, --check is a no-op', () => {
  const brief = readBrief();
  delete brief.prospect;
  brief.assumed = [];
  brief.business.city = '';
  brief.business.country = '';
  brief.contact = { email: '', phone: '', address: '', hours: '', social: [] };
  brief.offer = [];
  brief.goal.primary.url = '';
  writeBrief(brief);
  assert.equal(cli(['write', '--site', slug]).code, 2);
  assert.equal(cli(['write', '--site', slug, '--check']).code, 0);
  mkdirSync(join(site, 'src/data'), { recursive: true });
  writeFileSync(dataPath, '{}\n');
  assert.equal(cli(['write', '--site', slug, '--check']).code, 1);
});

test('bad usage exits 2', () => {
  assert.equal(cli([]).code, 2);
  assert.equal(cli(['write']).code, 2);
  assert.equal(cli(['frobnicate', '--site', slug]).code, 2);
  assert.equal(cli(['kit', '--site', slug, '--check']).code, 2);
  assert.equal(cli(['write', '--site', 'Bad_Slug']).code, 2);
  assert.equal(cli(['write', '--site', 'missing']).code, 2);
  assert.equal(cli(['--help']).code, 0);
});

test('kit writes SALES.md with the fixed headings and a sources table', () => {
  writeFileSync(
    join(site, 'PROPOSAL.md'),
    `# Proposal

## Archetype blend

Primary: editorial-calm. Twist: the waiting room.

## Page map

| # | Section | Height |
| - | ------- | ------ |
| 1 | Hero | 1 viewport |
| 2 | Treatments | 1 viewport |

## Decisions
`,
  );
  writeFileSync(join(site, 'RUN.md'), '# Run log\n\nResult: passed\n');
  const run = cli(['kit', '--site', slug]);
  assert.equal(run.code, 0, run.stderr);
  const kit = readFileSync(join(site, 'SALES.md'), 'utf8');
  const headings = [...kit.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(headings, [
    'Summary',
    'What was built',
    'Facts and sources',
    'Assumed',
    'To go live',
    'Talking points',
    'First contact',
  ]);
  assert.match(kit, /^Preview: <from the pull request comment>$/m);
  assert.match(kit, /editorial-calm/);
  assert.match(kit, /1\. Hero; 2\. Treatments/);
  assert.match(kit, /Build result:\*\* passed/);
  // every source, with URL and date
  for (const source of readBrief().prospect.sources) {
    assert.ok(kit.includes(source.field), source.field);
    assert.ok(kit.includes(source.url), source.url);
  }
  assert.match(
    kit,
    /\| contact\.phone \| \+34 954 000 111 \| https:\/\/example\.com\/alameda\/contacto \| 2026-10-30 \|/,
  );
  assert.match(kit, /\| contact\.hours \| .* \| The site does not list hours/);
  // go-live list
  for (const needle of [
    /own assets/,
    /Legal holder data/,
    /domain/,
    /prospect\.mjs sold --site alameda/,
    /\/landing-handoff alameda/,
  ])
    assert.match(kit, needle);
  // talking points come from the brief
  assert.match(kit, /Una cita rápida/);
  assert.match(kit, /Miedo al dentista/);
  // first contact: the owner writes it, restrictions stated, not legal advice
  assert.match(kit, /You write the first message yourself/);
  assert.match(kit, /LSSI/);
  assert.match(kit, /not legal advice/i);
  // no message addressed to the prospect
  assert.doesNotMatch(
    kit,
    /\b(Dear|Estimad[oa]|Hola,|Hello,|Subject:|Asunto:)/,
  );
});

test('kit works without PROPOSAL.md and RUN.md and lists uncovered facts', () => {
  const brief = readBrief();
  brief.audience = { who: '', needs: '', objections: '' };
  writeBrief(brief);
  assert.equal(cli(['kit', '--site', slug]).code, 0);
  const kit = readFileSync(join(site, 'SALES.md'), 'utf8');
  assert.match(kit, /not recorded/);
  assert.match(kit, /ask the business before you talk about the page/);
});

test('kit refuses a brief that is not a prospect or already sold', () => {
  cli(['write', '--site', slug]);
  assert.equal(cli(['sold', '--site', slug]).code, 0);
  const sold = cli(['kit', '--site', slug]);
  assert.equal(sold.code, 1);
  assert.match(sold.stderr, /already sold/);
  assert.equal(existsSync(join(site, 'SALES.md')), false);
});

test('sold changes only the status and prospect.json, keeps the sources and prints the next steps', () => {
  cli(['write', '--site', slug]);
  const before = readBrief();
  writeFileSync(join(site, 'PROPOSAL.md'), 'keep me\n');
  const run = cli(['sold', '--site', slug]);
  assert.equal(run.code, 0, run.stderr);
  const after = readBrief();
  assert.equal(after.prospect.status, 'sold');
  assert.deepEqual(after.prospect.sources, before.prospect.sources);
  before.prospect.status = 'sold';
  assert.deepEqual(after, before);
  assert.equal(JSON.parse(readFileSync(dataPath, 'utf8')).status, 'sold');
  assert.equal(readFileSync(join(site, 'PROPOSAL.md'), 'utf8'), 'keep me\n');
  assert.deepEqual(
    existsSync(join(site, 'dist')) || existsSync(join(site, 'SALES.md')),
    false,
  );
  assert.match(run.stdout, /\/brief-intake alameda/);
  assert.match(run.stdout, /\/landing-handoff alameda/);
  assert.match(run.stdout, /revise/);
  assert.equal(cli(['write', '--site', slug, '--check']).code, 0);
});

test('sold refuses a site without a prospect section and one already sold', () => {
  assert.equal(cli(['sold', '--site', slug]).code, 0);
  const again = cli(['sold', '--site', slug]);
  assert.equal(again.code, 1);
  assert.match(again.stderr, /already marked as sold/);

  const brief = readBrief();
  delete brief.prospect;
  brief.assumed = [];
  brief.business.city = '';
  brief.business.country = '';
  brief.contact = { email: '', phone: '', address: '', hours: '', social: [] };
  brief.offer = [];
  brief.goal.primary.url = '';
  writeBrief(brief);
  const none = cli(['sold', '--site', slug]);
  assert.equal(none.code, 1);
  assert.match(none.stderr, /not a prospect landing/);
});
