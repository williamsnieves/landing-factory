// The conversion-psychology skill, the vendored cro and marketing-psychology skills and the skills that use
// them (add-neuromarketing-review, tasks 3.1 to 3.4).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const SKILL = '.claude/skills/conversion-psychology';

test('cro and marketing-psychology are vendored from the marketingskills commit, with lock entries and the license', () => {
  const lock = JSON.parse(read('agent-tooling.lock.json'));
  const seo = lock.tools.find((t) => t.name === 'seo-audit');
  for (const name of ['cro', 'marketing-psychology']) {
    const entry = lock.tools.find((t) => t.name === name);
    assert.ok(entry, `${name} lock entry`);
    assert.equal(entry.fetch.repo, seo.fetch.repo);
    assert.equal(entry.commit, '0cd9b3a0ef4c411a1d690419ce843f2a1da32cce');
    assert.equal(entry.fetch.subpath, `skills/${name}`);
    assert.equal(entry.path, `.claude/skills/${name}`);
    assert.equal(entry.license, 'MIT');
    assert.equal(entry.installMethod, 'vendored');
    assert.deepEqual(entry.licenseFiles, [
      'third-party-licenses/marketingskills.LICENSE',
    ]);
    assert.ok(existsSync(join(ROOT, entry.skillFile)), entry.skillFile);
    assert.match(read(entry.skillFile), new RegExp(`^name: ${name}$`, 'm'));
  }
  const cro = lock.tools.find((t) => t.name === 'cro');
  assert.match(cro.role, /review framework for a built page/i);
  assert.match(
    cro.role,
    /never decides palette, fonts, the copy framework or facts/,
  );
  assert.ok(
    existsSync(join(ROOT, '.claude/skills/cro/references')),
    'cro keeps references/',
  );
  const mp = lock.tools.find((t) => t.name === 'marketing-psychology');
  assert.match(mp.role, /Conversion plan/);
  assert.match(
    mp.role,
    /never decides palette, fonts, the copy framework or facts/,
  );
});

/** Entries of principles.md: { id, area, fields }. */
function catalog() {
  const text = read(`${SKILL}/references/principles.md`);
  return [
    ...text.matchAll(
      /^### (\w+)\/([\w-]+)\n([\s\S]*?)(?=^#{2,3} |\s*$(?![\s\S]))/gm,
    ),
  ].map((m) => {
    const fields = {};
    for (const f of m[3].matchAll(/^- \*\*(\w+):\*\* (.+)$/gm))
      fields[f[1]] = f[2];
    return { id: `${m[1]}/${m[2]}`, area: m[1], fields };
  });
}

test('every area of the catalog has principles with an evidence level, a constraint and a never', () => {
  const entries = catalog();
  assert.equal(
    entries.length,
    (read(`${SKILL}/references/principles.md`).match(/^### /gm) ?? []).length,
    'every ### entry is parsed',
  );
  const areas = [
    'attention',
    'fluency',
    'emotion',
    'trust',
    'risk',
    'choice',
    'price',
    'memory',
    'reciprocity',
    'ethics',
  ];
  for (const area of areas)
    assert.ok(
      entries.some((e) => e.area === area),
      `area ${area}`,
    );
  assert.deepEqual(
    [...new Set(entries.map((e) => e.area))].sort(),
    [...areas].sort(),
  );
  for (const e of entries) {
    assert.match(
      e.fields.Evidence ?? '',
      /^(strong|mixed|weak)$/,
      `${e.id} evidence`,
    );
    for (const key of ['Means', 'Apply', 'Constraint', 'Never'])
      assert.ok((e.fields[key] ?? '').length > 15, `${e.id} ${key}`);
  }
  assert.equal(
    new Set(entries.map((e) => e.id)).size,
    entries.length,
    'unique ids',
  );
});

test('the weak principles of the guide are marked weak, with the constraint that wins', () => {
  const byId = Object.fromEntries(catalog().map((e) => [e.id, e]));
  for (const id of [
    'emotion/color-emotion',
    'fluency/font-disfluency',
    'price/round-vs-exact',
    'emotion/smile',
    'emotion/progress-and-reward',
  ])
    assert.equal(byId[id]?.fields.Evidence, 'weak', id);
  assert.match(
    byId['emotion/color-emotion'].fields.Constraint,
    /ui-ux-pro-max picks the palette/,
  );
  assert.match(
    byId['fluency/font-disfluency'].fields.Constraint,
    /Legibility and QA win/,
  );
  assert.match(
    byId['price/round-vs-exact'].fields.Constraint,
    /Prices are customer facts/,
  );
  assert.equal(byId['choice/fewer-choices'].fields.Evidence, 'strong');
  assert.equal(byId['trust/real-proof'].fields.Evidence, 'strong');
});

test('the ten strategies of the guide are mapped, each to entries that exist', () => {
  const text = read(`${SKILL}/references/principles.md`);
  const ids = new Set(catalog().map((e) => e.id));
  for (const strategy of [
    'Irresistible headlines',
    'Emotional responses',
    'Attention with gaze',
    'Dopamine and reward',
    'Colors and emotion',
    'Fewer choices',
    'Pricing',
    'Fonts',
    'Trust',
    'The smile',
  ])
    assert.ok(text.includes(`| ${strategy}`), strategy);
  const table = text.split('## The branches')[0];
  for (const ref of table.matchAll(/`(\w+\/[\w-]+)`/g))
    assert.ok(ids.has(ref[1]), `${ref[1]} exists`);
  for (const branch of [
    'Cognitive fluency',
    'Reciprocity',
    'Risk reversal',
    'Decision architecture',
    'Price perception',
    'Storytelling',
    'Memory',
    'Ecommerce',
    'Ethics',
  ])
    assert.ok(text.includes(`| ${branch}`), branch);
  for (const out of ['Gamification', 'Popups', 'A/B tests'])
    assert.ok(text.includes(out), `out of scope: ${out}`);
});

test('the skill names the audit, the plan fields, the allowed edits and the role split', () => {
  const skill = read(`${SKILL}/SKILL.md`);
  assert.match(skill, /^name: conversion-psychology$/m);
  for (const needle of [
    'node scripts/conversion-audit.mjs --site <slug>',
    '--json',
    '## Conversion plan',
    '**Emotional target.**',
    '**Attention path.**',
    '**Choice.**',
    '**Trust and risk.**',
    '**Ending.**',
    '**Ethics check.**',
    'Fear and anger are never targets',
    '**Allowed edits:**',
    '**Never changed in the review:**',
    'one round',
    'Re-run `npm run qa',
    'undo the edit that caused it',
    'RUN.md "Conversion review"',
    '`copy-frameworks`',
    '`marketing-psychology`',
    '`cro`',
    '`ui-ux-pro-max`',
    '.agents/product-marketing.md',
    'the catalog wins',
    'dark-patterns',
    'claims no neuroscience results',
  ])
    assert.ok(skill.includes(needle), needle);
  for (const id of [
    'hero-h1',
    'hero-cta',
    'closing-cta',
    'cta-destinations',
    'form-fields',
    'offers-side-by-side',
    'proof-shown',
    'proof-without-brief',
    'contact-visible',
    'legal-linked',
  ])
    assert.ok(skill.includes(`\`${id}\``), id);
  assert.ok(existsSync(join(ROOT, `${SKILL}/references/ethics.md`)));
  const ethics = read(`${SKILL}/references/ethics.md`);
  assert.match(ethics, /confirmshaming/i);
  assert.match(ethics, /countdown|ticking timer/i);
  assert.match(ethics, /pre-checked/i);
});

test('new-landing writes the Conversion plan, the review round, the RUN.md section and mentions dark-patterns', () => {
  const skill = read('.claude/skills/new-landing/SKILL.md');
  for (const needle of [
    '.claude/skills/conversion-psychology/SKILL.md',
    '.claude/skills/marketing-psychology/SKILL.md',
    '.claude/skills/cro/SKILL.md',
    '"Conversion plan"',
    'emotional target',
    '`Emotional target:` line',
    'node scripts/conversion-audit.mjs --site <slug>',
    'section-shots.mjs',
    'Allowed edits:',
    '**Forbidden:**',
    'undo the edit that caused it',
    '"Conversion review"',
    'for a person',
    '`dark-patterns`',
    '`dark-patterns-no-build`',
  ])
    assert.ok(skill.includes(needle), needle);
  assert.ok(
    skill.indexOf('Conversion plan: fill') > skill.indexOf('Copy plan: fill') &&
      skill.indexOf('Conversion plan: fill') <
        skill.indexOf('### 3. Checkpoint'),
    'the Conversion plan comes after the Copy plan, in the synthesis',
  );
  assert.ok(
    skill.indexOf('### 6b. Conversion review') >
      skill.indexOf('### 6. QA loop') &&
      skill.indexOf('### 6b. Conversion review') <
        skill.indexOf('### 7. Polish'),
    'the review sits between QA and the polish',
  );
  assert.match(read('scripts/new-site.mjs'), /## Conversion plan/);
  assert.match(read('scripts/new-site.mjs'), /## Conversion review/);
  assert.match(read('design-system/_template.md'), /^Emotional target:/m);
});

test('revise-landing runs the audit after copy or content items and fixes nothing unrelated', () => {
  const skill = read('.claude/skills/revise-landing/SKILL.md');
  for (const needle of [
    'node scripts/conversion-audit.mjs --site <slug> --json',
    '`copy` or `content` items',
    'new',
    'REVISION.md',
    'Do not fix findings the round did not cause',
  ])
    assert.ok(skill.includes(needle), needle);
});

test('the read-only audit is allowed in .claude/settings.json and nothing broader', () => {
  const settings = JSON.parse(read('.claude/settings.json'));
  assert.ok(
    settings.permissions.allow.includes(
      'Bash(node scripts/conversion-audit.mjs *)',
    ),
  );
  assert.ok(!settings.permissions.allow.some((p) => /^Bash\(node \*/.test(p)));
});
