// The repo-owned skills and docs name the multi-locale rules (add-bilingual-landing).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('the brief-intake skill asks one language or more and records languages without assuming', () => {
  const skill = read('.claude/skills/brief-intake/SKILL.md');
  for (const needle of [
    'The languages question',
    'one language or more',
    '`languages`',
    'lowercase tag',
    'default one',
    'Never assume it',
  ])
    assert.ok(skill.includes(needle), needle);
  // It comes after the offer in the topic order.
  assert.ok(
    skill.indexOf('offer (name') < skill.indexOf('page languages (one or more'),
  );
});

test('the new-landing skill names the multi-locale rules: copy per locale, dictionary, switcher, legal, disclosure, checks', () => {
  const skill = read('.claude/skills/new-landing/SKILL.md');
  assert.match(skill, /argument-hint: .*\[--langs en,es\]/);
  for (const needle of [
    'Multi-locale landings',
    'natural, idiomatic text',
    'not a word-for-word translation',
    'same sections',
    'src/i18n/ui.ts',
    't(Astro.currentLocale)',
    '<LanguageSwitcher',
    'hreflang',
    'x-default',
    'no redirect by browser language',
    'localeSlugs',
    'legalPath(legal',
    '`aiDisclosure`',
    'single `404.astro` stays in the default language',
    'measures the default locale',
    'i18n-absolute-urls',
    'native speaker',
  ])
    assert.ok(skill.includes(needle), needle);
});
