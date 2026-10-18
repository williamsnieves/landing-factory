#!/usr/bin/env node
// One viewport screenshot per section per width, for reviewing a built site the way a visitor sees it.
// Full-page captures show pinned sections as empty space; these scroll each section to the top of the
// viewport first.
//
//   node scripts/section-shots.mjs --site <slug> [--widths 375,768,1440] [--out <dir>]
//
// Serves sites/<slug>/dist itself (build first: npm run build -w site-<slug>) and always shuts the server
// down, also on errors and SIGINT/SIGTERM. Chromium: QA_CHROME_PATH or CHROME_PATH, else Playwright's.
// Files: <out>/<page>-<nn>-<section>-<width>.png (default out: qa/<slug>/sections/).
// Exit codes: 0 ok, 1 nothing to capture or capture failed, 2 bad usage.
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

import { SLUG_PATTERN } from './lib/sites.mjs';
import { discoverPages, startStatic } from './qa/server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_WIDTHS = [375, 768, 1440];
const HEIGHTS = { 375: 812, 768: 1024, 1440: 900 };
export const SELECTOR = 'section[id], header, footer';

const HELP = `Usage: node scripts/section-shots.mjs --site <slug> [--widths 375,768,1440] [--out <dir>]

Writes one viewport screenshot per section (section[id], header, footer) per width to
qa/<slug>/sections/ (or --out). Build the site first: npm run build -w site-<slug>.
  --site <slug>     the site (serves sites/<slug>/dist)
  --dist <dir>      serve any built folder instead (tests); needs --out or --site for the output
  --widths a,b      viewport widths in px (default ${DEFAULT_WIDTHS.join(',')})
  --out <dir>       output folder
Exit codes: 0 ok, 1 nothing captured or failed, 2 bad usage.`;

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'x';

/** Capture every page of `distDir`. Returns the written file paths. */
export async function captureSections({
  distDir,
  outDir,
  widths,
  log = () => {},
}) {
  const envChrome = process.env.QA_CHROME_PATH || process.env.CHROME_PATH;
  const chromePath = envChrome || chromium.executablePath();
  if (!existsSync(chromePath))
    throw new Error(
      `Chromium not found at ${chromePath}. Run \`npx playwright install chromium\` or set QA_CHROME_PATH.`,
    );
  const pages = discoverPages(distDir, ['404.html']);
  if (!pages.length) throw new Error(`No .html pages found in ${distDir}`);
  await mkdir(outDir, { recursive: true });

  const cleanups = [];
  const closeAll = async () => {
    for (const fn of cleanups.splice(0).reverse()) await fn().catch(() => {});
  };
  const onSignal = () => closeAll().finally(() => process.exit(130));
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  const written = [];
  try {
    const server = await startStatic(distDir);
    cleanups.push(() => server.close());
    const browser = await chromium.launch(
      envChrome ? { executablePath: envChrome } : {},
    );
    cleanups.push(() => browser.close());
    for (const page of pages) {
      const prefix = page.path === '/' ? 'index' : slugify(page.path);
      for (const width of widths) {
        const context = await browser.newContext({
          viewport: { width, height: HEIGHTS[width] ?? 900 },
        });
        try {
          const tab = await context.newPage();
          await tab.goto(`${server.baseUrl}${page.path}`, {
            waitUntil: 'load',
          });
          // Scroll through once so one-shot reveals have played, then back to the top.
          await tab.evaluate(async () => {
            const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
            for (
              let y = 0, n = 0;
              y < document.documentElement.scrollHeight && n < 120;
              y += step, n += 1
            ) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 60));
            }
            window.scrollTo(0, 0);
          });
          const count = await tab.locator(SELECTOR).count();
          for (let i = 0; i < count; i += 1) {
            const target = tab.locator(SELECTOR).nth(i);
            const name = await target.evaluate(
              (el) => el.id || el.tagName.toLowerCase(),
            );
            await target.evaluate((el) => {
              // Re-measure at scroll time: pins and reveals move things.
              window.scrollTo(
                0,
                el.getBoundingClientRect().top + window.scrollY,
              );
            });
            await tab.waitForTimeout(700);
            const file = join(
              outDir,
              `${prefix}-${String(i + 1).padStart(2, '0')}-${slugify(name)}-${width}.png`,
            );
            await tab.screenshot({ path: file });
            written.push(file);
          }
          log(`${page.path} @${width}: ${count} section(s)`);
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await closeAll();
  }
  return written;
}

export async function main(argv, io = console) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        dist: { type: 'string' },
        widths: { type: 'string' },
        out: { type: 'string' },
        help: { type: 'boolean' },
      },
    }));
  } catch (error) {
    io.error(`section-shots: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  if (!values.site && !values.dist) {
    io.error(`section-shots: --site <slug> is required\n\n${HELP}`);
    return 2;
  }
  if (values.site && !SLUG_PATTERN.test(values.site)) {
    io.error(`section-shots: invalid slug "${values.site}"`);
    return 2;
  }
  const widths = (
    values.widths ? values.widths.split(',') : DEFAULT_WIDTHS
  ).map(Number);
  if (widths.some((w) => !Number.isInteger(w) || w < 200 || w > 4000)) {
    io.error('section-shots: --widths must be integers between 200 and 4000');
    return 2;
  }
  const distDir = values.dist
    ? resolve(values.dist)
    : join(ROOT, 'sites', values.site, 'dist');
  const outDir = resolve(
    values.out ?? join(ROOT, 'qa', values.site ?? 'sections', 'sections'),
  );
  if (!existsSync(distDir)) {
    io.error(
      `section-shots: ${distDir} does not exist; build first (npm run build -w site-${values.site})`,
    );
    return 1;
  }
  try {
    const files = await captureSections({
      distDir,
      outDir,
      widths,
      log: (m) => io.log(m),
    });
    if (!files.length) {
      io.error('section-shots: no section[id], header or footer found');
      return 1;
    }
    io.log(`section-shots: ${files.length} screenshot(s) in ${outDir}`);
    return 0;
  } catch (error) {
    io.error(`section-shots: ${error.message}`);
    return 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = await main(process.argv.slice(2));
}
