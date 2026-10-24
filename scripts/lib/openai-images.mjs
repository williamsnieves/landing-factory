// A small OpenAI Images API adapter: one POST to `${baseUrl}/v1/images/generations`, no SDK.
// Design: openspec/changes/add-ai-images/design.md, Decision 1.
//
// The API key is read from the `apiKey` option or `process.env.OPENAI_API_KEY` and goes only into the
// Authorization header of the request. It is never returned, logged or put in an error: every error text
// passes through `redact()`, which removes the exact key and masks anything shaped like a secret key.
import { mask } from '../report/mask.mjs';

export const DEFAULT_BASE_URL = 'https://api.openai.com';
export const KEY_VARIABLE = 'OPENAI_API_KEY';
export const TERMS_URL = 'https://openai.com/policies/terms-of-use/';
export const GENERATOR = 'openai';
export const FORMATS = { webp: '.webp', png: '.png', jpeg: '.jpg' };
export const TIMEOUT_MS = 180_000;

/** An error whose message is already safe to print. `code` tells the CLI which failure it is. */
export class ImageApiError extends Error {
  constructor(message, code = 'api', status = 0) {
    super(message);
    this.name = 'ImageApiError';
    this.code = code;
    this.status = status;
  }
}

const SECRET_SHAPE = /\bsk-[A-Za-z0-9_-]{8,}/g;

/** Text without the key (exact replacement) and without anything shaped like a secret key (mask()). */
export function redact(text, apiKey = '') {
  let out = String(text ?? '');
  if (apiKey) out = out.split(apiKey).join('[redacted key]');
  return out.replace(SECRET_SHAPE, (match) => mask(match));
}

/** The request without its headers: what `--dry-run` prints and what the adapter sends as the body. */
export function buildRequest({
  prompt,
  model,
  size,
  quality,
  format = 'webp',
  baseUrl = process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL,
}) {
  if (!FORMATS[format]) throw new Error(`unknown output format "${format}"`);
  return {
    url: `${String(baseUrl).replace(/\/+$/, '')}/v1/images/generations`,
    body: {
      model,
      prompt,
      size,
      quality,
      n: 1,
      output_format: format,
      ...(format === 'png' ? {} : { output_compression: 90 }),
    },
  };
}

/** Does the buffer start like a WebP, PNG or JPEG file? */
export function imageFormatOf(bytes) {
  if (bytes.length < 12) return null;
  if (
    bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
    bytes.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    return 'webp';
  if (bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
    return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'jpeg';
  return null;
}

/**
 * Generate one image. Returns { bytes, format, revisedPrompt, usage, requestId }.
 * Throws ImageApiError ('no-key' before any request, 'network', 'api', 'response').
 */
export async function generateImage({
  prompt,
  model,
  size,
  quality,
  format = 'webp',
  fetchImpl = globalThis.fetch,
  baseUrl,
  apiKey = process.env[KEY_VARIABLE],
  timeoutMs = TIMEOUT_MS,
}) {
  if (!apiKey || !String(apiKey).trim())
    throw new ImageApiError(
      `${KEY_VARIABLE} is not set; export it in the environment (never pass it as an argument)`,
      'no-key',
    );
  const key = String(apiKey).trim();
  const request = buildRequest({
    prompt,
    model,
    size,
    quality,
    format,
    baseUrl,
  });

  let response;
  try {
    response = await fetchImpl(request.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ImageApiError(
      redact(`request to ${request.url} failed: ${error.message}`, key),
      'network',
    );
  }

  const requestId = response.headers?.get?.('x-request-id') ?? '';
  const raw = await response.text().catch(() => '');
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    // not JSON: handled below
  }

  if (!response.ok) {
    const message =
      data?.error?.message ?? (raw.trim().slice(0, 300) || response.statusText);
    throw new ImageApiError(
      redact(
        `OpenAI Images API answered HTTP ${response.status}: ${message}${requestId ? ` (request ${requestId})` : ''}`,
        key,
      ),
      'api',
      response.status,
    );
  }

  const item = data?.data?.[0];
  if (!item?.b64_json || typeof item.b64_json !== 'string')
    throw new ImageApiError(
      'OpenAI Images API answered without image data (expected data[0].b64_json)',
      'response',
      response.status,
    );
  const bytes = Buffer.from(item.b64_json, 'base64');
  const detected = imageFormatOf(bytes);
  if (!detected)
    throw new ImageApiError(
      'OpenAI Images API returned data that is not a WebP, PNG or JPEG image',
      'response',
      response.status,
    );
  return {
    bytes,
    format: detected,
    revisedPrompt:
      typeof item.revised_prompt === 'string' ? item.revised_prompt : '',
    usage: data.usage && typeof data.usage === 'object' ? data.usage : null,
    requestId,
  };
}
