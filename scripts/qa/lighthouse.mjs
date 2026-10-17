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
