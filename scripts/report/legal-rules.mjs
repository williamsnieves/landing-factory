// Rules of the `legal` area of the landing report: tracker hosts, cookie names, storage keys, market rule sets
// and the config section. These checks support compliance and are not legal advice.
// Design: openspec/changes/add-legal-compliance/design.md, Decisions 2 and 6.

// --- Config ---------------------------------------------------------------------------------------------

export const TRACKER_CATEGORIES = [
  'analytics',
  'advertising',
  'embed',
  'cdn',
  'cookieless',
];

export const LEGAL_DEFAULTS = Object.freeze({
  // Cookie names and storage keys that are strictly necessary (a trailing * matches a prefix).
  essentialCookies: ['__cf_bm', 'cf_clearance'],
  essentialStorageKeys: [],
  // Extra hosts: { host, category, path? } with a category of TRACKER_CATEGORIES. They win over the built-in list.
  trackers: [],
});

const isObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** Problems of a `legal` config section (empty array = valid). */
export function validateLegalConfig(config) {
  const errors = [];
  const err = (path, message) => errors.push(`legal.${path}: ${message}`);
  if (!isObject(config)) return ['legal: must be an object'];
  const allowed = Object.keys(LEGAL_DEFAULTS);
  for (const key of Object.keys(config))
    if (!allowed.includes(key))
      err(key, `unknown key (allowed: ${allowed.join(', ')})`);
  for (const key of ['essentialCookies', 'essentialStorageKeys'])
    if (
      !Array.isArray(config[key]) ||
      !config[key].every((n) => typeof n === 'string' && n.trim() !== '')
    )
      err(key, 'must be an array of non-empty names');
  if (!Array.isArray(config.trackers)) err('trackers', 'must be an array');
  else
    config.trackers.forEach((entry, index) => {
      if (
        !isObject(entry) ||
        typeof entry.host !== 'string' ||
        !/^[a-z0-9.-]+$/i.test(entry.host)
      )
        err(`trackers[${index}].host`, 'must be a host name such as "x.com"');
      else if (!TRACKER_CATEGORIES.includes(entry.category))
        err(
          `trackers[${index}].category`,
          `must be one of ${TRACKER_CATEGORIES.join(', ')}`,
        );
      else if ('path' in entry && typeof entry.path !== 'string')
        err(`trackers[${index}].path`, 'must be a path prefix such as "/tr"');
    });
  return errors;
}

// --- Hosts ----------------------------------------------------------------------------------------------

/**
 * Built-in hosts by category. `path` limits a rule to a path prefix. A host matches itself and its
 * subdomains (`www.youtube.com` matches `youtube.com`; `youtube-nocookie.com` does not).
 * `skipIf` is a regular expression on the full URL for which the rule does not apply.
 */
export const BUILTIN_HOSTS = [
  // Analytics
  { host: 'google-analytics.com', category: 'analytics' },
  { host: 'googletagmanager.com', category: 'analytics' },
  { host: 'analytics.google.com', category: 'analytics' },
  { host: 'clarity.ms', category: 'analytics' },
  { host: 'hotjar.com', category: 'analytics' },
  { host: 'mixpanel.com', category: 'analytics' },
  { host: 'segment.io', category: 'analytics' },
  { host: 'segment.com', category: 'analytics' },
  // Advertising pixels
  { host: 'doubleclick.net', category: 'advertising' },
  { host: 'googlesyndication.com', category: 'advertising' },
  { host: 'connect.facebook.net', category: 'advertising' },
  { host: 'facebook.com', path: '/tr', category: 'advertising' },
  { host: 'analytics.tiktok.com', category: 'advertising' },
  { host: 'snap.licdn.com', category: 'advertising' },
  { host: 'px.ads.linkedin.com', category: 'advertising' },
  { host: 'ads-twitter.com', category: 'advertising' },
  // Embeds that set cookies
  { host: 'youtube.com', category: 'embed' },
  { host: 'player.vimeo.com', category: 'embed', skipIf: /[?&]dnt=1(&|$)/ },
  { host: 'google.com', path: '/maps', category: 'embed' },
  { host: 'maps.google.com', category: 'embed' },
  { host: 'maps.googleapis.com', category: 'embed' },
  // Fonts and CDNs: no cookie, but the host receives the visitor's IP address
  { host: 'fonts.googleapis.com', category: 'cdn' },
  { host: 'fonts.gstatic.com', category: 'cdn' },
  { host: 'use.typekit.net', category: 'cdn' },
  { host: 'cdnjs.cloudflare.com', category: 'cdn' },
  { host: 'unpkg.com', category: 'cdn' },
  { host: 'cdn.jsdelivr.net', category: 'cdn' },
  // Cookieless analytics
  { host: 'plausible.io', category: 'cookieless' },
  { host: 'static.cloudflareinsights.com', category: 'cookieless' },
];

/** Does `hostname` equal `host` or end with `.host`? */
export const hostMatches = (hostname, host) => {
  const h = String(hostname).toLowerCase();
  const rule = String(host).toLowerCase();
  return h === rule || h.endsWith(`.${rule}`);
};

/**
 * Classify a URL (absolute, or `//host/...`) or a bare host name.
 * Returns { category, host, rule } with the category of TRACKER_CATEGORIES, or null for an unlisted host.
 * `extra` are the `legal.trackers` of the config; they are tried first.
 */
export function classifyHost(urlOrHost, extra = []) {
  let url;
  try {
    url = new URL(
      /^[a-z][a-z0-9+.-]*:/i.test(urlOrHost)
        ? urlOrHost
        : urlOrHost.startsWith('//')
          ? `https:${urlOrHost}`
          : `https://${urlOrHost}`,
    );
  } catch {
    return null;
  }
  for (const rule of [...extra, ...BUILTIN_HOSTS]) {
    if (!hostMatches(url.hostname, rule.host)) continue;
    if (rule.path && !url.pathname.startsWith(rule.path)) continue;
    if (rule.skipIf && rule.skipIf.test(url.href)) continue;
    return { category: rule.category, host: url.hostname, rule: rule.host };
  }
  return null;
}

/** Categories that need consent before they load: they set cookies or profile the visitor. */
export const NEEDS_CONSENT = new Set(['analytics', 'advertising', 'embed']);

// --- Cookies and storage keys -------------------------------------------------------------------------

/** Names of cookies and keys that are known to serve analytics or advertising. */
const NON_ESSENTIAL_NAMES = [
  /^_ga/,
  /^_gid$/,
  /^_gat/,
  /^_gcl_/,
  /^__utm/,
  /^_fbp$/,
  /^_fbc$/,
  /^_hj/,
  /^_clck$/,
  /^_clsk$/,
  /^IDE$/,
  /^NID$/,
  /^_tt_/,
  /^_ttp$/,
  /^_pin_/,
  /^ajs_/,
  /^mp_/,
  /^amplitude_/,
];

const nameInList = (name, list) =>
  list.some((entry) =>
    entry.endsWith('*') ? name.startsWith(entry.slice(0, -1)) : name === entry,
  );

/**
 * 'essential' (listed in the config), 'non-essential' (a known analytics or advertising name) or
 * 'unknown' (never passed silently: the report asks for a classification).
 */
export function classifyName(name, essential = []) {
  if (nameInList(name, essential)) return 'essential';
  if (NON_ESSENTIAL_NAMES.some((pattern) => pattern.test(name)))
    return 'non-essential';
  return 'unknown';
}

// --- Markets ------------------------------------------------------------------------------------------

export const EU_MEMBERS = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
];

/** `EU` or the code of an EU member state. */
export const isEuMarket = (market) =>
  market === 'EU' || EU_MEMBERS.includes(market);

/** Pages a legal rule can require. */
export const PAGE_KINDS = ['notice', 'privacy'];

const EU_RULE = {
  label: 'EU (GDPR, ePrivacy)',
  pages: ['privacy'],
  // The holder's name and an email (the holder's, or the privacy contact).
  holder: ['name'],
  emailOrPrivacyContact: true,
};
const ES_RULE = {
  label: 'Spain (LSSI-CE)',
  pages: ['privacy', 'notice'],
  holder: ['name', 'taxId', 'address', 'email'],
  emailOrPrivacyContact: false,
  registerWarning: true,
};

/** The rule set of one market, or null when there is none (`US`, `JP`, ...). */
export function ruleFor(market) {
  if (market === 'ES') return ES_RULE;
  if (isEuMarket(market)) return EU_RULE;
  return null;
}

/**
 * Combine the rule sets of the named markets.
 * Returns { pages, holder, emailOrPrivacyContact, registerWarning, covered, unknown } where `pages` and
 * `holder` are the union, `covered` the markets with a rule set and `unknown` the ones without.
 */
export function rulesForMarkets(markets) {
  const pages = new Set();
  const holder = new Set();
  let emailOrPrivacyContact = false;
  let registerWarning = false;
  const covered = [];
  const unknown = [];
  for (const market of markets) {
    const rule = ruleFor(market);
    if (!rule) {
      unknown.push(market);
      continue;
    }
    covered.push(market);
    for (const page of rule.pages) pages.add(page);
    for (const field of rule.holder) holder.add(field);
    emailOrPrivacyContact ||= rule.emailOrPrivacyContact;
    registerWarning ||= Boolean(rule.registerWarning);
  }
  if (holder.has('email')) emailOrPrivacyContact = false;
  return {
    pages: PAGE_KINDS.filter((p) => pages.has(p)),
    holder: [...holder],
    emailOrPrivacyContact,
    registerWarning,
    covered,
    unknown,
  };
}

/** Paths (without the trailing slash) that count as a legal page, and the kind each is. */
export const LEGAL_PATHS = {
  '/legal-notice': 'notice',
  '/aviso-legal': 'notice',
  '/privacy': 'privacy',
  '/privacidad': 'privacy',
};

// --- Price claims -------------------------------------------------------------------------------------

const PRICE = String.raw`(?:[$€£]\s?\d[\d.,]*|\d[\d.,]*\s?(?:€|EUR\b|USD\b|\$|£))`;
const NUM = String.raw`(?:${PRICE}|\d[\d.,]*)`;
const DISCOUNT_WORDS = String.raw`(?:off|discount|dto\.?|descuento|rebaja|de\s+descuento)`;
const SAVE_WORDS = String.raw`(?:save|saving|ahorra|ahorro|descuento|discount|rebaja|dto\.?)`;

/** Patterns for discount percentages and was/now price pairs, in English and Spanish. */
export const PRICE_CLAIM_PATTERNS = [
  new RegExp(String.raw`\b\d{1,3}\s?%\s*${DISCOUNT_WORDS}(?![\p{L}])`, 'giu'),
  new RegExp(
    String.raw`(?<![\p{L}])${SAVE_WORDS}\s*(?:of\s+|de\s+|up\s+to\s+|hasta\s+|un\s+)*\d{1,3}\s?%`,
    'giu',
  ),
  new RegExp(
    String.raw`(?<![\p{L}])(?:was|before|antes)\W{0,3}${NUM}.{0,40}?(?<![\p{L}])(?:now|ahora)\W{0,3}${NUM}`,
    'giu',
  ),
];

/** A string that looks like a price (used for the content of <s> and <del>). */
export const PRICE_LIKE = new RegExp(PRICE, 'iu');
