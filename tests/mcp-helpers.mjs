// Shared helpers for the MCP tests: a fixture repository in a temp folder, a stdio client for the real server
// process, and a job stub (tests/mcp-job-stub.mjs) that stands in for every job command.
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const SERVER = join(ROOT, 'scripts/mcp/server.mjs');
export const STUB = join(ROOT, 'tests/mcp-job-stub.mjs');
export const BRIEF_FIXTURE = join(ROOT, 'tests/fixtures/brief');

/** Build a token-shaped string at runtime so no credential-looking literal sits in the source. */
export const fakeGithubToken = () => ['gh', 'p_'].join('') + 'a1B2'.repeat(9);

export function waitFor(
  check,
  { timeout = 15_000, interval = 25, what = 'condition' } = {},
) {
  const started = Date.now();
  return new Promise((resolvePromise, reject) => {
    const tick = async () => {
      try {
        const value = await check();
        if (value) return resolvePromise(value);
      } catch {
        // keep polling
      }
      if (Date.now() - started > timeout)
        return reject(new Error(`timed out waiting for ${what}`));
      setTimeout(tick, interval);
    };
    tick();
  });
}

export const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * A fixture repository: sites/alpha (brief, RUN.md, QA and report results, vercel target), sites/beta (a bare site),
 * patterns/{sonomabakery-com,sheet-b}.md. Returns { root, cleanup }.
 */
export function makeFixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'mcp-root-'));
  const alpha = join(root, 'sites/alpha');
  mkdirSync(alpha, { recursive: true });
  cpSync(join(BRIEF_FIXTURE, 'brief.json'), join(alpha, 'brief.json'));
  cpSync(join(BRIEF_FIXTURE, 'assets'), join(alpha, 'assets'), {
    recursive: true,
  });
  writeFileSync(join(alpha, 'package.json'), '{"name":"site-alpha"}\n');
  writeFileSync(
    join(alpha, 'site.config.json'),
    '{"target":"vercel","vercel":{}}\n',
  );
  writeFileSync(
    join(alpha, 'RUN.md'),
    `# Run log: alpha

Result: passed

## Phases

| Phase         | Status  | Started | Finished | Notes |
| ------------- | ------- | ------- | -------- | ----- |
| brief         | done    |         |          |       |
| synthesis     | done    |         |          |       |
| build         | pending |         |          |       |

## Totals

Wall clock about 42 minutes.

Usage: input 1,000 tokens, output 500, cost $0.1000 USD (reported by Claude Code).
`,
  );
  writeFileSync(
    join(alpha, '.run-usage.json'),
    JSON.stringify({
      reported: true,
      inputTokens: 1000,
      outputTokens: 500,
      totalCostUsd: 0.1,
    }),
  );
  const beta = join(root, 'sites/beta');
  mkdirSync(beta, { recursive: true });
  writeFileSync(join(beta, 'package.json'), '{"name":"site-beta"}\n');
  // A planning folder without package.json is not a landing.
  mkdirSync(join(root, 'sites/planning-only'), { recursive: true });
  writeFileSync(join(root, 'sites/planning-only/PROPOSAL.md'), '# x\n');
  mkdirSync(join(root, 'patterns'), { recursive: true });
  for (const sheet of ['sonomabakery-com', 'sheet-b'])
    writeFileSync(join(root, 'patterns', `${sheet}.md`), '# sheet\n');

  const qaDir = join(root, 'qa/alpha/2026-10-20T10-00-00Z');
  mkdirSync(qaDir, { recursive: true });
  writeFileSync(
    join(qaDir, 'report.json'),
    JSON.stringify({
      schemaVersion: 1,
      site: 'alpha',
      runId: '2026-10-20T10-00-00Z',
      verdict: 'failed',
      startedAt: '2026-10-20T10:00:00.000Z',
      finishedAt: '2026-10-20T10:01:00.000Z',
      durationMs: 60000,
      skipped: ['lighthouse'],
      pages: [],
      failures: [
        {
          check: 'overflow',
          page: '/',
          viewport: 375,
          metric: 'scrollWidth',
          measured: 400,
          threshold: 375,
          message: 'Horizontal overflow at 375 px',
        },
      ],
    }),
  );
  // qa/<slug>/latest is a symlink in the real repository; a plain copy is enough for readers.
  cpSync(qaDir, join(root, 'qa/alpha/latest'), { recursive: true });
  const reportDir = join(root, 'qa/alpha/report/latest');
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    join(reportDir, 'report.json'),
    JSON.stringify({
      schemaVersion: 1,
      site: 'alpha',
      runId: '2026-10-20T10-05-00Z',
      mode: 'static',
      url: null,
      verdict: 'failed',
      summary: 'failed: 1 fail, 1 warn',
      counts: { pass: 1, warn: 1, fail: 1, na: 0, 'not-run': 0 },
      startedAt: '2026-10-20T10:05:00.000Z',
      finishedAt: '2026-10-20T10:05:30.000Z',
      skipped: [],
      items: [
        {
          id: 'headers-baseline',
          area: 'security',
          owasp: 'A02',
          status: 'pass',
          title: 'Headers',
          evidence: ['ok'],
          fix: '',
        },
        {
          id: 'legal-pages',
          area: 'legal',
          owasp: 'A05',
          status: 'fail',
          title: 'Legal pages',
          evidence: ['no /privacy/ page'],
          fix: 'Add the page',
        },
        {
          id: 'hsts',
          area: 'security',
          owasp: 'A02',
          status: 'warn',
          title: 'HSTS',
          evidence: ['missing'],
          fix: 'Add HSTS',
        },
      ],
    }),
  );
  mkdirSync(join(root, '.cache'), { recursive: true });
  writeFileSync(
    join(root, '.cache/preview-urls.json'),
    JSON.stringify({ alpha: 'https://alpha-preview.example.pages.dev' }),
  );
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

/** A client for the real server process over stdio (newline-delimited JSON-RPC). */
export class McpClient {
  constructor(env = {}) {
    this.child = spawn(process.execPath, [SERVER], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.stdoutLines = [];
    this.stderr = '';
    this.waiters = new Map();
    this.nextId = 1;
    let buffer = '';
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        this.stdoutLines.push(line);
        try {
          const message = JSON.parse(line);
          const waiter = this.waiters.get(message.id);
          if (waiter) {
            this.waiters.delete(message.id);
            waiter(message);
          }
        } catch {
          // reported by the "only JSON on stdout" test
        }
      }
    });
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (chunk) => (this.stderr += chunk));
    this.exited = new Promise((done) =>
      this.child.on('exit', (code, signal) => done({ code, signal })),
    );
  }

  write(text) {
    this.child.stdin.write(text.endsWith('\n') ? text : `${text}\n`);
  }

  notify(method, params) {
    this.write(
      JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}) }),
    );
  }

  request(method, params, timeout = 15_000) {
    const id = this.nextId++;
    const reply = new Promise((done, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`no reply to ${method}`)),
        timeout,
      );
      this.waiters.set(id, (message) => {
        clearTimeout(timer);
        done(message);
      });
    });
    this.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        ...(params !== undefined ? { params } : {}),
      }),
    );
    return reply;
  }

  async initialize(protocolVersion = '2025-11-25') {
    const reply = await this.request('initialize', {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: 'test-client', version: '0.0.0' },
    });
    this.notify('notifications/initialized');
    return reply;
  }

  /** tools/call returning the result object (never throws on isError). */
  async call(name, args = {}) {
    const reply = await this.request('tools/call', { name, arguments: args });
    if (reply.error)
      throw new Error(`${name}: ${reply.error.code} ${reply.error.message}`);
    return reply.result;
  }

  async close() {
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.stdin.end();
      const timer = setTimeout(() => this.child.kill('SIGKILL'), 3000);
      await this.exited;
      clearTimeout(timer);
    }
  }
}
