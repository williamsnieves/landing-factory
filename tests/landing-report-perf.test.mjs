// Performance items of the landing report (task 6.1): QA detail with the timestamp guard, and measures of dist/.
import assert from 'node:assert/strict';
import { readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { loadDist } from '../scripts/report/dist-scan.mjs';
import { distPerfItems, pageWeights } from '../scripts/report/perf.mjs';
import {
  REPORT_DEFAULTS,
  resolveReportConfig,
} from '../scripts/report/config.mjs';
import { itemOf, makeSite, runReport, statusOf } from './report-fixture.mjs';

const sites = [];
const site = () => {
  const s = makeSite();
  sites.push(s);
  return s;
};
after(() => sites.forEach((s) => s.cleanup()));

const qaOf = (s) => JSON.parse(readFileSync(s.qaFile, 'utf8'));
const writeQa = (s, mutate) => {
  const qa = qaOf(s);
  mutate(qa);
  writeFileSync(s.qaFile, JSON.stringify(qa));
};
const blob = (kb) => Buffer.alloc(kb * 1024, 7);
const LH_IDS = [
  'lh-scores',
  'lh-vitals',
  'lh-loading',
  'lh-assets',
  'lh-third-party',
];

test('the QA detail is shown per page and preset: scores, LCP element, CLS, TBT, weight and requests', async () => {
  const s = site();
  const { report, outDir, code } = await runReport(s, ['--only', 'static']);
  assert.equal(code, 0);
  for (const id of LH_IDS) assert.equal(statusOf(report, id), 'pass', id);
  assert.deepEqual(
    report.performance.pages.map((p) => `${p.page} ${p.preset}`),
    ['/ mobile', '/ desktop'],
  );
  assert.equal(
    report.performance.pages[0].detail.lcpElement.selector,
    'main#main > h1',
  );
  const md = readFileSync(join(outDir, 'report.md'), 'utf8');
  assert.match(
    md,
    /\| \/ \| mobile \| 98 \| 100 \| 100 \| 1200 \| 0 \| 10 \| 20 \| 5 \| `main#main > h1` \|/,
  );
  assert.match(
    itemOf(report, 'lh-vitals').evidence[0],
    /LCP 1200 ms, CLS 0, TBT 10 ms; LCP element main#main > h1/,
  );
});

test('a QA report older than the build gives not run with "run QA first"', async () => {
  const s = site();
  writeQa(s, (qa) => (qa.finishedAt = '2000-01-01T00:00:00.000Z'));
  const { report, code } = await runReport(s, ['--only', 'static']);
  assert.equal(code, 0);
  for (const id of LH_IDS) {
    const item = itemOf(report, id);
    assert.equal(item.status, 'not-run', id);
    assert.match(item.title, /run QA first/);
  }
  assert.match(report.qa.problem, /older than the build/);
  // Touching the build older than the QA report brings the detail back.
  const past = new Date('1999-01-01');
  utimesSync(join(s.distDir, 'index.html'), past, past);
  const again = await runReport(s, ['--only', 'static']);
  assert.equal(statusOf(again.report, 'lh-scores'), 'pass');
});

test('a missing QA report, or one that skipped Lighthouse, is not run too', async () => {
  const s = site();
  const none = await runReport(s, [
    '--only',
    'static',
    '--qa',
    join(s.root, 'nope.json'),
  ]);
  assert.equal(statusOf(none.report, 'lh-scores'), 'not-run');
  assert.match(none.report.qa.problem, /no QA report at/);
  writeQa(s, (qa) => qa.pages.forEach((p) => delete p.lighthouse));
  const skipped = await runReport(s, ['--only', 'static']);
  assert.match(itemOf(skipped.report, 'lh-scores').title, /skipped Lighthouse/);
  // The dist measures still run.
  assert.equal(statusOf(skipped.report, 'page-weight'), 'pass');
});

test('a Lighthouse score of 85 fails, exit 1; the QA thresholds are not lowered by the report', async () => {
  const s = site();
  writeQa(
    s,
    (qa) => (qa.pages[0].lighthouse.presets[0].scores.performance = 85),
  );
  const { report, code } = await runReport(s, ['--only', 'static']);
  assert.equal(code, 1);
  const item = itemOf(report, 'lh-scores');
  assert.equal(item.status, 'fail');
  assert.ok(
    item.evidence.includes('/ mobile performance 85 (threshold 90) BELOW'),
  );
  assert.equal(item.area, 'performance');
});

test('LCP, CLS and TBT above the report thresholds warn and never fail', async () => {
  const s = site();
  writeQa(s, (qa) => {
    const d = qa.pages[0].lighthouse.presets[0].detail;
    d.lcpMs = 3100;
    d.cls = 0.25;
    d.tbtMs = 450;
  });
  const { report, code } = await runReport(s, ['--only', 'static']);
  assert.equal(code, 0);
  const item = itemOf(report, 'lh-vitals');
  assert.equal(item.status, 'warn');
  assert.match(
    item.evidence[0],
    /LCP 3100 ms > 2500, CLS 0\.25 > 0\.1, TBT 450 ms > 200/,
  );
});

test('thresholds come from the report section of qa.config.json, per site', async () => {
  const s = site();
  writeFileSync(
    join(s.siteDir, 'qa.config.json'),
    JSON.stringify({ report: { lcpMs: 1000, maxImageKb: 5 } }),
  );
  s.write('dist/img/photo.webp', blob(8));
  const { report } = await runReport(s, ['--only', 'static']);
  assert.equal(statusOf(report, 'lh-vitals'), 'warn'); // LCP 1200 > 1000
  assert.equal(statusOf(report, 'image-size'), 'warn'); // 8 KB > 5
  assert.equal(report.config.lcpMs, 1000);
  assert.equal(report.config.maxPageKb, REPORT_DEFAULTS.maxPageKb);
});

test('a heavy JPEG warns with its file, size and the fix (modern format or smaller size)', async () => {
  const s = site();
  s.write('dist/img/heavy.jpg', blob(450));
  const { report, code } = await runReport(s, ['--only', 'static']);
  assert.equal(code, 0);
  const size = itemOf(report, 'image-size');
  assert.equal(size.status, 'warn');
  assert.deepEqual(size.evidence, ['dist/img/heavy.jpg 450 KB']);
  assert.match(size.fix, /WebP or AVIF/);
  const format = itemOf(report, 'image-format');
  assert.equal(format.status, 'warn');
  assert.match(format.title, /1 JPEG or PNG image\(s\) over 100 KB/);
});

test('a page over maxPageKb warns; weights count text gzipped and a srcset once, at its largest', async () => {
  const s = site();
  s.write('dist/img/big.webp', blob(300));
  s.write('dist/img/small.webp', blob(100));
  s.write(
    'dist/about/index.html',
    s
      .read('dist/about/index.html')
      .replace(
        '<h1>About</h1>',
        '<img src="/img/small.webp" srcset="/img/small.webp 400w, /img/big.webp 1200w" alt="">',
      ),
  );
  writeFileSync(
    join(s.siteDir, 'qa.config.json'),
    JSON.stringify({ report: { maxPageKb: 250 } }),
  );
  const model = loadDist(s.distDir);
  const weights = pageWeights(model);
  const about = weights.find((w) => w.path === '/about/');
  assert.ok(about.kb >= 300 && about.kb < 310, `about weighs ${about.kb} KB`);
  assert.ok(
    !about.largest.join().includes('small.webp'),
    'the src fallback of a srcset is not counted',
  );
  const { report, code } = await runReport(s, ['--only', 'static']);
  assert.equal(code, 0);
  const item = itemOf(report, 'page-weight');
  assert.equal(item.status, 'warn');
  assert.match(item.title, /1 page\(s\) weigh more than 250 KB/);
  assert.match(
    item.evidence.find((e) => e.startsWith('/about/')),
    /KB in \d+ file\(s\); largest img\/big\.webp 300 KB/,
  );
});

test('font files are counted per face, not per unicode-range subset', () => {
  const s = site();
  for (const subset of ['latin', 'latin-ext', 'cyrillic'])
    s.write(
      `dist/_astro/dm-sans-${subset}-wght-normal.AbCdEf12.woff2`,
      blob(10),
    );
  s.write('dist/_astro/dm-sans-latin-wght-italic.AbCdEf12.woff2', blob(10));
  const items = distPerfItems(loadDist(s.distDir), resolveReportConfig({}));
  const fonts = items.find((i) => i.id === 'font-files');
  assert.equal(fonts.status, 'pass');
  assert.match(fonts.title, /2 font face\(s\) in 4 file\(s\), 40 KB in total/);
  const strict = distPerfItems(
    loadDist(s.distDir),
    resolveReportConfig({ maxFontFiles: 1 }),
  );
  assert.equal(strict.find((i) => i.id === 'font-files').status, 'warn');
});

test('report config: unknown keys and bad values exit 2 with the offending key', async () => {
  const s = site();
  writeFileSync(
    join(s.siteDir, 'qa.config.json'),
    JSON.stringify({ report: { lcpMs: 'fast', nope: 1 } }),
  );
  const { code, err } = await runReport(s, ['--only', 'static']);
  assert.equal(code, 2);
  assert.match(err, /report\.lcpMs: must be a number >= 0/);
  assert.match(err, /report\.nope: unknown key/);
});
