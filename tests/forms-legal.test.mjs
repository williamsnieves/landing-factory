// legal.mjs and the privacy texts for lead forms (add-lead-forms, task 4.1): processing.forms as
// { provider, providers, purposes, fields }, the key-less web3forms form counted as WhatsApp, an older `forms: true`
// untouched, and the on-screen / policy dictionaries covering the closed vocabularies in both languages.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  FORM_FIELDS,
  FORM_PROVIDERS,
  FORM_PURPOSES,
} from '../scripts/lib/brief-schema.mjs';
import { formsProcessing, legalData } from '../scripts/legal.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const brief = () =>
  JSON.parse(
    readFileSync(join(ROOT, 'tests/fixtures/brief/brief.json'), 'utf8'),
  );
const KEY = '11111111-2222-4333-8444-555555555555';
const valuation = {
  id: 'valuation',
  purpose: 'valuation',
  fields: ['size', 'name', 'phone'],
  provider: 'web3forms',
  accessKey: KEY,
};

test('a web3forms form is recorded with its purposes and fields in vocabulary order', () => {
  const b = brief();
  b.legal.processing.forms = true;
  b.forms = [
    valuation,
    { ...valuation, id: 'quote', purpose: 'quote', fields: ['email', 'name'] },
  ];
  const { data } = legalData(b);
  assert.deepEqual(data.processing.forms, {
    provider: 'web3forms',
    providers: ['web3forms'],
    purposes: ['valuation', 'quote'],
    fields: ['name', 'email', 'phone', 'size'],
  });
});

test('a web3forms form without a key counts as WhatsApp; a mix keeps both providers', () => {
  const b = brief();
  b.legal.processing.forms = true;
  b.forms = [{ ...valuation, accessKey: '' }];
  assert.deepEqual(formsProcessing(b).providers, ['whatsapp']);
  assert.equal(formsProcessing(b).provider, 'whatsapp');
  b.forms = [
    valuation,
    { ...valuation, id: 'wa', provider: 'whatsapp', accessKey: '' },
  ];
  assert.deepEqual(formsProcessing(b).providers, ['web3forms', 'whatsapp']);
  assert.equal(formsProcessing(b).provider, 'web3forms');
});

test('a brief without forms keeps the old boolean, and nothing else changes in the data', () => {
  const b = brief();
  b.legal.processing.forms = true;
  assert.equal(legalData(b).data.processing.forms, true);
  b.legal.processing.forms = false;
  assert.equal(legalData(b).data.processing.forms, false);
  assert.equal(formsProcessing(b), null);
});

test('the dictionaries cover every purpose and field in English and Spanish', () => {
  const fields = readFileSync(
    join(ROOT, 'src/components/forms/fields.ts'),
    'utf8',
  );
  const texts = readFileSync(
    join(ROOT, 'src/components/legal/texts.ts'),
    'utf8',
  );
  for (const field of FORM_FIELDS) {
    // The form labels (one per language) and the policy's field names (one per language).
    assert.ok(
      fields.split(`    ${field}:`).length - 1 >= 2,
      `fields.ts: ${field}`,
    );
    assert.ok(
      texts.split(`    ${field}:`).length - 1 >= 2,
      `texts.ts: ${field}`,
    );
  }
  for (const purpose of FORM_PURPOSES) {
    assert.ok(
      fields.split(`    ${purpose}:`).length - 1 >= 6,
      `fields.ts: ${purpose}`,
    );
    assert.ok(
      texts.split(`    ${purpose}:`).length - 1 >= 2,
      `texts.ts: ${purpose}`,
    );
  }
});

test('the closed lists of the component match the brief schema', () => {
  const fields = readFileSync(
    join(ROOT, 'src/components/forms/fields.ts'),
    'utf8',
  );
  const list = (name) =>
    [
      ...new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`)
        .exec(fields)[1]
        .matchAll(/'(\w+)'/g),
    ].map((m) => m[1]);
  assert.deepEqual(list('FORM_FIELDS'), FORM_FIELDS);
  assert.deepEqual(list('FORM_PURPOSES'), FORM_PURPOSES);
  assert.deepEqual(list('FORM_PROVIDERS'), FORM_PROVIDERS);
});

test('the legal and form components keep the not-legal-advice line', () => {
  for (const file of [
    'src/components/legal/PrivacyPolicy.astro',
    'src/components/forms/LeadForm.astro',
    'src/components/forms/NewsletterForm.astro',
  ]) {
    assert.match(
      readFileSync(join(ROOT, file), 'utf8'),
      /not legal advice/i,
      file,
    );
  }
});

// Newsletter through Brevo (add-newsletter, task 3.1).
const ACTION = 'https://abc123.sibforms.com/serve/MUIFAxyz';
const newsletter = {
  id: 'newsletter',
  purpose: 'newsletter',
  fields: ['email', 'name'],
  provider: 'brevo',
  action: ACTION,
};

test('a Brevo newsletter form is recorded apart, with the exact action origin', () => {
  const b = brief();
  b.legal.processing.forms = true;
  b.forms = [newsletter];
  assert.deepEqual(legalData(b).data.processing.forms, {
    provider: 'brevo',
    providers: ['brevo'],
    purposes: [],
    fields: [],
    newsletter: {
      fields: ['name', 'email'],
      actionOrigins: ['https://abc123.sibforms.com'],
    },
  });
  b.forms = [valuation, newsletter, { ...newsletter, id: 'n2' }];
  const forms = formsProcessing(b);
  assert.deepEqual(forms.providers, ['brevo', 'web3forms']);
  assert.equal(forms.provider, 'web3forms');
  assert.deepEqual(forms.purposes, ['valuation']);
  assert.deepEqual(forms.newsletter.actionOrigins, [
    'https://abc123.sibforms.com',
  ]);
});

test('a Brevo form without a valid action is not rendered, so it is not recorded', () => {
  const b = brief();
  b.legal.processing.forms = true;
  for (const action of ['', 'https://example.com/serve/x', 'nope'])
    for (const forms of [
      [{ ...newsletter, action }],
      [valuation, { ...newsletter, action }],
    ]) {
      b.forms = forms;
      const result = formsProcessing(b);
      assert.ok(!result || !result.providers.includes('brevo'), action);
      assert.ok(!result || !result.newsletter);
    }
});

function legalDataFor(forms, language) {
  const b = brief();
  b.legal.processing.forms = true;
  b.forms = forms;
  b.language = language;
  return legalData(b).data;
}

test('the privacy texts name Brevo, the data, purpose, double opt-in, unsubscribe and retention in English and Spanish', async () => {
  const texts = readFileSync(
    join(ROOT, 'src/components/legal/texts.ts'),
    'utf8',
  );
  for (const needle of [
    'Brevo (Sendinblue SAS, France)',
    'European Union',
    'double opt-in',
    'unsubscribe',
    'until you unsubscribe',
    'Brevo (Sendinblue SAS, Francia)',
    'Unión Europea',
    'doble confirmación',
    'darte de baja',
    'hasta que te des de baja',
  ])
    assert.ok(texts.includes(needle), needle);
  assert.ok(legalDataFor([newsletter], 'en').processing.forms.newsletter);
});
