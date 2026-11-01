#!/usr/bin/env node
// Ranks copywriting frameworks for a site from its brief (design: openspec/changes/add-copy-frameworks/design.md).
//
//   node scripts/pick-copy-framework.mjs --site <slug> [--top N] [--json]
//   node scripts/pick-copy-framework.mjs --list [--json]
//
// Signals come from `sites/<slug>/brief.json`: audience.awareness (else `problem-aware`, reported as assumed),
// business.kind, offer prices, the primary action, `proof`, legal.regulated and audience.objections. Without a
// brief the defaults are used and the output says so. Deterministic: ties break by score, then id. Read-only.
// LANDING_FACTORY_ROOT=<dir> reads sites/ in <dir> instead of this repo (tests).
//
// Exit codes: 0 ok, 2 bad usage, missing site or invalid brief.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { formatErrors, validateBrief } from './lib/brief-schema.mjs';
import {
  FRAMEWORKS,
  HEADLINE_TEST,
  deriveSignals,
  rankFrameworks,
} from './lib/copy-frameworks.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

class UsageError extends Error {}

/** Pick for a site: signals (with where they came from) and the full ranking. */
export function pickFramework({ root = ROOT, slug } = {}) {
  if (!SLUG_PATTERN.test(slug ?? ''))
    throw new UsageError(`invalid site slug "${slug}"`);
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(siteDir))
    throw new UsageError(`sites/${slug}/ does not exist`);
  const briefPath = join(siteDir, 'brief.json');
  let brief = null;
  if (existsSync(briefPath)) {
    try {
      brief = JSON.parse(readFileSync(briefPath, 'utf8'));
    } catch (error) {
      throw new UsageError(`${briefPath}: ${error.message}`);
    }
    const errors = validateBrief(brief, {
      baseDir: siteDir,
      patternsDir: join(root, 'patterns'),
    });
    if (errors.length)
      throw new UsageError(
        `sites/${slug}/brief.json is not valid:\n${formatErrors(errors)}`,
      );
  }
  const signals = deriveSignals(brief);
  return {
    site: slug,
    brief: brief ? 'brief.json' : null,
    signals,
    candidates: rankFrameworks(signals),
  };
}

export function formatList() {
  const lines = ['Copy frameworks:'];
  for (const f of FRAMEWORKS) {
    lines.push('', `${f.id}  ${f.name}: ${f.summary}`);
    f.stages.forEach((s, i) =>
      lines.push(
        `  ${i + 1}. ${s.name} -> ${s.sections.join(', ')}: ${s.says}`,
      ),
    );
    const ladder = Object.entries(f.awareness)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([level, v]) => `${level} ${v}`);
    lines.push(`  awareness: ${ladder.join(', ') || '-'}`);
    lines.push(`  fits: ${f.fits.join(', ') || '-'}`);
    lines.push(`  avoid: ${f.avoid.join(', ') || '-'}`);
    if (f.promiseLed)
      lines.push('  promise-led: ranks lower in a regulated niche');
  }
  lines.push(
    '',
    `Headline test ${HEADLINE_TEST.name}: ${HEADLINE_TEST.criteria.map(([id, q]) => `${id} (${q})`).join('; ')}`,
  );
  return lines.join('\n');
}

export function formatResult(result, top) {
  const s = result.signals;
  const lines = [
    `pick-copy-framework ${result.site}`,
    result.brief
      ? `  signals (brief.json): awareness ${s.awareness}${s.awarenessAssumed ? ' (assumed)' : ''}, kind ${s.kind}, price ${s.price}, goal ${s.goal}, proof ${s.proof}, regulated ${s.regulated}, objections ${s.objections}`
      : `  no brief.json: default signals (awareness ${s.awareness} assumed, kind ${s.kind}, price ${s.price}, goal ${s.goal}, proof ${s.proof}, regulated ${s.regulated}, objections ${s.objections})`,
  ];
  if (s.awarenessAssumed)
    lines.push(
      `  note: audience.awareness is not stated, so ${s.awareness} was assumed; list it as assumed in the proposal or ask the customer`,
    );
  lines.push(
    '',
    `Top ${Math.min(top, result.candidates.length)} frameworks (best first):`,
  );
  result.candidates.slice(0, top).forEach((c, i) => {
    lines.push(`${i + 1}. ${c.name} [${c.id}]  (score ${c.score})`);
    for (const r of c.reasons) lines.push(`   - ${r}`);
    for (const n of c.notes) lines.push(`   ! ${n}`);
    lines.push('   stage -> section:');
    for (const st of c.stages)
      lines.push(`     ${st.name} -> ${st.sections.join(', ')}`);
  });
  return lines.join('\n');
}

const HELP = `Usage: node scripts/pick-copy-framework.mjs --site <slug> [--top N] [--json]
       node scripts/pick-copy-framework.mjs --list [--json]

Ranks copywriting frameworks for sites/<slug>/ from its brief.
  --site <slug>   the site; signals come from brief.json (without it, defaults are used and said so)
  --top N         candidates to print (default 3)
  --list          print the catalog (stages, sections, fit signals) and exit
  --json          print everything as JSON
Exit codes: 0 ok, 2 bad usage, missing site or invalid brief.`;

export function main(argv, io = console) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        top: { type: 'string' },
        json: { type: 'boolean' },
        list: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    }));
  } catch (error) {
    io.error(`pick-copy-framework: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  if (values.list) {
    io.log(
      values.json
        ? JSON.stringify(
            { frameworks: FRAMEWORKS, headlineTest: HEADLINE_TEST },
            null,
            2,
          )
        : formatList(),
    );
    return 0;
  }
  if (!values.site) {
    io.error(`pick-copy-framework: --site <slug> is required\n\n${HELP}`);
    return 2;
  }
  const top = values.top === undefined ? 3 : Number(values.top);
  if (!Number.isInteger(top) || top < 1) {
    io.error('pick-copy-framework: --top must be a positive integer');
    return 2;
  }
  try {
    const result = pickFramework({
      root: resolve(process.env.LANDING_FACTORY_ROOT || ROOT),
      slug: values.site,
    });
    io.log(
      values.json
        ? JSON.stringify(
            { ...result, candidates: result.candidates.slice(0, top) },
            null,
            2,
          )
        : formatResult(result, top),
    );
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      io.error(`pick-copy-framework: ${error.message}`);
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
