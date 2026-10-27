#!/usr/bin/env node
// Record that a landing's repository was transferred to its customer
// (design: openspec/changes/add-landing-revise/design.md, Decision 6).
//
//   node scripts/transfer.mjs record --site <slug> --to <github-owner> [--repository <https-url>]
//
// Writes `transferredTo`, `transferredAt` and the new repository URL (default https://github.com/<owner>/<name>,
// the name taken from the recorded repository) into sites/<slug>/EXPORTED.json. After that revise-landing.sh,
// sync-export.mjs and the MCP revision job refuse the site: the factory does nothing more with it. The transfer
// itself is the owner's (GitHub, Settings > Transfer ownership); `node scripts/handoff.mjs transfer-plan` prints
// the checklist. Exit codes: 0 recorded, 1 refused (no record, already transferred), 2 bad usage.
// LANDING_FACTORY_ROOT=<dir> moves the factory root (tests only).
import { existsSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  isTransferred,
  normalizeRepoUrl,
  readExportRecord,
  recordPath,
  validateExportRecord,
} from './lib/export-record.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';

const CODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultRoot = () =>
  process.env.LANDING_FACTORY_ROOT
    ? resolve(process.env.LANDING_FACTORY_ROOT)
    : CODE_ROOT;

/** A GitHub user or organization login. */
export const GITHUB_OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

class UsageError extends Error {}
class Refused extends Error {}

const HELP = `Usage: node scripts/transfer.mjs record --site <slug> --to <github-owner> [--repository <https-url>]

Records that the landing's repository now belongs to <github-owner>: transferredTo, transferredAt and the new
repository URL go into sites/<slug>/EXPORTED.json. From then on revise-landing.sh, sync-export.mjs and the MCP
revision job refuse the site. Do this after GitHub shows the repository under the new owner; the transfer itself is
the owner's (see: node scripts/handoff.mjs transfer-plan --site <slug> --to <github-owner>).

  --site <slug>          the site under sites/ (required; it needs an EXPORTED.json)
  --to <github-owner>    the customer's GitHub user or organization (required)
  --repository <url>     the repository's new https URL (default https://github.com/<owner>/<name>)

Exit codes: 0 recorded, 1 refused (no EXPORTED.json, already transferred), 2 bad usage.`;

function parse(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        site: { type: 'string' },
        to: { type: 'string' },
        repository: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (error) {
    throw new UsageError(error.message);
  }
  const { values, positionals } = parsed;
  if (values.help) return { help: true };
  const [command, ...extra] = positionals;
  if (command !== 'record')
    throw new UsageError(
      command ? `Unknown command "${command}".` : 'A command is required.',
    );
  if (extra.length) throw new UsageError(`Unexpected argument "${extra[0]}".`);
  if (typeof values.site !== 'string' || !SLUG_PATTERN.test(values.site))
    throw new UsageError(
      `--site needs a site slug (lowercase letters, digits, hyphens), got "${values.site ?? ''}".`,
    );
  if (typeof values.to !== 'string' || !GITHUB_OWNER.test(values.to))
    throw new UsageError(
      `--to needs a GitHub user or organization name, got "${values.to ?? ''}".`,
    );
  if (values.repository !== undefined) {
    let url;
    try {
      url = new URL(values.repository);
    } catch {
      throw new UsageError(`--repository "${values.repository}" is not a URL.`);
    }
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new UsageError(
        '--repository must be an https:// URL without credentials.',
      );
    if (!normalizeRepoUrl(values.repository))
      throw new UsageError(
        '--repository must name a repository (https://github.com/<owner>/<name>).',
      );
  }
  return { values };
}

/** Run the command. `io` has log and error. Returns the exit code. */
export function main(
  argv,
  io = console,
  root = defaultRoot(),
  now = new Date(),
) {
  let args;
  try {
    args = parse(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    io.error(`transfer: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (args.help) {
    io.log(HELP);
    return 0;
  }
  const { site: slug, to, repository } = args.values;
  try {
    if (!existsSync(join(root, 'sites', slug, 'package.json')))
      throw new UsageError(
        `No site "${slug}": sites/${slug}/package.json not found`,
      );
    let record;
    try {
      record = readExportRecord(root, slug);
    } catch (error) {
      throw new Refused(error.message);
    }
    if (!record)
      throw new Refused(
        `sites/${slug} has no EXPORTED.json: it was never exported to its own repository, so there is nothing to transfer (docs/handoff.md)`,
      );
    if (isTransferred(record))
      throw new Refused(
        `sites/${slug} was already transferred to ${record.transferredTo}${record.transferredAt ? ` on ${record.transferredAt.slice(0, 10)}` : ''}`,
      );
    let newUrl = repository;
    if (!newUrl) {
      const old = normalizeRepoUrl(record.repository);
      if (!old)
        throw new UsageError(
          `EXPORTED.json has no usable repository URL to take the name from: pass --repository https://github.com/${to}/<name>`,
        );
      newUrl = `https://github.com/${to}/${old.split('/').pop()}`;
    }
    const next = {
      ...record,
      repository: newUrl,
      transferredTo: to,
      transferredAt: now.toISOString(),
    };
    const errors = validateExportRecord(next);
    if (errors.length)
      throw new Refused(
        `EXPORTED.json would be invalid:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
      );
    const path = recordPath(root, slug);
    writeFileSync(`${path}.tmp`, `${JSON.stringify(next, null, 2)}\n`);
    renameSync(`${path}.tmp`, path);
    io.log(
      `transfer: recorded sites/${slug} as transferred to ${to} (${newUrl}). The factory now refuses revisions and syncs for it; sites/${slug}/ stays as the record.`,
    );
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      io.error(`transfer: ${error.message}`);
      return 2;
    }
    if (error instanceof Refused) {
      io.error(`transfer: ${error.message}`);
      return 1;
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
