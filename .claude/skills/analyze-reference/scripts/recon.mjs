#!/usr/bin/env node
// Reconnaissance for analyze-reference. Loads ONE public URL in headless Chromium and writes an
// abstract, content-free description to .cache/analyze/<slug>/recon.json plus working screenshots
// to .cache/analyze/<slug>/screens/{375,768,1440}-<n>.png. Everything under .cache/ is git-ignored
// and must be removed with `--cleanup <slug>` when the analysis ends.
//
// What is stored: structure, sizes, counts, word counts, classified (never named) fonts, colors as
// lightness/chroma/temperature roles (never hex), detected libraries with evidence, motion observations.
// What is NOT stored: page text (only the <title>), image/media URLs, class names beyond a fixed
// library-signature list, font family names, color codes, source code.
//
// Approach adapted from the reconnaissance phases of JCodesMore/ai-website-cloner-template (MIT);
// no asset download or rebuild logic is included.
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromiumProxyOption, reexecWithEnvProxy } from './proxy.mjs';

export const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];
export const PHASES = [
  'launch',
  'load',
  'static',
  'libraries',
  'screens',
  'motion',
  'write',
];
const MAX_SCREENS = 12;
const MAX_FRAMES = 40;
const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, '../../../..');
export const defaultOutRoot = () => join(REPO_ROOT, '.cache', 'analyze');

export class AccessError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // 'unreachable' | 'login' | 'blocked'
  }
}

// ---------------------------------------------------------------------------------------------
// Pure helpers (unit-tested without a browser)
// ---------------------------------------------------------------------------------------------

export function slugFromUrl(url) {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-');
  return host.replace(/^-+|-+$/g, '').toLowerCase() || 'site';
}

export function assertSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error(
      `Invalid slug "${slug}": use lowercase letters, digits and dashes.`,
    );
  return slug;
}

/** Delete .cache/analyze/<slug>/ (idempotent). Refuses anything that is not a direct child of outRoot. */
export function cleanup(slug, outRoot = defaultOutRoot()) {
  assertSlug(slug);
  const root = resolve(outRoot);
  const dir = resolve(root, slug);
  if (dirname(dir) !== root || !dir.startsWith(root + sep))
    throw new Error(`Refusing to delete outside ${root}`);
  const existed = existsSync(dir);
  rmSync(dir, { recursive: true, force: true });
  return existed;
}

/** Classify a CSS font-family stack by generic keywords. The family names themselves are discarded. */
export function classifyFont(stack) {
  const tokens = String(stack)
    .toLowerCase()
    .split(',')
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  const has = (t) => tokens.includes(t);
  const systemStack = [
    'system-ui',
    '-apple-system',
    'blinkmacsystemfont',
    'ui-sans-serif',
    'ui-serif',
    'ui-monospace',
  ].some(has);
  let cls = 'unknown';
  if (
    has('monospace') ||
    has('ui-monospace') ||
    tokens.some((t) => /mono|courier|consolas|menlo/.test(t))
  )
    cls = 'mono';
  else if (has('cursive') || has('fantasy')) cls = 'display';
  else if (
    has('sans-serif') ||
    has('system-ui') ||
    has('ui-sans-serif') ||
    has('-apple-system')
  )
    cls = 'sans';
  else if (has('serif') || has('ui-serif')) cls = 'serif';
  else if (
    tokens.some((t) => /grotesk|grotesque|helvetica|arial|gothic|sans/.test(t))
  )
    cls = 'sans';
  else if (
    tokens.some((t) =>
      /georgia|times|garamond|baskerville|didot|bodoni|caslon|palatino|serif/.test(
        t,
      ),
    )
  )
    cls = 'serif';
  return {
    class: cls,
    systemStack,
    familyCount: tokens.filter(
      (t) =>
        ![
          'serif',
          'sans-serif',
          'monospace',
          'cursive',
          'fantasy',
          'system-ui',
          'ui-sans-serif',
          'ui-serif',
          'ui-monospace',
          '-apple-system',
          'blinkmacsystemfont',
        ].includes(t),
    ).length,
  };
}

const LIGHTNESS = [
  [0.06, 'near-black'],
  [0.15, 'very dark'],
  [0.3, 'dark'],
  [0.5, 'mid-dark'],
  [0.7, 'mid-light'],
  [0.85, 'light'],
  [0.95, 'very light'],
  [1.01, 'near-white'],
];

export function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const chroma = max - min;
  let h = 0;
  if (chroma) {
    if (max === rn) h = ((gn - bn) / chroma) % 6;
    else if (max === gn) h = (bn - rn) / chroma + 2;
    else h = (rn - gn) / chroma + 4;
    h = (h * 60 + 360) % 360;
  }
  const s = chroma === 0 ? 0 : chroma / (1 - Math.abs(2 * l - 1));
  return { h, s, l, chroma };
}

/** Describe a color by roles only: lightness bucket, chroma bucket, temperature and hue family. Never a code. */
export function describeColor(r, g, b) {
  const { h, s, l, chroma } = rgbToHsl(r, g, b);
  const lightness = LIGHTNESS.find(([max]) => l <= max)[1];
  let chromaLabel;
  if (chroma < 0.06) chromaLabel = 'neutral';
  else if (chroma < 0.12) chromaLabel = 'tinted';
  else if (s < 0.3) chromaLabel = 'muted';
  else if (s < 0.65) chromaLabel = 'saturated';
  else chromaLabel = 'vivid';
  let hue = null;
  let temperature = null;
  if (chromaLabel !== 'neutral') {
    hue =
      h < 15 || h >= 345
        ? 'red'
        : h < 45
          ? 'orange'
          : h < 70
            ? 'yellow'
            : h < 160
              ? 'green'
              : h < 195
                ? 'teal'
                : h < 255
                  ? 'blue'
                  : h < 290
                    ? 'violet'
                    : 'magenta';
    temperature =
      h < 70 || h >= 330 ? 'warm' : h >= 160 && h < 270 ? 'cool' : 'mid';
  }
  const label =
    chromaLabel === 'neutral'
      ? `${lightness} neutral`
      : `${lightness} ${temperature} ${chromaLabel}`;
  return {
    label,
    lightness,
    chroma: chromaLabel,
    temperature,
    hue,
    l,
    isNeutral: chromaLabel === 'neutral',
  };
}

export function parseCssColor(value) {
  const m =
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)/i.exec(
      String(value),
    );
  if (!m) return null;
  let a =
    m[4] === undefined
      ? 1
      : m[4].endsWith('%')
        ? parseFloat(m[4]) / 100
        : parseFloat(m[4]);
  if (Number.isNaN(a)) a = 1;
  return { r: +m[1], g: +m[2], b: +m[3], a };
}

function relLuminance({ r, g, b }) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrastRatio(a, b) {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const addTo = (map, key, w = 1) => map.set(key, (map.get(key) ?? 0) + w);
const topN = (map, n, keyFn = (k) => k) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ value: keyFn(k), weight: Math.round(v * 100) / 100 }));
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const share = (map, n) => {
  const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({
      value: k,
      share: Math.round((v / total) * 100) / 100,
    }));
};

/**
 * Aggregate raw per-element style records (collected in the page) into abstract statistics.
 * Record: { tag, heading, chars, font, size, weight, lh (px or null), ls (px), upper, color, bg, bgGradient,
 *           border, display, cols, gap, pad:[t,r,b,l], mar:[t,r,b,l], width, area, sectionIndex, depth }
 */
export function aggregateStyles(records, ctx) {
  const { viewportWidth, pageBackground, bodySize } = ctx;
  const sizeHist = new Map();
  const weightHist = new Map();
  const fontClassChars = new Map();
  const headingClass = new Map();
  const bodyClass = new Map();
  const lhBody = new Map();
  const lhHeading = new Map();
  const familyKeys = new Set();
  let systemStack = false;
  let upperChars = 0;
  let totalChars = 0;
  let negativeTracking = 0;
  let headingCount = 0;
  const display = {
    grid: 0,
    flex: 0,
    block: 0,
    other: 0,
    flexColumn: 0,
    flexWrap: 0,
  };
  const gridCols = new Map();
  const spacing = new Map();
  const gaps = new Map();
  const widths = new Map();
  let fullBleed = 0;
  let measuredBlocks = 0;
  let maxWidth = 0;
  const bgArea = new Map();
  const textChars = new Map();
  const accent = new Map();
  let gradients = 0;
  const sectionPad = new Map();

  for (const r of records) {
    if (r.chars > 0) {
      const f = classifyFont(r.font);
      familyKeys.add(String(r.font).split(',')[0].trim().toLowerCase());
      systemStack ||= f.systemStack;
      addTo(sizeHist, Math.round(r.size), r.chars);
      addTo(weightHist, String(r.weight), r.chars);
      addTo(fontClassChars, f.class, r.chars);
      const isHeading = r.heading || r.size >= bodySize * 1.8;
      addTo(isHeading ? headingClass : bodyClass, f.class, r.chars);
      if (r.lh)
        addTo(
          isHeading ? lhHeading : lhBody,
          (Math.round((r.lh / r.size) * 20) / 20).toFixed(2),
          r.chars,
        );
      totalChars += r.chars;
      if (r.upper) upperChars += r.chars;
      if (r.heading) {
        headingCount++;
        if (r.ls < -0.005 * r.size) negativeTracking++;
      }
      const c = parseCssColor(r.color);
      if (c && c.a > 0.05)
        addTo(textChars, describeColor(c.r, c.g, c.b).label, r.chars);
    }
    if (r.display === 'grid' || r.display === 'inline-grid') {
      display.grid++;
      addTo(gridCols, r.cols, 1);
    } else if (r.display === 'flex' || r.display === 'inline-flex') {
      display.flex++;
      if (r.flexDirection?.startsWith('column')) display.flexColumn++;
      if (r.flexWrap && r.flexWrap !== 'nowrap') display.flexWrap++;
    } else if (r.display === 'block') display.block++;
    else display.other++;
    if (r.gap > 0) addTo(gaps, Math.round(r.gap), 1);
    for (const v of [...r.pad, ...r.mar, r.gap ?? 0])
      if (v > 0 && v <= 400 && Number.isFinite(v))
        addTo(spacing, Math.round(v), 1);
    if (
      r.depth !== undefined &&
      r.depth <= 4 &&
      r.width > 0 &&
      r.sectionIndex >= 0
    ) {
      measuredBlocks++;
      if (r.width >= viewportWidth * 0.98) fullBleed++;
      else if (r.width >= 320) {
        addTo(widths, Math.round(r.width / 10) * 10, 1);
        maxWidth = Math.max(maxWidth, r.width);
      }
    }
    if (r.sectionRoot)
      addTo(sectionPad, `${Math.round(r.pad[0])}/${Math.round(r.pad[2])}`, 1);
    const bg = parseCssColor(r.bg);
    if (bg && bg.a > 0.5)
      addTo(bgArea, describeColor(bg.r, bg.g, bg.b).label, Math.max(r.area, 1));
    if (r.bgGradient) gradients++;
    for (const raw of [r.bg, r.border, r.accentText && r.color]) {
      const c = raw && parseCssColor(raw);
      if (!c || c.a < 0.5) continue;
      const d = describeColor(c.r, c.g, c.b);
      if (!d.isNeutral && d.chroma !== 'tinted') addTo(accent, d.label, 1);
    }
  }

  // Estimated type scale ratio from distinct sizes (>= 12px) weighted by use.
  const sizes = [...sizeHist.keys()]
    .filter((s) => s >= 12)
    .sort((a, b) => a - b);
  const ratios = sizes
    .slice(1)
    .map((s, i) => s / sizes[i])
    .filter((x) => x > 1.05 && x < 2.2);
  const scaleRatio = ratios.length
    ? Math.round(
        Math.exp(ratios.reduce((a, x) => a + Math.log(x), 0) / ratios.length) *
          100,
      ) / 100
    : null;
  const spacingValues = [...spacing.keys()];
  const divisible = (n) =>
    spacingValues.length
      ? spacingValues.filter((v) => v % n === 0).length / spacingValues.length
      : 0;
  const baseUnit = [8, 4].find((n) => divisible(n) >= 0.7) ?? null;

  const pageBg = parseCssColor(pageBackground) ?? {
    r: 255,
    g: 255,
    b: 255,
    a: 1,
  };
  const pageBgRole = describeColor(pageBg.r, pageBg.g, pageBg.b);
  const bodyColorRecord = records.find((r) => r.chars > 40 && !r.heading);
  const bodyColor = bodyColorRecord && parseCssColor(bodyColorRecord.color);

  const dominant = (map) =>
    [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    typography: {
      distinctFamilyCount: familyKeys.size,
      usesSystemStack: systemStack,
      classShare: share(fontClassChars, 5),
      headingClass: dominant(headingClass),
      bodyClass: dominant(bodyClass),
      displayRole:
        sizes.length && sizes.at(-1) >= bodySize * 2.2
          ? dominant(headingClass)
          : null,
      sizesPx: topN(sizeHist, 12, Number).sort((a, b) => a.value - b.value),
      minPx: sizes[0] ?? null,
      maxPx: sizes.at(-1) ?? null,
      bodyPx: bodySize,
      scaleRatioEstimate: scaleRatio,
      weights: share(weightHist, 5),
      lineHeightBody: share(lhBody, 4),
      lineHeightHeading: share(lhHeading, 4),
      uppercaseShare: totalChars
        ? Math.round((upperChars / totalChars) * 100) / 100
        : 0,
      tightHeadingTrackingShare: headingCount
        ? Math.round((negativeTracking / headingCount) * 100) / 100
        : 0,
    },
    layout: {
      contentWidth: {
        mostCommonPx: Number(dominant(widths)) || null,
        maxPx: Math.round(maxWidth) || null,
        viewportPx: viewportWidth,
        fullBleedShare: measuredBlocks
          ? Math.round((fullBleed / measuredBlocks) * 100) / 100
          : 0,
      },
      display,
      gridColumnCounts: topN(gridCols, 5),
      gapsPx: topN(gaps, 6, Number),
      sectionVerticalPadding: topN(sectionPad, 5).map((x) => ({
        topBottomPx: x.value,
        weight: x.weight,
      })),
    },
    spacing: {
      baseUnitPx: baseUnit,
      divisibleBy8: Math.round(divisible(8) * 100) / 100,
      divisibleBy4: Math.round(divisible(4) * 100) / 100,
      histogramPx: topN(spacing, 12, Number).sort((a, b) => a.value - b.value),
    },
    colors: {
      theme: pageBgRole.l < 0.4 ? 'dark' : 'light',
      pageBackground: pageBgRole.label,
      backgrounds: share(bgArea, 4),
      textColors: share(textChars, 4),
      accents: share(accent, 4),
      bodyTextContrast: bodyColor
        ? Math.round(contrastRatio(bodyColor, pageBg) * 10) / 10
        : null,
      gradientElements: gradients,
    },
  };
}

const LIB_FILE_SIGNATURES = [
  ['gsap', /gsap|tweenmax|tweenlite/i],
  ['ScrollTrigger', /scrolltrigger/i],
  ['ScrollSmoother', /scrollsmoother/i],
  ['SplitText', /splittext/i],
  ['Lenis', /lenis/i],
  ['Locomotive Scroll', /locomotive/i],
  ['Three.js', /(^|[/_.-])three([._-]|$)|three\.module|threejs/i],
  ['OGL', /(^|[/_.-])ogl([._-]|$)/i],
  ['Babylon.js', /babylon/i],
  ['PixiJS', /pixi/i],
  ['Lottie', /lottie|bodymovin/i],
  ['Swiper', /swiper/i],
  ['Barba.js', /barba/i],
  ['Swup', /swup/i],
  ['Framer Motion', /framer-motion|motion\.dev/i],
  ['anime.js', /anime(\.min)?\.js/i],
  ['Splitting', /splitting/i],
  ['AOS', /(^|[/_.-])aos([._-]|$)/i],
  ['p5.js', /p5(\.min)?\.js/i],
  ['Spline', /spline/i],
  ['Webflow', /webflow/i],
];
const DOMAIN_SIGNATURES = [
  ['Framer', /framerusercontent\.com|framer\.com$/i],
  ['Webflow', /website-files\.com|webflow\.(com|io)$/i],
  ['Shopify', /cdn\.shopify\.com/i],
  ['Spline', /spline\.design/i],
];
const CLASS_LIBS = {
  lenis: ['Lenis', 'html.lenis class'],
  'lenis-smooth': ['Lenis', 'lenis-smooth class'],
  'pin-spacer': ['ScrollTrigger', '.pin-spacer wrapper'],
  'has-scroll-smooth': ['Locomotive Scroll', 'has-scroll-smooth class'],
  'data-scroll': ['Locomotive Scroll', '[data-scroll] attributes'],
  'data-scroll-container': ['Locomotive Scroll', '[data-scroll-container]'],
  swiper: ['Swiper', '.swiper container'],
  splitting: ['Splitting', '.splitting classes'],
  'astro-island': ['Astro', '<astro-island> elements'],
  'data-framer-name': ['Framer', '[data-framer-name] attributes'],
  'w-mod-js': ['Webflow', 'html.w-mod-js class'],
  'data-aos': ['AOS', '[data-aos] attributes'],
  'spline-viewer': ['Spline', '<spline-viewer> element'],
  'gsap-marker': ['ScrollTrigger', 'gsap-marker elements (debug markers)'],
};
const KIND = {
  gsap: 'animation',
  ScrollTrigger: 'scroll',
  ScrollSmoother: 'scroll',
  SplitText: 'animation',
  Flip: 'animation',
  Draggable: 'interaction',
  Lenis: 'smooth-scroll',
  'Locomotive Scroll': 'smooth-scroll',
  'Three.js': '3d',
  OGL: '3d',
  'Babylon.js': '3d',
  PixiJS: '2d-webgl',
  Spline: '3d',
  Lottie: 'animation',
  Swiper: 'carousel',
  'Barba.js': 'page-transition',
  Swup: 'page-transition',
  'Framer Motion': 'animation',
  'anime.js': 'animation',
  Splitting: 'text',
  AOS: 'reveal',
  'p5.js': 'canvas',
  React: 'framework',
  'Next.js': 'framework',
  Nuxt: 'framework',
  Vue: 'framework',
  Astro: 'framework',
  Webflow: 'platform',
  Framer: 'platform',
  Shopify: 'platform',
  jQuery: 'library',
  'Alpine.js': 'framework',
  Svelte: 'framework',
};

/**
 * Merge page globals, DOM classes, script file names and network domains into libraries with evidence.
 * raw: { globals: {name: detail}, classes: {key: count}, scriptFiles: [name], domains: [host], viewTransition, canvases }
 */
export function detectLibraries(raw) {
  const found = new Map();
  const add = (name, evidenceKind, text) => {
    const e = found.get(name) ?? {
      name,
      kind: KIND[name] ?? 'library',
      evidence: [],
      kinds: new Set(),
    };
    if (!e.evidence.includes(text)) e.evidence.push(text);
    e.kinds.add(evidenceKind);
    found.set(name, e);
  };
  for (const [name, detail] of Object.entries(raw.globals ?? {}))
    add(
      name,
      'global',
      detail ? `global ${name} (${detail})` : `global ${name}`,
    );
  for (const [key, count] of Object.entries(raw.classes ?? {})) {
    if (!count || !CLASS_LIBS[key]) continue;
    const [name, text] = CLASS_LIBS[key];
    add(name, 'dom', `${text}${count > 1 ? ` x${count}` : ''}`);
  }
  for (const file of raw.scriptFiles ?? []) {
    for (const [name, re] of LIB_FILE_SIGNATURES)
      if (re.test(file))
        add(name, 'script', `script file name matches ${name}`);
  }
  for (const host of raw.domains ?? []) {
    for (const [name, re] of DOMAIN_SIGNATURES)
      if (re.test(host)) add(name, 'network', `requests to a ${name} domain`);
  }
  if (raw.viewTransition?.calls > 0)
    add(
      'View Transitions',
      'global',
      `document.startViewTransition called ${raw.viewTransition.calls}x`,
    );
  else if (raw.viewTransition?.cssRule)
    add('View Transitions', 'dom', '@view-transition CSS rule');
  if (raw.viewTransition?.named > 0 && !found.has('View Transitions'))
    add(
      'View Transitions',
      'dom',
      `${raw.viewTransition.named} elements with view-transition-name`,
    );
  const ctx = new Set(raw.canvases?.contexts ?? []);
  if (ctx.has('webgl') || ctx.has('webgl2') || ctx.has('experimental-webgl'))
    add(
      'WebGL',
      'global',
      `canvas getContext(${[...ctx].filter((c) => /webgl/.test(c)).join(', ')})`,
    );
  if (ctx.has('webgpu')) add('WebGPU', 'global', 'canvas getContext(webgpu)');
  if (raw.canvases?.count && !ctx.size)
    add(
      'Canvas',
      'dom',
      `${raw.canvases.count} <canvas> element(s), context not observed`,
    );
  else if (ctx.has('2d')) add('Canvas 2D', 'global', 'canvas getContext(2d)');
  return [...found.values()]
    .map(({ kinds, ...e }) => {
      let confidence = 'low';
      if (
        kinds.has('global') ||
        (kinds.has('dom') && kinds.has('script')) ||
        kinds.size >= 3
      )
        confidence = 'high';
      else if (kinds.has('dom') || kinds.has('script')) confidence = 'medium';
      return { ...e, confidence };
    })
    .sort(
      (a, b) =>
        ({ high: 0, medium: 1, low: 2 })[a.confidence] -
          { high: 0, medium: 1, low: 2 }[b.confidence] ||
        a.name.localeCompare(b.name),
    );
}

/** Parse a computed `transform` value into translate/scale/rotate summary. */
export function parseTransform(value) {
  if (!value || value === 'none')
    return { ty: 0, tx: 0, scale: 1, rotate: 0, identity: true };
  const m2 = /^matrix\(([^)]+)\)$/.exec(value);
  const m3 = /^matrix3d\(([^)]+)\)$/.exec(value);
  let a, b, tx, ty;
  if (m2) [a, b, , , tx, ty] = m2[1].split(',').map(Number);
  else if (m3) {
    const v = m3[1].split(',').map(Number);
    [a, b, tx, ty] = [v[0], v[1], v[12], v[13]];
  } else return { ty: 0, tx: 0, scale: 1, rotate: 0, identity: true };
  const scale = Math.hypot(a, b);
  const rotate = (Math.atan2(b, a) * 180) / Math.PI;
  return {
    tx,
    ty,
    scale,
    rotate,
    identity:
      Math.abs(tx) < 0.5 &&
      Math.abs(ty) < 0.5 &&
      Math.abs(scale - 1) < 0.005 &&
      Math.abs(rotate) < 0.5,
  };
}

/**
 * Interpret scroll-sampled frames into motion observations.
 * frames: [{ scrollY, settled: boolean, items: [[id, top, h, opacity, transform, position]] }] ordered in time.
 * meta: { viewportHeight, elements: [{ id, section, role, pinSpacer }] }
 */
export function analyzeMotion(frames, meta) {
  const vh = meta.viewportHeight;
  const byId = new Map(meta.elements.map((e) => [e.id, e]));
  const series = new Map(); // id -> [{scrollY, top, h, opacity, tf, position}]
  for (const f of frames.filter((x) => x.settled)) {
    for (const [id, top, h, opacity, tf, position] of f.items) {
      if (!series.has(id)) series.set(id, []);
      series
        .get(id)
        .push({ scrollY: f.scrollY, top, h, opacity, tf, position });
    }
  }
  const immediate = frames.filter((x) => !x.settled);
  const observations = [];
  const sticky = [];
  const claimed = new Set();
  const bySection = (list) =>
    [...new Set(list.map((id) => byId.get(id)?.section))]
      .filter((s) => s !== undefined && s >= 0)
      .sort((a, b) => a - b);

  // pin / sticky: element holds its viewport position while the page scrolls
  const pinned = [];
  for (const [id, s] of series) {
    const el = byId.get(id);
    if (!el) continue;
    let holds = 0;
    let maxRun = 0;
    let run = 0;
    const heldIdx = [];
    for (let i = 1; i < s.length; i++) {
      const dScroll = s[i].scrollY - s[i - 1].scrollY;
      if (Math.abs(dScroll) < 200) continue;
      if (Math.abs(s[i].top - s[i - 1].top) < 3) {
        holds++;
        heldIdx.push(i);
        run++;
        maxRun = Math.max(maxRun, run);
      } else run = 0;
    }
    const fixedChrome =
      (el.role === 'banner' || el.role === 'navigation') &&
      holds >= s.length - 2;
    if (fixedChrome) {
      sticky.push(id);
      claimed.add(id);
    } else if (maxRun >= 1 && s[0].h >= vh * 0.3) {
      pinned.push({
        id,
        holds,
        heldIdx,
        positions: [...new Set(s.map((x) => x.position))],
      });
      claimed.add(id);
    }
  }
  const pinGroups = new Map();
  for (const p of pinned) {
    const el = byId.get(p.id);
    const g = pinGroups.get(el.section) ?? {
      section: el.section,
      elements: 0,
      held: 0,
      pinSpacer: false,
      positions: new Set(),
    };
    g.elements++;
    g.held = Math.max(g.held, p.holds);
    g.pinSpacer ||= el.pinSpacer;
    for (const pos of p.positions) g.positions.add(pos);
    pinGroups.set(el.section, g);
  }
  for (const g of pinGroups.values()) {
    observations.push({
      kind: 'pin',
      trigger: 'scroll',
      section: g.section,
      elements: g.elements,
      heldScrollSteps: g.held,
      mechanism: g.pinSpacer
        ? 'wrapper with pin-spacer (ScrollTrigger-style pin)'
        : g.positions.has('sticky')
          ? 'position: sticky'
          : g.positions.has('fixed')
            ? 'position: fixed during pin'
            : 'unknown (inline transform or sticky ancestor)',
    });
  }
  // scrub inside a pinned section: descendants whose transform/opacity vary with scroll
  const pinnedSections = new Set(pinned.map((p) => byId.get(p.id).section));
  // Scroll steps during which a pin carries its section's content (those steps say nothing about parallax).
  const carried = new Map();
  for (const p of pinned) {
    const sec = byId.get(p.id).section;
    carried.set(sec, new Set([...(carried.get(sec) ?? []), ...p.heldIdx]));
  }
  const scrubIds = [];
  const parallaxIds = [];
  const speeds = [];
  for (const [id, s] of series) {
    if (claimed.has(id)) continue;
    const el = byId.get(id);
    if (!el || s.length < 3) continue;
    // Speed ratio per step while the element is on screen: 1 = moves with the page.
    const ratios = [];
    for (let i = 1; i < s.length; i++) {
      const d = s[i].scrollY - s[i - 1].scrollY;
      if (Math.abs(d) < 120) continue;
      if (carried.get(el.section)?.has(i)) continue;
      const visible = (x) => x.top < vh && x.top + x.h > 0;
      if (!visible(s[i]) && !visible(s[i - 1])) continue;
      ratios.push(-(s[i].top - s[i - 1].top) / d);
    }
    const deviating = ratios.filter((r) => Math.abs(r - 1) > 0.04);
    const sorted = [...ratios].sort((a, b) => a - b);
    const mean = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 1;
    const distinct = new Set(
      s.map(
        (x) =>
          `${Math.round(x.opacity * 20)}|${
            x.tf === 'none'
              ? 'none'
              : x.tf
                  .split(',')
                  .map((n) =>
                    Math.round(parseFloat(n.replace(/[^\d.-]/g, '')) || 0),
                  )
                  .join(',')
          }`,
      ),
    );
    if (
      ratios.length >= 2 &&
      deviating.length >= Math.ceil(ratios.length * 0.6) &&
      mean > -2 &&
      mean < 3 &&
      Math.abs(mean - 1) > 0.04
    ) {
      parallaxIds.push(id);
      speeds.push(Math.round(mean * 100) / 100);
    } else if (
      distinct.size >= 4 &&
      (pinnedSections.has(el.section) || ratios.length >= 3)
    ) {
      // Reveals settle to few values; many distinct settled values mean the style follows scroll.
      scrubIds.push(id);
    }
  }
  if (parallaxIds.length)
    observations.push({
      kind: 'parallax',
      trigger: 'scroll',
      sections: bySection(parallaxIds),
      elements: parallaxIds.length,
      speedRatioRange: [Math.min(...speeds), Math.max(...speeds)],
      note: 'speed ratio = element movement / scroll distance (1 = normal flow)',
    });
  if (scrubIds.length)
    observations.push({
      kind: 'scrub',
      trigger: 'scroll',
      sections: bySection(scrubIds),
      elements: scrubIds.length,
      withinPinnedSection: scrubIds.some((id) =>
        pinnedSections.has(byId.get(id).section),
      ),
    });
  // reveal on scroll: first measured state (immediately after arriving in view) differs from settled state
  const revealIds = [];
  const lifts = [];
  const fromOpacity = [];
  const imm = new Map();
  for (const f of immediate)
    for (const it of f.items) if (!imm.has(it[0])) imm.set(it[0], []);
  for (const f of immediate)
    for (const it of f.items)
      imm.get(it[0]).push({
        scrollY: f.scrollY,
        top: it[1],
        h: it[2],
        opacity: it[3],
        tf: it[4],
      });
  for (const [id, early] of imm) {
    if (claimed.has(id) || scrubIds.includes(id) || parallaxIds.includes(id))
      continue;
    const late = series.get(id);
    if (!late) continue;
    for (const e of early) {
      const l = late.find((x) => x.scrollY === e.scrollY);
      if (!l || e.scrollY === 0) continue;
      const te = parseTransform(e.tf);
      const tl = parseTransform(l.tf);
      if (
        l.opacity - e.opacity > 0.15 ||
        (!te.identity && tl.identity && Math.abs(te.ty - tl.ty) > 4)
      ) {
        revealIds.push(id);
        fromOpacity.push(Math.round(e.opacity * 10) / 10);
        if (!te.identity) lifts.push(Math.round(te.ty - tl.ty));
        break;
      }
    }
  }
  if (revealIds.length)
    observations.push({
      kind: 'reveal',
      trigger: 'scroll',
      sections: bySection(revealIds),
      elements: revealIds.length,
      fromOpacityMedian: median(fromOpacity),
      translateYPxMedian: median(lifts),
    });
  if (sticky.length)
    observations.push({
      kind: 'sticky-chrome',
      trigger: 'scroll',
      elements: sticky.length,
      note: 'header/navigation stays fixed in the viewport',
    });
  return observations;
}

// ---------------------------------------------------------------------------------------------
// Page-side code. These functions are serialized into the page: keep them self-contained.
// ---------------------------------------------------------------------------------------------

/** Injected before any page script: observes (never changes) canvas contexts, view transitions, observers, rAF. */
export function initHooks() {
  const r = (window.__recon = { ctx: [], vt: 0, io: 0, raf: 0 });
  try {
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      r.ctx.push(String(type));
      return gc.call(this, type, ...rest);
    };
    if (document.startViewTransition) {
      const svt = document.startViewTransition;
      document.startViewTransition = function (...a) {
        r.vt++;
        return svt.apply(this, a);
      };
    }
    const IO = window.IntersectionObserver;
    if (IO)
      window.IntersectionObserver = class extends IO {
        constructor(...a) {
          super(...a);
          r.io++;
        }
      };
    // State at DOMContentLoaded (before page handlers run), to detect load-time reveals later.
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        const early = new Map();
        for (const el of [...document.body.querySelectorAll('*')].slice(
          0,
          1500,
        )) {
          const cs = getComputedStyle(el);
          early.set(el, [parseFloat(cs.opacity), cs.transform]);
        }
        window.__reconEarly = early;
      },
      true,
    );
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) {
      r.raf++;
      return raf.call(window, cb);
    };
  } catch {
    // hooks are best effort
  }
}

/**
 * Pick the element that scrolls the page. Evaluated in the page (no closure over module scope).
 * The document wins unless it is about one viewport tall; then the visible overflow-y:auto|scroll|overlay
 * element covering at least 60% of the viewport with the largest scroll range is used. The element is kept
 * in window.__reconScroller so scrollToY/getScrollY/snapshot act on the same scroller.
 */
export function detectScroller() {
  const vh = innerHeight;
  const doc = document.documentElement;
  let best = null;
  if (doc.scrollHeight > vh * 1.1) {
    window.__reconScroller = null;
  } else {
    let range = 0;
    for (const el of document.querySelectorAll('body, body *')) {
      const cs = getComputedStyle(el);
      if (!/^(auto|scroll|overlay)$/.test(cs.overflowY)) continue;
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const visW = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
      const visH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visW * visH < innerWidth * vh * 0.6) continue;
      const diff = el.scrollHeight - el.clientHeight;
      if (diff > Math.max(vh * 0.1, 40) && diff > range) {
        range = diff;
        best = el;
      }
    }
    window.__reconScroller = best;
  }
  const el = window.__reconScroller;
  return el
    ? {
        kind: 'container',
        scrollHeightPx: el.scrollHeight,
        clientHeightPx: el.clientHeight,
      }
    : {
        kind: 'document',
        scrollHeightPx: doc.scrollHeight,
        clientHeightPx: vh,
      };
}

/** Scroll the chosen scroller (container or window) to y, without animation. */
export function scrollToY(y) {
  const el = window.__reconScroller;
  if (el) el.scrollTop = y;
  else window.scrollTo({ top: y, behavior: 'instant' });
}

export function getScrollY() {
  const el = window.__reconScroller;
  return Math.round(el ? el.scrollTop : scrollY);
}

/** Viewport center of the scroller, where wheel events should be dispatched. */
export function scrollerCenter() {
  const el = window.__reconScroller;
  const r = el
    ? el.getBoundingClientRect()
    : { left: 0, top: 0, width: innerWidth, height: innerHeight };
  const x = Math.max(0, r.left) + Math.min(r.width, innerWidth) / 2;
  const y = Math.max(0, r.top) + Math.min(r.height, innerHeight) / 2;
  return { x: Math.round(x), y: Math.round(y) };
}

export function collectStructure() {
  const vh = innerHeight;
  const sc = window.__reconScroller ?? null;
  const docH = sc ? sc.scrollHeight : document.documentElement.scrollHeight;
  const scrollNow = sc ? sc.scrollTop : scrollY;
  const SKIP = new Set([
    'SCRIPT',
    'STYLE',
    'LINK',
    'META',
    'NOSCRIPT',
    'TEMPLATE',
    'BR',
  ]);
  const abs = (el) => {
    const r = el.getBoundingClientRect();
    return {
      top: r.top + scrollNow,
      height: r.height,
      width: r.width,
      left: r.left,
    };
  };
  const shown = (el) => {
    if (SKIP.has(el.tagName)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const kids = (e) => [...e.children].filter(shown);
  const root = document.querySelector('main') || document.body;
  let level = kids(root);
  for (let i = 0; i < 4; i++) {
    const big = level.filter((c) => abs(c).height > vh * 0.3);
    const wrapper =
      level.length === 1
        ? level[0]
        : big.length === 1 &&
            level.length <= 3 &&
            abs(big[0]).height > docH * 0.6
          ? big[0]
          : null;
    if (!wrapper) break;
    const next = kids(wrapper);
    if (next.length < 2) break;
    level = next;
  }
  const extras = [...document.querySelectorAll('header, nav, footer')]
    .filter(shown)
    .filter(
      (e) =>
        !level.some((l) => l.contains(e) || e.contains(l)) &&
        !e.closest('main'),
    );
  const sections = [...new Set([...extras, ...level])].sort(
    (a, b) =>
      abs(a).top - abs(b).top || (a.compareDocumentPosition(b) & 4 ? -1 : 1),
  );
  window.__reconSections = sections;
  const implicitRole = {
    HEADER: 'banner',
    NAV: 'navigation',
    FOOTER: 'contentinfo',
    MAIN: 'main',
    ASIDE: 'complementary',
    SECTION: 'region',
    ARTICLE: 'article',
    FORM: 'form',
  };
  const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);
  const infos = sections.map((el, index) => {
    const a = abs(el);
    const cs = getComputedStyle(el);
    const h =
      el.querySelector('h1, h2, h3, h4') ||
      (/^H[1-6]$/.test(el.tagName) ? el : null);
    const ht = h ? h.textContent.trim() : '';
    return {
      index,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || implicitRole[el.tagName] || null,
      top: Math.round(a.top),
      height: Math.round(a.height),
      topVh: Math.round((a.top / vh) * 100) / 100,
      heightVh: Math.round((a.height / vh) * 100) / 100,
      firstHeading: h
        ? { level: Number(h.tagName[1]), chars: ht.length, words: words(ht) }
        : null,
      headings: el.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
      words: words(el.innerText || ''),
      paragraphs: el.querySelectorAll('p').length,
      images: el.querySelectorAll('img, picture, svg').length,
      videos: el.querySelectorAll('video, iframe').length,
      canvases: el.querySelectorAll('canvas').length,
      links: el.querySelectorAll('a[href]').length,
      buttons: el.querySelectorAll('button, [role=button]').length,
      display: cs.display,
      position: cs.position,
      hasBackgroundImage: cs.backgroundImage !== 'none',
      sticky: cs.position === 'sticky' || cs.position === 'fixed',
    };
  });
  // Raw style records for aggregation.
  const px = (v) => (v === 'normal' || v === 'auto' ? NaN : parseFloat(v)) || 0;
  const bodyCs = getComputedStyle(document.body);
  const records = [];
  const all = [...document.body.querySelectorAll('*')]
    .filter((e) => !SKIP.has(e.tagName))
    .slice(0, 5000);
  const sectionOf = (el) =>
    sections.findIndex((s) => s === el || s.contains(el));
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    let chars = 0;
    for (const n of el.childNodes)
      if (n.nodeType === 3) chars += n.textContent.trim().length;
    const si = sectionOf(el);
    let depth = 0;
    if (si >= 0)
      for (let p = el; p && p !== sections[si]; p = p.parentElement) depth++;
    const tracks =
      cs.gridTemplateColumns && cs.gridTemplateColumns !== 'none'
        ? cs.gridTemplateColumns.trim().split(/\s+/).length
        : 0;
    records.push({
      tag: el.tagName.toLowerCase(),
      heading: /^H[1-6]$/.test(el.tagName),
      chars,
      font: cs.fontFamily,
      size: px(cs.fontSize),
      weight: cs.fontWeight,
      lh: cs.lineHeight === 'normal' ? null : px(cs.lineHeight),
      ls: px(cs.letterSpacing),
      upper: cs.textTransform === 'uppercase',
      color: cs.color,
      bg: cs.backgroundColor,
      bgGradient: cs.backgroundImage.includes('gradient'),
      border: px(cs.borderTopWidth) > 0 ? cs.borderTopColor : null,
      accentText: el.tagName === 'A' || el.tagName === 'BUTTON',
      display: cs.display,
      flexDirection: cs.flexDirection,
      flexWrap: cs.flexWrap,
      cols: tracks,
      gap: Math.max(px(cs.rowGap), px(cs.columnGap)),
      pad: [
        px(cs.paddingTop),
        px(cs.paddingRight),
        px(cs.paddingBottom),
        px(cs.paddingLeft),
      ],
      mar: [
        px(cs.marginTop),
        px(cs.marginRight),
        px(cs.marginBottom),
        px(cs.marginLeft),
      ],
      width: r.width,
      area: Math.min(r.width, innerWidth) * Math.min(r.height, vh * 3),
      sectionIndex: si,
      sectionRoot: si >= 0 && sections[si] === el,
      depth,
    });
  }
  const rootBg = getComputedStyle(document.documentElement).backgroundColor;
  const pageBackground = parseColorAlpha(bodyCs.backgroundColor)
    ? bodyCs.backgroundColor
    : parseColorAlpha(rootBg)
      ? rootBg
      : 'rgb(255, 255, 255)';
  function parseColorAlpha(c) {
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return false;
    const parts = m[1].split(/[,\s/]+/).filter(Boolean);
    return parts.length < 4 || parseFloat(parts[3]) > 0.5;
  }
  const landmarks = {};
  for (const [sel, key] of [
    ['header', 'header'],
    ['nav', 'nav'],
    ['main', 'main'],
    ['footer', 'footer'],
    ['aside', 'aside'],
    ['[role=banner]', 'roleBanner'],
    ['[role=navigation]', 'roleNavigation'],
  ])
    landmarks[key] = document.querySelectorAll(sel).length;
  const h1 = document.querySelector('h1');
  return {
    title: document.title,
    lang: document.documentElement.lang || null,
    docHeight: docH,
    docWidth: document.documentElement.scrollWidth,
    h1Px: h1 ? px(getComputedStyle(h1).fontSize) : null,
    bodyPx: px(bodyCs.fontSize),
    pageBackground,
    landmarks,
    sections: infos,
    records,
    hasPasswordField: [
      ...document.querySelectorAll('input[type=password]'),
    ].some(shown),
    captchaMarkers: !!document.querySelector(
      'iframe[src*="captcha" i], iframe[src*="challenge" i], #challenge-form, .cf-challenge, #cf-wrapper',
    ),
    totalWords: words(document.body.innerText || ''),
  };
}

export function collectLibraries() {
  const g = {};
  const w = window;
  const set = (name, detail) => {
    g[name] = detail ?? '';
  };
  try {
    if (w.gsap) {
      set('gsap', w.gsap.version ? `v${w.gsap.version}` : '');
      const reg =
        typeof w.gsap.core?.globals === 'function'
          ? Object.keys(w.gsap.core.globals())
          : [];
      for (const p of reg)
        if (
          [
            'ScrollTrigger',
            'ScrollSmoother',
            'SplitText',
            'Flip',
            'Draggable',
            'MotionPathPlugin',
            'ScrollToPlugin',
            'DrawSVGPlugin',
            'MorphSVGPlugin',
            'CustomEase',
          ].includes(p)
        )
          set(
            p === 'ScrollTrigger' ||
              p === 'ScrollSmoother' ||
              p === 'SplitText' ||
              p === 'Flip' ||
              p === 'Draggable'
              ? p
              : `gsap plugin ${p}`,
            'registered with gsap',
          );
    }
    if (w.ScrollTrigger)
      set(
        'ScrollTrigger',
        w.ScrollTrigger.version ? `v${w.ScrollTrigger.version}` : '',
      );
    for (const [name, key] of [
      ['Lenis', 'Lenis'],
      ['Locomotive Scroll', 'LocomotiveScroll'],
      ['Three.js', 'THREE'],
      ['PixiJS', 'PIXI'],
      ['Babylon.js', 'BABYLON'],
      ['p5.js', 'p5'],
      ['Lottie', 'lottie'],
      ['Swiper', 'Swiper'],
      ['Barba.js', 'barba'],
      ['anime.js', 'anime'],
      ['AOS', 'AOS'],
      ['jQuery', 'jQuery'],
      ['Alpine.js', 'Alpine'],
      ['Webflow', 'Webflow'],
      ['React', 'React'],
      ['Vue', 'Vue'],
    ])
      if (w[key])
        set(
          name,
          name === 'Three.js' && w.THREE.REVISION ? `r${w.THREE.REVISION}` : '',
        );
    if (w.lenis && !g.Lenis) set('Lenis', 'instance on window');
    if (w.bodymovin) set('Lottie', 'bodymovin');
    if (w.__NEXT_DATA__ || w.next) set('Next.js', '');
    if (w.__NUXT__ || w.$nuxt) set('Nuxt', '');
    if (
      document.querySelector(
        '[data-reactroot], #__next, #root[data-reactroot]',
      ) &&
      !g.React
    )
      set('React', 'DOM marker');
    const vueRoot = [
      ...document.querySelectorAll('body > *, #app, #__nuxt'),
    ].find((e) => e.__vue_app__ || e.__vue__);
    if (vueRoot && !g.Vue) set('Vue', 'DOM marker');
    if (
      document.querySelector(
        '[class*="svelte-"], [data-sveltekit-preload-data]',
      )
    )
      set('Svelte', 'DOM marker');
  } catch {
    // ignore broken globals
  }
  const classes = {
    lenis: document.documentElement.classList.contains('lenis') ? 1 : 0,
    'lenis-smooth': document.documentElement.classList.contains('lenis-smooth')
      ? 1
      : 0,
    'pin-spacer': document.querySelectorAll('.pin-spacer').length,
    'has-scroll-smooth': document.documentElement.classList.contains(
      'has-scroll-smooth',
    )
      ? 1
      : 0,
    'data-scroll': document.querySelectorAll('[data-scroll]').length,
    'data-scroll-container': document.querySelectorAll(
      '[data-scroll-container]',
    ).length,
    swiper: document.querySelectorAll('.swiper').length,
    splitting: document.querySelectorAll('.splitting').length,
    'astro-island': document.querySelectorAll('astro-island').length,
    'data-framer-name': document.querySelectorAll('[data-framer-name]').length,
    'w-mod-js': document.documentElement.classList.contains('w-mod-js') ? 1 : 0,
    'data-aos': document.querySelectorAll('[data-aos]').length,
    'spline-viewer': document.querySelectorAll('spline-viewer').length,
    'gsap-marker': document.querySelectorAll('[class*="gsap-marker"]').length,
  };
  const scriptFiles = [...document.scripts]
    .map((s) => s.src)
    .filter(Boolean)
    .map((src) => {
      try {
        const u = new URL(src);
        return u.pathname.split('/').pop() || u.hostname;
      } catch {
        return '';
      }
    });
  const st = { count: 0, pinned: 0, scrubbed: 0 };
  try {
    const all = w.ScrollTrigger?.getAll?.() ?? [];
    st.count = all.length;
    for (const t of all) {
      if (t.pin) st.pinned++;
      if (t.vars?.scrub) st.scrubbed++;
    }
  } catch {
    // ignore
  }
  let cssRule = false;
  let reducedMotionCss = false;
  let scrollTimelines = 0;
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    const walk = (list) => {
      for (const rule of list) {
        const t = rule.cssText?.slice(0, 120) ?? '';
        if (
          rule.constructor.name === 'CSSViewTransitionRule' ||
          t.startsWith('@view-transition')
        )
          cssRule = true;
        if (rule.media && /prefers-reduced-motion/.test(rule.media.mediaText))
          reducedMotionCss = true;
        if (rule.cssRules) walk(rule.cssRules);
      }
    };
    walk(rules);
  }
  let named = 0;
  let animated = 0;
  let willChange = 0;
  let stickyEls = 0;
  let fixedEls = 0;
  let transitionOnInteractive = 0;
  for (const el of [...document.body.querySelectorAll('*')].slice(0, 5000)) {
    const cs = getComputedStyle(el);
    if (cs.viewTransitionName && cs.viewTransitionName !== 'none') named++;
    if (cs.animationName && cs.animationName !== 'none') animated++;
    if (
      cs.animationTimeline &&
      !['auto', ''].includes(cs.animationTimeline) &&
      cs.animationName !== 'none'
    )
      scrollTimelines++;
    if (cs.willChange && cs.willChange !== 'auto') willChange++;
    if (cs.position === 'sticky') stickyEls++;
    if (cs.position === 'fixed') fixedEls++;
    if (
      (el.tagName === 'A' || el.tagName === 'BUTTON') &&
      cs.transitionDuration &&
      cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0)
    )
      transitionOnInteractive++;
  }
  const canvases = [...document.querySelectorAll('canvas')].map((c) => ({
    w: c.width,
    h: c.height,
    cssW: Math.round(c.getBoundingClientRect().width),
    cssH: Math.round(c.getBoundingClientRect().height),
  }));
  return {
    globals: g,
    classes,
    scriptFiles,
    scrollTrigger: st,
    viewTransition: {
      calls: w.__recon?.vt ?? 0,
      cssRule,
      named,
      apiAvailable: typeof document.startViewTransition === 'function',
    },
    canvases: {
      count: canvases.length,
      sizes: canvases.slice(0, 5),
      contexts: [...new Set(w.__recon?.ctx ?? [])],
    },
    css: {
      animatedElements: animated,
      scrollTimelineElements: scrollTimelines,
      willChangeElements: willChange,
      stickyElements: stickyEls,
      fixedElements: fixedEls,
      hoverTransitionElements: transitionOnInteractive,
      reducedMotionRules: reducedMotionCss,
    },
    intersectionObservers: w.__recon?.io ?? 0,
    totalScripts: scriptFiles.length,
  };
}

/** Choose the elements whose geometry/opacity/transform are sampled while scrolling. Returns metadata. */
export function pickTracked() {
  const vh = innerHeight;
  const SKIP = new Set([
    'SCRIPT',
    'STYLE',
    'LINK',
    'META',
    'NOSCRIPT',
    'TEMPLATE',
    'BR',
    'PATH',
    'CIRCLE',
    'RECT',
    'G',
    'LINE',
    'POLYGON',
  ]);
  const roots = [
    ...(document.querySelector('main') || document.body).children,
    ...document.querySelectorAll('body > header, body > nav, body > footer'),
  ];
  const seen = new Set();
  const cand = [];
  const walk = (el, depth) => {
    if (seen.has(el) || SKIP.has(el.tagName) || depth > 5) return;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    const r = el.getBoundingClientRect();
    if (r.width >= 24 && r.height >= 12) {
      const interesting =
        cs.opacity !== '1' ||
        cs.transform !== 'none' ||
        cs.willChange !== 'auto' ||
        cs.position === 'fixed' ||
        cs.position === 'sticky' ||
        el.parentElement?.classList.contains('pin-spacer') ||
        [...el.attributes].some((a) =>
          /^data-(reveal|scroll|speed|parallax|aos|gsap|pin)/.test(a.name),
        );
      cand.push({ el, interesting, depth, area: r.width * r.height });
    }
    for (const c of el.children) walk(c, depth + 1);
  };
  for (const r of roots) walk(r, 0);
  cand.sort(
    (a, b) =>
      Number(b.interesting) - Number(a.interesting) ||
      a.depth - b.depth ||
      b.area - a.area,
  );
  const chosen = cand.slice(0, 260);
  window.__reconTrack = chosen.map((c) => c.el);
  // section index per tracked element is resolved against the same section list as collectStructure
  const secs = window.__reconSections ?? [];
  return chosen.map((c, id) => {
    const role = c.el.closest('header, [role=banner]')
      ? 'banner'
      : c.el.closest('nav, [role=navigation]')
        ? 'navigation'
        : null;
    return {
      id,
      section: secs.findIndex((s) => s === c.el || s.contains(c.el)),
      role,
      pinSpacer: !!(
        c.el.parentElement?.classList.contains('pin-spacer') ||
        c.el.closest('.pin-spacer')
      ),
    };
  });
}

/** Compare DOMContentLoaded state with now (scroll 0): elements that faded or moved into place on load. */
export function compareEarly() {
  const early = window.__reconEarly;
  if (!early) return null;
  const vh = innerHeight;
  const ty = (t) => {
    const m = /^matrix\(([^)]+)\)$/.exec(t);
    if (m) return parseFloat(m[1].split(',')[5]) || 0;
    const m3 = /^matrix3d\(([^)]+)\)$/.exec(t);
    return m3 ? parseFloat(m3[1].split(',')[13]) || 0 : 0;
  };
  const fromOpacity = [];
  const lifts = [];
  const secs = new Set();
  let count = 0;
  for (const [el, [o0, t0]] of early) {
    if (!el.isConnected) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.top > vh) continue;
    const cs = getComputedStyle(el);
    const o1 = parseFloat(cs.opacity);
    const moved = Math.abs(ty(t0) - ty(cs.transform)) > 4;
    if (o1 - o0 > 0.15 || moved) {
      count++;
      fromOpacity.push(Math.round(o0 * 10) / 10);
      if (moved) lifts.push(Math.round(ty(t0) - ty(cs.transform)));
      const si = (window.__reconSections ?? []).findIndex(
        (s) => s === el || s.contains(el),
      );
      if (si >= 0) secs.add(si);
    }
  }
  if (!count) return null;
  const med = (a) =>
    a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null;
  return {
    kind: 'reveal',
    trigger: 'load',
    sections: [...secs].sort((a, b) => a - b),
    elements: count,
    fromOpacityMedian: med(fromOpacity),
    translateYPxMedian: med(lifts),
  };
}

export function snapshot() {
  const els = window.__reconTrack ?? [];
  const sc = window.__reconScroller;
  return {
    scrollY: Math.round(sc ? sc.scrollTop : scrollY),
    items: els.map((el, i) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return [
        i,
        Math.round(r.top * 10) / 10,
        Math.round(r.height),
        Math.round(parseFloat(cs.opacity) * 100) / 100,
        cs.transform,
        cs.position,
      ];
    }),
  };
}

// ---------------------------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------------------------

function resolveChrome() {
  return process.env.QA_CHROME_PATH || process.env.CHROME_PATH || null;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const scrollPositions = (docHeight, vh, max, stepFactor = 0.85) => {
  const maxScroll = Math.max(0, docHeight - vh);
  const step = Math.max(Math.round(vh * stepFactor), 1);
  let pos = [];
  for (let y = 0; y < maxScroll; y += step) pos.push(y);
  pos.push(maxScroll);
  if (pos.length > max)
    pos = Array.from({ length: max }, (_, i) =>
      Math.round((maxScroll * i) / (max - 1)),
    );
  return [...new Set(pos)];
};

/**
 * Run the reconnaissance. Writes outRoot/<slug>/recon.json and screens/. On ANY error the slug folder is
 * removed before the error is rethrown (the caller still calls cleanup() when it is done with a success).
 */
export async function recon(url, options = {}) {
  const parsed = new URL(url);
  if (!/^https?:$/.test(parsed.protocol))
    throw new AccessError('unreachable', 'Only http(s) URLs are supported.');
  const slug = assertSlug(options.slug ?? slugFromUrl(url));
  const outRoot = resolve(options.outRoot ?? defaultOutRoot());
  const dir = join(outRoot, slug);
  const failAfter = options.failAfter ?? null;
  if (failAfter && !PHASES.includes(failAfter))
    throw new Error(
      `Unknown phase "${failAfter}". Phases: ${PHASES.join(', ')}`,
    );
  const log = options.log ?? (() => {});
  const phaseDone = (name) => {
    log(`phase ${name} done`);
    if (failAfter === name)
      throw new Error(`forced failure after phase "${name}" (test hook)`);
  };
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'screens'), { recursive: true });
  let browser;
  try {
    const { chromium } = await import('playwright');
    const envChrome = resolveChrome();
    const chromePath = envChrome || chromium.executablePath();
    if (!existsSync(chromePath))
      throw new Error(
        `Chromium not found at ${chromePath}. Run \`npx playwright install chromium\` or set QA_CHROME_PATH / CHROME_PATH.`,
      );
    const proxy = chromiumProxyOption();
    // Playwright otherwise forces loopback through the proxy, which breaks local servers.
    if (proxy)
      process.env.PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK ??= '1';
    browser = await chromium.launch({
      ...(envChrome ? { executablePath: envChrome } : {}),
      ...(proxy ? { proxy } : {}),
    });
    phaseDone('launch');

    const domains = new Map();
    const scriptFiles = new Set();
    let requestCount = 0;
    const result = { viewports: {} };
    const screenshots = [];
    const deadline = Date.now() + (options.timeoutMs ?? 240000);
    const main = VIEWPORTS[2];

    // --- main pass at 1440
    const ctx = await browser.newContext({
      viewport: { width: main.width, height: main.height },
    });
    await ctx.addInitScript(initHooks);
    const page = await ctx.newPage();
    page.on('request', (req) => {
      requestCount++;
      try {
        const u = new URL(req.url());
        if (!/^https?:$/.test(u.protocol)) return;
        const entry = domains.get(u.hostname) ?? { requests: 0, types: {} };
        entry.requests++;
        entry.types[req.resourceType()] =
          (entry.types[req.resourceType()] ?? 0) + 1;
        domains.set(u.hostname, entry);
        if (req.resourceType() === 'script')
          scriptFiles.add(u.pathname.split('/').pop() || u.hostname);
      } catch {
        // ignore
      }
    });
    let response;
    try {
      response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    } catch (error) {
      throw new AccessError(
        'unreachable',
        `Unreachable URL: ${String(error.message).split('\n')[0]}`,
      );
    }
    const status = response?.status() ?? 0;
    if (status === 401 || status === 403 || status === 429)
      throw new AccessError(
        status === 429 ? 'blocked' : status === 401 ? 'login' : 'blocked',
        `The server answered HTTP ${status}: the page is not public or blocks automated browsers. Not retrying or evading.`,
      );
    if (status >= 400 || status === 0)
      throw new AccessError('unreachable', `Unreachable URL: HTTP ${status}`);
    await page
      .waitForLoadState('networkidle', { timeout: 6000 })
      .catch(() => {});
    await wait(500);
    const finalUrl = page.url();
    phaseDone('load');

    await page.evaluate(detectScroller);
    const structure = await page.evaluate(collectStructure);
    const loginPath =
      /\/(log-?in|sign-?in|sso|auth(?:orize)?|account\/login)(\/|$|\?)/i.test(
        new URL(finalUrl).pathname,
      );
    if (
      structure.hasPasswordField ||
      (loginPath && !new URL(url).pathname.match(/login|sign-?in/i))
    )
      throw new AccessError(
        'login',
        'The page requires authentication (login form detected). Not public: no analysis.',
      );
    if (
      structure.captchaMarkers ||
      /just a moment|attention required|access denied|verify you are human|captcha|are you a robot/i.test(
        structure.title,
      )
    )
      throw new AccessError(
        'blocked',
        'The site shows a bot challenge or blocks automated browsers. Not evading: no analysis.',
      );
    const styles = aggregateStyles(structure.records, {
      viewportWidth: main.width,
      pageBackground: structure.pageBackground,
      bodySize: structure.bodyPx || 16,
    });
    const { records: _records, ...structureLite } = structure;
    result.viewports[main.width] = {
      docHeightPx: structure.docHeight,
      h1Px: structure.h1Px,
      bodyPx: structure.bodyPx,
      horizontalOverflow: structure.docWidth > main.width + 1,
      sectionCount: structure.sections.length,
    };
    phaseDone('static');

    const libsRaw = await page.evaluate(collectLibraries);
    const libraries = detectLibraries({
      ...libsRaw,
      scriptFiles: [...new Set([...libsRaw.scriptFiles, ...scriptFiles])],
      domains: [...domains.keys()],
    });
    phaseDone('libraries');

    // --- the scroll pass (motion sampling + screenshots at 1440)
    const tracked = await page.evaluate(pickTracked);
    await wait(2200);
    // lazy content may have changed the scrollable height since the static pass: detect again
    const scroller = await page.evaluate(detectScroller);
    result.viewports[main.width].docHeightPx = scroller.scrollHeightPx;
    const loadReveal = await page.evaluate(compareEarly);

    const frames = [];
    const positions = scrollPositions(
      scroller.scrollHeightPx,
      scroller.clientHeightPx,
      MAX_FRAMES,
      0.5,
    );
    const shotEvery = Math.max(1, Math.ceil(positions.length / MAX_SCREENS));
    let shotN = 0;
    for (const [i, y] of positions.entries()) {
      if (Date.now() > deadline) break;
      await page.evaluate(scrollToY, y);
      await wait(90);
      frames.push({ ...(await page.evaluate(snapshot)), settled: false });
      await wait(650);
      frames.push({ ...(await page.evaluate(snapshot)), settled: true });
      if (i % shotEvery === 0 && shotN < MAX_SCREENS) {
        shotN++;
        const rel = `screens/${main.width}-${shotN}.png`;
        await page.screenshot({ path: join(dir, rel) });
        screenshots.push(rel);
      }
    }
    // ScrollTrigger state after scrolling (pins and scrubs are only registered once refreshed)
    const libsAfter = await page.evaluate(collectLibraries);
    if (libsAfter.scrollTrigger.count > libsRaw.scrollTrigger.count)
      libsRaw.scrollTrigger = libsAfter.scrollTrigger;
    libsRaw.classes['pin-spacer'] = Math.max(
      libsRaw.classes['pin-spacer'],
      libsAfter.classes['pin-spacer'],
    );
    const libraries2 = detectLibraries({
      ...libsRaw,
      scriptFiles: [...new Set([...libsRaw.scriptFiles, ...scriptFiles])],
      domains: [...domains.keys()],
    });

    // smooth-scroll (inertia) probe: a wheel tick should keep moving after the event if scroll is eased
    await page.evaluate(scrollToY, 0);
    await wait(400);
    const center = await page.evaluate(scrollerCenter);
    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(0, 500);
    const wheel = [];
    let t0 = Date.now();
    for (const at of [40, 120, 250, 600]) {
      await wait(Math.max(0, at - (Date.now() - t0)));
      wheel.push([at, await page.evaluate(getScrollY)]);
    }
    const eased =
      wheel[3][1] - wheel[1][1] > 20 || wheel[2][1] - wheel[0][1] > 60;
    const rafBefore = await page.evaluate(() => window.__recon?.raf ?? 0);
    await wait(1000);
    const rafPerSecond =
      (await page.evaluate(() => window.__recon?.raf ?? 0)) - rafBefore;
    await page.evaluate(scrollToY, 0);

    const observations = analyzeMotion(frames, {
      viewportHeight: main.height,
      elements: tracked,
    });
    if (loadReveal) observations.push(loadReveal);
    const motion = {
      observations,
      smoothScroll: {
        easedWheelScroll: eased,
        wheelSamples: wheel.map(([t, y]) => ({ msAfterWheel: t, scrollY: y })),
        lenisClass: libsRaw.classes.lenis > 0,
      },
      idleAnimationFramesPerSecond: rafPerSecond,
      trackedElements: tracked.length,
      framesSampled: positions.length,
      scrollTriggers: libsRaw.scrollTrigger,
      css: libsRaw.css,
      intersectionObservers: libsRaw.intersectionObservers,
    };
    await ctx.close();

    // --- other widths: screenshots + a few geometry numbers
    for (const vp of VIEWPORTS.slice(0, 2)) {
      const c = await browser.newContext({ viewport: vp });
      try {
        const p = await c.newPage();
        await p.goto(finalUrl, { waitUntil: 'load', timeout: 30000 });
        await p
          .waitForLoadState('networkidle', { timeout: 5000 })
          .catch(() => {});
        await wait(400);
        const sc = await p.evaluate(detectScroller);
        const m = await p.evaluate(() => ({
          docHeight: document.documentElement.scrollHeight,
          docWidth: document.documentElement.scrollWidth,
          h1: document.querySelector('h1')
            ? parseFloat(
                getComputedStyle(document.querySelector('h1')).fontSize,
              )
            : null,
          body: parseFloat(getComputedStyle(document.body).fontSize),
        }));
        result.viewports[vp.width] = {
          docHeightPx: sc.scrollHeightPx,
          h1Px: m.h1,
          bodyPx: m.body,
          horizontalOverflow: m.docWidth > vp.width + 1,
        };
        const pos = scrollPositions(
          sc.scrollHeightPx,
          sc.clientHeightPx,
          MAX_SCREENS,
        );
        for (const [i, y] of pos.entries()) {
          if (Date.now() > deadline) break;
          await p.evaluate(scrollToY, y);
          await wait(450);
          const rel = `screens/${vp.width}-${i + 1}.png`;
          await p.screenshot({ path: join(dir, rel) });
          screenshots.push(rel);
        }
      } finally {
        await c.close();
      }
    }
    phaseDone('screens');
    phaseDone('motion');

    const byDomain = [...domains.entries()]
      .sort((a, b) => b[1].requests - a[1].requests)
      .map(([domain, v]) => ({
        domain,
        requests: v.requests,
        types: v.types,
        thirdParty: domain !== new URL(finalUrl).hostname,
      }));
    const output = {
      schema: 1,
      tool: 'analyze-reference/recon',
      note: 'Abstract working data. Contains no page text beyond the title, no asset URLs, no color codes, no font names. Delete with `recon.mjs --cleanup <slug>`.',
      generatedAt: new Date().toISOString(),
      requestedUrl: url,
      finalUrl,
      httpStatus: status,
      access: { status: 'ok' },
      title: structure.title,
      lang: structure.lang,
      viewports: result.viewports,
      scroller,
      landmarks: structure.landmarks,
      sections: structureLite.sections,
      totalWords: structure.totalWords,
      styles,
      libraries: libraries2.length ? libraries2 : libraries,
      canvas: libsRaw.canvases,
      viewTransitions: libsRaw.viewTransition,
      network: {
        totalRequests: requestCount,
        scriptCount: libsRaw.totalScripts,
        byDomain,
      },
      motion,
      screenshots: screenshots.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    };
    writeFileSync(
      join(dir, 'recon.json'),
      `${JSON.stringify(output, null, 2)}\n`,
    );
    phaseDone('write');
    return { slug, dir, file: join(dir, 'recon.json'), output };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  } finally {
    await browser?.close().catch(() => {});
  }
}

const HELP = `recon: abstract reconnaissance of one public URL (analyze-reference skill).

Usage:
  node recon.mjs <url> [--slug <slug>] [--out-root <dir>] [--timeout <ms>] [--fail-after <phase>]
  node recon.mjs --cleanup <slug> [--out-root <dir>]
  node recon.mjs --help

Writes <out-root>/<slug>/recon.json and screens/{375,768,1440}-<n>.png.
Default out-root: .cache/analyze (git-ignored). Always run --cleanup <slug> when the analysis ends.
On any error recon.mjs removes its own folder before exiting.
Chromium: QA_CHROME_PATH or CHROME_PATH, else Playwright's default install.
--fail-after <${PHASES.join('|')}> is a test hook that throws after that phase.
Exit codes: 0 ok, 1 error, 2 usage, 3 not analyzable (unreachable / login / blocked).`;

export async function main(argv, io = console) {
  if (argv.includes('--help') || argv.includes('-h')) {
    io.log(HELP);
    return 0;
  }
  const opt = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cleanup') opt.cleanup = argv[++i];
    else if (a === '--slug') opt.slug = argv[++i];
    else if (a === '--out-root') opt.outRoot = argv[++i];
    else if (a === '--fail-after') opt.failAfter = argv[++i];
    else if (a === '--timeout') opt.timeoutMs = Number(argv[++i]);
    else if (a.startsWith('-')) {
      io.error(`Unknown option ${a}. See --help.`);
      return 2;
    } else rest.push(a);
  }
  try {
    if (opt.cleanup !== undefined) {
      if (!opt.cleanup)
        throw Object.assign(new Error('--cleanup needs a slug'), {
          usage: true,
        });
      const removed = cleanup(opt.cleanup, opt.outRoot ?? defaultOutRoot());
      io.log(
        removed
          ? `removed ${join(opt.outRoot ?? defaultOutRoot(), opt.cleanup)}`
          : `nothing to remove for "${opt.cleanup}"`,
      );
      return 0;
    }
    if (rest.length !== 1) {
      io.error(
        'Usage: node recon.mjs <url> [options] | --cleanup <slug> (see --help)',
      );
      return 2;
    }
    const { output, dir } = await recon(rest[0], {
      ...opt,
      log: (m) => io.error(`[recon] ${m}`),
    });
    io.log(`recon.json written to ${dir}`);
    io.log(
      `  sections: ${output.sections.length}, libraries: ${output.libraries.map((l) => `${l.name} (${l.confidence})`).join(', ') || 'none detected'}`,
    );
    io.log(
      `  screenshots: ${output.screenshots.length} in ${join(dir, 'screens')}`,
    );
    io.log(
      `Remember: node recon.mjs --cleanup ${assertSlug(opt.slug ?? slugFromUrl(rest[0]))}`,
    );
    return 0;
  } catch (error) {
    if (error instanceof AccessError) {
      io.error(`NOT ANALYZABLE (${error.kind}): ${error.message}`);
      return 3;
    }
    io.error(`recon failed: ${error.message}`);
    return error.usage ? 2 : 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url) &&
  !reexecWithEnvProxy()
) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
