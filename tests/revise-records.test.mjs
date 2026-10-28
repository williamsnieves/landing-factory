// The records of the revise-landing change: revisions.json (schema) and the export record helpers
// (transferred state, repository URL normalization). Pure functions; no files outside a temp folder.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  isTransferred,
  normalizeRepoUrl,
  readExportRecord,
  validateExportRecord,
} from '../scripts/lib/export-record.mjs';
import {
  MAX_FEEDBACK,
  emptyRevisions,
  nextRound,
  usageForRound,
  validateRevisions,
} from '../scripts/lib/revisions-schema.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'lf-records-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const round = (over = {}) => ({
  n: 1,
  date: '2026-10-27',
  feedback: 'Shorten the hero heading.',
  items: [{ kind: 'copy', summary: 'Shorter hero heading' }],
  briefChanged: false,
  files: ['src/components/Hero.astro'],
  result: 'passed',
  usage: { costUsd: 0.42 },
  ...over,
});
const doc = (...rounds) => ({ version: 1, rounds });

test('revisions: an empty record and a valid round pass', () => {
  assert.deepEqual(validateRevisions(emptyRevisions()), []);
  assert.deepEqual(validateRevisions(doc(round())), []);
  assert.deepEqual(validateRevisions(doc(round({ usage: null }))), []);
  const { usage: _usage, ...noUsage } = round();
  assert.deepEqual(validateRevisions(doc(noUsage)), []);
  assert.deepEqual(
    validateRevisions(
      doc(round(), round({ n: 2, result: 'needs-rebuild', files: [] })),
    ),
    [],
  );
});

test('revisions: unknown keys, a bad result, a bad kind and bad numbering fail naming the path', () => {
  const messages = (data) => validateRevisions(data).join('\n');
  assert.match(messages({ ...doc(round()), extra: 1 }), /extra: unknown key/);
  assert.match(
    messages(doc(round({ extra: 1 }))),
    /rounds\[0\]\.extra: unknown key/,
  );
  assert.match(messages(doc(round({ result: 'done' }))), /rounds\[0\]\.result/);
  assert.match(
    messages(doc(round({ items: [{ kind: 'magic', summary: 'x' }] }))),
    /items\[0\]\.kind/,
  );
  assert.match(messages(doc(round({ n: 2 }))), /rounds\[0\]\.n: must be 1/);
  assert.match(messages(doc(round({ date: 'today' }))), /date/);
  assert.match(
    messages(doc(round({ usage: { gold: 1 } }))),
    /usage\.gold: unknown key/,
  );
  assert.match(messages({ version: 2, rounds: [] }), /version/);
  assert.match(messages([]), /must be an object/);
});

test('revisions: feedback over 4000 characters or empty fails; exactly 4000 passes', () => {
  assert.deepEqual(
    validateRevisions(doc(round({ feedback: 'x'.repeat(MAX_FEEDBACK) }))),
    [],
  );
  assert.match(
    validateRevisions(
      doc(round({ feedback: 'x'.repeat(MAX_FEEDBACK + 1) })),
    ).join('\n'),
    /feedback: at most 4000/,
  );
  assert.match(
    validateRevisions(doc(round({ feedback: '  ' }))).join('\n'),
    /feedback: required/,
  );
});

test('revisions: nextRound and usageForRound', () => {
  assert.equal(nextRound(emptyRevisions()), 1);
  assert.equal(nextRound(doc(round(), round({ n: 2 }))), 3);
  assert.equal(usageForRound({ reported: false }), null);
  assert.equal(usageForRound(null), null);
  const usage = usageForRound({
    reported: true,
    inputTokens: 10,
    outputTokens: 5,
    totalCostUsd: 0.5,
    durationMs: 1000,
    numTurns: 3,
  });
  assert.equal(usage.costUsd, 0.5);
  assert.equal(usage.cacheReadTokens, null);
  assert.deepEqual(validateRevisions(doc(round({ usage }))), []);
});

test('export record: isTransferred with and without transfer fields', () => {
  assert.equal(isTransferred(null), false);
  assert.equal(isTransferred(undefined), false);
  assert.equal(isTransferred({}), false);
  assert.equal(
    isTransferred({ repository: 'https://github.com/a/b', target: 'vercel' }),
    false,
  );
  assert.equal(isTransferred({ transferredTo: '' }), false);
  assert.equal(
    isTransferred({ transferredTo: 'acme', transferredAt: '2026-10-27' }),
    true,
  );
});

test('export record: validation and reading', () => {
  assert.deepEqual(
    validateExportRecord({ repository: 'x', noBrief: true }),
    [],
  );
  assert.match(
    validateExportRecord({ nope: 1 }).join('\n'),
    /nope: unknown key/,
  );
  assert.match(validateExportRecord({ noBrief: 'yes' }).join('\n'), /noBrief/);
  assert.match(
    validateExportRecord({ transferredTo: 'acme' }).join('\n'),
    /transferredAt/,
  );
  const root = join(tmp, 'factory');
  mkdirSync(join(root, 'sites/acme'), { recursive: true });
  assert.equal(readExportRecord(root, 'acme'), null);
  writeFileSync(join(root, 'sites/acme/EXPORTED.json'), '{"target":"vercel"}');
  assert.equal(readExportRecord(root, 'acme').target, 'vercel');
  writeFileSync(join(root, 'sites/acme/EXPORTED.json'), '{nope');
  assert.throws(() => readExportRecord(root, 'acme'), /not valid JSON/);
});

test('export record: URL normalization equates https, ssh and .git forms and drops credentials', () => {
  const same = [
    'https://github.com/Acme/Site',
    'https://github.com/acme/site.git',
    'https://github.com/acme/site/',
    'https://user:secret@github.com/acme/site.git',
    'https://x-access-token:tok@github.com/acme/site',
    'git@github.com:acme/site.git',
    'git@github.com:acme/site',
    'ssh://git@github.com/acme/site.git',
    'ssh://git@github.com:22/acme/site',
  ];
  for (const url of same)
    assert.equal(normalizeRepoUrl(url), 'github.com/acme/site', url);
  assert.notEqual(
    normalizeRepoUrl('https://github.com/acme/other'),
    normalizeRepoUrl('https://github.com/acme/site'),
  );
  assert.equal(normalizeRepoUrl(''), null);
  assert.equal(normalizeRepoUrl('not a url'), null);
  assert.equal(normalizeRepoUrl('https://github.com/acme'), null);
  assert.equal(normalizeRepoUrl(undefined), null);
});
