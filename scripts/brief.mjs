#!/usr/bin/env node
// The customer brief of a landing: sites/<slug>/brief.json (design: openspec/changes/add-brief-intake/design.md).
//
//   node scripts/brief.mjs init     --site <slug> [--niche "..."] [--lang <tag>] [--force]
//   node scripts/brief.mjs validate (--site <slug> | --file <path>) [--json]
//   node scripts/brief.mjs missing  (--site <slug> | --file <path>) [--json]
//   node scripts/brief.mjs summary  (--site <slug> | --file <path>)
//   node scripts/brief.mjs import   --file <path> --site <slug>
//
// With --site, asset paths are relative to sites/<slug>/; with --file, to the brief file's folder.
// Exit codes: 0 valid / nothing required missing, 1 invalid or required fields missing, 2 bad usage.
// LANDING_FACTORY_ROOT=<dir> reads and writes sites/ in <dir> instead of this repo (tests only).
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  emptyBrief,
  formatErrors,
  missingFields,
  summarizeBrief,
  validateBrief,
} from './lib/brief-schema.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

class UsageError extends Error {}

const HELP = `Usage:
  node scripts/brief.mjs init     --site <slug> [--niche "..."] [--lang <tag>] [--force]
  node scripts/brief.mjs validate (--site <slug> | --file <path>) [--json]
  node scripts/brief.mjs missing  (--site <slug> | --file <path>) [--json]
  node scripts/brief.mjs summary  (--site <slug> | --file <path>)
  node scripts/brief.mjs import   --file <path> --site <slug>

The customer brief of a landing, sites/<slug>/brief.json.
  init       write a skeleton with empty values (the page language stays empty unless --lang is given) (business.description is seeded from --niche);
             works before the site exists; refuses to overwrite without --force
  validate   schema, types, closed values, URLs, emails, phones, asset files, pattern sheets, assumed fields;
             every error names the field path and what is expected
  missing    required fields still empty, then recommended ones in interview order, each with a question hint
  summary    a short readable view (assumed values are marked)
  import     validate --file, copy it to sites/<slug>/brief.json together with the local asset files it
             names (same relative paths), then validate the copy (used by scripts/new-landing.sh --brief)

  --site <slug>   the landing; asset paths are relative to sites/<slug>/
  --file <path>   a brief anywhere; asset paths are relative to its folder
  --json          machine-readable output (validate, missing)

Exit codes: 0 valid / nothing required missing, 1 invalid or required fields missing, 2 bad usage.`;

const sitesRoot = () =>
  join(resolve(process.env.LANDING_FACTORY_ROOT || ROOT), 'sites');

function target({ site, file }) {
  if (site && file) throw new UsageError('give --site or --file, not both');
  if (!site && !file)
    throw new UsageError('--site <slug> or --file <path> is required');
  if (site) {
    if (!SLUG_PATTERN.test(site))
      throw new UsageError(
        `invalid slug "${site}": use lowercase letters, digits and single hyphens`,
      );
    const dir = join(sitesRoot(), site);
    return { path: join(dir, 'brief.json'), baseDir: dir };
  }
  const path = resolve(file);
  return { path, baseDir: dirname(path) };
}

/** Read and parse a brief. Throws UsageError when the file is missing, Error(message) on bad JSON. */
function readBrief(path) {
  if (!existsSync(path)) throw new UsageError(`${path} does not exist`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const bad = new Error(`${path} is not valid JSON: ${error.message}`);
    bad.invalidJson = true;
    throw bad;
  }
}

const check = (brief, baseDir) =>
  validateBrief(brief, { baseDir, patternsDir: join(ROOT, 'patterns') });

/** Local asset paths a brief names (relative, as written). */
const localAssets = (brief) =>
  (Array.isArray(brief.assets) ? brief.assets : [])
    .map((asset) => asset?.path)
    .filter((path) => typeof path === 'string' && path.trim() !== '');

function commandInit(values, io) {
  if (!values.site) throw new UsageError('--site <slug> is required');
  if (!SLUG_PATTERN.test(values.site))
    throw new UsageError(`invalid slug "${values.site}"`);
  const lang = values.lang ?? '';
  if (lang && !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(lang))
    throw new UsageError(
      `--lang must be a language tag such as es or en, got "${lang}"`,
    );
  const dir = join(sitesRoot(), values.site);
  const path = join(dir, 'brief.json');
  if (existsSync(path) && !values.force)
    throw new UsageError(
      `${path} already exists; use --force to overwrite it, or edit it`,
    );
  mkdirSync(dir, { recursive: true });
  const niche = (values.niche ?? '').replace(/\s+/g, ' ').trim();
  writeFileSync(
    path,
    `${JSON.stringify(emptyBrief({ language: lang, niche }), null, 2)}\n`,
  );
  io.log(`brief: wrote ${path}`);
  io.log(
    `Next: node scripts/brief.mjs missing --site ${values.site}   (or run /brief-intake ${values.site})`,
  );
  return 0;
}

function commandValidate(values, io) {
  const { path, baseDir } = target(values);
  let brief;
  try {
    brief = readBrief(path);
  } catch (error) {
    if (!error.invalidJson) throw error;
    if (values.json)
      io.log(
        JSON.stringify(
          {
            valid: false,
            errors: [{ path: '(file)', message: error.message }],
          },
          null,
          2,
        ),
      );
    else io.error(`brief: ${error.message}`);
    return 1;
  }
  const errors = check(brief, baseDir);
  if (values.json) {
    io.log(JSON.stringify({ valid: errors.length === 0, errors }, null, 2));
  } else if (errors.length) {
    io.error(
      `brief: ${path} has ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n${formatErrors(errors)}`,
    );
  } else {
    io.log(`brief: ${path} is valid`);
  }
  return errors.length ? 1 : 0;
}

function commandMissing(values, io) {
  const { path } = target(values);
  const brief = readBrief(path);
  const missing = missingFields(brief);
  const required = missing.filter((m) => m.required);
  if (values.json) {
    io.log(
      JSON.stringify({ missing, requiredMissing: required.length }, null, 2),
    );
  } else if (!missing.length) {
    io.log('brief: nothing missing');
  } else {
    io.log(
      `brief: ${missing.length} field${missing.length === 1 ? '' : 's'} still empty (required first, then interview order):`,
    );
    for (const m of missing)
      io.log(
        `  ${m.required ? 'REQUIRED   ' : 'recommended'} ${m.path}: ${m.hint}`,
      );
  }
  return required.length ? 1 : 0;
}

function commandSummary(values, io) {
  const { path } = target(values);
  io.log(summarizeBrief(readBrief(path)));
  return 0;
}

function commandImport(values, io) {
  if (!values.file || !values.site)
    throw new UsageError('import needs --file <path> and --site <slug>');
  const source = target({ file: values.file });
  const dest = target({ site: values.site });
  const brief = readBrief(source.path);
  const errors = check(brief, source.baseDir);
  if (errors.length) {
    io.error(
      `brief: ${source.path} has ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n${formatErrors(errors)}`,
    );
    return 1;
  }
  mkdirSync(dest.baseDir, { recursive: true });
  const copied = [];
  if (resolve(source.path) !== resolve(dest.path)) {
    writeFileSync(dest.path, readFileSync(source.path));
    copied.push('brief.json');
  }
  if (source.baseDir !== dest.baseDir)
    for (const rel of localAssets(brief)) {
      const clean = normalize(rel);
      const to = join(dest.baseDir, clean);
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(join(source.baseDir, clean), to);
      copied.push(clean);
    }
  const after = check(readBrief(dest.path), dest.baseDir);
  if (after.length) {
    io.error(
      `brief: the copy ${dest.path} has problems:\n${formatErrors(after)}`,
    );
    return 1;
  }
  io.log(
    `brief: ${dest.path} is valid${copied.length ? ` (copied: ${copied.join(', ')})` : ''}`,
  );
  return 0;
}

const COMMANDS = {
  init: commandInit,
  validate: commandValidate,
  missing: commandMissing,
  summary: commandSummary,
  import: commandImport,
};

export function main(argv, io = console) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        site: { type: 'string' },
        file: { type: 'string' },
        niche: { type: 'string' },
        lang: { type: 'string' },
        force: { type: 'boolean' },
        json: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    io.error(`brief: ${error.message}\n\n${HELP}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  const [command, ...extra] = positionals;
  if (!command || !COMMANDS[command] || extra.length) {
    io.error(
      `brief: expected one command (${Object.keys(COMMANDS).join(', ')})${command ? `, got "${[command, ...extra].join(' ')}"` : ''}\n\n${HELP}`,
    );
    return 2;
  }
  try {
    return COMMANDS[command](values, io);
  } catch (error) {
    if (error instanceof UsageError) {
      io.error(`brief: ${error.message}`);
      return 2;
    }
    if (error.invalidJson) {
      io.error(`brief: ${error.message}`);
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
