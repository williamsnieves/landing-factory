// Shared helpers for the site workspaces under sites/.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Folder name rule for a site (also the Pages project default). */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A site is a folder under sites/ with a package.json; docs-only folders are not sites. */
export function isSiteDir(dir) {
  return existsSync(join(dir, 'package.json'));
}

/** Slugs of every site in `sitesDir`, sorted. */
export function listSites(sitesDir) {
  if (!existsSync(sitesDir)) return [];
  return readdirSync(sitesDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        SLUG_PATTERN.test(entry.name) &&
        isSiteDir(join(sitesDir, entry.name)),
    )
    .map((entry) => entry.name)
    .sort();
}
