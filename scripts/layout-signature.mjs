#!/usr/bin/env node
// Layout signature of a built landing: coarse, comparable features of its composition plus perceptual
// hashes of its viewport slices. Used by check-landing (layout-diversity rule, archetype-target warning).
//
//   node scripts/layout-signature.mjs --site <slug> [--write] [--dist <dir>] [--json]
//
// Serves sites/<slug>/dist itself (build first: npm run build -w site-<slug>), loads the home page (landings
// are one page) in Chromium at 1440x900 and at 375x812, and always shuts the server and browser down, also on
// errors and SIGINT/SIGTERM. Chromium: QA_CHROME_PATH or CHROME_PATH, else Playwright's.
// `--write` stores sites/<slug>/layout-signature.json (small, no image data). Without it the JSON is printed.
//
// Features (all at 1440 px; the model, weights and scales live in scripts/lib/layout-core.mjs):
//   sectionCount      top-level <section>s outside header and footer (fallback: children of <main>)
//   cols1/2/3Share    share of sections whose content mostly sits in 1, 2 or 3+ columns (the modal number of
//                     side-by-side blocks among headings, text, lists, tables, figures and media, sampled every 24 px)
//   splitRatio        median narrow/wide width ratio of the two columns in 2-column sections (0 when there are none)
//   fullBleedShare    share of sections holding a media element or background image >= 90% of the viewport wide
//   imageRadius       median corner radius in px of images 100 px or larger (the element or a wrapper of the same size)
//   buttonRadius      median corner radius in px of button-like links (filled or outlined, 28 to 90 px tall)
//   buttonShape       pill | rect | text (text when no link looks like a button)
//   headingScale      h1 font size divided by body font size
//   headingAlign      left | center | right, the majority among h1 and h2
//   headingCase       share of h1 to h3 set in capitals
//   eyebrowShare      share of headed sections that open with a small label (<= 15 px, capitals or tracked) before the heading
//   wordsPerScreen    visible words divided by page height in 900 px screens
//   footerType        wordmark (type >= 10% of the viewport wide) | columns (3+ side-by-side blocks) | minimal
//   mediaPerScreen    images, videos, canvases and background images of 120 x 80 px or larger per screen
//   rotatedShare      share of images (or their wrappers) rotated by more than half a degree
//   overlapShare      share of images that partly overlap another image
//   stickyCount       sticky elements outside the header plus ScrollTrigger pin spacers
// Also stored: `mobile` (375 px: screens and words per screen, informational), per-section `sections`, and
// `hashes`: one 64-bit difference hash (16 hex digits) per 900 px slice of the page at 1440 px (grayscale,
// 9x8 resize by sharp, one bit per left-to-right brightness step), at most 24 slices.
//
// Exit codes: 0 ok, 1 measuring failed (no dist, no page, no Chromium), 2 bad usage.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import sharp from 'sharp';

import { SLUG_PATTERN } from './lib/sites.mjs';
import { discoverPages, startStatic } from './qa/server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SIGNATURE_VERSION = 1;
export const DESKTOP = { width: 1440, height: 900 };
export const MOBILE = { width: 375, height: 812 };
export const MAX_SLICES = 24;
export const signaturePath = (root, slug) =>
  join(root, 'sites', slug, 'layout-signature.json');

const HELP = `Usage: node scripts/layout-signature.mjs --site <slug> [--write] [--dist <dir>] [--json]

Measures the layout of the built site (sites/<slug>/dist, build it first) and prints the signature as JSON.
  --site <slug>   the site
  --write         store it in sites/<slug>/layout-signature.json
  --dist <dir>    measure any built folder instead (tests); needs --site only for --write
  --json          print the JSON even with --write
Exit codes: 0 ok, 1 measuring failed, 2 bad usage.`;

// --------------------------------------------------------------------------------------------------
// In the page. Self-contained: it is serialized into the browser.

/* c8 ignore start */
function measureInPage() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const px = (v) => Number.parseFloat(v) || 0;
  const round = (n, d = 2) => Number(n.toFixed(d));
  const median = (list) => {
    if (!list.length) return 0;
    const s = [...list].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const share = (n, d) => (d ? n / d : 0);
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.left + scrollX,
      y: r.top + scrollY,
      w: r.width,
      h: r.height,
    };
  };
  const shown = (el) => {
    const cs = getComputedStyle(el);
    const b = box(el);
    return (
      cs.display !== 'none' && cs.visibility !== 'hidden' && b.w > 0 && b.h > 0
    );
  };
  const pageHeight = Math.max(document.documentElement.scrollHeight, vh);
  const screens = pageHeight / vh;

  // Sections
  let sections = [...document.querySelectorAll('section')].filter(
    (el) =>
      !el.parentElement.closest('section') &&
      !el.closest('header, footer') &&
      shown(el) &&
      box(el).h >= 60,
  );
  if (!sections.length)
    sections = [...document.querySelectorAll('main > *')].filter(
      (el) => shown(el) && box(el).h >= 60,
    );

  // Side-by-side blocks: the modal count of horizontally disjoint boxes along a sampled horizontal line.
  const CONTENT =
    'img, picture, video, canvas, svg, h1, h2, h3, h4, h5, h6, p, ul, ol, dl, table, figure, blockquote, form, nav, address';
  const GAP = 40; // bridge the space between stacked blocks of one column
  const columnsOf = (root) => {
    const boxes = [...root.querySelectorAll(CONTENT)]
      .filter((el) => shown(el))
      .map(box)
      .filter((b) => b.w >= 60 && b.h >= 10);
    if (!boxes.length) return { cols: 1, widths: [] };
    const top = Math.min(...boxes.map((b) => b.y));
    const bottom = Math.max(...boxes.map((b) => b.y + b.h));
    const counts = new Map();
    let best = null;
    for (let y = top + 4; y < bottom; y += 24) {
      const row = boxes
        .filter((b) => b.y - GAP <= y && b.y + b.h + GAP > y)
        .sort((a, b) => a.x + a.w - (b.x + b.w));
      const picked = [];
      let edge = -Infinity;
      for (const b of row)
        if (b.x >= edge + 2) {
          picked.push(b);
          edge = b.x + b.w;
        }
      const n = Math.min(picked.length, 4);
      if (!n) continue;
      counts.set(n, (counts.get(n) ?? 0) + 1);
      if (!best || n > best.n) best = { n, picked };
    }
    let cols = 1;
    let most = -1;
    for (const [n, count] of counts)
      if (count > most || (count === most && n > cols)) {
        cols = n;
        most = count;
      }
    const widths =
      cols === 2 && best && best.n >= 2
        ? best.picked.map((b) => b.w).sort((a, b) => b - a)
        : [];
    return { cols, widths };
  };

  const mediaEls = (root) =>
    [...root.querySelectorAll('*')].filter((el) => {
      if (!shown(el)) return false;
      if (['IMG', 'VIDEO', 'CANVAS'].includes(el.tagName)) return true;
      return /url\(/.test(getComputedStyle(el).backgroundImage);
    });
  const radiusOf = (el) => {
    let best = 0;
    let node = el;
    const b0 = box(el);
    for (
      let depth = 0;
      node && depth < 4;
      depth += 1, node = node.parentElement
    ) {
      const b = box(node);
      if (depth && (b.w > b0.w * 1.1 || b.h > b0.h * 1.1)) break;
      const raw = getComputedStyle(node).borderTopLeftRadius;
      let r = raw.endsWith('%')
        ? (px(raw) / 100) * Math.min(b.w, b.h)
        : px(raw);
      r = Math.min(r, Math.min(b.w, b.h) / 2);
      best = Math.max(best, r);
    }
    return best;
  };

  const sectionInfo = sections.map((el, index) => {
    const { cols, widths } = columnsOf(el);
    const full = [el, ...mediaEls(el)].some((m) => {
      const b = box(m);
      const bg = /url\(/.test(getComputedStyle(m).backgroundImage);
      const media = bg || ['IMG', 'VIDEO', 'CANVAS'].includes(m.tagName);
      return media && b.w >= vw * 0.9 && b.h >= vh * 0.35;
    });
    const headingEl = el.querySelector('h1, h2, h3');
    let eyebrow = false;
    if (headingEl) {
      for (const node of el.querySelectorAll('*')) {
        if (node === headingEl || node.contains(headingEl)) {
          if (node === headingEl) break;
          continue;
        }
        if (
          !(
            headingEl.compareDocumentPosition(node) &
            Node.DOCUMENT_POSITION_PRECEDING
          )
        )
          break;
        const own = [...node.childNodes]
          .filter((c) => c.nodeType === 3)
          .map((c) => c.textContent.trim())
          .join(' ')
          .trim();
        if (own.length < 2 || own.length > 48 || !shown(node)) continue;
        const cs = getComputedStyle(node);
        const size = px(cs.fontSize);
        const tracked = px(cs.letterSpacing) >= size * 0.06;
        const caps =
          cs.textTransform === 'uppercase' ||
          (/[A-ZÁÉÍÓÚÑ]{2}/.test(own) && own === own.toUpperCase());
        eyebrow = size <= 15 && (caps || tracked);
        break;
      }
    }
    return {
      index,
      id: el.id || null,
      cols,
      widths,
      fullBleed: full,
      headed: Boolean(headingEl),
      eyebrow,
    };
  });

  const colShare = (test) =>
    share(sectionInfo.filter(test).length, sectionInfo.length);
  const ratios = sectionInfo
    .filter((s) => s.cols === 2 && s.widths.length >= 2)
    .map((s) => s.widths[1] / s.widths[0]);

  // Images, buttons
  const images = [...document.querySelectorAll('img, video, canvas')].filter(
    (el) => {
      const b = box(el);
      return shown(el) && b.w >= 100 && b.h >= 100;
    },
  );
  const imageRadii = images.map(radiusOf);
  const buttons = [
    ...document.querySelectorAll('a, button, [role="button"]'),
  ].filter((el) => {
    if (!shown(el)) return false;
    const b = box(el);
    const text = (el.textContent ?? '').trim();
    if (!text || text.length > 40 || b.h < 28 || b.h > 90) return false;
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
    const alpha = bg
      ? bg[1].split(',').length > 3
        ? Number(bg[1].split(',')[3])
        : 1
      : 0;
    const bordered = ['Top', 'Right', 'Bottom', 'Left'].every(
      (side) =>
        px(cs[`border${side}Width`]) >= 1 &&
        cs[`border${side}Style`] !== 'none',
    );
    return (alpha >= 0.15 || bordered) && px(cs.paddingLeft) >= 10;
  });
  const buttonRadii = buttons.map((el) => {
    const b = box(el);
    const raw = getComputedStyle(el).borderTopLeftRadius;
    const r = raw.endsWith('%')
      ? (px(raw) / 100) * Math.min(b.w, b.h)
      : px(raw);
    return { r: Math.min(r, b.h / 2), h: b.h };
  });
  const pills = buttonRadii.filter((b) => b.r >= b.h * 0.45).length;
  const buttonShape = !buttons.length
    ? 'text'
    : pills > buttons.length - pills
      ? 'pill'
      : 'rect';

  // Headings
  const bodySize = px(getComputedStyle(document.body).fontSize) || 16;
  const h1 = [...document.querySelectorAll('h1')].find(shown);
  const headings = [...document.querySelectorAll('h1, h2, h3')].filter(shown);
  const align = { left: 0, center: 0, right: 0 };
  for (const h of [...document.querySelectorAll('h1, h2')].filter(shown)) {
    const a = getComputedStyle(h).textAlign;
    align[
      a === 'center'
        ? 'center'
        : a === 'right' || a === 'end'
          ? 'right'
          : 'left'
    ] += 1;
  }
  const headingAlign =
    align.center > align.left && align.center >= align.right
      ? 'center'
      : align.right > align.left
        ? 'right'
        : 'left';
  const upper = headings.filter((h) => {
    const t = (h.textContent ?? '').trim();
    return (
      getComputedStyle(h).textTransform === 'uppercase' ||
      (/[A-ZÁÉÍÓÚÑ]{3}/.test(t) && t === t.toUpperCase())
    );
  }).length;

  // Footer
  const footer = [...document.querySelectorAll('footer')].filter(shown).pop();
  let footerType = 'minimal';
  if (footer) {
    const big = [...footer.querySelectorAll('*')].some(
      (el) =>
        shown(el) &&
        (el.textContent ?? '').trim().length >= 3 &&
        [...el.childNodes].some(
          (c) => c.nodeType === 3 && c.textContent.trim(),
        ) &&
        px(getComputedStyle(el).fontSize) >= vw * 0.1,
    );
    if (big) footerType = 'wordmark';
    else if (columnsOf(footer).cols >= 3) footerType = 'columns';
  }

  // Media
  const allMedia = mediaEls(document.body).filter((el) => {
    const b = box(el);
    return b.w >= 120 && b.h >= 80;
  });
  const rotated = images.filter((el) => {
    for (
      let node = el, depth = 0;
      node && depth < 3;
      node = node.parentElement, depth += 1
    ) {
      const t = getComputedStyle(node).transform;
      const m = /^matrix\(([^)]+)\)$/.exec(t);
      if (m) {
        const [a, b] = m[1].split(',').map(Number);
        if (Math.abs((Math.atan2(b, a) * 180) / Math.PI) > 0.5) return true;
      }
    }
    return false;
  }).length;
  const rects = images.map(box);
  const overlapping = new Set();
  for (let i = 0; i < rects.length; i += 1)
    for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i];
      const b = rects[j];
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (w <= 0 || h <= 0) continue;
      const small = Math.min(a.w * a.h, b.w * b.h);
      const inter = w * h;
      if (inter >= small * 0.98 || inter < small * 0.08) continue; // contained, or a touch
      overlapping.add(i);
      overlapping.add(j);
    }

  const sticky = [...document.querySelectorAll('body *')].filter(
    (el) =>
      !el.closest('header') &&
      getComputedStyle(el).position === 'sticky' &&
      shown(el),
  ).length;
  const pins = document.querySelectorAll('.pin-spacer').length;

  const words = (document.body.innerText || '')
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    features: {
      sectionCount: sectionInfo.length,
      cols1Share: round(colShare((s) => s.cols === 1)),
      cols2Share: round(colShare((s) => s.cols === 2)),
      cols3Share: round(colShare((s) => s.cols >= 3)),
      splitRatio: round(median(ratios)),
      fullBleedShare: round(colShare((s) => s.fullBleed)),
      imageRadius: round(median(imageRadii), 1),
      buttonRadius: round(median(buttonRadii.map((b) => b.r)), 1),
      buttonShape,
      headingScale: h1
        ? round(px(getComputedStyle(h1).fontSize) / bodySize, 1)
        : 0,
      headingAlign,
      headingCase: round(share(upper, headings.length)),
      eyebrowShare: round(
        share(
          sectionInfo.filter((s) => s.headed && s.eyebrow).length,
          sectionInfo.filter((s) => s.headed).length,
        ),
      ),
      wordsPerScreen: Math.round(words / screens),
      footerType,
      mediaPerScreen: round(allMedia.length / screens, 1),
      rotatedShare: round(share(rotated, images.length)),
      overlapShare: round(share(overlapping.size, images.length)),
      stickyCount: sticky + pins,
    },
    sections: sectionInfo.map((s) => ({
      id: s.id,
      cols: s.cols,
      fullBleed: s.fullBleed,
      eyebrow: s.eyebrow,
    })),
    screens: round(screens),
    words,
    pageHeight,
  };
}
/* c8 ignore stop */

// --------------------------------------------------------------------------------------------------
// Hashes

/** 64-bit difference hash of a PNG/JPEG buffer as 16 hex digits. */
export async function dHash(buffer) {
  const { data } = await sharp(buffer)
    .grayscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = 0n;
  for (let row = 0; row < 8; row += 1)
    for (let col = 0; col < 8; col += 1) {
      bits <<= 1n;
      if (data[row * 9 + col] < data[row * 9 + col + 1]) bits |= 1n;
    }
  return bits.toString(16).padStart(16, '0');
}

async function scrollThrough(tab, height) {
  await tab.evaluate(async (h) => {
    const step = Math.max(200, Math.floor(h * 0.8));
    for (
      let y = 0, n = 0;
      y < document.documentElement.scrollHeight && n < 120;
      y += step, n += 1
    ) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  }, height);
}

// --------------------------------------------------------------------------------------------------
// Measuring

/** Measure the home page of `distDir`. Returns the signature document (without the site name). */
export async function measureDist({ distDir, log = () => {} }) {
  const envChrome = process.env.QA_CHROME_PATH || process.env.CHROME_PATH;
  const chromePath = envChrome || chromium.executablePath();
  if (!existsSync(chromePath))
    throw new Error(
      `Chromium not found at ${chromePath}. Run \`npx playwright install chromium\` or set QA_CHROME_PATH.`,
    );
  const pages = discoverPages(distDir, ['404.html']);
  if (!pages.length) throw new Error(`No .html pages found in ${distDir}`);
  const page = pages.find((p) => p.path === '/') ?? pages[0];

  const cleanups = [];
  const closeAll = async () => {
    for (const fn of cleanups.splice(0).reverse()) await fn().catch(() => {});
  };
  const onSignal = () => closeAll().finally(() => process.exit(130));
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    const server = await startStatic(distDir);
    cleanups.push(() => server.close());
    const browser = await chromium.launch(
      envChrome ? { executablePath: envChrome } : {},
    );
    cleanups.push(() => browser.close());
    const url = `${server.baseUrl}${page.path}`;

    // Desktop: features, then one screenshot per viewport-height slice.
    const desktop = await browser.newContext({ viewport: DESKTOP });
    let measured;
    const hashes = [];
    try {
      const tab = await desktop.newPage();
      await tab.goto(url, { waitUntil: 'load' });
      await scrollThrough(tab, DESKTOP.height);
      measured = await tab.evaluate(measureInPage);
      const slices = Math.min(
        MAX_SLICES,
        Math.max(1, Math.ceil(measured.pageHeight / DESKTOP.height)),
      );
      for (let i = 0; i < slices; i += 1) {
        await tab.evaluate((y) => window.scrollTo(0, y), i * DESKTOP.height);
        await tab.waitForTimeout(450);
        hashes.push(
          await dHash(await tab.screenshot({ animations: 'disabled' })),
        );
      }
      log(
        `${page.path} @${DESKTOP.width}: ${measured.features.sectionCount} section(s), ${hashes.length} slice(s)`,
      );
    } finally {
      await desktop.close();
    }

    // Mobile: informational only.
    const mobileContext = await browser.newContext({ viewport: MOBILE });
    let mobile;
    try {
      const tab = await mobileContext.newPage();
      await tab.goto(url, { waitUntil: 'load' });
      await scrollThrough(tab, MOBILE.height);
      const m = await tab.evaluate(measureInPage);
      mobile = {
        screens: m.screens,
        wordsPerScreen: Math.round(m.words / m.screens),
        sectionCount: m.features.sectionCount,
      };
    } finally {
      await mobileContext.close();
    }

    return {
      version: SIGNATURE_VERSION,
      page: page.path,
      viewport: DESKTOP,
      features: measured.features,
      sections: measured.sections,
      mobile,
      hashes,
    };
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await closeAll();
  }
}

export function serialize(site, signature) {
  const doc = { site, ...signature };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export async function main(argv, io = console, root = ROOT) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        dist: { type: 'string' },
        write: { type: 'boolean' },
        json: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    }));
  } catch (error) {
    io.error(`layout-signature: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  if (!values.site && !values.dist) {
    io.error(`layout-signature: --site <slug> is required\n\n${HELP}`);
    return 2;
  }
  if (values.site && !SLUG_PATTERN.test(values.site)) {
    io.error(`layout-signature: invalid slug "${values.site}"`);
    return 2;
  }
  if (values.write && !values.site) {
    io.error('layout-signature: --write needs --site <slug>');
    return 2;
  }
  const distDir = values.dist
    ? resolve(values.dist)
    : join(root, 'sites', values.site, 'dist');
  if (!existsSync(distDir)) {
    io.error(
      `layout-signature: ${distDir} does not exist; build first (npm run build -w site-${values.site})`,
    );
    return 1;
  }
  try {
    const signature = await measureDist({ distDir, log: (m) => io.log(m) });
    const text = serialize(values.site ?? null, signature);
    if (values.write) {
      const file = signaturePath(root, values.site);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
      io.log(`layout-signature: wrote ${file}`);
      if (values.json) io.log(text.trimEnd());
    } else io.log(text.trimEnd());
    return 0;
  } catch (error) {
    io.error(`layout-signature: ${error.message}`);
    return 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = await main(process.argv.slice(2));
}
