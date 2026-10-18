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
//   landing-meta       MASTER.md has no valid `landing-meta` block
//   diversity          another site matches on primary color, display font and hero type all at once
//   copy-match         (--refs) 8 words in a row of the built page text also appear in a reference page
//
// Exit codes: 0 all checks passed, 1 at least one failed, 2 the run itself broke (unknown site, missing
// dist/ with --refs, a reference that cannot be fetched).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { reexecWithEnvProxy } from '../.claude/skills/analyze-reference/scripts/proxy.mjs';
import { syncCredits } from './credits.mjs';
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
    const key = entry.sourcePage || entry.title || entry.file;
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
  return {
    primary: values.primary ?? '',
    displayFont: values['display-font'] ?? '',
    bodyFont: values['body-font'] ?? '',
    hero: values.hero ?? '',
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

export function validateLandingMeta(meta) {
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
  return problems;
}

export function checkLandingMeta(slug, root) {
  const masterPath = join(root, 'design-system', slug, 'MASTER.md');
  if (!existsSync(masterPath)) return []; // checkTokens already reports the missing file
  const problems = validateLandingMeta(
    parseLandingMeta(readFileSync(masterPath, 'utf8')),
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
    ['diversity', () => checkDiversity(slug, root)],
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
  return lines.join('\n');
}

const HELP = `Usage: node scripts/check-landing.mjs --site <slug> [--refs url,url] [--json]

Final check of sites/<slug>/ after site QA passes. Fails, naming the item, when:
  uncredited-image  an image in src/assets/ or public/ (except favicon.svg) has no assets.json entry
  credits-stale     CREDITS.md or src/data/credits.json is out of date (node scripts/credits.mjs --site <slug>)
  photo-overuse     one source photo is referenced from more than ${MAX_USES_PER_PHOTO} places in src/
  tokens-mismatch   a palette hex or font family of design-system/<slug>/MASTER.md is not in tokens.css
  landing-meta      MASTER.md has no valid \`landing-meta\` block (primary, display-font, hero)
  diversity         another site has the same primary color, display font and hero type
  copy-match        (--refs) ${SHINGLE_WORDS} words in a row of the built page also occur in a reference

  --site <slug>     the site (required)
  --refs a,b        reference URLs to compare with the built text in sites/<slug>/dist/ (build first).
                    Pages are read in memory through HTTPS_PROXY if set and never stored.
  --json            print the result as JSON
  --help            show this help

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
