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
if [ -n "\${STUB_STREAM:-}" ]; then cat "$STUB_STREAM"; else echo "stub claude ran"; fi
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
  assert.deepEqual(args.slice(0, 9), [
    '-p',
    `/new-landing ${slug} --niche "a \\"quoted\\" niche" --refs sonomabakery-com --dry-run --max-attempts 3 --lang es`,
    '--permission-mode',
    'acceptEdits',
    '--model',
    'sonnet-test',
    '--output-format',
    'stream-json',
    '--verbose',
  ]);
  // The rest passes the reviewed allow list of .claude/settings.json (headless runs
  // ignore it in an untrusted folder), plus the skill and subagent tools.
  const settings = JSON.parse(
    readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'),
  );
  const expected = [...settings.permissions.allow, 'Skill', 'Agent'];
  assert.deepEqual(
    args.slice(9),
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

test('the skill is not anchored on a generated site and drives the archetype flow', () => {
  const skill = readFileSync(
    join(ROOT, '.claude/skills/new-landing/SKILL.md'),
    'utf8',
  );
  assert.doesNotMatch(skill, /panaderia|clinica-dental|samurai/i);
  for (const needle of [
    'node scripts/pick-archetypes.mjs --site <slug>',
    'Signals: a, b, c',
    'Archetype blend',
    'archetype: primary+secondary',
    'archetype: custom',
    'node scripts/layout-signature.mjs --site <slug> --write',
    'starting grammar, not a template',
    'design-system/_template.md',
  ])
    assert.ok(skill.includes(needle), needle);
  assert.ok(existsSync(join(ROOT, 'design-system/_template.md')));
  // The scripts the skill runs are allowed for headless runs, and nothing broader.
  const settings = JSON.parse(
    readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'),
  );
  for (const script of [
    'pick-archetypes',
    'layout-signature',
    'validate-archetypes',
  ])
    assert.ok(
      settings.permissions.allow.includes(`Bash(node scripts/${script}.mjs *)`),
      script,
    );
  assert.ok(!settings.permissions.allow.some((p) => /^Bash\(node \*/.test(p)));
});

// --- --brief (add-brief-intake) ---------------------------------------------------------------------

const briefFixture = join(ROOT, 'tests/fixtures/brief/brief.json');
const briefSlug = `zz-nlb-${process.pid}`;

test('--brief makes --niche optional, copies the brief and its assets into the site and passes it in the prompt', () => {
  const r = run([briefSlug, '--brief', briefFixture, '--dry-run'], {
    STUB_RESULT: 'dry-run-done',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const brief = join(factoryRoot, 'sites', briefSlug, 'brief.json');
  assert.ok(existsSync(brief));
  assert.ok(
    existsSync(join(factoryRoot, 'sites', briefSlug, 'assets/logo.svg')),
  );
  assert.deepEqual(
    JSON.parse(readFileSync(brief, 'utf8')),
    JSON.parse(readFileSync(briefFixture, 'utf8')),
  );
  // The scaffold ran around the brief, and the language comes from the brief (es).
  assert.ok(existsSync(join(factoryRoot, 'sites', briefSlug, 'package.json')));
  assert.deepEqual(recorded().slice(0, 2), [
    '-p',
    `/new-landing ${briefSlug} --brief ${brief} --dry-run --max-attempts 5 --lang es`,
  ]);
});

test('with a brief, --niche and --lang still pass through; the brief language is the default', () => {
  const english = join(tmp, 'brief-en.json');
  const data = JSON.parse(readFileSync(briefFixture, 'utf8'));
  data.language = 'en';
  data.assets = [];
  writeFileSync(english, JSON.stringify(data));
  const slugEn = `${briefSlug}-en`;
  const r = run([slugEn, '--brief', english, '--niche', 'templates'], {
    STUB_RESULT: 'checkpoint',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(
    recorded()[1],
    new RegExp(
      `^/new-landing ${slugEn} --niche "templates" --brief .*brief\\.json --max-attempts 5 --lang en$`,
    ),
  );
  assert.match(
    r.stdout,
    new RegExp(`--brief .*${slugEn}/brief\\.json --resume --auto`),
  );
  assert.match(
    readFileSync(
      join(factoryRoot, 'sites', slugEn, 'src/pages/index.astro'),
      'utf8',
    ),
    /const lang = 'en';/,
  );
  const forced = run([slugEn, '--brief', english, '--lang', 'es', '--resume'], {
    STUB_RESULT: 'checkpoint',
  });
  assert.equal(forced.status, 0, forced.stderr);
  assert.match(recorded()[1], /--lang es$/);
});

test('an existing sites/<slug>/brief.json is used without the flag', () => {
  const r = run([briefSlug, '--resume'], { STUB_RESULT: 'checkpoint' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(
    recorded()[1],
    new RegExp(
      `^/new-landing ${briefSlug} --brief .*/${briefSlug}/brief\\.json --resume --max-attempts 5 --lang es$`,
    ),
  );
});

test('a folder prepared by the brief interview (brief.json and assets/) runs end to end and keeps the asset', () => {
  const prepared = `${briefSlug}-prep`;
  const dir = join(factoryRoot, 'sites', prepared);
  mkdirSync(join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, 'brief.json'), readFileSync(briefFixture));
  writeFileSync(join(dir, 'assets/logo.svg'), '<svg>mine</svg>');
  const r = run([prepared, '--dry-run'], { STUB_RESULT: 'dry-run-done' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(
    readFileSync(join(dir, 'assets/logo.svg'), 'utf8'),
    '<svg>mine</svg>',
  );
  assert.ok(existsSync(join(dir, 'package.json')));
  assert.deepEqual(
    JSON.parse(readFileSync(join(dir, 'brief.json'), 'utf8')),
    JSON.parse(readFileSync(briefFixture, 'utf8')),
  );
  assert.match(recorded()[1], new RegExp(`--brief ${dir}/brief\\.json`));
});

test('an invalid brief stops with the validator errors before anything is created or claude is started', () => {
  rmSync(argsFile, { force: true });
  const broken = join(tmp, 'brief-broken.json');
  const data = JSON.parse(readFileSync(briefFixture, 'utf8'));
  data.offer[1].price = 59;
  data.contact.email = 'not-an-email';
  writeFileSync(broken, JSON.stringify(data));
  const slugBad = `${briefSlug}-bad`;
  const r = run([slugBad, '--brief', broken]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /offer\[1\]\.price: expected a string/);
  assert.match(r.stderr, /contact\.email: expected an email/);
  assert.match(r.stderr, /the brief is invalid; nothing was created/);
  assert.ok(!existsSync(join(factoryRoot, 'sites', slugBad)));
  assert.ok(!existsSync(argsFile));
});

test('no niche and no brief, or a missing brief file, is a usage error', () => {
  const none = run([`${briefSlug}-none`]);
  assert.equal(none.status, 2);
  assert.match(none.stderr, /--niche "<text>" or --brief <file> is required/);
  const missing = run([`${briefSlug}-none`, '--brief', join(tmp, 'nope.json')]);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /--brief .*nope\.json does not exist/);
  const help = run(['--help']);
  assert.ok(help.stdout.includes('--brief'));
});

// --- usage from the stream-json output (add-agent-interface) -----------------------------------------------

const streamFixture = join(ROOT, 'tests/fixtures/claude-stream/run.jsonl');

test('claude runs with stream-json; the log stays readable and the usage is recorded in .run-usage.json and RUN.md', () => {
  const r = run([slug, '--niche', 'x', '--resume'], {
    STUB_STREAM: streamFixture,
    STUB_RESULT: 'checkpoint',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const log = readFileSync(join(siteDir, '.run.log'), 'utf8');
  for (const line of [
    'Reading the brief and choosing an archetype blend.',
    '[tool] Bash: node scripts/pick-archetypes.mjs --site demo',
    '[tool] Write: sites/demo/PROPOSAL.md',
    'Proposal written. Review it before the build.',
  ])
    assert.ok(log.includes(line), line);
  // The result text repeats the last message: it is printed once. Raw events and file bodies stay out.
  assert.equal(
    log.split('Proposal written. Review it before the build.').length,
    2,
  );
  assert.ok(!log.includes('"type":"assistant"'));
  assert.ok(!log.includes('long body that must not be logged'));
  const usage = JSON.parse(
    readFileSync(join(siteDir, '.run-usage.json'), 'utf8'),
  );
  assert.equal(usage.reported, true);
  assert.equal(usage.inputTokens, 1234);
  assert.equal(usage.outputTokens, 567);
  assert.equal(usage.cacheCreationTokens, 8900);
  assert.equal(usage.cacheReadTokens, 45000);
  assert.equal(usage.totalCostUsd, 0.42);
  assert.equal(usage.numTurns, 12);
  const runMd = readFileSync(join(siteDir, 'RUN.md'), 'utf8');
  assert.match(
    runMd,
    /\nUsage: input 1,234 tokens, output 567, cache write 8,900, cache read 45,000, cost \$0\.4200 USD, 12 turns \(reported by Claude Code\)\.\n$/,
  );
  assert.ok(runMd.indexOf('## Totals') < runMd.indexOf('Usage: input'));
});

test('an unparseable stream falls back to raw lines and "not reported"', () => {
  const garbage = join(tmp, 'garbage.txt');
  writeFileSync(
    garbage,
    'plain text, not json\n{"type": broken\nsecond line\n',
  );
  const r = run([slug, '--niche', 'x', '--resume'], {
    STUB_STREAM: garbage,
    STUB_RESULT: 'checkpoint',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const log = readFileSync(join(siteDir, '.run.log'), 'utf8');
  for (const line of ['plain text, not json', '{"type": broken', 'second line'])
    assert.ok(log.includes(line), line);
  const usage = JSON.parse(
    readFileSync(join(siteDir, '.run-usage.json'), 'utf8'),
  );
  assert.equal(usage.reported, false);
  assert.match(
    readFileSync(join(siteDir, 'RUN.md'), 'utf8'),
    /\nUsage: not reported[^\n]*\n$/,
  );
});

test('a failing claude still fails the run when its output goes through the filter', () => {
  const r = run([slug, '--niche', 'x', '--resume'], {
    STUB_STREAM: streamFixture,
    STUB_RESULT: 'passed',
    STUB_EXIT: '4',
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /claude exited with status 4/);
});

test('claude-stream.mjs formats events and summarizes usage', async () => {
  const { describeEvent, usageFromResult, usageLine } =
    await import('../scripts/lib/claude-stream.mjs');
  assert.deepEqual(
    describeEvent({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'hello' },
          { type: 'tool_use', name: 'Skill', input: { skill: 'impeccable' } },
          { type: 'tool_use', name: 'Agent', input: {} },
        ],
      },
    }),
    ['hello', '[tool] Skill: impeccable', '[tool] Agent'],
  );
  assert.deepEqual(describeEvent({ type: 'user' }), []);
  assert.match(
    describeEvent({
      type: 'result',
      is_error: true,
      subtype: 'error_max_turns',
    })[0],
    /\[claude\] error: error_max_turns/,
  );
  assert.deepEqual(usageFromResult({ type: 'result' }), { reported: false });
  assert.equal(
    usageLine({ reported: false }).startsWith('Usage: not reported'),
    true,
  );
});
