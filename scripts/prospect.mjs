#!/usr/bin/env node
// Prospect landings: a page built for a business that has not bought anything yet.
//
//   node scripts/prospect.mjs write --site <slug> [--check]
//   node scripts/prospect.mjs kit   --site <slug>
//   node scripts/prospect.mjs sold  --site <slug>
//
// `write` turns sites/<slug>/brief.json into sites/<slug>/src/data/prospect.json, which the starter's BaseLayout and
// astro.config.mjs read at build time (noindex, the visible notice, an empty sitemap, an X-Robots-Tag header).
// `kit` writes sites/<slug>/SALES.md, the owner's summary and talking points (never a message to the prospect).
// `sold` marks the prospect as a customer: it sets prospect.status to "sold" and rewrites prospect.json.
// Design: openspec/changes/add-prospect-landings/design.md. Guide: docs/prospect.md.
// Exit codes: 0 ok / up to date, 1 stale (--check), invalid brief or refused, 2 bad usage or unreadable input.
// LANDING_FACTORY_ROOT=<dir> reads and writes sites/ in <dir> instead of this repo (tests only).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  briefLocales,
  formatErrors,
  getPath,
  isFilled,
  isProspect,
  uncoveredProspectFacts,
  validateBrief,
} from './lib/brief-schema.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';
import { renderLegalJson } from './legal.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

class UsageError extends Error {}
class Refusal extends Error {}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// --------------------------------------------------------------------------------------------------
// Site and brief

function loadSite(slug, root) {
  if (!SLUG_PATTERN.test(slug ?? ''))
    throw new UsageError(`invalid site slug "${slug}"`);
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(siteDir))
    throw new UsageError(`sites/${slug} does not exist`);
  const briefPath = join(siteDir, 'brief.json');
  if (!existsSync(briefPath))
    throw new UsageError(
      `sites/${slug}/brief.json does not exist (run /brief-intake ${slug})`,
    );
  let brief;
  try {
    brief = JSON.parse(readFileSync(briefPath, 'utf8'));
  } catch (error) {
    throw new UsageError(
      `sites/${slug}/brief.json is not valid JSON: ${error.message}`,
    );
  }
  const errors = validateBrief(brief, { baseDir: siteDir });
  if (errors.length)
    throw new Refusal(
      `sites/${slug}/brief.json is invalid:\n${formatErrors(errors)}`,
    );
  return { siteDir, briefPath, brief };
}

const hasSection = (brief) => text(brief.prospect?.status) !== '';

// --------------------------------------------------------------------------------------------------
// prospect.json

/** The data the layout reads: status, business name, page language, and the locales of a multi-locale site. */
export function prospectData(brief) {
  const { locales, multilingual } = briefLocales(brief);
  return {
    status: brief.prospect.status,
    business: text(brief.business?.name),
    language: text(brief.language),
    ...(multilingual ? { locales } : {}),
  };
}

/** The text of src/data/prospect.json for a brief with a prospect section. */
export const prospectContent = (brief) => renderLegalJson(prospectData(brief));

/**
 * Compute (and with check=false, write) sites/<slug>/src/data/prospect.json.
 * Returns { state: 'not-prospect' | 'ok' | 'stale' | 'written', path, content }.
 */
export function syncProspect({ slug, root = ROOT, check = false }) {
  const { siteDir, brief } = loadSite(slug, root);
  const path = join(siteDir, 'src/data/prospect.json');
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (!hasSection(brief)) {
    if (!check)
      throw new UsageError(
        `sites/${slug}/brief.json has no prospect section (prospect.status), so there is nothing to write`,
      );
    return {
      state: current === null ? 'not-prospect' : 'stale',
      path,
      content: null,
    };
  }
  const content = prospectContent(brief);
  if (current === content) return { state: 'ok', path, content };
  if (check) return { state: 'stale', path, content };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return { state: 'written', path, content };
}

// --------------------------------------------------------------------------------------------------
// SALES.md

const cell = (value) =>
  String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\s*\n\s*/g, ' ')
    .trim() || '-';

/** The lines of a `## <name>` section of a Markdown file (up to the next `## `), or [] when it is missing. */
function sectionOf(markdown, name) {
  const lines = markdown.split('\n');
  const start = lines.findIndex(
    (line) => /^##\s/.test(line) && line.toLowerCase().includes(name),
  );
  if (start === -1) return [];
  const end = lines.findIndex((line, i) => i > start && /^##\s/.test(line));
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

const readIfExists = (path) =>
  existsSync(path) ? readFileSync(path, 'utf8') : '';

/** Section names from the "Page map" table of PROPOSAL.md (second column), in order. */
function sectionNames(proposal) {
  const rows = sectionOf(proposal, 'page map').filter((line) =>
    /^\|\s*\d+\s*\|/.test(line),
  );
  return rows.map((row) => row.split('|')[2]?.trim()).filter(Boolean);
}

function valueOf(brief, field) {
  const value = getPath(brief, field);
  if (typeof value === 'string') return value;
  if (isFilled(value)) return JSON.stringify(value);
  return '';
}

/** The text of SALES.md. `proposal`, `run` and `revisions` are the contents of the site's files (empty when missing). */
export function salesKit({ slug, brief, proposal = '', run = '', revisions }) {
  const name = text(brief.business?.name);
  const sources = brief.prospect?.sources ?? [];
  const assumed = brief.assumed ?? [];
  const result = /^Result:\s*(\S+)/m.exec(run)?.[1] ?? 'not recorded';
  const blend = sectionOf(proposal, 'archetype blend')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '');
  const names = sectionNames(proposal);
  const rounds = Array.isArray(revisions?.rounds) ? revisions.rounds.length : 0;
  const { locales, multilingual } = briefLocales(brief);
  const markets = (brief.legal?.markets ?? []).filter(isFilled);
  const needs = text(brief.audience?.needs);
  const objections = text(brief.audience?.objections);
  const uncovered = uncoveredProspectFacts(brief);
  const out = [];
  const add = (...lines) => out.push(...lines);

  add(
    `# Sales kit: ${name}`,
    '',
    `Site: \`sites/${slug}/\`. Written by \`node scripts/prospect.mjs kit --site ${slug}\`; running it again overwrites this file. Not legal advice.`,
    '',
    '## Summary',
    '',
    `- **Business:** ${name}${text(brief.business?.city) ? `, ${text(brief.business.city)}` : ''}. ${text(brief.business?.description)}`,
    `- **Status:** prospect. The business has not bought or agreed to anything; the page is a design proposal, not its website.`,
    `- **Build result:** ${result}${rounds ? `; ${rounds} revision round${rounds === 1 ? '' : 's'}` : ''}.`,
    `- **Language:** ${multilingual ? locales.join(', ') : text(brief.language) || 'not set'}.`,
    '',
    'Preview: <from the pull request comment>',
    '',
    '## What was built',
    '',
  );
  if (blend.length)
    add('Archetype blend (from `PROPOSAL.md`):', '', ...blend, '');
  else
    add('Archetype blend: not recorded (no `PROPOSAL.md` section found).', '');
  if (names.length)
    add(`Sections: ${names.map((n, i) => `${i + 1}. ${n}`).join('; ')}.`, '');
  else add('Sections: not recorded (no page map in `PROPOSAL.md`).', '');
  add(
    'Rules the page follows while the business is a prospect:',
    '',
    '- Every page is `noindex`, the sitemap is empty and the server sends `X-Robots-Tag: noindex`.',
    '- Every page shows a notice saying it is a design proposal and not the official website.',
    '- No logo, photo, color or font of the business is used: the images come from Wikimedia Commons or The Met and the palette and fonts are chosen from the niche.',
    '- No AI images, no legal holder, no forms: nobody has agreed to any of them.',
    '',
    '## Facts and sources',
    '',
  );
  if (sources.length) {
    add(
      "Every fact the page shows as the business's own, with the public page it was read from. Re-check them before showing the page.",
      '',
      '| Field | Value | Source | Retrieved |',
      '| ----- | ----- | ------ | --------- |',
      ...sources.map(
        (s) =>
          `| ${cell(s.field)} | ${cell(valueOf(brief, s.field))} | ${cell(s.url)} | ${cell(s.retrieved)} |`,
      ),
      '',
    );
  } else add('No sources are recorded.', '');
  if (uncovered.length)
    add(
      `Facts with neither a source nor an assumption: ${uncovered.join(', ')}. Fix the brief before showing the page.`,
      '',
    );
  add('## Assumed', '');
  if (assumed.length)
    add(
      'Values chosen for the business, not read from it. Confirm each one with the business.',
      '',
      '| Field | Value | Reason |',
      '| ----- | ----- | ------ |',
      ...assumed.map(
        (a) =>
          `| ${cell(a.field)} | ${cell(valueOf(brief, a.field))} | ${cell(a.reason)} |`,
      ),
      '',
    );
  else add('Nothing was assumed.', '');
  add(
    '## To go live',
    '',
    "The page cannot be published as the business's site until all of this exists:",
    '',
    "1. The business's own assets (logo, photos, colors, fonts) with the owner and written permission, recorded in `brief.json` `assets`.",
    '2. Its consent to AI images, if you want any (`brand.aiImages`). Without it the page keeps archive images only.',
    `3. Legal holder data: name, tax id, address, email and the privacy contact (\`legal.holder\`, \`legal.privacyContact\`); markets ${markets.length ? `now set to ${markets.join(', ')}` : 'not set yet (\`legal.markets\`)'}. The legal pages are built from them; nothing is invented.`,
    '4. A domain the business controls (`deploy.domain`) and a hosting target.',
    `5. Mark the prospect as a customer: \`node scripts/prospect.mjs sold --site ${slug}\`. This removes the notice and the \`noindex\` on the next build.`,
    `6. Fill the brief with the customer: \`/brief-intake ${slug}\`, then bring in their assets and copy with a revision round (\`npm run revise -- ${slug} --feedback <file>\`), and check that the build is indexable.`,
    `7. Hand the landing over: \`/landing-handoff ${slug}\`.`,
    '',
    '## Talking points',
    '',
    'Taken from the brief, never invented results:',
    '',
  );
  if (needs) add(`- What their audience needs: ${needs}`);
  if (objections) add(`- What holds their audience back: ${objections}`);
  if (!needs && !objections)
    add(
      '- The brief has no audience needs or objections: ask the business before you talk about the page.',
    );
  add(
    '- Show the page next to their current site and let them say what is missing.',
    '',
    '## First contact',
    '',
    'You write the first message yourself, by hand. This kit does not contain one.',
    '',
    '- Unsolicited commercial email is restricted. In Spain the LSSI forbids it, businesses included, and other markets have similar rules (opt-in or prior relationship). Do not send the preview link in a mass or cold email.',
    '- Prefer a contact the business can answer on its own terms: in person, by phone, or through its own public contact channel (its contact form, its listed WhatsApp or business address), and say plainly who you are and what you made.',
    '- Say that the page is a draft built from public information and that it is not published as their site.',
    '- This is a note, not legal advice. Check the rules of the market you contact.',
    '',
  );
  return out.join('\n');
}

export function writeKit({ slug, root = ROOT }) {
  const { siteDir, brief } = loadSite(slug, root);
  if (!isProspect(brief))
    throw new Refusal(
      hasSection(brief)
        ? `sites/${slug} is already sold: there is no sales kit for a customer`
        : `sites/${slug}/brief.json has no prospect section (prospect.status "prospect")`,
    );
  let revisions = null;
  try {
    const file = join(siteDir, 'revisions.json');
    if (existsSync(file)) revisions = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    revisions = null;
  }
  const content = salesKit({
    slug,
    brief,
    proposal: readIfExists(join(siteDir, 'PROPOSAL.md')),
    run: readIfExists(join(siteDir, 'RUN.md')),
    revisions,
  });
  const path = join(siteDir, 'SALES.md');
  writeFileSync(path, content);
  return { path, content };
}

// --------------------------------------------------------------------------------------------------
// Sold

export function markSold({ slug, root = ROOT }) {
  const { siteDir, briefPath, brief } = loadSite(slug, root);
  if (!hasSection(brief))
    throw new Refusal(
      `sites/${slug}/brief.json has no prospect section: it is not a prospect landing`,
    );
  if (brief.prospect.status === 'sold')
    throw new Refusal(`sites/${slug} is already marked as sold`);
  brief.prospect.status = 'sold';
  const errors = validateBrief(brief, { baseDir: siteDir });
  if (errors.length)
    throw new Refusal(
      `sites/${slug}/brief.json would be invalid once sold:\n${formatErrors(errors)}`,
    );
  writeFileSync(briefPath, `${JSON.stringify(brief, null, 2)}\n`);
  return syncProspect({ slug, root });
}

// --------------------------------------------------------------------------------------------------
// CLI

const HELP = `Usage:
  node scripts/prospect.mjs write --site <slug> [--check]
  node scripts/prospect.mjs kit   --site <slug>
  node scripts/prospect.mjs sold  --site <slug>

Prospect landings: a page built for a business that has not bought yet (brief.json prospect.status "prospect").
  write   write sites/<slug>/src/data/prospect.json from the brief (status, business name, language). With --check
          nothing is written; exit 1 when the file is stale. The layout adds noindex and a visible notice to every
          page, and astro.config.mjs an empty sitemap and an X-Robots-Tag header.
  kit     write sites/<slug>/SALES.md: what was built, the facts and their sources, what was assumed, what going
          live needs and talking points. It holds no message to the prospect; the first contact is yours.
  sold    set prospect.status to "sold", keep the sources, rewrite prospect.json and print the next steps.
          Pages are not edited and nothing is built, committed or deployed.

Exit codes: 0 ok, 1 stale (--check), invalid brief or refused, 2 bad usage or unreadable input.`;

const NEXT_STEPS = (
  slug,
) => `prospect: sites/${slug} is now marked as sold. Next:
  1. /brief-intake ${slug}            the customer's real data, assets and consent (brand.aiImages, legal.holder, forms)
  2. npm run revise -- ${slug} --feedback <file>   bring in the customer's assets and copy as a revision round
  3. npm run build -w site-${slug}    the notice, the noindex and the header are gone on the next build
  4. /landing-handoff ${slug}         repository, host and domain`;

export function main(argv, io = console, root = null) {
  const factoryRoot = root ?? resolve(process.env.LANDING_FACTORY_ROOT || ROOT);
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        site: { type: 'string' },
        check: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    }));
  } catch (error) {
    io.error(`prospect: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  const [command, ...extra] = positionals;
  if (!['write', 'kit', 'sold'].includes(command) || extra.length) {
    io.error(`prospect: expected write, kit or sold\n\n${HELP}`);
    return 2;
  }
  if (!values.site) {
    io.error(`prospect: --site <slug> is required\n\n${HELP}`);
    return 2;
  }
  if (values.check && command !== 'write') {
    io.error('prospect: --check only goes with write');
    return 2;
  }
  const slug = values.site;
  const where = `sites/${slug}/src/data/prospect.json`;
  try {
    if (command === 'write') {
      const result = syncProspect({
        slug,
        root: factoryRoot,
        check: Boolean(values.check),
      });
      if (result.state === 'not-prospect') {
        io.log(
          `prospect: sites/${slug} is not a prospect landing, nothing to check`,
        );
        return 0;
      }
      if (result.state === 'stale') {
        io.error(
          `prospect: ${where} is out of date. Run: node scripts/prospect.mjs write --site ${slug}`,
        );
        return 1;
      }
      io.log(
        result.state === 'written'
          ? `prospect: wrote ${where}`
          : `prospect: ${where} is up to date`,
      );
      return 0;
    }
    if (command === 'kit') {
      const { path } = writeKit({ slug, root: factoryRoot });
      io.log(`prospect: wrote sites/${slug}/SALES.md (${path})`);
      return 0;
    }
    markSold({ slug, root: factoryRoot });
    io.log(`prospect: set prospect.status to sold and wrote ${where}`);
    io.log(NEXT_STEPS(slug));
    return 0;
  } catch (error) {
    if (error instanceof Refusal) {
      io.error(`prospect: ${error.message}`);
      return 1;
    }
    if (error instanceof UsageError) {
      io.error(`prospect: ${error.message}`);
      return 2;
    }
    throw error;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
