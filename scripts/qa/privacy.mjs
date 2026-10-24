// Privacy record of one page load: the cookies the page set (names and domains, never values), the keys in
// local and session storage (never values) and the third-party hosts it requested.
// Design: openspec/changes/add-legal-compliance/design.md, Decision 1.

/** Runs INSIDE the page (page.evaluate): only the keys of both storages. Self-contained. */
export function readStorageKeys() {
  const keys = (storage) => {
    try {
      return Object.keys(storage).sort();
    } catch {
      return [];
    }
  };
  return {
    local: keys(window.localStorage),
    session: keys(window.sessionStorage),
  };
}

/** Is `domain` (a cookie domain, maybe with a leading dot) the host itself or a parent of it? */
export function domainCoversHost(domain, host) {
  const d = String(domain).replace(/^\./, '').toLowerCase();
  const h = String(host).toLowerCase();
  return h === d || h.endsWith(`.${d}`);
}

/**
 * Start recording the hosts a page requests. Call before `page.goto`.
 * Returns { hosts() } with the sorted hosts other than the page's own host (http, https and ws only).
 */
export function recordRequestHosts(page, pageUrl) {
  const own = new URL(pageUrl).hostname;
  const seen = new Set();
  page.on('request', (request) => {
    let url;
    try {
      url = new URL(request.url());
    } catch {
      return;
    }
    if (!/^(https?|wss?):$/.test(url.protocol)) return;
    if (url.hostname && url.hostname !== own) seen.add(url.hostname);
  });
  return { hosts: () => [...seen].sort() };
}

/**
 * The privacy record of a loaded page. `context` is the page's browser context.
 * Cookie values are dropped here: every field is copied by name, never the whole cookie object.
 */
export async function collectPrivacy({
  context,
  page,
  pageUrl,
  recorder,
  viewport,
}) {
  const own = new URL(pageUrl).hostname;
  const cookies = (await context.cookies())
    .map((cookie) => ({
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      session: cookie.expires === -1,
      thirdParty: !domainCoversHost(cookie.domain, own),
    }))
    .sort((a, b) => (a.name + a.domain < b.name + b.domain ? -1 : 1));
  let storage = { local: [], session: [] };
  try {
    storage = await page.evaluate(readStorageKeys);
  } catch {
    // a page that navigated away or blocks storage: leave the keys empty
  }
  return {
    viewport,
    cookies,
    storage: { local: storage.local, session: storage.session },
    thirdPartyHosts: recorder.hosts(),
  };
}
