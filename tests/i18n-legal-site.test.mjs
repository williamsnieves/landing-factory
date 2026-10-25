// The legal components in a real bilingual site: scaffold with --langs, generate legal.json for both locales, add the
// four pages and a footer per locale, build, and read the result with the landing report. Scaffolded under .cache/
// (ignored by git) so node resolves astro from the repo's node_modules; removed afterwards.
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
const base = join(ROOT, '.cache', `i18n-legal-site-test-${process.pid}`);
const slug = 'zz-legal-i18n';
const siteDir = join(base, 'sites', slug);
const src = (rel) => join(siteDir, 'src', rel);
const dist = (rel) => readFileSync(join(siteDir, 'dist', rel), 'utf8');

// The footer links its own locale's legal pages, taken from legal.json.
const FOOTER = `---
import { legalPath, type LegalData } from './legal/texts';
import legal from '../data/legal.json';
const data = legal as LegalData;
const locale = Astro.currentLocale ?? data.defaultLocale!;
const labels: Record<string, [string, string]> = { en: ['Legal notice', 'Privacy'], es: ['Aviso legal', 'Privacidad'] };
const [noticeLabel, privacyLabel] = labels[locale] ?? labels.en;
---

<footer>
  <a href={legalPath(data, 'notice', locale)}>{noticeLabel}</a>
  <a href={legalPath(data, 'privacy', locale)}>{privacyLabel}</a>
</footer>
`;
const legalPage = (component, kind, slugs) => `---
import BaseLayout from '${slugs.up}layouts/BaseLayout.astro';
import Footer from '${slugs.up}components/Footer.astro';
import LanguageSwitcher from '${slugs.up}components/i18n/LanguageSwitcher.astro';
import ${component} from '${slugs.up}components/legal/${component}.astro';
import legal from '${slugs.up}data/legal.json';
import { locales } from '${slugs.up}i18n/ui';
import { legalPath, type LegalData } from '${slugs.up}components/legal/texts';
const data = legal as LegalData;
const locale = Astro.currentLocale!;
const slugs = { en: '${slugs.en}', es: '${slugs.es}' };
---

<BaseLayout title="${component}" description="Legal information." localeSlugs={slugs}>
  <LanguageSwitcher slot="header" locales={locales} slugs={slugs} />
  <${component} data={data} ${kind === 'notice' ? 'privacyHref' : 'noticeHref'}={legalPath(data, '${kind === 'notice' ? 'privacy' : 'notice'}', locale)} />
  <Footer slot="footer" />
</BaseLayout>
`;
const HOME = (up) => `---
import BaseLayout from '${up}layouts/BaseLayout.astro';
import Footer from '${up}components/Footer.astro';
---

<BaseLayout title="Taller" description="Notion templates.">
  <h1>Home</h1>
  <Footer slot="footer" />
</BaseLayout>
`;

before(() => {
  rmSync(base, { recursive: true, force: true });
  mkdirSync(siteDir, { recursive: true });
  const brief = JSON.parse(readFileSync(join(FIXTURE, 'brief.json'), 'utf8'));
  brief.language = 'en';
  brief.languages = ['en', 'es'];
  writeFileSync(join(siteDir, 'brief.json'), JSON.stringify(brief, null, 2));
  cpSync(join(FIXTURE, 'assets'), join(siteDir, 'assets'), { recursive: true });
  scaffoldSite({
    slug,
    sitesDir: join(base, 'sites'),
    allowExistingDocs: true,
    title: 'Taller',
    langs: 'en,es',
  });
  writeFileSync(join(base, 'package-lock.json'), '{}\n');
  const quiet = { log() {}, error() {} };
  assert.equal(legalMain(['--site', slug, '--write'], quiet, base), 0);
  writeFileSync(src('components/Footer.astro'), FOOTER);
  mkdirSync(src('pages/es'), { recursive: true });
  writeFileSync(src('pages/index.astro'), HOME('../'));
  writeFileSync(src('pages/es/index.astro'), HOME('../../'));
  const en = { en: 'legal-notice', es: 'aviso-legal' };
  const pr = { en: 'privacy', es: 'privacidad' };
  writeFileSync(
    src('pages/legal-notice.astro'),
    legalPage('LegalNotice', 'notice', { up: '../', ...en }),
  );
  writeFileSync(
    src('pages/privacy.astro'),
    legalPage('PrivacyPolicy', 'privacy', { up: '../', ...pr }),
  );
  writeFileSync(
    src('pages/es/aviso-legal.astro'),
    legalPage('LegalNotice', 'notice', { up: '../../', ...en }),
  );
  writeFileSync(
    src('pages/es/privacidad.astro'),
    legalPage('PrivacyPolicy', 'privacy', { up: '../../', ...pr }),
  );
});
after(() => rmSync(base, { recursive: true, force: true }));

test('each locale renders its own legal pages in its own language, linked from its own footer', async () => {
  await build(siteDir);
  const enNotice = dist('legal-notice/index.html');
  const esNotice = dist('es/aviso-legal/index.html');
  assert.match(enNotice, /<html lang="en"/);
  assert.match(enNotice, /Legal notice/);
  assert.match(esNotice, /<html lang="es"/);
  assert.match(esNotice, /Aviso legal/);
  assert.match(dist('privacy/index.html'), /Privacy policy/);
  assert.match(dist('es/privacidad/index.html'), /Política de privacidad/);
  for (const html of [enNotice, esNotice, dist('privacy/index.html')])
    assert.ok(
      html.includes('B00000000') || html.includes('Taller Plantilla S.L.'),
    );

  // Footers: the English home links the English pages, the Spanish home the Spanish ones.
  assert.match(dist('index.html'), /href="\/legal-notice\/"/);
  assert.match(dist('index.html'), /href="\/privacy\/"/);
  assert.match(dist('es/index.html'), /href="\/es\/aviso-legal\/"/);
  assert.match(dist('es/index.html'), /href="\/es\/privacidad\/"/);

  // The Spanish policy's switcher and hreflang point at the English slug.
  const esPrivacy = dist('es/privacidad/index.html');
  assert.match(
    esPrivacy,
    /<link rel="alternate" hreflang="en" href="\/privacy\/"/,
  );
  assert.match(esPrivacy, /<a href="\/privacy\/" hreflang="en"/);
});

test('the landing report passes legal-pages for both locales', async () => {
  const out = [];
  await reportMain(
    ['--site', slug, '--skip', 'audit,perf', '--out', join(base, 'qa')],
    { log: (m) => out.push(m), error: (m) => out.push(m) },
    { root: base },
  );
  const latest = join(base, 'qa', slug, 'report', 'latest', 'report.json');
  const report = JSON.parse(readFileSync(latest, 'utf8'));
  const pages = report.items.find((i) => i.id === 'legal-pages');
  assert.equal(pages.status, 'pass', JSON.stringify(pages));
  assert.match(pages.title, /present in en, es/);
});
