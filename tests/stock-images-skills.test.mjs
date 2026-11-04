// The repo-owned skills and docs name the stock image rules (add-stock-images).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('the new-landing skill names the source order, the Pixabay and Pexels commands and the license rules', () => {
  const skill = read('.claude/skills/new-landing/SKILL.md');
  for (const needle of [
    'Source order and stock photos',
    "1) the customer's files; 2) AI images",
    '3) Pexels photos the owner imported',
    '4) Pixabay',
    '6) SVG and CSS art',
    'find-images.mjs search "<query>" --source pixabay --lang <page language>',
    'get <slug> pixabay:<id> --as <name>',
    'find-images.mjs import <slug> <file> --source pexels',
    'PIXABAY_API_KEY',
    'no recognisable trademark, logo or brand',
    'never as part of a logo, brand mark, trade name or business name',
    'never sits next to a quote, a name, a testimonial or a result',
    'Foto ilustrativa',
    'Illustrative photo',
    'at least half of the sections',
    'visual-assets',
    '--sources pixabay,commons,met',
    'fall back to Commons',
  ])
    assert.ok(skill.includes(needle), needle);
  assert.doesNotMatch(
    skill.split('\n')[2],
    /openly licensed Commons photos/,
    'the front matter mentions the stock sources',
  );
  assert.match(skill.split('\n')[2], /Pixabay/);
});

test('the revise-landing skill follows the same source order', () => {
  const skill = read('.claude/skills/revise-landing/SKILL.md');
  for (const needle of [
    'Source order and stock photos',
    'find-images.mjs import',
    '--source pixabay',
    'visual-assets',
  ])
    assert.ok(skill.includes(needle), needle);
});

test('CLAUDE.md and docs/images.md describe the stock sources and the visual-assets rule', () => {
  const doc = read('CLAUDE.md');
  for (const needle of [
    '`--source pixabay`',
    '`PIXABAY_API_KEY`',
    '`visual-assets`',
    'Photos provided by Pixabay',
    'pixabay.mjs',
  ])
    assert.ok(doc.includes(needle), needle);
  const guide = read('docs/images.md');
  for (const needle of [
    'PIXABAY_API_KEY',
    'not** a GitHub secret',
    'find-images.mjs import',
    '2026-11-04',
    'visual-assets-sparse',
    'not legal advice',
  ])
    assert.ok(guide.includes(needle), needle);
});
