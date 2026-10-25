#!/usr/bin/env node
// Local MCP server for the landing factory: JSON-RPC 2.0 over stdio, tools only, no SDK dependency.
// Only protocol messages go to stdout; logs go to stderr. Design: openspec/changes/add-agent-interface/design.md.
//
//   node scripts/mcp/server.mjs
//
// Environment: LANDING_FACTORY_ROOT (tests: read sites/, patterns/ and .cache/ in another folder),
// MCP_MAX_JOBS ("2" or "generation=1,check=2"). The server never publishes, commits or pushes (see commands.mjs).
// Tests only (needs NODE_TEST_CONTEXT, which the Node test runner sets): MCP_TEST_JOB_STUB=<node script> runs that
// script in place of every job command; MCP_TEST_CANCEL_GRACE_MS shortens the cancel grace period.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createJobs } from './jobs.mjs';
import { CODE_ROOT, factoryRoot } from './paths.mjs';
import { createProtocol, serveStdio } from './protocol.mjs';
import { createTools } from './tools.mjs';

const log = (message) => process.stderr.write(`[mcp] ${message}\n`);

export function createServer(env = process.env) {
  const root = factoryRoot(env);
  const testing = Boolean(env.NODE_TEST_CONTEXT);
  const stub = testing && env.MCP_TEST_JOB_STUB ? env.MCP_TEST_JOB_STUB : null;
  const graceMs =
    testing && Number(env.MCP_TEST_CANCEL_GRACE_MS) > 0
      ? Number(env.MCP_TEST_CANCEL_GRACE_MS)
      : 10_000;
  const jobs = createJobs({ root, env, stub, graceMs });
  const version = JSON.parse(
    readFileSync(join(CODE_ROOT, 'package.json'), 'utf8'),
  ).version;
  const protocol = createProtocol({
    tools: createTools({ root, jobs }),
    version,
    log,
  });
  return { protocol, jobs, root };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { protocol, jobs } = createServer();
  try {
    const removed = jobs.prune();
    if (removed.length) log(`pruned ${removed.length} old job(s)`);
  } catch (error) {
    log(`could not prune old jobs: ${error.message}`);
  }
  serveStdio(protocol, process.stdin, process.stdout, log).then(() =>
    process.exit(0),
  );
}
