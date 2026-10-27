// The record of a visual directions run: sites/<slug>/directions.json (design: openspec/changes/add-landing-preview).
// Used by scripts/directions.mjs, the MCP tools and the new-landing skill. Pure functions, no I/O.
import { HERO_TYPES } from './archetypes.mjs';

export const DIRECTION_IDS = ['a', 'b', 'c'];
export const MIN_DIRECTIONS = 2;
export const MAX_DIRECTIONS = 3;
export const MAX_NOTES = 2000;
export const MAX_IDEA = 200;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DIRECTION_KEYS = [
  'id',
  'archetype',
  'traits',
  'primary',
  'displayFont',
  'bodyFont',
  'hero',
  'idea',
];
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Primary archetype of a blend such as "swiss+collage" (or "custom"). */
export const primaryArchetype = (archetype) =>
  String(archetype ?? '')
    .split('+')[0]
    .trim();

/** Coarse hue family of a hex color, so two near-identical colors count as the same family. */
export function hueFamily(hex) {
  if (typeof hex !== 'string' || !HEX.test(hex)) return 'unknown';
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  const delta = max - min;
  const sat = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));
  if (sat < 0.15 || light < 0.08 || light > 0.95) return 'neutral';
  let hue;
  if (max === r) hue = ((g - b) / delta + 6) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue *= 60;
  const bands = [
    [15, 'red'],
    [45, 'orange'],
    [70, 'yellow'],
    [165, 'green'],
    [200, 'teal'],
    [255, 'blue'],
    [290, 'purple'],
    [345, 'pink'],
  ];
  return bands.find(([max]) => hue < max)?.[1] ?? 'red';
}

/** A fresh record with no directions yet. */
export const emptyDirections = () => ({
  version: 1,
  directions: [],
  choice: null,
});

/**
 * Structural problems of a parsed directions.json, each naming the field path. The number of directions and the
 * differences between them are judged by `check` in scripts/directions.mjs, not here.
 */
export function validateDirections(data) {
  const errors = [];
  if (!isPlain(data)) return ['directions.json must be an object'];
  for (const key of Object.keys(data))
    if (!['version', 'directions', 'choice'].includes(key))
      errors.push(`${key}: unknown key`);
  if (data.version !== 1) errors.push('version: must be 1');
  if (!Array.isArray(data.directions)) {
    errors.push('directions: must be an array');
    return errors;
  }
  if (data.directions.length > MAX_DIRECTIONS)
    errors.push(`directions: at most ${MAX_DIRECTIONS} directions`);
  const seen = new Set();
  data.directions.forEach((d, i) => {
    const at = `directions[${i}]`;
    if (!isPlain(d)) return errors.push(`${at}: must be an object`);
    for (const key of Object.keys(d))
      if (!DIRECTION_KEYS.includes(key))
        errors.push(`${at}.${key}: unknown key`);
    if (!DIRECTION_IDS.includes(d.id))
      errors.push(`${at}.id: must be one of ${DIRECTION_IDS.join(', ')}`);
    else if (seen.has(d.id)) errors.push(`${at}.id: duplicate id "${d.id}"`);
    else seen.add(d.id);
    if (typeof d.archetype !== 'string' || !d.archetype.trim())
      errors.push(
        `${at}.archetype: required, "primary" or "primary+secondary"`,
      );
    else if (d.archetype.split('+').length > 2)
      errors.push(`${at}.archetype: "primary" or "primary+secondary" only`);
    if (
      !Array.isArray(d.traits) ||
      d.traits.some((t) => typeof t !== 'string' || !t.trim())
    )
      errors.push(`${at}.traits: must be an array of strings`);
    if (typeof d.primary !== 'string' || !HEX.test(d.primary))
      errors.push(`${at}.primary: must be a hex color like #92400e`);
    for (const key of ['displayFont', 'bodyFont'])
      if (typeof d[key] !== 'string' || !d[key].trim())
        errors.push(`${at}.${key}: required`);
    if (!HERO_TYPES.includes(d.hero))
      errors.push(`${at}.hero: must be one of ${HERO_TYPES.join(', ')}`);
    if (
      typeof d.idea !== 'string' ||
      !d.idea.trim() ||
      d.idea.length > MAX_IDEA ||
      /[\r\n]/.test(d.idea)
    )
      errors.push(
        `${at}.idea: required, one line, at most ${MAX_IDEA} characters`,
      );
  });
  if (data.choice !== null && data.choice !== undefined) {
    const c = data.choice;
    if (!isPlain(c)) errors.push('choice: must be null or an object');
    else {
      for (const key of Object.keys(c))
        if (!['direction', 'notes', 'date'].includes(key))
          errors.push(`choice.${key}: unknown key`);
      if (!seen.has(c.direction))
        errors.push(
          `choice.direction: must be one of the recorded directions (${[...seen].join(', ') || 'none'})`,
        );
      if (typeof c.notes !== 'string')
        errors.push('choice.notes: must be a string');
      else if (c.notes.length > MAX_NOTES)
        errors.push(`choice.notes: longer than ${MAX_NOTES} characters`);
      if (typeof c.date !== 'string' || !DATE.test(c.date))
        errors.push('choice.date: must be YYYY-MM-DD');
    }
  } else if (data.choice === undefined)
    errors.push('choice: required (null when none)');
  return errors;
}
