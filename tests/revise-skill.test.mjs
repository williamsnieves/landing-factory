// The repo-owned revise-landing skill, its permissions and its package script (add-landing-revise).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('the skill is user-invocable and takes the round and the feedback file', () => {
  const skill = read('.claude/skills/revise-landing/SKILL.md');
  assert.match(skill, /^---\nname: revise-landing\n/);
  assert.match(skill, /\nuser-invocable: true\n/);
  assert.match(
    skill,
    /argument-hint: '<slug> --round N --feedback-file <file> \[--max-attempts N\]'/,
  );
});

test('the skill names the item kinds, the rebuild stop, facts first and the edit scope', () => {
  const skill = read('.claude/skills/revise-landing/SKILL.md');
  for (const needle of [
    '`fact`',
    '`copy`',
    '`content`',
    '`style`',
    '`rebuild`',
    '`Result: needs-rebuild`',
    'edit nothing',
    '`scripts/new-landing.sh <slug> --directions`',
    '**Facts first.**',
    'node scripts/brief.mjs validate --site <slug>',
    '`briefChanged: true`',
    '**Edit only** `sites/<slug>/` and `design-system/<slug>/MASTER.md`',
    "**The customer's text is stored as given.**",
    'Never edit an earlier round',
  ])
    assert.ok(skill.includes(needle), needle);
});

test('the skill runs every check and never commits, pushes, deploys or syncs', () => {
  const skill = read('.claude/skills/revise-landing/SKILL.md');
  for (const needle of [
    'npm run qa -- --site <slug>',
    'npm run report -- --site <slug> --only static',
    'node scripts/layout-signature.mjs --site <slug> --write',
    'node scripts/check-landing.mjs --site <slug>',
    'node scripts/site-layers.mjs check --site <slug>',
    'npm run lint',
    'npx prettier --check .',
    '**Never commit, push, deploy or sync.**',
    'sites/<slug>/revisions.json',
    'sites/<slug>/REVISION.md',
  ])
    assert.ok(skill.includes(needle), needle);
});

test('the checks the skill needs are already allowed and nothing new is allowed for revision', () => {
  const allow = JSON.parse(read('.claude/settings.json')).permissions.allow;
  for (const entry of [
    'Bash(npm run *)',
    'Bash(node scripts/brief.mjs *)',
    'Bash(node scripts/check-landing.mjs *)',
    'Bash(node scripts/layout-signature.mjs *)',
    'Bash(node scripts/site-layers.mjs *)',
    'Bash(node scripts/credits.mjs *)',
    'Bash(node scripts/legal.mjs *)',
    'Bash(node scripts/section-shots.mjs *)',
    'Bash(git status *)',
  ])
    assert.ok(allow.includes(entry), entry);
  for (const entry of allow) {
    assert.ok(!/revise|sync-export|transfer|revisions\.mjs/.test(entry), entry);
  }
  assert.ok(!allow.includes('mcp__landing-factory__revise_landing'));
});

test('the package script and the git ignore cover the revision files', () => {
  assert.equal(
    JSON.parse(read('package.json')).scripts.revise,
    'bash scripts/revise-landing.sh',
  );
  assert.ok(existsSync(join(ROOT, 'scripts/revise-landing.sh')));
  assert.match(read('.gitignore'), /^sites\/\*\/\.revise\.log$/m);
});
