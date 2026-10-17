// Outbound proxy support shared by the analyze-reference CLIs (check-robots.mjs, recon.mjs).
//
// Node 22 reads NODE_USE_ENV_PROXY only at process start, so a CLI that finds HTTPS_PROXY/HTTP_PROXY
// without it re-executes itself once with NODE_USE_ENV_PROXY=1. Imported functions are never affected:
// only the CLI entry points call reexecWithEnvProxy(). The scripts never read or embed certificates;
// NODE_EXTRA_CA_CERTS from the environment is inherited as is.
import { spawn } from 'node:child_process';

export const REEXEC_MARKER = 'ANALYZE_REFERENCE_PROXY_REEXEC';

const proxyVar = (env, ...names) => {
  for (const n of names) if (env[n]) return env[n];
  return '';
};

/** True when a proxy is configured but Node's own env-proxy switch is off and we have not re-executed yet. */
export function needsProxyReexec(env = process.env) {
  const hasProxy = proxyVar(
    env,
    'HTTPS_PROXY',
    'https_proxy',
    'HTTP_PROXY',
    'http_proxy',
  );
  return Boolean(hasProxy && !env.NODE_USE_ENV_PROXY && !env[REEXEC_MARKER]);
}

/** Drops only the experimental EnvHttpProxyAgent warning (and its "--trace-warnings" hint line). */
export function createWarningFilter(write) {
  let rest = '';
  let dropHint = false;
  const line = (l) => {
    if (/UNDICI-EHPA/.test(l)) {
      dropHint = true;
      return;
    }
    if (dropHint && /^\(Use `node --trace-warnings/.test(l)) {
      dropHint = false;
      return;
    }
    dropHint = false;
    write(`${l}\n`);
  };
  return {
    push(chunk) {
      rest += chunk;
      const parts = rest.split('\n');
      rest = parts.pop();
      parts.forEach(line);
    },
    end() {
      if (rest) write(rest);
      rest = '';
    },
  };
}

/**
 * CLI guard. Returns true when it started the re-executed child (the caller must then NOT run main()).
 * The child gets the same argv, stdin/stdout, and its exit code becomes ours.
 */
export function reexecWithEnvProxy(env = process.env) {
  if (!needsProxyReexec(env)) return false;
  const child = spawn(
    process.execPath,
    [...process.execArgv, ...process.argv.slice(1)],
    {
      stdio: ['inherit', 'inherit', 'pipe'],
      env: { ...env, NODE_USE_ENV_PROXY: '1', [REEXEC_MARKER]: '1' },
    },
  );
  const filter = createWarningFilter((s) => process.stderr.write(s));
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (d) => filter.push(d));
  for (const sig of ['SIGINT', 'SIGTERM'])
    process.on(sig, () => child.kill(sig));
  child.on('error', (error) => {
    console.error(`could not start the proxied child process: ${error.message}`);
    process.exitCode = 2;
  });
  child.on('close', (code, signal) => {
    filter.end();
    process.exitCode = code ?? (signal ? 1 : 0);
  });
  return true;
}

/**
 * Playwright `proxy` launch option from the environment, or undefined when no proxy is configured.
 * NO_PROXY plus loopback hosts form the bypass list. Credentials in the proxy URL are split out for Playwright.
 */
export function chromiumProxyOption(env = process.env) {
  const raw = proxyVar(
    env,
    'HTTPS_PROXY',
    'https_proxy',
    'HTTP_PROXY',
    'http_proxy',
  );
  if (!raw) return undefined;
  let u;
  try {
    u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `http://${raw}`);
  } catch {
    return undefined;
  }
  const option = { server: `${u.protocol}//${u.host}` };
  if (u.username) option.username = decodeURIComponent(u.username);
  if (u.password) option.password = decodeURIComponent(u.password);
  // Playwright proxies loopback too unless told otherwise; local servers (tests, dev) must stay direct.
  const bypass = [
    proxyVar(env, 'NO_PROXY', 'no_proxy'),
    'localhost,127.0.0.1,[::1]',
  ]
    .filter(Boolean)
    .join(',');
  option.bypass = bypass;
  return option;
}
