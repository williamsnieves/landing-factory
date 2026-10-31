// The repo-owned skills and the CLAUDE.md section name the prospect rules (add-prospect-landings).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('the brief-intake skill asks for the source of each fact and forbids brand and consent for a prospect', () => {
  const skill = read('.claude/skills/brief-intake/SKILL.md');
  for (const needle of [
    'The prospect question',
    '`prospect.status: "prospect"`',
    '`prospect.sources`',
    'https://',
    'YYYY-MM-DD',
    'never in both',
    "a prospect landing cannot use the prospect's brand",
    'a prospect cannot consent',
    'prospect.mjs sold',
  ])
    assert.ok(skill.includes(needle), needle);
});

test('the new-landing skill names the prospect rules: sources, archive images, notice, write, check and the kit', () => {
  const skill = read('.claude/skills/new-landing/SKILL.md');
  for (const needle of [
    'Prospect landings',
    'Prospect: facts and sources',
    'Commons and The Met only',
    'no AI images',
    'ui-ux-pro-max only',
    'node scripts/prospect.mjs write --site <slug>',
    'data-prospect-notice',
    'X-Robots-Tag: noindex',
    '`prospect` rule',
    'node scripts/prospect.mjs kit --site <slug>',
    'holds no message to the prospect',
  ])
    assert.ok(skill.includes(needle), needle);
});

test('CLAUDE.md has the Prospect landings section, the command row and the new-site copy', () => {
  const doc = read('CLAUDE.md');
  assert.match(doc, /^## Prospect landings$/m);
  assert.ok(
    doc.includes(
      'node scripts/prospect.mjs <write\\|kit\\|sold> --site <slug>',
    ),
  );
  assert.ok(doc.includes('`src/components/prospect/`'));
  assert.ok(read('docs/prospect.md').includes('SALES.md'));
});
