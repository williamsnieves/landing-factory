#!/usr/bin/env node
// Wrapper that runs one job command and records how it ended, so a job finishes cleanly even when the MCP server is gone.
//
//   node scripts/mcp/run-job.mjs <jobDir> <graceMs> -- <command> [args...]
//
// stdout and stderr are inherited (the server points them at the job's log). The wrapper leads a process group
// (the server starts it detached); the command runs inside that group. When the group gets SIGTERM (cancel) the
// command is given `graceMs` to stop, then the whole group is killed. The outcome is written to <jobDir>/exit.json
// ({ exitCode, signal, finishedAt, durationMs }); job.json belongs to the server.
import { spawn } from 'node:child_process';
import { renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [jobDir, graceArg, separator, command, ...args] = process.argv.slice(2);
if (!jobDir || separator !== '--' || !command) {
  process.stderr.write(
    'usage: run-job.mjs <jobDir> <graceMs> -- <command> [args...]\n',
  );
  process.exit(2);
}
const graceMs = Number(graceArg) || 10_000;
const started = Date.now();
let terminating = false;
let killTimer = null;

function record(exitCode, signal) {
  const file = join(jobDir, 'exit.json');
  writeFileSync(
    `${file}.tmp`,
    `${JSON.stringify({ exitCode, signal, finishedAt: new Date().toISOString(), durationMs: Date.now() - started })}\n`,
  );
  renameSync(`${file}.tmp`, file);
}

const killGroup = () => {
  try {
    process.kill(-process.pid, 'SIGKILL');
  } catch {
    // the group is already gone
  }
};

const child = spawn(command, args, { stdio: 'inherit' });

child.on('error', (error) => {
  process.stderr.write(
    `run-job: could not start ${command}: ${error.message}\n`,
  );
  record(127, null);
  process.exit(127);
});

process.on('SIGTERM', () => {
  if (terminating) return;
  terminating = true;
  // The group received the same signal; give the command a moment to stop, then end everything.
  killTimer = setTimeout(() => {
    record(null, 'SIGKILL');
    killGroup();
  }, graceMs);
});

child.on('close', (code, signal) => {
  if (killTimer) clearTimeout(killTimer);
  record(code, signal);
  // After a cancel, sweep any grandchild that is still in the group.
  if (terminating) killGroup();
  process.exit(0);
});
