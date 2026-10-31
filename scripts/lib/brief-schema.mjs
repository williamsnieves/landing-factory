// Schema and validator of sites/<slug>/brief.json (design: openspec/changes/add-brief-intake/design.md).
// No dependency: the schema is a plain object and the validator walks it. Every error names the field path
// (for example `offer[1].price`) and what is expected.
import { existsSync } from 'node:fs';
import { isAbsolute, join, normalize, sep } from 'node:path';

export const BRIEF_VERSION = 1;

export const BUSINESS_KINDS = [
  'product',
  'service',
  'event',
  'content',
  'other',
];
export const ASSET_KINDS = [
  'logo',
  'photo',
  'video',
  'document',
  'model',
  'other',
];
export const ANALYTICS_MODES = ['none', 'cookieless', 'cookies'];
/** Does the customer allow AI-generated images on the page? Empty means not decided, which counts as not allowed. */
export const AI_IMAGE_MODES = ['allowed', 'not-allowed'];
/** May the page show an AI portrait of the brand owner (a personal brand)? Empty means not decided, which counts as not allowed. */
export const OWNER_PORTRAIT_MODES = ['allowed', 'not-allowed'];
/** schema.org types the SEO step can write JSON-LD for (seo.schemaType). Extend the list here. */
export const SCHEMA_TYPES = [
  'LocalBusiness',
  'ProfessionalService',
  'RealEstateAgent',
  'FinancialService',
  'Dentist',
  'MedicalClinic',
  'Restaurant',
  'Bakery',
  'Store',
  'Organization',
  'Person',
  'SoftwareApplication',
  'Event',
];
/** Lead forms (design: openspec/changes/add-lead-forms/design.md). Closed vocabularies; extend the lists here. */
export const FORM_PURPOSES = ['valuation', 'contact', 'callback', 'quote'];
export const FORM_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'postcode',
  'propertyType',
  'size',
  'message',
  'preferredTime',
];
export const FORM_PROVIDERS = ['web3forms', 'whatsapp'];
export const FORM_MAX = 3;
/** Prospect landings (design: openspec/changes/add-prospect-landings/design.md): a page built for a business that has not bought yet. */
export const PROSPECT_STATUSES = ['prospect', 'sold'];
/**
 * The customer facts a prospect brief must back with a source (or list in `assumed`). `[]` stands for every index.
 * Descriptive text (business.description, audience, tone) is the owner's own framing and needs no source.
 */
export const PROSPECT_FACT_FIELDS = [
  'business.name',
  'business.city',
  'business.country',
  'contact.email',
  'contact.phone',
  'contact.address',
  'contact.hours',
  'contact.social[]',
  'offer[].name',
  'offer[].price',
  'offer[].url',
  'goal.primary.url',
];
export const SEO_MAX_TEXT = 120;
export const SEO_MAX_LIST = 10;
export const DEPLOY_TARGETS = [
  'cloudflare-pages',
  'vercel',
  'netlify',
  'vps',
  'shared-hosting',
  'undecided',
];

const str = (extra = {}) => ({ type: 'string', ...extra });
const list = (items, maxItems) => ({
  type: 'array',
  items,
  ...(maxItems ? { maxItems } : {}),
});
const obj = (props) => ({ type: 'object', props });

/** The shape of a brief. `required` strings must be non-empty; `format` names a check in FORMATS. */
export const SCHEMA = obj({
  version: { type: 'version' },
  language: str({ required: true, format: 'language' }),
  // Every language the page is written in, `language` (the default locale) included. Empty or one entry: a single-language
  // page; two or more: a multi-locale landing (Astro i18n routing, see openspec/changes/add-bilingual-landing).
  languages: list(str({ format: 'locale' })),
  business: obj({
    name: str({ required: true }),
    description: str({ required: true }),
    city: str(),
    country: str(),
    kind: str({ enum: BUSINESS_KINDS }),
    // The business is a person (a personal brand, freelancer or portfolio): the interview then asks brand.ownerPortrait.
    personalBrand: { type: 'boolean' },
  }),
  offer: list(
    obj({
      name: str({ required: true }),
      description: str(),
      price: str(),
      currency: str(),
      url: str({ format: 'http-url' }),
    }),
  ),
  audience: obj({ who: str(), needs: str(), objections: str() }),
  goal: obj({
    primary: obj({
      label: str({ required: true }),
      url: str({ format: 'action-url' }),
    }),
    secondary: obj({ label: str(), url: str({ format: 'action-url' }) }),
  }),
  tone: list(str()),
  contact: obj({
    email: str({ format: 'email' }),
    phone: str({ format: 'phone' }),
    address: str(),
    hours: str(),
    social: list(
      obj({
        network: str({ required: true }),
        url: str({ required: true, format: 'http-url' }),
      }),
    ),
  }),
  assets: list(
    obj({
      kind: str({ required: true, enum: ASSET_KINDS }),
      path: str({ format: 'local-path' }),
      url: str({ format: 'http-url' }),
      owner: str(),
      permission: str(),
      notes: str(),
    }),
  ),
  brand: obj({
    colors: list(str({ format: 'color' })),
    fonts: list(str()),
    keep: str(),
    avoid: str(),
    // AI-generated illustrations (scripts/ai-images.mjs): only the customer decides, never assumed.
    aiImages: str({ enum: AI_IMAGE_MODES }),
    // An AI portrait of the owner of a personal brand (the one exception to "AI images never show people"): the owner decides, never assumed.
    ownerPortrait: str({ enum: OWNER_PORTRAIT_MODES }),
  }),
  references: obj({
    liked: list(
      obj({
        url: str({ required: true, format: 'http-url' }),
        sheet: str({ format: 'sheet' }),
        why: str(),
      }),
    ),
    disliked: list(
      obj({ url: str({ required: true, format: 'http-url' }), why: str() }),
    ),
  }),
  legal: obj({
    regulated: { type: 'boolean' },
    notices: list(str()),
    constraints: str(),
    // Where the page is offered ('EU' or ISO 3166-1 alpha-2), who runs it and what it does with personal data.
    markets: list(str({ format: 'market' })),
    holder: obj({
      name: str(),
      taxId: str(),
      address: str(),
      email: str({ format: 'email' }),
      register: str(),
    }),
    privacyContact: str({ format: 'email' }),
    processing: obj({
      analytics: str({ enum: ANALYTICS_MODES }),
      forms: { type: 'boolean' },
      embeds: list(str()),
    }),
  }),
  // What a customer types into a search engine to find the business, the place it serves and the schema.org type
  // of its JSON-LD. A value chosen for the customer goes in `assumed`.
  seo: obj({
    primaryKeyword: str({ maxLength: SEO_MAX_TEXT }),
    keywords: list(str({ maxLength: SEO_MAX_TEXT }), SEO_MAX_LIST),
    serviceArea: list(str({ maxLength: SEO_MAX_TEXT }), SEO_MAX_LIST),
    schemaType: str({ enum: SCHEMA_TYPES }),
  }),
  // Lead forms: a hosted form service (web3forms) or a prefilled WhatsApp message. The access key is public by design
  // but is the customer's own, so it can never be listed in `assumed`.
  forms: list(
    obj({
      id: str({ required: true, format: 'form-id' }),
      purpose: str({ required: true, enum: FORM_PURPOSES }),
      fields: list(str({ enum: FORM_FIELDS })),
      provider: str({ required: true, enum: FORM_PROVIDERS }),
      accessKey: str({ format: 'uuid' }),
    }),
    FORM_MAX,
  ),
  // A page built for a business that has not bought anything yet: where each public fact comes from. While the
  // status is `prospect` the brief cannot carry the prospect's brand or any consent (see validateBrief).
  prospect: obj({
    status: str({ enum: PROSPECT_STATUSES }),
    sources: list(
      obj({
        field: str({ required: true }),
        url: str({ required: true, format: 'https-url' }),
        retrieved: str({ required: true, format: 'date' }),
      }),
    ),
  }),
  deploy: obj({
    target: str({ enum: DEPLOY_TARGETS }),
    domain: str({ format: 'domain' }),
  }),
  assumed: list(obj({ field: str({ required: true }), reason: str() })),
  notes: str(),
});

/** An empty, schema-shaped brief (what `brief.mjs init` writes). */
export function emptyBrief({ language = '', niche = '' } = {}) {
  const build = (node) => {
    if (node.type === 'object')
      return Object.fromEntries(
        Object.entries(node.props).map(([key, child]) => [key, build(child)]),
      );
    if (node.type === 'array') return [];
    if (node.type === 'boolean') return false;
    if (node.type === 'version') return BRIEF_VERSION;
    return '';
  };
  const brief = build(SCHEMA);
  brief.language = language;
  brief.business.description = niche;
  delete brief.prospect; // opt-in: only a brief for a business that has not bought yet carries it
  return brief;
}

// --------------------------------------------------------------------------------------------------
// Field paths: `offer[1].price`, `contact.phone`, `tone`

/** Split `offer[1].price` into ['offer', 1, 'price']. Returns null for a malformed path. */
export function parsePath(path) {
  if (typeof path !== 'string' || path === '') return null;
  const parts = [];
  for (const segment of path.split('.')) {
    const match = /^([A-Za-z][A-Za-z0-9_]*)((?:\[\d+\])*)$/.exec(segment);
    if (!match) return null;
    parts.push(match[1]);
    for (const index of match[2].matchAll(/\[(\d+)\]/g))
      parts.push(Number(index[1]));
  }
  return parts;
}

/** Value at a dotted path, or undefined when any step is missing. */
export function getPath(brief, path) {
  const parts = parsePath(path);
  if (!parts) return undefined;
  let value = brief;
  for (const part of parts) {
    if (value === null || typeof value !== 'object') return undefined;
    value = value[part];
  }
  return value;
}

/** A value the customer gave: a non-blank string, a non-empty array or object, a number or a boolean. */
export function isFilled(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.some(isFilled);
  if (typeof value === 'object') return Object.values(value).some(isFilled);
  return true;
}

/** Is this field path listed in `assumed`, directly or through an assumed parent (`offer[0]` covers `offer[0].price`)? */
export function isAssumed(brief, path) {
  const assumed = Array.isArray(brief?.assumed) ? brief.assumed : [];
  return assumed.some((entry) => {
    const field = entry?.field;
    return (
      typeof field === 'string' &&
      (field === path ||
        path.startsWith(`${field}.`) ||
        path.startsWith(`${field}[`))
    );
  });
}

// --------------------------------------------------------------------------------------------------
// Formats

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const SHEET = /^[a-z0-9_]+(-[a-z0-9]+)*$/;
const MARKET = /^(EU|[A-Z]{2})$/;
const FORM_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUrl(value, protocols) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (!protocols.includes(url.protocol)) return false;
  if (url.protocol.startsWith('http')) return url.hostname.includes('.');
  return url.pathname !== '';
}

/** Holder identity (legal.holder.*, legal.privacyContact, or their parent `legal`) is never a value chosen for the customer. */
const HOLDER_IDENTITY = /^legal(\.(holder|privacyContact)([.[].*)?)?$/;

/** The customer's AI-image consent is their decision: it can never be listed as assumed. */
const AI_CONSENT = /^brand\.aiImages$/;
/** The owner's consent to an AI portrait of themselves is theirs alone, never assumed. */
const PORTRAIT_CONSENT = /^brand\.ownerPortrait$/;
/** A form's access key is the customer's own account key: never a value chosen for them (also covers `forms` and `forms[i]`). */
const FORM_KEY = /^forms(\[\d+\](\.accessKey)?)?$/;

/** Each check returns an error text (what was expected) or null. `ctx` carries baseDir and patternsDir. */
const FORMATS = {
  language: (v) =>
    /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(v)
      ? null
      : 'expected a language tag such as "es" or "en-GB"',
  'https-url': (v) =>
    isUrl(v, ['https:']) ? null : 'expected a URL starting with https://',
  date: (v) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    const date = match && new Date(`${v}T00:00:00Z`);
    return match &&
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === v
      ? null
      : 'expected a date as YYYY-MM-DD';
  },
  'http-url': (v) =>
    isUrl(v, ['http:', 'https:'])
      ? null
      : 'expected a URL starting with https:// or http://',
  'action-url': (v) =>
    isUrl(v, ['http:', 'https:', 'mailto:', 'tel:'])
      ? null
      : 'expected a URL starting with https://, http://, mailto: or tel:',
  email: (v) =>
    EMAIL.test(v) ? null : 'expected an email address such as name@domain.com',
  phone: (v) => {
    const digits = v.replace(/\D/g, '');
    return /^\+?[\d\s().-]+$/.test(v) &&
      digits.length >= 7 &&
      digits.length <= 15
      ? null
      : 'expected a phone number with 7 to 15 digits, for example "+34 600 123 456"';
  },
  locale: (v) =>
    /^[a-z]{2,3}(-[a-z0-9]+)*$/.test(v)
      ? null
      : 'expected a lowercase language tag such as "en" or "pt-br" (it names the folder src/pages/<locale>/)',
  'form-id': (v) =>
    FORM_ID.test(v)
      ? null
      : 'expected a lowercase slug such as "valuation" (letters, digits and hyphens)',
  uuid: (v) =>
    UUID.test(v)
      ? null
      : 'expected an access key in UUID form (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
  market: (v) =>
    MARKET.test(v)
      ? null
      : 'expected "EU" or a two-letter ISO 3166-1 country code in capitals, such as "ES" or "US"',
  color: (v) =>
    /^#[0-9a-fA-F]{6}$/.test(v) ? null : 'expected a color as #rrggbb',
  domain: (v) =>
    DOMAIN.test(v)
      ? null
      : 'expected a domain name such as "example.com" (no protocol, no path)',
  'local-path': (v, ctx) => {
    if (isAbsolute(v) || /^[A-Za-z]:/.test(v))
      return 'expected a path relative to the site folder, not an absolute path';
    const clean = normalize(v);
    if (clean === '..' || clean.startsWith(`..${sep}`))
      return 'expected a path inside the site folder (no "..")';
    if (ctx.baseDir && !existsSync(join(ctx.baseDir, clean)))
      return `file not found: ${join(ctx.baseDir, clean)}; put the file there or fix the path`;
    return null;
  },
  sheet: (v, ctx) => {
    if (!SHEET.test(v))
      return 'expected a pattern sheet slug such as "sonomabakery-com"';
    return ctx.patternsDir && !existsSync(join(ctx.patternsDir, `${v}.md`))
      ? `patterns/${v}.md does not exist; run /analyze-reference first or leave "sheet" empty`
      : null;
  },
};

// --------------------------------------------------------------------------------------------------
// Validation

const describe = (value) =>
  Array.isArray(value) ? 'an array' : value === null ? 'null' : typeof value;

/**
 * Validate a parsed brief. Returns [{ path, message }]; empty means valid.
 * Options: baseDir (asset paths are relative to it and must exist), patternsDir (liked[].sheet must exist there).
 */
export function validateBrief(
  brief,
  { baseDir = null, patternsDir = null } = {},
) {
  const errors = [];
  const ctx = { baseDir, patternsDir };
  const fail = (path, message) => errors.push({ path, message });

  const walk = (node, value, path) => {
    switch (node.type) {
      case 'version':
        if (value !== BRIEF_VERSION)
          fail(
            path,
            `expected the number ${BRIEF_VERSION}, got ${JSON.stringify(value)}`,
          );
        return;
      case 'boolean':
        if (typeof value !== 'boolean')
          fail(path, `expected true or false, got ${describe(value)}`);
        return;
      case 'string': {
        if (typeof value !== 'string') {
          fail(path, `expected a string, got ${describe(value)}`);
          return;
        }
        const text = value.trim();
        if (text === '') {
          if (node.required) fail(path, 'required, but empty; give it a value');
          return;
        }
        if (node.maxLength && text.length > node.maxLength)
          fail(
            path,
            `at most ${node.maxLength} characters, got ${text.length}`,
          );
        if (node.enum && !node.enum.includes(text))
          fail(path, `expected one of ${node.enum.join(', ')}, got "${value}"`);
        const problem = node.format ? FORMATS[node.format](text, ctx) : null;
        if (problem) fail(path, `${problem}, got "${value}"`);
        return;
      }
      case 'array':
        if (!Array.isArray(value)) {
          fail(path, `expected an array, got ${describe(value)}`);
          return;
        }
        if (node.maxItems && value.length > node.maxItems)
          fail(path, `at most ${node.maxItems} entries, got ${value.length}`);
        value.forEach((item, index) =>
          walk(node.items, item, `${path}[${index}]`),
        );
        return;
      case 'object': {
        if (
          value === null ||
          typeof value !== 'object' ||
          Array.isArray(value)
        ) {
          fail(path || 'brief', `expected an object, got ${describe(value)}`);
          return;
        }
        const allowed = Object.keys(node.props);
        for (const key of Object.keys(value))
          if (!allowed.includes(key))
            fail(
              path ? `${path}.${key}` : key,
              `unknown key; allowed here: ${allowed.join(', ')}`,
            );
        for (const [key, child] of Object.entries(node.props)) {
          const childPath = path ? `${path}.${key}` : key;
          if (!(key in value)) {
            // A missing key reads as empty: only required strings, the version and objects holding them matter.
            if (child.type === 'version') walk(child, undefined, childPath);
            else if (child.type === 'string' && child.required)
              fail(childPath, 'required, but missing; add it with a value');
            else if (child.type === 'object') walk(child, {}, childPath);
            continue;
          }
          walk(child, value[key], childPath);
        }
        return;
      }
    }
  };
  walk(SCHEMA, brief, '');

  // Cross-field rules, only when the shape is sound enough to read.
  if (brief && typeof brief === 'object' && !Array.isArray(brief)) {
    const text = (path) => {
      const value = getPath(brief, path);
      return typeof value === 'string' ? value.trim() : '';
    };
    if (Array.isArray(brief.languages)) {
      const seen = new Set();
      brief.languages.forEach((tag, index) => {
        if (typeof tag !== 'string' || tag.trim() === '') return; // reported above
        if (seen.has(tag.trim()))
          fail(`languages[${index}]`, `duplicate language "${tag}"`);
        seen.add(tag.trim());
      });
      const defaultLanguage = text('language');
      if (
        seen.size &&
        defaultLanguage &&
        FORMATS.language(defaultLanguage) === null && // a malformed "language" is reported on its own
        !seen.has(defaultLanguage)
      )
        fail(
          'languages',
          `must include the default language "${defaultLanguage}" (the "language" field); add it, or change "language"`,
        );
    }
    if (text('goal.secondary.url') && !text('goal.secondary.label'))
      fail('goal.secondary.label', 'required when goal.secondary.url is set');
    if (Array.isArray(brief.forms) && brief.forms.length) {
      const ids = new Set();
      brief.forms.forEach((form, index) => {
        if (!form || typeof form !== 'object') return;
        const id = String(form.id ?? '').trim();
        if (id && ids.has(id))
          fail(`forms[${index}].id`, `duplicate form id "${id}"`);
        ids.add(id);
        if (Array.isArray(form.fields)) {
          const seen = new Set();
          form.fields.forEach((f, i) => {
            if (seen.has(f))
              fail(`forms[${index}].fields[${i}]`, `duplicate field "${f}"`);
            seen.add(f);
          });
        }
        if (
          String(form.provider ?? '').trim() === 'whatsapp' &&
          String(form.accessKey ?? '').trim()
        )
          fail(
            `forms[${index}].accessKey`,
            'only a web3forms form has an access key; remove it or change the provider',
          );
      });
      if (!hasMarkets(brief) || brief.legal?.processing?.forms !== true)
        fail(
          'forms',
          'a form requires a legal market (legal.markets) and legal.processing.forms: true, so a privacy policy exists and names the form provider',
        );
    }
    errors.push(...prospectErrors(brief));
    if (Array.isArray(brief?.assets))
      brief.assets.forEach((asset, index) => {
        if (
          asset &&
          typeof asset === 'object' &&
          !String(asset.path ?? '').trim() &&
          !String(asset.url ?? '').trim()
        )
          fail(`assets[${index}]`, 'needs a "path" (local file) or a "url"');
      });
    if (Array.isArray(brief?.assumed))
      brief.assumed.forEach((entry, index) => {
        const field = entry?.field;
        if (typeof field !== 'string' || field.trim() === '') return; // reported above
        const path = `assumed[${index}].field`;
        if (HOLDER_IDENTITY.test(field))
          return fail(
            path,
            `holder identity data cannot be assumed ("${field}"): ask the customer, or leave it empty and the legal pages show a pending marker`,
          );
        if (AI_CONSENT.test(field))
          return fail(
            path,
            `AI-image consent cannot be assumed ("${field}"): the customer must decide it, or leave it empty (empty counts as not allowed)`,
          );
        if (PORTRAIT_CONSENT.test(field))
          return fail(
            path,
            `owner-portrait consent cannot be assumed ("${field}"): the owner must decide it, or leave it empty (empty counts as not allowed)`,
          );
        if (FORM_KEY.test(field))
          return fail(
            path,
            `a form access key cannot be assumed ("${field}"): it is the customer's own Web3Forms key; leave accessKey empty until they have one (the form falls back to WhatsApp)`,
          );
        if (!parsePath(field))
          return fail(
            path,
            `expected a dotted field path such as "contact.phone" or "offer[0].price", got "${field}"`,
          );
        if (field.startsWith('assumed'))
          return fail(path, '"assumed" cannot list itself');
        const value = getPath(brief, field);
        if (value === undefined)
          return fail(
            path,
            `"${field}" does not exist in the brief; fix the path`,
          );
        if (!isFilled(value))
          fail(
            path,
            `"${field}" is empty; an assumption is a value chosen for the customer, so write the value or remove the entry (a value nobody gave stays empty)`,
          );
        if (typeof entry.reason !== 'string' || entry.reason.trim() === '')
          fail(
            `assumed[${index}].reason`,
            'required: say why the value was chosen',
          );
      });
  }
  return errors;
}

// --------------------------------------------------------------------------------------------------
// Prospect landings

/** Is this a brief for a business that has not bought yet (prospect.status is "prospect")? */
export const isProspect = (brief) => brief?.prospect?.status === 'prospect';

/** Concrete paths of the filled fact fields of a brief (`PROSPECT_FACT_FIELDS` with the indexes filled in). */
export function prospectFactPaths(brief) {
  const paths = [];
  const count = (path) => {
    const value = getPath(brief, path);
    return Array.isArray(value) ? value.length : 0;
  };
  for (const pattern of PROSPECT_FACT_FIELDS) {
    const list = /^(.+?)\[\](?:\.(.+))?$/.exec(pattern);
    if (!list) paths.push(pattern);
    else
      for (let i = 0; i < count(list[1]); i++)
        paths.push(`${list[1]}[${i}]${list[2] ? `.${list[2]}` : ''}`);
  }
  return paths.filter((path) => isFilled(getPath(brief, path)));
}

const sourceFields = (brief) =>
  (Array.isArray(brief?.prospect?.sources) ? brief.prospect.sources : [])
    .map((entry) => entry?.field)
    .filter((field) => typeof field === 'string' && field !== '');

/** Is the field backed by a `prospect.sources` entry, directly or through a parent (`offer[0]` covers `offer[0].price`)? */
export function isSourced(brief, path) {
  return sourceFields(brief).some(
    (field) =>
      field === path ||
      path.startsWith(`${field}.`) ||
      path.startsWith(`${field}[`),
  );
}

/** Filled fact fields of a prospect brief that have neither a source nor an `assumed` entry. */
export function uncoveredProspectFacts(brief) {
  return prospectFactPaths(brief).filter(
    (path) => !isSourced(brief, path) && !isAssumed(brief, path),
  );
}

/** Cross-field rules of the `prospect` section (design Decisions 1 and 2). Returns [{ path, message }]. */
function prospectErrors(brief) {
  const errors = [];
  const fail = (path, message) => errors.push({ path, message });
  const sources = Array.isArray(brief.prospect?.sources)
    ? brief.prospect.sources
    : [];
  const status = brief.prospect?.status;
  if (sources.length && (status === undefined || status === ''))
    fail('prospect.status', 'required when prospect.sources has entries');
  const seen = new Set();
  sources.forEach((entry, index) => {
    const field = entry?.field;
    if (typeof field !== 'string' || field.trim() === '') return; // reported above
    const path = `prospect.sources[${index}].field`;
    if (!parsePath(field))
      return fail(
        path,
        `expected a dotted field path such as "contact.phone" or "offer[0].price", got "${field}"`,
      );
    if (seen.has(field))
      return fail(path, `"${field}" appears twice in prospect.sources`);
    seen.add(field);
    if (!isFilled(getPath(brief, field)))
      return fail(
        path,
        `"${field}" is empty or does not exist in the brief; a source backs a fact the page shows`,
      );
    if ((brief.assumed ?? []).some((a) => a?.field === field))
      fail(
        path,
        `"${field}" is both sourced and assumed; it is either a public fact with a source or a value chosen for the business, never both`,
      );
  });
  if (status !== 'prospect') return errors;

  for (const path of uncoveredProspectFacts(brief))
    fail(
      path,
      'a prospect fact needs a source in prospect.sources (https URL and retrieval date) or an entry in assumed',
    );
  const brand = "a prospect landing cannot use the prospect's brand";
  const consent = 'a prospect cannot consent';
  if (isFilled(brief.assets))
    fail(
      'assets',
      `${brand}: no logo, photos or other files of its own; use archive images`,
    );
  if (isFilled(brief.brand?.colors))
    fail('brand.colors', `${brand}: choose the palette from the niche`);
  if (isFilled(brief.brand?.fonts))
    fail('brand.fonts', `${brand}: choose the fonts from the niche`);
  if (isFilled(brief.brand?.aiImages))
    fail(
      'brand.aiImages',
      `${consent}: nobody has agreed to AI images; leave it empty`,
    );
  if (isFilled(brief.brand?.ownerPortrait))
    fail('brand.ownerPortrait', `${consent}: leave it empty`);
  if (isFilled(brief.legal?.holder))
    fail(
      'legal.holder',
      `${consent}: nobody holds the page yet; leave the holder empty`,
    );
  if (isFilled(brief.legal?.privacyContact))
    fail(
      'legal.privacyContact',
      `${consent}: nobody holds the page yet; leave it empty`,
    );
  if (isFilled(brief.forms))
    fail('forms', `${consent}: a prospect page has no lead forms`);
  return errors;
}

export const formatErrors = (errors) =>
  errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');

// --------------------------------------------------------------------------------------------------
// AI-image consent

/**
 * Does the customer allow AI-generated images? No brief (null): yes, demo niches. A brief: only an explicit
 * `allowed` that is not listed as assumed (directly or through `brand`); empty or `not-allowed` is no.
 * Returns { allowed, value } where value is the brief's value, "empty", or "(no brief)".
 */
export function aiImagesConsent(brief) {
  if (!brief) return { allowed: true, value: '(no brief)' };
  const value = String(brief.brand?.aiImages ?? '').trim();
  return {
    allowed: value === 'allowed' && !isAssumed(brief, 'brand.aiImages'),
    value: value || 'empty',
  };
}

/**
 * May the page show an AI portrait of the brand owner? Needs a brief that names the business (the owner), brand.aiImages
 * `allowed` and brand.ownerPortrait `allowed`, neither listed as assumed. No brief: never. Returns { allowed, reason }.
 */
export function ownerPortraitConsent(brief) {
  if (!brief)
    return {
      allowed: false,
      reason:
        'an owner portrait needs a brief.json that names the owner; there is none',
    };
  if (!String(brief.business?.name ?? '').trim())
    return {
      allowed: false,
      reason:
        'the brief does not name the business or its owner (business.name)',
    };
  const images = aiImagesConsent(brief);
  if (!images.allowed)
    return {
      allowed: false,
      reason: `brand.aiImages is ${images.value}, not "allowed"`,
    };
  const value = String(brief.brand?.ownerPortrait ?? '').trim();
  if (value !== 'allowed' || isAssumed(brief, 'brand.ownerPortrait'))
    return {
      allowed: false,
      reason: `brand.ownerPortrait is ${value || 'empty'}, not "allowed"`,
    };
  return { allowed: true, reason: '' };
}

// --------------------------------------------------------------------------------------------------
// Missing fields, in interview order

/** Topics in the order the interview asks them. `hint` is a short English question; the skill asks in the language the user writes in. */
export const MISSING_FIELDS = [
  ['business.name', true, 'What is the business or brand called?'],
  ['business.description', true, 'What does it do, in a sentence or two?'],
  ['language', true, 'Which language should the page copy be written in?'],
  [
    'languages',
    false,
    'One language or more? If more, list them all (the page language is the default one); the page is then written in each.',
  ],
  [
    'business.kind',
    false,
    'Is it selling products, services, an event or content?',
  ],
  [
    'business.city',
    false,
    'Which city and country is it based in (or is it online only)?',
  ],
  [
    'offer',
    false,
    'Which products or services are on the page, with name, price and link?',
  ],
  ['audience.who', false, 'Who is it for?'],
  ['audience.needs', false, 'What do those people need or want?'],
  [
    'audience.objections',
    false,
    'What holds them back from buying or contacting?',
  ],
  ['goal.primary.label', true, 'What is the one action the page should drive?'],
  [
    'goal.primary.url',
    false,
    'Where does that action lead (checkout, form, WhatsApp, email)?',
  ],
  ['goal.secondary.label', false, 'Is there a second, quieter action?'],
  ['tone', false, 'How should it sound (for example warm, direct, technical)?'],
  ['contact.email', false, 'Which email should the page show?'],
  ['contact.phone', false, 'Which phone number should the page show?'],
  ['contact.address', false, 'Is there a street address to show?'],
  ['contact.hours', false, 'What are the opening hours or response times?'],
  ['contact.social', false, 'Which social profiles should be linked?'],
  [
    'legal.markets',
    false,
    'In which countries will you sell or promote this (for example ES, EU, US)? It decides which legal pages the page needs.',
  ],
  [
    'legal.holder.name',
    false,
    'Who runs the page: the legal name of the person or company? Legal pages must show it.',
    'markets',
  ],
  [
    'legal.holder.taxId',
    false,
    'What is the tax id (NIF, CIF, VAT number) of the holder? Never guessed.',
    'markets',
  ],
  [
    'legal.holder.address',
    false,
    'What is the holder address for the legal notice?',
    'markets',
  ],
  [
    'legal.holder.email',
    false,
    'Which email can visitors use to contact the holder?',
    'markets',
  ],
  [
    'legal.privacyContact',
    false,
    'Which email handles privacy requests (access, deletion)?',
    'markets',
  ],
  [
    'legal.processing.analytics',
    false,
    'Does the page use analytics: none, cookieless or cookies? Do forms or embeds (video, maps) collect data?',
    'markets',
  ],
  [
    'forms[0].accessKey',
    false,
    'What is your Web3Forms access key (public; create one at web3forms.com with the email that should receive the leads)? Never guessed. Without it the form opens a prefilled WhatsApp message.',
    'forms-key',
  ],
  [
    'seo.primaryKeyword',
    false,
    'What would a customer type into Google to find you? One phrase; it goes in the title and the main heading.',
  ],
  ['seo.serviceArea', false, 'Which cities or regions do you serve?', 'local'],
  [
    'assets',
    false,
    'Which logo, photos, videos or documents of your own can be used, and who owns them?',
  ],
  ['brand.colors', false, 'Are there brand colors to keep?'],
  ['brand.fonts', false, 'Are there brand fonts to keep?'],
  [
    'brand.aiImages',
    false,
    'May the page use AI-generated illustrations (never photos of your people or products)? Empty counts as not allowed.',
  ],
  [
    'brand.ownerPortrait',
    false,
    'May the page show an AI-generated portrait of you, which you made and approve? It is always labeled as AI, never as a photo. Empty counts as not allowed.',
    'personal-brand',
  ],
  ['references.liked', false, 'Which sites do you like, and what about them?'],
  ['references.disliked', false, 'Which sites do you dislike, and why?'],
  [
    'legal.constraints',
    false,
    'Is the niche regulated, or are there legal notices the page must carry?',
  ],
  ['deploy.target', false, 'Where will the page be hosted?'],
  ['deploy.domain', false, 'Which domain should it use?'],
].map(([path, required, hint, when]) => ({
  path,
  required,
  hint,
  ...(when ? { when } : {}),
}));

/** Does the brief name at least one market? (Holder fields are only asked for then.) */
export const hasMarkets = (brief) =>
  Array.isArray(brief?.legal?.markets) && brief.legal.markets.some(isFilled);

/**
 * The locales of a brief: `language` (the default locale) first, then the other `languages` in order, without duplicates.
 * A brief with no `languages` has one locale. Returns { defaultLocale, locales, multilingual }.
 */
export function briefLocales(brief) {
  const defaultLocale = String(brief?.language ?? '').trim();
  const others = (Array.isArray(brief?.languages) ? brief.languages : [])
    .map((tag) => String(tag ?? '').trim())
    .filter((tag) => tag && tag !== defaultLocale);
  const locales = [...new Set([defaultLocale, ...others].filter(Boolean))];
  return { defaultLocale, locales, multilingual: locales.length > 1 };
}

/** Does the brief ask for at least one lead form? */
export const hasForms = (brief) =>
  Array.isArray(brief?.forms) && brief.forms.some(isFilled);

/** Is the business a person (business.personalBrand)? Only then is the owner-portrait question asked. */
export const isPersonalBrand = (brief) =>
  brief?.business?.personalBrand === true;

/** A local business names a street address or a city: only then is the service area asked. */
export const isLocalBusiness = (brief) =>
  isFilled(brief?.contact?.address) || isFilled(brief?.business?.city);

/** Questions that make no sense for a prospect: its brand, assets and consent are not ours to ask for. */
const PROSPECT_SKIPPED = [
  'assets',
  'brand.colors',
  'brand.fonts',
  'brand.aiImages',
  'brand.ownerPortrait',
  'legal.holder',
  'legal.privacyContact',
];

/** Fields still empty: required first, then recommended in interview order. */
export function missingFields(brief) {
  const empty = MISSING_FIELDS.filter(
    ({ path, when }) =>
      (when !== 'markets' || hasMarkets(brief)) &&
      when !== 'forms-key' &&
      (when !== 'personal-brand' || isPersonalBrand(brief)) &&
      (when !== 'local' || isLocalBusiness(brief)) &&
      !isFilled(getPath(brief, path)),
  ).map(({ when, ...field }) => field);
  // One question per web3forms form that still has no access key (the path names the form).
  const keys = (Array.isArray(brief?.forms) ? brief.forms : []).flatMap(
    (form, index) =>
      form?.provider === 'web3forms' && !isFilled(form.accessKey)
        ? [
            {
              ...MISSING_FIELDS.find((f) => f.when === 'forms-key'),
              path: `forms[${index}].accessKey`,
            },
          ]
        : [],
  );
  for (const k of keys) delete k.when;
  if (isProspect(brief)) {
    // A prospect has no brand to keep and nobody to consent: those questions are not asked; each fact needs its source.
    const skip = (path) =>
      PROSPECT_SKIPPED.some((p) => path === p || path.startsWith(`${p}.`));
    return [
      ...empty.filter((f) => f.required && !skip(f.path)),
      ...empty.filter((f) => !f.required && !skip(f.path)),
      ...uncoveredProspectFacts(brief).map((path) => ({
        path: `prospect.sources(${path})`,
        required: false,
        hint: `Where is "${path}" published (https URL) and on what date did you read it? Record it in prospect.sources, or list the field in assumed.`,
      })),
    ];
  }
  return [
    ...empty.filter((f) => f.required),
    ...empty.filter((f) => !f.required),
    ...keys,
  ];
}

// --------------------------------------------------------------------------------------------------
// Summary

/** A short readable view of a brief. Assumed values are marked. */
export function summarizeBrief(brief) {
  const lines = [];
  const mark = (path, value) =>
    isAssumed(brief, path) ? `${value} (assumed)` : value;
  const field = (label, path) => {
    const value = getPath(brief, path);
    if (Array.isArray(value)) {
      if (value.some(isFilled))
        lines.push(`${label}: ${mark(path, value.join(', '))}`);
    } else if (isFilled(value))
      lines.push(`${label}: ${mark(path, String(value))}`);
  };
  const business = brief.business ?? {};
  const { locales, multilingual } = briefLocales(brief);
  lines.push(
    `${business.name || '(no name yet)'} [${multilingual ? `${locales.join(', ')}; default ${locales[0]}` : brief.language || '?'}]`,
  );
  field('Description', 'business.description');
  field('Kind', 'business.kind');
  const place = [business.city, business.country].filter(Boolean).join(', ');
  if (place) lines.push(`Place: ${mark('business.city', place)}`);
  (brief.offer ?? []).forEach((item, index) => {
    const price = [item.price, item.currency].filter(Boolean).join(' ');
    const price2 = price ? mark(`offer[${index}].price`, price) : 'no price';
    lines.push(
      `Offer ${index + 1}: ${item.name || '(unnamed)'}, ${price2}${item.url ? `, ${item.url}` : ''}`,
    );
  });
  field('Audience', 'audience.who');
  field('Needs', 'audience.needs');
  field('Objections', 'audience.objections');
  const goal = brief.goal?.primary ?? {};
  if (goal.label)
    lines.push(
      `Primary action: ${mark('goal.primary.label', goal.label)}${goal.url ? ` -> ${goal.url}` : ''}`,
    );
  const secondary = brief.goal?.secondary ?? {};
  if (secondary.label)
    lines.push(
      `Secondary action: ${secondary.label}${secondary.url ? ` -> ${secondary.url}` : ''}`,
    );
  field('Tone', 'tone');
  for (const key of ['email', 'phone', 'address', 'hours'])
    field(`Contact ${key}`, `contact.${key}`);
  (brief.contact?.social ?? []).forEach((s) =>
    lines.push(`Social: ${s.network} ${s.url}`),
  );
  (brief.assets ?? []).forEach((a, index) =>
    lines.push(
      `Asset ${index + 1}: ${a.kind} ${a.path || a.url}${a.owner ? `, owner ${a.owner}` : ''}`,
    ),
  );
  field('Brand colors', 'brand.colors');
  field('Brand fonts', 'brand.fonts');
  field('Keep', 'brand.keep');
  field('Avoid', 'brand.avoid');
  field('AI images', 'brand.aiImages');
  if (isPersonalBrand(brief)) lines.push('Personal brand: yes');
  field('Owner portrait', 'brand.ownerPortrait');
  (brief.references?.liked ?? []).forEach((r) =>
    lines.push(
      `Likes: ${r.url}${r.sheet ? ` (sheet ${r.sheet})` : ''}${r.why ? `, ${r.why}` : ''}`,
    ),
  );
  (brief.references?.disliked ?? []).forEach((r) =>
    lines.push(`Dislikes: ${r.url}${r.why ? `, ${r.why}` : ''}`),
  );
  if (brief.legal?.regulated) lines.push('Legal: regulated niche');
  field('Markets', 'legal.markets');
  for (const key of ['name', 'taxId', 'address', 'email', 'register'])
    field(`Holder ${key}`, `legal.holder.${key}`);
  field('Privacy contact', 'legal.privacyContact');
  field('Analytics', 'legal.processing.analytics');
  field('Embeds', 'legal.processing.embeds');
  if (brief.legal?.processing?.forms) lines.push('Forms collect data: yes');
  (brief.forms ?? []).forEach((form, index) => {
    const key = form.accessKey
      ? 'access key set'
      : form.provider === 'web3forms'
        ? 'no access key (falls back to WhatsApp)'
        : '';
    lines.push(
      `Form ${index + 1}: ${form.id} (${form.purpose}), ${form.provider}, fields ${(form.fields ?? []).join(', ') || 'none'}${key ? `, ${key}` : ''}`,
    );
  });
  field('Legal notices', 'legal.notices');
  field('Legal constraints', 'legal.constraints');
  field('Primary keyword', 'seo.primaryKeyword');
  field('Keywords', 'seo.keywords');
  field('Service area', 'seo.serviceArea');
  field('Schema type', 'seo.schemaType');
  field('Deploy target', 'deploy.target');
  field('Domain', 'deploy.domain');
  if (brief.prospect?.status) lines.push(`Prospect: ${brief.prospect.status}`);
  (brief.prospect?.sources ?? []).forEach((s) =>
    lines.push(`Source ${s.field}: ${s.url} (retrieved ${s.retrieved})`),
  );
  (brief.assumed ?? []).forEach((a) =>
    lines.push(`Assumed ${a.field}: ${a.reason}`),
  );
  field('Notes', 'notes');
  return lines.join('\n');
}
