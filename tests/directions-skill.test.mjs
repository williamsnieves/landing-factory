// The repo-owned skill and docs name the directions rules (add-landing-preview).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('the new-landing skill drives the directions run and the resume after the choice', () => {
  const skill = read('.claude/skills/new-landing/SKILL.md');
  assert.match(skill, /argument-hint: .*\[--directions \[--count 2\|3\]\]/);
  for (const needle of [
    '## Directions run (`--directions`)',
    '**primary archetypes all differ**',
    'a `custom` blend counts as its own primary',
    'node scripts/pick-archetypes.mjs --site <slug> --top 8 --json',
    '**ui-ux-pro-max only**',
    'not design-taste-frontend, not impeccable',
    'src/pages/directions/<id>/index.astro',
    '`noindex`',
    'data-direction="<id>"',
    'src/styles/directions/<id>.css',
    'src/components/directions/<id>/',
    'node scripts/directions.mjs check --site <slug>',
    '`Result: directions`',
    'Never choose for the customer',
    '**Resume after the choice.**',
    'no direction chosen: run node scripts/directions.mjs choose',
    "the customer's `choice.notes` are fixed inputs",
    'remove `src/pages/directions/`, `src/styles/directions/`, `src/components/directions/`',
    'keep `directions.json` and `DIRECTIONS.md` as the record',
    'A site without `directions.json` builds exactly as before',
  ])
    assert.ok(skill.includes(needle), needle);
});

test('the permissions allow the directions script and choice tool but not the preview job', () => {
  const allow = JSON.parse(read('.claude/settings.json')).permissions.allow;
  assert.ok(allow.includes('Bash(node scripts/directions.mjs *)'));
  assert.ok(allow.includes('mcp__landing-factory__choose_direction'));
  assert.ok(!allow.includes('mcp__landing-factory__preview_landing'));
  assert.equal(
    JSON.parse(read('package.json')).scripts.directions,
    'node scripts/directions.mjs',
  );
});
