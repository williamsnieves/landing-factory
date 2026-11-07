// The newsletter form (add-newsletter, tasks 2.1 to 2.3): markup of <NewsletterForm /> on the starter's /forms/ demo
// and on a Spanish page, nothing rendered without an action URL, no request to Brevo at load, and the CSP origin only
// with a Brevo form. The action of the demo is made up and never posted. Scaffolded under .cache/ (git-ignored).
import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

import { build, startStatic } from '../scripts/qa/server.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const base = join(ROOT, '.cache', `forms-newsletter-test-${process.pid}`);
const envChrome = process.env.QA_CHROME_PATH || process.env.CHROME_PATH;
const chromePath = envChrome || chromium.executablePath();
const skip = existsSync(chromePath) ? false : 'no Chromium installed';
const ACTION = 'https://demo-example.sibforms.com/serve/DEMO';

after(() => rmSync(base, { recursive: true, force: true }));

const page = (body) => `---
import BaseLayout from '../layouts/BaseLayout.astro';
import NewsletterForm from '../components/forms/NewsletterForm.astro';
import { DEMO_LEGAL } from './forms/_demo';
const base = { id: 'newsletter', purpose: 'newsletter', fields: ['email'], provider: 'brevo' } as const;
---
<BaseLayout title="Newsletter test page" description="A page that renders the newsletter form in different shapes." noindex>
${body}
</BaseLayout>
`;

let dist;
let html;
before(async () => {
  mkdirSync(base, { recursive: true });
  for (const name of ['src', 'public'])
    cpSync(join(ROOT, name), join(base, name), { recursive: true });
  for (const name of ['astro.config.mjs', 'tsconfig.json', 'package.json'])
    cpSync(join(ROOT, name), join(base, name));
  const pages = join(base, 'src/pages');
  writeFileSync(
    join(pages, 'no-action.astro'),
    page(
      '<NewsletterForm form={base} legal={DEMO_LEGAL} /><p id="after">after</p>',
    ),
  );
  writeFileSync(
    join(pages, 'no-name.astro'),
    page(
      `<NewsletterForm form={{ ...base, action: '${ACTION}' }} legal={DEMO_LEGAL} />`,
    ),
  );
  writeFileSync(
    join(pages, 'es.astro'),
    page(
      `<NewsletterForm form={{ ...base, fields: ['email', 'name'], action: '${ACTION}' }} legal={DEMO_LEGAL} locale="es" />`,
    ),
  );
  await build(base);
  dist = join(base, 'dist');
  html = readFileSync(join(dist, 'forms/index.html'), 'utf8');
});

const formOf = (source) =>
  /<form[^>]*data-newsletter-form[\s\S]*?<\/form>/.exec(source)?.[0] ?? '';
const attr = (tag, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
const inputs = (form) => [...form.matchAll(/<input\b[^>]*>/g)].map((m) => m[0]);
const named = (form, name) =>
  inputs(form).find((tag) => attr(tag, 'name') === name);

test('the demo form posts to its action without JavaScript and names the Brevo fields', () => {
  const form = formOf(html);
  assert.match(form, /^<form[^>]*method="post"/);
  assert.equal(attr(form.match(/<form[^>]*>/)[0], 'action'), ACTION);
  assert.ok(named(form, 'EMAIL')?.includes('type="email"'));
  assert.ok(named(form, 'EMAIL')?.includes('required'));
  assert.ok(
    named(form, 'FIRSTNAME'),
    'first name field when `name` is in fields',
  );
  assert.equal(attr(named(form, 'locale'), 'value'), 'en');
  assert.equal(attr(named(form, 'html_type'), 'value'), 'simple');
});

test('the consent checkbox is required, unchecked, valued 1 and links the privacy page', () => {
  const form = formOf(html);
  const box = named(form, 'OPT_IN');
  assert.ok(box.includes('type="checkbox"'));
  assert.ok(/\brequired\b/.test(box));
  assert.ok(!/\bchecked\b/.test(box));
  assert.equal(attr(box, 'value'), '1');
  assert.match(
    form,
    /<label[^>]*>[\s\S]*name="OPT_IN"[\s\S]*href="\/forms\/privacy\/"/,
  );
  assert.match(form, /We will send you an email to confirm your subscription/);
});

test('the honeypot is hidden from people and assistive technology and not focusable', () => {
  const form = formOf(html);
  const trap = named(form, 'email_address_check');
  assert.ok(trap.includes('tabindex="-1"'));
  assert.ok(trap.includes('autocomplete="off"'));
  assert.match(
    form,
    /<div class="sr-only" aria-hidden="true">\s*<input[^>]*email_address_check/,
  );
});

test('no script, stylesheet or recaptcha from Brevo; the only sibforms reference is the form action', () => {
  const form = formOf(html);
  assert.ok(!/<script/i.test(form));
  assert.ok(!/recaptcha/i.test(html));
  const hosts = [
    ...html.matchAll(/https?:\/\/[^\s"'<>)]*sibforms[^\s"'<>)]*/g),
  ].map((m) => m[0]);
  assert.deepEqual([...new Set(hosts)], [ACTION]);
  for (const m of html.matchAll(/<(script|link|img|iframe)\b[^>]*>/gi))
    assert.ok(!/sibforms|brevo|sendinblue/i.test(m[0]), m[0]);
});

test('without an action URL nothing is rendered; without a name field there is no FIRSTNAME', () => {
  const none = readFileSync(join(dist, 'no-action/index.html'), 'utf8');
  assert.equal(formOf(none), '');
  assert.ok(!/newsletter-form/.test(none));
  assert.ok(none.includes('id="after"'));
  const noName = formOf(readFileSync(join(dist, 'no-name/index.html'), 'utf8'));
  assert.ok(noName);
  assert.equal(named(noName, 'FIRSTNAME'), undefined);
});

test('the demo privacy page names Brevo, double opt-in and unsubscribe', () => {
  const privacy = readFileSync(join(dist, 'forms/privacy/index.html'), 'utf8');
  assert.match(privacy, /Brevo \(Sendinblue SAS, France\)/);
  assert.match(privacy, /double opt-in/);
  assert.match(privacy, /unsubscribe/);
});

test('the Spanish texts and locale', () => {
  const form = formOf(readFileSync(join(dist, 'es/index.html'), 'utf8'));
  assert.equal(attr(named(form, 'locale'), 'value'), 'es');
  assert.match(form, /Suscribirme/);
  assert.match(form, /confirmar tu suscripción/);
});

test(
  'the page makes no request to Brevo at load and the consent box starts unchecked',
  { skip },
  async () => {
    const server = await startStatic(dist);
    const browser = await chromium.launch({
      ...(envChrome ? { executablePath: envChrome } : {}),
    });
    try {
      const context = await browser.newContext();
      const seen = [];
      context.on('request', (request) => seen.push(request.url()));
      const tab = await context.newPage();
      await tab.goto(`${server.baseUrl}/forms/`, { waitUntil: 'networkidle' });
      await tab.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await tab.waitForTimeout(500);
      assert.ok(
        !seen.some((url) => /sibforms|brevo|sendinblue/i.test(url)),
        seen.join('\n'),
      );
      assert.equal(
        await tab.locator('input[name="OPT_IN"]').isChecked(),
        false,
      );
    } finally {
      await browser.close();
      await server.close();
    }
  },
);

// CSP: the Brevo origin only with a Brevo form (task 2.3).
let counter = 0;
async function directivesOf(legal) {
  const dir = join(base, `csp-${counter++}`);
  mkdirSync(join(dir, 'src/data'), { recursive: true });
  cpSync(join(ROOT, 'astro.config.mjs'), join(dir, 'astro.config.mjs'));
  writeFileSync(join(dir, 'src/data/legal.json'), JSON.stringify(legal));
  const config = (
    await import(pathToFileURL(join(dir, 'astro.config.mjs')).href)
  ).default;
  return config.security.csp.directives;
}
const legal = (forms) => ({
  processing: { analytics: 'none', forms, embeds: [] },
});

test('a Brevo form opens only its own origin in form-action, with no connect-src', async () => {
  const dirs = await directivesOf(
    legal({
      provider: 'brevo',
      providers: ['brevo'],
      purposes: [],
      fields: [],
      newsletter: {
        fields: ['email'],
        actionOrigins: ['https://abc123.sibforms.com'],
      },
    }),
  );
  assert.deepEqual(dirs.slice(2), [
    "form-action 'self' https://abc123.sibforms.com",
  ]);
});

test('Brevo and Web3Forms together, and nothing for look-alike or malformed origins', async () => {
  const both = await directivesOf(
    legal({
      provider: 'web3forms',
      providers: ['brevo', 'web3forms'],
      purposes: ['contact'],
      fields: ['name'],
      newsletter: {
        fields: ['email'],
        actionOrigins: ['https://abc123.sibforms.com'],
      },
    }),
  );
  assert.deepEqual(both.slice(2), [
    "form-action 'self' https://api.web3forms.com https://abc123.sibforms.com",
    "connect-src 'self' https://api.web3forms.com",
  ]);
  const bad = await directivesOf(
    legal({
      provider: 'brevo',
      providers: ['brevo'],
      purposes: [],
      fields: [],
      newsletter: {
        fields: ['email'],
        actionOrigins: [
          'https://sibforms.com',
          'https://sibforms.com.evil.example',
          'http://abc.sibforms.com',
          '*.sibforms.com',
          'https://abc.sibforms.com/serve/x',
        ],
      },
    }),
  );
  assert.equal(bad.length, 2);
});

test('a site without a Brevo form gains no sibforms origin', async () => {
  for (const forms of [
    false,
    true,
    { provider: 'whatsapp', providers: ['whatsapp'], purposes: [], fields: [] },
  ]) {
    const dirs = await directivesOf(legal(forms));
    assert.ok(!dirs.join(' ').includes('sibforms'));
    assert.equal(dirs.length, 2);
  }
});
