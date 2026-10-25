// The rsync adapters for a VPS and for shared hosting with SSH. Plans (argv lists) are built by pure functions
// and run by `runSteps`. The SSH key comes from DEPLOY_SSH_KEY and lives only in a 0700 temporary folder, in a
// 0600 file that is removed afterwards; the server is pinned with the `hostKey` known_hosts line and host key
// checking is never relaxed. Design: openspec/changes/add-deploy-adapters/design.md, Decision 5.
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { checkRemotePath } from './config.mjs';
import { redact } from './redact.mjs';

export const KEY_VARIABLE = 'DEPLOY_SSH_KEY';
export const RELEASE_ID = /^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{7}$/;
const RELEASE_GREP = '^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{7}$';

/** An error whose message is safe to print. */
export class RsyncError extends Error {
  constructor(message, code = 'failed') {
    super(message);
    this.name = 'RsyncError';
    this.code = code;
  }
}

/** `20261024T101500Z-abc1234`: UTC time and the first 7 characters of the commit. */
export function releaseId(date = new Date(), commit = '') {
  const stamp = date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
  const sha = /^[0-9a-f]{7,40}$/i.test(commit)
    ? commit.slice(0, 7).toLowerCase()
    : '0000000';
  return `${stamp}-${sha}`;
}

/** Shell-quote only when needed; deploy paths are validated to a safe alphabet, so they stay readable. */
const sq = (value) =>
  /^[\w./@:=+,~-]+$/.test(String(value))
    ? String(value)
    : `'${String(value).replace(/'/g, `'\\''`)}'`;

/** SSH options: no user config, the pinned known_hosts only, strict checking, no prompts. */
export function sshOptions({ keyPath, knownHostsPath, port }) {
  return [
    '-F',
    '/dev/null',
    '-i',
    keyPath,
    '-p',
    String(port),
    '-o',
    'IdentitiesOnly=yes',
    '-o',
    `UserKnownHostsFile=${knownHostsPath}`,
    '-o',
    'GlobalKnownHostsFile=/dev/null',
    '-o',
    'StrictHostKeyChecking=yes',
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=20',
  ];
}

/** Transport over SSH: rsync -e "ssh ...", remote scripts through ssh. */
export function sshTransport({ host, user, port, keyPath, knownHostsPath }) {
  const options = sshOptions({ keyPath, knownHostsPath, port });
  if (options.some((o) => /\s/.test(o)))
    throw new RsyncError(
      'the temporary key folder path must not contain spaces',
    );
  return {
    kind: 'ssh',
    path: (p) => p,
    rsyncArgs: ['-e', `ssh ${options.join(' ')}`],
    dest: (p) => `${user}@${host}:${p}`,
    command: (script) => ['ssh', ...options, `${user}@${host}`, script],
  };
}

/**
 * Test-only transport: the "server" is a local folder and remote scripts run with `sh -c`. Only the library
 * accepts it (as a dependency); no CLI option or configuration value can select it.
 */
export function localTransport(root) {
  return {
    kind: 'local',
    path: (p) => join(root, p),
    rsyncArgs: [],
    dest: (p) => p,
    command: (script) => ['sh', '-c', script],
  };
}

const assertRelease = (id) => {
  if (!RELEASE_ID.test(id)) throw new RsyncError(`"${id}" is not a release id`);
};

/** The steps of a VPS deploy. Nothing is served from the new folder until the last step switches `current`. */
export function planVps({ vps, dist, id, transport }) {
  assertRelease(id);
  const base = checkRemotePath(vps.path, 'vps.path', 'vps');
  const p = transport.path(base);
  const keep = vps.keep ?? 5;
  const release = `${p}/releases/${id}`;
  const switchScript = [
    'set -eu',
    `cd ${sq(p)}`,
    `ln -sfn ${sq(`releases/${id}`)} current.tmp`,
    'mv -Tf current.tmp current',
    'now=$(basename "$(readlink current)")',
    `ls -1 releases | grep -E ${sq(RELEASE_GREP)} | sort -r | tail -n +${keep + 1} | while IFS= read -r old; do [ "$old" = "$now" ] || rm -rf -- "releases/$old"; done || true`,
  ].join('\n');
  return [
    {
      id: 'prepare',
      title: 'create the releases folder',
      argv: transport.command(`mkdir -p ${sq(`${p}/releases`)}`),
    },
    {
      id: 'upload',
      title: `upload the build into releases/${id} (hard links to the current release)`,
      argv: [
        'rsync',
        '-az',
        '--delete',
        '--chmod=D755,F644',
        `--link-dest=${p}/current/`,
        ...transport.rsyncArgs,
        `${dist.replace(/\/+$/, '')}/`,
        `${transport.dest(release)}/`,
      ],
      // A failed upload leaves no half release behind, and `current` was never touched.
      onFail: transport.command(`rm -rf -- ${sq(release)}`),
    },
    {
      id: 'switch',
      title: `switch current to releases/${id} in one step and keep the last ${keep} releases`,
      argv: transport.command(switchScript),
    },
  ];
}

/** Point `current` at the release before the one it serves. Prints the release id on success. */
export function planRollback({ vps, transport }) {
  const p = transport.path(checkRemotePath(vps.path, 'vps.path', 'vps'));
  const script = [
    'set -eu',
    `cd ${sq(p)}`,
    'cur=$(basename "$(readlink current)")',
    `prev=$(ls -1 releases | grep -E ${sq(RELEASE_GREP)} | sort | awk -v c="$cur" '$0 < c' | tail -n 1)`,
    'if [ -z "$prev" ]; then echo "no previous release to roll back to" >&2; exit 1; fi',
    'ln -sfn "releases/$prev" current.tmp',
    'mv -Tf current.tmp current',
    'echo "$prev"',
  ].join('\n');
  return [
    {
      id: 'rollback',
      title: 'point current at the previous release',
      argv: transport.command(script),
      capture: true,
    },
  ];
}

/** Shared hosting over SSH: the staged build (with .htaccess) replaces the document root, applied at the end. */
export function planShared({ shared, staging, transport }) {
  const base = checkRemotePath(
    shared.path,
    'shared.path',
    'shared',
    shared.allowPath ?? [],
  );
  const p = transport.path(base);
  return [
    {
      id: 'upload',
      title: `upload the build to ${base}/ (changes applied at the end; files not in the build are removed)`,
      argv: [
        'rsync',
        '-az',
        '--delete-after',
        '--delay-updates',
        '--chmod=D755,F644',
        '--exclude=/.well-known/',
        ...transport.rsyncArgs,
        `${staging.replace(/\/+$/, '')}/`,
        `${transport.dest(p)}/`,
      ],
    },
  ];
}

/** A command line for display: any argument holding the key path or known_hosts path is shown as given. */
export const displayArgv = (argv) =>
  argv
    .map((arg) => (/[\s'"$]/.test(arg) ? sq(arg) : arg))
    .join(' ')
    .replace(/\n/g, '\n    ');

/** Run argv as a child process with a minimal environment; resolves { code, stdout, stderr }. */
export function execute(argv, { env = {}, timeoutMs = 600_000 } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(argv[0], argv.slice(1), {
        env: { PATH: process.env.PATH ?? '', LANG: 'C', ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      resolve({ code: 127, stdout: '', stderr: error.message });
      return;
    }
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        code: 127,
        stdout,
        stderr:
          error.code === 'ENOENT'
            ? `${argv[0]}: command not found`
            : error.message,
      });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/** Run the steps in order; stop at the first failure (after its `onFail` cleanup). Returns the captured output. */
export async function runSteps(
  steps,
  { exec = execute, secrets = [], log = () => {}, bins = {}, source = {} },
) {
  const swap = (argv) => [bins[argv[0]] ?? argv[0], ...argv.slice(1)];
  let captured = '';
  for (const step of steps) {
    log(step.title);
    // A step names the child's variables and the secret each one is read from; the values never enter a plan.
    const env = Object.fromEntries(
      Object.entries(step.envFrom ?? {}).map(([name, from]) => [
        name,
        source[from] ?? '',
      ]),
    );
    const result = await exec(swap(step.argv), { env });
    if (result.code !== 0) {
      if (step.onFail) await exec(swap(step.onFail), { env });
      const detail = redact(
        (result.stderr || result.stdout)
          .trim()
          .split('\n')
          .slice(-6)
          .join('\n'),
        secrets,
      );
      const missing = /command not found/.test(detail)
        ? ` (install it: apt-get install -y ${step.argv[0] === 'ssh' ? 'openssh-client' : 'rsync'})`
        : '';
      throw new RsyncError(
        `step "${step.id}" failed with exit code ${result.code}${missing}${detail ? `:\n${detail}` : ''}`,
      );
    }
    if (step.capture) captured = result.stdout.trim();
  }
  return captured;
}

/** A private temporary folder (0700) that is removed in `finally`, whatever `fn` does. */
export async function withTempDir(base, fn) {
  const dir = mkdtempSync(join(base ?? tmpdir(), 'lf-deploy-'));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * A private SSH session folder: the key (0600) and the pinned known_hosts, removed in `finally`.
 * `fn({ keyPath, knownHostsPath, dir })` runs while the folder exists.
 */
export async function withSession({ key, hostKey, base }, fn) {
  const secret = String(key ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!secret)
    throw new RsyncError(
      `${KEY_VARIABLE} is not set; export it in the environment (never pass it as an argument)`,
      'no-key',
    );
  if (!/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/.test(secret))
    throw new RsyncError(
      `${KEY_VARIABLE} does not look like a private key (PEM or OpenSSH format)`,
      'bad-key',
    );
  return withTempDir(base, (dir) => {
    const keyPath = join(dir, 'id');
    const knownHostsPath = join(dir, 'known_hosts');
    writeFileSync(keyPath, `${secret}\n`, { mode: 0o600 });
    writeFileSync(knownHostsPath, `${hostKey}\n`, { mode: 0o600 });
    return fn({ keyPath, knownHostsPath, dir });
  });
}

/** Copy the build into a staging folder next to the session and add the generated files. */
export function stageBuild(dist, dir, generated = {}) {
  const staging = join(dir, 'staging');
  mkdirSync(staging, { recursive: true });
  cpSync(dist, staging, { recursive: true, dereference: false });
  for (const [name, content] of Object.entries(generated))
    writeFileSync(join(staging, name), content);
  return staging;
}
