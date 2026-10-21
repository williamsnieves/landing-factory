#!/usr/bin/env node
// Find and download openly licensed images from Wikimedia Commons and, with --source met, The Met's
// Open Access collection (public-domain objects), into a site, recording each one in
// sites/<slug>/assets.json (the manifest scripts/credits.mjs and scripts/check-landing.mjs read).
//
//   node scripts/find-images.mjs search "<query>" [--source commons,met] [--limit N] [--min-width W] [--orientation O] [--json]
//   node scripts/find-images.mjs get <site-slug> <commons-title|page-id|url|met:<id>|Met url> [--as file] [--width W] [--note text]
//
// Requests go through HTTPS_PROXY when it is set (same re-exec as the analyze-reference scripts), are
// throttled (>= 1 s apart), retry HTTP 429/503 honoring Retry-After with a capped exponential backoff,
// and carry a descriptive User-Agent (Wikimedia requires one). Run with --help for details.
// Exit codes: 0 ok, 1 nothing usable / rejected / request failed, 2 bad usage.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { reexecWithEnvProxy } from '../.claude/skills/analyze-reference/scripts/proxy.mjs';
import { validateSlug } from './new-site.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const USER_AGENT =
  'landing-factory/0.1 (https://github.com/williamsnieves/landing-factory)';
export const API = 'https://commons.wikimedia.org/w/api.php';
/** Widths upload.wikimedia.org serves reliably; thumb.wikimedia.org is blocked in cloud sessions. */
export const STANDARD_WIDTHS = [960, 1280, 1920];
export const DEFAULT_WIDTH = 1920;
export const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
export const ORIENTATIONS = ['landscape', 'portrait', 'square'];
export const SOURCES = ['commons', 'met'];

export const MET_API = 'https://collectionapi.metmuseum.org/public/collection';
export const MET_LICENSE = 'Public domain (museum open access)';
export const MET_LICENSE_URL =
  'https://www.metmuseum.org/about-the-met/policies-and-documents/open-access';

const METADATA_KEYS =
  'Artist|LicenseShortName|LicenseUrl|UsageTerms|Copyrighted|ObjectName|ImageDescription|Credit|AttributionRequired|Restrictions';

// --------------------------------------------------------------------------------------------------
// License policy

/**
 * Allow-list: CC0, public domain marks, CC BY *, CC BY-SA *. Everything else (NC, ND, GFDL, "fair use",
 * unknown) is rejected with a reason. Returns { allowed, credit, short, reason }.
 * `credit` is true unless the work is CC0 or public domain.
 */
export function classifyLicense(shortName, usageTerms = '') {
  const short = String(shortName ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  const text = `${short} ${usageTerms ?? ''}`;
  if (!short)
    return {
      allowed: false,
      credit: true,
      short,
      reason: 'no license recorded',
    };
  if (/\b(?:NC|ND)\b|non-?commercial|no[- ]?derivatives?/i.test(text))
    return {
      allowed: false,
      credit: true,
      short,
      reason: `${short}: NonCommercial and NoDerivatives licenses are not allowed`,
    };
  if (
    /^CC0\b/i.test(short) ||
    /^(?:public domain|PD\b|PDM\b|no known copyright)/i.test(short)
  )
    return { allowed: true, credit: false, short, reason: '' };
  if (/^CC[- ]BY(?:[- ]SA)?(?:[- ]\d(?:\.\d)?)?(?: [A-Za-z-]+)?$/i.test(short))
    return { allowed: true, credit: true, short, reason: '' };
  return {
    allowed: false,
    credit: true,
    short,
    reason: `${short}: not in the allow-list (CC0, public domain, CC BY, CC BY-SA)`,
  };
}

// --------------------------------------------------------------------------------------------------
// Text helpers

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** HTML fragment -> plain text (tags dropped, entities decoded, whitespace collapsed). */
export function stripHtml(html) {
  return String(html ?? '')
    .replace(/<(?:script|style)[\s\S]*?<\/(?:script|style)>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
      if (entity[0] === '#') {
        const code =
          entity[1].toLowerCase() === 'x'
            ? parseInt(entity.slice(2), 16)
            : parseInt(entity.slice(1), 10);
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** "File:Some name.jpg" -> "some-name" (ASCII, lowercase, no extension). */
export function fileStem(title) {
  return (
    String(title)
      .replace(/^File:/i, '')
      .replace(/\.[A-Za-z0-9]{2,5}$/, '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '') || 'image'
  );
}

export function orientationOf(width, height) {
  if (Math.abs(width - height) / Math.max(width, height) < 0.05)
    return 'square';
  return width > height ? 'landscape' : 'portrait';
}

// --------------------------------------------------------------------------------------------------
// Commons API response -> candidates

/** One page of a formatversion=2 `prop=imageinfo` response -> a normalized candidate, or null without imageinfo. */
export function toCandidate(page) {
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const value = (key) => meta[key]?.value ?? '';
  const license = classifyLicense(
    value('LicenseShortName'),
    value('UsageTerms'),
  );
  const author = stripHtml(value('Artist'));
  const result = {
    pageid: page.pageid,
    title: page.title,
    sourcePage:
      info.descriptionurl ??
      `https://commons.wikimedia.org/wiki/${encodeURI(page.title.replace(/ /g, '_'))}`,
    width: info.width,
    height: info.height,
    orientation: orientationOf(info.width, info.height),
    mime: info.mime,
    bytes: info.size,
    originalUrl: String(info.url ?? '').split('?')[0],
    author,
    license: license.short,
    licenseUrl: value('LicenseUrl'),
    credit: license.credit,
    description: stripHtml(value('ImageDescription')).slice(0, 200),
    restrictions: stripHtml(value('Restrictions')),
    allowed: license.allowed,
    rejection: license.reason,
  };
  if (result.allowed && !MIME_EXTENSIONS[result.mime]) {
    result.allowed = false;
    result.rejection = `${result.mime || 'unknown type'}: only JPEG, PNG and WebP are used`;
  }
  if (result.allowed && result.credit && !author) {
    result.allowed = false;
    result.rejection =
      'author missing, so the required credit cannot be written';
  }
  if (result.allowed && !result.credit && !author)
    result.author = 'Unknown author';
  return result;
}

export function candidatesFromResponse(json) {
  const pages = json?.query?.pages ?? [];
  return [...pages]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(toCandidate)
    .filter(Boolean);
}

/** Apply --min-width / --orientation and split by license. Returns { usable, rejected, filtered }. */
export function filterCandidates(
  candidates,
  { minWidth = 0, orientation } = {},
) {
  const usable = [];
  const rejected = [];
  let filtered = 0;
  for (const c of candidates) {
    if (!c.allowed) rejected.push(c);
    else if (
      c.width < minWidth ||
      (orientation && c.orientation !== orientation)
    )
      filtered += 1;
    else usable.push(c);
  }
  return { usable, rejected, filtered };
}

// --------------------------------------------------------------------------------------------------
// HTTP client: throttle, retry with backoff, User-Agent

export class RequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

/** Seconds to wait from a Retry-After header (delta-seconds or HTTP date), or null. */
export function parseRetryAfter(value, now = Date.now()) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const date = Date.parse(text);
  return Number.isNaN(date) ? null : Math.max(0, (date - now) / 1000);
}

/**
 * Throttled fetch with retries. Every request starts at least `minIntervalMs` after the previous one.
 * HTTP 429 and 503 (and network errors) are retried up to `maxRetries` times: the wait is Retry-After
 * when given, else 2^attempt seconds, never more than `maxWaitMs`. Other statuses are returned as is.
 * `stats` counts the waits so a run log can mention them.
 */
export function createClient({
  fetch: fetchFn = globalThis.fetch,
  sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
  now = Date.now,
  minIntervalMs = 1000,
  maxRetries = 6,
  maxWaitMs = 60_000,
  timeoutMs = 30_000,
  log = () => {},
} = {}) {
  let lastStart = -Infinity;
  const stats = { requests: 0, retries: 0, waitedMs: 0 };

  async function throttle() {
    const wait = lastStart + minIntervalMs - now();
    if (wait > 0) await sleep(wait);
    lastStart = now();
  }

  async function request(url, init = {}) {
    for (let attempt = 0; ; attempt += 1) {
      await throttle();
      stats.requests += 1;
      let response;
      let failure = null;
      try {
        response = await fetchFn(url, {
          ...init,
          headers: { 'user-agent': USER_AGENT, ...init.headers },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        failure = error?.cause?.code ?? error?.message ?? 'request failed';
      }
      const retryable =
        failure !== null || response.status === 429 || response.status === 503;
      if (!retryable) return response;
      if (attempt >= maxRetries)
        throw new RequestError(
          failure !== null
            ? `request failed after ${attempt + 1} attempts (${failure}): ${url}`
            : `HTTP ${response.status} after ${attempt + 1} attempts: ${url}`,
          response?.status ?? 0,
        );
      const asked = parseRetryAfter(
        response?.headers?.get?.('retry-after'),
        now(),
      );
      const waitMs = Math.min(
        maxWaitMs,
        Math.max(asked !== null ? asked * 1000 : 0, 2 ** attempt * 1000),
      );
      stats.retries += 1;
      stats.waitedMs += waitMs;
      log(
        `${failure !== null ? failure : `HTTP ${response.status}`}; waiting ${(waitMs / 1000).toFixed(1)} s (retry ${attempt + 1}/${maxRetries})`,
      );
      await sleep(waitMs);
    }
  }
  return { request, stats };
}

// --------------------------------------------------------------------------------------------------
// Commons API calls

function apiUrl(params) {
  return `${API}?${new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: String(STANDARD_WIDTHS[0]),
    iiextmetadatafilter: METADATA_KEYS,
    ...params,
  })}`;
}

async function apiJson(client, url) {
  const response = await client.request(url, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok)
    throw new RequestError(
      `Commons API answered HTTP ${response.status}`,
      response.status,
    );
  return response.json();
}

/** Search Commons files. Returns { usable, rejected, filtered } (see filterCandidates). */
export async function searchImages(client, query, options = {}) {
  const limit = options.limit ?? 10;
  const json = await apiJson(
    client,
    apiUrl({
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6',
      // Ask for more than `limit`: license, size and orientation filters drop some.
      gsrlimit: String(Math.min(50, Math.max(limit * 3, 10))),
    }),
  );
  const result = filterCandidates(candidatesFromResponse(json), options);
  return { ...result, usable: result.usable.slice(0, limit) };
}

/** Search the chosen sources (default Commons). Results of every source are concatenated, Commons first. */
export async function searchAll(client, query, options = {}) {
  const sources = options.sources ?? ['commons'];
  const merged = { usable: [], rejected: [], filtered: 0 };
  for (const source of sources) {
    const result =
      source === 'met'
        ? await searchMet(client, query, options)
        : await searchImages(client, query, options);
    merged.usable.push(...result.usable.map((c) => ({ source, ...c })));
    merged.rejected.push(...result.rejected);
    merged.filtered += result.filtered;
  }
  return merged;
}

/** "File:X.jpg", "X.jpg", a page id, or a commons.wikimedia.org/wiki/File:X.jpg URL -> API params. */
export function lookupParams(ref) {
  const text = String(ref).trim();
  if (/^\d+$/.test(text)) return { pageids: text };
  let title = text;
  if (/^https?:\/\//i.test(text)) {
    const url = new URL(text);
    if (!/(^|\.)commons\.wikimedia\.org$/.test(url.hostname))
      throw new Error(`not a Commons URL: ${text}`);
    title = decodeURIComponent(url.pathname.replace(/^\/wiki\//, ''));
  }
  title = title.replace(/_/g, ' ');
  return { titles: /^File:/i.test(title) ? title : `File:${title}` };
}

export async function lookupImage(client, ref) {
  const json = await apiJson(client, apiUrl(lookupParams(ref)));
  const [candidate] = candidatesFromResponse(json);
  if (!candidate || json.query.pages[0]?.missing)
    throw new Error(`no such file on Commons: ${ref}`);
  return candidate;
}

// --------------------------------------------------------------------------------------------------
// The Met Open Access API (public-domain objects only)

/**
 * An object record of `/public/collection/v1/objects/{id}` -> a normalized candidate, or null when it is
 * not usable: not public domain, or no image. The museum asks to be credited, so `credit` is true and the
 * museum's credit line is kept. The API gives no pixel size, so width and height are null.
 */
export function toMetCandidate(object) {
  if (!object || object.isPublicDomain !== true || !object.primaryImage)
    return null;
  const title = stripHtml(object.title) || 'Untitled';
  const author =
    stripHtml(object.artistDisplayName) ||
    stripHtml(object.culture) ||
    'Unknown artist';
  return {
    source: 'met',
    objectId: object.objectID,
    title,
    sourcePage:
      object.objectURL ||
      `https://www.metmuseum.org/art/collection/search/${object.objectID}`,
    width: null,
    height: null,
    orientation: null,
    mime: 'image/jpeg',
    originalUrl: object.primaryImage,
    smallUrl: object.primaryImageSmall || '',
    author,
    license: MET_LICENSE,
    licenseUrl: MET_LICENSE_URL,
    credit: true,
    creditLine: stripHtml(object.creditLine),
    date: stripHtml(object.objectDate),
    description: [title, stripHtml(object.objectDate), stripHtml(object.medium)]
      .filter(Boolean)
      .join(', ')
      .slice(0, 200),
    allowed: true,
    rejection: '',
  };
}

/** Object id from "met:436535" or a metmuseum.org collection URL; null for anything else. */
export function parseMetRef(ref) {
  const text = String(ref).trim();
  const short = /^met:(\d+)$/i.exec(text);
  if (short) return Number(short[1]);
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      if (/(^|\.)metmuseum\.org$/.test(url.hostname)) {
        const id = /\/(\d+)\/?$/.exec(url.pathname);
        if (id) return Number(id[1]);
      }
    } catch {
      // not a URL
    }
  }
  return null;
}

async function metJson(client, url) {
  const response = await client.request(url, {
    headers: { accept: 'application/json' },
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new RequestError(
      `The Met API answered HTTP ${response.status}: ${url}`,
      response.status,
    );
  return response.json();
}

export async function metObject(client, id) {
  return metJson(client, `${MET_API}/v1/objects/${id}`);
}

/**
 * Search the Met's public-domain objects that have images. The search endpoint is v1.1 (v1 was retired);
 * every hit is then read from the objects endpoint, one request each, until `limit` are usable.
 */
export async function searchMet(client, query, options = {}) {
  const limit = options.limit ?? 10;
  const params = new URLSearchParams({
    q: query,
    hasImages: 'true',
    isPublicDomain: 'true',
    offset: '0',
    limit: String(Math.min(100, limit * 2)),
  });
  const found = await metJson(client, `${MET_API}/v1.1/search?${params}`);
  const ids = Array.isArray(found?.objectIDs) ? found.objectIDs : [];
  const usable = [];
  let skipped = 0;
  for (const id of ids) {
    if (usable.length >= limit) break;
    const candidate = toMetCandidate(await metObject(client, id));
    if (candidate) usable.push(candidate);
    else skipped += 1;
  }
  return { usable, rejected: [], filtered: skipped, total: found?.total ?? 0 };
}

// --------------------------------------------------------------------------------------------------
// Download

/** Smallest standard width >= requested (at most 1920). */
export function pickWidth(requested = DEFAULT_WIDTH) {
  return (
    STANDARD_WIDTHS.find((w) => w >= requested) ??
    STANDARD_WIDTHS[STANDARD_WIDTHS.length - 1]
  );
}

/**
 * URL to download: the original when it is not wider than the chosen standard width, else the
 * upload.wikimedia.org thumbnail of that width. Returns { url, width, original }.
 */
export function downloadTarget(candidate, requestedWidth) {
  const width = pickWidth(requestedWidth);
  if (candidate.width <= width)
    return {
      url: candidate.originalUrl,
      width: candidate.width,
      original: true,
    };
  const url = new URL(candidate.originalUrl);
  const match =
    /^(\/wikipedia\/[^/]+)\/((?:[0-9a-f]\/[0-9a-f]{2})\/)(.+)$/.exec(
      url.pathname,
    );
  if (!match) throw new Error(`unexpected image URL: ${candidate.originalUrl}`);
  const [, base, hashDir, name] = match;
  url.pathname = `${base}/thumb/${hashDir}${name}/${width}px-${name}`;
  return { url: url.toString(), width, original: false };
}

const SAFE_FILE = /^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/;

export function chooseFileName(candidate, as) {
  const ext = MIME_EXTENSIONS[candidate.mime];
  if (!as) return `${fileStem(candidate.title)}${ext}`;
  if (as !== basename(as))
    throw new Error(`--as must be a plain file name, got "${as}"`);
  const name = /\.[A-Za-z0-9]+$/.test(as) ? as : `${as}${ext}`;
  if (!SAFE_FILE.test(name))
    throw new Error(
      `--as "${as}": use lowercase letters, digits, "-", "_" and "." with a .jpg, .png or .webp extension`,
    );
  return name;
}

export function readManifest(file) {
  if (!existsSync(file)) return { images: [] };
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (!data || !Array.isArray(data.images))
    throw new Error(`${file}: expected {"images": [...]}`);
  return data;
}

export function writeManifest(file, manifest) {
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(temporary, file);
}

/** The manifest entry for a downloaded candidate. */
export function manifestEntry(
  candidate,
  file,
  { note = '', now = new Date() } = {},
) {
  return {
    file,
    title: candidate.title,
    sourcePage: candidate.sourcePage,
    author: candidate.author,
    license: candidate.license,
    licenseUrl: candidate.licenseUrl,
    credit: candidate.credit,
    ...(candidate.source === 'met'
      ? {
          source: 'met',
          objectId: candidate.objectId,
          creditLine: candidate.creditLine,
        }
      : {}),
    retrievedAt: now.toISOString(),
    note,
  };
}

async function lookupMet(client, id) {
  const object = await metObject(client, id);
  if (!object) throw new Error(`no such object at The Met: ${id}`);
  const candidate = toMetCandidate(object);
  if (!candidate)
    throw new Error(
      `Met object ${id} rejected: ${object.isPublicDomain === true ? 'it has no image' : 'it is not in the public domain (Open Access)'}`,
    );
  return candidate;
}

/** Download the primary image, resize it to at most `width` px wide (default 1920) as JPEG, write it. */
async function downloadMet(client, candidate, target, requestedWidth) {
  const width = pickWidth(requestedWidth);
  const response = await client.request(candidate.originalUrl, {
    headers: { accept: 'image/*' },
  });
  if (!response.ok)
    throw new RequestError(
      `download failed: HTTP ${response.status} for ${candidate.originalUrl}`,
      response.status,
    );
  const type = response.headers.get('content-type') ?? '';
  if (!type.startsWith('image/'))
    throw new Error(`download is not an image (${type || 'no content type'})`);
  const source = Buffer.from(await response.arrayBuffer());
  if (!source.length) throw new Error('download is empty');
  // The Met's originals can weigh many MB: keep a web-sized JPEG in the repo.
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(source)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
  return { bytes: data.length, width: info.width };
}

/**
 * Download one file (Commons, or a Met object) into sites/<slug>/src/assets/images/ and append its manifest entry.
 * Rejects licenses outside the allow-list before downloading anything.
 */
export async function getImage(
  client,
  { slug, ref, as, width, note, root = ROOT, now = new Date() },
) {
  const slugError = validateSlug(slug);
  if (slugError) throw new Error(slugError);
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(siteDir))
    throw new Error(
      `sites/${slug} does not exist; run npm run new-site -- ${slug} first`,
    );

  const metId = parseMetRef(ref);
  const candidate =
    metId === null
      ? await lookupImage(client, ref)
      : await lookupMet(client, metId);
  if (!candidate.allowed)
    throw new Error(`${candidate.title} rejected: ${candidate.rejection}`);

  const file = chooseFileName(candidate, as);
  const manifestPath = join(siteDir, 'assets.json');
  const manifest = readManifest(manifestPath);
  const target = join(siteDir, 'src/assets/images', file);
  if (existsSync(target) || manifest.images.some((e) => e.file === file))
    throw new Error(
      `${file} already exists in sites/${slug}; pick another name with --as`,
    );

  if (candidate.source === 'met') {
    const saved = await downloadMet(client, candidate, target, width);
    const entry = manifestEntry(candidate, file, { note, now });
    manifest.images.push(entry);
    writeManifest(manifestPath, manifest);
    return { entry, path: target, ...saved, original: false };
  }

  const download = downloadTarget(candidate, width);
  const response = await client.request(download.url, {
    headers: { accept: 'image/*' },
  });
  if (!response.ok)
    throw new RequestError(
      `download failed: HTTP ${response.status} for ${download.url}`,
      response.status,
    );
  const type = response.headers.get('content-type') ?? '';
  if (!type.startsWith('image/'))
    throw new Error(`download is not an image (${type || 'no content type'})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('download is empty');

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  const entry = manifestEntry(candidate, file, { note, now });
  manifest.images.push(entry);
  writeManifest(manifestPath, manifest);
  return {
    entry,
    path: target,
    bytes: bytes.length,
    width: download.width,
    original: download.original,
  };
}

// --------------------------------------------------------------------------------------------------
// CLI

const HELP = `Usage:
  node scripts/find-images.mjs search "<query>" [--source commons,met] [--limit N] [--min-width W] [--orientation O] [--json]
  node scripts/find-images.mjs get <site-slug> <ref> [--as <file>] [--width W] [--note <text>] [--json]

search   Search Wikimedia Commons (default) and/or The Met Open Access collection. Lists usable images with
         size, orientation, license and author.
           --source LIST      commons, met or commons,met (default commons). Met results are public-domain
                              objects with images; they carry no pixel size, so --min-width and
                              --orientation do not apply to them. Each needs one request, so it is slow.
           --limit N          results to show (default 10)
           --min-width W      original width at least W px
           --orientation O    landscape, portrait or square
get      Download one file into sites/<site-slug>/src/assets/images/ and append its entry
         (file, title, sourcePage, author, license, licenseUrl, credit, retrievedAt, note) to
         sites/<site-slug>/assets.json. Run scripts/credits.mjs afterwards.
           <ref>              a Commons title, page id or URL; or met:<objectID> / a metmuseum.org collection
                              URL for The Met (resized to a web JPEG; entry gets source "met" and the
                              museum's creditLine, credit true)
           --as <file>        file name (default: slug of the Commons title)
           --width W          960, 1280 or 1920 (default 1920; the original is used when it is smaller)
           --note <text>      free text stored in the manifest (what the photo shows, crop plans)

Licenses kept: CC0, public domain, CC BY, CC BY-SA; Met objects flagged public domain (Open Access). NonCommercial, NoDerivatives and unknown licenses are
rejected with the reason. Requests are throttled (1 s apart) and retried on HTTP 429/503 with backoff.
Exit codes: 0 ok, 1 nothing usable / rejected / request failed, 2 bad usage.`;

const stderrLog = (message) => console.error(`find-images: ${message}`);

export async function main(argv, io = console, clientOptions = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        limit: { type: 'string' },
        'min-width': { type: 'string' },
        orientation: { type: 'string' },
        source: { type: 'string' },
        json: { type: 'boolean' },
        as: { type: 'string' },
        width: { type: 'string' },
        note: { type: 'string' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    io.error(`find-images: ${error.message}\n\n${HELP}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  const [command, ...args] = positionals;
  const usage = (message) => {
    io.error(`find-images: ${message}\n\n${HELP}`);
    return 2;
  };
  const integer = (name, text, min = 1) => {
    if (text === undefined) return undefined;
    const n = Number(text);
    if (!Number.isInteger(n) || n < min)
      throw new Error(`--${name} must be an integer >= ${min}`);
    return n;
  };

  let limit, minWidth, width;
  try {
    limit = integer('limit', values.limit);
    minWidth = integer('min-width', values['min-width']);
    width = integer('width', values.width);
  } catch (error) {
    return usage(error.message);
  }
  if (values.orientation && !ORIENTATIONS.includes(values.orientation))
    return usage(`--orientation must be one of ${ORIENTATIONS.join(', ')}`);

  const sources = (values.source ?? 'commons')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (!sources.length || sources.some((x) => !SOURCES.includes(x)))
    return usage(`--source must be a comma list of ${SOURCES.join(', ')}`);

  const client = createClient({ log: stderrLog, ...clientOptions });
  const waits = () => {
    if (client.stats.retries)
      stderrLog(
        `rate limit: ${client.stats.retries} retries, ${(client.stats.waitedMs / 1000).toFixed(0)} s waited`,
      );
  };

  try {
    if (command === 'search') {
      if (args.length !== 1 || !args[0].trim())
        return usage('search needs exactly one query, in quotes');
      const result = await searchAll(client, args[0], {
        limit,
        minWidth,
        orientation: values.orientation,
        sources,
      });
      waits();
      if (values.json) io.log(JSON.stringify(result.usable, null, 2));
      else {
        result.usable.forEach((c, i) => {
          const size = c.width
            ? `${c.width}x${c.height} ${c.orientation}`
            : 'size unknown';
          const ref =
            c.source === 'met' ? `   get ref: met:${c.objectId}\n` : '';
          io.log(
            `${i + 1}. ${c.source === 'commons' ? '' : `[${c.source}] `}${c.title}\n   ${size}, ${c.license}${c.credit ? ' (credit required)' : ''}, author: ${c.author}\n${ref}   ${c.sourcePage}${c.description ? `\n   ${c.description}` : ''}`,
          );
        });
        io.log(
          `\n${result.usable.length} usable, ${result.rejected.length} rejected by license, ${result.filtered} filtered by size or orientation.`,
        );
        for (const c of result.rejected.slice(0, 5))
          io.log(`  rejected ${c.title}: ${c.rejection}`);
      }
      return result.usable.length ? 0 : 1;
    }
    if (command === 'get') {
      if (args.length !== 2)
        return usage('get needs <site-slug> and <commons-title|page-id|url>');
      const result = await getImage(client, {
        slug: args[0],
        ref: args[1],
        as: values.as,
        width,
        note: values.note,
        // Tests only: keep sites/ in another folder.
        ...(process.env.LANDING_FACTORY_ROOT
          ? { root: resolve(process.env.LANDING_FACTORY_ROOT) }
          : {}),
      });
      waits();
      if (values.json) io.log(JSON.stringify(result.entry, null, 2));
      else
        io.log(
          `Saved ${result.entry.file} (${result.width} px wide${result.original ? ', original' : ''}, ${(result.bytes / 1024).toFixed(0)} KB) to sites/${args[0]}/src/assets/images/\n  ${result.entry.title}\n  ${result.entry.author}, ${result.entry.license}${result.entry.credit ? ' (credit required)' : ''}\nAppended to sites/${args[0]}/assets.json. Next: node scripts/credits.mjs --site ${args[0]}`,
        );
      return 0;
    }
  } catch (error) {
    waits();
    io.error(`find-images: ${error.message}`);
    return 1;
  }
  return usage(
    command ? `unknown command "${command}"` : 'a command is required',
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url) &&
  !reexecWithEnvProxy()
) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error);
      process.exitCode = 2;
    },
  );
}
