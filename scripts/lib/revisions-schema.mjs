// The record of the revision rounds of a landing: sites/<slug>/revisions.json
// (design: openspec/changes/add-landing-revise/design.md, Decision 4). Used by scripts/revisions.mjs,
// scripts/revise-landing.sh, the MCP tools and the revise-landing skill. Pure functions, no I/O.

export const RESULTS = ['passed', 'failed', 'needs-rebuild', 'needs-restyle'];
export const ITEM_KINDS = [
  'fact',
  'copy',
  'content',
  'style',
  'restyle',
  'rebuild',
];
export const MAX_FEEDBACK = 4000;
export const MAX_SUMMARY = 300;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ROUND_KEYS = [
  'n',
  'date',
  'feedback',
  'items',
  'briefChanged',
  'files',
  'result',
  'usage',
  'restyle',
];
const LOOK_KEYS = ['primary', 'displayFont', 'bodyFont'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const USAGE_KEYS = [
  'costUsd',
  'inputTokens',
  'outputTokens',
  'cacheCreationTokens',
  'cacheReadTokens',
  'durationMs',
  'numTurns',
];
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** A fresh record with no rounds. */
export const emptyRevisions = () => ({ version: 1, rounds: [] });

/** The `usage` of a round from a `.run-usage.json` record (`null` when the run reported nothing). */
export function usageForRound(runUsage) {
  if (!isPlain(runUsage) || runUsage.reported !== true) return null;
  const pick = (value) => (typeof value === 'number' ? value : null);
  return {
    costUsd: pick(runUsage.totalCostUsd),
    inputTokens: pick(runUsage.inputTokens),
    outputTokens: pick(runUsage.outputTokens),
    cacheCreationTokens: pick(runUsage.cacheCreationTokens),
    cacheReadTokens: pick(runUsage.cacheReadTokens),
    durationMs: pick(runUsage.durationMs),
    numTurns: pick(runUsage.numTurns),
  };
}

/** The number the next round gets (rounds are numbered 1, 2, 3 ... in order). */
export const nextRound = (data) =>
  (Array.isArray(data?.rounds) ? data.rounds.length : 0) + 1;

/** Problems of one side (`from` or `to`) of a round's `restyle`. */
function lookProblems(look, at) {
  if (!isPlain(look)) return [`${at}: must be an object`];
  const errors = [];
  for (const key of Object.keys(look))
    if (!LOOK_KEYS.includes(key)) errors.push(`${at}.${key}: unknown key`);
  if (typeof look.primary !== 'string' || !HEX.test(look.primary))
    errors.push(`${at}.primary: must be #rrggbb`);
  if (typeof look.displayFont !== 'string' || !look.displayFont.trim())
    errors.push(`${at}.displayFont: must be a non-empty string`);
  if (
    look.bodyFont !== null &&
    (typeof look.bodyFont !== 'string' || !look.bodyFont.trim())
  )
    errors.push(`${at}.bodyFont: must be a non-empty string or null`);
  return errors;
}

/** Structural problems of a parsed revisions.json, each naming the field path. */
export function validateRevisions(data) {
  const errors = [];
  if (!isPlain(data)) return ['revisions.json must be an object'];
  for (const key of Object.keys(data))
    if (!['version', 'rounds'].includes(key))
      errors.push(`${key}: unknown key`);
  if (data.version !== 1) errors.push('version: must be 1');
  if (!Array.isArray(data.rounds)) {
    errors.push('rounds: must be an array');
    return errors;
  }
  data.rounds.forEach((round, i) => {
    const at = `rounds[${i}]`;
    if (!isPlain(round)) return errors.push(`${at}: must be an object`);
    for (const key of Object.keys(round))
      if (!ROUND_KEYS.includes(key)) errors.push(`${at}.${key}: unknown key`);
    if (round.n !== i + 1) errors.push(`${at}.n: must be ${i + 1}`);
    if (typeof round.date !== 'string' || !DATE.test(round.date))
      errors.push(`${at}.date: must be YYYY-MM-DD`);
    if (typeof round.feedback !== 'string' || !round.feedback.trim())
      errors.push(`${at}.feedback: required`);
    else if (round.feedback.length > MAX_FEEDBACK)
      errors.push(`${at}.feedback: at most ${MAX_FEEDBACK} characters`);
    if (!Array.isArray(round.items))
      errors.push(`${at}.items: must be an array`);
    else
      round.items.forEach((item, j) => {
        const where = `${at}.items[${j}]`;
        if (!isPlain(item)) return errors.push(`${where}: must be an object`);
        for (const key of Object.keys(item))
          if (!['kind', 'summary'].includes(key))
            errors.push(`${where}.${key}: unknown key`);
        if (!ITEM_KINDS.includes(item.kind))
          errors.push(`${where}.kind: must be one of ${ITEM_KINDS.join(', ')}`);
        if (
          typeof item.summary !== 'string' ||
          !item.summary.trim() ||
          item.summary.length > MAX_SUMMARY
        )
          errors.push(
            `${where}.summary: required, at most ${MAX_SUMMARY} characters`,
          );
      });
    if (typeof round.briefChanged !== 'boolean')
      errors.push(`${at}.briefChanged: must be true or false`);
    if (
      !Array.isArray(round.files) ||
      round.files.some((f) => typeof f !== 'string' || !f.trim())
    )
      errors.push(`${at}.files: must be an array of paths`);
    if (!RESULTS.includes(round.result))
      errors.push(`${at}.result: must be one of ${RESULTS.join(', ')}`);
    if (round.restyle !== undefined) {
      if (!isPlain(round.restyle))
        errors.push(`${at}.restyle: must be an object`);
      else {
        for (const key of Object.keys(round.restyle))
          if (!['from', 'to'].includes(key))
            errors.push(`${at}.restyle.${key}: unknown key`);
        for (const side of ['from', 'to'])
          errors.push(
            ...lookProblems(round.restyle[side], `${at}.restyle.${side}`),
          );
      }
    }
    if (round.usage !== undefined && round.usage !== null) {
      if (!isPlain(round.usage))
        errors.push(`${at}.usage: must be an object or null`);
      else
        for (const [key, value] of Object.entries(round.usage)) {
          if (!USAGE_KEYS.includes(key))
            errors.push(`${at}.usage.${key}: unknown key`);
          else if (value !== null && typeof value !== 'number')
            errors.push(`${at}.usage.${key}: must be a number or null`);
        }
    }
  });
  return errors;
}
