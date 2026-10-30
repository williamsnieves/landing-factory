// The `legal-forms` item of the landing report and `report.forms.providers`: pass, missing consent, a consent box
// that links no privacy page, unknown host, plain http, a privacy page that does not name the provider, a Web3Forms
// form without a key, the WhatsApp fallback warning and not-applicable. Run against the clean fixture site.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  resolveReportConfig,
  validateReportConfig,
  REPORT_DEFAULTS,
} from '../scripts/report/config.mjs';
import { itemOf, makeSite, runReport } from './report-fixture.mjs';

const sites = [];
const site = () => {
  const s = makeSite();
  sites.push(s);
  return s;
};
after(() => sites.forEach((s) => s.cleanup()));

const ONLY = ['--only', 'static', '--skip', 'audit'];
const KEY = '11111111-2222-4333-8444-555555555555';

const POLICY = (extra = 'Forms are sent through Web3Forms.') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Privacy policy</title>
<meta name="description" content="Privacy policy of the fixture landing, written for the report tests."></head>
<body><main id="main"><article data-legal-page="privacy"><h1>Privacy policy</h1><p>${extra}</p></article></main></body></html>`;

const consent = (href = '/privacy/') =>
  `<label><input type="checkbox" name="consent" required> I accept the <a href="${href}">privacy policy</a></label>`;

const FIELDS =
  '<label for="n">Name</label><input id="n" name="name" autocomplete="name" required><label for="e">Email</label><input id="e" type="email" name="email" required>';

const form = ({
  action = 'https://api.web3forms.com/submit',
  key = `<input type="hidden" name="access_key" value="${KEY}">`,
  box = consent(),
  attrs = 'data-form-provider="web3forms"',
} = {}) =>
  `<form method="post" action="${action}" ${attrs}>${key}${FIELDS}${box}<button type="submit">Send</button></form>`;

function setup(html, { policy = POLICY() } = {}) {
  const s = site();
  s.write(
    'dist/index.html',
    s.read('dist/index.html').replace('</main>', `${html}</main>`),
  );
  if (policy !== null) s.write('dist/privacy/index.html', policy);
  return s;
}
async function legalForms(s) {
  const r = await runReport(s, ONLY);
  return { item: itemOf(r.report, 'legal-forms'), r };
}

test('no forms: the item is not applicable', async () => {
  const { item } = await legalForms(setup('', { policy: null }));
  assert.equal(item.area, 'legal');
  assert.equal(item.status, 'na');
});

test('a form with consent, an allowed https host, a key and a policy that names the provider passes', async () => {
  const { item, r } = await legalForms(setup(form()));
  assert.equal(item.status, 'pass', JSON.stringify(item));
  assert.match(item.title, /1 form\(s\) with personal data/);
  assert.notEqual(
    r.report.items.find((i) => i.status === 'fail')?.id,
    'legal-forms',
  );
});

test('a form without personal data does not apply', async () => {
  const s = setup(
    '<form action="https://elsewhere.example/search"><input name="q" type="search"></form>',
    { policy: null },
  );
  const { item } = await legalForms(s);
  assert.equal(item.status, 'na');
  assert.match(item.title, /none collects personal data/);
});

test('missing consent checkbox fails with the page and line', async () => {
  const { item } = await legalForms(setup(form({ box: '' })));
  assert.equal(item.status, 'fail');
  assert.match(
    item.evidence.join('\n'),
    /^\/:\d+ has no required consent checkbox/m,
  );
});

test('a consent checkbox that is not required, or links no privacy page, fails', async () => {
  const optional = await legalForms(
    setup(form({ box: consent().replace(' required', '') })),
  );
  assert.equal(optional.item.status, 'fail');
  const noLink = await legalForms(
    setup(
      form({
        box: '<label><input type="checkbox" name="consent" required> I agree</label>',
      }),
    ),
  );
  assert.equal(noLink.item.status, 'fail');
  assert.match(noLink.item.evidence.join('\n'), /does not link a privacy page/);
  const wrongPage = await legalForms(setup(form({ box: consent('/about/') })));
  assert.equal(wrongPage.item.status, 'fail');
});

test('the honeypot checkbox is not a consent box', async () => {
  const s = setup(
    form({
      box: '<input type="checkbox" name="botcheck" required>',
    }),
  );
  const { item } = await legalForms(s);
  assert.equal(item.status, 'fail');
  assert.match(item.evidence.join('\n'), /no required consent checkbox/);
});

test('an unknown host fails naming the host', async () => {
  const { item } = await legalForms(
    setup(form({ action: 'https://forms.evil.example/post' })),
  );
  assert.equal(item.status, 'fail');
  assert.match(
    item.evidence.join('\n'),
    /forms\.evil\.example.*not in report\.forms\.providers/,
  );
});

test('plain http fails even for a listed host', async () => {
  const s = setup(form({ action: 'http://api.web3forms.com/submit' }));
  const { item } = await legalForms(s);
  assert.equal(item.status, 'fail');
  assert.match(item.evidence.join('\n'), /plain HTTP/);
});

test('a privacy page that does not name the provider fails', async () => {
  const { item } = await legalForms(
    setup(form(), { policy: POLICY('We take privacy seriously.') }),
  );
  assert.equal(item.status, 'fail');
  assert.match(item.evidence.join('\n'), /does not name it/);
});

test('a Web3Forms form without an access_key fails', async () => {
  const { item } = await legalForms(setup(form({ key: '' })));
  assert.equal(item.status, 'fail');
  assert.match(item.evidence.join('\n'), /without an access_key/);
});

test('a WhatsApp fallback of a web3forms form warns and sends nothing', async () => {
  const wa = form({
    action: '',
    key: '',
    attrs: 'data-form-provider="whatsapp" data-form-fallback="web3forms"',
  }).replace('method="post" action=""', 'method="get"');
  const { item } = await legalForms(
    setup(wa, { policy: POLICY('Messages go through WhatsApp.') }),
  );
  assert.equal(item.status, 'warn', JSON.stringify(item));
  assert.match(item.evidence.join('\n'), /falls back to WhatsApp/);
});

test('a WhatsApp form needs the policy to name WhatsApp', async () => {
  const wa = form({
    action: '',
    key: '',
    attrs: 'data-form-provider="whatsapp"',
  });
  const { item } = await legalForms(
    setup(wa, { policy: POLICY('Nothing about messengers.') }),
  );
  assert.equal(item.status, 'fail');
  assert.match(item.evidence.join('\n'), /whatsapp.*does not name it/);
});

test('report.forms.providers: defaults, a custom host, and validation', async () => {
  assert.deepEqual(REPORT_DEFAULTS.forms.providers, ['api.web3forms.com']);
  assert.deepEqual(validateReportConfig(resolveReportConfig({})), []);
  assert.throws(
    () => resolveReportConfig({ forms: { providers: ['https://x.example/'] } }),
    /report\.forms\.providers\[0\]/,
  );
  assert.throws(
    () => resolveReportConfig({ forms: { provider: [] } }),
    /report\.forms\.provider: unknown key/,
  );
  assert.equal(
    resolveReportConfig({ forms: { providers: ['forms.example.org'] } }).forms
      .providers[0],
    'forms.example.org',
  );
  const real = JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'qa.config.json'), 'utf8'),
  );
  assert.deepEqual(real.report.forms.providers, ['api.web3forms.com']);
});

test('--skip legal removes the item', async () => {
  const s = setup(form());
  const r = await runReport(s, [...ONLY, '--skip', 'legal']);
  assert.equal(itemOf(r.report, 'legal-forms'), undefined);
});
