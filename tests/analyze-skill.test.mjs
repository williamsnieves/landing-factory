import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const skill = readFileSync(
  new URL('../.claude/skills/analyze-reference/SKILL.md', import.meta.url),
  'utf8',
);

test('SKILL.md has the frontmatter Claude Code needs to expose /analyze-reference', () => {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(skill);
  assert.ok(m, 'frontmatter block');
  assert.match(m[1], /^name: analyze-reference$/m);
  assert.match(m[1], /^description: .{120,}/m);
  assert.match(m[1], /^user-invocable: true$/m);
  assert.match(m[1], /^argument-hint: /m);
});

test('SKILL.md documents the pipeline, the abort cases and the MIT attribution', () => {
  for (const needle of [
    'check-robots.mjs',
    'recon.mjs',
    '--cleanup',
    'npm run validate:patterns',
    'patterns/_template.md',
    'rea-agents analyze-javascript-application',
    'JCodesMore/ai-website-cloner-template',
    'MIT',
    'not legal advice',
    'Abort cases',
  ])
    assert.ok(skill.includes(needle), `missing: ${needle}`);
});
