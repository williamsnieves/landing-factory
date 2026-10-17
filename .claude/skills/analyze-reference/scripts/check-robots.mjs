#!/usr/bin/env node
// Pre-check for analyze-reference: robots.txt (for *, ClaudeBot, anthropic-ai, GPTBot), X-Robots-Tag,
// <meta name="robots">, and text-and-data-mining reservations (TDMRep: /.well-known/tdmrep.json,
// tdm-reservation header and meta). Any disallow or reservation means: do not analyze.
//
// Verdicts: "allowed" (exit 0), "blocked" (exit 1), "unverifiable" (exit 2, conservative abort).
// Usage: node check-robots.mjs <url> [--json] [--timeout <ms>] | --help
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const USER_AGENTS = ['*', 'ClaudeBot', 'anthropic-ai', 'GPTBot'];
export const FETCH_UA =
  'landing-factory-analyze/1.0 (reference analysis; honors robots.txt and TDM reservations)';
// Directives in meta robots / X-Robots-Tag that we treat as "agents may not use this page".
const BLOCKING_DIRECTIVES = new Set(['none', 'noindex', 'noai', 'noimageai']);
const META_NAMES = new Set([
  'robots',
  ...USER_AGENTS.slice(1).map((a) => a.toLowerCase()),
]);

class Unverifiable extends Error {}

/** Parse robots.txt into groups: [{ agents: [lowercase], rules: [{allow, pattern}] }] + tdm flag. */
export function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  let tdm = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (field === 'tdm-reservation') tdm = value;
    if (!current) continue;
    if (field === 'allow' || field === 'disallow') {
      if (value)
        current.rules.push({ allow: field === 'allow', pattern: value });
    }
  }
  return { groups, tdmReservation: tdm };
}

function patternToRegExp(pattern) {
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

/** Is `path` (with query) allowed for `agent` under the parsed robots? Longest match wins; Allow wins ties. */
export function robotsAllows(parsed, agent, path) {
  const name = agent.toLowerCase();
  let groups = parsed.groups.filter((g) => g.agents.includes(name));
  if (!groups.length)
    groups = parsed.groups.filter((g) => g.agents.includes('*'));
  let best = null;
  for (const g of groups) {
    for (const rule of g.rules) {
      if (!patternToRegExp(rule.pattern).test(path)) continue;
      if (
        !best ||
        rule.pattern.length > best.pattern.length ||
        (rule.pattern.length === best.pattern.length &&
          rule.allow &&
          !best.allow)
      )
        best = rule;
    }
  }
  return { allowed: !best || best.allow, rule: best };
}

function directivesFrom(value) {
  return value
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
}

/** X-Robots-Tag may carry "[bot:] directives" per value; return blocking directives that apply to us. */
export function blockingFromXRobotsTag(headerValue) {
  const found = [];
  for (const part of headerValue.split(/,(?=\s*[\w-]+\s*:)/)) {
    const m = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(part);
    const bot = m ? m[1].toLowerCase() : null;
    const dirs = directivesFrom(m ? m[2] : part);
    if (bot && !META_NAMES.has(bot)) continue;
    for (const d of dirs)
      if (BLOCKING_DIRECTIVES.has(d)) found.push(bot ? `${bot}: ${d}` : d);
  }
  return found;
}

/** Extract robots-like and tdm-reservation meta tags from HTML (head only, regex based). */
export function parseMetaTags(html) {
  const head = html.slice(0, 300000);
  const robots = [];
  let tdm = null;
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (n) =>
      new RegExp(
        `\\b${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
        'i',
      ).exec(tag);
    const name = attr('name');
    const content = attr('content');
    if (!name || !content) continue;
    const n = (name[1] ?? name[2] ?? name[3]).toLowerCase();
    const c = content[1] ?? content[2] ?? content[3] ?? '';
    if (META_NAMES.has(n)) {
      for (const d of directivesFrom(c))
        if (BLOCKING_DIRECTIVES.has(d))
          robots.push(n === 'robots' ? d : `${n}: ${d}`);
    } else if (n === 'tdm-reservation' && c.trim() === '1') tdm = '1';
  }
  return { robots, tdmReservation: tdm };
}

function locationMatches(location, path) {
  if (typeof location !== 'string') return false;
  if (location === '/' || location === '') return true;
  const loc = location.startsWith('/') ? location : `/${location}`;
  if (loc.includes('*')) return patternToRegExp(loc).test(path);
  return path === loc || path.startsWith(loc.endsWith('/') ? loc : `${loc}`);
}

/**
 * Check whether the URL may be analyzed.
 * options.fetch: fetch-compatible function (tests inject fixtures); options.timeoutMs.
 * Returns { verdict, allowed, reasons[], checks[], finalUrl }.
 */
export async function checkPermissions(inputUrl, options = {}) {
  const doFetch = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 10000;
  const reasons = [];
  const checks = [];

  const get = async (url, what) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': FETCH_UA, accept: '*/*' },
      });
      const body = await res.text();
      return { res, body };
    } catch (error) {
      const why =
        error?.name === 'AbortError'
          ? `timed out after ${timeoutMs} ms`
          : (error?.message ?? String(error));
      throw new Unverifiable(
        `cannot verify permissions: ${what} failed (${why})`,
      );
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let url;
    try {
      url = new URL(inputUrl);
    } catch {
      throw new Unverifiable(
        `cannot verify permissions: "${inputUrl}" is not a valid URL`,
      );
    }
    if (!/^https?:$/.test(url.protocol))
      throw new Unverifiable(
        'cannot verify permissions: only http(s) URLs are supported',
      );

    for (let hop = 0; hop < 3; hop++) {
      const pathWithQuery = url.pathname + url.search;
      const origin = url.origin;

      // 1. robots.txt
      const robots = await get(`${origin}/robots.txt`, 'robots.txt');
      const status = robots.res.status;
      if (status === 404 || status === 410) {
        checks.push({
          name: 'robots.txt',
          result: `none (HTTP ${status}), allowed`,
        });
      } else if (status === 401 || status === 403) {
        reasons.push(
          `robots.txt returned HTTP ${status}: access is restricted, treated as disallowed`,
        );
        checks.push({
          name: 'robots.txt',
          result: `HTTP ${status}, disallowed`,
        });
      } else if (
        status >= 500 ||
        status < 200 ||
        (status >= 300 && status < 400)
      ) {
        throw new Unverifiable(
          `cannot verify permissions: robots.txt returned HTTP ${status}`,
        );
      } else if (status >= 400) {
        checks.push({
          name: 'robots.txt',
          result: `none (HTTP ${status}), allowed`,
        });
      } else {
        const parsed = parseRobots(robots.body);
        const verdicts = USER_AGENTS.map((agent) => ({
          agent,
          ...robotsAllows(parsed, agent, pathWithQuery),
        }));
        for (const v of verdicts)
          if (!v.allowed)
            reasons.push(
              `robots.txt disallows ${pathWithQuery} for ${v.agent} (rule: Disallow ${v.rule.pattern})`,
            );
        if (parsed.tdmReservation === '1')
          reasons.push('robots.txt declares TDM-Reservation: 1');
        checks.push({
          name: 'robots.txt',
          result: verdicts
            .map((v) => `${v.agent}:${v.allowed ? 'allow' : 'disallow'}`)
            .join(' '),
        });
      }
      if (reasons.length) break; // no need to touch the page itself

      // 2. TDMRep well-known file
      const tdm = await get(`${origin}/.well-known/tdmrep.json`, 'tdmrep.json');
      if (tdm.res.status === 404 || tdm.res.status === 410) {
        checks.push({ name: 'tdmrep.json', result: 'none' });
      } else if (tdm.res.status === 401 || tdm.res.status === 403) {
        reasons.push(
          `/.well-known/tdmrep.json returned HTTP ${tdm.res.status}, treated as a reservation`,
        );
        checks.push({
          name: 'tdmrep.json',
          result: `HTTP ${tdm.res.status}, disallowed`,
        });
      } else if (tdm.res.status !== 200) {
        throw new Unverifiable(
          `cannot verify permissions: tdmrep.json returned HTTP ${tdm.res.status}`,
        );
      } else {
        let list;
        try {
          list = JSON.parse(tdm.body);
        } catch {
          throw new Unverifiable(
            'cannot verify permissions: tdmrep.json is not valid JSON',
          );
        }
        if (!Array.isArray(list)) list = [list];
        const hit = list.find(
          (e) =>
            e &&
            String(e['tdm-reservation']) === '1' &&
            locationMatches(e.location ?? '/', url.pathname),
        );
        if (hit)
          reasons.push(
            `/.well-known/tdmrep.json reserves TDM rights for ${hit.location ?? '/'}`,
          );
        checks.push({
          name: 'tdmrep.json',
          result: hit ? 'reservation' : 'present, no reservation for this path',
        });
      }
      if (reasons.length) break;

      // 3. The page: headers and meta
      const page = await get(url.href, 'the page');
      const ps = page.res.status;
      const finalUrl = new URL(page.res.url || url.href);
      if (ps === 401 || ps === 403) {
        reasons.push(
          `the page returned HTTP ${ps}: not public or blocks automated access`,
        );
        checks.push({ name: 'page', result: `HTTP ${ps}` });
        break;
      }
      if (ps >= 500 || ps < 200) {
        throw new Unverifiable(
          `cannot verify permissions: the page returned HTTP ${ps}`,
        );
      }
      if (ps >= 400) {
        reasons.push(`the page returned HTTP ${ps}: unreachable`);
        checks.push({ name: 'page', result: `HTTP ${ps}` });
        break;
      }
      const xrt = page.res.headers.get('x-robots-tag');
      const xrtBlock = xrt ? blockingFromXRobotsTag(xrt) : [];
      if (xrtBlock.length)
        reasons.push(`X-Robots-Tag header: ${xrtBlock.join(', ')}`);
      const headerTdm = page.res.headers.get('tdm-reservation');
      if (headerTdm && headerTdm.trim() === '1')
        reasons.push('tdm-reservation: 1 response header');
      const meta = parseMetaTags(page.body);
      if (meta.robots.length)
        reasons.push(
          `<meta name="robots"> directive: ${meta.robots.join(', ')}`,
        );
      if (meta.tdmReservation === '1')
        reasons.push('<meta name="tdm-reservation" content="1">');
      checks.push({
        name: 'page',
        result: `HTTP ${ps}; X-Robots-Tag ${xrt ?? 'none'}; meta ${meta.robots.join(', ') || 'none'}`,
      });
      if (reasons.length) break;

      // 4. Redirected to another origin: repeat the whole check there.
      if (finalUrl.origin !== url.origin) {
        checks.push({
          name: 'redirect',
          result: `${origin} -> ${finalUrl.origin}, re-checking`,
        });
        url = finalUrl;
        continue;
      }
      url = finalUrl;
      break;
    }
    const verdict = reasons.length ? 'blocked' : 'allowed';
    return {
      verdict,
      allowed: !reasons.length,
      reasons,
      checks,
      finalUrl: url.href,
    };
  } catch (error) {
    if (error instanceof Unverifiable)
      return {
        verdict: 'unverifiable',
        allowed: false,
        reasons: [error.message],
        checks,
        finalUrl: null,
      };
    throw error;
  }
}

const HELP = `check-robots: may this URL be analyzed?

Usage: node check-robots.mjs <url> [--json] [--timeout <ms>]

Checks robots.txt for ${USER_AGENTS.join(', ')}, X-Robots-Tag, <meta name="robots">, and TDM reservations
(/.well-known/tdmrep.json, tdm-reservation header and meta, robots.txt TDM-Reservation).
robots.txt 404 = allowed; 401/403 = disallowed; 5xx or timeout = cannot verify (abort).
Exit codes: 0 allowed, 1 blocked by a disallow or reservation, 2 cannot verify, 3 usage error.`;

export async function main(argv, io = console) {
  if (argv.includes('--help') || argv.includes('-h')) {
    io.log(HELP);
    return 0;
  }
  const json = argv.includes('--json');
  let timeoutMs;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') continue;
    if (argv[i] === '--timeout') {
      timeoutMs = Number(argv[++i]);
      continue;
    }
    rest.push(argv[i]);
  }
  if (
    rest.length !== 1 ||
    rest[0].startsWith('-') ||
    (timeoutMs !== undefined && !(timeoutMs > 0))
  ) {
    io.error(
      'Usage: node check-robots.mjs <url> [--json] [--timeout <ms>] (see --help)',
    );
    return 3;
  }
  const result = await checkPermissions(rest[0], { timeoutMs });
  if (json) io.log(JSON.stringify(result, null, 2));
  else {
    for (const c of result.checks) io.log(`  ${c.name}: ${c.result}`);
    if (result.verdict === 'allowed')
      io.log('ALLOWED: no disallow or reservation found.');
    else {
      io.log(
        `${result.verdict === 'blocked' ? 'BLOCKED' : 'CANNOT VERIFY'}: abort, produce no sheet.`,
      );
      for (const r of result.reasons) io.log(`  - ${r}`);
    }
  }
  return result.verdict === 'allowed'
    ? 0
    : result.verdict === 'blocked'
      ? 1
      : 2;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
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
