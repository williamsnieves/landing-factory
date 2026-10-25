// Tests for the `languages` field of the brief (add-bilingual-landing): validation, locales helper, missing, summary.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  briefLocales,
  emptyBrief,
  missingFields,
  summarizeBrief,
  validateBrief,
} from '../scripts/lib/brief-schema.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/brief');
const fixture = () =>
  JSON.parse(readFileSync(join(FIXTURE, 'brief.json'), 'utf8'));
const errorsOf = (brief) =>
  validateBrief(brief, {
    baseDir: FIXTURE,
    patternsDir: join(ROOT, 'patterns'),
  });
const paths = (errors) => errors.map((e) => e.path);

test('languages: a list of lowercase tags that includes the default language; an older brief stays valid', () => {
  const brief = fixture();
  delete brief.languages;
  assert.deepEqual(errorsOf(brief), [], 'no languages field is valid');
  for (const languages of [
    [],
    [brief.language],
    [brief.language, 'en', 'fr'],
  ]) {
    brief.languages = languages;
    assert.deepEqual(errorsOf(brief), [], JSON.stringify(languages));
  }
  assert.deepEqual(emptyBrief().languages, []);
});

test('languages: duplicates, a missing default, a bad tag and a non-array are errors naming the field', () => {
  const brief = fixture();
  const lang = brief.language;
  const other = lang === 'en' ? 'es' : 'en';

  brief.languages = [lang, other, other];
  assert.deepEqual(paths(errorsOf(brief)), ['languages[2]']);
  assert.match(errorsOf(brief)[0].message, /duplicate/);

  brief.languages = [other];
  assert.deepEqual(paths(errorsOf(brief)), ['languages']);
  assert.match(
    errorsOf(brief)[0].message,
    new RegExp(`default language "${lang}"`),
  );

  brief.languages = [lang, 'EN'];
  assert.deepEqual(paths(errorsOf(brief)), ['languages[1]']);
  assert.match(errorsOf(brief)[0].message, /lowercase language tag/);

  brief.languages = 'es,en';
  assert.deepEqual(paths(errorsOf(brief)), ['languages']);
});

test('briefLocales puts the default first and reports whether the brief is multilingual', () => {
  assert.deepEqual(briefLocales({ language: 'en' }), {
    defaultLocale: 'en',
    locales: ['en'],
    multilingual: false,
  });
  assert.deepEqual(
    briefLocales({ language: 'en', languages: ['es', 'en', 'es'] }),
    { defaultLocale: 'en', locales: ['en', 'es'], multilingual: true },
  );
  assert.equal(
    briefLocales({ language: 'en', languages: ['en'] }).multilingual,
    false,
  );
  assert.equal(briefLocales(null).multilingual, false);
});

test('brief missing lists languages until it is answered; summary shows the locales', () => {
  const brief = emptyBrief({ language: 'en' });
  const entry = missingFields(brief).find((f) => f.path === 'languages');
  assert.ok(entry, 'listed while empty');
  assert.equal(entry.required, false);
  assert.match(entry.hint, /One language or more/);
  brief.languages = ['en'];
  assert.ok(!missingFields(brief).some((f) => f.path === 'languages'));
  brief.business.name = 'Ana';
  brief.languages = ['en', 'es'];
  assert.match(summarizeBrief(brief), /^Ana \[en, es; default en\]/);
});
