// Paths for `qa.mjs --site <slug>`: which project to build, which config to read,
// where reports go and what impeccable scans. Pure (only reads the file system to
// look for an optional per-site config), so it is unit-tested.
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { SLUG_PATTERN, isSiteDir } from '../lib/sites.mjs';

/**
 * @param {object} o
 * @param {string} o.root           repo root (absolute)
 * @param {string} [o.site]         site slug; absent means the root starter
 * @param {string} [o.sitesDir]     folder holding the sites (default <root>/sites)
 * @param {string} [o.config]       --config value
 * @param {string} [o.out]          --out value
 */
export function resolveQaPaths({ root, site, sitesDir, config, out }) {
  if (site === undefined) {
    return {
      site: null,
      projectDir: root,
      configPath: resolve(root, config ?? 'qa.config.json'),
      outRoot: resolve(root, out ?? 'qa'),
    };
  }
  if (!SLUG_PATTERN.test(site))
    throw new Error(
      `Invalid --site "${site}": expected a folder name under sites/ (lowercase letters, digits, hyphens).`,
    );
  const projectDir = resolve(sitesDir ?? join(root, 'sites'), site);
  if (!isSiteDir(projectDir))
    throw new Error(
      `No site "${site}": ${relative(root, join(projectDir, 'package.json'))} not found (create it with \`npm run new-site -- ${site}\`).`,
    );
  const siteConfig = join(projectDir, 'qa.config.json');
  return {
    site,
    projectDir,
    // --config wins; then the site's own qa.config.json; then the root's.
    configPath: config
      ? resolve(root, config)
      : existsSync(siteConfig)
        ? siteConfig
        : resolve(root, 'qa.config.json'),
    outRoot: join(resolve(root, out ?? 'qa'), site),
  };
}

/**
 * What impeccable scans, as a path relative to the repo root (it always runs from the
 * root). --src wins; otherwise the config's target, resolved inside the site.
 */
export function resolveImpeccableTarget({ root, projectDir, src, target }) {
  return src ?? relative(root, resolve(projectDir, target));
}
