// Prospect section of the brief (design: openspec/changes/add-prospect-landings/design.md, Decisions 1 and 2).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PROSPECT_FACT_FIELDS,
  emptyBrief,
  isProspect,
  missingFields,
  prospectFactPaths,
  summarizeBrief,
  uncoveredProspectFacts,
  validateBrief,
} from '../scripts/lib/brief-schema.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixture = () =>
  JSON.parse(
    readFileSync(join(ROOT, 'tests/fixtures/prospect/brief.json'), 'utf8'),
  );
const errorsOf = (brief) => validateBrief(brief);
const paths = (errors) => errors.map((e) => e.path);
const source = (field) => ({
  field,
  url: 'https://example.com/x',
  retrieved: '2026-10-30',
});

test('a sourced prospect brief validates', () => {
  assert.deepEqual(errorsOf(fixture()), []);
  assert.equal(isProspect(fixture()), true);
});

test('the fact list covers names, contact, offers and the primary action', () => {
  assert.ok(PROSPECT_FACT_FIELDS.includes('contact.phone'));
  const facts = prospectFactPaths(fixture());
  assert.ok(facts.includes('business.name'));
  assert.ok(facts.includes('offer[0].price'));
  assert.ok(!facts.includes('offer[1].price'), 'an empty field is not a fact');
  assert.ok(!facts.includes('business.description'));
  assert.deepEqual(uncoveredProspectFacts(fixture()), []);
});

test('an uncovered fact fails naming the field', () => {
  const brief = fixture();
  brief.prospect.sources = brief.prospect.sources.filter(
    (s) => s.field !== 'contact.phone',
  );
  const errors = errorsOf(brief);
  assert.deepEqual(paths(errors), ['contact.phone']);
  assert.match(errors[0].message, /source/);
});

test('an assumed fact needs no source', () => {
  const brief = fixture();
  brief.prospect.sources = brief.prospect.sources.filter(
    (s) => s.field !== 'contact.phone',
  );
  brief.assumed.push({ field: 'contact.phone', reason: 'chosen' });
  assert.deepEqual(errorsOf(brief), []);
});

test('a parent source covers its children', () => {
  const brief = fixture();
  brief.prospect.sources = [source('business'), source('contact')];
  brief.prospect.sources.push(source('offer'), source('goal'));
  assert.deepEqual(errorsOf(brief), []);
});

test('a field in both sources and assumed fails', () => {
  const brief = fixture();
  brief.assumed.push({ field: 'contact.phone', reason: 'chosen' });
  const errors = errorsOf(brief);
  assert.deepEqual(paths(errors), ['prospect.sources[4].field']);
  assert.match(errors[0].message, /both sourced and assumed/);
});

test('a source must name a filled field, once, with an https URL and a real date', () => {
  const brief = fixture();
  brief.prospect.sources.push(source('contact.phone'));
  brief.prospect.sources.push(source('offer[1].price'));
  brief.prospect.sources.push({ ...source('notes'), url: 'http://x.com/a' });
  brief.prospect.sources.push({
    ...source('business'),
    retrieved: '2026-02-30',
  });
  brief.prospect.sources.push({
    ...source('business'),
    retrieved: '30/10/2026',
  });
  const messages = errorsOf(brief).map((e) => `${e.path}: ${e.message}`);
  assert.match(messages.join('\n'), /appears twice/);
  assert.match(messages.join('\n'), /empty or does not exist/);
  assert.match(messages.join('\n'), /starting with https/);
  assert.match(messages.join('\n'), /YYYY-MM-DD/);
});

test('sources without a status fail', () => {
  const brief = fixture();
  brief.prospect.status = '';
  assert.deepEqual(paths(errorsOf(brief)), ['prospect.status']);
  brief.prospect.status = 'maybe';
  assert.deepEqual(paths(errorsOf(brief)), ['prospect.status']);
});

test('unknown keys in the prospect section fail', () => {
  const brief = fixture();
  brief.prospect.owner = 'x';
  assert.deepEqual(paths(errorsOf(brief)), ['prospect.owner']);
});

const FORBIDDEN = [
  [
    'assets',
    (b) => (b.assets = [{ kind: 'logo', url: 'https://example.com/logo.svg' }]),
    "cannot use the prospect's brand",
  ],
  [
    'brand.colors',
    (b) => (b.brand.colors = ['#112233']),
    "cannot use the prospect's brand",
  ],
  [
    'brand.fonts',
    (b) => (b.brand.fonts = ['Inter']),
    "cannot use the prospect's brand",
  ],
  [
    'brand.aiImages',
    (b) => (b.brand.aiImages = 'allowed'),
    'a prospect cannot consent',
  ],
  [
    'brand.ownerPortrait',
    (b) => (b.brand.ownerPortrait = 'not-allowed'),
    'a prospect cannot consent',
  ],
  [
    'legal.holder',
    (b) => (b.legal.holder = { name: 'Clínica Dental Alameda SL' }),
    'a prospect cannot consent',
  ],
  [
    'legal.privacyContact',
    (b) => (b.legal.privacyContact = 'privacidad@example.com'),
    'a prospect cannot consent',
  ],
  [
    'forms',
    (b) => {
      b.legal.processing = { forms: true };
      b.forms = [
        {
          id: 'cita',
          purpose: 'contact',
          fields: ['name'],
          provider: 'whatsapp',
        },
      ];
    },
    'a prospect cannot consent',
  ],
];

for (const [path, mutate, message] of FORBIDDEN)
  test(`a prospect brief cannot carry ${path}`, () => {
    const brief = fixture();
    mutate(brief);
    const errors = errorsOf(brief);
    assert.ok(paths(errors).includes(path), JSON.stringify(errors));
    assert.ok(
      errors.find((e) => e.path === path).message.includes(message),
      JSON.stringify(errors),
    );
  });

test('a sold brief accepts assets and consent again', () => {
  const brief = fixture();
  brief.prospect.status = 'sold';
  brief.assets = [{ kind: 'logo', url: 'https://example.com/logo.svg' }];
  brief.brand.colors = ['#112233'];
  brief.brand.aiImages = 'allowed';
  brief.legal.holder = { name: 'Clínica Dental Alameda SL' };
  assert.deepEqual(errorsOf(brief), []);
});

test('a sold brief no longer needs a source per fact', () => {
  const brief = fixture();
  brief.prospect.status = 'sold';
  brief.prospect.sources = [];
  assert.deepEqual(errorsOf(brief), []);
  brief.prospect.sources = [source('business.name')];
  assert.deepEqual(errorsOf(brief), []);
});

test('a brief without the section is unchanged, and so is the skeleton', () => {
  assert.equal('prospect' in emptyBrief({ language: 'es' }), false);
  const brief = fixture();
  delete brief.prospect;
  assert.deepEqual(errorsOf(brief), []);
  assert.equal(isProspect(brief), false);
  assert.deepEqual(uncoveredProspectFacts(brief).length > 0, true);
});

test('missing asks for a source per uncovered fact and skips brand and consent', () => {
  const brief = fixture();
  brief.prospect.sources = brief.prospect.sources.filter(
    (s) => s.field !== 'contact.phone',
  );
  const missing = missingFields(brief);
  assert.ok(missing.some((m) => m.path === 'prospect.sources(contact.phone)'));
  for (const skipped of [
    'assets',
    'brand.colors',
    'brand.fonts',
    'brand.aiImages',
    'legal.holder.name',
    'legal.privacyContact',
  ])
    assert.ok(!missing.some((m) => m.path === skipped), skipped);
  const normal = fixture();
  delete normal.prospect;
  assert.ok(missingFields(normal).some((m) => m.path === 'assets'));
});

test('summary shows the status and the sources', () => {
  const summary = summarizeBrief(fixture());
  assert.match(summary, /^Prospect: prospect$/m);
  assert.match(
    summary,
    /Source contact\.phone: https:\/\/example\.com\/alameda\/contacto \(retrieved 2026-10-30\)/,
  );
});
