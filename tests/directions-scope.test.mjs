// Scoped tokens (add-landing-preview, Decision 1): a page that wraps its content in [data-direction] and redefines
// the token variables restyles Tailwind utilities inside the scope, and only there. A tiny fixture site is built with
// the starter's tokens.css and Tailwind setup and loaded in Chromium; the root starter needs no code change.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { startStatic } from '../scripts/qa/server.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const envChrome = process.env.QA_CHROME_PATH || process.env.CHROME_PATH;
const chromePath = envChrome || chromium.executablePath();
const skip = existsSync(chromePath) ? false : 'no Chromium installed';

// Inside the checkout (git-ignored .cache/) so Node resolves the root node_modules; removed afterwards.
mkdirSync(join(ROOT, '.cache'), { recursive: true });
const fixture = mkdtempSync(join(ROOT, '.cache', 'directions-scope-'));
let server;
let browser;

const direction = (id, extra = '') => `---
import '../../../styles/directions/${id}.css';
import '../../../styles/global.css';
---
<html lang="en">
  <head><meta charset="utf-8" /><meta name="robots" content="noindex" /><title>Direction ${id}</title></head>
  <body>
    <div id="outside" class="bg-paper text-ink font-display">outside the scope</div>
    <main id="scope" data-direction="${id}" class="bg-paper text-ink font-display rounded-md">
      <h1 id="title" class="text-primary font-display">Hero ${extra}</h1>
      <p id="inner" class="bg-surface text-ink-soft">inner</p>
    </main>
  </body>
</html>
`;

before(async () => {
  for (const dir of [
    'src/pages/directions/a',
    'src/pages/directions/b',
    'src/styles/directions',
  ])
    mkdirSync(join(fixture, dir), { recursive: true });
  copyFileSync(
    join(ROOT, 'src/styles/tokens.css'),
    join(fixture, 'src/styles/tokens.css'),
  );
  writeFileSync(
    join(fixture, 'src/styles/global.css'),
    "@import 'tailwindcss';\n@import './tokens.css';\n",
  );
  writeFileSync(
    join(fixture, 'src/styles/directions/a.css'),
    `[data-direction='a'] {
  --color-paper: #102030;
  --color-ink: #f0e0d0;
  --color-primary: #ff8800;
  --color-surface: #203040;
  --color-ink-soft: #c0d0e0;
  --font-display: 'Zz Direction A', monospace;
  --radius-md: 0;
}
`,
  );
  writeFileSync(
    join(fixture, 'src/styles/directions/b.css'),
    `[data-direction='b'] {
  --color-paper: #e8f5e9;
  --color-ink: #1b3a1f;
  --color-primary: #00695c;
  --color-surface: #c8e6c9;
  --color-ink-soft: #355e3b;
  --font-display: 'Zz Direction B', serif;
  --radius-md: 2rem;
}
`,
  );
  writeFileSync(
    join(fixture, 'src/pages/directions/a/index.astro'),
    direction('a'),
  );
  writeFileSync(
    join(fixture, 'src/pages/directions/b/index.astro'),
    direction('b'),
  );
  writeFileSync(
    join(fixture, 'astro.config.mjs'),
    `import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ output: 'static', vite: { plugins: [tailwindcss()] } });
`,
  );
  const pkg = createRequire(join(ROOT, 'package.json')).resolve(
    'astro/package.json',
  );
  const meta = JSON.parse(readFileSync(pkg, 'utf8'));
  const bin = join(
    dirname(pkg),
    typeof meta.bin === 'string' ? meta.bin : meta.bin.astro,
  );
  const built = spawnSync(process.execPath, [bin, 'build'], {
    cwd: fixture,
    encoding: 'utf8',
  });
  assert.equal(built.status, 0, built.stdout + built.stderr);
  if (skip) return;
  server = await startStatic(join(fixture, 'dist'));
  browser = await chromium.launch(
    envChrome ? { executablePath: envChrome } : {},
  );
});
after(async () => {
  await browser?.close();
  await server?.close();
  rmSync(fixture, { recursive: true, force: true });
});

const computed = (page) =>
  page.evaluate(() => {
    const read = (id) => {
      const style = getComputedStyle(document.getElementById(id));
      return {
        background: style.backgroundColor,
        color: style.color,
        fontFamily: style.fontFamily,
        radius: style.borderTopLeftRadius,
      };
    };
    return {
      outside: read('outside'),
      scope: read('scope'),
      title: read('title'),
      inner: read('inner'),
    };
  });

test(
  'redefined variables restyle the utilities inside [data-direction] and nothing outside it',
  { skip },
  async () => {
    const page = await browser.newPage();
    await page.goto(`${server.baseUrl}/directions/a/`, { waitUntil: 'load' });
    const a = await computed(page);
    assert.equal(a.scope.background, 'rgb(16, 32, 48)');
    assert.equal(a.scope.color, 'rgb(240, 224, 208)');
    assert.match(a.scope.fontFamily, /Zz Direction A/);
    assert.equal(a.scope.radius, '0px');
    assert.equal(a.title.color, 'rgb(255, 136, 0)');
    assert.match(a.title.fontFamily, /Zz Direction A/);
    assert.equal(a.inner.background, 'rgb(32, 48, 64)');
    assert.equal(a.inner.color, 'rgb(192, 208, 224)');
    // The same utilities outside the scope keep the starter's tokens.
    assert.equal(a.outside.background, 'rgb(250, 247, 242)');
    assert.equal(a.outside.color, 'rgb(20, 18, 15)');
    assert.doesNotMatch(a.outside.fontFamily, /Zz Direction/);
    await page.close();
  },
);

test(
  'two directions of one build get their own palettes, fonts and radii',
  { skip },
  async () => {
    const page = await browser.newPage();
    await page.goto(`${server.baseUrl}/directions/b/`, { waitUntil: 'load' });
    const b = await computed(page);
    assert.equal(b.scope.background, 'rgb(232, 245, 233)');
    assert.equal(b.title.color, 'rgb(0, 105, 92)');
    assert.match(b.scope.fontFamily, /Zz Direction B/);
    assert.doesNotMatch(b.scope.fontFamily, /Zz Direction A/);
    assert.equal(b.scope.radius, '32px');
    await page.close();
  },
);
