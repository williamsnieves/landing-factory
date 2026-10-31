// Tests for the archetype catalog and its validator (scripts/validate-archetypes.mjs).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  SIGNALS,
  TRAITS,
  loadCatalog,
  parseFrontmatter,
  validateArchetype,
} from '../scripts/lib/archetypes.mjs';
import { validateFiles } from '../scripts/validate-archetypes.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'archetypes-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const sheet = (name) =>
  readFileSync(join(ROOT, 'design-archetypes', `${name}.md`), 'utf8');
const quiet = { log() {}, error() {} };

test('the catalog has 11 valid sheets and the validator exits 0', () => {
  assert.equal(loadCatalog(ROOT).length, 11);
  const r = spawnSync(process.execPath, ['scripts/validate-archetypes.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /11 sheet\(s\) valid/);
});

test('every trait has exactly one owner sheet and every signal is used', () => {
  const catalog = loadCatalog(ROOT);
  const lent = catalog.flatMap((a) => a.lends);
  assert.deepEqual([...lent].sort(), [...TRAITS].sort());
  const used = new Set(catalog.flatMap((a) => [...a.fits, ...a.avoid]));
  for (const s of SIGNALS) assert.ok(used.has(s), `signal ${s} is never used`);
});

test('the README documents every signal and trait', () => {
  const readme = readFileSync(
    join(ROOT, 'design-archetypes/README.md'),
    'utf8',
  );
  for (const word of [...SIGNALS, ...TRAITS])
    assert.ok(readme.includes(`\`${word}\``), `${word} missing in README`);
  assert.match(readme, /starting grammar, not a template/);
});

test('archetypes are different compositions: no two share their whole signature', () => {
  const sigs = loadCatalog(ROOT).map((a) => JSON.stringify(a.signature));
  assert.equal(new Set(sigs).size, sigs.length);
});

test('a missing field, an unknown signal and an undefined lent trait are reported', () => {
  const good = sheet('swiss-grid-minimal');
  assert.deepEqual(validateArchetype(good, 'swiss-grid-minimal'), []);

  const noSummary = good.replace(/^summary:.*$/m, '');
  assert.match(
    validateArchetype(noSummary, 'swiss-grid-minimal')
      .map((v) => `${v.field}: ${v.message}`)
      .join('\n'),
    /summary: is required/,
  );

  const unknownSignal = good.replace(/premium/, 'fancy');
  const v1 = validateArchetype(unknownSignal, 'swiss-grid-minimal');
  assert.ok(
    v1.some(
      (v) =>
        v.field === 'signals.fits' && /unknown signal "fancy"/.test(v.message),
    ),
    JSON.stringify(v1),
  );

  const undefinedTrait = good.replace(
    /^- `split-sticky`:.*$/m,
    '- `something-else`: not the lent trait.',
  );
  const v2 = validateArchetype(undefinedTrait, 'swiss-grid-minimal');
  assert.ok(
    v2.some(
      (v) =>
        v.field === 'lends' && /"split-sticky" is not defined/.test(v.message),
    ),
    JSON.stringify(v2),
  );

  const noSection = good.replace('## Motion', '## Movement');
  assert.ok(
    validateArchetype(noSection, 'swiss-grid-minimal').some(
      (v) => v.field === 'section Motion',
    ),
  );
  const badFeature = good.replace('sectionCount:', 'sectionCounts:');
  assert.ok(
    validateArchetype(badFeature, 'swiss-grid-minimal').some((v) =>
      /unknown feature/.test(v.message),
    ),
  );
  const badRange = good.replace(
    /buttonShape: \[[^\]]*\]/,
    'buttonShape: [oval]',
  );
  assert.ok(
    validateArchetype(badRange, 'swiss-grid-minimal').some((v) =>
      /unknown value "oval"/.test(v.message),
    ),
  );
  assert.ok(
    validateArchetype(good, 'another-name').some((v) => v.field === 'name'),
  );
  assert.ok(
    validateArchetype(
      `${good}\nSee https://example.com\n`,
      'swiss-grid-minimal',
    ).some((v) => v.field === 'content'),
  );
  assert.equal(
    validateArchetype('# no front matter', 'x')[0].field,
    'front matter',
  );
});

test('a trait lent by two sheets is reported, and the CLI names sheet, line and field', () => {
  const dir = mkdtempSync(join(tmp, 'sheets-'));
  const a = join(dir, 'swiss-grid-minimal.md');
  const b = join(dir, 'brutalist-raw.md');
  writeFileSync(a, sheet('swiss-grid-minimal'));
  writeFileSync(
    b,
    sheet('brutalist-raw')
      .replace(
        'lends: [visible-grid, mono-labels]',
        'lends: [flush-left-axis, mono-labels]',
      )
      .replace('- `visible-grid`:', '- `flush-left-axis`:'),
  );
  assert.ok(validateFiles([a, b]).some((v) => /already lent/.test(v.message)));
  const r = spawnSync(
    process.execPath,
    ['scripts/validate-archetypes.mjs', b],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  assert.equal(r.status, 0, r.stderr);
  writeFileSync(b, sheet('brutalist-raw').replace(/^hero:.*$/m, ''));
  const bad = spawnSync(
    process.execPath,
    ['scripts/validate-archetypes.mjs', b],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /brutalist-raw\.md:\d+ \[hero\] is required/);
});

test('the front matter parser reads wrapped and moved flow lists', () => {
  const { data } = parseFrontmatter(
    '---\nname: x\nsignals:\n  fits:\n    [a, b,\n      c]\n  avoid: []\n---\n',
  );
  assert.deepEqual(data.signals.fits, ['a', 'b', 'c']);
  assert.deepEqual(data.signals.avoid, []);
  assert.equal(parseFrontmatter('---\nname x\n---').data, null);
});

test('CLI help and unknown options', () => {
  const run = (...args) =>
    spawnSync(process.execPath, ['scripts/validate-archetypes.mjs', ...args], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  assert.equal(run('--help').status, 0);
  assert.equal(run('--nope').status, 2);
  assert.equal(readdirSync(join(ROOT, 'design-archetypes')).length, 12);
  void quiet;
});
