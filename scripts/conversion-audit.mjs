#!/usr/bin/env node
// Heuristic conversion audit of a built landing (design: openspec/changes/add-neuromarketing-review/design.md).
//
//   node scripts/conversion-audit.mjs --site <slug> [--json]
//
// Reads sites/<slug>/dist/ and sites/<slug>/brief.json. Starts no browser and writes nothing. Prints findings
// (warnings and info) for the hero, the closing call to action, the number of destinations, form fields, offers
// side by side, proof, contact data and legal links; see scripts/lib/conversion-audit.mjs. Findings are
// heuristics: the exit code is 0 even when there are some.
// LANDING_FACTORY_ROOT=<dir> reads sites/ in <dir> instead of this repo (tests).
//
// Exit codes: 0 audited (with or without findings), 2 bad usage, unknown site, unreadable brief or no build.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { AuditError, auditSite, formatAudit } from './lib/conversion-audit.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `Usage: node scripts/conversion-audit.mjs --site <slug> [--json]

Conversion heuristics for the built page of sites/<slug>/ (build first: npm run build -w site-<slug>):
  hero-h1               the first section of <main> has an h1
  hero-cta              the first section links to the primary call to action of the brief
  closing-cta           the last section before the footer links to it
  cta-destinations      more than 3 distinct link destinations in <main>
  form-fields           a form with more than 5 visible fields
  offers-side-by-side   more than 3 items with a price side by side in one section
  proof-shown           (info) each proof entry of the brief is on the page or not
  proof-without-brief   a testimonial or star-rating markup when the brief has no proof
  contact-visible       a contact value of the brief is not on the page
  legal-linked          (info) the legal pages are linked from the page

  --site <slug>   the site (required)
  --json          print { site, brief, pages, findings: [{ id, level, page, selector, message }] }
  --help          show this help

A multi-locale site is audited on each locale's home page. Exit codes: 0 audited, 2 bad usage or no build.`;

export function main(argv, io = console, env = process.env) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        json: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    io.error(`conversion-audit: ${error.message}\n\n${HELP}`);
    return 2;
  }
  const { values } = parsed;
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  if (!values.site) {
    io.error(`conversion-audit: --site <slug> is required\n\n${HELP}`);
    return 2;
  }
  try {
    const result = auditSite({
      root: env.LANDING_FACTORY_ROOT ? resolve(env.LANDING_FACTORY_ROOT) : ROOT,
      slug: values.site,
    });
    io.log(values.json ? JSON.stringify(result, null, 2) : formatAudit(result));
    return 0;
  } catch (error) {
    if (error instanceof AuditError) {
      io.error(`conversion-audit: ${error.message}`);
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
