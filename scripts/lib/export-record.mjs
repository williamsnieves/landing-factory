// The export record of a site: sites/<slug>/EXPORTED.json (written by `npm run export --record`, extended by
// scripts/transfer.mjs). One module reads it for sync, revision, transfer and the MCP interface, so every one of
// them judges "transferred" the same way (design: openspec/changes/add-landing-revise/design.md, Decisions 5 and 6).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RECORD_FILE = 'EXPORTED.json';
const RECORD_KEYS = [
  'repository',
  'exportedAt',
  'factoryCommit',
  'target',
  'noBrief',
  'transferredTo',
  'transferredAt',
];

/** Path of a site's record. */
export const recordPath = (root, slug) =>
  join(root, 'sites', slug, RECORD_FILE);

/** The parsed record, or null when the site has none. Throws an Error naming the file when it is not valid JSON. */
export function readExportRecord(root, slug) {
  const path = recordPath(root, slug);
  if (!existsSync(path)) return null;
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(
      `sites/${slug}/${RECORD_FILE} is not valid JSON: ${error.message}`,
    );
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data))
    throw new Error(`sites/${slug}/${RECORD_FILE} must be an object`);
  return data;
}

/** True when the record says the repository was handed to its customer. A missing record is not transferred. */
export const isTransferred = (record) =>
  Boolean(
    record &&
    typeof record.transferredTo === 'string' &&
    record.transferredTo.trim(),
  );

/** Structural problems of a record, as strings (the record is the factory's own, so unknown keys fail). */
export function validateExportRecord(record) {
  const errors = [];
  if (record === null || typeof record !== 'object' || Array.isArray(record))
    return ['the record must be an object'];
  for (const key of Object.keys(record))
    if (!RECORD_KEYS.includes(key)) errors.push(`${key}: unknown key`);
  if (record.noBrief !== undefined && typeof record.noBrief !== 'boolean')
    errors.push('noBrief: must be true or false');
  for (const key of ['transferredTo', 'transferredAt'])
    if (record[key] !== undefined && typeof record[key] !== 'string')
      errors.push(`${key}: must be a string`);
  if (record.transferredTo !== undefined && !record.transferredAt)
    errors.push('transferredTo needs transferredAt');
  return errors;
}

/**
 * A repository location reduced to `host/owner/name` (lowercase, no credentials, no `.git`, no trailing slash), so
 * the https, ssh and scp-like forms of one repository compare equal. Returns null for text that is not a location.
 */
export function normalizeRepoUrl(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  let host;
  let path;
  const scp = /^(?:[^@/\s]+@)?([A-Za-z0-9.-]+):(?!\/\/)(.+)$/.exec(text);
  if (scp && !/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    host = scp[1];
    path = scp[2];
  } else {
    try {
      const url = new URL(text);
      host = url.hostname;
      path = url.pathname;
    } catch {
      return null;
    }
  }
  path = path
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '');
  if (!host || !/^[^/]+\/[^/]+$/.test(path)) return null;
  return `${host}/${path}`.toLowerCase();
}
