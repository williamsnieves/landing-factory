// Performance items: Lighthouse detail from the latest QA run of the same build, and measures of dist/.
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { classifyUrl, resolveLocal } from './dist-scan.mjs';
import { kb } from './fs-util.mjs';
import { cssUrls, srcsetCandidates } from './html.mjs';
import { cap, makeItem } from './items.mjs';

const TEXT_EXT = /\.(html|css|m?js|json|svg|txt|xml|webmanifest)$/i;
const RASTER = /\.(jpe?g|png|webp|avif|gif)$/i;
const LEGACY = /\.(jpe?g|png)$/i;
const FONT = /\.(woff2?|ttf|otf|eot)$/i;
const SUBSET =
  /-(latin-ext|latin|cyrillic-ext|cyrillic|greek-ext|greek|vietnamese|hebrew|arabic|devanagari|thai|korean|japanese|chinese-simplified|chinese-traditional|math|symbols|\d+)(?=-)/;

/** `dm-sans-latin-ext-wght-normal.HASH.woff2` and the latin variant share one key: `dm-sans-wght-normal`. */
const fontFaceKey = (rel) =>
  rel
    .split('/')
    .pop()
    .replace(/\.[A-Za-z0-9_-]{6,12}\.(woff2?|ttf|otf|eot)$/i, '')
    .replace(SUBSET, '');

// --- QA report -----------------------------------------------------------------------------------------

/**
 * Locate and read the QA report. Returns { report, path } or { problem } when missing, unreadable or
 * older than the build (QA must have run on the same build: its finishedAt is after dist/index.html was written).
 */
export function loadQaReport({ qaFile, qaRoot, distDir }) {
  const file = qaFile ?? join(qaRoot, 'latest', 'report.json');
  if (!existsSync(file))
    return { problem: `no QA report at ${file}: run \`npm run qa\` first` };
  let report;
  try {
    report = JSON.parse(readFileSync(realpathSync(file), 'utf8'));
  } catch (error) {
    return { problem: `cannot read the QA report ${file}: ${error.message}` };
  }
  const indexFile = join(distDir, 'index.html');
  const finished = Date.parse(report.finishedAt);
  if (existsSync(indexFile) && Number.isFinite(finished)) {
    if (finished < statSync(indexFile).mtimeMs)
      return {
        problem: `the QA report (${report.finishedAt}) is older than the build: run QA first`,
      };
  }
  return { report, path: file };
}

const LH_IDS = [
  'lh-scores',
  'lh-vitals',
  'lh-loading',
  'lh-assets',
  'lh-third-party',
];
const LH_TITLES = {
  'lh-scores': 'Lighthouse scores',
  'lh-vitals': 'LCP, CLS and TBT',
  'lh-loading': 'Page weight, requests and render-blocking resources',
  'lh-assets': 'Image and font findings',
  'lh-third-party': 'Third-party code',
};

const notRunItems = (reason) =>
  LH_IDS.map((id) =>
    makeItem({
      id,
      area: 'performance',
      status: 'not-run',
      title: `${LH_TITLES[id]}: not run (${reason})`,
      fix: 'Run `npm run qa -- --site <slug>` (or `npm run qa` for the starter), then the report, on the same build.',
    }),
  );

const worstOf = (...statuses) =>
  statuses.includes('fail')
    ? 'fail'
    : statuses.includes('warn')
      ? 'warn'
      : 'pass';

/**
 * Items from the QA report's per-page Lighthouse entries. `thresholds` are the Lighthouse category
 * thresholds of the QA config; `cfg` the report thresholds. Returns { items, pages } where pages is
 * the per-page, per-preset table for the Markdown.
 */
export function lighthouseItems({ qa, problem, thresholds, cfg }) {
  if (problem) return { items: notRunItems(problem), pages: [] };
  const withLh = (qa.pages ?? []).filter((page) => page.lighthouse);
  if (!withLh.length)
    return {
      items: notRunItems('the QA run skipped Lighthouse'),
      pages: [],
    };

  const pages = [];
  const scores = [];
  const vitals = [];
  const loading = [];
  const assets = [];
  const third = [];
  let scoreStatus = 'pass';
  let vitalStatus = 'pass';
  let loadingStatus = 'pass';
  let assetStatus = 'pass';
  let thirdStatus = 'pass';
  let detailMissing = false;

  for (const page of withLh) {
    for (const preset of page.lighthouse.presets) {
      const tag = `${page.path} ${preset.preset}`;
      const d = preset.detail;
      pages.push({
        page: page.path,
        preset: preset.preset,
        scores: preset.scores,
        detail: d ?? null,
      });
      for (const [category, threshold] of Object.entries(thresholds)) {
        const score = preset.scores[category];
        const below = typeof score === 'number' && score < threshold;
        if (below) scoreStatus = 'fail';
        scores.push(
          `${tag} ${category} ${score} (threshold ${threshold})${below ? ' BELOW' : ''}`,
        );
      }
      if (!d) {
        detailMissing = true;
        continue;
      }
      // Vitals
      const vitalLine = [];
      if (d.lcpMs != null) {
        const over = d.lcpMs > cfg.lcpMs;
        if (over) vitalStatus = 'warn';
        vitalLine.push(`LCP ${d.lcpMs} ms${over ? ` > ${cfg.lcpMs}` : ''}`);
      }
      if (d.cls != null) {
        const over = d.cls > cfg.cls;
        if (over) vitalStatus = 'warn';
        vitalLine.push(`CLS ${d.cls}${over ? ` > ${cfg.cls}` : ''}`);
      }
      if (d.tbtMs != null) {
        const over = d.tbtMs > cfg.tbtMs;
        if (over) vitalStatus = 'warn';
        vitalLine.push(`TBT ${d.tbtMs} ms${over ? ` > ${cfg.tbtMs}` : ''}`);
      }
      vitals.push(
        `${tag}: ${vitalLine.join(', ') || 'no data'}${d.lcpElement ? `; LCP element ${d.lcpElement.selector}` : ''}`,
      );
      // Loading
      const blockingMs = (d.renderBlocking ?? []).reduce(
        (n, r) => n + r.wastedMs,
        0,
      );
      const heavy =
        d.totalByteWeightKb != null && d.totalByteWeightKb > cfg.maxPageKb;
      const blocked = blockingMs > cfg.renderBlockingMs;
      if (heavy || blocked) loadingStatus = 'warn';
      loading.push(
        `${tag}: ${d.totalByteWeightKb ?? '?'} KB in ${d.requestCount ?? '?'} request(s)${heavy ? ` > ${cfg.maxPageKb} KB` : ''}; render-blocking ${d.renderBlocking ? `${d.renderBlocking.length} resource(s), ${blockingMs} ms${blocked ? ` > ${cfg.renderBlockingMs}` : ''}` : 'no data'}`,
      );
      for (const r of d.renderBlocking ?? [])
        loading.push(`  blocking: ${r.url} (${r.sizeKb} KB, ${r.wastedMs} ms)`);
      // Images and fonts
      if (d.images) {
        const over = d.images.savingsKb >= cfg.imageSavingsKb;
        if (over) assetStatus = 'warn';
        assets.push(
          `${tag}: image savings ${d.images.savingsKb} KB${over ? ` >= ${cfg.imageSavingsKb}` : ''}`,
        );
        for (const item of d.images.items.slice(0, 5))
          assets.push(
            `  image: ${item.url} ${item.totalKb ?? '?'} KB, could save ${item.savingsKb} KB`,
          );
      }
      if (d.fonts?.items?.length) {
        assetStatus = 'warn';
        for (const font of d.fonts.items)
          assets.push(`${tag}: font-display ${font.url} (${font.wastedMs} ms)`);
      }
      // Third parties
      if (d.thirdParties) {
        const over = d.thirdParties.length > cfg.maxThirdPartyOrigins;
        if (over) thirdStatus = 'warn';
        third.push(
          `${tag}: ${d.thirdParties.length} third party(ies)${over ? ` > ${cfg.maxThirdPartyOrigins}` : ''}${d.thirdParties.map((t) => `; ${t.entity} ${t.sizeKb} KB, ${t.mainThreadMs} ms main thread`).join('')}`,
        );
      }
    }
  }

  const item = (id, status, title, evidence, fix) =>
    makeItem({
      id,
      area: 'performance',
      status,
      title,
      evidence: cap(evidence, 40),
      fix,
    });
  const out = [
    item(
      'lh-scores',
      scoreStatus,
      scoreStatus === 'fail'
        ? 'A Lighthouse score is below its QA threshold'
        : 'Lighthouse scores meet the QA thresholds',
      scores,
      'Fix the audits listed in the QA report (qa/.../report.md); do not lower the thresholds.',
    ),
    item(
      'lh-vitals',
      detailMissing && !vitals.length ? 'not-run' : vitalStatus,
      vitalStatus === 'warn'
        ? 'LCP, CLS or TBT is above the report threshold'
        : 'LCP, CLS and TBT are within the report thresholds',
      vitals,
      'Make the LCP element render sooner (smaller or earlier image, less blocking CSS or JS); reserve space for late content to keep CLS at zero; defer heavy scripts.',
    ),
    item(
      'lh-loading',
      detailMissing && !loading.length ? 'not-run' : loadingStatus,
      loadingStatus === 'warn'
        ? 'Page weight or render-blocking time is above the report threshold'
        : 'Page weight and render-blocking time are within the report thresholds',
      loading,
      'Trim unused JavaScript and images; inline or defer render-blocking CSS and scripts.',
    ),
    item(
      'lh-assets',
      detailMissing && !assets.length ? 'not-run' : assetStatus,
      assetStatus === 'warn'
        ? 'Lighthouse found image or font savings'
        : 'No notable image or font findings',
      assets,
      'Serve images in modern formats at the displayed size; give @font-face a font-display value and preload the main font.',
    ),
    item(
      'lh-third-party',
      detailMissing && !third.length ? 'not-run' : thirdStatus,
      thirdStatus === 'warn'
        ? 'More third-party code than the report threshold'
        : 'Third-party code is within the report threshold',
      third,
      'Self-host or remove third-party scripts and embeds.',
    ),
  ];
  return { items: out, pages };
}

// --- dist measures -----------------------------------------------------------------------------------------

const sizeOf = (model, rel) => {
  const file = model.files.find((f) => f.rel === rel);
  if (!file) return 0;
  if (!TEXT_EXT.test(rel)) return file.size;
  return gzipSync(readFileSync(file.abs)).length;
};

/**
 * Weight of each page: the HTML plus the same-origin CSS, scripts, images and fonts it references
 * (and the fonts and images those stylesheets reference), once each. Text is counted gzipped, binaries raw.
 */
export function pageWeights(model) {
  return model.pages.map((page) => {
    const rels = new Set([page.file]);
    const addPath = (url, from) => {
      const target = classifyUrl(model, url, from);
      if (target.type !== 'internal') return;
      const rel = resolveLocal(model, target.path);
      if (rel && rel !== '_redirects' && !rel.endsWith('.html')) rels.add(rel);
    };
    // A srcset loads one candidate: count the largest of each element, and skip its src fallback.
    const withSrcset = new Set(
      page.refs.filter((r) => r.attr === 'srcset').map((r) => r.tagIndex),
    );
    const largestOf = new Map();
    for (const tag of page.scan.tags) {
      if (!tag.attrs.srcset && !tag.attrs.imagesrcset) continue;
      const best = srcsetCandidates(
        tag.attrs.srcset ?? tag.attrs.imagesrcset,
      ).sort((a, b) => b.weight - a.weight)[0];
      if (best) largestOf.set(tag.index, best.url);
    }
    for (const ref of page.refs) {
      if (!['style', 'script', 'asset', 'media'].includes(ref.kind)) continue;
      if (ref.attr === 'srcset') {
        if (largestOf.get(ref.tagIndex) === ref.url)
          addPath(ref.url, page.path);
      } else if (!(ref.attr === 'src' && withSrcset.has(ref.tagIndex))) {
        addPath(ref.url, page.path);
      }
    }
    for (const style of page.scan.styles)
      for (const url of cssUrls(style.text)) addPath(url, page.path);
    for (const rel of [...rels]) {
      if (!rel.endsWith('.css')) continue;
      const css = model.stylesheets.find((s) => s.rel === rel);
      for (const url of css?.urls ?? []) addPath(url, `/${rel}`);
    }
    let bytes = 0;
    const largest = [];
    for (const rel of rels) {
      const size = sizeOf(model, rel);
      bytes += size;
      largest.push({ rel, bytes: size });
    }
    largest.sort((a, b) => b.bytes - a.bytes);
    return {
      path: page.path,
      files: rels.size,
      kb: kb(bytes),
      largest: largest.slice(0, 3).map((f) => `${f.rel} ${kb(f.bytes)} KB`),
    };
  });
}

export function distPerfItems(model, cfg) {
  const weights = pageWeights(model);
  const heavy = weights.filter((w) => w.kb > cfg.maxPageKb);
  const rasters = model.files.filter((f) => RASTER.test(f.rel));
  const big = rasters.filter((f) => kb(f.size) > cfg.maxImageKb);
  const legacy = rasters.filter(
    (f) => LEGACY.test(f.rel) && kb(f.size) > cfg.legacyImageKb,
  );
  const fonts = model.files.filter((f) => FONT.test(f.rel));
  // Fontsource-style subsets (latin, latin-ext, cyrillic, ...) are split by unicode-range and the browser
  // downloads only the ones a page uses, so count one font per family, weight and style.
  const fontFaces = new Set(fonts.map((f) => fontFaceKey(f.rel)));
  const largest = [...rasters].sort((a, b) => b.size - a.size).slice(0, 5);
  return [
    makeItem({
      id: 'page-weight',
      area: 'performance',
      status: heavy.length ? 'warn' : 'pass',
      title: heavy.length
        ? `${heavy.length} page(s) weigh more than ${cfg.maxPageKb} KB`
        : `Every page weighs at most ${cfg.maxPageKb} KB`,
      evidence: weights.map(
        (w) =>
          `${w.path}: ${w.kb} KB in ${w.files} file(s); largest ${w.largest.join(', ')}`,
      ),
      fix: 'Remove unused assets, compress images and split heavy scripts so they load on demand.',
    }),
    makeItem({
      id: 'image-size',
      area: 'performance',
      status: big.length ? 'warn' : 'pass',
      title: big.length
        ? `${big.length} image(s) are larger than ${cfg.maxImageKb} KB`
        : `No image is larger than ${cfg.maxImageKb} KB`,
      evidence: cap(
        (big.length ? big : largest).map(
          (f) => `dist/${f.rel} ${kb(f.size)} KB`,
        ),
      ),
      fix: 'Resize the image to the size it is shown at and export it as WebP or AVIF at quality 75-80.',
    }),
    makeItem({
      id: 'image-format',
      area: 'performance',
      status: legacy.length ? 'warn' : 'pass',
      title: legacy.length
        ? `${legacy.length} JPEG or PNG image(s) over ${cfg.legacyImageKb} KB`
        : `No JPEG or PNG over ${cfg.legacyImageKb} KB`,
      evidence: cap(legacy.map((f) => `dist/${f.rel} ${kb(f.size)} KB`)),
      fix: 'Convert to WebP or AVIF (Astro <Image> does it at build time).',
    }),
    makeItem({
      id: 'font-files',
      area: 'performance',
      status: fontFaces.size > cfg.maxFontFiles ? 'warn' : 'pass',
      title: `${fontFaces.size} font face(s) in ${fonts.length} file(s), ${kb(fonts.reduce((n, f) => n + f.size, 0))} KB in total${fontFaces.size > cfg.maxFontFiles ? ` (limit ${cfg.maxFontFiles})` : ''}`,
      evidence: cap(fonts.map((f) => `dist/${f.rel} ${kb(f.size)} KB`)),
      fix: 'Ship only the weights and subsets the design uses; prefer one variable font per family.',
    }),
  ];
}
