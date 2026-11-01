// The copy-frameworks skill, the vendored copywriting skill and the skills that use them (add-copy-frameworks, tasks 4.1 to 4.4).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { FRAMEWORKS } from '../scripts/lib/copy-frameworks.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('copywriting is vendored from the marketingskills commit, with a lock entry and the license', () => {
  const lock = JSON.parse(read('agent-tooling.lock.json'));
  const entry = lock.tools.find((t) => t.name === 'copywriting');
  assert.ok(entry, 'lock entry');
  const seo = lock.tools.find((t) => t.name === 'seo-audit');
  assert.equal(entry.fetch.repo, seo.fetch.repo);
  assert.equal(entry.commit, seo.commit);
  assert.equal(entry.commit, '0cd9b3a0ef4c411a1d690419ce843f2a1da32cce');
  assert.equal(entry.fetch.subpath, 'skills/copywriting');
  assert.equal(entry.path, '.claude/skills/copywriting');
  assert.equal(entry.license, 'MIT');
  assert.deepEqual(entry.licenseFiles, [
    'third-party-licenses/marketingskills.LICENSE',
  ]);
  assert.match(entry.role, /never picks the framework/);
  assert.ok(existsSync(join(ROOT, entry.skillFile)), entry.skillFile);
});

test('copy-frameworks describes every catalog id and names the picker, the plan, 4U and the role split', () => {
  const skill = read('.claude/skills/copy-frameworks/SKILL.md');
  const frameworks = read(
    '.claude/skills/copy-frameworks/references/frameworks.md',
  );
  const headlines = read(
    '.claude/skills/copy-frameworks/references/headlines.md',
  );
  assert.match(skill, /^name: copy-frameworks$/m);
  for (const f of FRAMEWORKS) {
    assert.ok(
      new RegExp(`^## ${f.id}: `, 'm').test(frameworks),
      `${f.id} has a section`,
    );
    for (const stage of f.stages)
      assert.ok(
        frameworks.includes(stage.name.slice(1)),
        `${f.id}/${stage.name}`,
      );
  }
  for (const needle of [
    'node scripts/pick-copy-framework.mjs --site <slug>',
    '## Copy plan',
    'Stage to section',
    'Proof inventory',
    '4U',
    '`copywriting`',
    '.agents/product-marketing.md',
    'never picks the framework',
    'no proof available',
    'the Copy plan wins',
  ])
    assert.ok(skill.includes(needle), needle);
  for (const word of ['Useful', 'Urgent', 'Unique', 'Ultra-specific'])
    assert.ok(headlines.toLowerCase().includes(word.toLowerCase()), word);
});

test('new-landing runs the picker, writes the Copy plan, shows only brief proof and lists the read-through', () => {
  const skill = read('.claude/skills/new-landing/SKILL.md');
  for (const needle of [
    'node scripts/pick-copy-framework.mjs --site <slug>',
    '.claude/skills/copy-frameworks/SKILL.md',
    '.claude/skills/copywriting/SKILL.md',
    '"Copy plan"',
    'problem-aware',
    '4U',
    "the brief's `proof` list and nothing else",
    'no proof available',
    'copy-claims',
    'a person must read the whole copy before publishing',
  ])
    assert.ok(skill.includes(needle), needle);
  assert.ok(
    skill.indexOf('Copy plan: fill') < skill.indexOf('### 3. Checkpoint'),
    'the plan is written in the synthesis',
  );
  assert.ok(skill.indexOf('**Copy** (skills') > skill.indexOf('### 5. Build'));
  assert.match(read('scripts/new-site.mjs'), /## Copy plan/);
});

test('brief-intake asks for proof without suggesting any and for awareness in plain words', () => {
  const skill = read('.claude/skills/brief-intake/SKILL.md');
  for (const needle of [
    '## The proof question',
    '## The awareness question',
    'proof cannot be assumed',
    'Never suggest, draft or "improve" proof',
    '`audience.awareness`',
    'unaware',
    'most-aware',
    'this one may be assumed',
  ])
    assert.ok(skill.includes(needle), needle);
});

test('revise-landing keeps the framework for copy items and runs copy-claims', () => {
  const skill = read('.claude/skills/revise-landing/SKILL.md');
  for (const needle of [
    "keeps the landing's copy framework",
    '"Copy plan" of `PROPOSAL.md`',
    '`copy-claims`',
    'goes into `proof` in `brief.json` first',
  ])
    assert.ok(skill.includes(needle), needle);
});

test('the read-only picker is allowed in .claude/settings.json and nothing broader', () => {
  const settings = JSON.parse(read('.claude/settings.json'));
  assert.ok(
    settings.permissions.allow.includes(
      'Bash(node scripts/pick-copy-framework.mjs *)',
    ),
  );
  assert.ok(!settings.permissions.allow.some((p) => /^Bash\(node \*/.test(p)));
});
