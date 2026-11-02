// Brief fields added by add-copy-frameworks: audience.awareness and proof (design Decision 5).
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  AWARENESS_LEVELS,
  PROOF_KINDS,
  PROSPECT_FACT_FIELDS,
  missingFields,
  summarizeBrief,
  validateBrief,
} from '../scripts/lib/brief-schema.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixture = () =>
  JSON.parse(
    readFileSync(join(ROOT, 'tests/fixtures/brief/brief.json'), 'utf8'),
  );
const prospect = () =>
  JSON.parse(
    readFileSync(join(ROOT, 'tests/fixtures/prospect/brief.json'), 'utf8'),
  );
const options = {
  baseDir: join(ROOT, 'tests/fixtures/brief'),
  patternsDir: join(ROOT, 'patterns'),
};
const errorsOf = (brief) => validateBrief(brief, options);
const paths = (errors) => errors.map((e) => e.path);

test('every awareness level and proof kind is valid', () => {
  for (const level of AWARENESS_LEVELS) {
    const brief = fixture();
    brief.audience.awareness = level;
    assert.deepEqual(errorsOf(brief), [], level);
  }
  for (const kind of PROOF_KINDS) {
    const brief = fixture();
    brief.proof = [
      {
        kind,
        text: 'In the customer own words',
        source: 'https://a.example/x',
      },
    ];
    assert.deepEqual(errorsOf(brief), [], kind);
  }
});

test('an unknown awareness level names the field and the allowed values', () => {
  const brief = fixture();
  brief.audience.awareness = 'curious';
  const errors = errorsOf(brief);
  assert.deepEqual(paths(errors), ['audience.awareness']);
  for (const level of AWARENESS_LEVELS)
    assert.ok(errors[0].message.includes(level), level);
});

test('an unknown proof kind, a missing text, a bad source and more than ten entries fail', () => {
  const brief = fixture();
  brief.proof = [
    { kind: 'review', text: 'x' },
    { kind: 'figure', text: '' },
    { kind: 'press', text: 'x', source: 'http://insecure.example' },
  ];
  assert.deepEqual(paths(errorsOf(brief)), [
    'proof[0].kind',
    'proof[1].text',
    'proof[2].source',
  ]);
  assert.match(errorsOf(brief)[0].message, /testimonial/);
  brief.proof = Array.from({ length: 11 }, () => ({
    kind: 'figure',
    text: 'x',
  }));
  assert.deepEqual(paths(errorsOf(brief)), ['proof']);
});

test('awareness may be assumed; proof never', () => {
  const ok = fixture();
  ok.audience.awareness = 'problem-aware';
  ok.assumed.push({ field: 'audience.awareness', reason: 'agent guess' });
  assert.deepEqual(errorsOf(ok), []);

  for (const field of ['proof', 'proof[0]', 'proof[0].text']) {
    const brief = fixture();
    brief.proof = [{ kind: 'figure', text: '120 clients' }];
    brief.assumed.push({ field, reason: 'agent guess' });
    const errors = errorsOf(brief);
    assert.equal(errors.length, 1, field);
    assert.match(errors[0].message, /proof cannot be assumed/);
  }
});

test('missing lists proof after the offer and awareness after the objections; summary shows both', () => {
  const missing = missingFields(fixture()).map((m) => m.path);
  assert.ok(missing.includes('proof'));
  assert.ok(missing.includes('audience.awareness'));
  const brief = fixture();
  brief.audience.awareness = 'solution-aware';
  brief.proof = [{ kind: 'testimonial', text: 'Muy útil', source: '' }];
  const now = missingFields(brief).map((m) => m.path);
  assert.ok(!now.includes('proof') && !now.includes('audience.awareness'));
  const summary = summarizeBrief(brief);
  assert.match(summary, /Awareness: solution-aware/);
  assert.match(summary, /Proof 1: testimonial "Muy útil"/);
});

test('on a prospect brief a proof entry needs its own source', () => {
  assert.ok(PROSPECT_FACT_FIELDS.includes('proof[].text'));
  const brief = prospect();
  brief.proof = [{ kind: 'press', text: 'Featured in a local paper' }];
  const errors = errorsOf(brief);
  assert.deepEqual(paths(errors), ['proof[0].text']);
  assert.match(errors[0].message, /needs a source/);
  brief.proof[0].source = 'https://news.example/article';
  assert.deepEqual(errorsOf(brief), []);
});

test('every existing brief still validates', () => {
  const dir = join(ROOT, 'sites');
  for (const slug of readdirSync(dir)) {
    const file = join(dir, slug, 'brief.json');
    if (!existsSync(file)) continue;
    const errors = validateBrief(JSON.parse(readFileSync(file, 'utf8')), {
      baseDir: join(dir, slug),
      patternsDir: join(ROOT, 'patterns'),
    });
    assert.deepEqual(errors, [], slug);
  }
});
