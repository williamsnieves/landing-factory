// The starter's Content-Security-Policy (security.csp in astro.config.mjs) must not block the motion layer,
// the React islands or the 3D scene: build the starter, load every page in Chromium, scroll it and assert
// that no securitypolicyviolation event fired. Skipped when no Chromium is installed.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { startStatic } from '../scripts/qa/server.mjs';
import { WEBGL_ARGS } from '../scripts/qa/scene-checks.mjs';
import { effectiveScriptPolicy } from '../scripts/report/headers.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const envChrome = process.env.QA_CHROME_PATH || process.env.CHROME_PATH;
const chromePath = envChrome || chromium.executablePath();
const skip = existsSync(chromePath) ? false : 'no Chromium installed';

const outDir = mkdtempSync(join(tmpdir(), 'csp-test-'));
let server;
let browser;

before(async () => {
  const pkg = createRequire(join(ROOT, 'package.json')).resolve(
    'astro/package.json',
  );
  const meta = JSON.parse(readFileSync(pkg, 'utf8'));
  const bin = join(
    dirname(pkg),
    typeof meta.bin === 'string' ? meta.bin : meta.bin.astro,
  );
  const built = spawnSync(
    process.execPath,
    [bin, 'build', '--outDir', outDir],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  assert.equal(built.status, 0, built.stdout + built.stderr);
  if (skip) return;
  server = await startStatic(outDir);
  browser = await chromium.launch({
    ...(envChrome ? { executablePath: envChrome } : {}),
    args: WEBGL_ARGS,
  });
});
after(async () => {
  await browser?.close();
  await server?.close();
  rmSync(outDir, { recursive: true, force: true });
});

test('every built page carries a CSP meta tag whose script-src has hashes and no unsafe-inline', () => {
  for (const file of [
    'index.html',
    '3d/index.html',
    'islands/index.html',
    'forms/index.html',
  ]) {
    const html = readFileSync(join(outDir, file), 'utf8');
    const meta =
      /<meta http-equiv="content-security-policy" content="([^"]+)"/.exec(html);
    assert.ok(meta, `${file} has no CSP meta tag`);
    const policy = effectiveScriptPolicy([meta[1]]);
    assert.equal(policy.restricts, true, file);
    assert.ok(policy.hashes.length > 0, file);
    assert.ok(
      !/script-src[^;]*'unsafe-inline'/.test(meta[1]),
      `${file}: unsafe-inline in script-src`,
    );
  }
});

test(
  'no securitypolicyviolation fires while loading and scrolling /, /3d/, /islands/ and /forms/',
  { skip },
  async () => {
    for (const path of ['/', '/3d/', '/islands/', '/forms/']) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();
      const consoleProblems = [];
      page.on('console', (m) => {
        if (/content security policy|refused to/i.test(m.text()))
          consoleProblems.push(m.text());
      });
      await page.addInitScript(() => {
        window.__violations = [];
        document.addEventListener('securitypolicyviolation', (e) =>
          window.__violations.push(
            `${e.violatedDirective} blocked ${e.blockedURI || 'inline'}`,
          ),
        );
      });
      await page.goto(`${server.baseUrl}${path}`, { waitUntil: 'load' });
      const height = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      for (let y = 0; y <= height; y += 450) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(150);
      }
      await page.waitForTimeout(2500); // the 3D runtime loads after `load`
      const violations = await page.evaluate(() => window.__violations);
      assert.deepEqual(violations, [], `${path} fired CSP violations`);
      assert.deepEqual(
        consoleProblems,
        [],
        `${path} logged CSP console errors`,
      );
      if (path === '/3d/') {
        // The scene really ran under the policy (WebGL is available through SwiftShader).
        const canvases = await page.locator('[data-scene] canvas').count();
        assert.ok(
          canvases >= 1,
          'the 3D scene created no canvas under the CSP',
        );
      }
      if (path === '/forms/') {
        // The lead form script ran under the policy: the WhatsApp form is shown and its plain link is gone.
        assert.equal(await page.isVisible('#form-callback'), true);
        assert.equal(await page.locator('[data-form-wa-link]').count(), 0);
      }
      if (path === '/') {
        const lenis = await page.evaluate(() =>
          document.documentElement.classList.contains('lenis'),
        );
        assert.equal(
          lenis,
          true,
          'the motion layer (Lenis) did not start under the CSP',
        );
      }
      await context.close();
    }
  },
);
