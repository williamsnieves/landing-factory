// A small Pixabay API adapter for scripts/find-images.mjs: search, one photo by id, the manifest entry, the
// 24-hour search cache and the key mask. Design: openspec/changes/add-stock-images/design.md.
//
// The API key is read only from PIXABAY_API_KEY (or the `key` option of the library calls). Pixabay takes
// the key as the `key` URL parameter, so every URL that is printed or put in an error passes through
// `maskKey()`, which replaces the parameter with `key=***` and the exact value with `***`. The key is never
// part of a cache file or its name. The only network function is the `client.request` the caller passes in
// (find-images.mjs gives its throttled client with the 429/503 backoff); this module never calls fetch itself.
//
// Test hooks, honored only when NODE_TEST_CONTEXT is set (the Node test runner sets it): PIXABAY_API_URL
// (base URL of a local fake API) and STOCK_IMAGE_HOSTS (comma list of extra image origins).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const PIXABAY_API = 'https://pixabay.com/api/';
export const KEY_VARIABLE = 'PIXABAY_API_KEY';
export const PIXABAY_LICENSE = 'Pixabay Content License';
export const PIXABAY_LICENSE_URL =
  'https://pixabay.com/service/license-summary/';
/** Where downloads may come from in production. */
export const PIXABAY_IMAGE_ORIGINS = [
  'https://pixabay.com',
  'https://cdn.pixabay.com',
];
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Language codes the Pixabay API accepts for `lang`. */
export const PIXABAY_LANGUAGES = [
  'cs',
  'da',
  'de',
  'en',
  'es',
  'fr',
  'id',
  'it',
  'hu',
  'nl',
  'no',
  'pl',
  'pt',
  'ro',
  'sk',
  'fi',
  'sv',
  'tr',
  'vi',
  'th',
  'bg',
  'ru',
  'el',
  'ja',
  'ko',
  'zh',
];
const ORIENTATION_PARAM = {
  landscape: 'horizontal',
  portrait: 'vertical',
  square: 'all',
};

/** An error whose message is already safe to print (the key is masked). */
export class PixabayError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'PixabayError';
    this.status = status;
  }
}

// --------------------------------------------------------------------------------------------------
// Key

/** Text without the key: the `key` URL parameter becomes `key=***` and the exact value `***`. */
export function maskKey(text, key = process.env[KEY_VARIABLE] ?? '') {
  let out = String(text ?? '').replace(/([?&]key=)[^&\s"'#<>]*/gi, '$1***');
  if (key) {
    for (const form of new Set([key, encodeURIComponent(key)]))
      out = out.split(form).join('***');
  }
  return out;
}

/** The key from the environment, or a PixabayError telling where to set it. */
export function readKey(env = process.env) {
  const key = String(env[KEY_VARIABLE] ?? '').trim();
  if (!key)
    throw new PixabayError(
      `${KEY_VARIABLE} is not set: set ${KEY_VARIABLE} in the environment's settings (see docs/images.md)`,
    );
  return key;
}

const testContext = (env) => Boolean(env.NODE_TEST_CONTEXT);

/** The API base URL: the fake one from PIXABAY_API_URL only in a test run. */
export function apiBase(env = process.env) {
  return testContext(env) && env.PIXABAY_API_URL
    ? env.PIXABAY_API_URL
    : PIXABAY_API;
}

/** Origins downloads may come from. Extra test origins only in a test run. */
export function imageOrigins(env = process.env) {
  const extra = testContext(env)
    ? String(env.STOCK_IMAGE_HOSTS ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
  return [...PIXABAY_IMAGE_ORIGINS, ...extra];
}

/** Throws unless `url` is on an allowed origin (https for Pixabay). Names the host otherwise. */
export function assertImageOrigin(url, env = process.env) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new PixabayError(`the download URL is not a URL: ${maskKey(url)}`);
  }
  if (!imageOrigins(env).includes(parsed.origin))
    throw new PixabayError(
      `the download host ${parsed.host} is not a Pixabay host (allowed: ${imageOrigins(
        env,
      )
        .map((o) => new URL(o).host)
        .join(', ')}); nothing was downloaded`,
    );
  return parsed;
}

// --------------------------------------------------------------------------------------------------
// References

/** Photo id from "pixabay:123" or a pixabay.com photo page URL; null for anything else. */
export function parsePixabayRef(ref) {
  const text = String(ref).trim();
  const short = /^pixabay:(\d+)$/i.exec(text);
  if (short) return Number(short[1]);
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      if (/^(?:www\.)?pixabay\.com$/i.test(url.hostname)) {
        const id =
          /^\/(?:[a-z]{2}\/)?(?:photos|images)\/[^/]*?-?(\d+)\/?$/i.exec(
            url.pathname,
          );
        if (id) return Number(id[1]);
      }
    } catch {
      // not a URL
    }
  }
  return null;
}

// --------------------------------------------------------------------------------------------------
// Hits -> candidates

const upperFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** "physiotherapy, back, massage, spa" -> "Physiotherapy, back, massage". */
/** Pixabay repeats tags ("masaje, masaje, masaje"); keep each once, in order. */
export function uniqueTags(tags) {
  const seen = new Set();
  return String(tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(
      (tag) =>
        tag && !seen.has(tag.toLowerCase()) && seen.add(tag.toLowerCase()),
    )
    .join(', ');
}

/** Long side of Pixabay's large image (`largeImageURL`). */
export const LARGE_IMAGE_SIDE = 1280;

/** Width of the large image Pixabay serves for a photo of `width` x `height`. */
export function largeImageWidth(width, height) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  const long = Math.max(w, h);
  return long > LARGE_IMAGE_SIDE
    ? Math.round((w * LARGE_IMAGE_SIDE) / long)
    : w;
}

export function titleFromTags(tags) {
  const first = String(tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 3);
  return first.length ? upperFirst(first.join(', ')) : 'Pixabay photo';
}

const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** One API hit -> a normalized candidate, or null when it lacks an id, a download URL or a user. */
export function toPixabayCandidate(hit) {
  if (!hit || !Number.isInteger(hit.id) || !hit.largeImageURL || !hit.user)
    return null;
  const width = Number(hit.imageWidth) || null;
  const height = Number(hit.imageHeight) || null;
  const ext = /\.([a-z0-9]{3,4})(?:\?|$)/i.exec(String(hit.largeImageURL))?.[1];
  let sourcePage = `https://pixabay.com/photos/id-${hit.id}/`;
  try {
    const page = new URL(hit.pageURL);
    if (page.protocol === 'https:' && page.hostname === 'pixabay.com')
      sourcePage = page.href;
  } catch {
    // keep the constructed page
  }
  return {
    source: 'pixabay',
    pixabayId: hit.id,
    title: titleFromTags(hit.tags),
    tags: uniqueTags(hit.tags),
    sourcePage,
    width,
    height,
    orientation:
      width && height
        ? Math.abs(width - height) / Math.max(width, height) < 0.05
          ? 'square'
          : width > height
            ? 'landscape'
            : 'portrait'
        : null,
    mime: MIME_BY_EXTENSION[(ext ?? 'jpg').toLowerCase()] ?? 'image/jpeg',
    originalUrl: String(hit.largeImageURL),
    author: String(hit.user),
    authorUrl: hit.user_id
      ? `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/`
      : '',
    license: PIXABAY_LICENSE,
    licenseUrl: PIXABAY_LICENSE_URL,
    credit: true,
    description: uniqueTags(hit.tags).slice(0, 200),
    allowed: true,
    rejection: '',
  };
}

/** The manifest entry for a downloaded Pixabay candidate. */
export function pixabayEntry(
  candidate,
  { file, note = '', now = new Date() } = {},
) {
  return {
    file,
    title: candidate.title,
    sourcePage: candidate.sourcePage,
    author: candidate.author,
    ...(candidate.authorUrl ? { authorUrl: candidate.authorUrl } : {}),
    license: candidate.license,
    licenseUrl: candidate.licenseUrl,
    credit: true,
    source: 'pixabay',
    pixabayId: candidate.pixabayId,
    retrievedAt: now.toISOString(),
    note,
  };
}

// --------------------------------------------------------------------------------------------------
// Requests and the cache

/** Query parameters of a search, without the key, in a fixed order. */
export function searchParams({
  query,
  orientation,
  minWidth,
  lang,
  perPage = 20,
}) {
  const params = new URLSearchParams();
  params.set('q', String(query));
  params.set('image_type', 'photo');
  params.set('safesearch', 'true');
  params.set('per_page', String(Math.min(200, Math.max(3, perPage))));
  if (orientation && ORIENTATION_PARAM[orientation])
    params.set('orientation', ORIENTATION_PARAM[orientation]);
  if (minWidth) params.set('min_width', String(minWidth));
  const code = String(lang ?? '')
    .toLowerCase()
    .split('-')[0];
  if (PIXABAY_LANGUAGES.includes(code)) params.set('lang', code);
  return params;
}

const cacheName = (params) =>
  `${createHash('sha256').update(params.toString()).digest('hex')}.json`;

function readCache(dir, params, now) {
  const file = join(dir, cacheName(params));
  if (!existsSync(file)) return null;
  try {
    const stored = JSON.parse(readFileSync(file, 'utf8'));
    return now() - stored.storedAt < CACHE_TTL_MS ? stored.response : null;
  } catch {
    return null;
  }
}

function writeCache(dir, params, response, now) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, cacheName(params)),
    JSON.stringify({ storedAt: now(), response }),
  );
}

async function apiJson(client, params, key, env) {
  const url = `${apiBase(env)}?${new URLSearchParams({ key, ...Object.fromEntries(params) })}`;
  let response;
  try {
    response = await client.request(url, {
      headers: { accept: 'application/json' },
    });
  } catch (error) {
    throw new PixabayError(maskKey(error.message, key), error.status ?? 0);
  }
  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.text()).slice(0, 160).trim();
    } catch {
      // no body
    }
    throw new PixabayError(
      maskKey(
        `Pixabay API answered HTTP ${response.status} for ${url}${detail ? `: ${detail}` : ''}`,
        key,
      ),
      response.status,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new PixabayError('Pixabay API answered something that is not JSON');
  }
}

/**
 * Search Pixabay photos. `client` is { request(url, init) } (find-images' throttled client). Identical
 * searches (same parameters, key excluded) are answered from `cacheDir` for 24 hours. Returns
 * { usable, rejected: [], filtered, total, cached }.
 */
export async function searchPixabay({
  query,
  orientation,
  minWidth,
  lang,
  perPage = 20,
  limit = 10,
  client,
  key = readKey(),
  cacheDir,
  now = Date.now,
  env = process.env,
}) {
  const params = searchParams({ query, orientation, minWidth, lang, perPage });
  let json = cacheDir ? readCache(cacheDir, params, now) : null;
  const cached = Boolean(json);
  if (!json) {
    json = await apiJson(client, params, key, env);
    if (cacheDir) writeCache(cacheDir, params, json, now);
  }
  const all = (Array.isArray(json?.hits) ? json.hits : [])
    .map(toPixabayCandidate)
    .filter(Boolean);
  // The API has no "square": filter that one here, and keep the width floor for a stale cache entry.
  const usable = all.filter(
    (c) =>
      (!orientation || c.orientation === orientation) &&
      (!minWidth || (c.width ?? 0) >= minWidth),
  );
  return {
    usable: usable.slice(0, limit),
    rejected: [],
    filtered: all.length - usable.length,
    total: json?.totalHits ?? json?.total ?? all.length,
    cached,
  };
}

/** One photo by id (the API's `id` parameter). Throws when Pixabay has no such photo. */
export async function getPixabayPhoto(
  id,
  { client, key = readKey(), env = process.env } = {},
) {
  const json = await apiJson(
    client,
    new URLSearchParams({ id: String(id) }),
    key,
    env,
  );
  const candidate = toPixabayCandidate(json?.hits?.[0]);
  if (!candidate) throw new PixabayError(`no such photo at Pixabay: ${id}`);
  return candidate;
}
