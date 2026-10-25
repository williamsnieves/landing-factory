// Stands in for every job command in the MCP tests (MCP_TEST_JOB_STUB). It receives the job kind and the real argv,
// then follows the control file named by STUB_CONTROL (JSON): { exit, sleepMs, lines, child, ignoreTerm, files }.
//   lines: text to print; child: { pidFile } starts a long-lived child in the same process group;
//   files: [{ path (relative to LANDING_FACTORY_ROOT), content, when: "start"|"end" }].
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [kind, ...argv] = process.argv.slice(2);
let control = {};
try {
  control = JSON.parse(readFileSync(process.env.STUB_CONTROL, 'utf8'));
} catch {
  // defaults
}
const root = process.env.LANDING_FACTORY_ROOT;
const writeFiles = (when) => {
  for (const file of control.files ?? [])
    if ((file.when ?? 'end') === when) {
      const path = join(root, file.path);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.content);
    }
};

console.log(`stub ${kind} started: ${JSON.stringify(argv)}`);
for (const line of control.lines ?? []) console.log(line);
if (control.ignoreTerm)
  process.on('SIGTERM', () => console.log('stub ignores SIGTERM'));
if (control.child) {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'ignore',
  });
  writeFileSync(control.child.pidFile, String(child.pid));
}
writeFiles('start');
setTimeout(() => {
  writeFiles('end');
  console.log(`stub ${kind} done`);
  process.exit(control.exit ?? 0);
}, control.sleepMs ?? 0);
