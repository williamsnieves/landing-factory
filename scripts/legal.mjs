#!/usr/bin/env node
// Generate the legal data of a site from its brief.
//
//   node scripts/legal.mjs --site <slug> [--write | --check]
//
// Reads sites/<slug>/brief.json and writes sites/<slug>/src/data/legal.json: the markets, the legal pages their
// rule sets require, the holder, the privacy contact, what the page does with personal data, the hosting, the
// third-party hosts the build loads (from dist/ when it exists), the page language and a `pending` list of the
// required values the brief does not have. The starter's legal components (src/components/legal/) render it.
// Without --write or --check it prints what it would write. With --check nothing is written; exit 1 when the
// file is stale against the brief. Like credits.mjs, the output is stable under Prettier.
//
// These templates support compliance and are not legal advice. Holder identity is never invented: a missing
// value stays in `pending` and the pages show a visible "pending legal review" marker.
// Exit codes: 0 ok / up to date, 1 stale (--check) or invalid brief, 2 bad usage or unreadable brief.
// Design: openspec/changes/add-legal-compliance/design.md, Decision 5.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { formatErrors, validateBrief } from './lib/brief-schema.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';
import { loadDist } from './report/dist-scan.mjs';
import { externalLoads } from './report/legal.mjs';
import { rulesForMarkets } from './report/legal-rules.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Languages the legal components have texts for. */
export const TEMPLATE_LANGUAGES = ['en', 'es'];

const HOSTING = {
  'cloudflare-pages': 'Cloudflare Pages',
  vercel: 'Vercel',
  netlify: 'Netlify',
  vps: '',
  'shared-hosting': '',
  undecided: 'Cloudflare Pages',
  '': 'Cloudflare Pages',
};

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const blank = (value) => text(value) === '';

/** The language of the legal texts for a page language tag, and whether it fell back to English. */
export function templateLanguage(tag) {
  const base = text(tag).toLowerCase().split('-')[0];
  return TEMPLATE_LANGUAGES.includes(base)
    ? { language: base, fallback: false }
    : { language: 'en', fallback: true };
}

/** External hosts the built pages load without waiting for consent, sorted. Empty when there is no build. */
export function builtHosts(distDir) {
  if (!existsSync(join(distDir, 'index.html'))) return null;
  const hosts = new Set();
  for (const load of externalLoads(loadDist(distDir)))
    if (!load.gated) hosts.add(load.host);
  return [...hosts].sort();
}

/**
 * The legal data of a brief. `thirdPartyHosts` comes from the caller (the build), because it is not in the brief.
 * Returns { data, warnings }.
 */
export function legalData(brief, { thirdPartyHosts = [] } = {}) {
  const legal = brief.legal ?? {};
  const markets = (legal.markets ?? []).map(text).filter(Boolean);
  const rules = rulesForMarkets(markets);
  const holder = {
    name: text(legal.holder?.name),
    taxId: text(legal.holder?.taxId),
    address: text(legal.holder?.address),
    email: text(legal.holder?.email),
    register: text(legal.holder?.register),
  };
  const privacyContact = text(legal.privacyContact);
  const processing = {
    analytics: text(legal.processing?.analytics),
    forms: legal.processing?.forms === true,
    embeds: (legal.processing?.embeds ?? []).map(text).filter(Boolean),
  };
  const pending = [];
  for (const field of rules.holder)
    if (blank(holder[field])) pending.push(`holder.${field}`);
  if (
    rules.emailOrPrivacyContact &&
    blank(holder.email) &&
    blank(privacyContact)
  )
    pending.push('privacyContact');
  // The policy states what the page does with personal data, so that answer is needed too.
  if (rules.pages.includes('privacy') && blank(processing.analytics))
    pending.push('processing.analytics');

  const { language, fallback } = templateLanguage(brief.language);
  const warnings = [];
  if (fallback)
    warnings.push(
      `no legal text for the page language "${brief.language}": the pages use English (translate src/components/legal/texts.ts)`,
    );
  if (rules.unknown.length)
    warnings.push(
      `no rule set for ${rules.unknown.join(', ')}: no legal page is generated for it`,
    );
  return {
    data: {
      version: 1,
      language,
      business: {
        name: text(brief.business?.name),
        domain: text(brief.deploy?.domain),
      },
      markets,
      pages: rules.pages,
      unknownMarkets: rules.unknown,
      holder,
      privacyContact,
      processing,
      hosting: {
        target: text(brief.deploy?.target),
        name: HOSTING[text(brief.deploy?.target)] ?? '',
      },
      thirdPartyHosts,
      pending,
    },
    warnings,
  };
}

// --- Serialization that Prettier leaves alone ---------------------------------------------------------

const WIDTH = 80;

function serialize(value, indent = '', prefix = '', trailing = '') {
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    if (value.every((v) => v === null || typeof v !== 'object')) {
      const one = `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
      if (indent.length + prefix.length + one.length + trailing.length <= WIDTH)
        return one;
    }
    const inner = `${indent}  `;
    return `[\n${value
      .map(
        (v, i) =>
          `${inner}${serialize(v, inner, '', i < value.length - 1 ? ',' : '')}`,
      )
      .join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return '{}';
    const inner = `${indent}  `;
    return `{\n${entries
      .map(([key, v], i) => {
        const head = `${JSON.stringify(key)}: `;
        return `${inner}${head}${serialize(v, inner, head, i < entries.length - 1 ? ',' : '')}`;
      })
      .join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

export const renderLegalJson = (data) => `${serialize(data)}\n`;

// --- Sync ----------------------------------------------------------------------------------------------

/**
 * Compute (and with check=false, write) sites/<slug>/src/data/legal.json.
 * Returns { state: 'no-market' | 'ok' | 'stale' | 'written', path, data, warnings, content }.
 */
export function syncLegal({ slug, root = ROOT, check = false }) {
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
  if (errors.length) {
    const failure = new Error(
      `sites/${slug}/brief.json is invalid:\n${formatErrors(errors)}`,
    );
    failure.code = 'INVALID_BRIEF';
    throw failure;
  }

  const path = join(siteDir, 'src/data/legal.json');
  const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
  const hasMarket = (brief.legal?.markets ?? []).some((m) => !blank(m));
  if (!hasMarket)
    return {
      state: current === null ? 'no-market' : 'stale',
      path,
      data: null,
      warnings: [],
      content: null,
    };

  // Without a build, keep the hosts already recorded so a check does not flap.
  let hosts = builtHosts(join(siteDir, 'dist'));
  if (hosts === null) {
    try {
      hosts = current ? (JSON.parse(current).thirdPartyHosts ?? []) : [];
    } catch {
      hosts = [];
    }
  }
  const { data, warnings } = legalData(brief, { thirdPartyHosts: hosts });
  const content = renderLegalJson(data);
  if (current === content)
    return { state: 'ok', path, data, warnings, content };
  if (check) return { state: 'stale', path, data, warnings, content };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return { state: 'written', path, data, warnings, content };
}

class UsageError extends Error {}

const HELP = `Usage: node scripts/legal.mjs --site <slug> [--write | --check]

Builds sites/<slug>/src/data/legal.json from sites/<slug>/brief.json: markets, the legal pages their rule
sets require (privacy policy, legal notice), holder, privacy contact, data processing, hosting, the
third-party hosts of the build and the values still pending. The legal components render it.

  --site <slug>   the site (required)
  --write         write the file (without it, print what would be written)
  --check         write nothing; exit 1 when the file is stale against the brief
  --help          show this help

A value the brief does not have is never invented: it is listed under "pending" and the pages show a
"pending legal review" marker. The templates support compliance and are not legal advice.
Exit codes: 0 ok, 1 stale (--check) or invalid brief, 2 bad usage or unreadable brief.`;

export function main(argv, io = console, root = null) {
  const factoryRoot = root ?? resolve(process.env.LANDING_FACTORY_ROOT || ROOT);
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        write: { type: 'boolean' },
        check: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    }));
  } catch (error) {
    io.error(`legal: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  if (!values.site) {
    io.error(`legal: --site <slug> is required\n\n${HELP}`);
    return 2;
  }
  if (values.write && values.check) {
    io.error('legal: give --write or --check, not both');
    return 2;
  }
  try {
    const result = syncLegal({
      slug: values.site,
      root: factoryRoot,
      check: !values.write, // without --write nothing is written
    });
    const where = `sites/${values.site}/src/data/legal.json`;
    for (const warning of result.warnings)
      io.error(`legal: warning: ${warning}`);
    if (result.state === 'no-market') {
      io.log(
        `legal: sites/${values.site}/brief.json names no market (legal.markets): no legal pages are required, nothing to write. The legal requirements are unknown.`,
      );
      return 0;
    }
    if (result.state === 'stale' && result.data === null) {
      io.error(
        `legal: ${where} exists but the brief names no market; remove the file or add legal.markets`,
      );
      return 1;
    }
    if (!values.write && !values.check) {
      io.log(result.content.trimEnd());
    } else if (values.check) {
      if (result.state === 'stale') {
        io.error(
          `legal: ${where} is out of date. Run: node scripts/legal.mjs --site ${values.site} --write`,
        );
        return 1;
      }
      io.log(`legal: ${where} is up to date`);
    } else if (result.state === 'written') {
      io.log(`legal: wrote ${where}`);
    } else if (result.state === 'ok') {
      io.log(`legal: ${where} already up to date`);
    }
    if (result.data) {
      io.log(
        `legal: pages required: ${result.data.pages.join(', ') || 'none'}; markets: ${result.data.markets.join(', ')}`,
      );
      if (result.data.pending.length)
        io.log(
          `legal: PENDING (the pages show a pending marker, and the report fails): ${result.data.pending.join(', ')}`,
        );
    }
    return 0;
  } catch (error) {
    if (error.code === 'INVALID_BRIEF') {
      io.error(`legal: ${error.message}`);
      return 1;
    }
    if (error instanceof UsageError) {
      io.error(`legal: ${error.message}`);
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
