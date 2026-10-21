#!/usr/bin/env node
// Preflight for scripts/new-landing.sh: checks, before anything is created, that the package registry and
// the image sources answer (through the proxy when HTTPS_PROXY is set), that a Chromium for QA exists and
// that the site slug is valid and free. Names every failing item in one message.
// Run `node scripts/preflight.mjs --help` for options. Exit codes: 0 all good, 1 a check failed, 2 bad usage.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { reexecWithEnvProxy } from '../.claude/skills/analyze-reference/scripts/proxy.mjs';
import { validateSlug } from './new-site.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Descriptive User-Agent: Wikimedia asks every client to send one. */
export const USER_AGENT =
  'landing-factory/0.1 (https://github.com/williamsnieves/landing-factory)';

/** Hosts that must answer. `ok` decides which HTTP statuses count as "reachable". */
export const HOST_CHECKS = [
  {
    name: 'npm registry',
    host: 'registry.npmjs.org',
    url: 'https://registry.npmjs.org/-/ping',
    method: 'GET',
  },
  {
    name: 'Wikimedia Commons API',
    host: 'commons.wikimedia.org',
    url: 'https://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&format=json',
    method: 'GET',
  },
  {
    name: 'Wikimedia image host',
    host: 'upload.wikimedia.org',
    // Any answer from the host proves it is reachable; a missing file (404) is fine.
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg',
    method: 'HEAD',
  },
];

const FETCH_TIMEOUT_MS = 12_000;

/** Statuses that prove the host answered. 429 means reachable but throttled. */
const reachable = (status) =>
  (status >= 200 && status < 400) || status === 404 || status === 429;

export async function checkHost(check, fetchFn, timeoutMs = FETCH_TIMEOUT_MS) {
  try {
    const response = await fetchFn(check.url, {
      method: check.method,
      headers: { 'user-agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (reachable(response.status))
      return {
        name: check.name,
        ok: true,
        detail: `${check.host} answered ${response.status}`,
      };
    return {
      name: check.name,
      ok: false,
      detail: `${check.host} answered HTTP ${response.status}`,
      fix: `allow ${check.host} in the environment's network settings (a 403 or 407 usually means the proxy blocks the host)`,
    };
  } catch (error) {
    const reason =
      error?.name === 'TimeoutError'
        ? `no answer within ${timeoutMs / 1000} s`
        : (error?.cause?.code ?? error?.message ?? 'request failed');
    return {
      name: check.name,
      ok: false,
      detail: `${check.host} is not reachable (${reason})`,
      fix: `allow ${check.host} in the environment's network settings and check HTTPS_PROXY`,
    };
  }
}

/**
 * Locate a Chromium for QA. Order: QA_CHROME_PATH, CHROME_PATH (must exist), Playwright's own browser,
 * then /opt/pw-browsers/chromium-*\/chrome-linux/chrome. Returns { path, source } or null.
 * `deps` lets tests inject the environment, file existence, Playwright's path and the directory listing.
 */
export async function findChromium({
  env = process.env,
  exists = existsSync,
  playwrightPath = async () => {
    try {
      const { chromium } = await import('playwright');
      return chromium.executablePath();
    } catch {
      return null;
    }
  },
  list = (dir) => {
    try {
      return readdirSync(dir);
    } catch {
      return [];
    }
  },
  preinstalledDir = '/opt/pw-browsers',
} = {}) {
  for (const name of ['QA_CHROME_PATH', 'CHROME_PATH']) {
    if (env[name]) {
      // An explicit variable is never second-guessed: if it points nowhere, that is the failure.
      return exists(env[name]) ? { path: env[name], source: name } : null;
    }
  }
  const own = await playwrightPath();
  if (own && exists(own)) return { path: own, source: 'playwright' };
  const preinstalled = list(preinstalledDir)
    .filter((entry) => /^chromium-\d+$/.test(entry))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    .map((entry) => join(preinstalledDir, entry, 'chrome-linux', 'chrome'))
    .find((candidate) => exists(candidate));
  return preinstalled ? { path: preinstalled, source: 'pw-browsers' } : null;
}

export async function checkChromium(deps) {
  const found = await findChromium(deps);
  if (found) {
    const hint =
      found.source === 'playwright' || found.source.endsWith('PATH')
        ? ''
        : ` (set QA_CHROME_PATH=${found.path} for npm run qa)`;
    return {
      name: 'Chromium',
      ok: true,
      detail: `${found.path}${hint}`,
      path: found.path,
      source: found.source,
    };
  }
  const env = deps?.env ?? process.env;
  const pointed = env.QA_CHROME_PATH || env.CHROME_PATH;
  return {
    name: 'Chromium',
    ok: false,
    detail: pointed
      ? `${pointed} does not exist`
      : 'no Chromium found (QA_CHROME_PATH, CHROME_PATH, Playwright, /opt/pw-browsers)',
    fix: 'run `npx playwright install chromium` or set QA_CHROME_PATH to a Chromium binary',
  };
}

/** The slug is valid and sites/<slug> is absent, or holds only top-level *.md planning docs. */
export function checkSlug(slug, sitesDir) {
  const invalid = validateSlug(slug);
  if (invalid)
    return {
      name: 'Site slug',
      ok: false,
      detail: invalid,
      fix: 'pick another slug',
    };
  const target = join(sitesDir, slug);
  if (!existsSync(target))
    return { name: 'Site slug', ok: true, detail: `sites/${slug} is free` };
  const offending = statSync(target).isDirectory()
    ? readdirSync(target, { withFileTypes: true })
        .filter(
          (entry) =>
            !entry.isFile() || !entry.name.toLowerCase().endsWith('.md'),
        )
        .map((entry) => entry.name)
    : [target];
  if (offending.length)
    return {
      name: 'Site slug',
      ok: false,
      detail: `sites/${slug} already exists (${offending.join(', ')})`,
      fix: 'pick another slug or remove the folder yourself',
    };
  return {
    name: 'Site slug',
    ok: true,
    detail: `sites/${slug} holds only planning docs, they are kept`,
  };
}

/** Runs every check. Returns { ok, checks[] }; each check is { name, ok, detail, fix? }. */
export async function runPreflight({
  slug,
  fetch: fetchFn = globalThis.fetch,
  sitesDir = join(ROOT, 'sites'),
  chromium,
  timeoutMs,
} = {}) {
  const checks = [
    ...(await Promise.all(
      HOST_CHECKS.map((check) => checkHost(check, fetchFn, timeoutMs)),
    )),
    await checkChromium(chromium),
  ];
  if (slug !== undefined) checks.push(checkSlug(slug, sitesDir));
  return { ok: checks.every((c) => c.ok), checks };
}

export function formatReport(result) {
  const lines = [
    result.ok ? 'preflight: all checks passed' : 'preflight: FAILED',
  ];
  for (const c of result.checks)
    lines.push(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}: ${c.detail}`);
  const failed = result.checks.filter((c) => !c.ok);
  if (failed.length) {
    lines.push('', 'To fix:');
    for (const c of failed) lines.push(`  - ${c.name}: ${c.fix}`);
  }
  return lines.join('\n');
}

const HELP = `Usage: node scripts/preflight.mjs [--slug <slug>] [--json] [--chromium-path]

Checks before generating a landing, naming every failure in one message:
  - registry.npmjs.org, commons.wikimedia.org (API) and upload.wikimedia.org answer over HTTPS
    (through HTTPS_PROXY when it is set)
  - a Chromium for QA exists (QA_CHROME_PATH, CHROME_PATH, Playwright's browser,
    or /opt/pw-browsers/chromium-*/chrome-linux/chrome)
  - with --slug: the slug is valid and sites/<slug> is absent (or holds only *.md planning docs)

  --slug <slug>       also check the slug
  --json              print the result as JSON
  --chromium-path     print only the Chromium path found (exit 1 when there is none)
  --help              show this help

Exit codes: 0 all good, 1 a check failed, 2 bad usage.`;

export async function main(argv, io = console) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        slug: { type: 'string' },
        json: { type: 'boolean' },
        'chromium-path': { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    io.error(`preflight: ${error.message}\n\n${HELP}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  if (positionals.length) {
    io.error(`preflight: unexpected argument "${positionals[0]}"\n\n${HELP}`);
    return 2;
  }
  if (values['chromium-path']) {
    const found = await findChromium();
    if (!found) return 1;
    io.log(found.path);
    return 0;
  }
  const override = process.env.LANDING_FACTORY_ROOT;
  const result = await runPreflight({
    slug: values.slug,
    ...(override ? { sitesDir: join(resolve(override), 'sites') } : {}),
  });
  io.log(values.json ? JSON.stringify(result, null, 2) : formatReport(result));
  return result.ok ? 0 : 1;
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
