// Layout signature model shared by layout-signature.mjs (measures), check-landing.mjs (compares) and the
// archetype validator (target ranges). No browser or image code here: pure functions.
// Design: openspec/changes/add-design-archetypes/design.md (Decisions 6 and 7).

/**
 * The coarse features of a built page, measured at 1440 px. `kind`: count (integer), ratio (0..1),
 * px (CSS pixels) or cat (one of `values`). `scale` normalizes a numeric difference to 0..1
 * (|a - b| / scale, capped at 1); a categorical feature is 0 when equal and 1 otherwise.
 * `weight` is its share of the layout distance: what a visitor notices first weighs more.
 */
export const FEATURES = [
  { name: 'sectionCount', kind: 'count', scale: 20, weight: 1 },
  { name: 'cols1Share', kind: 'ratio', scale: 1, weight: 1 },
  { name: 'cols2Share', kind: 'ratio', scale: 1, weight: 1 },
  { name: 'cols3Share', kind: 'ratio', scale: 1, weight: 1 },
  { name: 'splitRatio', kind: 'ratio', scale: 1, weight: 1 },
  { name: 'fullBleedShare', kind: 'ratio', scale: 1, weight: 2 },
  { name: 'imageRadius', kind: 'px', scale: 40, weight: 2 },
  { name: 'buttonRadius', kind: 'px', scale: 40, weight: 2 },
  {
    name: 'buttonShape',
    kind: 'cat',
    values: ['pill', 'rect', 'text'],
    weight: 2,
  },
  { name: 'headingScale', kind: 'count', scale: 16, weight: 1.5 },
  {
    name: 'headingAlign',
    kind: 'cat',
    values: ['left', 'center', 'right'],
    weight: 1,
  },
  { name: 'headingCase', kind: 'ratio', scale: 1, weight: 1 },
  { name: 'eyebrowShare', kind: 'ratio', scale: 1, weight: 2 },
  { name: 'wordsPerScreen', kind: 'count', scale: 200, weight: 1 },
  {
    name: 'footerType',
    kind: 'cat',
    values: ['wordmark', 'columns', 'minimal'],
    weight: 1.5,
  },
  { name: 'mediaPerScreen', kind: 'count', scale: 4, weight: 1 },
  { name: 'rotatedShare', kind: 'ratio', scale: 1, weight: 1 },
  { name: 'overlapShare', kind: 'ratio', scale: 1, weight: 1 },
  { name: 'stickyCount', kind: 'count', scale: 4, weight: 0.5 },
];
export const FEATURE_NAMES = FEATURES.map((f) => f.name);
const BY_NAME = Object.fromEntries(FEATURES.map((f) => [f.name, f]));
export const TOTAL_WEIGHT = FEATURES.reduce((sum, f) => sum + f.weight, 0);

/** Problem with an archetype `signature` range for `feature` (a list of strings), or null. */
export function rangeProblem(feature, value) {
  const def = BY_NAME[feature];
  if (!Array.isArray(value) || !value.length)
    return 'must be a list: [min, max] for a number, or the allowed values for a category';
  if (def.kind === 'cat') {
    const bad = value.filter((v) => !def.values.includes(v));
    return bad.length
      ? `unknown value "${bad[0]}" (allowed: ${def.values.join(', ')})`
      : null;
  }
  if (value.length !== 2) return 'must be [min, max]';
  const [min, max] = value.map((v) => (v === '' ? NaN : Number(v)));
  if (!Number.isFinite(min) || !Number.isFinite(max))
    return 'min and max must be numbers';
  if (min > max) return 'min is greater than max';
  if (def.kind === 'ratio' && (min < 0 || max > 1))
    return 'a ratio must stay between 0 and 1';
  if (min < 0) return 'must not be negative';
  return null;
}

const asNumber = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Normalized weighted distance (0 identical .. 1 opposite) and the per-feature breakdown. */
export function featureDistance(a, b) {
  const parts = FEATURES.map((f) => {
    const x = a?.[f.name];
    const y = b?.[f.name];
    const d =
      f.kind === 'cat'
        ? x === y
          ? 0
          : 1
        : Math.min(1, Math.abs(asNumber(x) - asNumber(y)) / f.scale);
    return { name: f.name, a: x ?? null, b: y ?? null, d, weight: f.weight };
  });
  const distance =
    parts.reduce((sum, p) => sum + p.d * p.weight, 0) / TOTAL_WEIGHT;
  return { distance, parts };
}

/** The features two sites share most: nearly equal values, heaviest weight first. */
export function sharedFeatures(parts, limit = 5, tolerance = 0.1) {
  return parts
    .filter((p) => p.d <= tolerance)
    .sort((x, y) => y.weight - x.weight || x.name.localeCompare(y.name))
    .slice(0, limit);
}

// --------------------------------------------------------------------------------------------------
// Screenshot hashes: 64-bit difference hashes (16 hex digits), one per viewport-height slice.

export function hamming(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (x) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

/**
 * Share of slices of both pages that have a slice within `maxHamming` bits on the other page,
 * (matchedA + matchedB) / (|A| + |B|). 0 when either page has no hashes.
 */
export function hashMatchShare(hashesA, hashesB, maxHamming) {
  if (!hashesA?.length || !hashesB?.length) return 0;
  const matched = (from, to) =>
    from.filter((h) => to.some((o) => hamming(h, o) <= maxHamming)).length;
  return (
    (matched(hashesA, hashesB) + matched(hashesB, hashesA)) /
    (hashesA.length + hashesB.length)
  );
}

/** Compare two signature documents ({ features, hashes }). */
export function compareSignatures(a, b, { hashHamming }) {
  const { distance, parts } = featureDistance(a.features, b.features);
  return {
    distance,
    hashMatch: hashMatchShare(a.hashes, b.hashes, hashHamming),
    shared: sharedFeatures(parts),
    parts,
  };
}

// --------------------------------------------------------------------------------------------------
// Archetype targets

/** Features whose measured value lies outside the archetype's `signature` ranges (warnings). */
export function targetWarnings(features, signature) {
  const warnings = [];
  for (const [name, range] of Object.entries(signature ?? {})) {
    const def = BY_NAME[name];
    if (!def) continue;
    const value = features?.[name];
    if (def.kind === 'cat') {
      if (!range.includes(value))
        warnings.push({ feature: name, value, expected: range.join(' | ') });
    } else {
      const [min, max] = range.map(Number);
      if (typeof value !== 'number' || value < min || value > max)
        warnings.push({
          feature: name,
          value: value ?? null,
          expected: `${min} to ${max}`,
        });
    }
  }
  return warnings;
}
