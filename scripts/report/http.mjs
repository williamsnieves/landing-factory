// A small fetch wrapper for the live checks: timeout, one retry on a network error, a capped body read,
// and the classification of TLS failures. Node's global fetch honors HTTPS_PROXY when the CLI re-executed
// itself with NODE_USE_ENV_PROXY (see scripts/landing-report.mjs).

export const USER_AGENT =
  'landing-factory-report/0.1 (+https://github.com/williamsnieves/landing-factory)';

const TLS_CODES =
  /^(CERT_|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_|ERR_TLS_|ERR_SSL_|ERR_OSSL_|HOSTNAME_MISMATCH|LEAF_SIGNATURE_VERIFY|EPROTO)/;

/** The deepest error code of a fetch failure (undici wraps the cause in a TypeError). */
export function errorCode(error) {
  let current = error;
  let code = null;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (current.code) code = current.code;
    current = current.cause;
  }
  return code;
}

export const isTlsError = (error) => TLS_CODES.test(errorCode(error) ?? '');

export function describeError(error) {
  const code = errorCode(error);
  const cause = error?.cause?.message ?? error?.message ?? String(error);
  return code ? `${code}: ${cause}` : cause;
}

/**
 * GET/HEAD `url`. Returns { ok: true, status, headers (lowercase map), body (string|null), url } or
 * { ok: false, error, tls }. The body is read up to `maxBytes` when `readBody` is set, else cancelled.
 */
export async function request(
  url,
  {
    method = 'GET',
    redirect = 'manual',
    timeoutMs = 10000,
    readBody = false,
    maxBytes = 1024 * 1024,
    fetchImpl = globalThis.fetch,
    retries = 1,
  } = {},
) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        method,
        redirect,
        headers: { 'user-agent': USER_AGENT, accept: '*/*' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const headers = {};
      response.headers.forEach((value, name) => {
        headers[name.toLowerCase()] = value;
      });
      let body = null;
      if (readBody && response.body) {
        const reader = response.body.getReader();
        const chunks = [];
        let total = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          total += value.length;
          if (total >= maxBytes) {
            await reader.cancel();
            break;
          }
        }
        body = Buffer.concat(chunks).toString('utf8').slice(0, maxBytes);
      } else if (response.body) {
        await response.body.cancel();
      }
      return {
        ok: true,
        status: response.status,
        headers,
        body,
        url: response.url || url,
      };
    } catch (error) {
      lastError = error;
      if (isTlsError(error)) break; // a certificate problem will not fix itself on a retry
    }
  }
  return {
    ok: false,
    error: describeError(lastError),
    tls: isTlsError(lastError),
    code: errorCode(lastError),
  };
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
