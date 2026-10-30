#!/usr/bin/env node
// Optional layers of a site: the 3D layer (src/components/three/, src/scenes/, `three` and `@types/three`), the
// legal components (src/components/legal/) and the lead forms (src/components/forms/). `new-site` copies all into every site; the build prunes the
// ones the finished landing does not use, and `add` copies one back from the starter.
//   node scripts/site-layers.mjs prune --site <slug> [--dry-run]
//   node scripts/site-layers.mjs add <3d|legal|forms> --site <slug> [--dry-run]
//   node scripts/site-layers.mjs check [--site <slug>]
// Exit codes: 0 ok, 1 check failed or refused, 2 bad usage. Run `--help` for more.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { findImports, stripComments } from './export/closure.mjs';
import { SLUG_PATTERN, isSiteDir, listSites } from './lib/sites.mjs';
import {
  COPIED_PATHS,
  SHARED_DEPENDENCIES,
  SHARED_DEV_DEPENDENCIES,
} from './new-site.mjs';

const FACTORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The factory root; LANDING_FACTORY_ROOT moves it (tests, like the MCP server). */
const repoRoot = () =>
  process.env.LANDING_FACTORY_ROOT
    ? resolve(process.env.LANDING_FACTORY_ROOT)
    : FACTORY_ROOT;

/** The entry of `list` that is, or ends the path with, `name`; fails loudly so the constants stay in sync with new-site. */
function fromNewSite(list, name, what) {
  if (!list.includes(name))
    throw new Error(
      `scripts/new-site.mjs no longer lists ${name} in ${what}; update scripts/site-layers.mjs.`,
    );
  return name;
}

/**
 * The optional layers. `paths` are the starter paths new-site copies (taken from its COPIED_PATHS), `owned` are
 * folders that belong to the layer but are not copied (new-site creates src/scenes/ empty), `dependencies` and
 * `devDependencies` come from new-site's shared lists, and `packages` are bare imports that also count as use.
 */
export const LAYERS = {
  '3d': {
    label: 'the 3D layer',
    paths: [fromNewSite(COPIED_PATHS, 'src/components/three', 'COPIED_PATHS')],
    owned: ['src/scenes'],
    dependencies: [
      fromNewSite(SHARED_DEPENDENCIES, 'three', 'SHARED_DEPENDENCIES'),
    ],
    devDependencies: [
      fromNewSite(
        SHARED_DEV_DEPENDENCIES,
        '@types/three',
        'SHARED_DEV_DEPENDENCIES',
      ),
    ],
    packages: ['three'],
  },
  legal: {
    label: 'the legal components',
    paths: [fromNewSite(COPIED_PATHS, 'src/components/legal', 'COPIED_PATHS')],
    owned: [],
    dependencies: [],
    devDependencies: [],
    packages: [],
  },
  // Lead forms (<LeadForm />, docs/forms.md). The consent box links the privacy page, so a site that uses forms also
  // keeps the legal components (`requires`).
  forms: {
    label: 'the lead forms components',
    paths: [fromNewSite(COPIED_PATHS, 'src/components/forms', 'COPIED_PATHS')],
    owned: [],
    dependencies: [],
    devDependencies: [],
    packages: [],
    requires: ['legal'],
  },
};

const SOURCE_FILE = /\.(astro|[cm]?[jt]sx?)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro']);

const inside = (file, dir) => file === dir || file.startsWith(dir + sep);

function sourceFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory())
      return SKIP_DIRS.has(entry.name) ? [] : sourceFiles(full);
    return SOURCE_FILE.test(entry.name) ? [full] : [];
  });
}

/** Every module specifier (relative or bare) of a source file, comments left out. */
function specifiersOf(source) {
  const code = stripComments(source);
  const found = new Set();
  for (const m of code.matchAll(/\bfrom\s*(['"])([^'"\n]+)\1/g))
    found.add(m[2]);
  for (const m of code.matchAll(/(?:^|[;\s])import\s*(['"])([^'"\n]+)\1/g))
    found.add(m[2]);
  for (const m of code.matchAll(/\bimport\s*\(\s*(['"])([^'"\n]*)\1\s*\)/g))
    found.add(m[2]);
  return [...found];
}

const layerDirs = (siteDir, layer) =>
  [...LAYERS[layer].paths, ...LAYERS[layer].owned].map((p) => join(siteDir, p));

/**
 * What the static scan of a site's `src/` finds: which layers are used, and the non-literal dynamic imports
 * (which the scan cannot follow). A layer is used when a file outside the layer imports it (a relative
 * specifier that resolves into one of its folders) or, for a layer with `packages`, imports one of them.
 */
export function scanSite(siteDir) {
  const srcDir = join(siteDir, 'src');
  const used = {};
  for (const layer of Object.keys(LAYERS)) used[layer] = [];
  const dynamic = [];
  for (const file of sourceFiles(srcDir)) {
    const rel = relative(siteDir, file).split(sep).join('/');
    const source = readFileSync(file, 'utf8');
    const own = Object.keys(LAYERS).filter((layer) =>
      layerDirs(siteDir, layer).some((dir) => inside(file, dir)),
    );
    // Dynamic imports inside a layer are the layer's own business (the scene loader), judged with the layer.
    if (own.length === 0) {
      for (const arg of findImports(source).dynamic)
        dynamic.push({ file: rel, argument: arg });
    }
    // A layer's own files do not make another layer "used": a site that imports nothing from the forms layer would
    // otherwise keep the legal components only because the unused forms layer imports them (see `requires`).
    const inLayer = Object.keys(LAYERS).some((layer) =>
      layerDirs(siteDir, layer).some((dir) => inside(file, dir)),
    );
    for (const specifier of specifiersOf(source)) {
      const target = specifier.startsWith('.')
        ? resolve(dirname(file), specifier)
        : null;
      for (const [layer, def] of Object.entries(LAYERS)) {
        if (own.includes(layer) || (inLayer && target)) continue;
        const hit = target
          ? layerDirs(siteDir, layer).some((dir) => inside(target, dir))
          : def.packages.some(
              (pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`),
            );
        if (hit) used[layer].push({ file: rel, specifier });
      }
    }
  }
  // A used layer keeps the layers it needs (forms link the privacy page the legal components render).
  for (const [layer, def] of Object.entries(LAYERS))
    if (used[layer].length)
      for (const needed of def.requires ?? [])
        if (used[needed].length === 0)
          used[needed].push({
            file: `(needed by the ${layer} layer)`,
            specifier: needed,
          });
  return { used, dynamic };
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) =>
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

/** Whether the site holds any part of the layer: a folder or a dependency. */
export function holdsLayer(siteDir, layer) {
  const def = LAYERS[layer];
  if (layerDirs(siteDir, layer).some((dir) => existsSync(dir))) return true;
  const pkg = readJson(join(siteDir, 'package.json'));
  return (
    def.dependencies.some((name) => pkg.dependencies?.[name]) ||
    def.devDependencies.some((name) => pkg.devDependencies?.[name])
  );
}

/** The layers a site holds without using them, from the static scan. */
export function unusedLayers(siteDir) {
  const { used } = scanSite(siteDir);
  return Object.keys(LAYERS).filter(
    (layer) => holdsLayer(siteDir, layer) && used[layer].length === 0,
  );
}

const pretty = (siteDir, file) => relative(repoRoot(), join(siteDir, file));

/** Remove the unused layers of a site. Returns { removed: string[], refused?: string }. */
export function pruneSite(siteDir, { dryRun = false } = {}) {
  const { used, dynamic } = scanSite(siteDir);
  if (dynamic.length) {
    const first = dynamic[0];
    return {
      removed: [],
      refused: `${first.file} has import(${first.argument}), which is not a string literal; the scan cannot tell whether it loads a layer. Make the specifier literal or decide by hand.`,
    };
  }
  const removed = [];
  const pkgFile = join(siteDir, 'package.json');
  const pkg = readJson(pkgFile);
  for (const [layer, def] of Object.entries(LAYERS)) {
    if (!holdsLayer(siteDir, layer) || used[layer].length > 0) continue;
    for (const dir of layerDirs(siteDir, layer)) {
      if (!existsSync(dir)) continue;
      removed.push(pretty(siteDir, relative(siteDir, dir)) + '/');
      if (!dryRun) rmSync(dir, { recursive: true, force: true });
    }
    for (const [field, names] of [
      ['dependencies', def.dependencies],
      ['devDependencies', def.devDependencies],
    ])
      for (const name of names)
        if (pkg[field]?.[name]) {
          removed.push(`${pretty(siteDir, 'package.json')}: ${field}.${name}`);
          if (!dryRun) delete pkg[field][name];
        }
  }
  if (!dryRun && removed.some((line) => line.includes('package.json:')))
    writeJson(pkgFile, pkg);
  return { removed };
}

/** Copy a layer back from the starter and restore its dependency ranges. Returns { added: string[], refused?: string }. */
export function addLayer(siteDir, layer, { dryRun = false } = {}) {
  const def = LAYERS[layer];
  const root = repoRoot();
  if (layerDirs(siteDir, layer).some((dir) => existsSync(dir)))
    return {
      added: [],
      refused: `${def.label} already exists in ${relative(root, siteDir)}; nothing to add.`,
    };
  const rootPkg = readJson(join(root, 'package.json'));
  const pkgFile = join(siteDir, 'package.json');
  const pkg = readJson(pkgFile);
  const added = [];
  for (const path of def.paths) {
    const from = join(root, path);
    if (!existsSync(from)) throw new Error(`Starter path missing: ${path}`);
    added.push(`${path}/`);
    if (!dryRun) {
      mkdirSync(dirname(join(siteDir, path)), { recursive: true });
      cpSync(from, join(siteDir, path), { recursive: true, force: false });
    }
  }
  for (const path of def.owned) {
    added.push(`${path}/`);
    if (!dryRun) {
      mkdirSync(join(siteDir, path), { recursive: true });
      // Same empty placeholder new-site writes, so the folder survives in git.
      if (!existsSync(join(siteDir, path, '.gitkeep')))
        writeFileSync(join(siteDir, path, '.gitkeep'), '');
    }
  }
  for (const [field, names] of [
    ['dependencies', def.dependencies],
    ['devDependencies', def.devDependencies],
  ])
    for (const name of names) {
      const range = rootPkg[field]?.[name];
      if (!range) throw new Error(`Root package.json has no ${field}.${name}`);
      added.push(`package.json: ${field}.${name} ${range}`);
      if (!dryRun) {
        pkg[field] = { ...(pkg[field] ?? {}), [name]: range };
        pkg[field] = Object.fromEntries(
          Object.entries(pkg[field]).sort(([a], [b]) => a.localeCompare(b)),
        );
      }
    }
  if (!dryRun && def.dependencies.length + def.devDependencies.length > 0)
    writeJson(pkgFile, pkg);
  return { added };
}

const HELP = `Usage: node scripts/site-layers.mjs <command> [options]

Optional layers of a site: 3d (src/components/three/, src/scenes/, three, @types/three), legal
(src/components/legal/) and forms (src/components/forms/). A layer is in use when a file of the site's src/ outside the layer imports it.

Commands:
  prune --site <slug> [--dry-run]       Remove each layer the site does not use, and its dependencies.
                                        Refuses when src/ has a dynamic import() with a non-literal argument.
  add <3d|legal|forms> --site <slug> [--dry-run]
                                        Copy a layer back from the starter (what new-site copies) and restore its
                                        dependency ranges. Refuses when the layer already exists.
  check [--site <slug>]                 Exit 1 listing every site that holds a layer it does not use
                                        (all sites by default; the starter is never checked).

After prune or add run \`npm install\` so the root package-lock.json follows.
Exit codes: 0 ok, 1 check failed or refused, 2 bad usage.
Environment: LANDING_FACTORY_ROOT=<dir> uses <dir> as the factory root (tests only).
`;

function usage(message) {
  if (message) process.stderr.write(`${message}\n\n`);
  process.stderr.write(HELP);
  return 2;
}

function resolveSite(slug) {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug))
    return {
      error: `Invalid or missing --site "${slug ?? ''}": use the site slug.`,
    };
  const dir = join(repoRoot(), 'sites', slug);
  if (!existsSync(dir) || !statSync(dir).isDirectory() || !isSiteDir(dir))
    return { error: `No site "${slug}" under sites/.` };
  return { dir };
}

export function main(argv, out = process.stdout) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        site: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (error) {
    return usage(error.message);
  }
  const { values, positionals } = parsed;
  if (values.help) {
    out.write(HELP);
    return 0;
  }
  const [command, layerName, ...extra] = positionals;
  const dryRun = values['dry-run'];
  const say = (line = '') => out.write(`${line}\n`);

  if (command === 'prune') {
    if (layerName || extra.length) return usage('prune takes only --site.');
    const site = resolveSite(values.site);
    if (site.error) return usage(site.error);
    const result = pruneSite(site.dir, { dryRun });
    if (result.refused) {
      process.stderr.write(`Refused: ${result.refused}\n`);
      return 1;
    }
    if (result.removed.length === 0) say(`${values.site}: no unused layer.`);
    else {
      say(`${values.site}: ${dryRun ? 'would remove' : 'removed'}`);
      for (const line of result.removed) say(`  ${line}`);
      if (!dryRun) say('Run `npm install` so package-lock.json follows.');
    }
    return 0;
  }

  if (command === 'add') {
    if (!layerName || !Object.hasOwn(LAYERS, layerName) || extra.length)
      return usage(`add needs a layer: ${Object.keys(LAYERS).join(' or ')}.`);
    const site = resolveSite(values.site);
    if (site.error) return usage(site.error);
    const result = addLayer(site.dir, layerName, { dryRun });
    if (result.refused) {
      process.stderr.write(`Refused: ${result.refused}\n`);
      return 1;
    }
    say(
      `${values.site}: ${dryRun ? 'would add' : 'added'} ${LAYERS[layerName].label}`,
    );
    for (const line of result.added) say(`  ${line}`);
    if (!dryRun) say('Run `npm install` so package-lock.json follows.');
    return 0;
  }

  if (command === 'check') {
    if (layerName || extra.length || dryRun)
      return usage('check takes only --site.');
    let slugs;
    if (values.site !== undefined) {
      const site = resolveSite(values.site);
      if (site.error) return usage(site.error);
      slugs = [values.site];
    } else slugs = listSites(join(repoRoot(), 'sites'));
    const problems = [];
    for (const slug of slugs)
      for (const layer of unusedLayers(join(repoRoot(), 'sites', slug)))
        problems.push({ slug, layer });
    if (problems.length === 0) {
      say(`Layers: ${slugs.length} site(s) checked, no unused layer.`);
      return 0;
    }
    for (const { slug, layer } of problems)
      process.stderr.write(
        `${slug}: holds ${LAYERS[layer].label} (${layer}) but nothing imports it. Run: node scripts/site-layers.mjs prune --site ${slug}\n`,
      );
    return 1;
  }

  return usage(
    command ? `Unknown command "${command}".` : 'A command is required.',
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
