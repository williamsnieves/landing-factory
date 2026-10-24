// Checks on a deployed URL: TLS, HTTP to HTTPS, response headers, caching of hashed assets,
// private paths (judged by the body, not the status) and the answer for an unknown path.
import { randomBytes } from 'node:crypto';

import { headerItems } from './checks-headers.mjs';
import { splitPolicies } from './headers.mjs';
import { request } from './http.mjs';
import { scanHtml } from './html.mjs';
import { makeItem } from './items.mjs';

/** Private paths and how to tell that their real content is served. */
export const PRIVATE_PATHS = [
  {
    path: '/.git/HEAD',
    label: 'git data',
    test: (body) => /^ref:\s/.test(body.trimStart()),
  },
  {
    path: '/.env',
    label: 'environment file',
    test: (body) =>
      !/^\s*</.test(body) && /^[A-Za-z_][A-Za-z0-9_]*\s*=.+$/m.test(body),
  },
  {
    path: '/brief.json',
    label: 'customer brief',
    test: (body) =>
      isJson(body, (j) => j && typeof j === 'object' && 'business' in j),
  },
  {
    path: '/package.json',
    label: 'package manifest',
    test: (body) =>
      isJson(
        body,
        (j) =>
          j &&
          typeof j === 'object' &&
          ('dependencies' in j || 'devDependencies' in j),
      ),
  },
  {
    path: '/assets.json',
    label: 'image manifest',
    test: (body) =>
      isJson(
        body,
        (j) =>
          j && typeof j === 'object' && ('images' in j || Array.isArray(j)),
      ),
  },
];

function isJson(body, predicate) {
  try {
    return Boolean(predicate(JSON.parse(body)));
  } catch {
    return false;
  }
}

const liveNotRun = (id, owasp, title, reason) =>
  makeItem({
    id,
    area: 'security',
    owasp,
    status: 'not-run',
    title: `${title}: not run`,
    evidence: [reason],
    fix: 'Re-run the live checks when the deployed URL is reachable.',
  });

const LIVE_IDS = [
  ['live-tls', 'A04', 'TLS certificate'],
  ['live-https-redirect', 'A04', 'HTTP redirects to HTTPS'],
  ['live-headers-baseline', 'A02', 'Response security headers'],
  ['live-private-paths', 'A01', 'Private paths are not served'],
  ['live-unknown-path', 'A10', 'Unknown paths answer 404'],
  ['live-asset-cache', 'A02', 'Hashed assets are cached'],
];

/**
 * Run the live checks against `baseUrl`. Options: fetchImpl, timeoutMs, allowHttp (a plain-HTTP base, for
 * local servers: the TLS, redirect and HSTS checks become not applicable), random (id for the unknown path).
 * Returns { items, html, policies } where html is the home page body (for outbound link discovery).
 */
export async function runLiveChecks({
  baseUrl,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10000,
  allowHttp = false,
  random = () => randomBytes(6).toString('hex'),
}) {
  const base = new URL(baseUrl);
  const secure = base.protocol === 'https:';
  if (!secure && !allowHttp)
    throw new Error(
      `--url must be an https:// URL (got ${baseUrl}); --allow-http is for local servers only`,
    );
  const origin = base.origin;
  const get = (path, extra = {}) =>
    request(new URL(path, origin).href, { timeoutMs, fetchImpl, ...extra });

  const home = await get('/', { readBody: true, redirect: 'follow' });
  const items = [];

  if (!home.ok) {
    if (home.tls) {
      items.push(
        makeItem({
          id: 'live-tls',
          area: 'security',
          owasp: 'A04',
          status: 'fail',
          title: `TLS check failed for ${base.host}`,
          evidence: [home.error],
          fix: 'Check the certificate of the host (expired, wrong name, incomplete chain). If the error comes from a corporate proxy, run the check from another network.',
        }),
      );
      for (const [id, owasp, title] of LIVE_IDS.slice(1))
        items.push(liveNotRun(id, owasp, title, 'the HTTPS connection failed'));
      return { items, html: null, policies: [] };
    }
    for (const [id, owasp, title] of LIVE_IDS)
      items.push(
        liveNotRun(
          id,
          owasp,
          title,
          `${base.host} is unreachable: ${home.error}`,
        ),
      );
    return { items, html: null, policies: [] };
  }

  // 1. TLS
  items.push(
    secure
      ? makeItem({
          id: 'live-tls',
          area: 'security',
          owasp: 'A04',
          status: 'pass',
          title: `Valid TLS certificate for ${base.host}`,
          evidence: [`GET ${origin}/ answered ${home.status} over HTTPS`],
        })
      : makeItem({
          id: 'live-tls',
          area: 'security',
          owasp: 'A04',
          status: 'na',
          title:
            'Not applicable: a plain-HTTP local server was checked (--allow-http)',
        }),
  );

  // 2. HTTP -> HTTPS
  if (!secure) {
    items.push(
      makeItem({
        id: 'live-https-redirect',
        area: 'security',
        owasp: 'A04',
        status: 'na',
        title:
          'Not applicable: a plain-HTTP local server was checked (--allow-http)',
      }),
    );
  } else {
    const plain = await request(`http://${base.host}/`, {
      timeoutMs,
      fetchImpl,
    });
    let status = 'warn';
    let title;
    let evidence = [];
    if (!plain.ok && ['ENOTFOUND', 'EAI_AGAIN'].includes(plain.code)) {
      // HTTPS resolved, so this machine cannot reach the host over plain HTTP (for example a proxy-only network).
      status = 'not-run';
      title =
        'HTTP to HTTPS redirect: not run (plain HTTP is not reachable from this machine)';
      evidence = [plain.error];
    } else if (!plain.ok) {
      title = 'Plain HTTP is not answered (the host may only serve HTTPS)';
      evidence = [plain.error];
    } else if (
      [301, 308].includes(plain.status) &&
      /^https:\/\//i.test(plain.headers.location ?? '')
    ) {
      status = 'pass';
      title = `HTTP redirects to HTTPS (${plain.status})`;
      evidence = [`Location: ${plain.headers.location}`];
    } else if (plain.status === 200) {
      status = 'fail';
      title = 'Plain HTTP serves content instead of redirecting to HTTPS';
      evidence = [`GET http://${base.host}/ answered 200`];
    } else {
      title = `HTTP answered ${plain.status} instead of a permanent redirect to HTTPS`;
      evidence = [`Location: ${plain.headers.location ?? '(none)'}`];
    }
    items.push(
      makeItem({
        id: 'live-https-redirect',
        area: 'security',
        owasp: 'A04',
        status,
        title,
        evidence,
        fix: 'Turn on "Always Use HTTPS" (Cloudflare) or a 301/308 redirect from http:// to https://.',
      }),
    );
  }

  // 3. Headers of the HTML response (+ meta CSP in the body)
  const metaPolicies = scanHtml(home.body ?? '')
    .tags.filter(
      (t) =>
        t.name === 'meta' &&
        (t.attrs['http-equiv'] ?? '').toLowerCase() ===
          'content-security-policy',
    )
    .map((t) => t.attrs.content ?? '')
    .filter(Boolean);
  const headerPolicies = splitPolicies(home.headers['content-security-policy']);
  const headerChecks = headerItems({
    headers: home.headers,
    pages: [{ label: '/', policies: [...headerPolicies, ...metaPolicies] }],
    live: true,
    secure,
  });
  items.push(...headerChecks);

  // 4. Cache of a hashed asset
  const asset = scanHtml(home.body ?? '')
    .tags.map(
      (t) => t.attrs.src ?? (t.name === 'link' ? t.attrs.href : undefined),
    )
    .filter((u) => typeof u === 'string')
    .map((u) => {
      try {
        return new URL(u, `${origin}/`);
      } catch {
        return null;
      }
    })
    .find(
      (u) => u && u.origin === origin && u.pathname.startsWith('/_astro/'),
    )?.pathname;
  if (!asset) {
    items.push(
      makeItem({
        id: 'live-asset-cache',
        area: 'security',
        owasp: 'A02',
        status: 'na',
        title: 'Not applicable: the home page references no /_astro/ asset',
      }),
    );
  } else {
    const response = await get(new URL(asset, `${origin}/`).pathname, {
      method: 'GET',
      redirect: 'manual',
    });
    const cache = response.ok ? (response.headers['cache-control'] ?? '') : '';
    const maxAge = Number(/max-age=(\d+)/i.exec(cache)?.[1] ?? 0);
    const good =
      response.ok &&
      response.status === 200 &&
      /immutable/i.test(cache) &&
      maxAge >= 31536000;
    items.push(
      makeItem({
        id: 'live-asset-cache',
        area: 'security',
        owasp: 'A02',
        status: response.ok ? (good ? 'pass' : 'warn') : 'not-run',
        title: !response.ok
          ? `Could not fetch ${asset}`
          : good
            ? 'Hashed assets are cached for a year as immutable'
            : 'Hashed assets are not cached as immutable for at least a year',
        evidence: [
          response.ok
            ? `${asset}: ${response.status}, Cache-Control: ${cache || '(none)'}`
            : response.error,
        ],
        fix: 'Add to public/_headers:  /_astro/*  then  Cache-Control: public, max-age=31536000, immutable',
      }),
    );
  }

  // 5. Private paths, judged by the body
  const served = [];
  const clean = [];
  let probeError = null;
  for (const entry of PRIVATE_PATHS) {
    const response = await get(entry.path, { readBody: true });
    if (!response.ok) {
      probeError = response.error;
      continue;
    }
    const exposed = response.status === 200 && entry.test(response.body ?? '');
    (exposed ? served : clean).push(
      `${origin}${entry.path} (${entry.label}): ${exposed ? 'SERVED' : `status ${response.status}, no sensitive content`}`,
    );
  }
  items.push(
    makeItem({
      id: 'live-private-paths',
      area: 'security',
      owasp: 'A01',
      status: served.length
        ? 'fail'
        : probeError && !clean.length
          ? 'not-run'
          : 'pass',
      title: served.length
        ? `${served.length} private path(s) serve their real content`
        : 'No private path serves its real content',
      evidence: [
        ...served,
        ...clean,
        ...(probeError ? [`error: ${probeError}`] : []),
      ],
      fix: 'Remove the file from the deployed output and redeploy; rotate any credential it held.',
    }),
  );

  // 6. Unknown path
  const unknownPath = `/__landing-report-${random()}`;
  const unknown = await get(unknownPath);
  items.push(
    makeItem({
      id: 'live-unknown-path',
      area: 'security',
      owasp: 'A10',
      status: !unknown.ok
        ? 'not-run'
        : unknown.status === 404
          ? 'pass'
          : 'warn',
      title: !unknown.ok
        ? 'Could not probe an unknown path'
        : unknown.status === 404
          ? 'An unknown path answers 404'
          : `An unknown path answers ${unknown.status}, not 404`,
      evidence: [
        unknown.ok
          ? `GET ${origin}${unknownPath} -> ${unknown.status}`
          : unknown.error,
      ],
      fix: 'Add src/pages/404.astro so unknown paths get a 404 page; without it Cloudflare Pages answers the home page with status 200.',
    }),
  );

  return {
    items,
    html: home.body,
    policies: [...headerPolicies, ...metaPolicies],
  };
}
