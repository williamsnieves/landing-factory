// Tests for scripts/new-landing.sh with a stub `claude` on PATH that records its arguments.
// The dry-run test scaffolds a throwaway site in sites/ (removed afterwards); preflight and npm install
// are skipped through NEW_LANDING_SKIP, and the real Claude run is never started.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCRIPT = join(ROOT, 'scripts/new-landing.sh');
const tmp = mkdtempSync(join(tmpdir(), 'new-landing-test-'));
const slug = `zz-nl-${process.pid}`;
// Everything is created in a temp root (LANDING_FACTORY_ROOT); the real sites/ is never touched.
const factoryRoot = mkdtempSync(join(tmpdir(), 'new-landing-root-'));
const siteDir = join(factoryRoot, 'sites', slug);
after(() => {
  rmSync(tmp, { recursive: true, force: true });
  rmSync(factoryRoot, { recursive: true, force: true });
});

// The stub records its arguments (one per line) and plays the skill: it writes STUB_RESULT into RUN.md.
const argsFile = join(tmp, 'claude-args.txt');
const stubDir = join(tmp, 'bin');
mkdirSync(stubDir);
writeFileSync(
  join(stubDir, 'claude'),
  `#!/usr/bin/env bash
printf '%s\\n' "$@" > "${argsFile}"
echo "stub claude ran"
target="$LANDING_FACTORY_ROOT/sites/$(echo "$2" | sed -n 's#^/new-landing \\([a-z0-9-]*\\) .*#\\1#p')/RUN.md"
if [ -n "\${STUB_RESULT:-}" ] && [ -f "$target" ]; then
  sed -i "s/^Result: .*/Result: $STUB_RESULT/" "$target"
fi
exit "\${STUB_EXIT:-0}"
`,
);
chmodSync(join(stubDir, 'claude'), 0o755);

function run(args, env = {}) {
  return spawnSync('bash', [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env.PATH}`,
      NEW_LANDING_SKIP: 'preflight,install,final-check',
      LANDING_FACTORY_ROOT: factoryRoot,
      ...env,
    },
  });
}
const recorded = () => readFileSync(argsFile, 'utf8').trimEnd().split('\n');

test('--help prints the usage and exits 0', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0);
  for (const text of [
    '--niche',
    '--refs',
    '--auto',
    '--dry-run',
    '--max-attempts',
    '--model',
    '--resume',
  ])
    assert.ok(r.stdout.includes(text), text);
});

test('argument errors exit 2 with a message and create nothing', () => {
  const cases = [
    [[], /slug is required/],
    [['Bad Slug', '--niche', 'x'], /invalid slug/],
    [['--niche', 'x'], /slug is required/],
    [['cafe'], /--niche/],
    [['cafe', '--niche', '   '], /--niche/],
    [['cafe', '--niche'], /--niche needs a value/],
    [['cafe', '--niche', 'x', '--max-attempts', 'many'], /--max-attempts/],
    [['cafe', '--niche', 'x', '--max-attempts', '-1'], /--max-attempts/],
    [
      ['cafe', '--niche', 'x', '--refs', 'no-such-sheet'],
      /patterns\/no-such-sheet\.md does not exist/,
    ],
    [['cafe', '--niche', 'x', '--refs', 'a,b,c,d'], /at most 3/],
    [['cafe', '--niche', 'x', '--bogus'], /unknown option --bogus/],
    [['cafe', 'other', '--niche', 'x'], /unexpected argument "other"/],
    [['cafe', '--niche', 'x', '--lang', 'Spanish!'], /--lang/],
    [
      [`${slug}-missing`, '--niche', 'x', '--resume'],
      /--resume needs an existing/,
    ],
  ];
  for (const [args, pattern] of cases) {
    const r = run(args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, pattern, args.join(' '));
  }
  assert.ok(!existsSync(join(factoryRoot, 'sites/cafe')));
});

test('a missing claude CLI is reported before anything is created', () => {
  const noClaude = spawnSync('bash', ['-c', 'command -v claude'], {
    env: { PATH: '/usr/bin:/bin' },
  });
  if (noClaude.status === 0) return; // claude lives in a system path here; nothing to test
  const r = spawnSync('/bin/bash', [SCRIPT, slug, '--niche', 'x'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      PATH: '/usr/bin:/bin',
      NEW_LANDING_SKIP: 'preflight,install',
      LANDING_FACTORY_ROOT: factoryRoot,
    },
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /claude CLI is not on PATH/);
  assert.ok(!existsSync(siteDir));
});

test('--dry-run scaffolds the site with its templates, then runs claude with the right arguments', () => {
  const r = run(
    [
      slug,
      '--niche',
      'a "quoted" niche',
      '--refs',
      'sonomabakery-com',
      '--dry-run',
      '--max-attempts',
      '3',
      '--model',
      'sonnet-test',
    ],
    { STUB_RESULT: 'dry-run-done' },
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /stub claude ran/);
  assert.match(r.stdout, /dry run done/);
  for (const file of [
    'package.json',
    'PROPOSAL.md',
    'RUN.md',
    'assets.json',
    'site.config.json',
    'CREDITS.md',
    'src/pages/index.astro',
  ])
    assert.ok(existsSync(join(siteDir, file)), file);
  assert.match(
    readFileSync(join(siteDir, 'src/pages/index.astro'), 'utf8'),
    /const lang = 'es';/,
  );
  const args = recorded();
  assert.deepEqual(args.slice(0, 6), [
    '-p',
    `/new-landing ${slug} --niche "a \\"quoted\\" niche" --refs sonomabakery-com --dry-run --max-attempts 3 --lang es`,
    '--permission-mode',
    'acceptEdits',
    '--model',
    'sonnet-test',
  ]);
  // The rest passes the reviewed allow list of .claude/settings.json (headless runs
  // ignore it in an untrusted folder), plus the skill and subagent tools.
  const settings = JSON.parse(
    readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'),
  );
  const expected = [...settings.permissions.allow, 'Skill', 'Agent'];
  assert.deepEqual(
    args.slice(6),
    expected.flatMap((tool) => ['--allowedTools', tool]),
  );
  // Output is logged next to the site.
  const log = readFileSync(join(siteDir, '.run.log'), 'utf8');
  assert.match(log, /new-landing\.sh zz-nl-/);
  assert.match(log, /stub claude ran/);
  // Nothing was built: only the planning templates and the scaffold exist.
  assert.ok(!existsSync(join(siteDir, 'src/components/sections')));
  assert.ok(!existsSync(join(factoryRoot, 'design-system', slug)));
  // The scaffold also refuses a second run on the same slug without --resume (new-site refuses).
  const again = run([slug, '--niche', 'x', '--dry-run'], {
    STUB_RESULT: 'dry-run-done',
  });
  assert.notEqual(again.status, 0);
});

test('the exit code follows the Result line the skill writes in RUN.md', () => {
  const resume = (result, extra = [], env = {}) =>
    run([slug, '--niche', 'dental clinic', '--resume', ...extra], {
      STUB_RESULT: result,
      ...env,
    });
  // Interactive checkpoint: success, with the instruction to continue.
  const checkpoint = resume('checkpoint');
  assert.equal(checkpoint.status, 0, checkpoint.stderr);
  assert.match(checkpoint.stdout, /proposal ready for review/);
  assert.match(checkpoint.stdout, /--resume --auto/);
  assert.deepEqual(recorded().slice(0, 2), [
    '-p',
    `/new-landing ${slug} --niche "dental clinic" --resume --max-attempts 5 --lang es`,
  ]);
  const auto = resume('passed', ['--auto']);
  assert.equal(auto.status, 0, auto.stderr);
  assert.match(recorded()[1], /--auto --resume --max-attempts 5/);
  // Exhausted attempts, a missing result and a claude error are all failures.
  const failed = resume('failed', ['--auto', '--max-attempts', '0']);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /RUN\.md/);
  assert.match(recorded()[1], /--max-attempts 0/);
  const pending = resume('pending');
  assert.equal(pending.status, 1);
  assert.match(pending.stderr, /without a result/);
  const crashed = resume('passed', [], { STUB_EXIT: '3' });
  assert.equal(crashed.status, 1);
  assert.match(crashed.stderr, /status 3/);
});

test('--resume does not scaffold again and skips the slug part of the preflight', () => {
  const r = run([slug, '--niche', 'x', '--resume'], {
    STUB_RESULT: 'checkpoint',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes('Created sites/'));
});

test('a failing preflight stops before anything is created or claude is started', () => {
  rmSync(argsFile, { force: true });
  // "panaderia" exists in the temp root, so the slug check fails whatever the network does.
  mkdirSync(join(factoryRoot, 'sites/panaderia'), { recursive: true });
  writeFileSync(join(factoryRoot, 'sites/panaderia/package.json'), '{}');
  const r = run(['panaderia', '--niche', 'x'], {
    NEW_LANDING_SKIP: 'install,final-check',
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /preflight failed; nothing was created/);
  assert.match(r.stdout, /FAIL Site slug: sites\/panaderia already exists/);
  assert.ok(!existsSync(argsFile));
});

test('--sources is validated and passed to the skill', () => {
  const bad = run([slug, '--niche', 'samurai', '--sources', 'artic']);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /--sources takes a comma list of commons, met/);
  const ok = run(
    [
      slug,
      '--niche',
      'samurai',
      '--sources',
      'commons,met',
      '--dry-run',
      '--resume',
    ],
    {
      STUB_RESULT: 'dry-run-done',
    },
  );
  assert.equal(ok.status, 0, ok.stderr);
  assert.ok(recorded()[1].includes('--sources commons,met'));
});
