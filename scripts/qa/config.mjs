// QA configuration: roadmap defaults, loading and a small built-in validator.
// A missing config file means "use the defaults" (spec: Configurable thresholds).
import { existsSync, readFileSync } from 'node:fs';
import { REPORT_DEFAULTS, validateReportConfig } from '../report/config.mjs';
import { LEGAL_DEFAULTS, validateLegalConfig } from '../report/legal-rules.mjs';

export const DEFAULT_CONFIG = Object.freeze({
  viewports: [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ],
  pages: { exclude: ['404.html'] },
  reducedMotion: { viewportWidth: 1440, settleMs: 500 },
  lighthouse: {
    thresholds: { performance: 90, accessibility: 90, seo: 90 },
    reportOnly: ['best-practices'],
    runs: 1,
    skipCrawlableOnNoindex: true,
  },
  impeccable: {
    version: '4.6.0',
    target: 'src',
    severityMap: { error: 'major', warning: 'minor', advisory: 'info' },
    failOn: ['major'],
  },
  // Pages with [data-scene]: budget for the JS chunks that contain Three.js (gzip KB)
  // and how long to wait for the canvas after scrolling to a scene.
  threeD: { maxGzipKb: 200, canvasTimeoutMs: 15000 },
  // Layout diversity between sites (scripts/check-landing.mjs, scripts/lib/layout-core.mjs): the weighted
  // feature distance must be at least minLayoutDistance (0 identical .. 1 opposite) and at most maxHashMatch
  // of the viewport slices may match another site's within hashHamming bits (of 64).
  diversity: { minLayoutDistance: 0.2, maxHashMatch: 0.5, hashHamming: 10 },
  // Words that mark text as sample data; `brief-facts` of check-landing fails when an element holding a
  // customer fact (name, price, email, ...) also says one of them.
  brief: { sampleWords: ['ejemplo', 'example', 'sample'] },
  // Thresholds of the landing report (scripts/landing-report.mjs); defaults and validation live in scripts/report/config.mjs.
  report: REPORT_DEFAULTS,
  // Cookie allow list and tracker extensions of the legal area of the landing report (scripts/report/legal-rules.mjs).
  legal: LEGAL_DEFAULTS,
});

const LIGHTHOUSE_CATEGORIES = [
  'performance',
  'accessibility',
  'seo',
  'best-practices',
];
const SEVERITY_LEVELS = ['major', 'minor', 'info'];

const isObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** Merge `override` into `base`; arrays and scalars are replaced, objects merged. */
function merge(base, override) {
  if (!isObject(base) || !isObject(override))
    return override === undefined ? base : override;
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = key in base ? merge(base[key], value) : value;
  }
  return out;
}

/** Return a list of human-readable problems; empty means the config is valid. */
export function validateConfig(config) {
  const errors = [];
  const err = (path, message) => errors.push(`${path}: ${message}`);
  const known = (obj, keys, path) => {
    for (const key of Object.keys(obj)) {
      if (!keys.includes(key))
        err(`${path}.${key}`, `unknown key (allowed: ${keys.join(', ')})`);
    }
  };

  if (!isObject(config)) return ['config: must be an object'];
  known(
    config,
    [
      'viewports',
      'pages',
      'reducedMotion',
      'lighthouse',
      'impeccable',
      'threeD',
      'diversity',
      'brief',
      'report',
      'legal',
    ],
    'config',
  );

  if (!Array.isArray(config.viewports) || config.viewports.length === 0) {
    err('viewports', 'must be a non-empty array of { width, height }');
  } else {
    config.viewports.forEach((vp, i) => {
      if (
        !isObject(vp) ||
        !Number.isInteger(vp.width) ||
        vp.width <= 0 ||
        !Number.isInteger(vp.height) ||
        vp.height <= 0
      ) {
        err(
          `viewports[${i}]`,
          'must be { width, height } with positive integers',
        );
      }
    });
  }

  if (
    !isObject(config.pages) ||
    !Array.isArray(config.pages.exclude) ||
    !config.pages.exclude.every((p) => typeof p === 'string')
  ) {
    err(
      'pages.exclude',
      'must be an array of strings (paths relative to dist/)',
    );
  }

  const rm = config.reducedMotion;
  if (
    !isObject(rm) ||
    !Number.isInteger(rm.viewportWidth) ||
    rm.viewportWidth <= 0
  ) {
    err('reducedMotion.viewportWidth', 'must be a positive integer');
  } else if (!Number.isInteger(rm.settleMs) || rm.settleMs < 0) {
    err('reducedMotion.settleMs', 'must be an integer >= 0');
  }

  const lh = config.lighthouse;
  if (!isObject(lh)) {
    err('lighthouse', 'must be an object');
  } else {
    known(
      lh,
      ['thresholds', 'reportOnly', 'runs', 'skipCrawlableOnNoindex'],
      'lighthouse',
    );
    if (!isObject(lh.thresholds)) {
      err('lighthouse.thresholds', 'must be an object');
    } else {
      for (const [cat, value] of Object.entries(lh.thresholds)) {
        if (!LIGHTHOUSE_CATEGORIES.includes(cat))
          err(
            `lighthouse.thresholds.${cat}`,
            `unknown category (allowed: ${LIGHTHOUSE_CATEGORIES.join(', ')})`,
          );
        else if (typeof value !== 'number' || value < 0)
          err(
            `lighthouse.thresholds.${cat}`,
            'must be a number >= 0 (101 can never be met, handy to prove the gate fails)',
          );
      }
    }
    if (
      !Array.isArray(lh.reportOnly) ||
      !lh.reportOnly.every((c) => LIGHTHOUSE_CATEGORIES.includes(c))
    ) {
      err(
        'lighthouse.reportOnly',
        `must be an array of ${LIGHTHOUSE_CATEGORIES.join(' | ')}`,
      );
    }
    if (typeof lh.skipCrawlableOnNoindex !== 'boolean')
      err('lighthouse.skipCrawlableOnNoindex', 'must be a boolean');
    if (!Number.isInteger(lh.runs) || lh.runs < 1)
      err('lighthouse.runs', 'must be an integer >= 1');
  }

  const imp = config.impeccable;
  if (!isObject(imp)) {
    err('impeccable', 'must be an object');
  } else {
    known(imp, ['version', 'target', 'severityMap', 'failOn'], 'impeccable');
    if (typeof imp.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(imp.version))
      err(
        'impeccable.version',
        'must be an exact semver string such as "4.6.0"',
      );
    if (typeof imp.target !== 'string' || !imp.target)
      err('impeccable.target', 'must be a path string');
    if (
      !isObject(imp.severityMap) ||
      !Object.values(imp.severityMap).every((v) => SEVERITY_LEVELS.includes(v))
    ) {
      err(
        'impeccable.severityMap',
        `must map impeccable severities to ${SEVERITY_LEVELS.join(' | ')}`,
      );
    }
    if (
      !Array.isArray(imp.failOn) ||
      !imp.failOn.every((v) => SEVERITY_LEVELS.includes(v))
    ) {
      err(
        'impeccable.failOn',
        `must be an array of ${SEVERITY_LEVELS.join(' | ')}`,
      );
    }
  }

  const td = config.threeD;
  if (!isObject(td)) {
    err('threeD', 'must be an object');
  } else {
    known(td, ['maxGzipKb', 'canvasTimeoutMs'], 'threeD');
    if (typeof td.maxGzipKb !== 'number' || !(td.maxGzipKb > 0))
      err('threeD.maxGzipKb', 'must be a number > 0');
    if (!Number.isInteger(td.canvasTimeoutMs) || td.canvasTimeoutMs < 1000)
      err('threeD.canvasTimeoutMs', 'must be an integer >= 1000');
  }

  const dv = config.diversity;
  if (!isObject(dv)) {
    err('diversity', 'must be an object');
  } else {
    known(
      dv,
      ['minLayoutDistance', 'maxHashMatch', 'hashHamming'],
      'diversity',
    );
    if (
      typeof dv.minLayoutDistance !== 'number' ||
      dv.minLayoutDistance < 0 ||
      dv.minLayoutDistance > 1
    )
      err('diversity.minLayoutDistance', 'must be a number between 0 and 1');
    if (
      typeof dv.maxHashMatch !== 'number' ||
      dv.maxHashMatch < 0 ||
      dv.maxHashMatch > 1
    )
      err('diversity.maxHashMatch', 'must be a number between 0 and 1');
    if (
      !Number.isInteger(dv.hashHamming) ||
      dv.hashHamming < 0 ||
      dv.hashHamming > 32
    )
      err('diversity.hashHamming', 'must be an integer between 0 and 32');
  }

  const brief = config.brief;
  if (!isObject(brief)) {
    err('brief', 'must be an object');
  } else {
    known(brief, ['sampleWords'], 'brief');
    if (
      !Array.isArray(brief.sampleWords) ||
      !brief.sampleWords.every((w) => typeof w === 'string' && w.trim() !== '')
    )
      err('brief.sampleWords', 'must be an array of non-empty words');
  }
  // The report section is validated by scripts/report/config.mjs (defaults live there too).
  if ('report' in config) errors.push(...validateReportConfig(config.report));
  if ('legal' in config) errors.push(...validateLegalConfig(config.legal));
  return errors;
}

/** Load `file` (if it exists) over the defaults and validate. Throws on invalid config. */
export function loadConfig(file) {
  let user = {};
  if (file && existsSync(file)) {
    try {
      user = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      throw new Error(`Cannot parse ${file}: ${error.message}`);
    }
  }
  const config = merge(structuredClone(DEFAULT_CONFIG), user);
  const errors = validateConfig(config);
  if (errors.length)
    throw new Error(
      `Invalid QA config${file ? ` (${file})` : ''}:\n  - ${errors.join('\n  - ')}`,
    );
  return config;
}
