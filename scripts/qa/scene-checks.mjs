// QA checks for pages with 3D scenes (elements with [data-scene]); design:
// openspec/changes/add-3d-scenes/design.md, Decision 5. Four checks per page:
//   scene-reduced-motion  reduced motion: no canvas, poster visible, no 3D code downloaded
//   scene-no-js           JavaScript disabled: poster visible, no canvas
//   scene-runtime         normal load: the canvas appears near each scene, no WebGL/THREE/scene
//                         console errors, no page errors; scrubbed scenes get a moving progress
//   scene-budget          gzip size of the JS chunks that contain Three.js
// Headless Chromium renders WebGL through SwiftShader: enough to find errors, not to judge looks.
import { gzipSync } from 'node:zlib';

/** Chromium flags that give headless runs a software WebGL. */
export const WEBGL_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

/** A JS chunk "contains Three.js" when it has this marker (survives minification: error strings). */
export const THREE_MARKER = /WebGLRenderer/;
export const SCENE_ERROR = /webgl|three|scene/i;

/** Names of the [data-scene] elements in an HTML string. */
export function sceneNames(html) {
  return [...html.matchAll(/\bdata-scene\s*=\s*["']([^"']+)["']/g)].map(
    (m) => m[1],
  );
}

/**
 * Chunks that contain Three.js, with their gzip size.
 * @param {Array<{url: string, body: Buffer|string}>} scripts
 */
export function threeChunks(scripts) {
  return scripts
    .filter((s) => THREE_MARKER.test(s.body.toString()))
    .map((s) => ({
      url: s.url,
      gzipBytes: gzipSync(Buffer.from(s.body)).length,
    }));
}

/** Failures of the budget check; `chunks` come from threeChunks(). */
export function budgetResult(chunks, maxGzipKb) {
  const bytes = chunks.reduce((sum, c) => sum + c.gzipBytes, 0);
  const gzipKb = Number((bytes / 1024).toFixed(2));
  return { gzipKb, maxGzipKb, chunks, pass: gzipKb <= maxGzipKb };
}

/** Runs in the page: canvas and poster state of every [data-scene]. */
export async function measureSceneFallback() {
  const out = [];
  for (const el of document.querySelectorAll('[data-scene]')) {
    el.scrollIntoView({ block: 'center' });
    const img = el.querySelector('img');
    if (img) {
      try {
        await Promise.race([
          img.decode(),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
      } catch {
        // a broken image shows up as not visible below
      }
    }
    let opacity = 1;
    for (let n = img; n && n.nodeType === 1; n = n.parentElement)
      opacity *= parseFloat(getComputedStyle(n).opacity);
    const rect = img ? img.getBoundingClientRect() : null;
    out.push({
      name: el.dataset.scene,
      canvases: el.querySelectorAll('canvas').length,
      hasPoster: Boolean(img),
      posterVisible: Boolean(
        img &&
        rect.width > 0 &&
        rect.height > 0 &&
        img.naturalWidth > 0 &&
        opacity > 0 &&
        img.checkVisibility({ checkVisibilityCSS: true }),
      ),
      state: el.dataset.sceneState ?? null,
    });
  }
  return out;
}

const pushFailure = (failures, page, viewport, check, metric, f) =>
  failures.push({
    check,
    page,
    viewport,
    metric,
    ...f,
  });

/**
 * Run the scene checks for one page. Mutates `failures`; returns the report block.
 * @param {object} o
 * @param {import('playwright').Browser} o.browser
 * @param {string} o.url
 * @param {string} o.path           URL path of the page (for failures)
 * @param {object} o.config         QA config (reducedMotion, threeD, viewports)
 * @param {Array} o.failures
 */
export async function runSceneChecks({ browser, url, path, config, failures }) {
  const width = config.reducedMotion.viewportWidth;
  const viewport = { width, height: 900 };
  const timeout = config.threeD.canvasTimeoutMs;
  const block = {
    reducedMotion: null,
    noJs: null,
    runtime: null,
    budget: null,
  };

  // Records every script the page downloads (body kept to look for Three.js).
  const trackScripts = (page) => {
    const pending = [];
    page.on('response', (res) => {
      const type = res.request().resourceType();
      if (type !== 'script') return;
      pending.push(
        res
          .body()
          .then((body) => ({ url: res.url(), body }))
          .catch(() => null),
      );
    });
    return async () => (await Promise.all(pending)).filter(Boolean);
  };

  // (a) Reduced motion: poster only, and no 3D code downloaded.
  {
    const context = await browser.newContext({
      viewport,
      reducedMotion: 'reduce',
    });
    try {
      const page = await context.newPage();
      const scripts = trackScripts(page);
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(config.reducedMotion.settleMs + 500);
      const scenes = await page.evaluate(measureSceneFallback);
      const downloaded = threeChunks(await scripts());
      block.reducedMotion = {
        viewportWidth: width,
        scenes,
        threeDownloaded: downloaded.map((c) => c.url),
        pass:
          downloaded.length === 0 &&
          scenes.every((s) => s.canvases === 0 && s.posterVisible),
      };
      for (const s of scenes) {
        if (s.canvases > 0)
          pushFailure(failures, path, width, 'scene-reduced-motion', 'canvas', {
            measured: s.canvases,
            threshold: 0,
            selector: `[data-scene="${s.name}"]`,
            message: `scene "${s.name}" created a canvas under prefers-reduced-motion`,
          });
        if (!s.posterVisible)
          pushFailure(failures, path, width, 'scene-reduced-motion', 'poster', {
            measured: s.hasPoster ? 'not visible' : 'missing',
            threshold: 'poster img visible',
            selector: `[data-scene="${s.name}"]`,
            message: `scene "${s.name}" has no visible poster image under prefers-reduced-motion`,
          });
      }
      for (const c of downloaded)
        pushFailure(
          failures,
          path,
          width,
          'scene-reduced-motion',
          'three-downloaded',
          {
            measured: c.url,
            threshold: 'no 3D code downloaded',
            message: `3D code (${c.url}) was downloaded under prefers-reduced-motion`,
          },
        );
    } finally {
      await context.close();
    }
  }

  // (b) No JavaScript: poster only.
  {
    const context = await browser.newContext({
      viewport,
      javaScriptEnabled: false,
    });
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'load' });
      const scenes = await page.evaluate(measureSceneFallback);
      block.noJs = {
        scenes,
        pass: scenes.every((s) => s.canvases === 0 && s.posterVisible),
      };
      for (const s of scenes) {
        if (s.canvases > 0 || !s.posterVisible)
          pushFailure(failures, path, width, 'scene-no-js', 'poster', {
            measured:
              s.canvases > 0
                ? `${s.canvases} canvas`
                : s.hasPoster
                  ? 'not visible'
                  : 'missing',
            threshold: 'poster visible, no canvas',
            selector: `[data-scene="${s.name}"]`,
            message: `scene "${s.name}" without JavaScript: ${s.canvases > 0 ? 'a canvas exists' : s.hasPoster ? 'the poster is not visible' : 'there is no poster image'}`,
          });
      }
    } finally {
      await context.close();
    }
  }

  // (c) Normal load: canvas created near each scene, no errors; (d) budget.
  {
    const context = await browser.newContext({ viewport });
    try {
      const page = await context.newPage();
      const scripts = trackScripts(page);
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' && SCENE_ERROR.test(m.text()))
          errors.push(`console.error: ${m.text()}`);
      });
      await page.goto(url, { waitUntil: 'load' });
      const names = await page.$$eval('[data-scene]', (els) =>
        els.map((el) => el.dataset.scene),
      );
      const scenes = [];
      for (const [i, name] of names.entries()) {
        const figure = page.locator('[data-scene]').nth(i);
        await figure.scrollIntoViewIfNeeded();
        await page.evaluate(
          (index) =>
            document
              .querySelectorAll('[data-scene]')
              [index].scrollIntoView({ block: 'center' }),
          i,
        );
        let canvas = true;
        try {
          await figure.locator('canvas').first().waitFor({
            state: 'attached',
            timeout,
          });
          await page.waitForTimeout(800); // a few frames, so render errors surface
        } catch {
          canvas = false;
        }
        const state = await figure.getAttribute('data-scene-state');
        const reason = await figure.getAttribute('data-scene-reason');
        const entry = { name, canvas, state, reason };
        if (
          await figure.evaluate((el) => el.hasAttribute('data-scene-scrub'))
        ) {
          const sample = () =>
            figure.evaluate((el) =>
              el.dataset.sceneProgress === undefined
                ? null
                : Number(el.dataset.sceneProgress),
            );
          const progress = [];
          for (const at of [0, 0.5, 1]) {
            await page.evaluate((f) => {
              const max =
                document.documentElement.scrollHeight - window.innerHeight;
              window.scrollTo(0, max * f);
            }, at);
            await page.waitForTimeout(350);
            progress.push(await sample());
          }
          entry.progress = progress;
        }
        scenes.push(entry);
        if (!canvas)
          pushFailure(failures, path, width, 'scene-runtime', 'canvas', {
            measured: `state ${state ?? 'none'}${reason ? ` (${reason})` : ''}`,
            threshold: `canvas within ${timeout} ms`,
            selector: `[data-scene="${name}"]`,
            message: `scene "${name}" created no canvas within ${timeout} ms (state: ${state ?? 'none'}${reason ? `, reason: ${reason}` : ''})`,
          });
        if (entry.progress) {
          const known = entry.progress.filter((p) => p !== null);
          const moved =
            known.length === entry.progress.length &&
            Math.max(...known) - Math.min(...known) >= 0.05;
          entry.progressMoves = moved;
          if (!moved)
            pushFailure(failures, path, width, 'scene-runtime', 'scrub', {
              measured: entry.progress.join(' / '),
              threshold: 'data-scene-progress changes while scrolling',
              selector: `[data-scene="${name}"]`,
              message: `scene "${name}" has data-scene-scrub but its progress did not change while scrolling (${entry.progress.join(', ')})`,
            });
        }
      }
      const unique = [...new Set(errors)];
      block.runtime = {
        viewportWidth: width,
        scenes,
        errors: unique,
        pass:
          unique.length === 0 &&
          scenes.every((s) => s.canvas && s.progressMoves !== false),
      };
      for (const message of unique)
        pushFailure(failures, path, width, 'scene-runtime', 'error', {
          measured: message,
          threshold: 'no WebGL/THREE/scene errors',
          message,
        });

      const chunks = threeChunks(await scripts());
      block.budget = budgetResult(chunks, config.threeD.maxGzipKb);
      if (!block.budget.pass)
        pushFailure(failures, path, null, 'scene-budget', 'gzip-kb', {
          measured: block.budget.gzipKb,
          threshold: config.threeD.maxGzipKb,
          message: `3D JavaScript is ${block.budget.gzipKb} KB gzip (budget ${config.threeD.maxGzipKb} KB): ${chunks.map((c) => `${c.url.split('/').pop()} ${(c.gzipBytes / 1024).toFixed(1)} KB`).join(', ')}`,
        });
    } finally {
      await context.close();
    }
  }
  return block;
}
