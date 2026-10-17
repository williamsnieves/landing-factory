#!/usr/bin/env node
// Validates abstract pattern sheets (patterns/*.md): structure + "no site content" heuristics.
// Usage: node scripts/validate-pattern.mjs [--help] [file...]   (default: patterns/*.md)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

export const REQUIRED_KEYS = ['url', 'slug', 'date', 'focus', 'libraries'];
export const REQUIRED_SECTIONS = [
  'Summary',
  'Section map',
  'Hero',
  'Grid and spacing',
  'Typography',
  'Palette',
  'Density',
  'Motion',
  'Libraries',
  'What to take / what to avoid',
];
/** Files in patterns/ that are not sheets. */
export const SKIPPED_FILES = new Set(['README.md', '_template.md']);
export const MAX_QUOTE_WORDS = 12;
export const MAX_CODE_LINES = 3;

const MEDIA_EXT =
  'png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|heic|mp4|webm|mov|m4v|ogv|ogg|mp3|wav|woff2?|ttf|otf|eot|glb|gltf|obj|fbx|usdz|hdr|exr|ktx2?|basis';
const URL_RE = /(?:https?:)?\/\/[^\s)"'<>\]]+|(?:\.{0,2}\/)[^\s)"'<>\]]+/gi;
const MEDIA_URL_RE = new RegExp(
  `\\.(?:${MEDIA_EXT})(?:[?#][^\\s)"'<>\\]]*)?$`,
  'i',
);
const HEX_RE =
  /(?<![\w&/#-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
const FUNC_COLOR_RE = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
const QUOTE_RES = [
  /"([^"\n]+)"/g,
  /“([^”\n]+)”/g,
  /(?<![\w])'([^'\n]+)'(?![\w])/g,
];

function parseFrontmatter(lines) {
  if (lines[0]?.trim() !== '---') return { data: null, end: 0 };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end < 0) return { data: null, end: 0, unterminated: true };
  const data = {};
  const lineOf = {};
  let key = null;
  for (let i = 1; i < end; i++) {
    const raw = lines[i];
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(raw);
    if (kv) {
      key = kv[1];
      lineOf[key] = i + 1;
      data[key] = unquote(kv[2].trim());
      if (data[key] === '') data[key] = null;
      continue;
    }
    const item = /^\s+-\s+(.*)$/.exec(raw);
    if (item && key) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(unquote(item[1].trim()));
    }
  }
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (typeof v === 'string' && /^\[.*\]$/.test(v)) {
      const inner = v.slice(1, -1).trim();
      data[k] = inner
        ? inner
            .split(',')
            .map((s) => unquote(s.trim()))
            .filter(Boolean)
        : [];
    }
  }
  return { data, lineOf, end };
}

function unquote(s) {
  if (
    s.length >= 2 &&
    ((s[0] === "'" && s.at(-1) === "'") || (s[0] === '"' && s.at(-1) === '"'))
  )
    return s.slice(1, -1);
  return s;
}

function stripComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * Validate one sheet. Returns violations: { line, rule, message }.
 * options.expectedSlug: when set, the frontmatter slug must match it.
 */
export function validatePattern(text, options = {}) {
  const violations = [];
  const add = (line, rule, message) => violations.push({ line, rule, message });
  const lines = text.split(/\r?\n/);

  // --- frontmatter
  const fm = parseFrontmatter(lines);
  if (!fm.data) {
    add(
      1,
      'frontmatter',
      'Missing or unterminated YAML frontmatter (--- block).',
    );
  } else {
    for (const key of REQUIRED_KEYS) {
      if (!(key in fm.data))
        add(1, 'frontmatter', `Missing frontmatter key "${key}".`);
    }
    const at = (k) => fm.lineOf[k] ?? 1;
    const { url, slug, date, libraries } = fm.data;
    if (url !== undefined && !/^https?:\/\/[^\s{}]+$/i.test(String(url)))
      add(at('url'), 'frontmatter', 'url must be an http(s) URL.');
    if (slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(slug)))
      add(at('slug'), 'frontmatter', 'slug must be lowercase kebab-case.');
    else if (slug && options.expectedSlug && slug !== options.expectedSlug)
      add(
        at('slug'),
        'frontmatter',
        `slug "${slug}" does not match the file name (expected "${options.expectedSlug}").`,
      );
    if (date !== undefined) {
      const ok =
        /^\d{4}-\d{2}-\d{2}$/.test(String(date)) &&
        !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
        new Date(`${date}T00:00:00Z`).toISOString().startsWith(String(date));
      if (!ok)
        add(at('date'), 'frontmatter', 'date must be a real YYYY-MM-DD date.');
    }
    if ('focus' in fm.data && !fm.data.focus)
      add(
        at('focus'),
        'frontmatter',
        'focus must not be empty (use "none" if there is no focus).',
      );
    if ('libraries' in fm.data && !Array.isArray(libraries))
      add(
        at('libraries'),
        'frontmatter',
        'libraries must be a list (use [] for none).',
      );
  }

  // --- sections
  const body = stripComments(text).split('\n');
  const headings = [];
  let inFence = false;
  body.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) inFence = !inFence;
    const h = !inFence && /^##\s+(.+?)\s*#*\s*$/.exec(l);
    if (h) headings.push({ name: h[1], line: i + 1 });
  });
  for (const name of REQUIRED_SECTIONS) {
    const idx = headings.findIndex((h) => h.name === name);
    if (idx < 0) {
      add(1, 'section-missing', `Missing required section "## ${name}".`);
      continue;
    }
    const start = headings[idx].line;
    const stop = headings[idx + 1]?.line ?? body.length + 1;
    const content = body
      .slice(start, stop - 1)
      .join('\n')
      .trim();
    if (!content) add(start, 'section-empty', `Section "## ${name}" is empty.`);
  }

  // --- forbidden content
  inFence = false;
  let fenceStart = 0;
  let fenceLines = 0;
  const closeFence = () => {
    if (fenceLines > MAX_CODE_LINES)
      add(
        fenceStart,
        'code-block',
        `Fenced code block has ${fenceLines} lines (max ${MAX_CODE_LINES}); sheets must not contain source code.`,
      );
  };
  stripComments(text)
    .split(/\r?\n/)
    .forEach((raw, i) => {
      const n = i + 1;
      if (/^\s*(```|~~~)/.test(raw)) {
        if (inFence) {
          closeFence();
          inFence = false;
        } else {
          inFence = true;
          fenceStart = n;
          fenceLines = 0;
        }
        return;
      }
      if (inFence) fenceLines++;
      const isNote = /^\s*>\s*note:/i.test(raw);
      const line = raw;

      for (const m of line.matchAll(/\{\{[^}]*\}\}/g))
        add(n, 'placeholder', `Unfilled template placeholder ${m[0]}.`);
      for (const m of line.matchAll(URL_RE)) {
        const u = m[0].replace(/[.,;:!?]+$/, '');
        if (MEDIA_URL_RE.test(u))
          add(
            n,
            'media-url',
            `URL points to an image, video, font or 3D file: ${u}`,
          );
      }
      for (const m of line.matchAll(HEX_RE))
        add(
          n,
          'hex-color',
          `Hex color ${m[0]}; describe colors by role and tone instead.`,
        );
      for (const m of line.matchAll(FUNC_COLOR_RE))
        add(
          n,
          'color-literal',
          `Color function ${m[0]}...) found; describe colors by role and tone instead.`,
        );
      if (!isNote) {
        for (const re of QUOTE_RES) {
          for (const m of line.matchAll(re)) {
            const words = m[1].trim().split(/\s+/).filter(Boolean).length;
            if (words > MAX_QUOTE_WORDS)
              add(
                n,
                'long-quote',
                `Quoted string of ${words} words (max ${MAX_QUOTE_WORDS}); looks like site copy. Paraphrase it, or put your own remark on a "> note:" line.`,
              );
          }
        }
      }
    });
  if (inFence) closeFence();

  violations.sort((a, b) => a.line - b.line);
  return violations;
}

export function validateFile(file) {
  const stem = basename(file, '.md');
  const slug = stem.replace(/^_example-/, '');
  return validatePattern(readFileSync(file, 'utf8'), { expectedSlug: slug });
}

export function defaultFiles(dir = join(ROOT, 'patterns')) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !SKIPPED_FILES.has(f))
    .sort()
    .map((f) => join(dir, f));
}

const HELP = `validate-pattern: check abstract pattern sheets.

Usage: node scripts/validate-pattern.mjs [--help] [file...]
  With no files, validates patterns/*.md except README.md and _template.md.

Rules: frontmatter keys (${REQUIRED_KEYS.join(', ')}); sections ${REQUIRED_SECTIONS.map((s) => `"${s}"`).join(', ')};
no media/font/3D URLs, code blocks over ${MAX_CODE_LINES} lines, hex or rgb()/hsl() colors, quoted strings over ${MAX_QUOTE_WORDS} words
(lines starting with "> note:" are exempt from the quote rule only).
Prints file:line for each violation. Exit 0 = valid, 1 = violations, 2 = usage error.`;

export function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP);
    return 0;
  }
  const unknown = argv.find((a) => a.startsWith('-'));
  if (unknown) {
    console.error(`Unknown option ${unknown}. See --help.`);
    return 2;
  }
  const files = argv.length ? argv.map((f) => resolve(f)) : defaultFiles();
  let failures = 0;
  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`${file}: file not found`);
      return 2;
    }
    const rel = relative(process.cwd(), file) || file;
    for (const v of validateFile(file)) {
      failures++;
      console.error(`${rel}:${v.line}: [${v.rule}] ${v.message}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} violation(s) in ${files.length} file(s).`);
    return 1;
  }
  console.log(`validate-pattern: ${files.length} sheet(s) OK.`);
  return 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
