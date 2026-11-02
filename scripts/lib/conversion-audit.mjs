// Heuristic conversion audit of a built landing (design: add-neuromarketing-review, Decision 4). It reads
// sites/<slug>/dist/ and brief.json, starts no browser and writes nothing. Every finding is a warning or info
// because these are heuristics: a person (or the review round of /new-landing) looks at the page and decides.
//
// Sections are the direct children of <main> that are a <section> or carry an id; the hero is the first, the
// closing section the last. A multi-locale site is audited on each locale's home page.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  builtPages,
  hrefsOf,
  htmlToText,
  isLegalPage,
} from '../check-landing.mjs';
import { LEGAL_PATHS } from '../report/legal-rules.mjs';
import { foldText } from './copy-claims.mjs';
import {
  closest,
  elementChildren,
  findAll,
  parseTree,
  selectorOf,
  textOf,
} from './html-tree.mjs';
import { localeIndexFile, readI18nConfig } from './i18n-site.mjs';
import { SLUG_PATTERN } from './sites.mjs';

export class AuditError extends Error {}

export const LIMITS = {
  /** Distinct call-to-action destinations in <main> before the audit warns. */
  maxDestinations: 3,
  /** Visible fields in one form before the audit warns. */
  maxFormFields: 5,
  /** Offers shown side by side before the audit warns. */
  maxOffers: 3,
};

/** A link without its trailing slash, fragment-free comparison aside: `utm_*` tracking parameters are dropped. */
const trimSlash = (url) => {
  const [base, query = ''] = url.split('?');
  const kept = query.split('&').filter((p) => p && !/^utm_[a-z_]+=?/i.test(p));
  return base.replace(/\/+$/, '') + (kept.length ? `?${kept.join('&')}` : '');
};
const squash = (text) => foldText(text).replace(/\s+/g, ' ').trim();
const digitsOnly = (text) => String(text).replace(/[\s().+-]/g, '');

/** A price: a currency symbol or code next to a number. */
const PRICE =
  /(?:[$€£]\s?\d[\d.,]*|\d[\d.,]*\s?(?:€|\$|£|EUR\b|USD\b|GBP\b|euros?\b|dollars?\b|d[oó]lares?\b))/i;
/** Star-rating markup: star glyphs, or an aria-label such as "5 stars" or "4,8 estrellas" or "rating". */
const STAR_GLYPH = /[★⭐]/;
const STAR_LABEL =
  /\b\d(?:[.,]\d)?\s*(?:\/\s*5\s*)?(?:stars?|estrellas?)\b|\brating\b/i;

/** Direct children of <main> that are a section or have an id (one wrapper level is looked through). */
export function sectionsOf(main) {
  const pick = (node) =>
    elementChildren(node).filter((n) => n.name === 'section' || n.attrs.id);
  let sections = pick(main);
  if (!sections.length) {
    const kids = elementChildren(main).filter((n) => n.name !== 'script');
    if (kids.length === 1) sections = pick(kids[0]);
  }
  return sections;
}

const linksIn = (node) =>
  findAll(node, (n) => n.name === 'a' && typeof n.attrs.href === 'string');

/** Page path of a built file: `/es/` for dist/es/index.html. */
const pagePath = (file) => `/${file.replace(/index\.html$/, '')}`;

const localeOf = (config, path) => {
  const first = path.split('/')[1];
  return config?.locales.includes(first)
    ? first
    : (config?.defaultLocale ?? '');
};

/** The pathname of a link as seen from `page`, or null for an in-page anchor, mailto:, tel: and scripts. */
function destinationOf(href, page) {
  const value = href.trim();
  if (
    !value ||
    value.startsWith('#') ||
    /^(?:mailto:|tel:|javascript:)/i.test(value)
  )
    return null;
  if (/^https?:\/\//i.test(value) || value.startsWith('//')) {
    return trimSlash(value.replace(/#.*$/, ''));
  }
  const path = value.replace(/[?#].*$/, '');
  if (!path) return null;
  const absolute = path.startsWith('/')
    ? path
    : `${page.replace(/[^/]*$/, '')}${path}`;
  return trimSlash(absolute) === trimSlash(page)
    ? null
    : trimSlash(absolute) || '/';
}

const isLegalDestination = (destination) => {
  const path = destination.replace(/^https?:\/\/[^/]+/i, '');
  return Object.keys(LEGAL_PATHS).some((suffix) => path.endsWith(suffix));
};

/** Visible form fields: text-like inputs, textareas and selects; hidden, honeypot, checkbox and radio inputs are not counted. */
function visibleFields(form) {
  return findAll(form, (n) => {
    if (!['input', 'textarea', 'select'].includes(n.name)) return false;
    const type = (n.attrs.type ?? 'text').toLowerCase();
    if (
      n.name === 'input' &&
      [
        'hidden',
        'submit',
        'button',
        'reset',
        'image',
        'checkbox',
        'radio',
      ].includes(type)
    )
      return false;
    if (/botcheck|honeypot/i.test(n.attrs.name ?? '')) return false;
    const hidden = (el) =>
      'hidden' in el.attrs ||
      el.attrs['aria-hidden'] === 'true' ||
      /display\s*:\s*none/i.test(el.attrs.style ?? '');
    return !(hidden(n) || closest(n, (up) => up !== form && hidden(up)));
  });
}

/** The largest group of siblings in the section that each hold a price: [{ count, parent }] or null. */
function offerGroup(section) {
  let best = null;
  const visit = (node) => {
    const kids = elementChildren(node);
    const priced = kids.filter((k) => PRICE.test(textOf(k)));
    if (priced.length >= 2 && (!best || priced.length > best.count))
      best = { count: priced.length, parent: node };
    for (const kid of kids) visit(kid);
  };
  visit(section);
  return best;
}

const briefFields = (brief) => {
  const assumed = new Set(
    (Array.isArray(brief?.assumed) ? brief.assumed : []).map((a) => a.field),
  );
  return (path, value) =>
    typeof value === 'string' && value.trim() && !assumed.has(path)
      ? value.trim()
      : null;
};

/** Audit one built page. Returns { page, locale, sections, findings }. */
export function auditPage({ page, html, brief, legalPages, config }) {
  const tree = parseTree(html);
  const locale = config ? localeOf(config, page) : null;
  const findings = [];
  const add = (id, level, selector, message) =>
    findings.push({ id, level, page, selector, message });
  const main =
    findAll(tree, (n) => n.name === 'main')[0] ??
    findAll(tree, (n) => n.name === 'body')[0] ??
    tree;
  const sections = sectionsOf(main);
  const hero = sections[0] ?? null;
  const closing = sections.length > 1 ? sections[sections.length - 1] : null;
  const primaryUrl = briefFields(brief)(
    'goal.primary.url',
    brief?.goal?.primary?.url,
  );
  const primaryLabel = brief?.goal?.primary?.label;

  // hero-h1, hero-cta, closing-cta
  if (!hero)
    add(
      'hero-h1',
      'warn',
      'main',
      'no section found in <main>; the hero could not be located',
    );
  else {
    if (!findAll(hero, (n) => n.name === 'h1').length)
      add(
        'hero-h1',
        'warn',
        selectorOf(hero),
        'the first section has no <h1>; the visitor should read the main promise first',
      );
    const heroLinks = linksIn(hero);
    const heroHasCta = primaryUrl
      ? heroLinks.some((a) => trimSlash(a.attrs.href) === trimSlash(primaryUrl))
      : heroLinks.length > 0;
    if (!heroHasCta)
      add(
        'hero-cta',
        'warn',
        selectorOf(hero),
        primaryUrl
          ? `the first section has no link to the primary call to action (${primaryUrl}${primaryLabel ? `, "${primaryLabel}"` : ''})`
          : 'the first section has no link; there is no brief, so any call to action would do',
      );
  }
  if (!closing)
    add(
      'closing-cta',
      'warn',
      selectorOf(hero ?? main),
      'the page has a single section, so there is no closing section to repeat the call to action',
    );
  else {
    const closingLinks = linksIn(closing);
    const closingHasCta = primaryUrl
      ? closingLinks.some(
          (a) => trimSlash(a.attrs.href) === trimSlash(primaryUrl),
        )
      : closingLinks.length > 0;
    if (!closingHasCta)
      add(
        'closing-cta',
        'warn',
        selectorOf(closing),
        primaryUrl
          ? `the last section before the footer has no link to the primary call to action (${primaryUrl}); the page should end on the action`
          : 'the last section before the footer has no link',
      );
  }

  // cta-destinations
  const destinations = new Set();
  for (const a of linksIn(main)) {
    const destination = destinationOf(a.attrs.href, page);
    if (destination && !isLegalDestination(destination))
      destinations.add(destination);
  }
  if (destinations.size > LIMITS.maxDestinations)
    add(
      'cta-destinations',
      'warn',
      'main',
      `${destinations.size} distinct link destinations in <main> (more than ${LIMITS.maxDestinations}): ${[...destinations].slice(0, 8).join(', ')}; one primary action converts best`,
    );

  // form-fields
  for (const form of findAll(main, (n) => n.name === 'form')) {
    const count = visibleFields(form).length;
    if (count > LIMITS.maxFormFields)
      add(
        'form-fields',
        'warn',
        selectorOf(form),
        `a form with ${count} visible fields (more than ${LIMITS.maxFormFields}); every field costs completions`,
      );
  }

  // offers-side-by-side
  for (const section of sections) {
    const group = offerGroup(section);
    if (group && group.count > LIMITS.maxOffers)
      add(
        'offers-side-by-side',
        'warn',
        selectorOf(section),
        `${group.count} items with a price side by side in ${selectorOf(section)} (more than ${LIMITS.maxOffers}); a visitor compares fewer options more easily`,
      );
  }

  const pageText = squash(htmlToText(html));

  // proof-shown, proof-without-brief
  const proof = Array.isArray(brief?.proof) ? brief.proof : [];
  proof.forEach((entry, index) => {
    const found = pageText.includes(squash(entry.text ?? ''));
    add(
      'proof-shown',
      'info',
      `proof[${index}]`,
      `proof[${index}] (${entry.kind}) ${found ? 'is on the page' : 'is not on the page'}`,
    );
  });
  if (!proof.length) {
    const kinds = [];
    if (
      findAll(
        main,
        (n) => n.name === 'blockquote' || 'data-testimonial' in n.attrs,
      ).length
    )
      kinds.push('a quoted testimonial (blockquote or data-testimonial)');
    const stars =
      STAR_GLYPH.test(textOf(main)) ||
      findAll(main, (n) => STAR_LABEL.test(n.attrs['aria-label'] ?? '')).length;
    if (stars) kinds.push('star-rating markup');
    for (const kind of kinds)
      add(
        'proof-without-brief',
        'warn',
        'main',
        `${kind} on a page whose brief has no proof; the page may show only the customer's own proof`,
      );
  }

  // contact-visible
  const field = briefFields(brief);
  const hrefs = hrefsOf(html);
  const contact = brief?.contact ?? {};
  const email = field('contact.email', contact.email);
  if (
    email &&
    !pageText.includes(email.toLowerCase()) &&
    !hrefs.some((h) =>
      h.toLowerCase().startsWith(`mailto:${email.toLowerCase()}`),
    )
  )
    add(
      'contact-visible',
      'warn',
      'contact.email',
      `the brief's email (${email}) is not on the page`,
    );
  const phone = field('contact.phone', contact.phone);
  if (
    phone &&
    !digitsOnly(htmlToText(html)).includes(digitsOnly(phone)) &&
    !hrefs.some(
      (h) =>
        /^tel:/i.test(h) && digitsOnly(h.slice(4)).includes(digitsOnly(phone)),
    )
  )
    add(
      'contact-visible',
      'warn',
      'contact.phone',
      `the brief's phone (${phone}) is not on the page`,
    );
  const address = field('contact.address', contact.address);
  if (address && !pageText.includes(squash(address)))
    add(
      'contact-visible',
      'warn',
      'contact.address',
      `the brief's address (${address}) is not on the page`,
    );

  // legal-linked
  const linked = new Set(
    hrefs
      .map((h) => destinationOf(h, page))
      .filter(Boolean)
      .map((d) => d.replace(/^https?:\/\/[^/]+/i, '')),
  );
  const mine = legalPages.filter(
    (legal) => !config || localeOf(config, legal) === locale,
  );
  if (!mine.length)
    add(
      'legal-linked',
      'info',
      'footer',
      'no legal page was built for this page',
    );
  else {
    const missing = mine.filter(
      (legal) => !linked.has(trimSlash(legal) || '/'),
    );
    add(
      'legal-linked',
      'info',
      'footer',
      missing.length
        ? `legal pages not linked from this page: ${missing.join(', ')}`
        : `legal pages linked: ${mine.join(', ')}`,
    );
  }

  return { page, locale, sections: sections.length, findings };
}

/** Audit a site. Throws AuditError for a bad slug, a missing site, an unreadable brief or a missing build. */
export function auditSite({ root, slug }) {
  if (!SLUG_PATTERN.test(slug ?? ''))
    throw new AuditError(`invalid site slug "${slug}"`);
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(join(siteDir, 'package.json')))
    throw new AuditError(`sites/${slug} is not a site`);
  const dist = join(siteDir, 'dist');
  if (!existsSync(join(dist, 'index.html')))
    throw new AuditError(
      `sites/${slug}/dist/index.html does not exist; build first (npm run build -w site-${slug})`,
    );
  let brief = null;
  const briefPath = join(siteDir, 'brief.json');
  if (existsSync(briefPath))
    try {
      brief = JSON.parse(readFileSync(briefPath, 'utf8'));
    } catch (error) {
      throw new AuditError(
        `sites/${slug}/brief.json is not valid JSON: ${error.message}`,
      );
    }
  const i18n = readI18nConfig(siteDir);
  const config =
    i18n && !i18n.problems.length && i18n.locales.length ? i18n : null;
  const files = config
    ? config.locales.map((locale) => localeIndexFile(config, locale))
    : ['index.html'];
  for (const file of files)
    if (!existsSync(join(dist, file)) || !statSync(join(dist, file)).isFile())
      throw new AuditError(
        `sites/${slug}/dist/${file} does not exist; build first (npm run build -w site-${slug})`,
      );
  const legalPages = builtPages(siteDir)
    .map((p) => p.page)
    .filter((page) =>
      isLegalPage(page, readFileSync(join(dist, page.slice(1)), 'utf8')),
    )
    .map((page) => pagePath(page.slice(1)));
  const pages = files.map((file) =>
    auditPage({
      page: pagePath(file),
      html: readFileSync(join(dist, file), 'utf8'),
      brief,
      legalPages,
      config,
    }),
  );
  return {
    site: slug,
    brief: brief ? 'brief.json' : null,
    pages: pages.map(({ page, locale, sections }) => ({
      page,
      locale,
      sections,
    })),
    findings: pages.flatMap((p) => p.findings),
  };
}

export function formatAudit(result) {
  const lines = [
    `conversion-audit ${result.site}: ${result.findings.filter((f) => f.level === 'warn').length} warning(s), ${result.findings.filter((f) => f.level === 'info').length} info`,
    result.brief
      ? ''
      : 'No brief: call-to-action and contact checks use defaults.',
  ].filter((l, i) => i === 0 || l);
  for (const p of result.pages) {
    lines.push('', `${p.page} (${p.sections} sections)`);
    const own = result.findings.filter((f) => f.page === p.page);
    if (!own.length) lines.push('  no findings');
    for (const f of own)
      lines.push(
        `  ${f.level === 'warn' ? 'warn' : 'info'} [${f.id}] ${f.selector}: ${f.message}`,
      );
  }
  lines.push(
    '',
    'These are heuristics: read the section screenshots (node scripts/section-shots.mjs) before changing anything.',
  );
  return lines.join('\n');
}
