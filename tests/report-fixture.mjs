// Helpers for the landing report tests: a throwaway factory root holding one fixture site built from
// tests/fixtures/report/clean, and a way to run the report CLI in-process with its output captured.
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { main } from '../scripts/landing-report.mjs';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CLEAN = join(ROOT, 'tests/fixtures/report/clean');

/** An npm runner that reports no advisories, so tests never touch the network. */
export const cleanAudit = async () => ({
  code: 0,
  stdout: JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: { vulnerabilities: { total: 0 }, dependencies: { prod: 3 } },
  }),
  stderr: '',
});

/**
 * Create `<tmp>/sites/fixture` from the clean fixture (build/ becomes dist/) plus a root package-lock.json.
 * The CSP meta tag of the home page gets the real hash of its inline script.
 */
export function makeSite({ slug = 'fixture' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'report-test-'));
  const siteDir = join(root, 'sites', slug);
  mkdirSync(siteDir, { recursive: true });
  cpSync(join(CLEAN, 'build'), join(siteDir, 'dist'), { recursive: true });
  cpSync(join(CLEAN, 'src'), join(siteDir, 'src'), { recursive: true });
  cpSync(join(CLEAN, 'package.json'), join(siteDir, 'package.json'));
  cpSync(join(CLEAN, 'qa-report.json'), join(root, 'qa-report.json'));
  writeFileSync(join(root, 'package-lock.json'), '{}\n');
  const indexFile = join(siteDir, 'dist/index.html');
  const html = readFileSync(indexFile, 'utf8');
  const inline = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
  const hash = createHash('sha256').update(inline, 'utf8').digest('base64');
  writeFileSync(
    indexFile,
    html.replace('sha256-PLACEHOLDER', `sha256-${hash}`),
  );
  const site = {
    root,
    siteDir,
    distDir: join(siteDir, 'dist'),
    slug,
    qaFile: join(root, 'qa-report.json'),
    write(rel, content) {
      const file = join(siteDir, rel);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
      return file;
    },
    read: (rel) => readFileSync(join(siteDir, rel), 'utf8'),
    remove: (rel) =>
      rmSync(join(siteDir, rel), { recursive: true, force: true }),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
  return site;
}

/** Run the CLI in-process. Returns { code, out, err, report, outDir } (report is the parsed report.json). */
export async function runReport(site, args = [], deps = {}) {
  const out = [];
  const err = [];
  const code = await main(
    ['--site', site.slug, '--qa', site.qaFile, ...args],
    { log: (m) => out.push(m), error: (m) => err.push(m) },
    { root: site.root, runner: cleanAudit, ...deps },
  );
  const latest = join(site.root, 'qa', site.slug, 'report', 'latest');
  let report = null;
  let outDir = null;
  if (existsSync(latest)) {
    const runs = readdirSync(join(site.root, 'qa', site.slug, 'report')).filter(
      (n) => n !== 'latest',
    );
    outDir = join(site.root, 'qa', site.slug, 'report', runs.sort().at(-1));
    report = JSON.parse(readFileSync(join(outDir, 'report.json'), 'utf8'));
  }
  return { code, out: out.join('\n'), err: err.join('\n'), report, outDir };
}

export const itemOf = (report, id) => report.items.find((i) => i.id === id);
export const statusOf = (report, id) => itemOf(report, id)?.status;
