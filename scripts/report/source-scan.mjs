// Scans of the landing's own files: raw HTML injection sinks in the source and credential patterns in
// the site folder and its build. A matched secret only ever leaves this module through mask().
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { walkFiles } from './fs-util.mjs';
import { cap, makeItem } from './items.mjs';
import { mask } from './mask.mjs';

const SKIP_DIRS = ['node_modules', '.astro', '.git'];
const MAX_SCAN_BYTES = 3 * 1024 * 1024;
const BINARY_EXT =
  /\.(png|jpe?g|webp|avif|gif|ico|bmp|woff2?|ttf|otf|eot|pdf|mp4|webm|mov|mp3|ogg|wav|glb|gltf|bin|zip|gz|br|wasm|psd|ai|heic)$/i;

// --- injection sinks --------------------------------------------------------------------------------

const SINKS = [
  ['set:html', /\bset:html\b/],
  ['innerHTML', /\.innerHTML\b/],
  ['outerHTML', /\.outerHTML\b/],
  ['document.write', /\bdocument\.write(ln)?\s*\(/],
  ['eval', /(^|[^\w.$])eval\s*\(/],
  ['new Function', /\bnew\s+Function\s*\(/],
];
const SOURCE_EXT = /\.(astro|[cm]?[jt]sx?)$/;

/**
 * Raw HTML injection in the landing's own source (`src/`). Returns [{ file, line, sink }].
 * Comment-only lines are skipped; everything else counts, because a sink is risky wherever it sits.
 */
export function findSinks(srcDir, labelRoot) {
  if (!existsSync(srcDir)) return [];
  const hits = [];
  for (const file of walkFiles(srcDir, { skipDirs: SKIP_DIRS })) {
    if (!SOURCE_EXT.test(file.rel) || file.size > MAX_SCAN_BYTES) continue;
    const lines = readFileSync(file.abs, 'utf8').split(/\r?\n/);
    lines.forEach((text, index) => {
      const trimmed = text.trim();
      if (/^(\/\/|\/\*|\*|<!--)/.test(trimmed)) return;
      for (const [sink, re] of SINKS)
        if (re.test(text))
          hits.push({
            file: `${labelRoot}/${file.rel}`,
            line: index + 1,
            sink,
          });
    });
  }
  return hits;
}

export function sinkItem(hits) {
  return makeItem({
    id: 'injection-sinks',
    area: 'security',
    owasp: 'A05',
    status: hits.length ? 'warn' : 'pass',
    title: hits.length
      ? `${hits.length} raw HTML or code injection sink(s) in the source`
      : 'No set:html, innerHTML, outerHTML, document.write, eval or new Function in the source',
    evidence: cap(hits.map((h) => `${h.file}:${h.line} ${h.sink}`)),
    fix: 'Render text with Astro expressions or textContent. If the HTML is trusted and static, keep the sink but confirm it never contains user or third-party input.',
  });
}

// --- secrets ------------------------------------------------------------------------------------------

/** Provider patterns: a match fails the report. Order matters: the first pattern to claim a span wins. */
export const SECRET_PATTERNS = [
  [
    'private key',
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----/g,
  ],
  [
    'AWS access key id',
    /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA|AIPA)[0-9A-Z]{16}\b/g,
  ],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g],
  ['Stripe live key', /\b[sr]k_live_[A-Za-z0-9]{16,}\b/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g],
  ['OpenAI API key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/g],
];

/** Noisy: warns only. */
const GENERIC =
  /(?:secret|token|password|passwd|api[_-]?key)["']?\s*[:=]\s*(['"])([^'"\s]{16,})\1/gi;
const PLACEHOLDER =
  /example|sample|placeholder|changeme|your[_-]|xxxx|\*{4}|\$\{|process\.env|import\.meta|<[a-z_-]+>/i;

const ENV_FILE = /(^|\/)\.env(\.[^/]+)?$/;
const ENV_SAFE = /\.(example|sample|template)$/;

/**
 * Scan text for credentials. Returns [{ line, name, masked, generic }] and never the raw match.
 */
export function scanText(text) {
  const found = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    if (lineText.length > 20000) lineText = lineText.slice(0, 20000);
    const claimed = [];
    for (const [name, re] of SECRET_PATTERNS) {
      re.lastIndex = 0;
      for (const match of lineText.matchAll(re)) {
        const start = match.index;
        const end = start + match[0].length;
        if (claimed.some(([s, e]) => start < e && end > s)) continue;
        claimed.push([start, end]);
        found.push({
          line: index + 1,
          name,
          masked: mask(match[0]),
          generic: false,
        });
      }
    }
    GENERIC.lastIndex = 0;
    for (const match of lineText.matchAll(GENERIC)) {
      const value = match[2];
      const start = match.index;
      const end = start + match[0].length;
      if (claimed.some(([s, e]) => start < e && end > s)) continue;
      if (PLACEHOLDER.test(value) || /^(.)\1+$/.test(value)) continue;
      found.push({
        line: index + 1,
        name: 'generic credential assignment',
        masked: mask(value),
        generic: true,
      });
    }
  });
  return found;
}

/**
 * Scan a folder tree. `roots` are [{ dir, label }]; files are labelled `<label>/<relative path>`.
 * Returns { findings: [{ file, line, name, masked, generic }], envFiles: [file], scanned }.
 */
export function scanTree(roots) {
  const findings = [];
  const envFiles = [];
  let scanned = 0;
  for (const { dir, label, files } of roots) {
    const list = files ?? walkFiles(dir, { skipDirs: SKIP_DIRS });
    for (const file of list) {
      const shown = `${label}/${file.rel}`.replace(/^\.\//, '');
      if (ENV_FILE.test(file.rel) && !ENV_SAFE.test(file.rel))
        envFiles.push(shown);
      if (BINARY_EXT.test(file.rel) || file.size > MAX_SCAN_BYTES) continue;
      const buffer = readFileSync(file.abs);
      if (buffer.subarray(0, 8000).includes(0)) continue;
      scanned += 1;
      for (const hit of scanText(buffer.toString('utf8')))
        findings.push({ file: shown, ...hit });
    }
  }
  return { findings, envFiles, scanned };
}

export function secretItems({ findings, envFiles, scanned }) {
  const strong = findings.filter((f) => !f.generic);
  const weak = findings.filter((f) => f.generic);
  const lines = [
    ...envFiles.map(
      (f) => `${f} (environment file; it does not belong in a site folder)`,
    ),
    ...strong.map((f) => `${f.file}:${f.line} ${f.name} ${f.masked}`),
  ];
  return [
    makeItem({
      id: 'secrets',
      area: 'security',
      owasp: 'A04',
      status: lines.length ? 'fail' : 'pass',
      title: lines.length
        ? `${lines.length} credential(s) or environment file(s) in the site folder or its build`
        : `No credentials found (${scanned} text file(s) scanned)`,
      evidence: cap(lines),
      fix: 'Remove the secret from the file and from git history, rotate it at the provider, and keep credentials in the host or CI secrets. Delete .env files from the site folder.',
    }),
    makeItem({
      id: 'secrets-generic',
      area: 'security',
      owasp: 'A04',
      status: weak.length ? 'warn' : 'pass',
      title: weak.length
        ? `${weak.length} value(s) assigned to a secret-like name (token, password, api key)`
        : 'No secret-like assignments',
      evidence: cap(weak.map((f) => `${f.file}:${f.line} ${f.masked}`)),
      fix: 'Check each one. Public identifiers (a publishable key, an analytics id) are fine; anything private must move out of the file.',
    }),
  ];
}

/**
 * The files a landing's secret scan covers. A site: its whole folder (minus node_modules, .astro, .git).
 * The starter: its own source, public files, config and build, not the sites/ or tooling folders.
 */
export function secretRoots({ projectDir, label, isStarter }) {
  if (!isStarter) return [{ dir: projectDir, label }];
  const folders = ['src', 'public', 'dist'];
  const roots = folders
    .filter((f) => existsSync(join(projectDir, f)))
    .map((f) => ({ dir: join(projectDir, f), label: f }));
  const top = walkFiles(projectDir, {
    skipDirs: [
      ...SKIP_DIRS,
      ...folders,
      'sites',
      'qa',
      'scripts',
      'tests',
      '.claude',
      '.cache',
      'openspec',
      'docs',
      'third-party-licenses',
    ],
  }).filter((f) => !f.rel.includes('/'));
  return [...roots, { dir: projectDir, label: '.', files: top }];
}
