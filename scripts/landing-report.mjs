#!/usr/bin/env node
// Security (OWASP Top 10) and performance report of one landing.
//
//   npm run report -- [--site <slug>] [--url <deployed-url> | --site-url] [--external-links] [--only static|live]
//                     [--skip <groups>] [--config <file>] [--out <dir>] [--qa <report.json>] [--allow-http]
//   npm run report -- --summary <report-dir>
//
// Writes report.json and report.md to qa/[<slug>/]report/<timestamp>/ (and a `latest` link).
// Exit codes: 0 no item failed, 1 at least one item failed, 2 the run itself broke.
// Design: openspec/changes/add-landing-report/design.md.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { reexecWithEnvProxy } from './lib/proxy.mjs';
import { loadConfig } from './qa/config.mjs';
import { resolveQaPaths } from './qa/site.mjs';
import { build } from './qa/server.mjs';
import { auditItem, lockfileItem } from './report/audit.mjs';
import { staticHeaderItems } from './report/checks-headers.mjs';
import { resolveReportConfig } from './report/config.mjs';
import { distItems, loadDist } from './report/dist-scan.mjs';
import { LEGAL_NOTE, legalItems } from './report/legal.mjs';
import { seoItems } from './report/seo.mjs';
import { countStatuses, summaryLine, verdictOf } from './report/items.mjs';
import { checkLinks, linkItem, outboundLinks } from './report/links.mjs';
import { runLiveChecks } from './report/live.mjs';
import { OWASP_EDITION } from './report/owasp.mjs';
import {
  distPerfItems,
  lighthouseItems,
  loadQaReport,
} from './report/perf.mjs';
import { renderMarkdown } from './report/render.mjs';
import { SiteUrlError, readSiteUrl } from './report/site-url.mjs';
import { scanHtml } from './report/html.mjs';
import {
  findSinks,
  scanTree,
  secretItems,
  secretRoots,
  sinkItem,
} from './report/source-scan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const GROUPS = [
  'headers',
  'dist',
  'source',
  'secrets',
  'audit',
  'perf',
  'legal',
  'seo',
  'live',
  'external-links',
];
const STATIC_GROUPS = [
  'headers',
  'dist',
  'source',
  'secrets',
  'audit',
  'perf',
  'legal',
  'seo',
];

class RunError extends Error {}

/**
 * The landing's brief.json, or { brief: null, problem } when there is none (or it cannot be read).
 * Without a site the project is the repo root: the starter has no brief, an exported repository has its own.
 */
function readBrief(projectDir, site) {
  const file = join(projectDir, 'brief.json');
  const where = site ? `sites/${site}/brief.json` : 'brief.json';
  if (!existsSync(file))
    return {
      brief: null,
      problem: site ? `no ${where}` : 'the starter has no brief.json',
    };
  try {
    const brief = JSON.parse(readFileSync(file, 'utf8'));
    return brief && typeof brief === 'object' && !Array.isArray(brief)
      ? { brief, problem: null }
      : { brief: null, problem: `${where} is not an object` };
  } catch (error) {
    return {
      brief: null,
      problem: `cannot read ${where}: ${error.message}`,
    };
  }
}

const HELP = `Usage: npm run report -- [options]

Security (OWASP Top 10:${OWASP_EDITION}), performance, legal and SEO report of one landing. Writes report.json and
report.md to qa/<slug>/report/<timestamp>/ (qa/report/<timestamp>/ for the starter) and a "latest" link.

  --site <slug>       report on sites/<slug> (default: the starter at the repo root)
  --url <url>         also run the live checks on the deployed https:// URL (TLS, HTTP to HTTPS, headers,
                      caching, private paths, unknown path)
  --site-url          the same on the landing's own domain: the origin of the absolute canonical URL in
                      dist/index.html (needs "site" in astro.config.mjs and a build); not with --url
  --external-links    request each outbound link once (at most 50, sequential) and report broken ones;
                      bot blocks (403, 429, challenges) are listed as unverified, never retried
  --only static|live  static: everything that reads dist/ and the source (default without --url);
                      live: only the checks on --url (needs --url, needs no dist/)
  --skip a,b          skip check groups: ${GROUPS.join(', ')}
  --config <file>     QA config with a "report" section (default: the site's qa.config.json, else the root's)
  --out <dir>         output root (default qa)
  --qa <report.json>  QA report to read the Lighthouse detail from (default qa/[<slug>/]latest/report.json)
  --allow-http        allow a plain http:// --url (local servers only; the TLS checks become n/a)
  --summary <dir>     print the verdict line of the newest static and live run in a report folder, then exit
  --help              show this help

The build is made if dist/ is missing. Offline, checks that need the network (npm audit, live checks,
outbound links) are reported as "not run", never as passed.
Exit codes: 0 no item failed, 1 at least one item failed, 2 the run broke (bad usage or config, build error).`;

/** Newest static/live/full run lines in a report folder (for the CI comment). */
export function summarizeRuns(reportRoot) {
  if (!existsSync(reportRoot)) return [];
  const runs = readdirSync(reportRoot)
    .filter(
      (name) =>
        name !== 'latest' && statSync(join(reportRoot, name)).isDirectory(),
    )
    .sort()
    .reverse();
  const seen = new Set();
  const lines = [];
  for (const name of runs) {
    const file = join(reportRoot, name, 'report.json');
    if (!existsSync(file)) continue;
    const report = JSON.parse(readFileSync(file, 'utf8'));
    if (seen.has(report.mode)) continue;
    seen.add(report.mode);
    lines.push({ mode: report.mode, line: report.summary });
  }
  return lines.sort((a, b) => (a.mode < b.mode ? -1 : 1));
}

function parse(argv) {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: {
      site: { type: 'string' },
      url: { type: 'string' },
      'site-url': { type: 'boolean' },
      'external-links': { type: 'boolean' },
      only: { type: 'string' },
      skip: { type: 'string' },
      config: { type: 'string' },
      out: { type: 'string' },
      qa: { type: 'string' },
      'allow-http': { type: 'boolean' },
      summary: { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  return values;
}

/**
 * Run the report. `deps` are for tests: root, runner (npm), fetchImpl, now, sleepFn.
 * Returns { report, outDir, exitCode }. Throws RunError when the run itself broke.
 */
export async function runReport(values, deps = {}) {
  const root = deps.root ?? process.env.LANDING_FACTORY_ROOT ?? ROOT;
  const skip = new Set(
    (values.skip ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  for (const group of skip)
    if (!GROUPS.includes(group))
      throw new RunError(
        `unknown group in --skip: ${group} (known: ${GROUPS.join(', ')})`,
      );
  if (values.only && !['static', 'live'].includes(values.only))
    throw new RunError('--only must be "static" or "live"');
  if (values['site-url'] && values.url)
    throw new RunError('--site-url and --url cannot be used together');
  if (values.only === 'live' && !values.url && !values['site-url'])
    throw new RunError('--only live needs --url <deployed-url> or --site-url');
  const checkUrl = (flag) => {
    let parsed;
    try {
      parsed = new URL(values.url);
    } catch {
      throw new RunError(`${flag} is not a URL: ${values.url}`);
    }
    if (parsed.protocol !== 'https:' && !values['allow-http'])
      throw new RunError(
        `${flag} must be an https:// URL (got ${values.url}); --allow-http is for local servers only`,
      );
  };
  if (values.url) checkUrl('--url');

  let paths;
  let config;
  let reportConfig;
  try {
    paths = resolveQaPaths({
      root,
      site: values.site,
      config: values.config,
      out: values.out,
    });
    config = loadConfig(paths.configPath);
    reportConfig = resolveReportConfig(config.report ?? {});
  } catch (error) {
    throw new RunError(error.message);
  }

  if (values['site-url']) {
    try {
      values = {
        ...values,
        url: readSiteUrl(join(paths.projectDir, 'dist')),
      };
    } catch (error) {
      if (error instanceof SiteUrlError)
        throw new RunError(`--site-url: ${error.message}`);
      throw error;
    }
    checkUrl('--site-url');
  }

  const runStatic = values.only !== 'live';
  const runLive = Boolean(values.url) && values.only !== 'static';
  const groups = new Set([
    ...(runStatic ? STATIC_GROUPS : []),
    ...(runLive ? ['live'] : []),
    ...(values['external-links'] ? ['external-links'] : []),
  ]);
  for (const group of skip) groups.delete(group);
  const mode = runStatic && runLive ? 'full' : runLive ? 'live' : 'static';

  const distDir = join(paths.projectDir, 'dist');
  const needsDist = [...groups].some((g) =>
    ['headers', 'dist', 'perf', 'secrets', 'legal', 'seo'].includes(g),
  );
  if (needsDist && !existsSync(join(distDir, 'index.html'))) {
    deps.log?.(
      `[report] dist/ is missing, building ${values.site ?? 'the starter'}`,
    );
    try {
      await (deps.build ?? build)(paths.projectDir);
    } catch (error) {
      throw new RunError(
        `the build failed, no verdict was written:\n${error.message}`,
      );
    }
  }
  const distExists = existsSync(join(distDir, 'index.html'));

  const startedAt = (deps.now ?? (() => new Date()))();
  const runId = startedAt
    .toISOString()
    .replace(/\.\d+Z$/, 'Z')
    .replace(/:/g, '-');
  const label = values.site ? `sites/${values.site}` : '.';
  const items = [];
  const extra = { performance: { pages: [] }, qa: null };

  const model =
    distExists &&
    [...groups].some((g) =>
      ['headers', 'dist', 'perf', 'legal', 'seo', 'external-links'].includes(g),
    )
      ? loadDist(distDir)
      : null;

  if (groups.has('headers') && model) items.push(...staticHeaderItems(model));
  if (groups.has('dist') && model)
    items.push(...distItems(model, reportConfig));
  if (groups.has('source')) {
    const srcDir = join(paths.projectDir, 'src');
    items.push(
      sinkItem(findSinks(srcDir, label === '.' ? 'src' : `${label}/src`)),
    );
  }
  if (groups.has('secrets')) {
    items.push(
      ...secretItems(
        scanTree(
          secretRoots({
            projectDir: paths.projectDir,
            label,
            isStarter: !values.site,
          }),
        ),
      ),
    );
  }
  if (groups.has('audit')) {
    items.push(
      await auditItem({
        root,
        site: values.site,
        ignore: reportConfig.audit.ignore,
        runner: deps.runner,
      }),
      lockfileItem(existsSync(join(root, 'package-lock.json'))),
    );
  }
  // The QA report (Lighthouse detail and the privacy record) is only used when it ran after this build.
  const qa =
    groups.has('perf') || groups.has('legal')
      ? loadQaReport({
          qaFile: values.qa ? resolve(values.qa) : undefined,
          qaRoot: paths.outRoot,
          distDir,
        })
      : null;
  if (qa)
    extra.qa = qa.problem
      ? { problem: qa.problem }
      : { path: relative(root, qa.path) };
  if (groups.has('perf')) {
    const lh = lighthouseItems({
      qa: qa.report,
      problem: qa.problem,
      thresholds: config.lighthouse.thresholds,
      cfg: reportConfig,
    });
    items.push(...lh.items);
    extra.performance.pages = lh.pages;
    if (model) items.push(...distPerfItems(model, reportConfig));
  }

  if (groups.has('legal') && model) {
    const { brief, problem } = readBrief(paths.projectDir, values.site);
    items.push(
      ...legalItems({
        model,
        brief,
        briefProblem: problem,
        qa,
        config: config.legal,
        siteCommand: values.site
          ? `node scripts/legal.mjs --site ${values.site} --write`
          : 'node scripts/legal.mjs --site <slug> --write',
      }),
    );
  }

  if (groups.has('seo') && model) {
    const { brief } = readBrief(paths.projectDir, values.site);
    items.push(...seoItems({ model, brief, config: reportConfig.seo }));
  }

  let liveHtml = null;
  if (groups.has('live')) {
    try {
      const live = await runLiveChecks({
        baseUrl: values.url,
        allowHttp: Boolean(values['allow-http']),
        timeoutMs: reportConfig.live.timeoutMs,
        fetchImpl: deps.fetchImpl,
      });
      items.push(...live.items);
      liveHtml = live.html;
    } catch (error) {
      throw new RunError(error.message);
    }
  }
  if (groups.has('external-links')) {
    let links = [];
    if (model) links = outboundLinks(model.pages, model.siteOrigin);
    else if (liveHtml)
      links = outboundLinks(
        [{ path: '/', scan: scanHtml(liveHtml) }],
        values.url ? new URL(values.url).origin : null,
      );
    const result = await checkLinks({
      links,
      max: reportConfig.externalLinks.max,
      gapMs: reportConfig.externalLinks.gapMs,
      timeoutMs: reportConfig.live.timeoutMs,
      fetchImpl: deps.fetchImpl,
      allowPrivate: Boolean(values['allow-http']),
      sleepFn: deps.sleepFn,
    });
    items.push(linkItem(result));
  }

  const counts = countStatuses(items);
  const verdict = verdictOf(items);
  const finishedAt = (deps.now ?? (() => new Date()))();
  const report = {
    schemaVersion: 1,
    tool: 'landing-report',
    owaspEdition: OWASP_EDITION,
    site: values.site ?? null,
    runId,
    mode,
    url: runLive || (groups.has('live') && values.url) ? values.url : null,
    verdict,
    counts,
    summary: summaryLine(verdict, counts),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    skipped: [...skip],
    groups: [...groups],
    pages: model ? model.pages.map((p) => p.path) : [],
    qa: extra.qa,
    performance: extra.performance,
    ...(groups.has('legal') ? { legalNote: LEGAL_NOTE } : {}),
    config: reportConfig,
    legalConfig: config.legal,
    items,
  };

  const reportRoot = join(paths.outRoot, 'report');
  const outDir = join(reportRoot, runId);
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await writeFile(join(outDir, 'report.md'), renderMarkdown(report));
  const latest = join(reportRoot, 'latest');
  await rm(latest, { force: true });
  await symlink(runId, latest, 'dir');
  return { report, outDir, reportRoot, exitCode: verdict === 'passed' ? 0 : 1 };
}

export async function main(argv, io = console, deps = {}) {
  let values;
  try {
    values = parse(argv);
  } catch (error) {
    io.error(`report: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  if (values.summary) {
    for (const { mode, line } of summarizeRuns(resolve(values.summary)))
      io.log(`${mode}: ${line}`);
    return 0;
  }
  try {
    const { report, outDir, exitCode } = await runReport(values, {
      ...deps,
      log: (m) => io.log(m),
    });
    const root = deps.root ?? process.env.LANDING_FACTORY_ROOT ?? ROOT;
    io.log(`Report ${report.verdict.toUpperCase()}: ${report.summary}`);
    for (const item of report.items
      .filter((i) => i.status === 'fail')
      .slice(0, 20))
      io.log(`  - [fail] ${item.id}: ${item.title}`);
    for (const item of report.items.filter((i) => i.status === 'not-run'))
      io.log(`  - [not run] ${item.id}: ${item.title}`);
    io.log(`Written: ${relative(root, join(outDir, 'report.md'))}`);
    return exitCode;
  } catch (error) {
    if (error instanceof RunError) {
      io.error(`report: ${error.message}`);
      return 2;
    }
    throw error;
  }
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
      console.error(`report: ERROR ${error.stack ?? error.message}`);
      process.exitCode = 2;
    },
  );
}
