#!/usr/bin/env node
// Helper of scripts/revise-landing.sh and the MCP tools for the revision rounds of a landing
// (design: openspec/changes/add-landing-revise/design.md, Decisions 2 and 4).
//
//   node scripts/revisions.mjs preflight   --site <slug>
//   node scripts/revisions.mjs next        --site <slug>
//   node scripts/revisions.mjs validate    --site <slug>
//   node scripts/revisions.mjs attach-usage --site <slug> --round <n> --usage <.run-usage.json>
//   node scripts/revisions.mjs show        --site <slug> [--json]
//   node scripts/revisions.mjs meta        --site <slug>
//
// preflight exits 1 naming why a round cannot start (site missing, transferred, direction pages without a build,
// no finished build). attach-usage adds the run's usage to round <n> after validating the file. Exit codes:
// 0 ok, 1 refused or invalid, 2 bad usage. LANDING_FACTORY_ROOT=<dir> moves the factory root (tests only).
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { parseLandingMeta } from './lib/archetypes.mjs';
import { isTransferred, readExportRecord } from './lib/export-record.mjs';
import {
  emptyRevisions,
  nextRound,
  usageForRound,
  validateRevisions,
} from './lib/revisions-schema.mjs';
import { SLUG_PATTERN, isSiteDir } from './lib/sites.mjs';

const CODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultRoot = () =>
  process.env.LANDING_FACTORY_ROOT
    ? resolve(process.env.LANDING_FACTORY_ROOT)
    : CODE_ROOT;

class UsageError extends Error {}
export class Refused extends Error {}

const HELP = `Usage:
  node scripts/revisions.mjs preflight    --site <slug>
  node scripts/revisions.mjs next         --site <slug>
  node scripts/revisions.mjs validate     --site <slug>
  node scripts/revisions.mjs attach-usage --site <slug> --round <n> --usage <file>
  node scripts/revisions.mjs show         --site <slug> [--json]
  node scripts/revisions.mjs meta         --site <slug>

Revision rounds of a landing, sites/<slug>/revisions.json.
  preflight     refuse (exit 1) a missing site, a transferred site, a site with direction pages, a site without
                a finished build (RUN.md "Result: passed")
  next          print the number of the next round
  validate      check revisions.json (a missing file is valid: no rounds yet)
  attach-usage  add the usage of a run (.run-usage.json) to round <n>; null when the run reported none
  show          print the rounds
  meta          print { primary, displayFont, bodyFont } from the landing-meta block of design-system/<slug>/MASTER.md

Exit codes: 0 ok, 1 refused or invalid, 2 bad usage.`;

export const revisionsPath = (root, slug) =>
  join(root, 'sites', slug, 'revisions.json');

/** Parsed and validated revisions.json; an absent file is an empty record. Throws Refused. */
export function readRevisions(root, slug) {
  const path = revisionsPath(root, slug);
  if (!existsSync(path)) return emptyRevisions();
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Refused(
      `sites/${slug}/revisions.json is not valid JSON: ${error.message}`,
    );
  }
  const errors = validateRevisions(data);
  if (errors.length)
    throw new Refused(
      `sites/${slug}/revisions.json is invalid:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  return data;
}

/** Throws Refused with the reason a revision round cannot start on this site. */
export function checkCanRevise(root, slug) {
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(siteDir) || !isSiteDir(siteDir))
    throw new Refused(`there is no site "${slug}" under sites/`);
  let record;
  try {
    record = readExportRecord(root, slug);
  } catch (error) {
    throw new Refused(error.message);
  }
  if (isTransferred(record))
    throw new Refused(
      `sites/${slug} was transferred to ${record.transferredTo}${record.transferredAt ? ` on ${record.transferredAt.slice(0, 10)}` : ''}; the factory does nothing more with it`,
    );
  if (existsSync(join(siteDir, 'src', 'pages', 'directions')))
    throw new Refused(
      `sites/${slug} still has direction pages (src/pages/directions/) and no build: record the choice with node scripts/directions.mjs choose, then build with scripts/new-landing.sh ${slug} --resume --auto`,
    );
  const runFile = join(siteDir, 'RUN.md');
  const finished =
    existsSync(runFile) &&
    /^Result:\s*passed\b/m.test(readFileSync(runFile, 'utf8'));
  if (!finished)
    throw new Refused(
      `sites/${slug} has no finished build (RUN.md has no "Result: passed"); build it first with scripts/new-landing.sh`,
    );
}

function writeAtomic(path, data) {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

function parse(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        site: { type: 'string' },
        round: { type: 'string' },
        usage: { type: 'string' },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (error) {
    throw new UsageError(error.message);
  }
  const { values, positionals } = parsed;
  if (values.help) return { help: true };
  const [command, ...extra] = positionals;
  if (
    !['preflight', 'next', 'validate', 'attach-usage', 'show', 'meta'].includes(
      command ?? '',
    )
  )
    throw new UsageError(
      command ? `Unknown command "${command}".` : 'A command is required.',
    );
  if (extra.length) throw new UsageError(`Unexpected argument "${extra[0]}".`);
  if (typeof values.site !== 'string' || !SLUG_PATTERN.test(values.site))
    throw new UsageError(
      `--site needs a site slug (lowercase letters, digits, hyphens), got "${values.site ?? ''}".`,
    );
  if (command === 'attach-usage') {
    if (!/^[1-9]\d*$/.test(values.round ?? ''))
      throw new UsageError('attach-usage needs --round <n>.');
    if (!values.usage)
      throw new UsageError('attach-usage needs --usage <file>.');
  }
  return { command, values };
}

/** Run the command. `io` has log and error. Returns the exit code. */
export function main(argv, io = console, root = defaultRoot()) {
  let args;
  try {
    args = parse(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    io.error(`revisions: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (args.help) {
    io.log(HELP);
    return 0;
  }
  const { command, values } = args;
  const slug = values.site;
  try {
    if (command === 'preflight') {
      checkCanRevise(root, slug);
      io.log(`revisions: sites/${slug} can take a revision round.`);
      return 0;
    }
    if (command === 'meta') {
      const master = join(root, 'design-system', slug, 'MASTER.md');
      if (!existsSync(master))
        throw new Refused(`design-system/${slug}/MASTER.md does not exist`);
      const meta = parseLandingMeta(readFileSync(master, 'utf8'));
      if (!meta)
        throw new Refused(
          `design-system/${slug}/MASTER.md has no landing-meta block`,
        );
      if (!meta.primary)
        throw new Refused(`landing-meta of ${slug} has no primary`);
      if (!meta.displayFont)
        throw new Refused(`landing-meta of ${slug} has no display-font`);
      io.log(
        JSON.stringify({
          primary: meta.primary,
          displayFont: meta.displayFont,
          bodyFont: meta.bodyFont || null,
        }),
      );
      return 0;
    }
    if (command !== 'preflight' && !existsSync(join(root, 'sites', slug)))
      throw new Refused(`there is no site "${slug}" under sites/`);
    const data = readRevisions(root, slug);
    if (command === 'next') io.log(String(nextRound(data)));
    else if (command === 'validate')
      io.log(`revisions: ${data.rounds.length} round(s), valid.`);
    else if (command === 'show') {
      if (values.json) io.log(JSON.stringify(data, null, 2));
      else if (!data.rounds.length) io.log('No revision rounds yet.');
      else
        for (const r of data.rounds)
          io.log(
            `round ${r.n} (${r.date}): ${r.result}, ${r.items.length} item(s), ${r.files.length} file(s)${r.briefChanged ? ', brief changed' : ''}${r.usage?.costUsd != null ? `, $${r.usage.costUsd.toFixed(4)}` : ''}`,
          );
    } else {
      const n = Number(values.round);
      const round = data.rounds.find((r) => r.n === n);
      if (!round)
        throw new Refused(
          `revisions.json has no round ${n}: the run did not record it`,
        );
      let runUsage = { reported: false };
      try {
        runUsage = JSON.parse(readFileSync(resolve(values.usage), 'utf8'));
      } catch {
        // missing or unreadable: not reported
      }
      round.usage = usageForRound(runUsage);
      writeAtomic(revisionsPath(root, slug), data);
      io.log(
        `revisions: round ${n} usage ${round.usage ? 'recorded' : 'not reported'}.`,
      );
    }
    return 0;
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    io.error(`revisions: ${error.message}`);
    return 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
