#!/usr/bin/env node
// Render the poster of a 3D scene from the scene itself.
//
//   node scripts/render-poster.mjs --page /3d/ --scene demo --out src/assets/3d-demo-poster.jpg
//   node scripts/render-poster.mjs --site samurai --page / --scene hero --out sites/samurai/src/assets/hero-poster.jpg
//
// Builds the project (or the site with --site), serves it, opens the page in Chromium with
// software WebGL, scrolls to the chosen scene progress, waits for the canvas and saves a PNG or
// JPEG (by file extension) of the canvas. With --site it also records the image in
// sites/<slug>/assets.json as source "self" (no visible credit needed).
// Exit codes: 0 done, 1 the scene did not render, 2 bad usage or the run broke.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

import { SLUG_PATTERN, isSiteDir } from './lib/sites.mjs';
import { build, startPreview, startStatic } from './qa/server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `Usage: node scripts/render-poster.mjs --page <path> --scene <name> --out <file> [options]

  --page <path>      URL path of the page holding the scene, for example /3d/
  --scene <name>     value of data-scene
  --out <file>       .jpg or .png to write (relative to the repo root unless absolute)
  --site <slug>      render sites/<slug> and record the poster in its assets.json
  --width <px>       viewport and canvas width (default 1600)
  --progress <0-1>   scroll progress of the scene section when the frame is taken (default 0.4)
  --no-build         serve the existing dist/ instead of building first
  --quality <1-100>  JPEG quality (default 84)
  --help             show this help

Environment: QA_CHROME_PATH or CHROME_PATH selects the Chromium binary.`;

/** Scroll offset that puts a section at the given progress (0 = entering, 1 = leaving). */
export function scrollForProgress({ top, height }, viewportHeight, progress) {
  return Math.max(
    0,
    top - viewportHeight + progress * (viewportHeight + height),
  );
}

/** The assets.json entry of a self-rendered poster. */
export function selfEntry({ file, scene, page, retrievedAt }) {
  return {
    file,
    title: `Poster of the "${scene}" 3D scene`,
    sourcePage: `site code: src/scenes/${scene}.ts (page ${page})`,
    author: 'Original',
    license: 'Original (rendered from site code)',
    credit: false,
    source: 'self',
    retrievedAt,
    note: `Rendered with scripts/render-poster.mjs from the "${scene}" scene.`,
  };
}

/** Add or replace the entry of `file` in a manifest object. */
export function upsertEntry(manifest, entry) {
  const images = (manifest.images ?? []).filter((e) => e.file !== entry.file);
  return { ...manifest, images: [...images, entry] };
}

async function main() {
  const { values: a } = parseArgs({
    options: {
      page: { type: 'string' },
      scene: { type: 'string' },
      out: { type: 'string' },
      site: { type: 'string' },
      width: { type: 'string' },
      progress: { type: 'string' },
      quality: { type: 'string' },
      'no-build': { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (a.help) {
    console.log(HELP);
    return 0;
  }
  if (!a.page || !a.scene || !a.out) {
    console.error(`--page, --scene and --out are required.\n\n${HELP}`);
    return 2;
  }
  const ext = extname(a.out).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    console.error('--out must end in .jpg, .jpeg or .png');
    return 2;
  }
  const width = Number(a.width ?? 1600);
  const progress = Number(a.progress ?? 0.4);
  const quality = Number(a.quality ?? 84);
  if (
    !Number.isInteger(width) ||
    width < 320 ||
    !(progress >= 0 && progress <= 1)
  ) {
    console.error(
      '--width must be an integer >= 320 and --progress between 0 and 1',
    );
    return 2;
  }
  let projectDir = ROOT;
  if (a.site) {
    projectDir = join(ROOT, 'sites', a.site);
    if (!SLUG_PATTERN.test(a.site) || !isSiteDir(projectDir)) {
      console.error(`No site "${a.site}" under sites/.`);
      return 2;
    }
  }
  const out = resolve(ROOT, a.out);
  const envChrome = process.env.QA_CHROME_PATH || process.env.CHROME_PATH;
  const chromePath = envChrome || chromium.executablePath();
  if (!existsSync(chromePath)) {
    console.error(`Chromium not found at ${chromePath}; set QA_CHROME_PATH.`);
    return 2;
  }

  let server;
  let browser;
  try {
    if (!a['no-build']) {
      console.error('[render-poster] building (astro build)');
      await build(projectDir);
    }
    const dist = join(projectDir, 'dist');
    server = a['no-build']
      ? await startStatic(dist)
      : await startPreview(projectDir);
    browser = await chromium.launch({
      executablePath: envChrome || undefined,
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
      ],
    });
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${server.baseUrl}${a.page}`, { waitUntil: 'load' });

    const figure = page.locator(`[data-scene="${a.scene}"]`).first();
    if ((await figure.count()) === 0) {
      console.error(`No [data-scene="${a.scene}"] on ${a.page}`);
      return 1;
    }
    // Put the scene section at the requested progress, then wait for the canvas.
    const placement = await figure.evaluate((el) => {
      const section = el.closest('section') ?? el;
      const rect = section.getBoundingClientRect();
      return { top: rect.top + window.scrollY, height: rect.height };
    });
    await page.evaluate(
      (y) => window.scrollTo(0, y),
      scrollForProgress(placement, 900, progress),
    );
    const canvas = figure.locator('canvas');
    try {
      await canvas.waitFor({ state: 'attached', timeout: 20000 });
    } catch {
      console.error(
        `The canvas did not appear (state: ${await figure.getAttribute('data-scene-state')}, reason: ${await figure.getAttribute('data-scene-reason')}). ${errors.join(' | ')}`,
      );
      return 1;
    }
    await page.waitForTimeout(2500); // fade-in, smoothing and a few frames
    await figure.scrollIntoViewIfNeeded();
    mkdirSync(dirname(out), { recursive: true });
    await canvas.screenshot({
      path: out,
      type: ext === '.png' ? 'png' : 'jpeg',
      ...(ext === '.png' ? {} : { quality }),
    });
    if (errors.length)
      console.error(`[render-poster] page logged: ${errors.join(' | ')}`);
    console.log(
      `Wrote ${relative(ROOT, out)} (${width}px wide, progress ${progress})`,
    );

    if (a.site) {
      const manifestPath = join(projectDir, 'assets.json');
      const manifest = existsSync(manifestPath)
        ? JSON.parse(readFileSync(manifestPath, 'utf8'))
        : { images: [] };
      const next = upsertEntry(
        manifest,
        selfEntry({
          file: basename(out),
          scene: a.scene,
          page: a.page,
          retrievedAt: new Date().toISOString(),
        }),
      );
      writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
      console.log(
        `Recorded ${basename(out)} in sites/${a.site}/assets.json (source: self)`,
      );
    } else {
      console.log(
        'Starter poster: no assets.json at the root; it is original work (see src/pages/3d.astro).',
      );
    }
    return 0;
  } finally {
    await browser?.close().catch(() => {});
    await server?.close().catch(() => {});
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`[render-poster] ERROR: ${error.stack ?? error.message}`);
      process.exit(2);
    },
  );
}
