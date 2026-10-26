// The exported package.json (design Decision 4): the site's dependencies and the tooling the copied scripts
// need, each pinned to the exact version the factory lockfile resolved, so the exported build is the one QA
// passed in the factory. Wrangler joins only when the site can deploy through it.
import { resolveConfig } from '../deploy/config.mjs';

/** Root devDependencies the copied scripts import or run (QA, report, deploy, Prettier, Astro's image service). */
export const TOOLING = [
  'chrome-launcher',
  'lighthouse',
  'playwright',
  'prettier',
  'prettier-plugin-astro',
  'sharp',
];

/** Lint devDependencies of every exported repository (`npm run lint`), pinned like the rest of the tooling. */
export const LINT_TOOLING = [
  'eslint',
  'eslint-plugin-astro',
  'eslint-plugin-jsx-a11y',
  'knip',
  'typescript-eslint',
];

/** An export stopped by a dependency problem; `packages` names the ones involved. */
export class PackageError extends Error {
  constructor(message, packages = []) {
    super(message);
    this.name = 'PackageError';
    this.packages = packages;
  }
}

/**
 * The version the factory lockfile resolved for `name`: the site-local entry wins over the hoisted one.
 * Returns null when the lockfile has neither.
 */
export function lockedVersion(lock, slug, name) {
  const packages = lock?.packages ?? {};
  return (
    packages[`sites/${slug}/node_modules/${name}`]?.version ??
    packages[`node_modules/${name}`]?.version ??
    null
  );
}

/** True when the site's configuration can deploy through wrangler (cloudflare target or a Cloudflare preview). */
export function needsWrangler(siteConfigRaw) {
  const config = resolveConfig(siteConfigRaw);
  return config.target === 'cloudflare' || config.previews === 'cloudflare';
}

/** The npm scripts of the exported repository. */
export function exportedScripts() {
  return {
    dev: 'astro dev',
    build: 'astro build',
    preview: 'astro preview',
    check: 'astro check',
    format: 'prettier --write .',
    'format:check': 'prettier --check .',
    // The factory's layer check is not exported: the site was pruned there (the export refuses one that was not).
    lint: 'npm run lint:code && npm run lint:unused',
    'lint:code': 'eslint src',
    'lint:unused': 'knip --include files,dependencies --no-config-hints',
    qa: 'node scripts/qa.mjs',
    report: 'node scripts/landing-report.mjs',
    deploy: 'node scripts/deploy.mjs',
  };
}

const sortKeys = (object) =>
  Object.fromEntries(
    Object.entries(object).sort(([a], [b]) => (a < b ? -1 : 1)),
  );

/**
 * @param {object} o
 * @param {string} o.slug         the site's folder name
 * @param {object} o.sitePackage  sites/<slug>/package.json
 * @param {object} o.rootPackage  the factory's package.json (engines, tooling names)
 * @param {object} o.lock         the factory's package-lock.json
 * @param {object} o.siteConfig   sites/<slug>/site.config.json (raw)
 * @returns {object} the package.json to write
 * @throws {PackageError} when a package is missing from the lockfile
 */
export function buildPackageJson({
  slug,
  sitePackage,
  rootPackage,
  lock,
  siteConfig,
}) {
  const missing = [];
  const pin = (name) => {
    const version = lockedVersion(lock, slug, name);
    if (!version) missing.push(name);
    return version;
  };
  const dependencies = {};
  const devDependencies = {};
  for (const name of Object.keys(sitePackage.dependencies ?? {}))
    dependencies[name] = pin(name);
  for (const name of Object.keys(sitePackage.devDependencies ?? {}))
    devDependencies[name] = pin(name);
  const tooling = [...TOOLING, ...LINT_TOOLING];
  if (needsWrangler(siteConfig)) tooling.push('wrangler');
  for (const name of tooling) {
    if (name in dependencies || name in devDependencies) continue;
    devDependencies[name] = pin(name);
  }
  if (missing.length)
    throw new PackageError(
      `not in the factory package-lock.json: ${missing.join(', ')}; run npm install in the factory first`,
      missing,
    );
  return {
    name: slug,
    version: '0.1.0',
    private: true,
    type: 'module',
    engines: rootPackage.engines,
    scripts: exportedScripts(),
    dependencies: sortKeys(dependencies),
    devDependencies: sortKeys(devDependencies),
  };
}
