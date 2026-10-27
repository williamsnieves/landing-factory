// scripts/revise-landing.sh and scripts/revisions.mjs with a stub `claude` on PATH that plays the skill: it records
// its arguments and writes REVISION.md and the round into revisions.json. Everything lives in a temp factory root
// (LANDING_FACTORY_ROOT); the real sites/ is never touched and the real claude is never started.
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
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { main as revisionsMain } from '../scripts/revisions.mjs';
import { validateRevisions } from '../scripts/lib/revisions-schema.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCRIPT = join(ROOT, 'scripts/revise-landing.sh');
const tmp = mkdtempSync(join(tmpdir(), 'revise-landing-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const argsFile = join(tmp, 'claude-args.txt');
const stubDir = join(tmp, 'bin');
mkdirSync(stubDir);
// The stub plays the skill. STUB_RESULT: the Result line of REVISION.md; STUB_NO_ROUND: do not record the round.
writeFileSync(
  join(stubDir, 'claude'),
  `#!/usr/bin/env bash
printf '%s\\n' "$@" > "${argsFile}"
if [ -n "\${STUB_STREAM:-}" ]; then cat "$STUB_STREAM"; else echo "stub claude ran"; fi
slug="$(echo "$2" | sed -n 's#^/revise-landing \\([a-z0-9-]*\\) .*#\\1#p')"
round="$(echo "$2" | sed -n 's#.* --round \\([0-9]*\\) .*#\\1#p')"
site="$LANDING_FACTORY_ROOT/sites/$slug"
if [ -n "\${STUB_RESULT:-}" ]; then
  printf '# Revision\\n\\nResult: %s\\n' "$STUB_RESULT" > "$site/REVISION.md"
  if [ -z "\${STUB_NO_ROUND:-}" ] && [ "$STUB_RESULT" != "failed" ]; then
    node -e '
      const fs = require("fs");
      const file = process.argv[1];
      const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { version: 1, rounds: [] };
      data.rounds.push({ n: Number(process.argv[2]), date: "2026-10-27", feedback: "stub feedback",
        items: [{ kind: process.argv[3] === "needs-rebuild" ? "rebuild" : "copy", summary: "stub" }],
        briefChanged: false, files: [], result: process.argv[3] });
      fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\\n");
    ' "$site/revisions.json" "$round" "$STUB_RESULT"
  fi
fi
exit "\${STUB_EXIT:-0}"
`,
);
chmodSync(join(stubDir, 'claude'), 0o755);

const put = (base, file, content) => {
  mkdirSync(dirname(join(base, file)), { recursive: true });
  writeFileSync(join(base, file), content);
};

/** A factory root with one built site "acme" (Result: passed) unless told otherwise. */
function makeRoot({ run = '# Run\n\nResult: passed\n', extra = {} } = {}) {
  const root = mkdtempSync(join(tmp, 'root-'));
  const site = join(root, 'sites/acme');
  put(site, 'package.json', '{"name":"site-acme"}');
  if (run !== null) put(site, 'RUN.md', run);
  for (const [file, content] of Object.entries(extra)) put(site, file, content);
  return { root, site };
}

const feedbackFile = (text = 'Please shorten the hero heading.') => {
  const file = join(tmp, `feedback-${Math.random().toString(36).slice(2)}.txt`);
  writeFileSync(file, text);
  return file;
};

function run(root, args, env = {}) {
  return spawnSync('bash', [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env.PATH}`,
      LANDING_FACTORY_ROOT: root,
      REVISE_LANDING_SKIP: 'final-check',
      ...env,
    },
  });
}
const recorded = () => readFileSync(argsFile, 'utf8').trimEnd().split('\n');
const resetArgs = () => rmSync(argsFile, { force: true });

test('--help prints the usage and exits 0', () => {
  const r = run(makeRoot().root, ['--help']);
  assert.equal(r.status, 0);
  for (const text of [
    '--feedback',
    '--max-attempts',
    '--model',
    'needs-rebuild',
  ])
    assert.ok(r.stdout.includes(text), text);
});

test('a bad feedback file or argument exits 2 and does not start claude', () => {
  const { root } = makeRoot();
  const empty = feedbackFile('  \n');
  const long = feedbackFile('x'.repeat(4001));
  const cases = [
    [[], /slug is required/],
    [['Bad Slug', '--feedback', empty], /invalid slug/],
    [['acme'], /--feedback .* is required/],
    [['acme', '--feedback', join(tmp, 'nope.txt')], /is not a file/],
    [['acme', '--feedback', tmp], /is not a file/],
    [['acme', '--feedback', empty], /is empty/],
    [['acme', '--feedback', long], /longer than 4000/],
    [
      ['acme', '--feedback', feedbackFile(), '--max-attempts', 'x'],
      /--max-attempts/,
    ],
    [['acme', '--feedback', feedbackFile(), '--model', 'Bad Model'], /--model/],
    [['acme', '--feedback', feedbackFile(), '--bogus'], /unknown option/],
    [['acme', 'other', '--feedback', feedbackFile()], /unexpected argument/],
  ];
  resetArgs();
  for (const [args, pattern] of cases) {
    const r = run(root, args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, pattern, args.join(' '));
  }
  assert.equal(existsSync(argsFile), false, 'claude was never started');
  // Exactly 4000 characters is accepted.
  const exact = run(
    root,
    ['acme', '--feedback', feedbackFile('x'.repeat(4000))],
    {
      STUB_RESULT: 'passed',
    },
  );
  assert.equal(exact.status, 0, exact.stdout + exact.stderr);
});

test('refusals exit 1 naming the reason and do not start claude', () => {
  const cases = [
    {
      name: 'missing site',
      root: makeRoot().root,
      slug: 'ghost',
      pattern: /no site "ghost"/,
    },
    {
      name: 'transferred',
      made: makeRoot({
        extra: {
          'EXPORTED.json': JSON.stringify({
            repository: 'https://github.com/owner/acme',
            transferredTo: 'customer',
            transferredAt: '2026-10-27T10:00:00.000Z',
          }),
        },
      }),
      pattern: /was transferred to customer/,
    },
    {
      name: 'direction pages',
      made: makeRoot({
        extra: { 'src/pages/directions/a/index.astro': '<p />' },
      }),
      pattern: /direction pages/,
    },
    {
      name: 'no finished build (no RUN.md)',
      made: makeRoot({ run: null }),
      pattern: /no finished build/,
    },
    {
      name: 'no finished build (Result: failed)',
      made: makeRoot({ run: '# Run\n\nResult: failed\n' }),
      pattern: /no finished build/,
    },
  ];
  for (const c of cases) {
    const root = c.root ?? c.made.root;
    resetArgs();
    const r = run(root, [c.slug ?? 'acme', '--feedback', feedbackFile()], {
      STUB_RESULT: 'passed',
    });
    assert.equal(r.status, 1, c.name);
    assert.match(r.stderr, c.pattern, c.name);
    assert.equal(existsSync(argsFile), false, `${c.name}: claude not started`);
  }
});

test('the prompt carries the round number and the feedback path; a passed round records its usage', () => {
  const { root, site } = makeRoot();
  const feedback = feedbackFile('Shorten the hero heading.');
  const r = run(root, ['acme', '--feedback', feedback, '--max-attempts', '3'], {
    STUB_RESULT: 'passed',
    STUB_STREAM: join(ROOT, 'tests/fixtures/claude-stream/run.jsonl'),
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const args = recorded();
  assert.equal(args[0], '-p');
  assert.equal(
    args[1],
    `/revise-landing acme --round 1 --feedback-file ${feedback} --max-attempts 3`,
  );
  assert.ok(args.includes('acceptEdits'));
  assert.ok(args.includes('stream-json'));
  const data = JSON.parse(readFileSync(join(site, 'revisions.json'), 'utf8'));
  assert.deepEqual(validateRevisions(data), []);
  assert.equal(data.rounds[0].result, 'passed');
  assert.equal(data.rounds[0].usage.costUsd, 0.42);
  assert.equal(data.rounds[0].usage.inputTokens, 1234);
  assert.match(readFileSync(join(site, '.revise.log'), 'utf8'), /round 1/);
  assert.match(r.stdout, /round 1 of acme passed/);
  assert.match(r.stdout, /sync-export\.mjs --site acme/);
});

test('the second round is numbered 2 and --model is passed on; usage not reported is null', () => {
  const { root, site } = makeRoot();
  const first = run(root, ['acme', '--feedback', feedbackFile()], {
    STUB_RESULT: 'passed',
  });
  assert.equal(first.status, 0, first.stdout + first.stderr);
  const second = run(
    root,
    ['acme', '--feedback', feedbackFile(), '--model', 'sonnet-5'],
    { STUB_RESULT: 'passed' },
  );
  assert.equal(second.status, 0, second.stdout + second.stderr);
  const args = recorded();
  assert.match(args[1], /--round 2 /);
  assert.equal(args[args.indexOf('--model') + 1], 'sonnet-5');
  const data = JSON.parse(readFileSync(join(site, 'revisions.json'), 'utf8'));
  assert.equal(data.rounds.length, 2);
  assert.equal(data.rounds[1].usage, null);
});

test('Result: failed exits non-zero; needs-rebuild exits 0 and names the way out', () => {
  const failed = makeRoot();
  const f = run(failed.root, ['acme', '--feedback', feedbackFile()], {
    STUB_RESULT: 'failed',
  });
  assert.equal(f.status, 1);
  assert.match(f.stderr, /round 1 failed/);

  const rebuild = makeRoot();
  const r = run(rebuild.root, ['acme', '--feedback', feedbackFile()], {
    STUB_RESULT: 'needs-rebuild',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /needs a rebuild/);
  assert.match(r.stdout, /--directions/);
  const data = JSON.parse(
    readFileSync(join(rebuild.site, 'revisions.json'), 'utf8'),
  );
  assert.equal(data.rounds[0].result, 'needs-rebuild');
});

test('no result, a claude error or an unrecorded round fail the run', () => {
  const none = makeRoot();
  const a = run(none.root, ['acme', '--feedback', feedbackFile()], {});
  assert.equal(a.status, 1);
  assert.match(a.stderr, /ended without a result/);

  const broken = makeRoot();
  const b = run(broken.root, ['acme', '--feedback', feedbackFile()], {
    STUB_RESULT: 'passed',
    STUB_EXIT: '4',
  });
  assert.equal(b.status, 1);
  assert.match(b.stderr, /claude exited with status 4/);

  const unrecorded = makeRoot();
  const c = run(unrecorded.root, ['acme', '--feedback', feedbackFile()], {
    STUB_RESULT: 'passed',
    STUB_NO_ROUND: '1',
  });
  assert.equal(c.status, 1);
  assert.match(c.stderr, /was not recorded correctly/);
});

test('a stale REVISION.md of an earlier round is not mistaken for the new result', () => {
  const { root } = makeRoot({
    extra: { 'REVISION.md': '# Revision\n\nResult: passed\n' },
  });
  const r = run(root, ['acme', '--feedback', feedbackFile()], {});
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ended without a result/);
});

test('revisions.mjs: preflight, next, validate, show and attach-usage', () => {
  const { root, site } = makeRoot();
  const io = () => {
    const out = [];
    const err = [];
    return {
      out,
      err,
      io: { log: (m) => out.push(m), error: (m) => err.push(m) },
    };
  };
  let c = io();
  assert.equal(revisionsMain(['preflight', '--site', 'acme'], c.io, root), 0);
  c = io();
  assert.equal(revisionsMain(['next', '--site', 'acme'], c.io, root), 0);
  assert.deepEqual(c.out, ['1']);
  c = io();
  assert.equal(revisionsMain(['show', '--site', 'acme'], c.io, root), 0);
  assert.match(c.out.join(''), /No revision rounds/);
  put(site, 'revisions.json', '{"version":1,"rounds":[{"n":2}]}');
  c = io();
  assert.equal(revisionsMain(['validate', '--site', 'acme'], c.io, root), 1);
  assert.match(c.err.join(''), /rounds\[0\]\.n: must be 1/);
  put(
    site,
    'revisions.json',
    JSON.stringify({
      version: 1,
      rounds: [
        {
          n: 1,
          date: '2026-10-27',
          feedback: 'f',
          items: [],
          briefChanged: false,
          files: [],
          result: 'passed',
        },
      ],
    }),
  );
  c = io();
  assert.equal(
    revisionsMain(
      [
        'attach-usage',
        '--site',
        'acme',
        '--round',
        '2',
        '--usage',
        join(site, 'u.json'),
      ],
      c.io,
      root,
    ),
    1,
  );
  put(site, 'u.json', JSON.stringify({ reported: true, totalCostUsd: 1.5 }));
  c = io();
  assert.equal(
    revisionsMain(
      [
        'attach-usage',
        '--site',
        'acme',
        '--round',
        '1',
        '--usage',
        join(site, 'u.json'),
      ],
      c.io,
      root,
    ),
    0,
  );
  assert.equal(
    JSON.parse(readFileSync(join(site, 'revisions.json'), 'utf8')).rounds[0]
      .usage.costUsd,
    1.5,
  );
  for (const argv of [
    [],
    ['nope', '--site', 'acme'],
    ['next'],
    ['next', '--site', 'Bad_Slug'],
    ['attach-usage', '--site', 'acme'],
  ]) {
    c = io();
    assert.equal(revisionsMain(argv, c.io, root), 2, argv.join(' '));
  }
});
