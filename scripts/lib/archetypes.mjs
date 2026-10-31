// Shared helpers for the design archetype catalog (design-archetypes/*.md): the closed vocabularies,
// a small front matter parser, the catalog loader and the sheet validator. Used by
// validate-archetypes.mjs, pick-archetypes.mjs, layout-signature.mjs and check-landing.mjs.
// Design: openspec/changes/add-design-archetypes/design.md (Decisions 1 to 4).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

import { FEATURE_NAMES, rangeProblem } from './layout-core.mjs';

export const HERO_TYPES = [
  'full-bleed-photo',
  'split',
  'typographic',
  'video',
  'illustration',
  'collage',
];

/** Requirement signals the synthesis may write on the `Signals:` line. Closed vocabulary. */
export const SIGNALS = [
  'premium',
  'playful',
  'serious',
  'technical',
  'heritage',
  'craft',
  'local-service',
  'product-showcase',
  'storytelling',
  'data-heavy',
  'editorial-content',
  'experimental',
  'calm',
  'bold',
  'conversion-first',
  'educational',
  'photo-rich',
  'few-assets',
];

/** Signals about the assets the customer has; they weigh more in the score. */
export const ASSET_SIGNALS = ['photo-rich', 'few-assets'];

/** Traits an archetype may lend to a blend. Each one is defined (once) in exactly one sheet. */
export const TRAITS = [
  'visible-grid',
  'mono-labels',
  'flush-left-axis',
  'split-sticky',
  'marquee-type',
  'giant-numerals',
  'horizontal-chapter',
  'chapter-index',
  'bento-grid',
  'spec-chips',
  'overlap-collage',
  'handwritten-accent',
  'drop-cap',
  'pull-quote',
  'scene-backdrop',
  'chaptered-overlay',
  'hours-card',
  'practical-strip',
  'stat-strip',
  'comparison-table',
  'ui-frame-hero',
  'two-tone-heading',
  'logo-strip-under-hero',
];

export const REQUIRED_SECTIONS = [
  'Layout grammar',
  'Header and footer',
  'Typography',
  'Imagery',
  'Buttons and links',
  'Motion',
  'Lendable traits',
  'Do',
  "Don't",
];

export const MAX_SUMMARY_CHARS = 240;

// --------------------------------------------------------------------------------------------------
// Front matter: scalars, inline lists and one level of nested maps. Nothing else is accepted.

const unquote = (s) =>
  s.length >= 2 &&
  ((s[0] === "'" && s.at(-1) === "'") || (s[0] === '"' && s.at(-1) === '"'))
    ? s.slice(1, -1)
    : s;

function scalarOrList(raw) {
  const text = raw.trim();
  if (/^\[.*\]$/.test(text)) {
    const inner = text.slice(1, -1).trim();
    return inner
      ? inner
          .split(',')
          .map((s) => unquote(s.trim()))
          .filter((s) => s !== '')
      : [];
  }
  return unquote(text);
}

/** Returns { data, lineOf, end, error }. `data` is null when there is no front matter. */
export function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---')
    return { data: null, lineOf: {}, end: 0, error: 'no front matter' };
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end < 0)
    return {
      data: null,
      lineOf: {},
      end: 0,
      error: 'front matter is not closed',
    };
  const data = {};
  const lineOf = {};
  let parent = null;
  for (let i = 1; i < end; i += 1) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    let line = raw;
    // A flow list that a formatter moved to the next line or wrapped over several lines.
    if (/:[ \t]*$/.test(line) && lines[i + 1]?.trim().startsWith('[')) {
      i += 1;
      line += ` ${lines[i].trim()}`;
    }
    // Continuation lines of a wrapped list.
    if (/\[[^\]]*$/.test(line)) {
      while (i + 1 < end && !line.includes(']')) {
        i += 1;
        line += ` ${lines[i].trim()}`;
      }
    }
    const top = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/.exec(line);
    const sub = /^[ \t]+([A-Za-z_][\w-]*):[ \t]*(.*)$/.exec(line);
    if (top) {
      const [, key, value] = top;
      lineOf[key] = i + 1;
      if (value === '') {
        data[key] = {};
        parent = key;
      } else {
        data[key] = scalarOrList(value);
        parent = null;
      }
    } else if (sub && parent) {
      const [, key, value] = sub;
      lineOf[`${parent}.${key}`] = i + 1;
      data[parent][key] = scalarOrList(value);
    } else {
      return {
        data: null,
        lineOf,
        end,
        error: `line ${i + 1}: cannot parse "${raw.trim()}"`,
      };
    }
  }
  return { data, lineOf, end };
}

/** H2 headings of the body with the text under each: { heading: body }. */
export function sectionsOf(text, fromLine = 0) {
  const lines = text.split(/\r?\n/).slice(fromLine);
  const out = {};
  let current = null;
  for (const line of lines) {
    const h = /^##[ \t]+(.+?)[ \t]*$/.exec(line);
    if (h) {
      current = h[1];
      out[current] = '';
    } else if (current) out[current] += `${line}\n`;
  }
  return out;
}

/** Trait ids defined as bullets "- `trait`: ..." in the "Lendable traits" section. */
export function definedTraits(sections) {
  const body = sections['Lendable traits'] ?? '';
  return [...body.matchAll(/^[ \t]*[-*][ \t]+`([a-z0-9-]+)`/gm)].map(
    (m) => m[1],
  );
}

// --------------------------------------------------------------------------------------------------
// Validation

/** Violations of one sheet: [{ line, field, message }]. `fileName` is the base name without .md. */
export function validateArchetype(text, fileName) {
  const violations = [];
  const add = (line, field, message) =>
    violations.push({ line, field, message });
  const fm = parseFrontmatter(text);
  if (!fm.data) {
    add(1, 'front matter', `missing or invalid (${fm.error})`);
    return violations;
  }
  const { data, lineOf } = fm;
  const at = (key) => lineOf[key] ?? 1;

  if (typeof data.name !== 'string' || !data.name)
    add(at('name'), 'name', 'is required');
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.name))
    add(
      at('name'),
      'name',
      `"${data.name}" must be lowercase words joined by hyphens`,
    );
  else if (data.name !== fileName)
    add(
      at('name'),
      'name',
      `"${data.name}" must equal the file name "${fileName}"`,
    );

  if (typeof data.summary !== 'string' || !data.summary)
    add(at('summary'), 'summary', 'is required (one or two sentences)');
  else if (data.summary.length > MAX_SUMMARY_CHARS)
    add(
      at('summary'),
      'summary',
      `is longer than ${MAX_SUMMARY_CHARS} characters`,
    );

  const checkList = (field, value, allowed, what) => {
    if (!Array.isArray(value)) {
      add(at(field), field, 'must be a list such as [a, b]');
      return [];
    }
    for (const item of value)
      if (!allowed.includes(item))
        add(
          at(field),
          field,
          `unknown ${what} "${item}" (allowed: ${allowed.join(', ')})`,
        );
    if (new Set(value).size !== value.length)
      add(at(field), field, 'has duplicate entries');
    return value;
  };

  const signals = data.signals;
  let fits = [];
  let avoid = [];
  if (!signals || Array.isArray(signals) || typeof signals !== 'object')
    add(at('signals'), 'signals', 'must have `fits` and `avoid` lists');
  else {
    if (!('fits' in signals)) add(at('signals'), 'signals.fits', 'is required');
    else fits = checkList('signals.fits', signals.fits, SIGNALS, 'signal');
    if (!('avoid' in signals))
      add(at('signals'), 'signals.avoid', 'is required');
    else avoid = checkList('signals.avoid', signals.avoid, SIGNALS, 'signal');
    if (Array.isArray(signals.fits) && !signals.fits.length)
      add(at('signals.fits'), 'signals.fits', 'must not be empty');
    for (const s of fits)
      if (avoid.includes(s))
        add(at('signals.avoid'), 'signals', `"${s}" is in both fits and avoid`);
  }

  if (!('lends' in data)) add(1, 'lends', 'is required');
  const lends =
    'lends' in data ? checkList('lends', data.lends, TRAITS, 'trait') : [];
  if (Array.isArray(data.lends) && (lends.length < 1 || lends.length > 3))
    add(at('lends'), 'lends', 'must list one to three traits');

  if (!('rejects' in data)) add(1, 'rejects', 'is required (use [] when none)');
  else checkList('rejects', data.rejects, TRAITS, 'trait');
  if (Array.isArray(data.rejects))
    for (const t of data.rejects)
      if (lends.includes(t))
        add(at('rejects'), 'rejects', `"${t}" is also lent by this sheet`);

  if (!('hero' in data)) add(1, 'hero', 'is required');
  else checkList('hero', data.hero, HERO_TYPES, 'hero type');
  if (Array.isArray(data.hero) && !data.hero.length)
    add(at('hero'), 'hero', 'must not be empty');

  const signature = data.signature;
  if (!signature || Array.isArray(signature) || typeof signature !== 'object')
    add(
      at('signature'),
      'signature',
      'must map layout-signature features to target ranges',
    );
  else {
    if (!Object.keys(signature).length)
      add(at('signature'), 'signature', 'must not be empty');
    for (const [feature, value] of Object.entries(signature)) {
      const line = at(`signature.${feature}`);
      if (!FEATURE_NAMES.includes(feature)) {
        add(
          line,
          `signature.${feature}`,
          `unknown feature (allowed: ${FEATURE_NAMES.join(', ')})`,
        );
        continue;
      }
      const problem = rangeProblem(feature, value);
      if (problem) add(line, `signature.${feature}`, problem);
    }
  }

  // Body
  const sections = sectionsOf(text, fm.end + 1);
  for (const heading of REQUIRED_SECTIONS)
    if (!(heading in sections))
      add(fm.end + 1, `section ${heading}`, `missing "## ${heading}" section`);
    else if (!sections[heading].trim())
      add(fm.end + 1, `section ${heading}`, `"## ${heading}" is empty`);
  const defined = definedTraits(sections);
  for (const trait of lends)
    if (!defined.includes(trait))
      add(
        at('lends'),
        'lends',
        `trait "${trait}" is not defined in "## Lendable traits" (add a bullet "- \`${trait}\`: ...")`,
      );
  for (const trait of defined)
    if (!lends.includes(trait))
      add(
        at('lends'),
        'lends',
        `"## Lendable traits" defines "${trait}" which is not in lends`,
      );
  if (/https?:\/\//i.test(text))
    add(1, 'content', 'sheets name no real site and contain no URLs');
  return violations;
}

// --------------------------------------------------------------------------------------------------
// Catalog

export const catalogDir = (root) => join(root, 'design-archetypes');

/** Sheet files of the catalog (README.md and files starting with _ are not sheets). */
export function sheetFiles(root) {
  const dir = catalogDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('_'))
    .sort()
    .map((f) => join(dir, f));
}

/** Parsed catalog: [{ name, summary, fits, avoid, lends, rejects, hero, signature, file }], by name. */
export function loadCatalog(root) {
  return sheetFiles(root)
    .map((file) => {
      const fm = parseFrontmatter(readFileSync(file, 'utf8'));
      if (!fm.data) return null;
      const d = fm.data;
      return {
        name: d.name || basename(file, '.md'),
        summary: d.summary ?? '',
        fits: d.signals?.fits ?? [],
        avoid: d.signals?.avoid ?? [],
        lends: d.lends ?? [],
        rejects: d.rejects ?? [],
        hero: d.hero ?? [],
        signature: d.signature ?? {},
        file,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --------------------------------------------------------------------------------------------------
// landing-meta: `archetype: primary[+secondary]` (or `custom`) and `traits: a, b, ref:<sheet>/<trait>`

export const CUSTOM = 'custom';

/** { archetype, primary, secondary, traits[] } from a MASTER.md landing-meta block, or null. */
export function readArchetypeMeta(markdown) {
  const match = /^```landing-meta[ \t]*\r?\n([\s\S]*?)^```/m.exec(markdown);
  if (!match) return null;
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^\s*([a-z-]+)\s*:\s*(.+?)\s*$/i.exec(line);
    if (pair) values[pair[1].toLowerCase()] = pair[2];
  }
  const archetype = values.archetype ?? '';
  const [primary = '', secondary = ''] = archetype
    .split('+')
    .map((s) => s.trim());
  const traits = (values.traits ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return { archetype, primary, secondary, traits };
}

/** Problems with the archetype and traits of a landing-meta block (names checked against `names`). */
export function archetypeMetaProblems(meta, names) {
  const problems = [];
  if (!meta?.archetype) return problems;
  const parts = meta.archetype.split('+').map((s) => s.trim());
  if (parts.length > 2 || parts.some((p) => !p))
    problems.push(
      `archetype must be "primary" or "primary+secondary", got "${meta.archetype}"`,
    );
  else if (parts[0] === CUSTOM && parts.length > 1)
    problems.push('archetype "custom" takes no secondary');
  else if (names?.length)
    for (const p of parts)
      if (p !== CUSTOM && !names.includes(p))
        problems.push(`archetype "${p}" is not in design-archetypes/`);
  for (const t of meta.traits ?? []) {
    const ref = /^ref:([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(t);
    if (!(ref ? TRAITS.includes(ref[2]) : TRAITS.includes(t)))
      problems.push(
        `trait "${t}" is not in the trait vocabulary (use a name or ref:<sheet>/<trait>)`,
      );
  }
  return problems;
}

/** The `landing-meta` block of a MASTER.md (primary, fonts, hero, blend), or null when it has none. */
export function parseLandingMeta(markdown) {
  const match = /^```landing-meta[ \t]*\r?\n([\s\S]*?)^```/m.exec(markdown);
  if (!match) return null;
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^\s*([a-z-]+)\s*:\s*(.+?)\s*$/i.exec(line);
    if (pair) values[pair[1].toLowerCase()] = pair[2];
  }
  const { archetype, traits } = readArchetypeMeta(markdown);
  return {
    primary: values.primary ?? '',
    displayFont: values['display-font'] ?? '',
    bodyFont: values['body-font'] ?? '',
    hero: values.hero ?? '',
    archetype,
    traits,
  };
}
