// The legal components in a real site: scaffold from the ES brief fixture, generate legal.json, add the pages and
// footer links, build, and read the result with the landing report. Scaffolded under .cache/ (ignored by git) so
// node resolves astro from the repo's node_modules; removed afterwards.
import assert from 'node:assert/strict';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { main as reportMain } from '../scripts/landing-report.mjs';
import { main as legalMain } from '../scripts/legal.mjs';
import { scaffoldSite } from '../scripts/new-site.mjs';
import { build } from '../scripts/qa/server.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/brief');
const base = join(ROOT, '.cache', `legal-site-test-${process.pid}`);
const slug = 'zz-legal-es';
const siteDir = join(base, 'sites', slug);
const src = (rel) => join(siteDir, 'src', rel);

const brief = () =>
  JSON.parse(readFileSync(join(FIXTURE, 'brief.json'), 'utf8'));
const setBrief = (b) =>
  writeFileSync(join(siteDir, 'brief.json'), JSON.stringify(b, null, 2));

const FOOTER = `---
interface Props {
  name: string;
  noticeHref: string;
  privacyHref: string;
}
const { name, noticeHref, privacyHref } = Astro.props;
---

<footer class="border-line border-t">
  <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-10">
    <p class="text-ink-soft">{name}</p>
    <nav class="flex gap-6">
      <a class="underline underline-offset-4" href={noticeHref}>Notice</a>
      <a class="underline underline-offset-4" href={privacyHref}>Privacy</a>
    </nav>
  </div>
</footer>
`;
const legalPage = (component, otherProp, otherHref) => `---
import BaseLayout from '../layouts/BaseLayout.astro';
import Footer from '../components/Footer.astro';
import ${component} from '../components/legal/${component}.astro';
import legal from '../data/legal.json';
import type { LegalData } from '../components/legal/texts';
---

<BaseLayout title="${component}" description="Legal information." lang={legal.language}>
  <${component} data={legal as LegalData} ${otherProp}="${otherHref}" />
  <Footer slot="footer" name="Taller" noticeHref="/aviso-legal/" privacyHref="/privacidad/" />
</BaseLayout>
`;
const HOME = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import Footer from '../components/Footer.astro';
---

<BaseLayout title="Taller Plantilla" description="Plantillas de Notion para freelances." lang="es">
  <section class="mx-auto max-w-3xl px-6 py-24">
    <h1 class="font-display text-3xl">Tu trabajo en orden</h1>
    <p class="text-ink-soft mt-4">Plantillas de Notion para freelances.</p>
  </section>
  <Footer slot="footer" name="Taller" noticeHref="/aviso-legal/" privacyHref="/privacidad/" />
</BaseLayout>
`;

before(() => {
  rmSync(base, { recursive: true, force: true });
  mkdirSync(siteDir, { recursive: true });
  cpSync(join(FIXTURE, 'brief.json'), join(siteDir, 'brief.json'));
  cpSync(join(FIXTURE, 'assets'), join(siteDir, 'assets'), { recursive: true });
  scaffoldSite({
    slug,
    sitesDir: join(base, 'sites'),
    allowExistingDocs: true,
    title: 'Taller Plantilla',
    lang: 'es',
  });
  writeFileSync(join(base, 'package-lock.json'), '{}\n');
  writeFileSync(src('components/Footer.astro'), FOOTER);
  writeFileSync(src('pages/index.astro'), HOME);
  writeFileSync(
    src('pages/aviso-legal.astro'),
    legalPage('LegalNotice', 'privacyHref', '/privacidad/'),
  );
  writeFileSync(
    src('pages/privacidad.astro'),
    legalPage('PrivacyPolicy', 'noticeHref', '/aviso-legal/'),
  );
});
after(() => rmSync(base, { recursive: true, force: true }));

const quiet = { log() {}, error() {} };
const generate = () => legalMain(['--site', slug, '--write'], quiet, base);
async function report() {
  const out = [];
  const code = await reportMain(
    ['--site', slug, '--skip', 'audit,perf', '--out', join(base, 'qa')],
    { log: (m) => out.push(m), error: (m) => out.push(m) },
    { root: base },
  );
  const latest = join(base, 'qa', slug, 'report', 'latest', 'report.json');
  return {
    code,
    report: JSON.parse(readFileSync(latest, 'utf8')),
    out: out.join('\n'),
  };
}
const item = (r, id) => r.report.items.find((i) => i.id === id);
const dist = (rel) => readFileSync(join(siteDir, 'dist', rel), 'utf8');

test('new-site copies the legal components and no legal page', () => {
  for (const file of [
    'LegalNotice.astro',
    'LegalValue.astro',
    'PrivacyPolicy.astro',
    'texts.ts',
  ])
    assert.ok(
      readFileSync(src(`components/legal/${file}`), 'utf8').length > 0,
      file,
    );
});

test('every legal component source starts with the not-legal-advice comment', () => {
  for (const file of [
    'LegalNotice.astro',
    'LegalValue.astro',
    'PrivacyPolicy.astro',
  ]) {
    const lines = readFileSync(
      join(ROOT, 'src/components/legal', file),
      'utf8',
    ).split('\n');
    assert.equal(lines[0], '---', file);
    assert.match(
      lines[1],
      /^\/\/ These templates support compliance and are not legal advice\./,
      file,
    );
  }
  const texts = readFileSync(
    join(ROOT, 'src/components/legal/texts.ts'),
    'utf8',
  ).split('\n');
  assert.match(
    texts[0],
    /^\/\/ These templates support compliance and are not legal advice\./,
  );
});

test('the Spanish site gets both pages from the brief, builds, and passes legal-pages', async () => {
  assert.equal(generate(), 0);
  await build(siteDir);
  const notice = dist('aviso-legal/index.html');
  assert.match(notice, /data-legal-page="notice"/);
  for (const value of [
    'Aviso legal',
    'Taller Plantilla S.L.',
    'B00000000',
    'Calle Ficticia 1, 46001 Valencia',
    'hola@example.com',
    'Registro Mercantil de Valencia',
  ])
    assert.ok(notice.includes(value), value);
  assert.ok(!notice.includes('data-legal-pending'));
  const policy = dist('privacidad/index.html');
  assert.match(policy, /data-legal-page="privacy"/);
  for (const value of [
    'Política de privacidad',
    'Cloudflare Pages',
    'privacidad@example.com',
    'AEPD',
    'no usa analítica',
  ])
    assert.ok(policy.includes(value), value);
  assert.match(dist('index.html'), /href="\/aviso-legal\/"/);

  const r = await report();
  const pages = item(r, 'legal-pages');
  assert.equal(pages.status, 'pass', JSON.stringify(pages));
  assert.match(
    pages.title,
    /ES: legal notice and privacy policy present, linked from 3 page/,
  );
  assert.equal(item(r, 'legal-price-claims').status, 'pass');
  assert.equal(item(r, 'legal-third-party').status, 'pass');
  assert.equal(r.code, 0, r.out);
});

test('a missing tax id renders the visible pending marker and the report fails naming the field', async () => {
  const b = brief();
  b.legal.holder.taxId = '';
  setBrief(b);
  assert.equal(generate(), 0);
  await build(siteDir);
  const notice = dist('aviso-legal/index.html');
  assert.match(
    notice,
    /<mark data-legal-pending="holder\.taxId">Pendiente de revisión legal: holder\.taxId<\/mark>/,
  );
  const r = await report();
  const pages = item(r, 'legal-pages');
  assert.equal(pages.status, 'fail');
  assert.match(
    pages.evidence.join('\n'),
    /pending-review marker for holder\.taxId/,
  );
  assert.equal(r.code, 1);
});

test('an English site with cookieless analytics and an embed gets English texts and the embed listed', async () => {
  const b = brief();
  b.language = 'en';
  b.legal.markets = ['DE'];
  b.legal.processing = {
    analytics: 'cookieless',
    forms: true,
    embeds: ['YouTube (privacy-enhanced mode)'],
  };
  setBrief(b);
  assert.equal(generate(), 0);
  await build(siteDir);
  const policy = dist('privacidad/index.html');
  for (const value of [
    'Privacy policy',
    'Who is responsible',
    'does not store information on your device',
    'YouTube (privacy-enhanced mode)',
    'national data protection authority',
  ])
    assert.ok(policy.includes(value), value);
  assert.ok(!policy.includes('AEPD'));
  assert.ok(dist('aviso-legal/index.html').includes('Legal notice'));
});
