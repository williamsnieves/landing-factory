// Brief `forms` section (add-lead-forms, tasks 2.1 and 2.2).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  emptyBrief,
  missingFields,
  summarizeBrief,
  validateBrief,
} from '../scripts/lib/brief-schema.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/brief');
const tmp = mkdtempSync(join(tmpdir(), 'forms-brief-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const KEY = '11111111-2222-4333-8444-555555555555';
const options = { baseDir: FIXTURE, patternsDir: join(ROOT, 'patterns') };
const withForms = (forms) => {
  const brief = JSON.parse(readFileSync(join(FIXTURE, 'brief.json'), 'utf8'));
  brief.legal.processing.forms = true;
  brief.forms = forms;
  return brief;
};
const valuation = () => ({
  id: 'valuation',
  purpose: 'valuation',
  fields: ['name', 'phone', 'address', 'size'],
  provider: 'web3forms',
  accessKey: KEY,
});
const errorsOf = (brief) => validateBrief(brief, options);
const paths = (errors) => errors.map((e) => e.path);

test('a valid valuation form validates and the summary lists it', () => {
  const brief = withForms([valuation()]);
  assert.deepEqual(errorsOf(brief), []);
  assert.match(
    summarizeBrief(brief),
    /Form 1: valuation \(valuation\), web3forms, fields name, phone, address, size, access key set/,
  );
});

test('an empty brief and an older brief without forms stay valid', () => {
  assert.deepEqual(emptyBrief({ language: 'en' }).forms, []);
  const brief = JSON.parse(readFileSync(join(FIXTURE, 'brief.json'), 'utf8'));
  delete brief.forms;
  assert.deepEqual(errorsOf(brief), []);
});

test('unknown keys, purposes, fields, providers and a bad key fail; at most 3 forms', () => {
  const form = {
    ...valuation(),
    purpose: 'newsletter',
    provider: 'formspree',
    accessKey: 'not-a-uuid',
    fields: ['name', 'budget'],
    extra: 1,
  };
  const errors = errorsOf(withForms([form]));
  assert.deepEqual(paths(errors).sort(), [
    'forms[0].accessKey',
    'forms[0].extra',
    'forms[0].fields[1]',
    'forms[0].provider',
    'forms[0].purpose',
  ]);
  const many = ['a', 'b', 'c', 'd'].map((id) => ({
    ...valuation(),
    id,
  }));
  assert.ok(paths(errorsOf(withForms(many))).includes('forms'));
});

test('duplicate ids and fields fail, and a whatsapp form takes no access key', () => {
  const dup = errorsOf(
    withForms([
      { ...valuation(), fields: ['name', 'name'] },
      valuation(),
      { ...valuation(), id: 'wa', provider: 'whatsapp' },
    ]),
  );
  assert.deepEqual(paths(dup).sort(), [
    'forms[0].fields[1]',
    'forms[1].id',
    'forms[2].accessKey',
  ]);
});

test('the access key can never be listed in assumed', () => {
  for (const field of ['forms[0].accessKey', 'forms[0]', 'forms']) {
    const brief = withForms([valuation()]);
    brief.assumed.push({ field, reason: 'invented' });
    const errors = errorsOf(brief);
    assert.deepEqual(paths(errors), [
      `assumed[${brief.assumed.length - 1}].field`,
    ]);
    assert.match(errors[0].message, /form access key cannot be assumed/);
  }
});

test('a form requires a legal market and legal.processing.forms: true', () => {
  const noFlag = withForms([valuation()]);
  noFlag.legal.processing.forms = false;
  const noMarket = withForms([valuation()]);
  noMarket.legal.markets = [];
  for (const brief of [noFlag, noMarket]) {
    const errors = errorsOf(brief);
    assert.deepEqual(paths(errors), ['forms']);
    assert.match(
      errors[0].message,
      /requires a legal market.*processing\.forms: true/,
    );
  }
});

test('missing asks for the access key of each web3forms form without one, and only then', () => {
  const none = missingFields(withForms([])).map((m) => m.path);
  assert.ok(!none.some((p) => p.startsWith('forms')));
  const wa = missingFields(
    withForms([{ ...valuation(), provider: 'whatsapp', accessKey: '' }]),
  ).map((m) => m.path);
  assert.ok(!wa.some((p) => p.startsWith('forms')));
  const noKey = withForms([
    { ...valuation(), accessKey: '' },
    { ...valuation(), id: 'two', accessKey: '' },
    { ...valuation(), id: 'three' },
  ]);
  const paths3 = missingFields(noKey)
    .map((m) => m.path)
    .filter((p) => p.startsWith('forms'));
  assert.deepEqual(paths3, ['forms[0].accessKey', 'forms[1].accessKey']);
  assert.match(
    summarizeBrief(noKey),
    /no access key \(falls back to WhatsApp\)/,
  );
});

test('the CLI validates and summarizes a brief with a form', () => {
  const file = join(tmp, 'brief.json');
  writeFileSync(file, JSON.stringify(withForms([valuation()])));
  // assets are relative to the file folder, so validate with the fixture copy of the assets only through the library;
  // the CLI call just proves the new section reaches `summary` and `missing`.
  const run = (cmd) =>
    spawnSync('node', ['scripts/brief.mjs', cmd, '--file', file], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  assert.match(run('summary').stdout, /Form 1: valuation/);
  assert.equal(run('missing').status, 0);
});
