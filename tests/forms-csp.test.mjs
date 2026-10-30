// CSP for lead forms (add-lead-forms, task 3.3): only a site whose legal data names Web3Forms opens its origin in
// form-action and connect-src; a site without a form (and the starter) gains nothing.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
// Under .cache/ (git-ignored) so node resolves astro and the plugins from the repository's node_modules.
const base = join(ROOT, '.cache', `forms-csp-test-${process.pid}`);
after(() => rmSync(base, { recursive: true, force: true }));

let counter = 0;
async function directivesOf(legal) {
  const dir = join(base, `site-${counter++}`);
  mkdirSync(join(dir, 'src/data'), { recursive: true });
  cpSync(join(ROOT, 'astro.config.mjs'), join(dir, 'astro.config.mjs'));
  if (legal !== undefined)
    writeFileSync(join(dir, 'src/data/legal.json'), JSON.stringify(legal));
  const config = (
    await import(pathToFileURL(join(dir, 'astro.config.mjs')).href)
  ).default;
  return config.security.csp.directives;
}
const legal = (forms) => ({
  processing: { analytics: 'none', forms, embeds: [] },
});

test('the starter and a site without legal data gain no directive', async () => {
  const dirs = await directivesOf(undefined);
  assert.deepEqual(dirs, ["base-uri 'self'", "object-src 'none'"]);
  const config = (
    await import(pathToFileURL(join(ROOT, 'astro.config.mjs')).href)
  ).default;
  assert.deepEqual(config.security.csp.directives, dirs);
});

test('no form, an old `forms: true` and a WhatsApp-only form open nothing', async () => {
  for (const forms of [
    false,
    true,
    { provider: 'whatsapp', providers: ['whatsapp'], purposes: [], fields: [] },
  ]) {
    const dirs = await directivesOf(legal(forms));
    assert.ok(!dirs.join(' ').includes('web3forms'), JSON.stringify(forms));
    assert.ok(!dirs.some((d) => /^(form-action|connect-src)/.test(d)));
  }
});

test('a Web3Forms form opens its origin in form-action and connect-src and nothing else', async () => {
  const dirs = await directivesOf(
    legal({
      provider: 'web3forms',
      providers: ['web3forms', 'whatsapp'],
      purposes: ['valuation'],
      fields: ['name'],
    }),
  );
  assert.deepEqual(dirs.slice(2), [
    "form-action 'self' https://api.web3forms.com",
    "connect-src 'self' https://api.web3forms.com",
  ]);
  const origins = dirs.join(' ').match(/https?:\/\/[^\s;]+/g);
  assert.deepEqual([...new Set(origins)], ['https://api.web3forms.com']);
});

test('public/_headers keeps no form origin: the CSP of forms lives in the page meta tag', async () => {
  const { readFileSync } = await import('node:fs');
  const headers = readFileSync(join(ROOT, 'public/_headers'), 'utf8');
  assert.ok(!/web3forms|form-action|connect-src/.test(headers));
});
