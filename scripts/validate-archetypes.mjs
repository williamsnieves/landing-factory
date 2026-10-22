#!/usr/bin/env node
// Validates the archetype catalog (design-archetypes/*.md): front matter fields, closed vocabularies,
// target ranges of the layout-signature features, required body sections, and that every lent trait
// is defined in its own sheet and owned by exactly one sheet.
// Usage: node scripts/validate-archetypes.mjs [--help] [file...]   (default: design-archetypes/*.md)
import { existsSync, readFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SIGNALS,
  TRAITS,
  parseFrontmatter,
  sheetFiles,
  validateArchetype,
} from './lib/archetypes.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const HELP = `Usage: node scripts/validate-archetypes.mjs [file...]

Validates design-archetypes/*.md (or the given files): required front matter (name, summary, signals.fits,
signals.avoid, lends, rejects, hero, signature), names from the closed vocabularies (${SIGNALS.length} signals,
${TRAITS.length} traits), signature features and ranges, the required body sections and that each lent trait
is defined in "## Lendable traits". Across the catalog, a trait is lent by one sheet only.
Exit codes: 0 valid, 1 violations, 2 bad usage.`;

/** Violations of a set of sheets: [{ file, line, field, message }]. `files` are absolute paths. */
export function validateFiles(files) {
  const out = [];
  const owners = new Map();
  for (const file of files) {
    const name = basename(file, '.md');
    const text = readFileSync(file, 'utf8');
    for (const v of validateArchetype(text, name)) out.push({ file, ...v });
    const lends = parseFrontmatter(text).data?.lends;
    if (Array.isArray(lends))
      for (const t of lends) {
        if (owners.has(t))
          out.push({
            file,
            line: 1,
            field: 'lends',
            message: `trait "${t}" is already lent by ${owners.get(t)}; a trait has one owner`,
          });
        else owners.set(t, name);
      }
  }
  return out;
}

export function main(argv, io = console, root = ROOT) {
  if (argv.includes('--help') || argv.includes('-h')) {
    io.log(HELP);
    return 0;
  }
  const given = argv.filter((a) => !a.startsWith('-'));
  if (argv.some((a) => a.startsWith('-') && a !== '--')) {
    io.error(`validate-archetypes: unknown option\n\n${HELP}`);
    return 2;
  }
  const files = given.length ? given.map((f) => resolve(f)) : sheetFiles(root);
  if (!files.length) {
    io.error(
      'validate-archetypes: no archetype sheets found in design-archetypes/',
    );
    return 1;
  }
  for (const f of files)
    if (!existsSync(f)) {
      io.error(`validate-archetypes: ${f} does not exist`);
      return 2;
    }
  const violations = validateFiles(files);
  for (const v of violations)
    io.error(`${relative(root, v.file)}:${v.line} [${v.field}] ${v.message}`);
  if (violations.length) {
    io.error(
      `validate-archetypes: ${violations.length} violation(s) in ${files.length} sheet(s)`,
    );
    return 1;
  }
  io.log(`validate-archetypes: ${files.length} sheet(s) valid`);
  return 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = main(process.argv.slice(2));
