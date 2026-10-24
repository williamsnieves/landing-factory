// Security header items, shared by the static check (dist/_headers + meta tags) and the live check (response headers).
import {
  headersForPath,
  effectiveScriptPolicy,
  hasFrameAncestors,
  splitPolicies,
} from './headers.mjs';
import { makeItem } from './items.mjs';

const hstsMaxAge = (value) =>
  Number(/max-age=(\d+)/i.exec(value ?? '')?.[1] ?? 0);

/**
 * Items for one response. `headers` is { lowercase-name: value }; `cspPolicies` the policies in
 * the header; `pagePolicies` [{ label, policies, ... }] the script policy inputs per page (header plus meta).
 * `live` switches ids, wording and the OWASP home of HSTS (A04 on the wire, A02 in the file).
 */
export function headerItems({
  headers,
  pages,
  live = false,
  source,
  secure = true,
}) {
  const prefix = live ? 'live-' : '';
  const where = live ? 'the response of the deployed URL' : source;
  const fixAt = live
    ? 'public/_headers (then redeploy)'
    : 'public/_headers (under /*)';
  const csp = splitPolicies(headers['content-security-policy']);

  const baseline = [
    {
      name: 'X-Content-Type-Options: nosniff',
      ok: /nosniff/i.test(headers['x-content-type-options'] ?? ''),
    },
    { name: 'Referrer-Policy', ok: Boolean(headers['referrer-policy']) },
    {
      name: "Content-Security-Policy with frame-ancestors (e.g. frame-ancestors 'self')",
      ok: hasFrameAncestors(csp),
    },
  ];
  const missing = baseline.filter((b) => !b.ok);
  const items = [
    makeItem({
      id: `${prefix}headers-baseline`,
      area: 'security',
      owasp: 'A02',
      status: missing.length ? 'fail' : 'pass',
      title: missing.length
        ? `${missing.length} baseline security header(s) missing in ${where}`
        : `Baseline security headers present in ${where}`,
      evidence: baseline.map(
        (b) => `${b.name}: ${b.ok ? 'present' : 'MISSING'}`,
      ),
      fix: `Add the missing line(s) to ${fixAt}: X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Content-Security-Policy: frame-ancestors 'self'.`,
    }),
  ];

  const hsts = headers['strict-transport-security'];
  const age = hstsMaxAge(hsts);
  items.push(
    makeItem({
      id: `${prefix}headers-hsts`,
      area: 'security',
      owasp: live ? 'A04' : 'A02',
      status: !secure ? 'na' : hsts && age >= 15552000 ? 'pass' : 'warn',
      title: !secure
        ? 'Not applicable: a plain-HTTP local server was checked (--allow-http)'
        : !hsts
          ? `No Strict-Transport-Security in ${where}`
          : age >= 15552000
            ? `HSTS present (max-age=${age})`
            : `HSTS max-age is short (${age} s)`,
      evidence: hsts ? [`Strict-Transport-Security: ${hsts}`] : [],
      fix: `Add Strict-Transport-Security: max-age=31536000 to ${fixAt}.`,
    }),
    makeItem({
      id: `${prefix}headers-coop`,
      area: 'security',
      owasp: 'A02',
      status: headers['cross-origin-opener-policy'] ? 'pass' : 'warn',
      title: headers['cross-origin-opener-policy']
        ? 'Cross-Origin-Opener-Policy present'
        : `No Cross-Origin-Opener-Policy in ${where}`,
      evidence: headers['cross-origin-opener-policy']
        ? [
            `Cross-Origin-Opener-Policy: ${headers['cross-origin-opener-policy']}`,
          ]
        : [],
      fix: `Add Cross-Origin-Opener-Policy: same-origin to ${fixAt}.`,
    }),
    makeItem({
      id: `${prefix}headers-permissions`,
      area: 'security',
      owasp: 'A02',
      status: headers['permissions-policy'] ? 'pass' : 'warn',
      title: headers['permissions-policy']
        ? 'Permissions-Policy present'
        : `No Permissions-Policy in ${where}`,
      evidence: headers['permissions-policy']
        ? [`Permissions-Policy: ${headers['permissions-policy']}`]
        : [],
      fix: `Add Permissions-Policy: camera=(), microphone=(), geolocation=() to ${fixAt}.`,
    }),
  );

  if (live) {
    // The live CSP is judged on the HTML response: header plus meta tags of the page.
    const policy = effectiveScriptPolicy(pages[0]?.policies ?? csp);
    items.push(
      makeItem({
        id: 'live-csp-scripts',
        area: 'security',
        owasp: 'A05',
        status: policy.restricts ? 'pass' : 'warn',
        title: policy.restricts
          ? 'The deployed page has a Content-Security-Policy that restricts scripts'
          : 'The deployed page has no Content-Security-Policy that restricts scripts',
        evidence: [
          policy.restricts
            ? `${policy.hashes.length} script hash(es)`
            : policy.reason,
        ],
        fix: "Enable security.csp in astro.config.mjs (see the starter's config) and redeploy.",
      }),
    );
  }
  return items;
}

/** The static view: headers of the home page from dist/_headers, or null when the file is absent. */
export function staticHeaderItems(model) {
  if (!model.headersRules) {
    const missing = makeItem({
      id: 'headers-baseline',
      area: 'security',
      owasp: 'A02',
      status: 'fail',
      title: 'dist/_headers does not exist: no security headers are sent',
      evidence: ['dist/_headers: MISSING'],
      fix: "Add public/_headers (copy it from the starter) with X-Content-Type-Options: nosniff, Referrer-Policy and Content-Security-Policy: frame-ancestors 'self' under /*.",
    });
    return [
      missing,
      ...headerItems({ headers: {}, pages: [], source: 'dist/_headers' }).slice(
        1,
      ),
    ];
  }
  const home = headersForPath(model.headersRules, '/');
  return headerItems({ headers: home, pages: [], source: 'dist/_headers' });
}
