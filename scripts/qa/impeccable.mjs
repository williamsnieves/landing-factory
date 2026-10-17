// `impeccable detect` integration: run the pinned CLI and parse its JSON.
// Real output shape (impeccable@4.6.0, `detect --json`): a JSON array of
//   { antipattern, name, description, severity: "error"|"warning"|"advisory",
//     category, file, line, snippet, advisory?: true }
// Exit codes: 0 no primary findings, 2 findings present, 1 target could not be scanned.
import { spawn } from 'node:child_process';
import { relative, resolve } from 'node:path';

/**
 * Tolerant parser: accepts a bare array or an object wrapping one under
 * `findings` / `results` / `issues`. Throws if nothing array-shaped is found, so a
 * format change is a loud failure instead of a silent pass.
 */
export function parseFindings(
  rawJson,
  { severityMap, cwd = process.cwd() } = {},
) {
  let data;
  try {
    data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  } catch (error) {
    throw new Error(`impeccable output is not valid JSON: ${error.message}`);
  }
  const list = Array.isArray(data)
    ? data
    : ['findings', 'results', 'issues']
        .map((k) => data?.[k])
        .find(Array.isArray);
  if (!list)
    throw new Error(
      'impeccable output has an unexpected shape (expected a JSON array of findings)',
    );

  return list.map((item) => {
    const raw = String(
      item.severity ?? (item.advisory ? 'advisory' : 'error'),
    ).toLowerCase();
    const mapped = item.advisory === true ? 'info' : severityMap?.[raw];
    // Unknown severities are treated as major: a new level should be noticed, not ignored.
    const level = mapped ?? 'major';
    const file = item.file
      ? relative(cwd, resolve(cwd, item.file)) || item.file
      : null;
    return {
      rule: item.antipattern ?? item.id ?? item.rule ?? 'unknown',
      name: item.name ?? null,
      severity: raw,
      level,
      unmappedSeverity: mapped === undefined,
      category: item.category ?? null,
      file,
      line: Number.isFinite(item.line) ? item.line : null,
      snippet: item.snippet ?? null,
      description: item.description ?? null,
    };
  });
}

/** Run `npx impeccable@<version> detect --json <target>` and return parsed findings. */
export function runImpeccable({ version, target, severityMap, cwd }) {
  return new Promise((resolveRun, reject) => {
    const args = ['--yes', `impeccable@${version}`, 'detect', '--json', target];
    const child = spawn('npx', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 180000);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`could not start npx: ${error.message}`));
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (signal || (code !== 0 && code !== 2)) {
        const detail = (stderr || stdout)
          .trim()
          .split('\n')
          .slice(-6)
          .join('\n');
        reject(
          new Error(
            `impeccable@${version} detect failed (${signal ?? `exit ${code}`}). It must be downloadable or cached (npx, then its platform binary in ~/.impeccable). ${detail}`,
          ),
        );
        return;
      }
      try {
        resolveRun(parseFindings(stdout, { severityMap, cwd }));
      } catch (error) {
        reject(error);
      }
    });
  });
}
