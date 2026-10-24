// The `legal` area of the landing report: cookies and trackers, third-party hosts, the legal pages a market
// requires and price claims. These checks support compliance and are NOT legal advice.
// Design: openspec/changes/add-legal-compliance/design.md.
import { classifyUrl, resolveLocal } from './dist-scan.mjs';
import { cap, makeItem } from './items.mjs';
import {
  LEGAL_PATHS,
  NEEDS_CONSENT,
  PRICE_CLAIM_PATTERNS,
  PRICE_LIKE,
  classifyHost,
  classifyName,
  isEuMarket,
  rulesForMarkets,
} from './legal-rules.mjs';
import { isExecutableScript } from './html.mjs';

export const LEGAL_NOTE =
  'The legal checks and the generated legal pages support compliance and are not legal advice. Have a lawyer review them before you publish in production.';

const LOADED_KINDS = new Set([
  'script',
  'style',
  'asset',
  'media',
  'frame',
  'css',
  'preconnect',
]);

const KIND_LABEL = {
  analytics: 'analytics',
  advertising: 'advertising',
  embed: 'embed that sets cookies',
  cdn: 'font or CDN',
  cookieless: 'cookieless analytics',
};

const PAGE_LABEL = { notice: 'legal notice', privacy: 'privacy policy' };

// --- Text helpers -----------------------------------------------------------------------------------------

const NAMED = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  euro: '€',
  pound: '£',
  ndash: '–',
  mdash: '—',
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const code =
        body[1].toLowerCase() === 'x'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED[body.toLowerCase()] ?? match;
  });
}

/** Visible text of a built page: no scripts, styles, templates or comments, entities decoded, whitespace collapsed. */
export function htmlText(html) {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(stripped).replace(/\s+/g, ' ').trim();
}

const norm = (text) =>
  decodeEntities(String(text ?? ''))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const blank = (value) => typeof value !== 'string' || value.trim() === '';

// --- Build evidence ---------------------------------------------------------------------------------------

/**
 * Every external resource a page loads, as { page, line, tag, url, host, kind, gated, category }.
 * `gated` is true for an inert placeholder: a `<script type="text/plain" data-consent>` or a `data-consent-src`.
 */
export function externalLoads(model, extra = []) {
  const loads = [];
  const add = (page, line, tag, url, kind, gated) => {
    const target = classifyUrl(model, url, page.path);
    if (target.type !== 'external') return;
    const host = new URL(target.url).hostname;
    const hit = classifyHost(target.url, extra);
    loads.push({
      page: page.path,
      line,
      tag,
      url: target.url,
      host,
      kind,
      gated,
      category: hit?.category ?? null,
    });
  };
  for (const page of model.pages) {
    const tags = page.scan.tags;
    for (const ref of page.refs) {
      if (!LOADED_KINDS.has(ref.kind)) continue;
      const tag = tags[ref.tagIndex];
      const gated =
        tag?.name === 'script' &&
        /^text\/plain$/i.test((tag.attrs.type ?? '').trim()) &&
        'data-consent' in tag.attrs;
      add(page, ref.line, ref.tag, ref.url, ref.kind, gated);
    }
    for (const tag of tags)
      if (tag.attrs['data-consent-src'])
        add(
          page,
          tag.line,
          tag.name,
          tag.attrs['data-consent-src'],
          'frame',
          true,
        );
    // URLs of known hosts inside inline scripts (a tag manager snippet builds its script URL there).
    for (const script of page.scan.scripts) {
      if (script.attrs.src) continue;
      const gated =
        /^text\/plain$/i.test((script.attrs.type ?? '').trim()) &&
        'data-consent' in script.attrs;
      if (!gated && !isExecutableScript(script.attrs)) continue;
      for (const found of script.text.matchAll(
        /(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s'"`)<>]*/gi,
      )) {
        const url = found[0];
        if (!classifyHost(url, extra)) continue;
        add(page, script.line, 'script', url, 'script', gated);
      }
    }
    for (const style of page.scan.styles)
      for (const found of style.text.matchAll(/url\(\s*["']?([^)"']+)/gi))
        add(page, style.line, 'style', found[1], 'css', false);
  }
  for (const css of model.stylesheets)
    for (const url of css.urls)
      add({ path: css.path }, null, 'css', url, 'css', false);
  return loads;
}

const where = (load) =>
  `${load.page}${load.line ? `:${load.line}` : ''} <${load.tag}>`;

// --- Runtime evidence (QA privacy record) ---------------------------------------------------------------

/** Pages of a loaded QA report that carry a privacy record, or a reason there are none. */
function privacyRecords(qa) {
  if (!qa || qa.problem)
    return { records: [], reason: qa?.problem ?? 'no QA report' };
  const records = (qa.report?.pages ?? [])
    .filter((page) => page.privacy)
    .map((page) => ({ page: page.path, ...page.privacy }));
  return records.length
    ? { records, reason: null }
    : {
        records,
        reason:
          'the QA report has no privacy record (the layout check was skipped or QA is older than this report): run QA again',
      };
}

// --- Items --------------------------------------------------------------------------------------------------

/** legal-cookies */
export function cookiesItem({ loads, qa, config }) {
  const fails = [];
  const warns = [];
  const cookieless = new Set();
  const seen = new Set();
  const flagged = new Map(); // `${page} ${host}` -> true when the build already failed it

  for (const load of loads) {
    if (load.category === 'cookieless') cookieless.add(load.host);
    if (!NEEDS_CONSENT.has(load.category)) continue;
    const key = `${load.page} ${load.host} ${load.gated}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = KIND_LABEL[load.category];
    if (load.gated) {
      warns.push(
        `${where(load)} ${load.host} (${label}) is inert until consent; verify the consent mechanism blocks it before the visitor accepts`,
      );
      flagged.set(`${load.page} ${load.host}`, 'gated');
    } else {
      fails.push(
        `${where(load)} loads ${load.host} (${label}) with no consent`,
      );
      flagged.set(`${load.page} ${load.host}`, 'loaded');
    }
  }

  const { records, reason } = privacyRecords(qa);
  for (const record of records) {
    for (const cookie of record.cookies) {
      const kind = classifyName(cookie.name, config.essentialCookies);
      if (kind === 'non-essential')
        fails.push(
          `${record.page} cookie ${cookie.name} (${cookie.domain}) is set at first load, before any consent`,
        );
      else if (kind === 'unknown')
        warns.push(
          `${record.page} cookie ${cookie.name} (${cookie.domain}) is not classified: decide whether it is strictly necessary`,
        );
    }
    for (const [store, keys] of [
      ['localStorage', record.storage.local],
      ['sessionStorage', record.storage.session],
    ])
      for (const key of keys) {
        const kind = classifyName(key, config.essentialStorageKeys);
        if (kind === 'non-essential')
          fails.push(
            `${record.page} ${store} key ${key} is set at first load, before any consent`,
          );
        else if (kind === 'unknown')
          warns.push(
            `${record.page} ${store} key ${key} is not classified: decide whether it is strictly necessary`,
          );
      }
    for (const host of record.thirdPartyHosts) {
      const hit = classifyHost(host, config.trackers);
      if (!hit || !NEEDS_CONSENT.has(hit.category)) continue;
      const state = flagged.get(`${record.page} ${host}`);
      if (state === 'loaded') continue;
      fails.push(
        `${record.page} requested ${host} (${KIND_LABEL[hit.category]}) at first load${state === 'gated' ? ', although the build marks it as gated' : ''}`,
      );
    }
  }

  const evidence = [...fails, ...warns];
  for (const host of [...cookieless].sort())
    evidence.push(
      `${host}: cookieless analytics; list it in the privacy policy`,
    );
  if (reason)
    evidence.push(`runtime cookies and storage not checked: ${reason}`);

  if (fails.length)
    return makeItem({
      id: 'legal-cookies',
      area: 'legal',
      status: 'fail',
      title: `${fails.length} cookie(s), storage key(s) or tracker(s) load before any consent`,
      evidence: cap(evidence),
      fix: 'Remove the tracker, switch to a cookieless alternative (for example Plausible or Cloudflare Web Analytics), or load it only after consent: `<script type="text/plain" data-consent="analytics" src="...">` or an embed placeholder with `data-consent-src`. Consent must come before the cookie.',
    });
  if (warns.length)
    return makeItem({
      id: 'legal-cookies',
      area: 'legal',
      status: 'warn',
      title: `${warns.length} consent-gated tracker(s) or unclassified cookie(s) to review`,
      evidence: cap(evidence),
      fix: 'Check that the consent mechanism keeps gated scripts inert until the visitor accepts. List a strictly necessary cookie or key in `legal.essentialCookies` or `legal.essentialStorageKeys` of qa.config.json; remove the others.',
    });
  if (reason)
    return makeItem({
      id: 'legal-cookies',
      area: 'legal',
      status: 'not-run',
      title:
        'The build loads no tracker; cookies and storage at runtime were not checked',
      evidence: cap(evidence),
      fix: 'Run `npm run qa -- --site <slug>` (or `npm run qa` for the starter), then the report, on the same build.',
    });
  return makeItem({
    id: 'legal-cookies',
    area: 'legal',
    status: 'pass',
    title: 'No cookies, storage keys or trackers: no consent banner needed',
    evidence: cap(evidence),
  });
}

/** legal-third-party */
export function thirdPartyItem({ loads, qa, config, siteHost }) {
  const hosts = new Map(); // host -> { label, uses: Set }
  const note = (host, label, use) => {
    if (!hosts.has(host)) hosts.set(host, { label, uses: new Set() });
    hosts.get(host).uses.add(use);
  };
  for (const load of loads) {
    if (NEEDS_CONSENT.has(load.category) || load.gated) continue; // judged by legal-cookies
    note(
      load.host,
      load.category ? KIND_LABEL[load.category] : 'third-party host',
      `${load.page} <${load.tag}>`,
    );
  }
  const { records, reason } = privacyRecords(qa);
  for (const record of records)
    for (const host of record.thirdPartyHosts) {
      if (host === siteHost) continue;
      const hit = classifyHost(host, config.trackers);
      if (hit && NEEDS_CONSENT.has(hit.category)) continue;
      note(
        host,
        hit ? KIND_LABEL[hit.category] : 'third-party host',
        `${record.page} (requested at runtime)`,
      );
    }
  if (!hosts.size)
    return makeItem({
      id: 'legal-third-party',
      area: 'legal',
      status: 'pass',
      title: reason
        ? 'No third-party host in the build (runtime requests not checked)'
        : 'No third-party host receives the visitor IP address',
      evidence: reason ? [`runtime requests not checked: ${reason}`] : [],
    });
  const evidence = [...hosts]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(
      ([host, { label, uses }]) =>
        `${host} (${label}) used by ${[...uses].slice(0, 3).join(', ')}${uses.size > 3 ? `, and ${uses.size - 3} more` : ''}`,
    );
  if (reason) evidence.push(`runtime requests not checked: ${reason}`);
  return makeItem({
    id: 'legal-third-party',
    area: 'legal',
    status: 'warn',
    title: `${hosts.size} third-party host(s) receive the visitor IP address`,
    evidence: cap(evidence),
    fix: 'Self-host the font, style, script or image (copy it into the site), or name the host in the privacy policy.',
  });
}

// --- Legal pages ---------------------------------------------------------------------------------------------

/** Built pages by legal kind: { notice: [page], privacy: [page] }, found by `data-legal-page` or by path. */
export function findLegalPages(model) {
  const found = { notice: [], privacy: [] };
  for (const page of model.pages) {
    const kinds = new Set();
    for (const tag of page.scan.tags) {
      const kind = tag.attrs['data-legal-page'];
      if (kind === 'notice' || kind === 'privacy') kinds.add(kind);
    }
    const byPath = LEGAL_PATHS[page.path.replace(/\/+$/, '')];
    if (byPath) kinds.add(byPath);
    for (const kind of kinds) found[kind].push(page);
  }
  return found;
}

/** legal-pages */
export function pagesItem({ model, brief, briefProblem, siteCommand }) {
  const unknown = (title, evidence) =>
    makeItem({
      id: 'legal-pages',
      area: 'legal',
      status: 'warn',
      title,
      evidence,
      fix: `Name the markets in the brief (\`legal.markets\`, for example ["ES"] or ["EU"]) with /brief-intake, then run \`${siteCommand}\` and add the pages it lists. Until then the legal requirements of this landing are unknown.`,
    });
  if (!brief)
    return unknown(
      'No brief with a market: the legal requirements of this landing are unknown',
      [briefProblem ?? 'no brief.json for this landing'],
    );
  const markets = (brief.legal?.markets ?? []).filter((m) => !blank(m));
  if (!markets.length)
    return unknown(
      'The brief names no market: the legal requirements of this landing are unknown',
      ['legal.markets is empty'],
    );
  const rules = rulesForMarkets(markets);
  if (!rules.covered.length)
    return unknown(
      `No rule set for ${markets.join(', ')}: the legal requirements are unknown`,
      markets.map((m) => `no rule set for ${m}`),
    );

  const holder = brief.legal?.holder ?? {};
  const privacyContact = brief.legal?.privacyContact ?? '';
  const problems = [];
  const notes = rules.unknown.map(
    (m) => `no rule set for ${m}: its requirements are unknown`,
  );

  for (const field of rules.holder)
    if (blank(holder[field]))
      problems.push(`brief legal.holder.${field} is empty`);
  if (
    rules.emailOrPrivacyContact &&
    blank(holder.email) &&
    blank(privacyContact)
  )
    problems.push(
      'brief legal.holder.email and legal.privacyContact are empty',
    );
  if (rules.registerWarning && blank(holder.register))
    notes.push(
      'legal.holder.register is empty: required when the holder is a company',
    );

  const found = findLegalPages(model);
  for (const kind of rules.pages)
    if (!found[kind].length)
      problems.push(
        `no ${PAGE_LABEL[kind]} page in the build (a page with data-legal-page="${kind}" or at ${kind === 'notice' ? '/legal-notice/ or /aviso-legal/' : '/privacy/ or /privacidad/'})`,
      );

  for (const page of model.pages)
    for (const tag of page.scan.tags)
      if ('data-legal-pending' in tag.attrs)
        problems.push(
          `${page.path}:${tag.line} still shows the pending-review marker${tag.attrs['data-legal-pending'] ? ` for ${tag.attrs['data-legal-pending']}` : ''}`,
        );

  // Holder data shown on the pages: the notice shows every required field, the policy the name and a contact.
  for (const kind of rules.pages) {
    for (const page of found[kind]) {
      const text = norm(htmlText(page.html));
      const wanted =
        kind === 'notice'
          ? rules.holder.map((field) => [`holder.${field}`, holder[field]])
          : [
              ['holder.name', holder.name],
              [
                'privacy contact',
                blank(privacyContact) ? holder.email : privacyContact,
              ],
            ];
      for (const [label, value] of wanted)
        if (!blank(value) && !text.includes(norm(value)))
          problems.push(`${page.path} does not show ${label} from the brief`);
    }
  }

  // Every page links to every required legal page.
  const linked = new Set();
  const pagesToCheck = model.pages.filter((p) => p.file !== '404.html');
  for (const kind of rules.pages) {
    const targets = new Set(found[kind].map((p) => p.file));
    if (!targets.size) continue;
    for (const page of pagesToCheck) {
      if (targets.has(page.file)) continue;
      const hasLink = page.refs.some((ref) => {
        if (ref.kind !== 'link') return false;
        const target = classifyUrl(model, ref.url, page.path);
        return (
          target.type === 'internal' &&
          targets.has(resolveLocal(model, target.path))
        );
      });
      if (hasLink) linked.add(`${kind} ${page.path}`);
      else
        problems.push(
          `${page.path} has no link to the ${PAGE_LABEL[kind]} (${found[kind][0].path})`,
        );
    }
  }

  const present = rules.pages.map((k) => PAGE_LABEL[k]).join(' and ');
  if (problems.length)
    return makeItem({
      id: 'legal-pages',
      area: 'legal',
      status: 'fail',
      title: `${problems.length} legal page problem(s) for ${rules.covered.join(', ')}`,
      evidence: cap([...problems, ...notes]),
      fix: `Fill the missing fields in \`legal\` of the brief (holder identity is never assumed), run \`${siteCommand}\`, add the ${present} pages and link them from every page footer. A pending-review marker means a required value is missing from the brief.`,
    });
  if (notes.length)
    return makeItem({
      id: 'legal-pages',
      area: 'legal',
      status: 'warn',
      title: `Legal pages for ${rules.covered.join(', ')} are in place; ${notes.length} point(s) to review`,
      evidence: cap(notes),
      fix: 'Add the missing holder data, or confirm it does not apply (a register entry is only for companies). Markets without a rule set need their own review.',
    });
  return makeItem({
    id: 'legal-pages',
    area: 'legal',
    status: 'pass',
    title: `Legal pages for ${rules.covered.join(', ')}: ${present} present, linked from ${pagesToCheck.length} page(s), holder data shown`,
    evidence: [],
  });
}

// --- Price claims -------------------------------------------------------------------------------------------

const snippetAround = (text, index, length) => {
  let start = Math.max(0, index - 15);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    start = space !== -1 && space < index ? space + 1 : start;
  }
  const slice = text.slice(start, index + length + 25).trim();
  return slice.length > 80 ? `${slice.slice(0, 77)}...` : slice;
};

/** Claims of one page: [{ text }] from discount words, was/now pairs and struck-through prices. */
export function priceClaims(page) {
  const text = htmlText(page.html);
  const claims = [];
  for (const pattern of PRICE_CLAIM_PATTERNS)
    for (const match of text.matchAll(pattern))
      claims.push({
        index: match.index,
        text: snippetAround(text, match.index, match[0].length),
      });
  for (const match of page.html.matchAll(
    /<(s|del|strike)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi,
  )) {
    const inner = htmlText(match[2]);
    if (PRICE_LIKE.test(inner))
      claims.push({
        index: -1,
        text: `struck-through price: ${inner.slice(0, 60)}`,
      });
  }
  const seen = new Set();
  return claims.filter((c) => !seen.has(c.text) && seen.add(c.text));
}

/** legal-price-claims */
export function priceClaimsItem({ model, brief }) {
  const markets = (brief?.legal?.markets ?? []).filter((m) => !blank(m));
  const eu = markets.some(isEuMarket);
  const evidence = [];
  for (const page of model.pages)
    for (const claim of priceClaims(page))
      evidence.push(`${page.path}: ${claim.text}`);
  if (!evidence.length)
    return makeItem({
      id: 'legal-price-claims',
      area: 'legal',
      status: 'pass',
      title:
        'No discount percentage, struck-through price or was/now price in the pages',
    });
  return makeItem({
    id: 'legal-price-claims',
    area: 'legal',
    status: 'warn',
    title: `${evidence.length} price claim(s) to review`,
    evidence: cap(evidence),
    fix: eu
      ? 'Check each claim with the person who sets the prices. In the EU a price reduction must refer to the lowest price applied in the 30 days before it (Price Indication Directive, Article 6a); keep that price on record or remove the claim.'
      : 'Check each claim is true and lawful in your market. In the EU a price reduction must refer to the lowest price applied in the 30 days before it.',
  });
}

/**
 * The four legal items.
 * @param {object} o
 * @param {object} o.model         loadDist() result
 * @param {object|null} o.brief    parsed brief.json, or null
 * @param {string|null} o.briefProblem  why there is no brief (shown as evidence)
 * @param {object|null} o.qa       loadQaReport() result ({ report, path } or { problem }), or null
 * @param {object} o.config        the `legal` section of the QA config
 * @param {string} o.siteCommand   the generator command to name in fixes
 */
export function legalItems({
  model,
  brief,
  briefProblem,
  qa,
  config,
  siteCommand,
}) {
  const loads = externalLoads(model, config.trackers);
  let siteHost = null;
  try {
    siteHost = model.siteOrigin ? new URL(model.siteOrigin).hostname : null;
  } catch {
    siteHost = null;
  }
  return [
    cookiesItem({ loads, qa, config }),
    thirdPartyItem({ loads, qa, config, siteHost }),
    pagesItem({ model, brief, briefProblem, siteCommand }),
    priceClaimsItem({ model, brief }),
  ];
}
