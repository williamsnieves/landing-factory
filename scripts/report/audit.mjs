// `npm audit` of the landing's production dependencies, mapped to report items.
import { spawn } from 'node:child_process';

import { cap, makeItem } from './items.mjs';

/** Runs npm and resolves { code, stdout, stderr }. Never rejects: a failure to start gives code -1. */
export function defaultRunner(args, { cwd, timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn('npm', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: String(error.message) });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

/** Arguments of the audit: a site workspace, or the root package only for the starter. */
export const auditArgs = (site) => [
  'audit',
  '--omit=dev',
  '--json',
  site ? `--workspace=site-${site}` : '--workspaces=false',
];

const ghsaOf = (url, source) => {
  const match = /(GHSA-[a-z0-9-]+)/i.exec(url ?? '');
  return match ? match[1] : `npm:${source}`;
};

/** Advisories of an `npm audit --json` (v2) document: [{ id, pkg, severity, title, range, fix, url }]. */
export function advisoriesOf(report) {
  const found = new Map();
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    const fixAvailable = vuln.fixAvailable;
    const fix =
      fixAvailable && typeof fixAvailable === 'object'
        ? `${fixAvailable.name}@${fixAvailable.version}${fixAvailable.isSemVerMajor ? ' (major)' : ''}`
        : fixAvailable
          ? 'npm audit fix'
          : 'no fix available';
    for (const via of vuln.via ?? []) {
      if (typeof via !== 'object') continue;
      const id = ghsaOf(via.url, via.source);
      if (found.has(id)) continue;
      found.set(id, {
        id,
        pkg: via.name ?? vuln.name,
        severity: via.severity ?? vuln.severity,
        title: via.title ?? '',
        range: via.range ?? '',
        url: via.url ?? '',
        fix,
      });
    }
  }
  return [...found.values()];
}

const notRun = (title, evidence = []) =>
  makeItem({
    id: 'npm-audit',
    area: 'security',
    owasp: 'A03',
    status: 'not-run',
    title,
    evidence,
    fix: 'Run the report with network access to the npm registry (npm audit needs it).',
  });

/**
 * npm audit item. `runner(args, { cwd })` is injectable for tests.
 * `ignore` is [{ id, reason }] from the config.
 */
export async function auditItem({
  root,
  site,
  ignore = [],
  runner = defaultRunner,
}) {
  const result = await runner(auditArgs(site), { cwd: root });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return notRun('npm audit did not return a result', [
      (result.stderr || 'no output').trim().split('\n').slice(0, 3).join(' | '),
    ]);
  }
  if (report.error) {
    const summary = report.error.summary || report.error.code || 'audit failed';
    return notRun(`npm audit could not run: ${summary}`, [
      `npm error code: ${report.error.code ?? 'unknown'}`,
    ]);
  }
  const ignored = new Map(
    ignore.map((entry) => [entry.id.toLowerCase(), entry.reason]),
  );
  const advisories = advisoriesOf(report);
  const lines = [];
  let status = 'pass';
  const raise = (next) => {
    const rank = { pass: 0, warn: 1, fail: 2 };
    if (rank[next] > rank[status]) status = next;
  };
  for (const advisory of advisories) {
    const reason = ignored.get(advisory.id.toLowerCase());
    const line = `${advisory.pkg} ${advisory.range} ${advisory.severity}: ${advisory.title} (${advisory.id}; fix: ${advisory.fix})`;
    if (reason) {
      raise('warn');
      lines.push(`IGNORED ${line} - reason: ${reason}`);
    } else if (
      advisory.severity === 'high' ||
      advisory.severity === 'critical'
    ) {
      raise('fail');
      lines.push(line);
    } else {
      raise('warn');
      lines.push(line);
    }
  }
  const total = report.metadata?.vulnerabilities?.total ?? advisories.length;
  return makeItem({
    id: 'npm-audit',
    area: 'security',
    owasp: 'A03',
    status,
    title: advisories.length
      ? `npm audit: ${advisories.length} advisory(ies) in the production dependencies`
      : `npm audit: 0 advisories in the production dependencies (${report.metadata?.dependencies?.prod ?? '?'} packages)`,
    evidence: cap(
      lines.length ? lines : total ? [`${total} vulnerability record(s)`] : [],
    ),
    fix: 'Update the package to the fixed version (npm update <package>, or bump it in package.json). If the advisory cannot affect a static build, list its id with a reason under report.audit.ignore in qa.config.json.',
  });
}

export const lockfileItem = (exists) =>
  makeItem({
    id: 'lockfile',
    area: 'security',
    owasp: 'A03',
    status: exists ? 'pass' : 'warn',
    title: exists
      ? 'package-lock.json is present: installs are reproducible'
      : 'No package-lock.json: installs are not reproducible',
    evidence: [],
    fix: 'Run npm install at the repo root and commit package-lock.json.',
  });
