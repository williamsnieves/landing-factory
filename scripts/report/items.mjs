// The report's item model: statuses, constructors, counts and the verdict.

export const STATUSES = ['pass', 'warn', 'fail', 'na', 'not-run'];
export const AREAS = ['security', 'performance', 'legal'];

/** Shortened to this many evidence lines in Markdown; report.json keeps them all. */
export const MAX_EVIDENCE = 200;

/**
 * One finding of the report.
 * @param {object} o
 * @param {string} o.id        stable id, for example `headers-baseline`
 * @param {'security'|'performance'|'legal'} o.area
 * @param {string|null} o.owasp  `A01`..`A10` for security items, else null
 * @param {'pass'|'warn'|'fail'|'na'|'not-run'} o.status
 * @param {string} o.title     one line: what was checked and the outcome
 * @param {string[]} [o.evidence]  files, lines, URLs, measured values (never a raw secret)
 * @param {string} [o.fix]     how to fix it (empty for a pass)
 */
export function makeItem({
  id,
  area,
  owasp = null,
  status,
  title,
  evidence = [],
  fix = '',
}) {
  if (!STATUSES.includes(status))
    throw new Error(`item ${id}: unknown status "${status}"`);
  if (!AREAS.includes(area))
    throw new Error(`item ${id}: unknown area "${area}"`);
  if (area === 'security' && owasp !== null && !/^A(0[1-9]|10)$/.test(owasp))
    throw new Error(`item ${id}: unknown OWASP category "${owasp}"`);
  return {
    id,
    area,
    owasp,
    status,
    title,
    evidence: evidence.slice(0, MAX_EVIDENCE),
    ...(evidence.length > MAX_EVIDENCE
      ? { evidenceTruncated: evidence.length - MAX_EVIDENCE }
      : {}),
    fix: status === 'pass' || status === 'na' ? '' : fix,
  };
}

export const countStatuses = (items) => {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const item of items) counts[item.status] += 1;
  return counts;
};

/** failed when any item failed; warn, na and not-run never fail the run. */
export const verdictOf = (items) =>
  items.some((item) => item.status === 'fail') ? 'failed' : 'passed';

/** `passed - 0 fail, 3 warn, 2 n/a, 0 not run`, the line CI puts in the PR comment. */
export function summaryLine(verdict, counts) {
  return `${verdict}: ${counts.fail} fail, ${counts.warn} warn, ${counts.na} n/a, ${counts['not-run']} not run`;
}

/** Worst status first: fail, warn, not-run, pass, na. */
const RANK = { fail: 4, warn: 3, 'not-run': 2, pass: 1, na: 0 };
export const worstStatus = (statuses) =>
  statuses.reduce((worst, s) => (RANK[s] > RANK[worst] ? s : worst), 'na');

/** Shorthand used by the check modules: a list of evidence lines capped for readability. */
export const cap = (lines, max = 25) =>
  lines.length > max
    ? [...lines.slice(0, max), `... and ${lines.length - max} more`]
    : lines;
