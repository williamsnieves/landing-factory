#!/usr/bin/env node
// Final check of a generated landing, run after site QA passes.
//
//   node scripts/check-landing.mjs --site <slug> [--refs url,url] [--json]
//
// Rules (design: openspec/changes/add-new-landing-skill/design.md, Decision 6). Each failure names the item:
//   uncredited-image   an image under src/assets/ or public/ has no assets.json entry (or an entry has no file)
//   credits-stale      CREDITS.md or src/data/credits.json is out of sync with assets.json (scripts/credits.mjs)
//   photo-overuse      one source photo is referenced from more than two places in src/
//   tokens-mismatch    a palette hex or font family of design-system/<slug>/MASTER.md is missing from tokens.css
//   contrast           a standard text pair of tokens.css (ink/paper, primary-contrast/primary, ...) is below 4.5:1
//   landing-meta       MASTER.md has no valid `landing-meta` block
//   diversity          another site matches on primary color, display font and hero type all at once
//   layout-diversity   another site's layout signature (scripts/layout-signature.mjs) is closer than diversity.minLayoutDistance
//                      or shares more than diversity.maxHashMatch of its screenshot hashes (thresholds in qa.config.json)
//   scenes             a built [data-scene] has no poster <img>, a poster not recorded in assets.json (a museum
//                      or Commons image, or a self-rendered one with source "self"), or the site has more than 2 scenes
//   brief-facts        (only when sites/<slug>/brief.json exists) a non-assumed fact of the brief (business name, primary
//                      call-to-action URL, contact email and phone, each product name and price) is missing from the
//                      built dist/index.html, or an element holding a customer fact also says "ejemplo"/"example"/"sample"
//   ai-provenance      (only when assets.json has entries with source "ai") an AI entry lacks a provenance field (generator,
//                      model, prompt, createdAt, terms, ...) or its image file, the brief does not allow AI images
//                      (brand.aiImages is not "allowed"), the built dist/index.html has no visible element marked
//                      data-ai-disclosure with text, an entry's prompt breaks the AI image prompt policy, an entry has a
//                      subject other than "owner", or a subject "owner" portrait lacks the owner's consent (brand.aiImages and
//                      brand.ownerPortrait both "allowed" in a brief)
//   i18n               (only when astro.config.mjs has an `i18n` block) a locale without its home page, a wrong <html lang>,
//                      hreflang alternates that are missing, not reciprocal or without x-default, a missing or broken
//                      language switcher, config/dictionary/brief locales that disagree, or a page that shows the UI
//                      strings of another locale (src/i18n/ui.ts). With i18n, ai-provenance checks the disclosure on every
//                      locale's home page and brief-facts checks the business name on each of them
//   copy-match         (--refs) 8 words in a row of the built page text also appear in a reference page
//
// Warnings (never failures): archetype-target, the built layout signature is outside the ranges of the primary
// archetype in landing-meta (the archetypes are a base, not a template).
//
// Exit codes: 0 all checks passed, 1 at least one failed, 2 the run itself broke (unknown site, missing
// dist/ with --refs, a reference that cannot be fetched).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { reexecWithEnvProxy } from './lib/proxy.mjs';
import { AI_REQUIRED_FIELDS, isAi, syncCredits } from './credits.mjs';
import {
  aiImagesConsent,
  briefLocales,
  ownerPortraitConsent,
  formatErrors,
  getPath,
  isAssumed,
  isFilled,
  validateBrief,
} from './lib/brief-schema.mjs';
import {
  archetypeMetaProblems,
  loadCatalog,
  readArchetypeMeta,
} from './lib/archetypes.mjs';
import { checkPrompt, formatViolations } from './lib/ai-prompt-policy.mjs';
import {
  alternatesOf,
  canonicalOf,
  htmlLang,
  localeIndexFile,
  localeOfFile,
  readI18nConfig,
  readUiDictionary,
  switcherOf,
} from './lib/i18n-site.mjs';
import { compareSignatures, targetWarnings } from './lib/layout-core.mjs';
import { loadConfig } from './qa/config.mjs';
import { SLUG_PATTERN, listSites } from './lib/sites.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const HERO_TYPES = [
  'full-bleed-photo',
  'split',
  'typographic',
  'video',
  'illustration',
  'collage',
];
export const MAX_USES_PER_PHOTO = 2;
export const SHINGLE_WORDS = 8;
export const MAX_QUOTE_WORDS = 12;
export const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.gif',
  '.svg',
  '.ico',
]);
const IGNORED_IMAGES = new Set(['favicon.svg']);
const SOURCE_EXTENSIONS = new Set([
  '.astro',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.css',
]);

class RunError extends Error {}

const failure = (rule, item, message) => ({ rule, item, message });

// --------------------------------------------------------------------------------------------------
// Files

function walk(dir, filter = () => true) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git'))
      return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, filter);
    return filter(path) ? [path] : [];
  });
}
const extension = (path) => {
  const match = /\.[^./\\]+$/.exec(path);
  return match ? match[0].toLowerCase() : '';
};
const posix = (path) => path.split(sep).join('/');

function readManifest(siteDir) {
  const path = join(siteDir, 'assets.json');
  if (!existsSync(path)) return { images: [] };
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (!data || !Array.isArray(data.images))
    throw new RunError(`${path}: expected {"images": [...]}`);
  return data;
}

// --------------------------------------------------------------------------------------------------
// Rule: every image file has a manifest entry

/** Image files of the site: src/assets/** and public/**, except favicon.svg. Paths relative to the site. */
export function imageFiles(siteDir) {
  return ['src/assets', 'public']
    .flatMap((folder) =>
      walk(join(siteDir, folder), (path) =>
        IMAGE_EXTENSIONS.has(extension(path)),
      ),
    )
    .map((path) => posix(relative(siteDir, path)))
    .filter((path) => !IGNORED_IMAGES.has(basename(path)))
    .sort();
}

/** The names an image can be listed under in assets.json: bare name, or path inside a known folder. */
export function manifestNames(sitePath) {
  const names = [basename(sitePath)];
  for (const folder of ['src/assets/images/', 'src/assets/', 'public/'])
    if (sitePath.startsWith(folder)) names.push(sitePath.slice(folder.length));
  return names;
}

export function checkUncredited(siteDir, manifest) {
  const listed = new Set(manifest.images.map((entry) => entry.file));
  const files = imageFiles(siteDir);
  const failures = [];
  for (const file of files)
    if (!manifestNames(file).some((name) => listed.has(name)))
      failures.push(
        failure(
          'uncredited-image',
          file,
          `${file} has no entry in assets.json; add it with scripts/find-images.mjs or remove the file`,
        ),
      );
  for (const entry of manifest.images)
    if (
      entry.source === 'customer' &&
      (!String(entry.owner ?? '').trim() ||
        !String(entry.permission ?? '').trim())
    )
      failures.push(
        failure(
          'uncredited-image',
          entry.file,
          `${entry.file} is a customer asset in assets.json without ${!String(entry.owner ?? '').trim() ? '"owner"' : '"permission"'}; record who owns it and what the customer allowed`,
        ),
      );
  for (const entry of manifest.images)
    if (!files.some((file) => manifestNames(file).includes(entry.file)))
      failures.push(
        failure(
          'uncredited-image',
          entry.file,
          `assets.json lists ${entry.file} but no such image exists in src/assets/ or public/; remove the entry or restore the file`,
        ),
      );
  return failures;
}

// --------------------------------------------------------------------------------------------------
// Rule: credits in sync

export function checkCredits(slug, root) {
  try {
    const { stale } = syncCredits({ slug, root, check: true });
    return stale.length
      ? [
          failure(
            'credits-stale',
            stale.join(', '),
            `${stale.join(' and ')} out of date; run: node scripts/credits.mjs --site ${slug}`,
          ),
        ]
      : [];
  } catch (error) {
    return [failure('credits-stale', 'assets.json', error.message)];
  }
}

// --------------------------------------------------------------------------------------------------
// Rule: a source photo is used at most twice

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:\w"'`/])\/\/[^\n]*/g, '$1');
}

const DEFAULT_IMPORT =
  /import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s+from\s+(['"])([^'"\n]+)\2\s*;?/g;

/**
 * Counts how many places in src/ reference each image file of the manifest. Heuristic, per source file:
 *   - each `import name from '.../file.jpg'` binds a name; every later occurrence of that name (not as a
 *     property like `x.name`, and not as an object key like `{ name: ... }`) counts as one use;
 *   - every other occurrence of the file name inside a string, `url()` or path counts as one use.
 * Returns Map<manifest file name, [{ source: 'src/...', count }]>.
 * Limits: references are counted where they are written, not where they render (an array of products that
 * maps over one imported photo counts once); aliases (`const a = hero`) are not followed; commented-out
 * code is ignored on a best-effort basis. "Never twice in one section" stays a review rule of the skill.
 */
export function countFileUses(siteDir, files) {
  const sources = walk(join(siteDir, 'src'), (path) =>
    SOURCE_EXTENSIONS.has(extension(path)),
  );
  const uses = new Map(files.map((file) => [file, []]));
  for (const source of sources) {
    const original = stripComments(readFileSync(source, 'utf8'));
    for (const file of files) {
      const bindings = [];
      const withoutImports = original.replace(
        DEFAULT_IMPORT,
        (match, name, _q, path) => {
          const clean = path.split(/[?#]/)[0];
          if (basename(clean) !== basename(file) || !clean.endsWith(file))
            return match;
          bindings.push(name);
          return '';
        },
      );
      let count = 0;
      for (const name of bindings) {
        const id = escapeRegExp(name);
        const all =
          withoutImports.match(
            new RegExp(`(?<![\\w$.])${id}(?![\\w$])`, 'g'),
          ) ?? [];
        // `{ visit: visit }` or a data key named like the binding is not a use of the photo.
        const keys =
          withoutImports.match(
            new RegExp(`(?:^|[{,])\\s*["']?${id}["']?\\s*:(?!:)`, 'gm'),
          ) ?? [];
        count += all.length - keys.length;
      }
      count += (
        withoutImports.match(
          new RegExp(`(?<![\\w.-])${escapeRegExp(file)}(?![\\w-]|\\.\\w)`, 'g'),
        ) ?? []
      ).length;
      if (count)
        uses
          .get(file)
          .push({ source: posix(relative(siteDir, source)), count });
    }
  }
  return uses;
}

export function checkPhotoUses(siteDir, manifest, max = MAX_USES_PER_PHOTO) {
  const bySource = new Map();
  for (const entry of manifest.images) {
    // An AI image has no source page and its title is a description, so every AI file counts on its own.
    const key = isAi(entry)
      ? `ai:${entry.file}`
      : entry.sourcePage || entry.title || entry.file;
    if (!bySource.has(key))
      bySource.set(key, { title: entry.title ?? key, files: [] });
    bySource.get(key).files.push(entry.file);
  }
  const uses = countFileUses(
    siteDir,
    manifest.images.map((entry) => entry.file),
  );
  const failures = [];
  for (const { title, files } of bySource.values()) {
    const places = files.flatMap((file) =>
      uses.get(file).map((use) => ({ file, ...use })),
    );
    const total = places.reduce((sum, place) => sum + place.count, 0);
    if (total > max)
      failures.push(
        failure(
          'photo-overuse',
          files.join(', '),
          `${title.replace(/^File:/, '')} is used ${total} times (max ${max}): ${places
            .map((p) => `${p.source} -> ${p.file} x${p.count}`)
            .join('; ')}. Use another photo for the extra places`,
        ),
      );
  }
  return failures;
}

// --------------------------------------------------------------------------------------------------
// Rules: MASTER.md palette and fonts in tokens.css, landing-meta, diversity

/** The fenced ```landing-meta block as { primary, displayFont, bodyFont, hero }, or null when absent. */
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

export function normalizeHex(hex) {
  const h = hex.replace(/^#/, '').toLowerCase();
  return h.length === 3 || h.length === 4
    ? `#${[...h].map((c) => c + c).join('')}`
    : `#${h}`;
}

/** Hex colors in the table rows of the section whose heading contains "palette" (or "paleta"). */
export function paletteHexes(markdown) {
  const lines = markdown.split(/\r?\n/);
  let level = 0;
  let inFence = false;
  const hexes = [];
  let found = false;
  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      if (level && heading[1].length <= level) level = 0;
      if (!level && /palette|paleta/i.test(heading[2])) {
        level = heading[1].length;
        found = true;
      }
      continue;
    }
    if (level && line.trim().startsWith('|'))
      hexes.push(
        ...(line.match(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi) ?? []),
      );
  }
  return found ? [...new Set(hexes.map(normalizeHex))] : null;
}

export function checkTokens(slug, root) {
  const masterPath = join(root, 'design-system', slug, 'MASTER.md');
  const tokensPath = join(root, 'sites', slug, 'src/styles/tokens.css');
  if (!existsSync(masterPath))
    return [
      failure(
        'tokens-mismatch',
        `design-system/${slug}/MASTER.md`,
        `design-system/${slug}/MASTER.md does not exist (the design system phase writes it)`,
      ),
    ];
  if (!existsSync(tokensPath))
    return [
      failure(
        'tokens-mismatch',
        `sites/${slug}/src/styles/tokens.css`,
        'tokens.css does not exist',
      ),
    ];
  const master = readFileSync(masterPath, 'utf8');
  const tokens = readFileSync(tokensPath, 'utf8').toLowerCase();
  const tokenHexes = new Set(
    (tokens.match(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/g) ?? []).map(
      normalizeHex,
    ),
  );
  const failures = [];
  const palette = paletteHexes(master);
  if (!palette?.length)
    failures.push(
      failure(
        'tokens-mismatch',
        'Palette',
        `MASTER.md has no Palette section with a table of hex colors`,
      ),
    );
  for (const hex of palette ?? [])
    if (!tokenHexes.has(hex))
      failures.push(
        failure(
          'tokens-mismatch',
          hex,
          `palette color ${hex} of MASTER.md is missing from tokens.css`,
        ),
      );
  const meta = parseLandingMeta(master);
  if (meta) {
    for (const family of [meta.displayFont, meta.bodyFont].filter(Boolean))
      if (!tokens.includes(family.toLowerCase()))
        failures.push(
          failure(
            'tokens-mismatch',
            family,
            `font family "${family}" of MASTER.md is missing from tokens.css`,
          ),
        );
    if (
      /^#[0-9a-f]{3,8}$/i.test(meta.primary) &&
      !tokenHexes.has(normalizeHex(meta.primary))
    )
      failures.push(
        failure(
          'tokens-mismatch',
          meta.primary,
          `landing-meta primary ${meta.primary} is missing from tokens.css`,
        ),
      );
  }
  return failures;
}

// --------------------------------------------------------------------------------------------------
// Rule: WCAG contrast of the standard text pairs in tokens.css

export const MIN_CONTRAST = 4.5;
/** [foreground token, background token]; a pair is checked only when both tokens exist as hex colors. */
export const CONTRAST_PAIRS = [
  ['ink', 'paper'],
  ['ink', 'surface'],
  ['ink-soft', 'paper'],
  ['ink-soft', 'surface'],
  ['primary-contrast', 'primary'],
  ['primary-contrast', 'primary-hover'],
  ['primary', 'paper'],
  ['primary', 'surface'],
  ['paper', 'ink'],
];

/** `--color-<name>: #hex` declarations of a stylesheet as { name: '#rrggbb' }. */
export function colorTokens(css) {
  const tokens = {};
  const re = /--color-([a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,8})\b/gi;
  for (const [, name, hex] of css.matchAll(re))
    tokens[name.toLowerCase()] = normalizeHex(hex);
  return tokens;
}

function luminance(hex) {
  const channel = (i) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG 2.x contrast ratio of two #rrggbb colors. */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function checkContrast(slug, root) {
  const path = join(root, 'sites', slug, 'src/styles/tokens.css');
  if (!existsSync(path)) return []; // checkTokens reports the missing file
  const tokens = colorTokens(readFileSync(path, 'utf8'));
  const failures = [];
  for (const [fg, bg] of CONTRAST_PAIRS) {
    if (
      !tokens[fg] ||
      !tokens[bg] ||
      tokens[fg].length !== 7 ||
      tokens[bg].length !== 7
    )
      continue;
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    if (ratio < MIN_CONTRAST)
      failures.push(
        failure(
          'contrast',
          `${fg}/${bg}`,
          `${fg} ${tokens[fg]} on ${bg} ${tokens[bg]} has contrast ${ratio.toFixed(2)}:1 (min ${MIN_CONTRAST}:1); adjust tokens.css and MASTER.md`,
        ),
      );
  }
  return failures;
}

export function validateLandingMeta(meta, archetypeNames = []) {
  if (!meta)
    return ['no ```landing-meta block (keys: primary, display-font, hero)'];
  const problems = [];
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(meta.primary))
    problems.push(
      `primary must be a hex color like #92400e, got "${meta.primary}"`,
    );
  if (!meta.displayFont) problems.push('display-font is missing');
  if (!HERO_TYPES.includes(meta.hero))
    problems.push(
      `hero must be one of ${HERO_TYPES.join(', ')}, got "${meta.hero}"`,
    );
  problems.push(...archetypeMetaProblems(meta, archetypeNames));
  return problems;
}

export function checkLandingMeta(slug, root) {
  const masterPath = join(root, 'design-system', slug, 'MASTER.md');
  if (!existsSync(masterPath)) return []; // checkTokens already reports the missing file
  const problems = validateLandingMeta(
    parseLandingMeta(readFileSync(masterPath, 'utf8')),
    loadCatalog(root).map((a) => a.name),
  );
  return problems.map((problem) =>
    failure('landing-meta', `design-system/${slug}/MASTER.md`, problem),
  );
}

/** Fails when another site's landing-meta matches this one on primary color, display font and hero type. */
export function checkDiversity(slug, root) {
  const read = (name) => {
    const path = join(root, 'design-system', name, 'MASTER.md');
    return existsSync(path)
      ? parseLandingMeta(readFileSync(path, 'utf8'))
      : null;
  };
  const mine = read(slug);
  if (!mine || validateLandingMeta(mine).length) return [];
  const failures = [];
  for (const other of listSites(join(root, 'sites'))) {
    if (other === slug) continue;
    const theirs = read(other);
    if (!theirs || validateLandingMeta(theirs).length) continue;
    if (
      normalizeHex(theirs.primary) === normalizeHex(mine.primary) &&
      theirs.displayFont.toLowerCase() === mine.displayFont.toLowerCase() &&
      theirs.hero === mine.hero
    )
      failures.push(
        failure(
          'diversity',
          other,
          `looks like sites/${other}: same primary color ${mine.primary}, display font ${mine.displayFont} and hero type ${mine.hero}; change at least one`,
        ),
      );
  }
  return failures;
}

// --------------------------------------------------------------------------------------------------
// Rule: layout diversity (design: add-design-archetypes, Decisions 6 and 7)

export const signatureFile = (root, slug) =>
  join(root, 'sites', slug, 'layout-signature.json');

function readSignature(root, slug) {
  const path = signatureFile(root, slug);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return data && data.features && Array.isArray(data.hashes) ? data : null;
  } catch {
    return null;
  }
}

const formatValue = (v) => (v === null || v === undefined ? '-' : String(v));

/**
 * Fails when this site's layout is too close to another site's: weighted feature distance under
 * `minLayoutDistance`, or more than `maxHashMatch` of the viewport slices matching within `hashHamming` bits.
 * Sites without a signature are not compared. A missing signature for this site fails when there is
 * another site to compare with (run scripts/layout-signature.mjs --site <slug> --write after the build; this
 * check never starts a browser itself).
 */
export function checkLayoutDiversity(slug, root, thresholds) {
  const others = listSites(join(root, 'sites')).filter(
    (name) => name !== slug && readSignature(root, name),
  );
  if (!others.length) return [];
  const mine = readSignature(root, slug);
  if (!mine)
    return [
      failure(
        'layout-diversity',
        `sites/${slug}/layout-signature.json`,
        `sites/${slug}/layout-signature.json is missing or invalid, so the layout cannot be compared with ${others.join(', ')}; build the site and run node scripts/layout-signature.mjs --site ${slug} --write`,
      ),
    ];
  const failures = [];
  for (const other of others) {
    const result = compareSignatures(mine, readSignature(root, other), {
      hashHamming: thresholds.hashHamming,
    });
    const tooClose = result.distance < thresholds.minLayoutDistance;
    const sameShots = result.hashMatch > thresholds.maxHashMatch;
    if (!tooClose && !sameShots) continue;
    const shared = result.shared
      .slice(0, 4)
      .map((p) => `${p.name} ${formatValue(p.a)}`)
      .join(', ');
    const why = [
      tooClose
        ? `layout distance ${result.distance.toFixed(2)} is under ${thresholds.minLayoutDistance}`
        : null,
      sameShots
        ? `${Math.round(result.hashMatch * 100)}% of the viewport screenshots match (limit ${Math.round(thresholds.maxHashMatch * 100)}%)`
        : null,
    ]
      .filter(Boolean)
      .join('; ');
    failures.push(
      failure(
        'layout-diversity',
        other,
        `same layout as sites/${other}: ${why}; shared features: ${shared || 'none close'}; change the composition (another archetype or section patterns), not only colors and fonts`,
      ),
    );
  }
  return failures;
}

/** Warnings: measured features outside the ranges of the primary archetype named in landing-meta. */
export function archetypeWarnings(slug, root) {
  const masterPath = join(root, 'design-system', slug, 'MASTER.md');
  const signature = readSignature(root, slug);
  if (!existsSync(masterPath) || !signature) return [];
  const meta = readArchetypeMeta(readFileSync(masterPath, 'utf8'));
  if (!meta?.primary || meta.primary === 'custom') return [];
  const sheet = loadCatalog(root).find((a) => a.name === meta.primary);
  if (!sheet) return [];
  const misses = targetWarnings(signature.features, sheet.signature);
  if (!misses.length) return [];
  return [
    {
      rule: 'archetype-target',
      item: meta.primary,
      message: `outside the ${meta.primary} ranges (a deviation needs a line in RUN.md "Design decisions"): ${misses
        .map(
          (m) =>
            `${m.feature} ${formatValue(m.value)} (expected ${m.expected})`,
        )
        .join('; ')}`,
    },
  ];
}

// --------------------------------------------------------------------------------------------------
// Rule: no 8-word run copied from a reference

const BLOCK_TAGS =
  'address|article|aside|blockquote|body|br|dd|details|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|summary|table|tbody|td|tfoot|th|thead|tr|ul';

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Visible text of an HTML document: scripts, styles and tags dropped; block elements end a line. */
export function htmlToText(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(
      /<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1\s*>/gi,
      ' ',
    )
    .replace(new RegExp(`</?(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi'), '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
      if (entity[0] === '#') {
        const code =
          entity[1].toLowerCase() === 'x'
            ? parseInt(entity.slice(2), 16)
            : parseInt(entity.slice(1), 10);
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    })
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/** Lowercase, accents and punctuation removed: an array of words. */
export function normalizeWords(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

export function shingles(words, size = SHINGLE_WORDS) {
  const set = new Set();
  for (let i = 0; i + size <= words.length; i += 1)
    set.add(words.slice(i, i + size).join(' '));
  return set;
}

/** Split visible text into sentences (a line may hold several). */
function sentences(text) {
  return text
    .split('\n')
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

const quote = (sentence) => {
  const words = sentence.split(/\s+/);
  return words.length > MAX_QUOTE_WORDS
    ? `${words.slice(0, MAX_QUOTE_WORDS).join(' ')}...`
    : sentence;
};

/**
 * Compare built pages with reference texts. `pages` is [{ page, text }], `references` is [{ url, text }].
 * A sentence of a page matches when any 8 consecutive words of it also occur in a reference. Block
 * elements are separate lines, so a run never spans two paragraphs or a heading and its paragraph.
 */
export function findCopiedSentences(pages, references) {
  const refSets = references.map((ref) => ({
    url: ref.url,
    shingles: shingles(normalizeWords(ref.text.replace(/\n/g, ' '))),
  }));
  const failures = [];
  const seen = new Set();
  for (const { page, text } of pages) {
    for (const sentence of sentences(text)) {
      const own = shingles(normalizeWords(sentence));
      for (const ref of refSets) {
        if (![...own].some((s) => ref.shingles.has(s))) continue;
        const key = `${page}|${sentence}|${ref.url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        failures.push(
          failure(
            'copy-match',
            page,
            `"${quote(sentence)}" shares ${SHINGLE_WORDS} words in a row with ${ref.url}; rewrite it`,
          ),
        );
      }
    }
  }
  return failures;
}

/** Built pages of a site: [{ page: '/index.html' style path, text }]. 404.html is skipped. */
export function builtPages(siteDir) {
  const dist = join(siteDir, 'dist');
  if (!existsSync(dist) || !statSync(dist).isDirectory())
    throw new RunError(
      `${posix(relative(ROOT, dist))} does not exist; build first (npm run build -w site-${basename(siteDir)}), the originality check reads the built HTML`,
    );
  return walk(
    dist,
    (path) => path.endsWith('.html') && basename(path) !== '404.html',
  )
    .sort()
    .map((path) => ({
      page: `/${posix(relative(dist, path))}`,
      text: htmlToText(readFileSync(path, 'utf8')),
    }));
}

// --------------------------------------------------------------------------------------------------
// Rule: every 3D scene has a recorded poster (design: add-3d-scenes, Decision 7)

export const MAX_SCENES = 2;

/** Poster `<img>` of every `<figure data-scene>` in an HTML string: [{ name, src }] (src null when missing). */
export function scenesInHtml(html) {
  const scenes = [];
  const figure =
    /<figure\b[^>]*\bdata-scene\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/figure>/gi;
  for (const match of html.matchAll(figure)) {
    const img = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(match[2]);
    scenes.push({ name: match[1], src: img ? img[1] : null });
  }
  return scenes;
}

/**
 * Does a built image URL come from the manifest file? Astro names optimized images
 * `<stem>.<hash>[_<hash>].<ext>`; images in public/ keep their name.
 */
export function posterMatchesFile(src, file) {
  const built = basename(src.split(/[?#]/)[0]);
  const stem = file.replace(/\.[^.]+$/, '');
  return built === file || built.startsWith(`${stem}.`);
}

export function checkScenes(siteDir, manifest) {
  const dist = join(siteDir, 'dist');
  const usesScene3D = walk(join(siteDir, 'src'), (path) =>
    path.endsWith('.astro'),
  ).some((path) => /<Scene3D\b/.test(readFileSync(path, 'utf8')));
  if (!existsSync(dist)) {
    return usesScene3D
      ? [
          failure(
            'scenes',
            'dist',
            `the site uses <Scene3D /> but sites/${basename(siteDir)}/dist does not exist; build first so the posters can be checked`,
          ),
        ]
      : [];
  }
  const failures = [];
  const names = new Set();
  const pages = walk(dist, (path) => path.endsWith('.html'));
  for (const path of pages) {
    const page = `/${posix(relative(dist, path))}`;
    for (const scene of scenesInHtml(readFileSync(path, 'utf8'))) {
      names.add(scene.name);
      const item = `${page}#${scene.name}`;
      if (!scene.src) {
        failures.push(
          failure(
            'scenes',
            item,
            `scene "${scene.name}" on ${page} has no poster <img>; pass poster to <Scene3D />`,
          ),
        );
        continue;
      }
      const entry = manifest.images.find((e) =>
        posterMatchesFile(scene.src, e.file),
      );
      if (!entry)
        failures.push(
          failure(
            'scenes',
            item,
            `the poster of scene "${scene.name}" on ${page} (${basename(scene.src)}) is not in assets.json; record a museum or Commons image with find-images, or render one with scripts/render-poster.mjs`,
          ),
        );
    }
  }
  if (names.size > MAX_SCENES)
    failures.push(
      failure(
        'scenes',
        [...names].join(', '),
        `the site has ${names.size} scenes (${[...names].join(', ')}); at most ${MAX_SCENES} are allowed`,
      ),
    );
  return failures;
}

// --------------------------------------------------------------------------------------------------
// Rule: the facts of the customer brief are on the built page (design: add-brief-intake, Decision 6)

/** Lowercase, accents removed, whitespace collapsed. */
const squash = (text) =>
  String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** The number of a price ("29", "29 €", "€ 29,00" -> "29"; "19,50" stays), or '' for a non-numeric price ("gratis"). */
export function priceCore(price) {
  return String(price)
    .replace(/[^\d.,]/g, '')
    .replace(/^[.,]+|[.,]+$/g, '')
    .replace(/[.,]00$/, '');
}

/** A RegExp (flags `gi`) matching a price in page text: the number with an optional ",00"/".00", no neighbouring digits. */
export function priceRegExp(price) {
  const core = priceCore(price);
  if (!core) return new RegExp(escapeRegExp(String(price).trim()), 'gi');
  const number = core.split(/[.,]/).map(escapeRegExp).join('[.,]');
  return new RegExp(`(?<![\\d.,])${number}(?:[.,]00)?(?!\\d|[.,]\\d)`, 'gi');
}

const phoneRegExp = (phone) =>
  new RegExp(
    [...String(phone)]
      .filter((c) => /[\d+]/.test(c))
      .map((c) => (c === '+' ? '\\+' : c))
      .join('[\\s().-]*'),
    'g',
  );

/** Every non-assumed, non-empty fact of a brief the page must carry: [{ path, kind, value }]. */
export function briefFacts(brief) {
  const facts = [];
  const add = (path, kind) => {
    const value = getPath(brief, path);
    if (typeof value !== 'string' || !isFilled(value) || isAssumed(brief, path))
      return;
    facts.push({ path, kind, value: value.trim() });
  };
  add('business.name', 'text');
  add('goal.primary.url', 'url');
  add('contact.email', 'email');
  add('contact.phone', 'phone');
  (Array.isArray(brief.offer) ? brief.offer : []).forEach((_, index) => {
    add(`offer[${index}].name`, 'text');
    add(`offer[${index}].price`, 'price');
  });
  return facts;
}

const decodeAttribute = (value) => value.replace(/&amp;/gi, '&');

/** href values of an HTML string. */
export function hrefsOf(html) {
  return [
    ...String(html).matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi),
  ].map((m) => decodeAttribute(m[1] ?? m[2]));
}

const trimSlash = (url) => url.replace(/\/+$/, '');
const digitsOnly = (text) => String(text).replace(/[\s().-]/g, '');

/** Does the page carry the fact? `text` is the visible text (lines joined), `hrefs` the link targets. */
function factPresent(fact, text, hrefs) {
  switch (fact.kind) {
    case 'text':
      return squash(text).includes(squash(fact.value));
    case 'url':
      return hrefs.some((href) => trimSlash(href) === trimSlash(fact.value));
    case 'email': {
      const email = fact.value.toLowerCase();
      return (
        text.toLowerCase().includes(email) ||
        hrefs.some((href) => href.toLowerCase().startsWith(`mailto:${email}`))
      );
    }
    case 'phone': {
      const wanted = digitsOnly(fact.value);
      return (
        digitsOnly(text).includes(wanted) ||
        hrefs.some(
          (href) =>
            /^tel:/i.test(href) && digitsOnly(href.slice(4)).includes(wanted),
        )
      );
    }
    case 'price':
      return priceRegExp(fact.value).test(text);
    default:
      return false;
  }
}

/** A RegExp that finds the fact inside one line of text (to cut it out before looking for sample words), or null. */
function factInLine(fact) {
  switch (fact.kind) {
    case 'text':
    case 'email':
      return new RegExp(escapeRegExp(squash(fact.value)), 'g');
    case 'phone':
      return phoneRegExp(fact.value);
    case 'price':
      return priceRegExp(squash(fact.value));
    default:
      return null;
  }
}

const sampleRegExp = (words) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])(${words.map((w) => escapeRegExp(squash(w))).join('|')})(?:e?s)?(?![\\p{L}\\p{N}])`,
    'u',
  );

export function checkBriefFacts(
  siteDir,
  root = ROOT,
  sampleWords = ['ejemplo', 'example', 'sample'],
) {
  const briefPath = join(siteDir, 'brief.json');
  if (!existsSync(briefPath)) return [];
  const slug = basename(siteDir);
  let brief;
  try {
    brief = JSON.parse(readFileSync(briefPath, 'utf8'));
  } catch (error) {
    return [
      failure(
        'brief-facts',
        'brief.json',
        `sites/${slug}/brief.json is not valid JSON: ${error.message}`,
      ),
    ];
  }
  const patternsDir = join(root, 'patterns');
  const problems = validateBrief(brief, {
    baseDir: siteDir,
    patternsDir: existsSync(patternsDir) ? patternsDir : null,
  });
  if (problems.length)
    return [
      failure(
        'brief-facts',
        'brief.json',
        `sites/${slug}/brief.json is invalid (run: node scripts/brief.mjs validate --site ${slug}):\n${formatErrors(problems)}`,
      ),
    ];
  // A multi-locale site is checked on its default locale's home page (and the name on every locale's, below).
  const i18n = readI18nConfig(siteDir);
  const usableI18n = i18n && !i18n.problems.length ? i18n : null;
  const defaultIndex = usableI18n
    ? localeIndexFile(usableI18n, usableI18n.defaultLocale)
    : 'index.html';
  const indexPath = join(siteDir, 'dist', defaultIndex);
  if (!existsSync(indexPath))
    return [
      failure(
        'brief-facts',
        `dist/${defaultIndex}`,
        `sites/${slug}/dist/${defaultIndex} does not exist; build first (npm run build -w site-${slug}) so the brief's facts can be checked on the page`,
      ),
    ];
  const html = readFileSync(indexPath, 'utf8');
  const text = htmlToText(html);
  const hrefs = hrefsOf(html);
  const lines = text.split('\n').map(squash);
  const sample = sampleWords.length ? sampleRegExp(sampleWords) : null;
  const failures = [];
  for (const fact of briefFacts(brief)) {
    if (!factPresent(fact, text, hrefs)) {
      const looked =
        fact.kind === 'price'
          ? ` (looked for ${priceCore(fact.value) || fact.value}, with an optional ",00" or ".00", next to no other digit)`
          : fact.kind === 'url'
            ? ' (as the href of a link)'
            : fact.kind === 'phone'
              ? ' (digits compared without spaces, or as a tel: link)'
              : fact.kind === 'email'
                ? ' (as text or a mailto: link)'
                : '';
      failures.push(
        failure(
          'brief-facts',
          fact.path,
          `${fact.path} "${fact.value}" from brief.json is not on the built page${looked}; show it, or list it in "assumed" if the customer did not give it`,
        ),
      );
      continue;
    }
    const finder = sample ? factInLine(fact) : null;
    if (!finder) continue;
    for (const line of lines) {
      if (!new RegExp(finder.source, finder.flags).test(line)) continue;
      const rest = line.replace(new RegExp(finder.source, finder.flags), ' ');
      const hit = sample.exec(rest);
      if (hit) {
        failures.push(
          failure(
            'brief-facts',
            fact.path,
            `${fact.path} "${fact.value}" is a customer fact but sits in an element that also says "${hit[1]}": "${line.slice(0, 120)}". Customer data is never labeled as sample data; label only the placeholders`,
          ),
        );
        break;
      }
    }
  }
  // The business name is the one fact every locale's home page carries.
  const name = getPath(brief, 'business.name');
  if (
    usableI18n &&
    typeof name === 'string' &&
    isFilled(name) &&
    !isAssumed(brief, 'business.name')
  )
    for (const locale of usableI18n.locales) {
      const file = localeIndexFile(usableI18n, locale);
      if (file === defaultIndex || !existsSync(join(siteDir, 'dist', file)))
        continue; // a missing locale page is reported by the i18n rule
      const localeText = htmlToText(
        readFileSync(join(siteDir, 'dist', file), 'utf8'),
      );
      if (!squash(localeText).includes(squash(name)))
        failures.push(
          failure(
            'brief-facts',
            'business.name',
            `business.name "${name.trim()}" from brief.json is not on the ${locale} home page (dist/${file}); every locale shows the business name`,
          ),
        );
    }
  return failures;
}

/** Fetch reference pages into memory only. Nothing is written to disk. */
export async function fetchReferences(urls, fetchFn = globalThis.fetch) {
  const references = [];
  for (const url of urls) {
    let response;
    try {
      new URL(url);
      response = await fetchFn(url, {
        headers: {
          'user-agent':
            'landing-factory-originality-check/1.0 (read in memory, never stored)',
          accept: 'text/html',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      throw new RunError(
        `cannot read reference ${url}: ${error?.cause?.code ?? error.message}`,
      );
    }
    if (!response.ok)
      throw new RunError(
        `cannot read reference ${url}: HTTP ${response.status}`,
      );
    references.push({ url, text: htmlToText(await response.text()) });
  }
  return references;
}

// --------------------------------------------------------------------------------------------------
// Rule: a multi-locale site is consistent (design: add-bilingual-landing, Decision 6)

const sameSet = (a, b) =>
  a.length === b.length &&
  [...a].sort().join('\n') === [...b].sort().join('\n');

/** The built file a root-relative or absolute URL of the site points to, or null when it does not exist. */
function builtFileOf(distDir, href) {
  let path;
  try {
    path = decodeURIComponent(new URL(href, 'https://dist.invalid').pathname);
  } catch {
    return null;
  }
  const rel = path.replace(/^\/+/, '');
  const candidates = path.endsWith('/')
    ? [`${rel}index.html`]
    : [rel, `${rel}.html`, `${rel}/index.html`];
  return candidates.find((c) => c && existsSync(join(distDir, c))) ?? null;
}

/** html files of dist/ relative to it, 404.html excluded. */
const distPages = (distDir) =>
  walk(
    distDir,
    (path) => path.endsWith('.html') && basename(path) !== '404.html',
  )
    .sort()
    .map((path) => posix(relative(distDir, path)));

export function checkI18n(siteDir) {
  const config = readI18nConfig(siteDir);
  if (!config) return [];
  const slug = basename(siteDir);
  const failures = [];
  const fail = (item, message) => failures.push(failure('i18n', item, message));

  for (const problem of config.problems)
    fail('astro.config.mjs', `sites/${slug}/astro.config.mjs: ${problem}`);
  if (config.problems.length) return failures;
  if (config.locales.length < 2)
    fail(
      'astro.config.mjs',
      `sites/${slug}/astro.config.mjs has an i18n block with ${config.locales.length} locale; list two or more, or remove the block for a single-language site`,
    );

  // The dictionary and the brief name the same locales as the config.
  const ui = readUiDictionary(siteDir);
  if (!ui)
    fail(
      'src/i18n/ui.ts',
      `sites/${slug}/src/i18n/ui.ts does not exist; it holds the UI strings of each locale (node scripts/new-site.mjs --langs writes it)`,
    );
  else {
    if (!sameSet(ui.locales, config.locales))
      fail(
        'src/i18n/ui.ts',
        `src/i18n/ui.ts locales (${ui.locales.join(', ') || 'none'}) differ from i18n.locales in astro.config.mjs (${config.locales.join(', ')}); keep them equal`,
      );
    for (const locale of config.locales)
      if (!ui.strings[locale] || !Object.keys(ui.strings[locale]).length)
        fail(
          'src/i18n/ui.ts',
          `src/i18n/ui.ts has no strings for the locale ${locale}`,
        );
  }
  const briefPath = join(siteDir, 'brief.json');
  if (existsSync(briefPath)) {
    let brief = null;
    try {
      brief = JSON.parse(readFileSync(briefPath, 'utf8'));
    } catch {
      brief = null; // brief-facts reports an unreadable brief
    }
    if (brief) {
      const wanted = briefLocales(brief);
      if (
        wanted.defaultLocale &&
        (wanted.defaultLocale !== config.defaultLocale ||
          !sameSet(wanted.locales, config.locales))
      )
        fail(
          'brief.json',
          `brief.json languages (${wanted.locales.join(', ')}; default ${wanted.defaultLocale}) differ from astro.config.mjs i18n (${config.locales.join(', ')}; default ${config.defaultLocale}); change one of them`,
        );
    }
  }

  // The built pages.
  const distDir = join(siteDir, 'dist');
  if (!existsSync(distDir)) {
    fail(
      'dist',
      `sites/${slug}/dist does not exist; build first (npm run build -w site-${slug}) so the locale pages can be checked`,
    );
    return failures;
  }
  const homes = new Map(); // locale -> { file, html }
  for (const locale of config.locales) {
    const file = localeIndexFile(config, locale);
    if (!existsSync(join(distDir, file))) {
      const root =
        locale === config.defaultLocale && !config.prefixDefaultLocale
          ? ''
          : `${locale}/`;
      fail(
        `dist/${file}`,
        `the locale ${locale} has no home page: dist/${file} does not exist (create src/pages/${root}index.astro)`,
      );
      continue;
    }
    homes.set(locale, {
      file,
      html: readFileSync(join(distDir, file), 'utf8'),
    });
  }

  const alternateMaps = new Map(); // locale -> { hreflang -> href }
  for (const [locale, { file, html }] of homes) {
    const label = `dist/${file}`;
    const lang = htmlLang(html);
    if (lang.toLowerCase() !== locale)
      fail(
        label,
        `${label} has <html lang="${lang}"> but it is the ${locale} page; the layout takes the language from Astro.currentLocale, so do not pass another lang`,
      );

    const map = {};
    for (const { hreflang, href } of alternatesOf(html)) {
      if (hreflang in map && map[hreflang] !== href)
        fail(
          label,
          `${label} has two different hreflang="${hreflang}" alternates`,
        );
      map[hreflang] = href;
    }
    alternateMaps.set(locale, map);
    const missing = [...config.locales, 'x-default'].filter((h) => !(h in map));
    if (missing.length)
      fail(
        label,
        `${label} has no hreflang alternate for ${missing.join(', ')}; BaseLayout emits one per locale plus x-default on indexable pages (not noindex ones)`,
      );
    for (const [hreflang, href] of Object.entries(map))
      if (!builtFileOf(distDir, href))
        fail(
          label,
          `${label} hreflang="${hreflang}" points to ${href}, which is not a built page`,
        );
    const canonical = canonicalOf(html);
    if (canonical && map[locale] && canonical !== map[locale])
      fail(
        label,
        `${label} canonical (${canonical}) is not its own hreflang alternate (${map[locale]}); each locale page is canonical to itself`,
      );

    // The language switcher: a real link to every locale, the current one marked.
    const links = switcherOf(html);
    if (!links)
      fail(
        label,
        `${label} has no language switcher (<nav data-language-switcher>); add <LanguageSwitcher /> to the header`,
      );
    else {
      const targets = links.map((l) => l.hreflang);
      if (!sameSet(targets, config.locales))
        fail(
          label,
          `the language switcher on ${label} links ${targets.join(', ') || 'nothing'}, expected ${config.locales.join(', ')}`,
        );
      for (const link of links)
        if (!builtFileOf(distDir, link.href))
          fail(
            label,
            `the language switcher on ${label} links ${link.href} (${link.hreflang}), which is not a built page`,
          );
      const current = links.filter((l) => l.current);
      if (current.length !== 1 || current[0].hreflang !== locale)
        fail(
          label,
          `the language switcher on ${label} must mark exactly the ${locale} link with aria-current (marked: ${current.map((l) => l.hreflang).join(', ') || 'none'})`,
        );
    }
  }

  // Reciprocal: every page lists every other page at the address that page gives itself; one shared x-default.
  for (const [locale, map] of alternateMaps)
    for (const [other, otherMap] of alternateMaps) {
      if (!map[other] || !otherMap[other]) continue;
      if (map[other] !== otherMap[other])
        fail(
          `dist/${homes.get(locale).file}`,
          `hreflang is not reciprocal: the ${locale} page links the ${other} page at ${map[other]} but the ${other} page is at ${otherMap[other]}`,
        );
    }
  const xDefaults = new Set(
    [...alternateMaps.values()].map((m) => m['x-default']).filter(Boolean),
  );
  if (xDefaults.size > 1)
    fail(
      'x-default',
      `the home pages disagree on hreflang="x-default" (${[...xDefaults].join(', ')}); it is the default locale's page on every locale`,
    );
  const defaultSelf = alternateMaps.get(config.defaultLocale)?.[
    config.defaultLocale
  ];
  if (xDefaults.size === 1 && defaultSelf && !xDefaults.has(defaultSelf))
    fail(
      'x-default',
      `hreflang="x-default" (${[...xDefaults][0]}) is not the default locale page (${defaultSelf})`,
    );

  // No page shows the UI strings of another locale (an untranslated skip link or disclosure, a pasted block).
  if (ui) {
    for (const file of distPages(distDir)) {
      const locale = localeOfFile(config, file);
      const own = new Set(Object.values(ui.strings[locale] ?? {}).map(squash));
      const text = squash(
        htmlToText(readFileSync(join(distDir, file), 'utf8')),
      );
      const seen = new Set();
      for (const other of config.locales) {
        if (other === locale) continue;
        for (const [key, value] of Object.entries(ui.strings[other] ?? {})) {
          const v = squash(value);
          if (v.length < 8 || own.has(v) || !text.includes(v) || seen.has(v))
            continue;
          seen.add(v);
          fail(
            `dist/${file}`,
            `dist/${file} (${locale}) shows the ${other} UI string ${key}: "${value}"; take it from t(Astro.currentLocale) of src/i18n/ui.ts`,
          );
        }
      }
    }
  }
  return failures;
}

/** Warnings: hreflang needs absolute URLs, which need `site` in astro.config.mjs. */
export function i18nWarnings(siteDir) {
  const config = readI18nConfig(siteDir);
  if (!config || config.problems.length) return [];
  const file = join(
    siteDir,
    'dist',
    localeIndexFile(config, config.defaultLocale),
  );
  if (!existsSync(file)) return [];
  const alternates = alternatesOf(readFileSync(file, 'utf8'));
  if (
    !alternates.length ||
    alternates.every((a) => /^https?:\/\//i.test(a.href))
  )
    return [];
  return [
    {
      rule: 'i18n-absolute-urls',
      item: 'astro.config.mjs',
      message:
        'the hreflang alternates are root-relative because astro.config.mjs has no `site`; search engines want absolute URLs, so set `site` to the production URL once the domain is known',
    },
  ];
}

// --------------------------------------------------------------------------------------------------
// Rule: AI images have provenance, consent and a visible disclosure

/** The first element carrying data-ai-disclosure: { text, hidden }, or null when the page has none. */
export function aiDisclosureIn(html) {
  const open = /<([a-zA-Z][\w:-]*)\b([^>]*\bdata-ai-disclosure\b[^>]*)>/g;
  let found = null;
  for (const match of html.matchAll(open)) {
    const [whole, tag, attributes] = match;
    const rest = html.slice(match.index + whole.length);
    const close = new RegExp(`</${tag}\\s*>`, 'i').exec(rest);
    const text = htmlToText(close ? rest.slice(0, close.index) : rest)
      .replace(/\s+/g, ' ')
      .trim();
    const hidden =
      /\shidden(?:[\s=>]|$)/i.test(` ${attributes} `) ||
      /aria-hidden\s*=\s*["']?true/i.test(attributes) ||
      /style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(
        attributes,
      );
    const candidate = { text, hidden };
    if (text && !hidden) return candidate;
    found ??= candidate;
  }
  return found;
}

export function checkAiProvenance(siteDir, manifest) {
  const entries = manifest.images.filter(isAi);
  if (!entries.length) return [];
  const slug = basename(siteDir);
  const failures = [];
  const files = imageFiles(siteDir);

  for (const entry of entries) {
    for (const field of AI_REQUIRED_FIELDS)
      if (
        entry[field] === undefined ||
        entry[field] === '' ||
        entry[field] === null
      )
        failures.push(
          failure(
            'ai-provenance',
            entry.file ?? '(no file)',
            `AI image ${entry.file ?? '(no file)'} in assets.json has no "${field}"; record how it was made (node scripts/ai-images.mjs generate or import)`,
          ),
        );
    if (
      entry.file &&
      !files.some((file) => manifestNames(file).includes(entry.file))
    )
      failures.push(
        failure(
          'ai-provenance',
          entry.file,
          `AI image ${entry.file} is listed in assets.json but no such image exists in src/assets/ or public/; restore the file or remove the entry`,
        ),
      );
  }

  // Consent: the brief decides. Without one, AI images are allowed (demo niches).
  const briefPath = join(siteDir, 'brief.json');
  let brief = null;
  if (existsSync(briefPath)) {
    try {
      brief = JSON.parse(readFileSync(briefPath, 'utf8'));
    } catch {
      brief = null; // brief-facts reports an unreadable brief
    }
    const { allowed, value } = brief
      ? aiImagesConsent(brief)
      : { allowed: true, value: '' };
    if (!allowed)
      failures.push(
        failure(
          'ai-provenance',
          'brief.json',
          `sites/${slug}/brief.json brand.aiImages is ${value}, not "allowed", but assets.json has ${entries.length} AI image${entries.length === 1 ? '' : 's'} (${entries.map((e) => e.file).join(', ')}); remove them or ask the customer`,
        ),
      );
  }

  // Subject: only "owner" exists, and it needs the owner's consent (brand.aiImages and brand.ownerPortrait) in a brief.
  for (const entry of entries) {
    if (entry.subject === undefined) continue;
    if (entry.subject !== 'owner') {
      failures.push(
        failure(
          'ai-provenance',
          entry.file ?? '(no file)',
          `AI image ${entry.file ?? '(no file)'} has subject ${JSON.stringify(entry.subject)}; the only subject allowed is "owner" (an AI portrait of the brand owner)`,
        ),
      );
      continue;
    }
    const owner = ownerPortraitConsent(brief);
    if (!owner.allowed)
      failures.push(
        failure(
          'ai-provenance',
          entry.file ?? '(no file)',
          `AI image ${entry.file ?? '(no file)'} is an owner portrait (subject "owner") but the owner's consent is missing: ${owner.reason}; remove it or ask the owner`,
        ),
      );
  }

  // Prompt policy, so an entry edited by hand cannot slip a forbidden subject through.
  for (const entry of entries) {
    if (typeof entry.prompt !== 'string' || !entry.prompt.trim()) continue;
    const violations = checkPrompt(entry.prompt, brief, {
      subject: entry.subject === 'owner' ? 'owner' : undefined,
    });
    if (violations.length)
      failures.push(
        failure(
          'ai-provenance',
          entry.file,
          `AI image ${entry.file} has a prompt that breaks the prompt policy: ${formatViolations(violations)}`,
        ),
      );
  }

  // Disclosure: the built home page says that some images are AI-generated. A multi-locale site has one home page per
  // locale and each must carry the disclosure in its own language.
  const i18n = readI18nConfig(siteDir);
  const homes =
    i18n && !i18n.problems.length
      ? i18n.locales.map((locale) => ({
          locale,
          file: `dist/${localeIndexFile(i18n, locale)}`,
        }))
      : [{ locale: null, file: 'dist/index.html' }];
  for (const { locale, file } of homes) {
    if (!existsSync(join(siteDir, file))) {
      failures.push(
        failure(
          'ai-provenance',
          file,
          `sites/${slug}/${file} does not exist; build first (npm run build -w site-${slug}) so the AI disclosure can be checked on the page`,
        ),
      );
      continue;
    }
    const disclosure = aiDisclosureIn(
      readFileSync(join(siteDir, file), 'utf8'),
    );
    const phrase =
      locale && locale.split('-')[0] === 'es'
        ? '"Algunas imágenes de esta página se generaron con IA."'
        : '"Some images on this page were generated with AI."';
    if (!disclosure)
      failures.push(
        failure(
          'ai-provenance',
          file,
          `the site uses AI images but ${file} has no element with data-ai-disclosure; add <p data-ai-disclosure> ${phrase} to the footer${locale ? ` (${locale}, in that language)` : ''}`,
        ),
      );
    else if (disclosure.hidden || !disclosure.text)
      failures.push(
        failure(
          'ai-provenance',
          file,
          `the data-ai-disclosure element on ${file} is ${disclosure.hidden ? 'hidden' : 'empty'}; the AI disclosure must be visible text`,
        ),
      );
    else if (
      locale &&
      locale.split('-')[0] !== 'en' &&
      /generated with AI/i.test(disclosure.text)
    )
      failures.push(
        failure(
          'ai-provenance',
          file,
          `the AI disclosure on ${file} is in English but the page is ${locale}; write it in that language (the aiDisclosure string of src/i18n/ui.ts)`,
        ),
      );
  }
  return failures;
}

// --------------------------------------------------------------------------------------------------
// Orchestration

export async function runChecks({
  slug,
  root = ROOT,
  refs = [],
  fetch: fetchFn,
} = {}) {
  if (!SLUG_PATTERN.test(slug ?? ''))
    throw new RunError(`invalid site slug "${slug}"`);
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(join(siteDir, 'package.json')))
    throw new RunError(`sites/${slug} is not a site`);
  const manifest = readManifest(siteDir);

  const results = [
    ['images-credited', () => checkUncredited(siteDir, manifest)],
    ['credits-in-sync', () => checkCredits(slug, root)],
    ['photo-uses', () => checkPhotoUses(siteDir, manifest)],
    ['landing-meta', () => checkLandingMeta(slug, root)],
    ['tokens', () => checkTokens(slug, root)],
    ['contrast', () => checkContrast(slug, root)],
    ['diversity', () => checkDiversity(slug, root)],
    [
      'layout-diversity',
      () =>
        checkLayoutDiversity(
          slug,
          root,
          loadConfig(join(root, 'qa.config.json')).diversity,
        ),
    ],
    ['scenes', () => checkScenes(siteDir, manifest)],
    ...(readI18nConfig(siteDir) ? [['i18n', () => checkI18n(siteDir)]] : []),
    ...(manifest.images.some(isAi)
      ? [['ai-provenance', () => checkAiProvenance(siteDir, manifest)]]
      : []),
    ...(existsSync(join(siteDir, 'brief.json'))
      ? [
          [
            'brief-facts',
            () =>
              checkBriefFacts(
                siteDir,
                root,
                loadConfig(join(root, 'qa.config.json')).brief.sampleWords,
              ),
          ],
        ]
      : []),
  ].map(([name, run]) => ({ name, failures: run() }));

  if (refs.length) {
    const pages = builtPages(siteDir);
    const references = await fetchReferences(refs, fetchFn);
    results.push({
      name: 'originality',
      failures: findCopiedSentences(pages, references),
    });
  }
  const failures = results.flatMap((r) => r.failures);
  return {
    site: slug,
    verdict: failures.length ? 'failed' : 'passed',
    checks: results.map((r) => ({ name: r.name, ok: !r.failures.length })),
    skipped: refs.length ? [] : ['originality'],
    failures,
    warnings: [...archetypeWarnings(slug, root), ...i18nWarnings(siteDir)],
  };
}

export function formatReport(result) {
  const lines = [
    `check-landing ${result.site}: ${result.verdict.toUpperCase()}`,
  ];
  for (const check of result.checks)
    lines.push(`  ${check.ok ? 'ok  ' : 'FAIL'} ${check.name}`);
  for (const name of result.skipped) lines.push(`  skip ${name} (no --refs)`);
  if (result.failures.length) {
    lines.push('', 'Failures:');
    for (const f of result.failures) lines.push(`  - [${f.rule}] ${f.message}`);
  }
  if (result.warnings?.length) {
    lines.push('', 'Warnings:');
    for (const w of result.warnings) lines.push(`  - [${w.rule}] ${w.message}`);
  }
  return lines.join('\n');
}

const HELP = `Usage: node scripts/check-landing.mjs --site <slug> [--refs url,url] [--json]

Final check of sites/<slug>/ after site QA passes. Fails, naming the item, when:
  uncredited-image  an image in src/assets/ or public/ (except favicon.svg) has no assets.json entry
  credits-stale     CREDITS.md or src/data/credits.json is out of date (node scripts/credits.mjs --site <slug>)
  photo-overuse     one source photo is referenced from more than ${MAX_USES_PER_PHOTO} places in src/
  tokens-mismatch   a palette hex or font family of design-system/<slug>/MASTER.md is not in tokens.css
  contrast          a standard text token pair in tokens.css is below 4.5:1 (WCAG)
  landing-meta      MASTER.md has no valid \`landing-meta\` block (primary, display-font, hero)
  diversity         another site has the same primary color, display font and hero type
  layout-diversity  the layout signature (scripts/layout-signature.mjs) is too close to another site's (qa.config.json: diversity)
  scenes            a built [data-scene] has no poster, a poster missing from assets.json, or the site has more than ${MAX_SCENES} scenes
  i18n              (only with an i18n block in astro.config.mjs) a locale without its home page, a wrong <html lang>, hreflang
                    alternates missing, not reciprocal or without x-default, a broken language switcher, config, dictionary and
                    brief locales that disagree, or a page showing the UI strings of another locale (src/i18n/ui.ts)
  brief-facts       (only with sites/<slug>/brief.json) a non-assumed brief fact (business name, primary CTA URL, email, phone,
                    product names and prices) is missing from dist/index.html, or sits in an element that says "ejemplo"/"example"/"sample"
  ai-provenance     (only when assets.json has AI images) an AI entry without generator, model, prompt, date or terms, or without its
                    file; a brief that does not allow AI images; no visible data-ai-disclosure element on dist/index.html;
                    a prompt that breaks the AI image prompt policy; a subject other than "owner"; an owner portrait without
                    brand.aiImages and brand.ownerPortrait both "allowed" in a brief. With i18n the disclosure must be on
                    every locale's home page, in that locale's language
  copy-match        (--refs) ${SHINGLE_WORDS} words in a row of the built page also occur in a reference

  --site <slug>     the site (required)
  --refs a,b        reference URLs to compare with the built text in sites/<slug>/dist/ (build first).
                    Pages are read in memory through HTTPS_PROXY if set and never stored.
  --json            print the result as JSON
  --help            show this help

Warning (not a failure): archetype-target, the signature is outside the primary archetype's ranges.
Hero types: ${HERO_TYPES.join(', ')}.
Exit codes: 0 passed, 1 failed, 2 the run broke (unknown site, no dist/ with --refs, unreadable reference).`;

export async function main(argv, io = console, deps = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        refs: { type: 'string' },
        json: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    io.error(`check-landing: ${error.message}\n\n${HELP}`);
    return 2;
  }
  const { values } = parsed;
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  if (!values.site) {
    io.error(`check-landing: --site <slug> is required\n\n${HELP}`);
    return 2;
  }
  const refs = (values.refs ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    const result = await runChecks({ slug: values.site, refs, ...deps });
    io.log(
      values.json ? JSON.stringify(result, null, 2) : formatReport(result),
    );
    return result.verdict === 'passed' ? 0 : 1;
  } catch (error) {
    if (error instanceof RunError) {
      io.error(`check-landing: ${error.message}`);
      return 2;
    }
    throw error;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url) &&
  !reexecWithEnvProxy()
) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error);
      process.exitCode = 2;
    },
  );
}
