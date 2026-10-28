// The `seo` area of the landing report: titles, descriptions, headings, canonical URLs, Open Graph, structured
// data, the sitemap, robots.txt and the primary keyword, read from dist/ for the indexable pages only.
// Design: openspec/changes/add-seo/design.md. It fails only on what is broken or misleading; everything else warns.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cap, makeItem } from './items.mjs';

const area = 'seo';

/** Entities the head of a built page can hold, decoded. */
const decode = (text) =>
  text
    .replace(
      /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
      (match, body) => {
        const named = {
          amp: '&',
          lt: '<',
          gt: '>',
          quot: '"',
          apos: "'",
          nbsp: ' ',
        };
        if (body[0] !== '#') return named[body.toLowerCase()];
        const code =
          body[1].toLowerCase() === 'x'
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      },
    )
    .replace(/\s+/g, ' ')
    .trim();
const stripTags = (html) => decode(html.replace(/<[^>]*>/g, ' '));
const length = (text) => [...text].length;

/** Lowercase, accents removed, punctuation turned into spaces. */
export const normalizeText = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * Does the text contain the keyword? The whole phrase, or every word of four letters or more of it
 * (accent and case insensitive). A keyword with no long word needs the whole phrase.
 */
export function containsKeyword(text, keyword) {
  const haystack = ` ${normalizeText(text)} `;
  const phrase = normalizeText(keyword);
  if (!phrase) return false;
  if (haystack.includes(` ${phrase} `)) return true;
  const words = phrase.split(' ').filter((word) => [...word].length >= 4);
  return words.length > 0 && words.every((word) => haystack.includes(word));
}

const metaContent = (page, attr, name) => {
  const tag = page.scan.tags.find(
    (t) => t.name === 'meta' && (t.attrs[attr] ?? '').toLowerCase() === name,
  );
  return tag ? (tag.attrs.content ?? '').trim() : null;
};

/** A page that asks not to be indexed. */
const isNoindex = (page) =>
  page.scan.tags.some(
    (t) =>
      t.name === 'meta' &&
      (t.attrs.name ?? '').toLowerCase() === 'robots' &&
      /noindex/i.test(t.attrs.content ?? ''),
  );

/** Pages the area judges: no `noindex`, no 404, no direction page. */
export function indexablePages(model) {
  return model.pages.filter(
    (page) =>
      page.file !== '404.html' &&
      !page.path.startsWith('/directions/') &&
      !isNoindex(page),
  );
}

function pageFacts(page) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(page.html);
  const h1s = [...page.html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(
    (m) => stripTags(m[1]),
  );
  const canonical = page.scan.tags.find(
    (t) => t.name === 'link' && /\bcanonical\b/i.test(t.attrs.rel ?? ''),
  );
  return {
    title: title ? decode(title[1]) : '',
    description: metaContent(page, 'name', 'description') ?? '',
    h1s,
    canonical: canonical?.attrs.href?.trim() ?? '',
  };
}

const quote = (text) =>
  length(text) > 70 ? `${[...text].slice(0, 67).join('')}...` : text;

// --- Per-page text items ------------------------------------------------------------------------------------------

function lengthItem({ id, label, field, pages, facts, min, max, fixField }) {
  const missing = [];
  const outside = [];
  for (const page of pages) {
    const value = facts.get(page.path)[field];
    if (!value) missing.push(`${page.path}: no ${label}`);
    else {
      const size = length(value);
      if (size < min || size > max)
        outside.push(
          `${page.path}: ${size} characters, limit ${min} to ${max}: "${quote(value)}"`,
        );
    }
  }
  const fix = `Give every indexable page a ${label} of ${min} to ${max} characters, written for people and with the primary keyword once. ${fixField}`;
  if (missing.length)
    return makeItem({
      id,
      area,
      status: 'fail',
      title: `${missing.length} page(s) without a ${label}`,
      evidence: cap([...missing, ...outside]),
      fix,
    });
  if (outside.length)
    return makeItem({
      id,
      area,
      status: 'warn',
      title: `${outside.length} page(s) with a ${label} outside ${min} to ${max} characters`,
      evidence: cap(outside),
      fix,
    });
  return makeItem({
    id,
    area,
    status: 'pass',
    title: `Every indexable page has a ${label} of ${min} to ${max} characters`,
  });
}

function h1Item(pages, facts) {
  const bad = [];
  for (const page of pages) {
    const count = facts.get(page.path).h1s.length;
    if (count !== 1) bad.push(`${page.path}: ${count} h1 element(s)`);
  }
  return bad.length
    ? makeItem({
        id: 'seo-h1',
        area,
        status: 'warn',
        title: `${bad.length} page(s) without exactly one h1`,
        evidence: cap(bad),
        fix: 'Give each page one h1 that says what the page is about, with the primary keyword written naturally; use h2 and below for the rest.',
      })
    : makeItem({
        id: 'seo-h1',
        area,
        status: 'pass',
        title: 'Every indexable page has exactly one h1',
      });
}

function canonicalItem(pages, facts) {
  const bad = [];
  for (const page of pages) {
    const href = facts.get(page.path).canonical;
    if (!href) bad.push(`${page.path}: no canonical link`);
    else if (!/^https?:\/\//i.test(href))
      bad.push(`${page.path}: relative canonical "${href}"`);
  }
  return bad.length
    ? makeItem({
        id: 'seo-canonical',
        area,
        status: 'warn',
        title: `${bad.length} page(s) without an absolute canonical URL`,
        evidence: cap(bad),
        fix: "Set `site` in astro.config.mjs to the landing's final origin: BaseLayout then writes an absolute canonical URL, `og:url` and an absolute sitemap.",
      })
    : makeItem({
        id: 'seo-canonical',
        area,
        status: 'pass',
        title: 'Every indexable page has an absolute canonical URL',
      });
}

const OG_REQUIRED = [
  ['property', 'og:title'],
  ['property', 'og:description'],
  ['property', 'og:type'],
  ['property', 'og:url'],
  ['property', 'og:image'],
  ['name', 'twitter:card'],
];

function openGraphItem(pages) {
  const bad = [];
  for (const page of pages) {
    const missing = OG_REQUIRED.filter(
      ([attr, name]) => !metaContent(page, attr, name),
    ).map(([, name]) => name);
    if (missing.length) bad.push(`${page.path}: missing ${missing.join(', ')}`);
  }
  return bad.length
    ? makeItem({
        id: 'seo-open-graph',
        area,
        status: 'warn',
        title: `${bad.length} page(s) with missing Open Graph or Twitter tags`,
        evidence: cap(bad),
        fix: 'BaseLayout writes og:title, og:description, og:type, og:url (needs `site`) and twitter:card; pass `ogImage` for og:image.',
      })
    : makeItem({
        id: 'seo-open-graph',
        area,
        status: 'pass',
        title: 'Every indexable page has its Open Graph and Twitter tags',
      });
}

// --- Structured data ----------------------------------------------------------------------------------------------

const REVIEW_TYPES = new Set(['Review', 'AggregateRating', 'Rating']);
const REVIEW_KEYS = new Set([
  'review',
  'reviews',
  'aggregateRating',
  'reviewRating',
  'ratingValue',
]);

/** Walk parsed JSON-LD: the @type values and whether any review or rating markup is present. */
function inspectJsonLd(value, found = { types: new Set(), review: false }) {
  if (Array.isArray(value)) value.forEach((v) => inspectJsonLd(v, found));
  else if (value && typeof value === 'object') {
    for (const type of [].concat(value['@type'] ?? []))
      if (typeof type === 'string') {
        found.types.add(type);
        if (REVIEW_TYPES.has(type)) found.review = true;
      }
    for (const [key, child] of Object.entries(value)) {
      if (REVIEW_KEYS.has(key)) found.review = true;
      inspectJsonLd(child, found);
    }
  }
  return found;
}

/** Does the brief hold real customer reviews? (The brief schema has no reviews field yet, so this is false today.) */
const briefHasReviews = (brief) =>
  Array.isArray(brief?.reviews) && brief.reviews.length > 0;

function structuredDataItem(pages, brief) {
  const broken = [];
  const reviews = [];
  const without = [];
  const typesSeen = new Set();
  for (const page of pages) {
    const blocks = page.scan.scripts.filter((s) =>
      /^application\/ld\+json$/i.test((s.attrs.type ?? '').trim()),
    );
    if (!blocks.length) {
      without.push(page.path);
      continue;
    }
    for (const block of blocks) {
      let data;
      try {
        data = JSON.parse(block.text);
      } catch (error) {
        broken.push(
          `${page.path}:${block.line}: JSON-LD does not parse (${error.message})`,
        );
        continue;
      }
      const found = inspectJsonLd(data);
      found.types.forEach((t) => typesSeen.add(t));
      if (found.review && !briefHasReviews(brief))
        reviews.push(
          `${page.path}:${block.line}: review or rating markup (${[...found.types].join(', ')})`,
        );
    }
  }
  const expected = brief?.seo?.schemaType?.trim?.() || '';
  const fix =
    'Pass a `jsonLd` object to BaseLayout built from the brief (src/data/seo.ts): the type is `seo.schemaType`, the values are customer facts only. Never mark up reviews or ratings the customer did not provide.';
  if (broken.length)
    return makeItem({
      id: 'seo-structured-data',
      area,
      status: 'fail',
      title: `${broken.length} JSON-LD block(s) that do not parse`,
      evidence: cap([...broken, ...reviews]),
      fix: 'Fix the JSON in the block; `jsonLd` in BaseLayout is serialized with JSON.stringify, so build it as an object.',
    });
  if (reviews.length)
    return makeItem({
      id: 'seo-structured-data',
      area,
      status: 'fail',
      title: 'Review or rating markup, and the brief has no reviews',
      evidence: cap(reviews),
      fix: 'Remove the review, aggregateRating and rating properties: markup for reviews that are not real is misleading and can bring a penalty.',
    });
  if (without.length === pages.length)
    return makeItem({
      id: 'seo-structured-data',
      area,
      status: 'warn',
      title: 'No page has JSON-LD structured data',
      evidence: cap(without.map((p) => `${p}: no application/ld+json block`)),
      fix,
    });
  if (expected && !typesSeen.has(expected))
    return makeItem({
      id: 'seo-structured-data',
      area,
      status: 'warn',
      title: `No JSON-LD of the brief's schema type ${expected}`,
      evidence: [`types found: ${[...typesSeen].join(', ') || 'none'}`],
      fix,
    });
  return makeItem({
    id: 'seo-structured-data',
    area,
    status: 'pass',
    title: `JSON-LD parses (${[...typesSeen].join(', ')}) and has no review markup${without.length ? `; ${without.length} page(s) have none` : ''}`,
  });
}

// --- Sitemap and robots.txt ---------------------------------------------------------------------------------------

const normalizePath = (path) =>
  path.length > 1 && !path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)
    ? `${path}/`
    : path;

function sitemapItem(model, pages) {
  const file = join(model.root, 'sitemap.xml');
  if (!existsSync(file))
    return makeItem({
      id: 'seo-sitemap',
      area,
      status: 'warn',
      title: 'No sitemap.xml in the build',
      evidence: [],
      fix: "Use the starter's astro.config.mjs (its `seoFiles()` integration writes dist/sitemap.xml after the build) in this site.",
    });
  const locs = [
    ...readFileSync(file, 'utf8').matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/g),
  ].map((m) => decode(m[1]));
  const listed = new Map();
  let relative = 0;
  for (const loc of locs) {
    let path = loc;
    if (/^https?:\/\//i.test(loc)) {
      try {
        path = new URL(loc).pathname;
      } catch {
        // keep the raw text; it will not match a page
      }
    } else relative += 1;
    listed.set(normalizePath(path), loc);
  }
  const noindex = model.pages.filter((p) => !pages.includes(p));
  const wrongly = noindex
    .filter((p) => listed.has(normalizePath(p.path)))
    .map(
      (p) =>
        `${p.path} is noindex (or a 404 or direction page) but listed in sitemap.xml`,
    );
  if (wrongly.length)
    return makeItem({
      id: 'seo-sitemap',
      area,
      status: 'fail',
      title: `${wrongly.length} noindex page(s) listed in sitemap.xml`,
      evidence: cap(wrongly),
      fix: 'Only indexable pages belong in the sitemap: regenerate it from the build (seoFiles() in astro.config.mjs skips noindex pages, 404.html and /directions/).',
    });
  const absent = pages
    .filter((p) => !listed.has(normalizePath(p.path)))
    .map((p) => `${p.path} is indexable but not in sitemap.xml`);
  const notes = [];
  if (relative)
    notes.push(
      `${relative} URL(s) are not absolute: set \`site\` in astro.config.mjs`,
    );
  if (absent.length) notes.push(...absent);
  return notes.length
    ? makeItem({
        id: 'seo-sitemap',
        area,
        status: 'warn',
        title: relative
          ? 'The sitemap has relative URLs'
          : `${absent.length} indexable page(s) missing from sitemap.xml`,
        evidence: cap(notes),
        fix: 'Set `site` in astro.config.mjs and rebuild so sitemap.xml lists every indexable page with an absolute URL.',
      })
    : makeItem({
        id: 'seo-sitemap',
        area,
        status: 'pass',
        title: `sitemap.xml lists the ${pages.length} indexable page(s) and no noindex page`,
      });
}

/** Groups of robots.txt: [{ agents: ['*'], rules: [['disallow', '/']] }], plus the Sitemap lines. */
export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === 'sitemap') sitemaps.push(value);
    else if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    } else if (current) current.rules.push([key, value]);
    lastWasAgent = false;
  }
  return { groups, sitemaps };
}

function robotsItem(model, hasPages) {
  const file = join(model.root, 'robots.txt');
  if (!existsSync(file))
    return makeItem({
      id: 'seo-robots',
      area,
      status: 'warn',
      title: 'No robots.txt in the build',
      fix: 'Add public/robots.txt (`User-agent: *`, `Allow: /`); the build adds the `Sitemap:` line when `site` is set.',
    });
  const { groups, sitemaps } = parseRobots(readFileSync(file, 'utf8'));
  const blocking = groups.filter(
    (g) =>
      g.agents.some((a) => a === '*' || a === 'googlebot') &&
      g.rules.some(([k, v]) => k === 'disallow' && v === '/') &&
      !g.rules.some(([k, v]) => k === 'allow' && v === '/'),
  );
  if (blocking.length && hasPages)
    return makeItem({
      id: 'seo-robots',
      area,
      status: 'fail',
      title: 'robots.txt disallows the whole site, and it has indexable pages',
      evidence: blocking.map(
        (g) => `User-agent: ${g.agents.join(', ')} with Disallow: /`,
      ),
      fix: 'Remove `Disallow: /` from public/robots.txt. To keep a prospect landing out of search, rely on `noindex` pages until it is sold.',
    });
  if (!sitemaps.length)
    return makeItem({
      id: 'seo-robots',
      area,
      status: 'warn',
      title: 'robots.txt has no Sitemap line',
      fix: 'Set `site` in astro.config.mjs and rebuild: the build appends `Sitemap: <site>/sitemap.xml`.',
    });
  return makeItem({
    id: 'seo-robots',
    area,
    status: 'pass',
    title: `robots.txt allows crawling and names the sitemap (${sitemaps[0]})`,
  });
}

// --- Keyword ------------------------------------------------------------------------------------------------------

function keywordItem(pages, facts, brief) {
  const keyword = (brief?.seo?.primaryKeyword ?? '').trim();
  if (!keyword)
    return makeItem({
      id: 'seo-keyword',
      area,
      status: 'na',
      title:
        'Not applicable: the brief names no primary keyword (seo.primaryKeyword)',
    });
  const home = pages.find((p) => p.path === '/') ?? pages[0];
  const f = facts.get(home.path);
  const where = [
    ['title', f.title],
    ['h1', f.h1s.join(' ')],
    ['description', f.description],
  ];
  const lacking = where
    .filter(([, text]) => !containsKeyword(text, keyword))
    .map(([name]) => name);
  return lacking.length
    ? makeItem({
        id: 'seo-keyword',
        area,
        status: 'warn',
        title: `The primary keyword "${keyword}" is missing from the ${lacking.join(', ')} of ${home.path}`,
        evidence: where.map(([name, text]) => `${name}: "${quote(text)}"`),
        fix: 'Work the keyword into the title, the h1 and the description in natural words (accents and case do not matter); do not repeat it to stuff the page.',
      })
    : makeItem({
        id: 'seo-keyword',
        area,
        status: 'pass',
        title: `The primary keyword "${keyword}" is in the title, h1 and description of ${home.path}`,
      });
}

// --- Entry point --------------------------------------------------------------------------------------------------

const NA = (id, reason) =>
  makeItem({ id, area, status: 'na', title: `Not applicable: ${reason}` });
export const SEO_IDS = [
  'seo-title',
  'seo-description',
  'seo-h1',
  'seo-canonical',
  'seo-open-graph',
  'seo-structured-data',
  'seo-sitemap',
  'seo-robots',
  'seo-keyword',
];

/**
 * The SEO items for a loaded dist model. `brief` is the parsed brief.json or null; `config` is `report.seo`
 * (titleMin, titleMax, descriptionMin, descriptionMax).
 */
export function seoItems({ model, brief = null, config }) {
  const pages = indexablePages(model);
  if (!pages.length)
    return SEO_IDS.map((id) =>
      NA(id, 'the build has no indexable page (every page is noindex)'),
    );
  const facts = new Map(pages.map((p) => [p.path, pageFacts(p)]));
  return [
    lengthItem({
      id: 'seo-title',
      label: 'title',
      field: 'title',
      pages,
      facts,
      min: config.titleMin,
      max: config.titleMax,
      fixField: 'Pass `title` to BaseLayout.',
    }),
    lengthItem({
      id: 'seo-description',
      label: 'meta description',
      field: 'description',
      pages,
      facts,
      min: config.descriptionMin,
      max: config.descriptionMax,
      fixField: 'Pass `description` to BaseLayout.',
    }),
    h1Item(pages, facts),
    canonicalItem(pages, facts),
    openGraphItem(pages),
    structuredDataItem(pages, brief),
    sitemapItem(model, pages),
    robotsItem(model, true),
    keywordItem(pages, facts, brief),
  ];
}
