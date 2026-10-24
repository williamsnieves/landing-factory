// Lighthouse through its Node API, driving the same Chromium as Playwright via chrome-launcher.
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

export const CATEGORIES = [
  'performance',
  'accessibility',
  'seo',
  'best-practices',
];
export const PRESETS = ['mobile', 'desktop'];

const CHROME_FLAGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
];

export function launchChrome(chromePath) {
  return chromeLauncher.launch({
    chromePath,
    chromeFlags: CHROME_FLAGS,
    logLevel: 'silent',
  });
}

const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Highest-impact failing audits of one category: weight x (1 - score). */
function topAudits(lhr, category, limit = 5) {
  const cat = lhr.categories[category];
  return cat.auditRefs
    .filter((ref) => ref.weight > 0)
    .map((ref) => ({ ref, audit: lhr.audits[ref.id] }))
    .filter(({ audit }) => typeof audit.score === 'number' && audit.score < 1)
    .map(({ ref, audit }) => ({
      id: audit.id,
      title: audit.title,
      score: audit.score,
      displayValue: audit.displayValue ?? null,
      impact: Number((ref.weight * (1 - audit.score)).toFixed(2)),
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, limit);
}

const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;
const ms = (value) => Math.round(value);

/** The audit when Lighthouse ran it for this page; null when absent or not applicable. */
function auditOf(lhr, id) {
  const audit = lhr.audits?.[id];
  if (!audit || audit.scoreDisplayMode === 'notApplicable') return null;
  if (audit.scoreDisplayMode === 'error') return null;
  return audit;
}

const numeric = (audit) =>
  audit && typeof audit.numericValue === 'number' ? audit.numericValue : null;

/** Depth-first search for the first `node` detail (selector, snippet, label) in an audit's details. */
function findNode(details) {
  if (!details || typeof details !== 'object') return null;
  if (details.type === 'node' && details.selector)
    return {
      selector: details.selector,
      snippet: details.snippet ?? null,
      label: details.nodeLabel ?? null,
    };
  if (details.node) return findNode({ ...details.node, type: 'node' });
  for (const value of Array.isArray(details.items) ? details.items : []) {
    const found = findNode(value);
    if (found) return found;
  }
  return null;
}

/** Same-origin URLs become paths, so the detail does not depend on the QA server's port. */
function shortUrl(url, origin) {
  if (typeof url !== 'string') return null;
  return origin && url.startsWith(origin)
    ? url.slice(origin.length) || '/'
    : url;
}

/**
 * The performance detail of one Lighthouse run, stored next to the scores so other tools
 * (scripts/landing-report.mjs) need no second run. Lighthouse 13 replaced several audits with
 * "insights" (image-delivery, font-display, render-blocking, third-parties, lcp-breakdown), so
 * both generations of ids are read. A field is null when Lighthouse did not run its audit.
 */
export function perfDetail(lhr) {
  let origin = null;
  try {
    origin = new URL(lhr.finalDisplayedUrl ?? lhr.finalUrl ?? '').origin;
  } catch {
    // no usable URL: keep absolute URLs
  }
  const rows = (audit) =>
    audit && Array.isArray(audit.details?.items) ? audit.details.items : null;

  const lcpMs = numeric(auditOf(lhr, 'largest-contentful-paint'));
  const lcpNode =
    findNode(auditOf(lhr, 'largest-contentful-paint-element')?.details) ??
    findNode(auditOf(lhr, 'lcp-breakdown-insight')?.details);
  const requests = rows(auditOf(lhr, 'network-requests'));
  const weight = numeric(auditOf(lhr, 'total-byte-weight'));

  // Image findings: the legacy per-topic audits, else the image-delivery insight.
  const imageAudits = [
    'modern-image-formats',
    'uses-responsive-images',
    'offscreen-images',
    'uses-optimized-images',
    'image-delivery-insight',
  ]
    .map((id) => [id, auditOf(lhr, id)])
    .filter(([, audit]) => audit);
  let images = null;
  if (imageAudits.length) {
    const items = [];
    let savings = 0;
    for (const [id, audit] of imageAudits) {
      const saved =
        audit.details?.overallSavingsBytes ??
        audit.details?.debugData?.wastedBytes ??
        0;
      savings += saved;
      for (const row of rows(audit) ?? [])
        items.push({
          audit: id,
          url: shortUrl(row.url, origin),
          totalKb:
            typeof row.totalBytes === 'number' ? kb(row.totalBytes) : null,
          savingsKb: kb(row.wastedBytes ?? 0),
        });
    }
    images = { savingsKb: kb(savings), items: items.slice(0, 10) };
  }

  const fontAudit =
    auditOf(lhr, 'font-display') ?? auditOf(lhr, 'font-display-insight');
  const fonts = rows(fontAudit)
    ? {
        items: rows(fontAudit)
          .slice(0, 10)
          .map((row) => ({
            url: shortUrl(row.url, origin),
            wastedMs: ms(row.wastedMs ?? 0),
          })),
      }
    : null;

  const blockingAudit =
    auditOf(lhr, 'render-blocking-resources') ??
    auditOf(lhr, 'render-blocking-insight');
  const renderBlocking = rows(blockingAudit)
    ? rows(blockingAudit)
        .slice(0, 10)
        .map((row) => ({
          url: shortUrl(row.url, origin),
          sizeKb: kb(row.totalBytes ?? 0),
          wastedMs: ms(row.wastedMs ?? 0),
        }))
    : null;

  const thirdAudit =
    auditOf(lhr, 'third-party-summary') ??
    auditOf(lhr, 'third-parties-insight');
  const thirdParties = rows(thirdAudit)
    ? rows(thirdAudit)
        .slice(0, 10)
        .map((row) => ({
          entity:
            typeof row.entity === 'string'
              ? row.entity
              : (row.entity?.text ?? row.entity?.value ?? null),
          sizeKb: kb(row.transferSize ?? 0),
          mainThreadMs: ms(row.mainThreadTime ?? 0),
        }))
    : null;

  return {
    lcpMs: lcpMs === null ? null : ms(lcpMs),
    lcpElement: lcpNode,
    cls: (() => {
      const v = numeric(auditOf(lhr, 'cumulative-layout-shift'));
      return v === null ? null : Math.round(v * 1000) / 1000;
    })(),
    tbtMs: (() => {
      const v = numeric(auditOf(lhr, 'total-blocking-time'));
      return v === null ? null : ms(v);
    })(),
    totalByteWeightKb: weight === null ? null : kb(weight),
    requestCount: requests ? requests.length : null,
    images,
    fonts,
    renderBlocking,
    thirdParties,
  };
}

/**
 * Run `runs` Lighthouse passes for one URL and preset. Scores are the median per
 * category; the audit list comes from the run with the median performance score.
 */
export async function runPreset({ url, port, preset, runs, skipAudits = [] }) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const flags = {
      port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: CATEGORIES,
      skipAudits,
    };
    const result = await lighthouse(
      url,
      flags,
      preset === 'desktop' ? desktopConfig : undefined,
    );
    if (!result?.lhr || result.lhr.runtimeError) {
      throw new Error(
        `Lighthouse ${preset} failed for ${url}: ${result?.lhr?.runtimeError?.message ?? 'no result'}`,
      );
    }
    results.push(result.lhr);
  }
  const scoreOf = (lhr, cat) =>
    Math.round((lhr.categories[cat].score ?? 0) * 100);
  const scores = Object.fromEntries(
    CATEGORIES.map((cat) => [
      cat,
      median(results.map((lhr) => scoreOf(lhr, cat))),
    ]),
  );
  const representative = [...results].sort(
    (a, b) => scoreOf(a, 'performance') - scoreOf(b, 'performance'),
  )[Math.floor(results.length / 2)];
  const audits = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, topAudits(representative, cat)]),
  );
  return {
    preset,
    runs,
    scores,
    runScores: results.map((lhr) =>
      Object.fromEntries(CATEGORIES.map((c) => [c, scoreOf(lhr, c)])),
    ),
    topAudits: audits,
    detail: perfDetail(representative),
    lighthouseVersion: representative.lighthouseVersion,
  };
}

/** Worst (lowest) score per category across presets. */
export function worstScores(presetResults) {
  return Object.fromEntries(
    CATEGORIES.map((cat) => [
      cat,
      Math.min(...presetResults.map((r) => r.scores[cat])),
    ]),
  );
}
