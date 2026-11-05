// The impact level and the signature moment in the skills (add-calm-statement-archetype, task 3.2).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('new-landing fills the signature moment in the synthesis and records it in RUN.md', () => {
  const skill = read('.claude/skills/new-landing/SKILL.md');
  for (const needle of [
    'Signature moment',
    'right after "Archetype blend"',
    '**section**',
    '**what it shows**',
    '**technique**',
    '**reduced motion and without JavaScript**',
    '**brief facts it uses**',
    'It exists at every impact level',
    'never invents proof, figures, results or testimonials',
    'Signature moment: built as planned',
    'Signature moment: changed: <why>',
  ])
    assert.ok(skill.includes(needle), needle);
  assert.ok(
    skill.indexOf('- Signature moment:') > skill.indexOf('7) Impact:'),
    'the signature moment step comes after the archetype blend step',
  );
});

test('new-landing uses brand.impact: separate from the copy tone, balanced assumed when missing', () => {
  const skill = read('.claude/skills/new-landing/SKILL.md');
  for (const needle of [
    '`brand.impact`',
    '`quiet`, `balanced` or `bold`',
    'separate from the tone of the copy',
    'a calm tone does not mean a quiet look',
    '`balanced` is assumed when it is empty',
  ])
    assert.ok(skill.includes(needle), needle);
});

test('brief-intake asks the impact question without assuming and explains the levels', () => {
  const skill = read('.claude/skills/brief-intake/SKILL.md');
  const section = skill.slice(skill.indexOf('## The impact question'));
  assert.ok(section.length > 0 && skill.includes('## The impact question'));
  for (const needle of [
    'How striking should the page look?',
    '`quiet`',
    '`balanced`',
    '`bold`',
    'separate from the tone of the copy',
    'Never assume the answer while you interview',
    'list `brand.impact` in `assumed`',
  ])
    assert.ok(section.includes(needle), needle);
});
