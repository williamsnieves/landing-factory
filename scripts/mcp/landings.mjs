// Read-side helpers and brief operations for the MCP tools: landings, QA and report results, the customer brief.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import {
  emptyBrief,
  formatErrors,
  missingFields,
  summarizeBrief,
  validateBrief,
} from '../lib/brief-schema.mjs';
import { validateDirections } from '../lib/directions-schema.mjs';
import { isTransferred, readExportRecord } from '../lib/export-record.mjs';
import { validateRevisions } from '../lib/revisions-schema.mjs';
import { isSiteDir, listSites } from '../lib/sites.mjs';
import { Refused, chooseDirection } from '../directions.mjs';
import { ToolError, assertSlug, briefPath, inside, siteDir } from './paths.mjs';
import { readRunLog } from './jobs.mjs';

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};

const rel = (root, path) => path.slice(root.length + 1);

// --------------------------------------------------------------------------------------------------
// QA and report results

export function readQa(root, slug) {
  assertSlug(slug);
  const path = inside(root, 'qa', slug, 'latest', 'report.json');
  const data = readJson(path);
  if (!data)
    return {
      qa: null,
      reason: `no QA run yet: qa/${slug}/latest/report.json not found (start one with run_qa)`,
    };
  const scores = {};
  for (const page of data.pages ?? [])
    for (const preset of page.lighthouse?.presets ?? [])
      scores[
        `${page.path ?? page.url ?? '?'} ${preset.preset ?? preset.name ?? ''}`.trim()
      ] = preset.scores ?? null;
  return {
    qa: {
      slug,
      verdict: data.verdict ?? null,
      runId: data.runId ?? null,
      startedAt: data.startedAt ?? null,
      finishedAt: data.finishedAt ?? null,
      durationMs: data.durationMs ?? null,
      skipped: data.skipped ?? [],
      failureCount: (data.failures ?? []).length,
      failures: (data.failures ?? []).slice(0, 50).map((f) => ({
        check: f.check,
        page: f.page ?? null,
        viewport: f.viewport ?? null,
        metric: f.metric ?? null,
        measured: f.measured ?? null,
        threshold: f.threshold ?? null,
        message: f.message,
        file: f.file ?? null,
        line: f.line ?? null,
      })),
      lighthouse: scores,
      path: rel(root, path),
    },
    reason: null,
  };
}

export function readReport(root, slug) {
  assertSlug(slug);
  const path = inside(root, 'qa', slug, 'report', 'latest', 'report.json');
  const data = readJson(path);
  if (!data)
    return {
      report: null,
      reason: `no report yet: qa/${slug}/report/latest/report.json not found (start one with run_report)`,
    };
  const items = (data.items ?? []).map((item) => ({
    id: item.id,
    area: item.area,
    owasp: item.owasp,
    status: item.status,
    title: item.title,
    ...(item.status === 'pass'
      ? {}
      : { evidence: (item.evidence ?? []).slice(0, 5), fix: item.fix ?? '' }),
  }));
  return {
    report: {
      slug,
      verdict: data.verdict ?? null,
      summary: data.summary ?? null,
      counts: data.counts ?? null,
      mode: data.mode ?? null,
      url: data.url ?? null,
      runId: data.runId ?? null,
      startedAt: data.startedAt ?? null,
      finishedAt: data.finishedAt ?? null,
      skipped: data.skipped ?? [],
      items,
      path: rel(root, path),
      markdownPath: rel(root, path).replace(/report\.json$/, 'report.md'),
    },
    reason: null,
  };
}

// --------------------------------------------------------------------------------------------------
// Landings

const verdictOf = (entry, key) =>
  entry[key]
    ? {
        verdict: entry[key].verdict,
        runId: entry[key].runId,
        finishedAt: entry[key].finishedAt,
      }
    : null;

function target(dir) {
  const config = readJson(join(dir, 'site.config.json'));
  return config?.target ?? 'cloudflare';
}

function previewUrl(root, slug) {
  const cache = readJson(join(root, '.cache', 'preview-urls.json'));
  const url = cache?.[slug];
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : null;
}

function summaryOf(root, slug) {
  const dir = siteDir(root, slug);
  const brief = readJson(join(dir, 'brief.json'));
  const run = readRunLog(root, slug);
  const qa = readQa(root, slug);
  const report = readReport(root, slug);
  return {
    slug,
    title: brief?.business?.name || null,
    target: target(dir),
    hasBrief: existsSync(join(dir, 'brief.json')),
    lastRunResult: run.result,
    qa: verdictOf(qa, 'qa'),
    qaReason: qa.reason,
    report: verdictOf(report, 'report'),
    reportReason: report.reason,
  };
}

export function listLandings(root) {
  return listSites(join(root, 'sites')).map((slug) => summaryOf(root, slug));
}

/** The directions run of a landing (ids, ideas, preview paths) and the recorded choice, or null without one. */
function directionsOf(root, slug) {
  const path = join(siteDir(root, slug), 'directions.json');
  if (!existsSync(path)) return null;
  const data = readJson(path);
  const errors = data ? validateDirections(data) : ['not valid JSON'];
  if (errors.length)
    return { error: `directions.json is invalid: ${errors[0]}` };
  return {
    directions: data.directions.map((d) => ({
      id: d.id,
      idea: d.idea,
      archetype: d.archetype,
      previewPath: `/directions/${d.id}/`,
    })),
    choice: data.choice ?? null,
  };
}

/** Revision rounds of a landing: count and the last round's number, date, result and cost; null without any. */
function revisionsOf(root, slug) {
  const path = join(siteDir(root, slug), 'revisions.json');
  if (!existsSync(path)) return null;
  const data = readJson(path);
  const errors = data ? validateRevisions(data) : ['not valid JSON'];
  if (errors.length)
    return { error: `revisions.json is invalid: ${errors[0]}` };
  const last = data.rounds.at(-1) ?? null;
  return {
    count: data.rounds.length,
    last: last
      ? {
          n: last.n,
          date: last.date,
          result: last.result,
          costUsd: last.usage?.costUsd ?? null,
        }
      : null,
  };
}

/** The repository a landing was exported to and the transfer state, or nulls without an EXPORTED.json. */
function exportOf(root, slug) {
  let record;
  try {
    record = readExportRecord(root, slug);
  } catch (error) {
    return { exported: { error: error.message }, transferred: null };
  }
  if (!record) return { exported: null, transferred: null };
  return {
    exported: {
      repository: record.repository ?? null,
      exportedAt: record.exportedAt ?? null,
      target: record.target ?? null,
    },
    transferred: isTransferred(record)
      ? { to: record.transferredTo, at: record.transferredAt ?? null }
      : null,
  };
}

export function getLanding(root, slug) {
  assertSlug(slug);
  const dir = siteDir(root, slug);
  if (!isSiteDir(dir)) {
    const known = existsSync(join(dir, 'brief.json'));
    if (!known)
      throw new ToolError(`no landing ${slug} (sites/${slug} does not exist)`);
  }
  const base = summaryOf(root, slug);
  const run = readRunLog(root, slug);
  let briefInfo = null;
  if (base.hasBrief) {
    const brief = readJson(join(dir, 'brief.json'));
    briefInfo = brief
      ? {
          summary: summarizeBrief(brief),
          valid:
            validateBrief(brief, {
              baseDir: dir,
              patternsDir: join(root, 'patterns'),
            }).length === 0,
          requiredMissing: missingFields(brief).filter((m) => m.required)
            .length,
        }
      : {
          summary: null,
          valid: false,
          requiredMissing: null,
          error: 'brief.json is not valid JSON',
        };
  }
  return {
    ...base,
    isSite: isSiteDir(dir),
    brief: briefInfo,
    previewUrl: previewUrl(root, slug),
    directions: directionsOf(root, slug),
    revisions: revisionsOf(root, slug),
    ...exportOf(root, slug),
    runPhase: run.phase,
    runTotals: run.totals,
    runUsage: readJson(join(dir, '.run-usage.json')),
  };
}

// --------------------------------------------------------------------------------------------------
// Brief

function loadBrief(root, slug) {
  const path = briefPath(root, slug);
  if (!existsSync(path))
    throw new ToolError(`no brief for ${slug}: create one with brief_init`);
  try {
    return { path, brief: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (error) {
    throw new ToolError(
      `sites/${slug}/brief.json is not valid JSON: ${error.message}`,
    );
  }
}

const check = (root, slug, brief) =>
  validateBrief(brief, {
    baseDir: siteDir(root, slug),
    patternsDir: join(root, 'patterns'),
  });

function save(path, brief) {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(brief, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

export function briefInit(root, { slug, niche, lang }) {
  const path = briefPath(root, slug);
  if (existsSync(path))
    throw new ToolError(
      `sites/${slug}/brief.json already exists; edit it with brief_update (brief_init never overwrites)`,
    );
  const language = lang ?? '';
  if (language && !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(language))
    throw new ToolError(
      `lang must be a language tag such as es or en, got ${JSON.stringify(language)}`,
    );
  mkdirSync(siteDir(root, slug), { recursive: true });
  save(
    path,
    emptyBrief({ language, niche: (niche ?? '').replace(/\s+/g, ' ').trim() }),
  );
  return { slug, path: rel(root, path), created: true };
}

export function briefValidate(root, slug) {
  const { brief } = loadBrief(root, slug);
  const errors = check(root, slug, brief);
  return { slug, valid: errors.length === 0, errors };
}

export function briefMissing(root, slug) {
  const { brief } = loadBrief(root, slug);
  const missing = missingFields(brief);
  return {
    slug,
    missing,
    requiredMissing: missing.filter((m) => m.required).length,
  };
}

export function briefSummary(root, slug) {
  const { brief } = loadBrief(root, slug);
  return { slug, summary: summarizeBrief(brief) };
}

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Deep merge: objects merge key by key, everything else (arrays included) is replaced. */
export function deepMerge(target, patch) {
  if (!isPlain(target) || !isPlain(patch)) return structuredClone(patch);
  const out = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (UNSAFE_KEYS.has(key))
      throw new ToolError(`patch key ${JSON.stringify(key)} is not allowed`);
    out[key] =
      isPlain(value) && isPlain(out[key])
        ? deepMerge(out[key], value)
        : structuredClone(value);
  }
  return out;
}

export function briefUpdate(root, { slug, patch, assumed }) {
  const { path, brief } = loadBrief(root, slug);
  if (!isPlain(patch)) throw new ToolError('patch must be an object');
  let merged = deepMerge(brief, patch);
  if (assumed !== undefined) {
    if (!Array.isArray(assumed))
      throw new ToolError('assumed must be an array of { field, reason }');
    const entries = new Map(
      (Array.isArray(merged.assumed) ? merged.assumed : []).map((e) => [
        e?.field,
        e,
      ]),
    );
    for (const entry of assumed) {
      if (
        !isPlain(entry) ||
        typeof entry.field !== 'string' ||
        typeof entry.reason !== 'string'
      )
        throw new ToolError(
          'each assumed entry needs a field and a reason (strings)',
        );
      entries.set(entry.field, { field: entry.field, reason: entry.reason });
    }
    merged = { ...merged, assumed: [...entries.values()] };
  }
  const errors = check(root, slug, merged);
  if (errors.length)
    throw new ToolError(
      `the update was not saved: the merged brief has ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n${formatErrors(errors)}`,
    );
  save(path, merged);
  return {
    slug,
    saved: true,
    summary: summarizeBrief(merged),
    requiredMissing: missingFields(merged).filter((m) => m.required).length,
  };
}

// --------------------------------------------------------------------------------------------------
// Visual directions

/** Record the customer's choice in sites/<slug>/directions.json (the only file written). */
export function chooseDirectionTool(root, { slug, direction, notes }) {
  assertSlug(slug);
  if (notes !== undefined && typeof notes !== 'string')
    throw new ToolError('notes must be a string');
  try {
    const saved = chooseDirection(root, slug, {
      direction,
      notes: notes ?? '',
    });
    return { slug, saved: true, choice: saved.choice };
  } catch (error) {
    if (error instanceof Refused) throw new ToolError(error.message);
    throw error;
  }
}
