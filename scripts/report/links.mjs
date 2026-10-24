// Outbound link health (--external-links): each link once, sequentially, never retried around a block.
import { request, sleep } from './http.mjs';
import { cap, makeItem } from './items.mjs';

const BLOCK_STATUS = new Set([401, 403, 429, 999]);
const CHALLENGE_HEADERS = [
  'cf-mitigated',
  'x-datadome',
  'x-datadome-cid',
  'x-px-blocked',
];

/** Host names that must not be requested from a CI runner or a laptop (loopback, private ranges). */
export function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '::1' ||
    /^(127|10|0)\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^f[cd][0-9a-f]{2}:/.test(host)
  );
}

/** Classify one response: 'ok', 'unverified' (a block or challenge), or 'broken'. */
export function classifyLink(response) {
  if (response.ok === false && response.code === 'UND_ERR_ABORTED')
    // The connection was cancelled before any answer (a proxy or firewall in between): not the link's fault.
    return {
      state: 'unverified',
      detail: `connection cancelled by the network (${response.error})`,
    };
  if (!response.ok) return { state: 'broken', detail: response.error };
  const challenge = CHALLENGE_HEADERS.find((h) => h in response.headers);
  if (BLOCK_STATUS.has(response.status) || challenge)
    return {
      state: 'unverified',
      detail: `${response.status}${challenge ? ` (${challenge})` : ''}`,
    };
  if (response.status >= 200 && response.status < 400)
    return { state: 'ok', detail: String(response.status) };
  return { state: 'broken', detail: String(response.status) };
}

/**
 * Request each link once (HEAD, then GET without reading the body when HEAD is not usable).
 * `links` is [{ url, pages }]. Returns { results, skipped } where results are
 * { url, pages, state, detail }.
 */
export async function checkLinks({
  links,
  max = 50,
  gapMs = 250,
  timeoutMs = 10000,
  fetchImpl = globalThis.fetch,
  allowPrivate = false,
  sleepFn = sleep,
}) {
  const unique = [...new Map(links.map((l) => [l.url, l])).values()];
  const selected = unique.slice(0, max);
  const skipped = unique.slice(max).map((l) => l.url);
  const results = [];
  let first = true;
  for (const link of selected) {
    const host = new URL(link.url).hostname;
    if (!allowPrivate && isPrivateHost(host)) {
      results.push({
        ...link,
        state: 'unverified',
        detail: 'private or local address, not requested',
      });
      continue;
    }
    if (!first) await sleepFn(gapMs);
    first = false;
    let response = await request(link.url, {
      method: 'HEAD',
      redirect: 'follow',
      timeoutMs,
      fetchImpl,
      retries: 0,
    });
    // HEAD may be unsupported: fall back to GET once, without reading the body. A block is never retried.
    const blocked =
      response.ok &&
      (BLOCK_STATUS.has(response.status) ||
        CHALLENGE_HEADERS.some((h) => h in response.headers));
    if (!blocked && (!response.ok || [404, 405, 501].includes(response.status)))
      response = await request(link.url, {
        method: 'GET',
        redirect: 'follow',
        timeoutMs,
        fetchImpl,
        retries: 0,
      });
    results.push({ ...link, ...classifyLink(response) });
  }
  return { results, skipped };
}

export function linkItem({ results, skipped }) {
  const ok = results.filter((r) => r.state === 'ok');
  const unverified = results.filter((r) => r.state === 'unverified');
  const broken = results.filter((r) => r.state === 'broken');
  const lines = [
    ...broken.map(
      (r) => `BROKEN ${r.url}: ${r.detail} (on ${r.pages.join(', ')})`,
    ),
    ...unverified.map((r) => `unverified ${r.url}: ${r.detail}`),
    ...ok.map((r) => `ok ${r.url}: ${r.detail}`),
    ...(skipped.length
      ? [`not checked (over the limit): ${skipped.length} link(s)`]
      : []),
  ];
  return makeItem({
    id: 'external-links',
    area: 'security',
    owasp: 'A10',
    status: results.length ? (broken.length ? 'warn' : 'pass') : 'na',
    title: results.length
      ? `Outbound links: ${ok.length} ok, ${unverified.length} unverified, ${broken.length} broken`
      : 'No outbound links to check',
    evidence: cap(lines, 60),
    fix: 'Fix or remove the broken links. "Unverified" means the site blocks bots (403, 429 or a challenge): check those by hand in a browser.',
  });
}

/** The unique outbound http(s) <a> links of scanned pages: [{ url, pages }], excluding the site's own origin. */
export function outboundLinks(pages, siteOrigin) {
  const map = new Map();
  for (const page of pages)
    for (const tag of page.scan.tags) {
      if (tag.name !== 'a' || !tag.attrs.href) continue;
      let url;
      try {
        url = new URL(
          tag.attrs.href.startsWith('//')
            ? `https:${tag.attrs.href}`
            : tag.attrs.href,
        );
      } catch {
        continue;
      }
      if (!/^https?:$/.test(url.protocol)) continue;
      if (siteOrigin && url.origin === siteOrigin) continue;
      url.hash = '';
      const entry = map.get(url.href) ?? { url: url.href, pages: [] };
      if (!entry.pages.includes(page.path)) entry.pages.push(page.path);
      map.set(url.href, entry);
    }
  return [...map.values()];
}
