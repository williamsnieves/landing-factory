#!/usr/bin/env node
// Visual directions of a landing: sites/<slug>/directions.json (design: openspec/changes/add-landing-preview).
//
//   node scripts/directions.mjs check  --site <slug> [--json]
//   node scripts/directions.mjs choose --site <slug> --direction <id> [--notes "..."]
//   node scripts/directions.mjs show   --site <slug> [--json]
//
// Exit codes: 0 ok, 1 failed or refused, 2 bad usage. LANDING_FACTORY_ROOT=<dir> reads and writes sites/ in
// <dir> instead of this repo (tests only).
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  DIRECTION_IDS,
  MAX_DIRECTIONS,
  MIN_DIRECTIONS,
  hueFamily,
  primaryArchetype,
  validateDirections,
} from './lib/directions-schema.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';

const CODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

class UsageError extends Error {}
export class Refused extends Error {}

const HELP = `Usage:
  node scripts/directions.mjs check  --site <slug> [--json]
  node scripts/directions.mjs choose --site <slug> --direction <id> [--notes "..."]
  node scripts/directions.mjs show   --site <slug> [--json]

The visual directions of a landing, sites/<slug>/directions.json.
  check    2 or 3 directions with all fields, different primary archetypes, no shared trio of primary hue family,
           display font and hero type, and each page built (dist/directions/<id>/index.html) and noindex
  choose   record the chosen direction, the customer's notes (at most 2000 characters) and today's date;
           refuses an unknown direction and a site whose direction pages were already removed
  show     print the record

Exit codes: 0 ok, 1 failed or refused, 2 bad usage.`;

export const directionsPath = (root, slug) =>
  join(root, 'sites', slug, 'directions.json');

/** Parsed directions.json, or throws Refused naming the problem. */
export function readDirections(root, slug) {
  const path = directionsPath(root, slug);
  if (!existsSync(path))
    throw new Refused(`sites/${slug}/directions.json does not exist`);
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Refused(
      `sites/${slug}/directions.json is not valid JSON: ${error.message}`,
    );
  }
  const errors = validateDirections(data);
  if (errors.length)
    throw new Refused(
      `sites/${slug}/directions.json is invalid:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  return data;
}

const isNoindex = (html) =>
  /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(
    html,
  ) ||
  /<meta\b[^>]*\bcontent=["'][^"']*noindex[^"']*["'][^>]*\bname=["']robots["']/i.test(
    html,
  );

/** Problems of a valid record, as strings (an empty array means the directions are ready to show). */
export function checkDirections(root, slug, data) {
  const problems = [];
  const list = data.directions;
  if (list.length < MIN_DIRECTIONS || list.length > MAX_DIRECTIONS)
    problems.push(
      `there must be ${MIN_DIRECTIONS} or ${MAX_DIRECTIONS} directions, found ${list.length}`,
    );
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (primaryArchetype(a.archetype) === primaryArchetype(b.archetype))
        problems.push(
          `directions ${a.id} and ${b.id} share the primary archetype "${primaryArchetype(a.archetype)}"`,
        );
      if (
        hueFamily(a.primary) === hueFamily(b.primary) &&
        a.displayFont.toLowerCase() === b.displayFont.toLowerCase() &&
        a.hero === b.hero
      )
        problems.push(
          `directions ${a.id} and ${b.id} share the primary color family (${hueFamily(a.primary)}), display font (${a.displayFont}) and hero type (${a.hero}); change at least one`,
        );
    }
  for (const d of list) {
    const page = join(
      root,
      'sites',
      slug,
      'dist',
      'directions',
      d.id,
      'index.html',
    );
    if (!existsSync(page))
      problems.push(
        `direction ${d.id}: dist/directions/${d.id}/index.html is missing (build the site)`,
      );
    else if (!isNoindex(readFileSync(page, 'utf8')))
      problems.push(`direction ${d.id}: the page is not noindex`);
  }
  return problems;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Record the choice. Returns the saved record; throws Refused. */
export function chooseDirection(
  root,
  slug,
  { direction, notes = '', date = today() },
) {
  const data = readDirections(root, slug);
  if (!data.directions.some((d) => d.id === direction))
    throw new Refused(
      `unknown direction "${direction}": the record has ${data.directions.map((d) => d.id).join(', ') || 'none'}`,
    );
  if (!existsSync(join(root, 'sites', slug, 'src', 'pages', 'directions')))
    throw new Refused(
      `sites/${slug} was already built past the directions (src/pages/directions/ is gone); the choice can no longer be recorded`,
    );
  const next = { ...data, choice: { direction, notes, date } };
  const errors = validateDirections(next);
  if (errors.length) throw new Refused(errors.join('; '));
  const path = directionsPath(root, slug);
  writeFileSync(`${path}.tmp`, `${JSON.stringify(next, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
  return next;
}

export function main(argv, io = console, env = process.env) {
  try {
    const [command, ...rest] = argv;
    if (!command || command === '--help' || command === '-h') {
      io.log(HELP);
      return command ? 0 : 2;
    }
    if (!['check', 'choose', 'show'].includes(command))
      throw new UsageError(`unknown command "${command}"`);
    let values;
    try {
      ({ values } = parseArgs({
        args: rest,
        options: {
          site: { type: 'string' },
          direction: { type: 'string' },
          notes: { type: 'string' },
          json: { type: 'boolean' },
        },
        strict: true,
      }));
    } catch (error) {
      throw new UsageError(error.message);
    }
    if (!values.site || !SLUG_PATTERN.test(values.site))
      throw new UsageError(
        '--site <slug> is required (lowercase letters, digits, single hyphens)',
      );
    if (
      command !== 'choose' &&
      (values.direction !== undefined || values.notes !== undefined)
    )
      throw new UsageError('--direction and --notes belong to choose');
    if (command === 'choose') {
      if (!DIRECTION_IDS.includes(values.direction))
        throw new UsageError(
          `--direction must be one of ${DIRECTION_IDS.join(', ')}`,
        );
      if (values.json) throw new UsageError('--json does not apply to choose');
    }
    const root = resolve(env.LANDING_FACTORY_ROOT || CODE_ROOT);
    const data = readDirections(root, values.site);
    if (command === 'show') {
      if (values.json) io.log(JSON.stringify(data, null, 2));
      else {
        for (const d of data.directions)
          io.log(
            `${d.id}  ${d.archetype}  ${d.primary}  ${d.displayFont}/${d.bodyFont}  ${d.hero}  ${d.idea}`,
          );
        io.log(
          data.choice
            ? `choice: ${data.choice.direction} (${data.choice.date})${data.choice.notes ? `: ${data.choice.notes}` : ''}`
            : 'choice: none yet',
        );
      }
      return 0;
    }
    if (command === 'check') {
      const problems = checkDirections(root, values.site, data);
      if (values.json)
        io.log(JSON.stringify({ ok: !problems.length, problems }, null, 2));
      else if (problems.length)
        for (const p of problems) io.error(`directions: ${p}`);
      else io.log(`directions: ${data.directions.length} directions ok`);
      return problems.length ? 1 : 0;
    }
    const saved = chooseDirection(root, values.site, {
      direction: values.direction,
      notes: values.notes ?? '',
    });
    io.log(
      `directions: recorded direction ${saved.choice.direction} for ${values.site}`,
    );
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      io.error(`directions: ${error.message}`);
      io.error('Try: node scripts/directions.mjs --help');
      return 2;
    }
    if (error instanceof Refused) {
      io.error(`directions: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = main(process.argv.slice(2));
