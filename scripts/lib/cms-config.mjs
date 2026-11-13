// The Pages CMS configuration of a site: sites/<slug>/.pages.yml (design: openspec/changes/add-git-cms/design.md).
// Reads only the keys the factory relies on (`content`, `media`, `actions`) and ignores the rest. Used by
// scripts/cms.mjs, scripts/export.mjs and scripts/sync-export.mjs; never copied into an exported repository,
// because it needs the `yaml` package. Pure reading, no network.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

import { isDeepStrictEqual } from 'node:util';

import { parse } from 'yaml';

import { walkFiles } from '../report/fs-util.mjs';

export const CMS_FILE = '.pages.yml';
export const CONTENT_DIR = 'src/content';
export const CONTENT_CONFIG = 'src/content.config.ts';
export const TYPES = ['collection', 'file'];
export const FORMATS = ['json', 'yaml'];

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Path of a site's configuration. */
export const cmsConfigPath = (siteDir) => join(siteDir, CMS_FILE);

/** True when the site opts in to the CMS. */
export const hasCmsConfig = (siteDir) => existsSync(cmsConfigPath(siteDir));

/**
 * True when `text` mentions `path`, or `path` without its leading `src/` (the form relative to the folder of
 * `content.config.ts`), as a whole path: the next character must not continue a name (`src/content/jobs` does
 * not match `src/content/jobs-old`; it does match `./src/content/jobs/*.json`).
 */
export function mentionsPath(text, path) {
  const forms = [path, path.replace(/^src\//, '')];
  return forms.some((form) => {
    let from = 0;
    for (;;) {
      const at = text.indexOf(form, from);
      if (at < 0) return false;
      const next = text[at + form.length];
      if (next === undefined || !/[A-Za-z0-9_.-]/.test(next)) return true;
      from = at + 1;
    }
  });
}

/** Problems of one path string, or null when it is a clean relative path inside `src/content/`. */
function pathProblem(path) {
  if (typeof path !== 'string' || !path)
    return 'path must be a non-empty string';
  if (path.includes('\\') || path.startsWith('/') || path.endsWith('/'))
    return `path "${path}" must be relative, with forward slashes and no leading or trailing slash`;
  if (path.split('/').some((part) => part === '..' || part === '.' || !part))
    return `path "${path}" must not contain empty, "." or ".." segments`;
  if (!path.startsWith(`${CONTENT_DIR}/`))
    return `path "${path}" is outside ${CONTENT_DIR}/ (only content files can be edited by the CMS)`;
  return null;
}

/**
 * Read and check `<siteDir>/.pages.yml`. Returns `{ exists, paths, problems }`: `paths` are the valid entries
 * (`{ name, label, type, path, format }`), `problems` are strings naming the entry. A missing file is
 * `exists: false` with no problem (the caller decides).
 */
export function readCmsConfig(siteDir) {
  const file = cmsConfigPath(siteDir);
  if (!existsSync(file)) return { exists: false, paths: [], problems: [] };
  const problems = [];
  const paths = [];
  let data;
  try {
    data = parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return {
      exists: true,
      paths,
      problems: [
        `${CMS_FILE} is not valid YAML: ${error.message.split('\n')[0]}`,
      ],
    };
  }
  if (!isPlain(data))
    return {
      exists: true,
      paths,
      problems: [`${CMS_FILE} must be a YAML mapping`],
    };

  if ('media' in data)
    problems.push(
      'media: uploads are not allowed (an uploaded image would have no license record); change images through the factory',
    );
  if ('actions' in data)
    problems.push('actions: not allowed (actions run workflows)');

  let configText = null;
  const configFile = join(siteDir, CONTENT_CONFIG);
  if (existsSync(configFile)) configText = readFileSync(configFile, 'utf8');

  if (!Array.isArray(data.content) || data.content.length === 0) {
    problems.push('content: must be a non-empty list of entries');
    return { exists: true, paths, problems };
  }
  const seen = new Set();
  data.content.forEach((entry, index) => {
    const at =
      isPlain(entry) && entry.name
        ? `content "${entry.name}"`
        : `content[${index}]`;
    const own = [];
    if (!isPlain(entry)) {
      problems.push(`${at}: must be a mapping`);
      return;
    }
    if (!TYPES.includes(entry.type))
      own.push(
        `type must be ${TYPES.join(' or ')}, got ${JSON.stringify(entry.type ?? null)}`,
      );
    if (!FORMATS.includes(entry.format))
      own.push(
        `format must be ${FORMATS.join(' or ')}, got ${JSON.stringify(entry.format ?? null)}`,
      );
    if ('actions' in entry)
      own.push('actions: not allowed (actions run workflows)');
    const bad = pathProblem(entry.path);
    if (bad) own.push(bad);
    else {
      const abs = join(siteDir, entry.path);
      const kind = TYPES.includes(entry.type) ? entry.type : null;
      if (!existsSync(abs)) own.push(`path "${entry.path}" does not exist`);
      else if (kind === 'collection' && !statSync(abs).isDirectory())
        own.push(`path "${entry.path}" is not a folder (type collection)`);
      else if (kind === 'file' && !statSync(abs).isFile())
        own.push(`path "${entry.path}" is not a file (type file)`);
      if (configText === null)
        own.push(
          `${CONTENT_CONFIG} is missing: no collection loads "${entry.path}"`,
        );
      else if (!mentionsPath(configText, entry.path))
        own.push(
          `path "${entry.path}" is not referenced in ${CONTENT_CONFIG} (a collection with a schema must load it)`,
        );
      if (seen.has(entry.path))
        own.push(`path "${entry.path}" is listed twice`);
      seen.add(entry.path);
    }
    for (const message of own) problems.push(`${at}: ${message}`);
    if (!own.length)
      paths.push({
        name: String(entry.name ?? entry.path),
        label: typeof entry.label === 'string' ? entry.label : undefined,
        type: entry.type,
        path: entry.path,
        format: entry.format,
      });
  });
  return { exists: true, paths, problems };
}

/** The CMS paths of a site (valid entries only; [] without `.pages.yml`). */
export const cmsPathsOf = (siteDir) =>
  readCmsConfig(siteDir).paths.map((entry) => entry.path);

/**
 * True when the CMS manages the site's products: `.pages.yml` exists, passes the CMS check with no problem and
 * has a `content[]` entry named `offer`. The brief's `offer` is then only the starting record. Never throws.
 */
export function cmsOwnsOffer(siteDir) {
  try {
    const { exists, paths, problems } = readCmsConfig(siteDir);
    return exists && !problems.length && paths.some((e) => e.name === 'offer');
  } catch {
    return false;
  }
}

/** True when `rel` (a path inside the repository) is one of the CMS paths or lies under a collection folder. */
export const isCmsPath = (rel, paths) =>
  paths.some((p) => rel === p || rel.startsWith(`${p}/`));

/** Files under the CMS paths of a tree (a site folder or a clone), as sorted relative paths with forward slashes. */
export function cmsFiles(base, paths) {
  const found = new Set();
  for (const p of paths) {
    const abs = join(base, p);
    if (!existsSync(abs)) continue;
    if (statSync(abs).isFile()) found.add(p);
    else
      for (const file of walkFiles(abs, { skipDirs: [] }))
        found.add(`${p}/${file.rel}`);
  }
  return [...found].sort();
}

/**
 * True when two CMS files hold the same content. The CMS owns the formatting of its files, so JSON and YAML are
 * compared as parsed values (JSON.parse with deep equality, the `yaml` parser); any other file, or one that does
 * not parse, is compared by bytes.
 */
export function sameContent(a, b) {
  const x = readFileSync(a);
  const y = readFileSync(b);
  if (x.equals(y)) return true;
  const ext = extname(a).toLowerCase();
  if (ext !== extname(b).toLowerCase()) return false;
  try {
    if (ext === '.json')
      return isDeepStrictEqual(
        JSON.parse(x.toString('utf8')),
        JSON.parse(y.toString('utf8')),
      );
    if (ext === '.yaml' || ext === '.yml')
      return isDeepStrictEqual(
        parse(x.toString('utf8')),
        parse(y.toString('utf8')),
      );
  } catch {
    // does not parse: the bytes differ
  }
  return false;
}
