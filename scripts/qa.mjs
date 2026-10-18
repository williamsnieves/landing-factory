#!/usr/bin/env node
// QA pipeline: build, serve, check every page, write qa/<timestamp>/report.{json,md}.
// Exit codes: 0 all checks passed, 1 at least one check failed, 2 the run itself broke.
// Run `node scripts/qa.mjs --help` for options.
import { existsSync } from 'node:fs';
import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { measureLayout, measureReducedMotion } from './qa/browser-checks.mjs';
import { loadConfig } from './qa/config.mjs';
import { runImpeccable } from './qa/impeccable.mjs';
import {
  PRESETS,
  launchChrome,
  runPreset,
  worstScores,
} from './qa/lighthouse.mjs';
import { renderMarkdown } from './qa/report.mjs';
import { resolveImpeccableTarget, resolveQaPaths } from './qa/site.mjs';
import {
  build,
  discoverPages,
  startPreview,
  startStatic,
} from './qa/server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECKS = ['layout', 'reduced-motion', 'lighthouse', 'impeccable'];

const HELP = `Usage: npm run qa -- [options]

Builds the site, serves it, and checks every dist/**/*.html page.

  --dist <dir>      Skip the build and serve this directory of static HTML instead
                    (alias: --fixture). Default: build, then \`astro preview\` on dist/.
  --site <slug>     QA one site of sites/<slug>/ instead of the root starter: builds and
                    serves that site, runs impeccable on its src/, reports to
                    qa/<slug>/ (qa/<slug>/latest links to the newest run).
  --config <file>   Config file (default: sites/<slug>/qa.config.json if present with
                    --site, else qa.config.json; defaults apply if missing).
  --out <dir>       Where run folders go (default: qa/, then <slug>/ with --site).
                    <out>/latest links to the newest run.
  --src <path>      Source path for impeccable detect (default: config impeccable.target,
                    resolved inside the site with --site).
  --runs <n>        Lighthouse runs per page and preset; the median is used.
  --skip <list>     Comma-separated checks to skip: ${CHECKS.join(', ')}.
  --help            Show this help.

Environment: QA_CHROME_PATH or CHROME_PATH selects the Chromium binary (otherwise
Playwright's own browser is used). Exit code 0 = pass, 1 = checks failed, 2 = run error.`;

const log = (msg) => process.stderr.write(`[qa] ${msg}\n`);

async function main() {
  const { values: args } = parseArgs({
    options: {
      site: { type: 'string' },
      'sites-dir': { type: 'string' }, // test hook: where sites live (default sites/)
      dist: { type: 'string' },
      fixture: { type: 'string' },
      config: { type: 'string' },
      out: { type: 'string' },
      src: { type: 'string' },
      runs: { type: 'string' },
      skip: { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  if (args.help) {
    console.log(HELP);
    return 0;
  }

  const paths = resolveQaPaths({
    root: ROOT,
    site: args.site,
    sitesDir: args['sites-dir'] ? resolve(ROOT, args['sites-dir']) : undefined,
    config: args.config,
    out: args.out,
  });
  const config = loadConfig(paths.configPath);
  if (args.runs) {
    config.lighthouse.runs = Number(args.runs);
    if (!Number.isInteger(config.lighthouse.runs) || config.lighthouse.runs < 1)
      throw new Error('--runs must be an integer >= 1');
  }
  const skip = new Set(
    (args.skip ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  for (const s of skip)
    if (!CHECKS.includes(s))
      throw new Error(
        `Unknown check in --skip: ${s} (known: ${CHECKS.join(', ')})`,
      );

  const startedAt = new Date();
  const runId = startedAt
    .toISOString()
    .replace(/\.\d+Z$/, 'Z')
    .replace(/:/g, '-'); // no ':' so CI artifact upload accepts it
  const outRoot = paths.outRoot;
  const outDir = join(outRoot, runId);
  await mkdir(join(outDir, 'screens'), { recursive: true });

  const cleanups = [];
  const cleanup = async () => {
    while (cleanups.length)
      await Promise.resolve()
        .then(cleanups.pop())
        .catch(() => {});
  };
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => cleanup().finally(() => process.exit(130)));
  }

  try {
    // 1. Build and serve
    const distArg = args.dist ?? args.fixture;
    let server;
    let distDir;
    if (distArg) {
      distDir = resolve(ROOT, distArg);
      server = await startStatic(distDir);
    } else {
      log(
        `building ${args.site ? `site ${args.site}` : 'the starter'} (astro build)`,
      );
      await build(paths.projectDir);
      distDir = join(paths.projectDir, 'dist');
      server = await startPreview(paths.projectDir);
    }
    cleanups.push(() => server.close());
    const pages = discoverPages(distDir, config.pages.exclude);
    if (!pages.length) throw new Error(`No .html pages found in ${distDir}`);
    log(
      `serving ${pages.length} page(s) from ${relative(ROOT, distDir) || '.'} at ${server.baseUrl} (${server.kind}): ${pages.map((p) => p.path).join(' ')}`,
    );

    // 2. Browser checks
    const envChrome = process.env.QA_CHROME_PATH || process.env.CHROME_PATH;
    const chromePath = envChrome || chromium.executablePath();
    if (!existsSync(chromePath)) {
      throw new Error(
        `Chromium not found at ${chromePath}. Run \`npx playwright install chromium\` or set QA_CHROME_PATH.`,
      );
    }
    const failures = [];
    const pageReports = pages.map((p) => ({
      path: p.path,
      file: p.file,
      url: `${server.baseUrl}${p.path}`,
      viewports: {},
      reducedMotion: null,
      lighthouse: null,
      pageErrors: [],
    }));

    if (!skip.has('layout') || !skip.has('reduced-motion')) {
      const browser = await chromium.launch(
        envChrome ? { executablePath: envChrome } : {},
      );
      cleanups.push(() => browser.close());
      for (const [i, p] of pages.entries()) {
        const report = pageReports[i];
        if (!skip.has('layout')) {
          for (const vp of config.viewports) {
            const context = await browser.newContext({ viewport: vp });
            try {
              const page = await context.newPage();
              page.on('pageerror', (e) =>
                report.pageErrors.push(String(e.message)),
              );
              const res = await page.goto(report.url, { waitUntil: 'load' });
              if (!res || res.status() >= 400) {
                report.loadError = `HTTP ${res?.status() ?? 'no response'}`;
                failures.push({
                  check: 'page-load',
                  page: p.path,
                  viewport: vp.width,
                  metric: 'http-status',
                  measured: res?.status() ?? null,
                  threshold: '< 400',
                  message: `${p.path} returned ${report.loadError}`,
                });
                break;
              }
              // Scroll through the page so one-shot reveals have played, then return to the top.
              await page.evaluate(async () => {
                const step = Math.max(
                  200,
                  Math.floor(window.innerHeight * 0.8),
                );
                for (
                  let y = 0, n = 0;
                  y < document.documentElement.scrollHeight && n < 80;
                  y += step, n++
                ) {
                  window.scrollTo(0, y);
                  await new Promise((r) => setTimeout(r, 120));
                }
                window.scrollTo(0, 0);
              });
              await page.waitForTimeout(1200);
              const m = await page.evaluate(measureLayout);
              const screenshot = `screens/${p.slug}-${vp.width}.png`;
              await page.screenshot({
                path: join(outDir, screenshot),
                fullPage: true,
              });
              const pass =
                !m.documentOverflow &&
                m.overflowing.length === 0 &&
                m.clipped.length === 0;
              report.viewports[vp.width] = {
                height: vp.height,
                screenshot,
                pass,
                ...m,
              };
              if (m.documentOverflow) {
                failures.push({
                  check: 'overflow',
                  page: p.path,
                  viewport: vp.width,
                  metric: 'document-scroll-width',
                  measured: m.documentScrollWidth,
                  threshold: `<= ${vp.width}`,
                  message: `page scrolls horizontally (${m.documentScrollWidth}px > ${vp.width}px)`,
                });
              }
              for (const o of m.overflowing) {
                failures.push({
                  check: 'overflow',
                  page: p.path,
                  viewport: vp.width,
                  metric: 'element-width',
                  measured: o.width,
                  threshold: `right edge <= ${vp.width}`,
                  selector: o.selector,
                  message: `${o.selector} is ${o.width}px wide and ends at ${o.right}px`,
                });
              }
              for (const c of m.clipped) {
                failures.push({
                  check: 'clipped-text',
                  page: p.path,
                  viewport: vp.width,
                  metric: c.kind,
                  measured: c.contentWidth ?? c.width,
                  threshold: c.containerWidth ?? c.width,
                  selector: c.selector,
                  message: `text "${c.text}" is clipped (${c.kind}); add data-qa-allow-clip if intentional`,
                });
              }
            } finally {
              await context.close();
            }
          }
        }
        if (!skip.has('reduced-motion') && !report.loadError) {
          const vp = config.viewports.find(
            (v) => v.width === config.reducedMotion.viewportWidth,
          ) ?? { width: config.reducedMotion.viewportWidth, height: 900 };
          const context = await browser.newContext({
            viewport: vp,
            reducedMotion: 'reduce',
          });
          try {
            const page = await context.newPage();
            await page.goto(report.url, { waitUntil: 'load' });
            await page.waitForTimeout(config.reducedMotion.settleMs);
            const rm = await page.evaluate(measureReducedMotion);
            const pass =
              rm.hiddenReveals.length === 0 &&
              rm.lenisClasses.length === 0 &&
              rm.pinSpacers.length === 0;
            report.reducedMotion = { viewportWidth: vp.width, pass, ...rm };
            for (const h of rm.hiddenReveals) {
              failures.push({
                check: 'reduced-motion',
                page: p.path,
                viewport: vp.width,
                metric: 'reveal-opacity',
                measured: h.opacity,
                threshold: '> 0',
                selector: h.selector,
                message: `[data-reveal] ${h.selector} stays invisible under prefers-reduced-motion`,
              });
            }
            if (rm.lenisClasses.length) {
              failures.push({
                check: 'reduced-motion',
                page: p.path,
                viewport: vp.width,
                metric: 'smooth-scroll',
                measured: rm.lenisClasses.join(' '),
                threshold: 'no lenis class on <html>',
                message:
                  'Lenis smooth scroll is active under prefers-reduced-motion',
              });
            }
            for (const s of rm.pinSpacers) {
              failures.push({
                check: 'reduced-motion',
                page: p.path,
                viewport: vp.width,
                metric: 'pin',
                measured: s,
                threshold: 'no .pin-spacer',
                selector: s,
                message: `ScrollTrigger pin is active under prefers-reduced-motion (${s})`,
              });
            }
          } finally {
            await context.close();
          }
        }
      }
      await cleanups.pop()(); // close the browser before Lighthouse starts
    }

    // 3. Lighthouse (mobile + desktop, worst per category)
    if (!skip.has('lighthouse')) {
      const chrome = await launchChrome(chromePath);
      cleanups.push(async () => chrome.kill());
      for (const [i, p] of pages.entries()) {
        const report = pageReports[i];
        if (report.loadError) continue;
        log(
          `lighthouse ${p.path} (${PRESETS.join(' + ')}, ${config.lighthouse.runs} run(s) each)`,
        );
        // A page that deliberately opts out of indexing (e.g. the islands test page)
        // cannot pass Lighthouse's is-crawlable audit. Skip only that audit; every
        // other SEO audit still counts toward the score.
        const html = await fetch(report.url).then((r) => r.text());
        const robots =
          html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] ?? '';
        report.noindex = /noindex/i.test(robots);
        const skipAudits =
          report.noindex && config.lighthouse.skipCrawlableOnNoindex
            ? ['is-crawlable']
            : [];
        const presets = [];
        for (const preset of PRESETS)
          presets.push(
            await runPreset({
              url: report.url,
              port: chrome.port,
              preset,
              runs: config.lighthouse.runs,
              skipAudits,
            }),
          );
        const worst = worstScores(presets);
        const thresholds = config.lighthouse.thresholds;
        const failedCategories = [];
        for (const [category, threshold] of Object.entries(thresholds)) {
          const failing = presets.filter((r) => r.scores[category] < threshold);
          if (!failing.length) continue;
          const lowest = failing.reduce((a, b) =>
            a.scores[category] <= b.scores[category] ? a : b,
          );
          const entry = {
            category,
            preset: lowest.preset,
            score: lowest.scores[category],
            threshold,
            topAudits: lowest.topAudits[category],
          };
          failedCategories.push(entry);
          failures.push({
            check: 'lighthouse',
            page: p.path,
            viewport: lowest.preset,
            metric: category,
            measured: entry.score,
            threshold,
            message: `${category} ${entry.score} < ${threshold} on ${lowest.preset}; top audits: ${entry.topAudits.map((a) => a.id).join(', ') || 'none'}`,
            topAudits: entry.topAudits,
          });
        }
        report.lighthouse = {
          runs: config.lighthouse.runs,
          skippedAudits: skipAudits,
          thresholds,
          reportOnly: config.lighthouse.reportOnly,
          presets,
          worst,
          failedCategories,
          version: presets[0].lighthouseVersion,
        };
      }
      await cleanups.pop()();
    }

    // 4. impeccable detect on the source code
    let impeccable = null;
    if (!skip.has('impeccable')) {
      const imp = config.impeccable;
      const target = resolveImpeccableTarget({
        root: ROOT,
        projectDir: paths.projectDir,
        src: args.src,
        target: imp.target,
      });
      log(`impeccable@${imp.version} detect ${target}`);
      impeccable = {
        version: imp.version,
        target,
        failOn: imp.failOn,
        error: null,
        findings: [],
        counts: { major: 0, minor: 0, info: 0 },
      };
      try {
        impeccable.findings = await runImpeccable({
          version: imp.version,
          target,
          severityMap: imp.severityMap,
          cwd: ROOT,
        });
        for (const f of impeccable.findings) impeccable.counts[f.level]++;
        for (const f of impeccable.findings.filter((x) =>
          imp.failOn.includes(x.level),
        )) {
          failures.push({
            check: 'impeccable',
            page: null,
            viewport: null,
            metric: f.rule,
            measured: f.level,
            threshold: `no ${imp.failOn.join('/')} findings`,
            file: f.file,
            line: f.line,
            message: `${f.rule} (${f.severity}) at ${f.file}:${f.line ?? '?'}: ${f.snippet ?? f.description ?? ''}`,
          });
        }
      } catch (error) {
        // Never a silent pass: if the detector cannot run, the check fails loudly.
        impeccable.error = error.message;
        failures.push({
          check: 'impeccable',
          page: null,
          viewport: null,
          metric: 'execution',
          measured: 'error',
          threshold: 'detector runs',
          message: error.message,
        });
      }
    }

    // 5. Report
    const finishedAt = new Date();
    const report = {
      schemaVersion: 1,
      site: args.site ?? null,
      runId,
      verdict: failures.length ? 'failed' : 'passed',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt - startedAt,
      source: {
        kind: distArg ? 'static' : 'astro preview',
        baseUrl: server.baseUrl,
        dist: relative(ROOT, distDir) || '.',
      },
      skipped: [...skip],
      config,
      pages: pageReports,
      impeccable,
      failures,
    };
    await writeFile(
      join(outDir, 'report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await writeFile(join(outDir, 'report.md'), renderMarkdown(report));
    const latest = join(outRoot, 'latest');
    await rm(latest, { force: true });
    await symlink(runId, latest, 'dir');

    log(
      `${report.verdict.toUpperCase()}: ${failures.length} failure(s). Report: ${relative(ROOT, join(outDir, 'report.md'))} (${relative(ROOT, join(outRoot, 'latest'))})`,
    );
    for (const f of failures.slice(0, 20))
      log(`  - [${f.check}] ${f.page ?? ''} ${f.viewport ?? ''} ${f.message}`);
    if (failures.length > 20)
      log(`  ... and ${failures.length - 20} more (see report.json)`);
    return failures.length ? 1 : 0;
  } finally {
    await cleanup();
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    process.stderr.write(`[qa] ERROR: ${error.stack ?? error.message}\n`);
    process.exit(2);
  },
);
