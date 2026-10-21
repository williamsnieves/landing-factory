#!/usr/bin/env node
// Generate the photo credits of a site from its image manifest.
//
//   node scripts/credits.mjs --site <slug> [--check]
//
// Reads sites/<slug>/assets.json (written by scripts/find-images.mjs) and writes
//   - the photo table of sites/<slug>/CREDITS.md between <!-- credits:start --> and <!-- credits:end -->
//     (the rest of the file, for example the fonts table, is kept), and
//   - sites/<slug>/src/data/credits.json: the entries that need a visible credit (credit: true),
//     one per source photo, for the footer to import.
// Idempotent. With --check nothing is written; exit 1 when either file is out of date.
// Exit codes: 0 ok / up to date, 1 out of date (--check), 2 bad usage or unreadable manifest.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { SLUG_PATTERN } from './lib/sites.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const START_MARKER = '<!-- credits:start -->';
export const END_MARKER = '<!-- credits:end -->';
export const REQUIRED_FIELDS = [
  'file',
  'title',
  'sourcePage',
  'author',
  'license',
  'credit',
];

/** Throws when a manifest entry lacks a field the credits need. */
export function validateManifest(manifest, label = 'assets.json') {
  if (!manifest || !Array.isArray(manifest.images))
    throw new Error(`${label}: expected {"images": [...]}`);
  manifest.images.forEach((entry, index) => {
    for (const field of REQUIRED_FIELDS) {
      if (entry?.[field] === undefined || entry[field] === '')
        throw new Error(
          `${label}: image #${index + 1} (${entry?.file ?? 'no file'}) has no "${field}"`,
        );
    }
    if (typeof entry.credit !== 'boolean')
      throw new Error(
        `${label}: image ${entry.file}: "credit" must be true or false`,
      );
  });
}

/** Entries grouped by source photo (several crops share one sourcePage), in first-seen order. */
export function groupBySource(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.sourcePage;
    if (!groups.has(key))
      groups.set(key, {
        sourcePage: entry.sourcePage,
        title: entry.title,
        author: entry.author,
        license: entry.license,
        licenseUrl: entry.licenseUrl ?? '',
        credit: entry.credit,
        files: [],
        notes: [],
      });
    const group = groups.get(key);
    group.files.push(entry.file);
    if (entry.note && !group.notes.includes(entry.note))
      group.notes.push(entry.note);
  }
  return [...groups.values()];
}

/** The footer list: one {author, license, url} per credited source photo. */
export function creditList(entries) {
  return groupBySource(entries)
    .filter((group) => group.credit)
    .map((group) => ({
      author: group.author,
      license: group.license,
      url: group.sourcePage,
    }));
}

export function renderCreditsJson(entries) {
  return `${JSON.stringify(creditList(entries), null, 2)}\n`;
}

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\s+/g, ' ');
const width = (text) => [...text].length;

/** A Markdown table aligned the way Prettier prints it, so `prettier --check` keeps passing. */
export function markdownTable(headers, rows) {
  const matrix = [headers, ...rows].map((row) => row.map(cell));
  const widths = headers.map((_, column) =>
    Math.max(3, ...matrix.map((row) => width(row[column]))),
  );
  const line = (row) =>
    `| ${row.map((text, column) => text + ' '.repeat(widths[column] - width(text))).join(' | ')} |`;
  return [
    line(matrix[0]),
    `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`,
    ...matrix.slice(1).map(line),
  ].join('\n');
}

/** The generated block (without the markers): the photo table, or a note when there are no photos. */
export function renderPhotoTable(entries) {
  if (!entries.length) return 'No photographs are used yet.';
  const rows = groupBySource(entries).map((group) => [
    group.files.map((file) => `\`${file}\``).join(', '),
    group.sourcePage,
    group.author,
    group.licenseUrl ? `${group.license}, ${group.licenseUrl}` : group.license,
    group.credit ? 'yes' : 'no',
    group.notes.map((note) => note.replace(/\.$/, '')).join('; '),
  ]);
  return markdownTable(
    [
      'Asset(s) in `src/assets/images/`',
      'Source URL',
      'Author',
      'License',
      'Credit shown',
      'Notes',
    ],
    rows,
  );
}

const APPENDED_INTRO = `## Photographs

Photographs come from Wikimedia Commons (renditions served by \`upload.wikimedia.org\`, or crops of them). Authors and licenses were read from the Commons file metadata. The table below is generated from \`assets.json\` by \`node scripts/credits.mjs --site <slug>\`; edit the manifest, not the table. Photos under a license that requires attribution are credited in the page footer.`;

/**
 * New CREDITS.md text: the block between the markers is replaced; without markers a "Photographs"
 * section with the markers is appended. Everything else is kept byte for byte.
 */
export function renderCreditsFile(existing, entries) {
  const block = `${START_MARKER}\n\n${renderPhotoTable(entries)}\n\n${END_MARKER}`;
  const start = existing.indexOf(START_MARKER);
  const end = existing.indexOf(END_MARKER);
  if (start !== -1 && end !== -1 && end > start)
    return (
      existing.slice(0, start) + block + existing.slice(end + END_MARKER.length)
    );
  if (start !== -1 || end !== -1)
    throw new Error(
      `CREDITS.md has only one of ${START_MARKER} and ${END_MARKER}, or them in the wrong order; fix it by hand`,
    );
  return `${existing.replace(/\s*$/, '\n')}\n${APPENDED_INTRO}\n\n${block}\n`;
}

/**
 * Compute (and with check=false, write) both generated files.
 * Returns { stale: string[], written: string[] } with paths relative to the site folder.
 */
export function syncCredits({ slug, root = ROOT, check = false }) {
  if (!SLUG_PATTERN.test(slug ?? ''))
    throw new Error(`invalid site slug "${slug}"`);
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(siteDir)) throw new Error(`sites/${slug} does not exist`);
  const manifestPath = join(siteDir, 'assets.json');
  if (!existsSync(manifestPath))
    throw new Error(
      `sites/${slug}/assets.json does not exist (npm run new-site creates it)`,
    );
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  validateManifest(manifest, `sites/${slug}/assets.json`);

  const creditsPath = join(siteDir, 'CREDITS.md');
  const existing = existsSync(creditsPath)
    ? readFileSync(creditsPath, 'utf8')
    : `# Credits: ${slug}\n`;
  const outputs = [
    ['CREDITS.md', creditsPath, renderCreditsFile(existing, manifest.images)],
    [
      'src/data/credits.json',
      join(siteDir, 'src/data/credits.json'),
      renderCreditsJson(manifest.images),
    ],
  ];
  const stale = [];
  const written = [];
  for (const [relative, path, content] of outputs) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (current === content) continue;
    stale.push(relative);
    if (!check) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
      written.push(relative);
    }
  }
  return { stale, written };
}

const HELP = `Usage: node scripts/credits.mjs --site <slug> [--check]

Generates the photo credits of sites/<slug>/ from sites/<slug>/assets.json:
  - the photo table in CREDITS.md, between ${START_MARKER} and ${END_MARKER}
    (added at the end of the file the first time; the rest of the file is kept)
  - src/data/credits.json: one {author, license, url} per credited source photo, for the footer

  --site <slug>   the site (required)
  --check         write nothing; exit 1 when either file is out of date
  --help          show this help

Exit codes: 0 ok, 1 out of date (--check), 2 bad usage or unreadable manifest.`;

export function main(argv, io = console, root = ROOT) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        check: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    io.error(`credits: ${error.message}\n\n${HELP}`);
    return 2;
  }
  const { values } = parsed;
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  if (!values.site) {
    io.error(`credits: --site <slug> is required\n\n${HELP}`);
    return 2;
  }
  try {
    const { stale, written } = syncCredits({
      slug: values.site,
      root,
      check: values.check,
    });
    if (values.check) {
      if (stale.length) {
        io.error(
          `credits: out of date in sites/${values.site}: ${stale.join(', ')}. Run: node scripts/credits.mjs --site ${values.site}`,
        );
        return 1;
      }
      io.log(`credits: sites/${values.site} is up to date`);
      return 0;
    }
    io.log(
      written.length
        ? `credits: updated ${written.map((f) => `sites/${values.site}/${f}`).join(', ')}`
        : `credits: sites/${values.site} already up to date`,
    );
    return 0;
  } catch (error) {
    io.error(`credits: ${error.message}`);
    return 2;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
