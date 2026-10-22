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
export const DEPLOY_TARGETS = [
  'cloudflare-pages',
  'vercel',
  'netlify',
  'vps',
  'shared-hosting',
  'undecided',
];

const str = (extra = {}) => ({ type: 'string', ...extra });
const list = (items) => ({ type: 'array', items });
const obj = (props) => ({ type: 'object', props });

/** The shape of a brief. `required` strings must be non-empty; `format` names a check in FORMATS. */
export const SCHEMA = obj({
  version: { type: 'version' },
  language: str({ required: true, format: 'language' }),
  business: obj({
    name: str({ required: true }),
    description: str({ required: true }),
    city: str(),
    country: str(),
    kind: str({ enum: BUSINESS_KINDS }),
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

/** Each check returns an error text (what was expected) or null. `ctx` carries baseDir and patternsDir. */
const FORMATS = {
  language: (v) =>
    /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(v)
      ? null
      : 'expected a language tag such as "es" or "en-GB"',
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
    if (text('goal.secondary.url') && !text('goal.secondary.label'))
      fail('goal.secondary.label', 'required when goal.secondary.url is set');
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

export const formatErrors = (errors) =>
  errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');

// --------------------------------------------------------------------------------------------------
// Missing fields, in interview order

/** Topics in the order the interview asks them. `hint` is a short English question; the skill asks in the language the user writes in. */
export const MISSING_FIELDS = [
  ['business.name', true, 'What is the business or brand called?'],
  ['business.description', true, 'What does it do, in a sentence or two?'],
  ['language', true, 'Which language should the page copy be written in?'],
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
    'assets',
    false,
    'Which logo, photos, videos or documents of your own can be used, and who owns them?',
  ],
  ['brand.colors', false, 'Are there brand colors to keep?'],
  ['brand.fonts', false, 'Are there brand fonts to keep?'],
  ['references.liked', false, 'Which sites do you like, and what about them?'],
  ['references.disliked', false, 'Which sites do you dislike, and why?'],
  [
    'legal.constraints',
    false,
    'Is the niche regulated, or are there legal notices the page must carry?',
  ],
  ['deploy.target', false, 'Where will the page be hosted?'],
  ['deploy.domain', false, 'Which domain should it use?'],
].map(([path, required, hint]) => ({ path, required, hint }));

/** Fields still empty: required first, then recommended in interview order. */
export function missingFields(brief) {
  const empty = MISSING_FIELDS.filter(
    ({ path }) => !isFilled(getPath(brief, path)),
  );
  return [
    ...empty.filter((f) => f.required),
    ...empty.filter((f) => !f.required),
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
  lines.push(`${business.name || '(no name yet)'} [${brief.language || '?'}]`);
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
  (brief.references?.liked ?? []).forEach((r) =>
    lines.push(
      `Likes: ${r.url}${r.sheet ? ` (sheet ${r.sheet})` : ''}${r.why ? `, ${r.why}` : ''}`,
    ),
  );
  (brief.references?.disliked ?? []).forEach((r) =>
    lines.push(`Dislikes: ${r.url}${r.why ? `, ${r.why}` : ''}`),
  );
  if (brief.legal?.regulated) lines.push('Legal: regulated niche');
  field('Legal notices', 'legal.notices');
  field('Legal constraints', 'legal.constraints');
  field('Deploy target', 'deploy.target');
  field('Domain', 'deploy.domain');
  (brief.assumed ?? []).forEach((a) =>
    lines.push(`Assumed ${a.field}: ${a.reason}`),
  );
  field('Notes', 'notes');
  return lines.join('\n');
}
