#!/usr/bin/env node
// Ranks archetype blends for a site from its requirement signals and its reference pattern sheets.
//
//   node scripts/pick-archetypes.mjs --site <slug> [--refs a,b] [--top N] [--json]
//
// Signals: `sites/<slug>/brief.json` (`signals` array) when present, else a `Signals: a, b, c` line in the
// Brief of `sites/<slug>/PROPOSAL.md`; words come from the closed vocabulary of design-archetypes/README.md.
// References: `--refs a,b` (slugs of patterns/<slug>.md), else the slugs found in the Inputs table of RUN.md
// (References row) and in the References table of PROPOSAL.md. Each sheet is mapped onto the same signal
// and trait vocabulary by keyword rules (REF_RULES below); what it yields adds to the score and offers
// traits to borrow as `ref:<sheet>/<trait>`.
//
// Scoring (deterministic; archetypes are a base, not a template):
//   archetype score  = sum over brief signals of +1 (fits) or -1 (avoid), asset signals x1.5,
//                      plus 0.5 per reference-derived signal fit (-0.5 per avoid),
//                      plus 0.75 per reference trait the archetype owns, plus 0.5 when a reference hero type is allowed.
//   blend primary+secondary = primary score + 0.5 x secondary score + 0.25 x compatible lent traits (max 2)
//                      + 0.5 per reference trait the secondary lends. The secondary must lend at least one trait
//                      the primary does not reject. A blend without a secondary is just the primary's score.
//   custom (reference-led) = 1.25 x reference evidence (distinct signals and traits from the sheets), offered
//                      only with at least CUSTOM_MIN pieces of evidence and one trait. The references are then the
//                      base and the best archetypes (by the brief) only fill gaps.
// Excluded: a primary + secondary pair (or a lone primary) recorded as `archetype:` in another site's
// landing-meta, and a primary already used as primary by 2 or more other sites. `custom` is never excluded
// (the layout measure of check-landing still has to pass).
// Ties: score, then primary name, then secondary name (a lone primary last).
//
// Exit codes: 0 ok, 2 bad usage or no usable signals.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  ASSET_SIGNALS,
  CUSTOM,
  SIGNALS,
  loadCatalog,
  readArchetypeMeta,
} from './lib/archetypes.mjs';
import { SLUG_PATTERN, listSites } from './lib/sites.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ASSET_WEIGHT = 1.5;
export const REF_SIGNAL_WEIGHT = 0.5;
export const REF_TRAIT_OWNER_BONUS = 0.75;
export const REF_HERO_BONUS = 0.5;
export const CUSTOM_MIN = 4;
export const CUSTOM_WEIGHT = 1.25;
export const MAX_PRIMARY_USES = 2;

class UsageError extends Error {}

// --------------------------------------------------------------------------------------------------
// Reading the requirement

const SIGNALS_LINE =
  /^[ \t]*(?:[-*][ \t]+)?\*{0,2}Signals\*{0,2}[ \t]*:\*{0,2}[ \t]*(.+)$/im;

/** Signals of a `Signals: a, b` line in PROPOSAL.md text, or null when there is no such line. */
export function parseSignalsLine(markdown) {
  const match = SIGNALS_LINE.exec(markdown);
  if (!match) return null;
  return match[1]
    .replace(/\*+/g, '')
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function readSignals(root, slug) {
  const siteDir = join(root, 'sites', slug);
  const briefPath = join(siteDir, 'brief.json');
  let signals = null;
  let source = '';
  if (existsSync(briefPath)) {
    let brief;
    try {
      brief = JSON.parse(readFileSync(briefPath, 'utf8'));
    } catch (error) {
      throw new UsageError(`${briefPath}: ${error.message}`);
    }
    if (Array.isArray(brief.signals)) {
      signals = brief.signals.map((s) => String(s).trim().toLowerCase());
      source = 'brief.json';
    }
  }
  if (!signals) {
    const proposal = join(siteDir, 'PROPOSAL.md');
    if (!existsSync(proposal))
      throw new UsageError(
        `no signals: sites/${slug}/brief.json has no "signals" array and sites/${slug}/PROPOSAL.md does not exist`,
      );
    signals = parseSignalsLine(readFileSync(proposal, 'utf8'));
    source = 'PROPOSAL.md';
    if (!signals)
      throw new UsageError(
        `no signals: add a "Signals: a, b, c" line to the Brief of sites/${slug}/PROPOSAL.md (vocabulary: ${SIGNALS.join(', ')})`,
      );
  }
  const unknown = signals.filter((s) => !SIGNALS.includes(s));
  if (unknown.length)
    throw new UsageError(
      `unknown signal(s) in ${source}: ${unknown.join(', ')} (vocabulary: ${SIGNALS.join(', ')})`,
    );
  if (!signals.length) throw new UsageError(`${source} lists no signals`);
  return { signals: [...new Set(signals)], source };
}

// --------------------------------------------------------------------------------------------------
// Reading the references

/** Keyword rules that map a pattern sheet's words onto the signal and trait vocabulary. */
export const REF_RULES = [
  { re: /playful|whimsic|quirky|hand-drawn|doodle/, signals: ['playful'] },
  { re: /premium|luxur|refined|elegant|high-end/, signals: ['premium'] },
  { re: /sober|austere|restrained|serious/, signals: ['serious'] },
  {
    re: /terminal|technical|monospace|developer|engineering/,
    signals: ['technical'],
  },
  { re: /heritage|traditional|historic/, signals: ['heritage'] },
  { re: /handmade|artisan|workshop|bakery|craft/, signals: ['craft'] },
  {
    re: /chapter|narrative|journey|one idea per screen|one statement per screen/,
    signals: ['storytelling'],
  },
  {
    re: /webgl|shader|\b3d\b|experimental|unconventional/,
    signals: ['experimental'],
  },
  {
    re: /calm|quiet|generous empty space|extremely low|white ?space/,
    signals: ['calm'],
  },
  { re: /\bbold\b|oversized|huge|giant|loud/, signals: ['bold'] },
  { re: /chart|statistic|metric|counter row|figures/, signals: ['data-heavy'] },
  {
    re: /product (grid|tile|card)|catalog|shop/,
    signals: ['product-showcase'],
  },
  { re: /editorial|long-form|magazine/, signals: ['editorial-content'] },
  {
    re: /full-bleed photo|photograph|photo-led|image-led/,
    signals: ['photo-rich'],
  },
  { re: /text-only|no photos?|typographic only/, signals: ['few-assets'] },
  {
    re: /(fixed|full-viewport) (webgl )?canvas|3d scene|scene behind/,
    traits: ['scene-backdrop'],
  },
  {
    re: /chapter card|chaptered|one statement per screen/,
    traits: ['chaptered-overlay'],
  },
  {
    re: /horizontal (scroll|track|pin)|sideways/,
    traits: ['horizontal-chapter'],
  },
  {
    re: /marquee|ticker|outlined (giant )?word|oversized (word|type)|giant type/,
    traits: ['marquee-type'],
  },
  {
    re: /giant numeral|large numeral|oversized number/,
    traits: ['giant-numerals'],
  },
  { re: /bento|tile grid|mosaic/, traits: ['bento-grid'] },
  { re: /overlap|collage|layered photos/, traits: ['overlap-collage'] },
  { re: /handwrit|script accent|scribble/, traits: ['handwritten-accent'] },
  { re: /monospace|mono label/, traits: ['mono-labels'] },
  {
    re: /hairline|visible grid|grid lines|thin rules?/,
    traits: ['visible-grid'],
  },
  {
    re: /sticky (column|label|heading)|pinned (column|label)|split-sticky/,
    traits: ['split-sticky'],
  },
  { re: /drop cap/, traits: ['drop-cap'] },
  { re: /pull[ -]quote/, traits: ['pull-quote'] },
  { re: /stat(s|istic)? (strip|band|row)|counter row/, traits: ['stat-strip'] },
  { re: /comparison table|compare table/, traits: ['comparison-table'] },
  { re: /opening hours|hours card/, traits: ['hours-card'] },
  { re: /practical (info|strip)|map and hours/, traits: ['practical-strip'] },
  { re: /numbered (chapter|index)|chapter index/, traits: ['chapter-index'] },
  { re: /spec chips?|spec tags?|feature chips/, traits: ['spec-chips'] },
  { re: /flush-left|single left axis/, traits: ['flush-left-axis'] },
];

const HERO_WORDS = [
  ['full-bleed-photo', /full-bleed|photo/],
  ['split', /split/],
  ['typographic', /typograph/],
  ['video', /video/],
  ['illustration', /illustrat/],
  ['collage', /collage/],
];

/** Text of a sheet without its "What to take / what to avoid" section (advice, not description). */
function sheetBody(text) {
  return text
    .replace(/^---[\s\S]*?^---/m, '')
    .split(/^##[ \t]+/m)
    .filter((part) => !/^what to take/i.test(part))
    .join('\n')
    .toLowerCase();
}

/** { slug, signals[], traits[], heroes[] } read from patterns/<slug>.md, or null when it does not exist. */
export function readRefSheet(root, slug) {
  const file = join(root, 'patterns', `${slug}.md`);
  if (!existsSync(file)) return null;
  const body = sheetBody(readFileSync(file, 'utf8'));
  const signals = new Set();
  const traits = new Set();
  for (const rule of REF_RULES)
    if (rule.re.test(body)) {
      for (const s of rule.signals ?? []) signals.add(s);
      for (const t of rule.traits ?? []) traits.add(t);
    }
  const heroLine = /hero type:?\**\s*([^\n.;(]+)/.exec(body);
  const heroes = heroLine
    ? HERO_WORDS.filter(([, re]) => re.test(heroLine[1])).map(([name]) => name)
    : [];
  return {
    slug,
    signals: [...signals].sort(),
    traits: [...traits].sort(),
    heroes,
  };
}

/** Reference slugs from RUN.md (Inputs, References row) and PROPOSAL.md (patterns/<slug>.md) of a site. */
export function discoverRefs(root, slug) {
  const found = [];
  const siteDir = join(root, 'sites', slug);
  const run = join(siteDir, 'RUN.md');
  if (existsSync(run)) {
    const row = /^\|\s*References\s*\|\s*(.*?)\s*\|?\s*$/m.exec(
      readFileSync(run, 'utf8'),
    );
    if (row)
      for (const token of row[1].split(/[\s,;()]+/))
        if (
          SLUG_PATTERN.test(token) &&
          existsSync(join(root, 'patterns', `${token}.md`))
        )
          found.push(token);
  }
  const proposal = join(siteDir, 'PROPOSAL.md');
  if (existsSync(proposal))
    for (const m of readFileSync(proposal, 'utf8').matchAll(
      /patterns\/([a-z0-9-]+)\.md/g,
    ))
      if (existsSync(join(root, 'patterns', `${m[1]}.md`))) found.push(m[1]);
  return [...new Set(found)];
}

// --------------------------------------------------------------------------------------------------
// Used blends

/** { pairs: Set('p+s' or 'p'), primaryUses: Map } from the landing-meta of every other site. */
export function usedBlends(root, slug) {
  const pairs = new Set();
  const primaryUses = new Map();
  for (const other of listSites(join(root, 'sites'))) {
    if (other === slug) continue;
    const master = join(root, 'design-system', other, 'MASTER.md');
    if (!existsSync(master)) continue;
    const meta = readArchetypeMeta(readFileSync(master, 'utf8'));
    if (!meta?.primary || meta.primary === CUSTOM) continue;
    pairs.add(
      meta.secondary ? `${meta.primary}+${meta.secondary}` : meta.primary,
    );
    primaryUses.set(meta.primary, (primaryUses.get(meta.primary) ?? 0) + 1);
  }
  return { pairs, primaryUses };
}

// --------------------------------------------------------------------------------------------------
// Scoring

const weightOf = (signal) =>
  ASSET_SIGNALS.includes(signal) ? ASSET_WEIGHT : 1;
const round = (n) => Math.round(n * 1000) / 1000;

function scoreArchetype(a, signals, refSignals, refHeroes) {
  let score = 0;
  const fits = [];
  const avoids = [];
  for (const s of signals) {
    if (a.fits.includes(s)) {
      score += weightOf(s);
      fits.push(s);
    } else if (a.avoid.includes(s)) {
      score -= weightOf(s);
      avoids.push(s);
    }
  }
  const refFits = [];
  const refAvoids = [];
  for (const s of refSignals) {
    if (signals.includes(s)) continue; // already counted from the brief
    if (a.fits.includes(s)) {
      score += REF_SIGNAL_WEIGHT;
      refFits.push(s);
    } else if (a.avoid.includes(s)) {
      score -= REF_SIGNAL_WEIGHT;
      refAvoids.push(s);
    }
  }
  const heroes = refHeroes.filter((h) => a.hero.includes(h));
  if (heroes.length) score += REF_HERO_BONUS;
  return { score, fits, avoids, refFits, refAvoids, heroes };
}

/**
 * Ranked blends for a site. Returns { site, signals, signalsSource, refs, blends, excluded, custom }.
 * `blends` holds every candidate (best first); the CLI shows the top ones.
 */
export function pickBlends({ root = ROOT, slug, refs } = {}) {
  if (!SLUG_PATTERN.test(slug ?? ''))
    throw new UsageError(`invalid site slug "${slug}"`);
  const catalog = loadCatalog(root);
  if (!catalog.length)
    throw new UsageError('design-archetypes/ has no valid archetype sheets');
  const { signals, source } = readSignals(root, slug);
  const refSlugs = refs ?? discoverRefs(root, slug);
  const sheets = [];
  for (const r of refSlugs) {
    const sheet = readRefSheet(root, r);
    if (!sheet)
      throw new UsageError(`reference sheet patterns/${r}.md does not exist`);
    sheets.push(sheet);
  }
  const refSignals = [...new Set(sheets.flatMap((s) => s.signals))].sort();
  const refHeroes = [...new Set(sheets.flatMap((s) => s.heroes))];
  // trait -> first sheet that yields it
  const refTraitSource = new Map();
  for (const s of sheets)
    for (const t of s.traits)
      if (!refTraitSource.has(t)) refTraitSource.set(t, s.slug);

  const own = new Map(
    catalog.map((a) => [
      a.name,
      scoreArchetype(a, signals, refSignals, refHeroes),
    ]),
  );
  const used = usedBlends(root, slug);
  const excluded = [];
  const blends = [];

  for (const p of catalog) {
    const ps = own.get(p.name);
    const primaryBlocked =
      (used.primaryUses.get(p.name) ?? 0) >= MAX_PRIMARY_USES;
    const refOwned = p.lends.filter((t) => refTraitSource.has(t));
    const primaryRefBonus = refOwned.length * REF_TRAIT_OWNER_BONUS;
    const reasonsOf = (arch, s) => {
      const r = [];
      if (s.fits.length) r.push(`${arch.name} fits ${s.fits.join(', ')}`);
      if (s.avoids.length)
        r.push(`${arch.name} avoids ${s.avoids.join(', ')} (penalty)`);
      if (s.refFits.length)
        r.push(
          `references point to ${s.refFits.join(', ')} which ${arch.name} fits`,
        );
      if (s.heroes.length)
        r.push(
          `a reference hero (${s.heroes.join(', ')}) is allowed by ${arch.name}`,
        );
      return r;
    };
    const options = [{ secondary: null }];
    for (const s of catalog) {
      if (s.name === p.name) continue;
      const compatible = s.lends.filter((t) => !p.rejects.includes(t));
      if (compatible.length) options.push({ secondary: s, compatible });
    }
    for (const opt of options) {
      const key = opt.secondary ? `${p.name}+${opt.secondary.name}` : p.name;
      if (primaryBlocked) {
        excluded.push({
          blend: key,
          why: `${p.name} is already the primary of ${used.primaryUses.get(p.name)} other sites`,
        });
        continue;
      }
      if (used.pairs.has(key)) {
        excluded.push({ blend: key, why: 'already used by another site' });
        continue;
      }
      let score = ps.score + primaryRefBonus;
      const reasons = reasonsOf(p, ps);
      if (refOwned.length)
        reasons.push(
          `${p.name} owns reference-led traits ${refOwned.join(', ')}`,
        );
      let traits = [];
      let available = [];
      if (opt.secondary) {
        const ss = own.get(opt.secondary.name);
        const secondaryRefLent = opt.compatible.filter((t) =>
          refTraitSource.has(t),
        );
        traits = [
          ...secondaryRefLent,
          ...opt.compatible.filter((t) => !secondaryRefLent.includes(t)),
        ].slice(0, 2);
        available = opt.compatible;
        score +=
          0.5 * ss.score +
          0.25 * Math.min(2, opt.compatible.length) +
          0.5 * secondaryRefLent.length;
        reasons.push(
          ...reasonsOf(opt.secondary, ss).map((r) => `secondary: ${r}`),
        );
        reasons.push(
          `secondary ${opt.secondary.name} lends ${traits.join(', ')}`,
        );
      }
      const refTraits = [...refTraitSource.entries()]
        .filter(([t]) => !p.lends.includes(t) && !traits.includes(t))
        .map(([t, sheet]) => `ref:${sheet}/${t}`);
      blends.push({
        primary: p.name,
        secondary: opt.secondary?.name ?? null,
        score: round(score),
        traits,
        available,
        refTraits,
        reasons,
      });
    }
  }

  // Reference-led outcome
  const evidenceList = [
    ...refSignals.map((s) => `signal ${s}`),
    ...[...refTraitSource.keys()].map((t) => `trait ${t}`),
  ];
  let custom = { eligible: false, evidence: evidenceList.length };
  if (evidenceList.length >= CUSTOM_MIN && refTraitSource.size >= 1) {
    const fills = [...catalog]
      .sort(
        (a, b) =>
          own.get(b.name).score - own.get(a.name).score ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 2)
      .map((a) => a.name);
    custom = { eligible: true, evidence: evidenceList.length, fills };
    blends.push({
      primary: CUSTOM,
      secondary: null,
      score: round(CUSTOM_WEIGHT * evidenceList.length),
      traits: [],
      available: [],
      refTraits: [...refTraitSource.entries()].map(
        ([t, sheet]) => `ref:${sheet}/${t}`,
      ),
      reasons: [
        `reference-led: ${sheets.map((s) => s.slug).join(', ')} give ${evidenceList.length} signals and traits (${evidenceList.join(', ')})`,
        `archetypes only fill gaps: ${fills.join(', ')} (best by the brief)`,
      ],
      fills,
    });
  }

  blends.sort(
    (a, b) =>
      b.score - a.score ||
      a.primary.localeCompare(b.primary) ||
      (a.secondary ?? '~').localeCompare(b.secondary ?? '~'),
  );
  return {
    site: slug,
    signals,
    signalsSource: source,
    refs: sheets,
    blends,
    excluded: excluded.sort((a, b) => a.blend.localeCompare(b.blend)),
    custom,
  };
}

// --------------------------------------------------------------------------------------------------
// CLI

export function formatResult(result, top) {
  const lines = [
    `pick-archetypes ${result.site}`,
    `  signals (${result.signalsSource}): ${result.signals.join(', ')}`,
  ];
  if (result.refs.length)
    for (const r of result.refs)
      lines.push(
        `  reference ${r.slug}: signals ${r.signals.join(', ') || '-'}; traits ${r.traits.join(', ') || '-'}; hero ${r.heroes.join(', ') || '-'}`,
      );
  else lines.push('  references: none');
  lines.push(
    '',
    `Top ${Math.min(top, result.blends.length)} blends (best first):`,
  );
  result.blends.slice(0, top).forEach((b, i) => {
    const name = b.secondary ? `${b.primary} + ${b.secondary}` : b.primary;
    lines.push(`${i + 1}. ${name}  (score ${b.score})`);
    if (b.traits.length)
      lines.push(`   traits to borrow: ${b.traits.join(', ')}`);
    if (b.available.length > b.traits.length)
      lines.push(
        `   other lendable traits: ${b.available.filter((t) => !b.traits.includes(t)).join(', ')}`,
      );
    if (b.refTraits.length)
      lines.push(`   traits from references: ${b.refTraits.join(', ')}`);
    for (const reason of b.reasons) lines.push(`   - ${reason}`);
  });
  if (result.custom.eligible)
    lines.push(
      '',
      `Reference-led option: the references give ${result.custom.evidence} signals and traits; \`archetype: custom\` is allowed (say which reference drives which part).`,
    );
  if (result.excluded.length)
    lines.push(
      '',
      `Excluded (${result.excluded.length}): ${result.excluded
        .slice(0, 6)
        .map((e) => `${e.blend} (${e.why})`)
        .join('; ')}${result.excluded.length > 6 ? '; ...' : ''}`,
    );
  return lines.join('\n');
}

const HELP = `Usage: node scripts/pick-archetypes.mjs --site <slug> [--refs a,b] [--top N] [--json]

Ranks archetype blends (design-archetypes/) for sites/<slug>/ from its signals and reference sheets.
  --site <slug>   the site; signals come from brief.json ("signals") or the "Signals:" line of PROPOSAL.md
  --refs a,b      pattern sheets (patterns/<slug>.md) that steer the blend; default: the ones named in
                  RUN.md (Inputs, References) and PROPOSAL.md
  --top N         blends to print (default 5)
  --json          print everything as JSON
  --root <dir>    use another factory root (tests)
Exit codes: 0 ok, 2 bad usage or no usable signals.`;

export async function main(argv, io = console) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        refs: { type: 'string' },
        top: { type: 'string' },
        json: { type: 'boolean' },
        root: { type: 'string' },
        help: { type: 'boolean' },
      },
    }));
  } catch (error) {
    io.error(`pick-archetypes: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  if (!values.site) {
    io.error(`pick-archetypes: --site <slug> is required\n\n${HELP}`);
    return 2;
  }
  const top = values.top === undefined ? 5 : Number(values.top);
  if (!Number.isInteger(top) || top < 1) {
    io.error('pick-archetypes: --top must be a positive integer');
    return 2;
  }
  const refs =
    values.refs === undefined
      ? undefined
      : values.refs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
  try {
    const result = pickBlends({
      root: values.root ? resolve(values.root) : ROOT,
      slug: values.site,
      refs,
    });
    io.log(
      values.json
        ? JSON.stringify(
            { ...result, blends: result.blends.slice(0, top) },
            null,
            2,
          )
        : formatResult(result, top),
    );
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      io.error(`pick-archetypes: ${error.message}`);
      return 2;
    }
    throw error;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = await main(process.argv.slice(2));
}
