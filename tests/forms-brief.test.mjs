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
    purpose: 'survey',
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

// Newsletter through Brevo (add-newsletter, tasks 1.1).
const ACTION = 'https://abc123.sibforms.com/serve/MUIFAxyz';
const newsletter = (extra = {}) => ({
  id: 'newsletter',
  purpose: 'newsletter',
  fields: ['email', 'name'],
  provider: 'brevo',
  action: ACTION,
  ...extra,
});

test('a valid brevo newsletter form validates and the summary shows only the host', () => {
  const brief = withForms([newsletter()]);
  assert.deepEqual(errorsOf(brief), []);
  const summary = summarizeBrief(brief);
  assert.match(
    summary,
    /Form 1: newsletter \(newsletter\), brevo, fields email, name, action on abc123\.sibforms\.com/,
  );
  assert.ok(!summary.includes('MUIFAxyz'));
});

test('the brevo action must be https on a subdomain of sibforms.com under /serve/', () => {
  const bad = [
    'https://example.com/serve/abc',
    'http://abc.sibforms.com/serve/abc',
    'https://sibforms.com/serve/abc',
    'https://.sibforms.com/serve/abc',
    'https://sibforms.com.evil.example/serve/abc',
    'https://evil.example/?x=.sibforms.com/serve/',
    'https://abc.sibforms.com/other/abc',
    'https://abc.sibforms.com.evil.example/serve/abc',
    'https://user@abc.sibforms.com/serve/abc',
    'not a url',
  ];
  for (const action of bad) {
    const errors = errorsOf(withForms([newsletter({ action })]));
    assert.deepEqual(paths(errors), ['forms[0].action'], action);
  }
  for (const action of [
    'https://a.b.sibforms.com/serve/x?y=1',
    'https://ABC.sibforms.com/serve/x',
  ])
    assert.deepEqual(errorsOf(withForms([newsletter({ action })])), [], action);
});

test('brevo requires the newsletter purpose, email and name fields only and no access key', () => {
  const errors = errorsOf(
    withForms([
      newsletter({
        purpose: 'contact',
        fields: ['email', 'phone'],
        accessKey: KEY,
      }),
    ]),
  );
  assert.deepEqual(paths(errors).sort(), [
    'forms[0].accessKey',
    'forms[0].fields[1]',
    'forms[0].purpose',
  ]);
});

test('a newsletter purpose needs brevo and only brevo has an action', () => {
  const a = errorsOf(withForms([{ ...valuation(), purpose: 'newsletter' }]));
  assert.deepEqual(paths(a), ['forms[0].provider']);
  const b = errorsOf(withForms([{ ...valuation(), action: ACTION }]));
  assert.deepEqual(paths(b), ['forms[0].action']);
});

test('the brevo action can never be listed in assumed', () => {
  for (const field of ['forms[0].action', 'forms[0]']) {
    const brief = withForms([newsletter()]);
    brief.assumed.push({ field, reason: 'invented' });
    const errors = errorsOf(brief);
    assert.deepEqual(paths(errors), [
      `assumed[${brief.assumed.length - 1}].field`,
    ]);
    assert.match(errors[0].message, /cannot be assumed/);
  }
});

test('missing asks for the action of each brevo form without one', () => {
  const brief = withForms([
    newsletter({ action: '' }),
    { ...valuation(), id: 'two', accessKey: '' },
  ]);
  const found = missingFields(brief)
    .map((m) => m.path)
    .filter((p) => p.startsWith('forms'));
  assert.deepEqual(found, ['forms[1].accessKey', 'forms[0].action']);
  assert.match(
    summarizeBrief(brief),
    /no action URL \(the form is not shown\)/,
  );
  assert.ok(
    !missingFields(withForms([newsletter()])).some((m) =>
      m.path.startsWith('forms'),
    ),
  );
});
