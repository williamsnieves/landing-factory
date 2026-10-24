// Cloudflare Pages `_headers` parsing and Content-Security-Policy evaluation.

/**
 * Parse the `_headers` format: a path pattern on an unindented line, then indented
 * `Name: value` lines (and `! Name` to detach a header). Comments start with `#`.
 * Returns [{ pattern, headers: [{ name, value, detach }] }].
 */
export function parseHeadersFile(text) {
  const rules = [];
  let current = null;
  for (const raw of String(text).split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (/^\S/.test(raw)) {
      current = { pattern: raw.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    if (!current) continue;
    const line = raw.trim();
    if (line.startsWith('!')) {
      current.headers.push({
        name: line.slice(1).trim().toLowerCase(),
        value: '',
        detach: true,
      });
      continue;
    }
    const colon = line.indexOf(':');
    if (colon < 1) continue;
    current.headers.push({
      name: line.slice(0, colon).trim().toLowerCase(),
      value: line.slice(colon + 1).trim(),
      detach: false,
    });
  }
  return rules;
}

/** A `_headers` path pattern as a RegExp: `*` is a splat, `:name` a placeholder. */
function patternToRegExp(pattern) {
  let path = pattern;
  const url = path.match(/^https?:\/\/[^/]+(\/.*)?$/);
  if (url) path = url[1] ?? '/';
  const source = path
    .split(/(\*|:[A-Za-z]\w*)/)
    .map((part) =>
      part === '*'
        ? '.*'
        : /^:[A-Za-z]/.test(part)
          ? '[^/]+'
          : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(`^${source}$`);
}

/**
 * The headers Cloudflare would add to a response for `path`: every matching rule applies in file order,
 * values of one header are joined with ", ", and `! Name` removes what earlier rules added.
 * Returns { name (lowercase): value }.
 */
export function headersForPath(rules, path) {
  const out = {};
  for (const rule of rules) {
    if (!patternToRegExp(rule.pattern).test(path)) continue;
    for (const header of rule.headers) {
      if (header.detach) delete out[header.name];
      else
        out[header.name] = out[header.name]
          ? `${out[header.name]}, ${header.value}`
          : header.value;
    }
  }
  return out;
}

/** `Content-Security-Policy` value as { directive: [tokens] } (first occurrence wins, as in browsers). */
export function parseCsp(policy) {
  const directives = {};
  for (const part of String(policy).split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    const name = tokens[0].toLowerCase();
    if (!(name in directives)) directives[name] = tokens.slice(1);
  }
  return directives;
}

/**
 * Does one policy restrict scripts? script-src (else default-src) must exist and contain neither `*`
 * nor 'unsafe-inline' (browsers ignore 'unsafe-inline' when a hash, a nonce or 'strict-dynamic' is also present).
 * Returns { restricts, reason, hashes } where hashes are the 'sha256-...' sources.
 */
export function evaluateScriptPolicy(policy) {
  const directives = parseCsp(policy);
  const sources = directives['script-src'] ?? directives['default-src'];
  if (!sources)
    return {
      restricts: false,
      reason: 'no script-src or default-src directive',
      hashes: [],
    };
  const lower = sources.map((token) => token.toLowerCase());
  // Hashes are case-sensitive base64: keep the original token.
  const hashes = sources.filter((t) => /^'sha(256|384|512)-/i.test(t));
  const hasHash =
    hashes.length > 0 ||
    lower.some((t) => t.startsWith("'nonce-") || t === "'strict-dynamic'");
  if (lower.includes('*'))
    return { restricts: false, reason: "script-src contains '*'", hashes };
  if (lower.includes("'unsafe-inline'") && !hasHash)
    return {
      restricts: false,
      reason: "script-src allows 'unsafe-inline' with no hash or nonce",
      hashes,
    };
  return { restricts: true, reason: '', hashes };
}

/**
 * The effective script policy of a page: every policy (header values and meta tags) is enforced, so scripts
 * are restricted when any of them restricts. `hashes` is the union, `policies` the count seen.
 */
export function effectiveScriptPolicy(policies) {
  if (!policies.length)
    return {
      restricts: false,
      reason: 'no Content-Security-Policy header or meta tag',
      hashes: [],
      policies: 0,
    };
  const results = policies.map(evaluateScriptPolicy);
  const restricting = results.filter((r) => r.restricts);
  return {
    restricts: restricting.length > 0,
    reason: restricting.length ? '' : results.map((r) => r.reason).join('; '),
    hashes: [...new Set(results.flatMap((r) => r.hashes))],
    policies: policies.length,
  };
}

/** Does any policy carry a frame-ancestors directive? (A meta tag cannot, so this reads headers only.) */
export const hasFrameAncestors = (policies) =>
  policies.some((policy) => 'frame-ancestors' in parseCsp(policy));

/** A header value may hold several comma-separated policies (several CSP headers are merged that way). */
export const splitPolicies = (value) =>
  String(value ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
