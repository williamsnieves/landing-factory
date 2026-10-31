// Landing, QA, report and brief tools, and the argv each job tool builds, on a temporary fixture repository.
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  FEEDBACK_PLACEHOLDER,
  JOB_KINDS,
  buildCommand,
} from '../scripts/mcp/commands.mjs';
import { createServer } from '../scripts/mcp/server.mjs';
import { makeFixtureRoot } from './mcp-helpers.mjs';

const fixture = makeFixtureRoot();
after(() => fixture.cleanup());
const { root } = fixture;
const { protocol } = createServer({ LANDING_FACTORY_ROOT: root });

let nextId = 1;
/** Call a tool through the protocol layer, like a client does. */
async function call(name, args = {}) {
  const reply = await protocol.handle({
    jsonrpc: '2.0',
    id: nextId++,
    method: 'tools/call',
    params: { name, arguments: args },
  });
  if (reply.error)
    throw new Error(`${reply.error.code} ${reply.error.message}`);
  return reply.result;
}
const ok = async (name, args) => {
  const result = await call(name, args);
  assert.equal(result.isError, undefined, result.content[0].text);
  return result.structuredContent;
};
const refused = async (name, args) => {
  const result = await call(name, args);
  assert.equal(result.isError, true, `${name} should be refused`);
  return result.content[0].text;
};

// --- 2.1 landings, QA and report ---------------------------------------------------------------------

test('list_landings lists the sites with target, brief, last result and the latest verdicts with dates', async () => {
  const { landings } = await ok('list_landings');
  assert.deepEqual(
    landings.map((l) => l.slug),
    ['alpha', 'beta'],
  ); // planning-only has no package.json
  const alpha = landings.find((l) => l.slug === 'alpha');
  assert.equal(alpha.title, 'Taller Plantilla');
  assert.equal(alpha.target, 'vercel');
  assert.equal(alpha.hasBrief, true);
  assert.equal(alpha.lastRunResult, 'passed');
  assert.deepEqual(alpha.qa, {
    verdict: 'failed',
    runId: '2026-10-20T10-00-00Z',
    finishedAt: '2026-10-20T10:01:00.000Z',
  });
  assert.equal(alpha.report.verdict, 'failed');
  assert.equal(alpha.report.finishedAt, '2026-10-20T10:05:30.000Z');
  const beta = landings.find((l) => l.slug === 'beta');
  assert.equal(beta.target, 'cloudflare'); // the default
  assert.equal(beta.hasBrief, false);
  assert.equal(beta.lastRunResult, null);
  assert.equal(beta.qa, null);
  assert.match(beta.qaReason, /no QA run yet/);
  assert.equal(beta.report, null);
  assert.match(beta.reportReason, /no report yet/);
});

test('get_landing adds the brief summary, totals, usage and the cached preview URL', async () => {
  const alpha = await ok('get_landing', { slug: 'alpha' });
  assert.equal(alpha.target, 'vercel');
  assert.match(alpha.brief.summary, /Taller Plantilla/);
  assert.equal(alpha.brief.valid, true);
  assert.equal(alpha.brief.requiredMissing, 0);
  assert.equal(alpha.previewUrl, 'https://alpha-preview.example.pages.dev');
  assert.match(alpha.runTotals, /Wall clock about 42 minutes/);
  assert.equal(alpha.runUsage.inputTokens, 1000);
  assert.equal(alpha.runPhase, 'build'); // the first phase that is not done
  assert.equal(alpha.qa.verdict, 'failed');
  const beta = await ok('get_landing', { slug: 'beta' });
  assert.equal(beta.brief, null);
  assert.equal(beta.previewUrl, null);
  assert.equal(beta.runTotals, null);
});

test('get_landing refuses a bad slug and an unknown landing', async () => {
  assert.match(
    await refused('get_landing', { slug: '../etc' }),
    /invalid slug/,
  );
  assert.match(
    await refused('get_landing', { slug: 'Not A Slug' }),
    /slug rule|invalid slug/,
  );
  assert.match(
    await refused('get_landing', { slug: 'ghost' }),
    /no landing ghost/,
  );
});

test('get_qa and get_report return structured results; a missing run is null with a reason', async () => {
  const { qa, reason } = await ok('get_qa', { slug: 'alpha' });
  assert.equal(reason, null);
  assert.equal(qa.verdict, 'failed');
  assert.equal(qa.finishedAt, '2026-10-20T10:01:00.000Z');
  assert.equal(qa.failureCount, 1);
  assert.equal(qa.failures[0].check, 'overflow');
  assert.equal(qa.failures[0].viewport, 375);
  assert.deepEqual(qa.skipped, ['lighthouse']);
  assert.equal(qa.path, 'qa/alpha/latest/report.json');

  const { report } = await ok('get_report', { slug: 'alpha' });
  assert.equal(report.verdict, 'failed');
  assert.equal(report.counts.fail, 1);
  assert.equal(report.mode, 'static');
  const byId = Object.fromEntries(report.items.map((i) => [i.id, i]));
  assert.equal(byId['headers-baseline'].evidence, undefined); // passes are listed without detail
  assert.deepEqual(byId['legal-pages'].evidence, ['no /privacy/ page']);
  assert.equal(byId['legal-pages'].fix, 'Add the page');
  assert.equal(report.markdownPath, 'qa/alpha/report/latest/report.md');

  const noQa = await ok('get_qa', { slug: 'beta' });
  assert.equal(noQa.qa, null);
  assert.match(noQa.reason, /no QA run yet/);
  const noReport = await ok('get_report', { slug: 'beta' });
  assert.equal(noReport.report, null);
  assert.match(noReport.reason, /no report yet/);
  assert.match(await refused('get_qa', { slug: '../x' }), /invalid slug/);
});

// --- 2.2 briefs --------------------------------------------------------------------------------------

const briefFile = (slug) => join(root, 'sites', slug, 'brief.json');
const bytes = (slug) => readFileSync(briefFile(slug));

test('brief_validate, brief_missing and brief_summary read the brief', async () => {
  const valid = await ok('brief_validate', { slug: 'alpha' });
  assert.deepEqual(valid, { slug: 'alpha', valid: true, errors: [] });
  const missing = await ok('brief_missing', { slug: 'alpha' });
  assert.equal(missing.requiredMissing, 0);
  assert.ok(Array.isArray(missing.missing));
  assert.match(
    (await ok('brief_summary', { slug: 'alpha' })).summary,
    /Taller Plantilla/,
  );
  assert.match(
    await refused('brief_validate', { slug: 'beta' }),
    /no brief for beta/,
  );
});

test('an update that validates is written and arrays are replaced', async () => {
  const before = JSON.parse(bytes('alpha'));
  assert.equal(before.tone.length, 3);
  const result = await ok('brief_update', {
    slug: 'alpha',
    patch: { tone: ['directo'], contact: { phone: '+34 600 123 456' } },
  });
  assert.equal(result.saved, true);
  const after = JSON.parse(bytes('alpha'));
  assert.deepEqual(after.tone, ['directo']); // replaced, not merged
  assert.equal(after.contact.phone, '+34 600 123 456');
  assert.equal(after.contact.email, before.contact.email); // objects merge
  assert.equal(after.business.name, before.business.name);
  assert.ok(readFileSync(briefFile('alpha'), 'utf8').endsWith('\n'));
});

test('an invalid update is refused with the errors and the file is byte-identical', async () => {
  const snapshot = bytes('alpha');
  const text = await refused('brief_update', {
    slug: 'alpha',
    patch: { contact: { email: 'not-an-email' } },
  });
  assert.match(text, /contact\.email/);
  assert.match(text, /not saved/);
  assert.deepEqual(bytes('alpha'), snapshot);
  assert.ok(!existsSync(`${briefFile('alpha')}.tmp`));
});

test('legal holder data and the AI-image consent can never be marked assumed', async () => {
  const snapshot = bytes('alpha');
  for (const field of [
    'legal.holder.taxId',
    'brand.aiImages',
    'legal.privacyContact',
    'legal',
  ]) {
    const text = await refused('brief_update', {
      slug: 'alpha',
      patch: {},
      assumed: [{ field, reason: 'the agent guessed' }],
    });
    assert.match(text, /assumed/, field);
    assert.deepEqual(bytes('alpha'), snapshot, field);
  }
  // A non-identity field can be assumed, with a reason, and replaces an older entry for the same field.
  await ok('brief_update', {
    slug: 'alpha',
    patch: {},
    assumed: [{ field: 'contact.hours', reason: 'new reason' }],
  });
  const saved = JSON.parse(bytes('alpha'));
  assert.equal(
    saved.assumed.filter((a) => a.field === 'contact.hours').length,
    1,
  );
  assert.equal(
    saved.assumed.find((a) => a.field === 'contact.hours').reason,
    'new reason',
  );
  // Prototype-pollution keys are refused.
  const polluted = JSON.parse('{"__proto__": {"x": 1}}');
  assert.match(
    await refused('brief_update', { slug: 'alpha', patch: polluted }),
    /not allowed/,
  );
});

test('brief_init writes a skeleton for a new slug and never overwrites', async () => {
  const created = await ok('brief_init', {
    slug: 'gamma',
    niche: 'a  small\nbakery',
    lang: 'en',
  });
  assert.equal(created.created, true);
  const brief = JSON.parse(bytes('gamma'));
  assert.equal(brief.language, 'en');
  assert.equal(brief.business.description, 'a small bakery');
  const snapshot = bytes('gamma');
  assert.match(
    await refused('brief_init', { slug: 'gamma', niche: 'other' }),
    /already exists/,
  );
  assert.deepEqual(bytes('gamma'), snapshot);
  const alphaSnapshot = bytes('alpha');
  await refused('brief_init', { slug: 'alpha' });
  assert.deepEqual(bytes('alpha'), alphaSnapshot);
  assert.match(
    await refused('brief_init', { slug: '../escape' }),
    /invalid slug/,
  );
  assert.match(
    await refused('brief_init', { slug: 'delta', lang: 'Spanish!' }),
    /language tag/,
  );
  assert.ok(!existsSync(join(root, 'sites/delta')));
  // A fresh skeleton is not a landing yet, and has required fields missing.
  assert.ok((await ok('brief_missing', { slug: 'gamma' })).requiredMissing > 0);
  const { landings } = await ok('list_landings');
  assert.ok(!landings.some((l) => l.slug === 'gamma'));
});

test('invalid JSON in a brief is reported, not thrown', async () => {
  await ok('brief_init', { slug: 'broken' });
  writeFileSync(briefFile('broken'), '{ nope');
  assert.match(
    await refused('brief_validate', { slug: 'broken' }),
    /not valid JSON/,
  );
  assert.match(
    await refused('brief_update', { slug: 'broken', patch: {} }),
    /not valid JSON/,
  );
});

// --- 3.2 the argv of each job tool -------------------------------------------------------------------

test('the argv built for each job tool and option is exact', () => {
  const argv = (kind, input) => buildCommand(kind, input, root).argv;
  assert.deepEqual(argv('propose', { slug: 'alpha' }), [
    'bash',
    'scripts/new-landing.sh',
    'alpha',
  ]);
  assert.deepEqual(
    argv('propose', {
      slug: 'newsite',
      niche: 'dental clinic',
      refs: ['sonomabakery-com', 'sheet-b'],
      lang: 'en',
      model: 'sonnet-4.5',
    }),
    [
      'bash',
      'scripts/new-landing.sh',
      'newsite',
      '--niche',
      'dental clinic',
      '--refs',
      'sonomabakery-com,sheet-b',
      '--lang',
      'en',
      '--model',
      'sonnet-4.5',
    ],
  );
  assert.deepEqual(argv('generate', { slug: 'newsite', niche: 'x' }), [
    'bash',
    'scripts/new-landing.sh',
    'newsite',
    '--auto',
    '--niche',
    'x',
  ]);
  assert.deepEqual(
    argv('generate', {
      slug: 'alpha',
      resume: true,
      refs: ['sheet-b'],
      model: 'opus',
      maxAttempts: 0,
    }),
    [
      'bash',
      'scripts/new-landing.sh',
      'alpha',
      '--auto',
      '--resume',
      '--refs',
      'sheet-b',
      '--model',
      'opus',
      '--max-attempts',
      '0',
    ],
  );
  assert.deepEqual(argv('qa', { slug: 'alpha' }), [
    'node',
    'scripts/qa.mjs',
    '--site',
    'alpha',
  ]);
  assert.deepEqual(
    argv('qa', {
      slug: 'alpha',
      skip: ['lighthouse', 'impeccable', 'lighthouse'],
    }),
    [
      'node',
      'scripts/qa.mjs',
      '--site',
      'alpha',
      '--skip',
      'lighthouse,impeccable',
    ],
  );
  assert.deepEqual(argv('report', { slug: 'alpha' }), [
    'node',
    'scripts/landing-report.mjs',
    '--site',
    'alpha',
  ]);
  assert.deepEqual(
    argv('report', { slug: 'alpha', url: 'https://alpha.example.com' }),
    [
      'node',
      'scripts/landing-report.mjs',
      '--site',
      'alpha',
      '--url',
      'https://alpha.example.com',
    ],
  );
});

test('the preview job builds new-landing.sh --directions with a validated count', () => {
  const argv = (input) => buildCommand('preview', input, root).argv;
  assert.deepEqual(argv({ slug: 'alpha' }), [
    'bash',
    'scripts/new-landing.sh',
    'alpha',
    '--directions',
  ]);
  assert.deepEqual(
    argv({
      slug: 'newsite',
      niche: 'dental clinic',
      refs: ['sheet-b'],
      lang: 'en',
      count: 2,
      model: 'opus',
    }),
    [
      'bash',
      'scripts/new-landing.sh',
      'newsite',
      '--directions',
      '--count',
      '2',
      '--niche',
      'dental clinic',
      '--refs',
      'sheet-b',
      '--lang',
      'en',
      '--model',
      'opus',
    ],
  );
  for (const [input, pattern] of [
    [{ slug: 'alpha', count: 4 }, /count must be 2 or 3/],
    [{ slug: 'alpha', count: '3' }, /count must be 2 or 3/],
    [{ slug: 'newsite' }, /niche, or create a brief/],
    [{ slug: '../etc', niche: 'x' }, /invalid slug/],
    [{ slug: 'alpha', model: 'a; b' }, /invalid model/],
  ])
    assert.throws(() => buildCommand('preview', input, root), pattern);
});

test('the revise job builds revise-landing.sh with the feedback file placeholder and validated options', () => {
  const built = (input) => buildCommand('revise', input, root);
  const ok = built({
    slug: 'alpha',
    feedback: 'Shorten the hero heading.',
    model: 'opus',
    maxAttempts: 2,
  });
  assert.deepEqual(ok.argv, [
    'bash',
    'scripts/revise-landing.sh',
    'alpha',
    '--feedback',
    FEEDBACK_PLACEHOLDER,
    '--model',
    'opus',
    '--max-attempts',
    '2',
  ]);
  assert.equal(ok.feedback, 'Shorten the hero heading.');
  assert.deepEqual(
    built({ slug: 'alpha', feedback: 'Use navy.', restyle: true }).argv,
    [
      'bash',
      'scripts/revise-landing.sh',
      'alpha',
      '--restyle',
      '--feedback',
      FEEDBACK_PLACEHOLDER,
    ],
  );
  assert.ok(
    !built({ slug: 'alpha', feedback: 'x', restyle: false }).argv.includes(
      '--restyle',
    ),
  );
  // Free text stays one argument and the text is kept as given (a shell fragment is just text).
  const text = '  $(touch /tmp/x); "quoted"\nsecond line ';
  assert.equal(built({ slug: 'alpha', feedback: text }).feedback, text);
  assert.equal(
    built({ slug: 'alpha', feedback: 'x'.repeat(4000) }).feedback.length,
    4000,
  );
  for (const [input, pattern] of [
    [{ slug: 'alpha' }, /feedback must be a string/],
    [{ slug: 'alpha', feedback: 5 }, /feedback must be a string/],
    [{ slug: 'alpha', feedback: '   ' }, /feedback is empty/],
    [
      { slug: 'alpha', feedback: 'x'.repeat(4001) },
      /longer than 4000 characters/,
    ],
    [{ slug: '../etc', feedback: 'x' }, /invalid slug/],
    [{ slug: 'alpha', feedback: 'x', model: 'a; b' }, /invalid model/],
    [{ slug: 'alpha', feedback: 'x', maxAttempts: 21 }, /maxAttempts/],
    [{ slug: 'alpha', feedback: 'x', restyle: 'yes' }, /restyle must be/],
    [{ slug: 'alpha', feedback: 'x', restyle: 1 }, /restyle must be/],
    [{ slug: 'ghost', feedback: 'x' }, /no site "ghost"/],
    [{ slug: 'beta', feedback: 'x' }, /no finished build/],
  ])
    assert.throws(() => built(input), pattern, JSON.stringify(input));
});

test('revise is refused for a transferred landing and for one with direction pages', () => {
  const site = join(root, 'sites/zeta');
  mkdirSync(site, { recursive: true });
  try {
    writeFileSync(join(site, 'package.json'), '{"name":"site-zeta"}\n');
    writeFileSync(join(site, 'RUN.md'), '# Run\n\nResult: passed\n');
    writeFileSync(
      join(site, 'EXPORTED.json'),
      JSON.stringify({
        repository: 'https://github.com/customer/zeta',
        transferredTo: 'customer',
        transferredAt: '2026-10-27T10:00:00.000Z',
      }),
    );
    assert.throws(
      () => buildCommand('revise', { slug: 'zeta', feedback: 'x' }, root),
      /was transferred to customer/,
    );
    rmSync(join(site, 'EXPORTED.json'));
    mkdirSync(join(site, 'src/pages/directions'), { recursive: true });
    assert.throws(
      () => buildCommand('revise', { slug: 'zeta', feedback: 'x' }, root),
      /direction pages/,
    );
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
});

test('get_landing shows the revision rounds, the export and the transfer state', async () => {
  const site = join(root, 'sites/eta');
  mkdirSync(site, { recursive: true });
  try {
    writeFileSync(join(site, 'package.json'), '{"name":"site-eta"}\n');
    const bare = await ok('get_landing', { slug: 'eta' });
    assert.equal(bare.revisions, null);
    assert.equal(bare.exported, null);
    assert.equal(bare.transferred, null);

    writeFileSync(
      join(site, 'revisions.json'),
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
            usage: { costUsd: 0.42 },
          },
          {
            n: 2,
            date: '2026-10-28',
            feedback: 'g',
            items: [{ kind: 'rebuild', summary: 'another look' }],
            briefChanged: false,
            files: [],
            result: 'needs-rebuild',
            usage: null,
          },
        ],
      }),
    );
    writeFileSync(
      join(site, 'EXPORTED.json'),
      JSON.stringify({
        repository: 'https://github.com/owner/eta',
        exportedAt: '2026-10-27T00:00:00.000Z',
        factoryCommit: 'abc',
        target: 'vercel',
        noBrief: true,
      }),
    );
    const exported = await ok('get_landing', { slug: 'eta' });
    assert.deepEqual(exported.revisions, {
      count: 2,
      last: {
        n: 2,
        date: '2026-10-28',
        result: 'needs-rebuild',
        costUsd: null,
      },
    });
    assert.equal(exported.exported.repository, 'https://github.com/owner/eta');
    assert.equal(exported.transferred, null);

    writeFileSync(
      join(site, 'EXPORTED.json'),
      JSON.stringify({
        repository: 'https://github.com/customer/eta',
        transferredTo: 'customer',
        transferredAt: '2026-11-02T09:30:00.000Z',
      }),
    );
    const moved = await ok('get_landing', { slug: 'eta' });
    assert.deepEqual(moved.transferred, {
      to: 'customer',
      at: '2026-11-02T09:30:00.000Z',
    });
    assert.match(
      await refused('revise_landing', { slug: 'eta', feedback: 'x' }),
      /was transferred to customer/,
    );
  } finally {
    rmSync(site, { recursive: true, force: true });
  }
});

test('bad input is refused before any job starts: slug, sheet, model, URL, shell text', async () => {
  const cases = [
    ['propose_landing', { slug: '../etc', niche: 'x' }, /invalid slug/],
    ['propose_landing', { slug: 'UPPER', niche: 'x' }, /invalid slug/],
    [
      'propose_landing',
      { slug: 'newsite', niche: 'x', refs: ['no-such-sheet'] },
      /patterns\/no-such-sheet\.md does not exist/,
    ],
    [
      'propose_landing',
      { slug: 'newsite', niche: 'x', refs: ['../brief'] },
      /invalid sheet slug/,
    ],
    [
      'propose_landing',
      { slug: 'newsite', niche: 'x', refs: ['a', 'b', 'c', 'd'] },
      /arguments.refs|at most 3/,
    ],
    [
      'propose_landing',
      { slug: 'newsite', niche: 'x', model: 'Opus; rm -rf /' },
      /invalid model/,
    ],
    [
      'propose_landing',
      { slug: 'newsite', niche: 'x', lang: 'es;' },
      /invalid lang/,
    ],
    [
      'propose_landing',
      { slug: 'newsite', niche: 'line one\nline two' },
      /single line/,
    ],
    ['propose_landing', { slug: 'newsite' }, /niche, or create a brief/],
    [
      'generate_landing',
      { slug: 'newsite', resume: true, niche: 'x' },
      /does not exist or is not a site/,
    ],
    ['generate_landing', { slug: 'alpha', maxAttempts: 99 }, /maxAttempts/],
    ['run_qa', { slug: 'ghost' }, /does not exist/],
    ['run_qa', { slug: 'alpha', skip: ['everything'] }, /one of|skip takes/],
    ['run_report', { slug: 'alpha', url: 'http://alpha.example.com' }, /https/],
    ['run_report', { slug: 'alpha', url: 'file:///etc/passwd' }, /https/],
    ['run_report', { slug: 'alpha', url: 'not a url' }, /not a URL/],
    [
      'run_report',
      { slug: 'alpha', url: 'https://user:pw@alpha.example.com' },
      /credentials/,
    ],
    ['get_job', { id: '../../etc/passwd' }, /invalid job id/],
    ['tail_job_log', { id: 'nope' }, /invalid job id/],
    ['cancel_job', { id: '20260101-000000-qa-alpha-zzzz' }, /invalid job id/],
  ];
  for (const [tool, args, pattern] of cases)
    assert.match(
      await refused(tool, args),
      pattern,
      `${tool} ${JSON.stringify(args)}`,
    );
  assert.ok(
    !existsSync(join(root, '.cache/jobs')),
    'no job folder was created',
  );
});

test('free text with shell characters stays one argv element', () => {
  const nasty =
    'cafe "quoted" $(touch /tmp/pwned); `id` && rm -rf / | tee x > y \\ \'single\'';
  const { argv } = buildCommand(
    'propose',
    { slug: 'newsite', niche: nasty },
    root,
  );
  assert.deepEqual(argv, [
    'bash',
    'scripts/new-landing.sh',
    'newsite',
    '--niche',
    nasty,
  ]);
  const asText = JSON.stringify(argv);
  assert.equal(argv.filter((a) => a.includes('touch')).length, 1);
  assert.ok(asText.includes('$(touch'));
});

test('no command in the fixed table can publish: no deploy, wrangler, git, gh or push', () => {
  const forbidden = /deploy|wrangler|\bgit\b|\bgh\b|push|publish/i;
  for (const [kind, spec] of Object.entries(JOB_KINDS))
    for (const part of [spec.runner, spec.script])
      assert.doesNotMatch(part, forbidden, `${kind}: ${part}`);
  assert.deepEqual(Object.keys(JOB_KINDS).sort(), [
    'generate',
    'preview',
    'propose',
    'qa',
    'report',
    'revise',
  ]);
  // Every command the tools can build starts with one of the table's scripts.
  const scripts = new Set(Object.values(JOB_KINDS).map((s) => s.script));
  for (const [kind, input] of [
    ['propose', { slug: 'alpha' }],
    ['preview', { slug: 'alpha' }],
    ['generate', { slug: 'alpha' }],
    ['qa', { slug: 'alpha' }],
    ['report', { slug: 'alpha' }],
    ['revise', { slug: 'alpha', feedback: 'Shorten the hero heading.' }],
  ])
    assert.ok(scripts.has(buildCommand(kind, input, root).argv[1]), kind);
  // And the tool list has no tool that could publish.
  const names = protocol.handle({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  });
  return names.then(({ result }) => {
    for (const tool of result.tools)
      assert.doesNotMatch(tool.name, /deploy|publish|push|commit|pull_request/);
  });
});

// --- 5.1 registration ----------------------------------------------------------------------------------

test('the server is registered in .mcp.json; settings allow read and brief tools but not job-starting tools', () => {
  const repo = new URL('..', import.meta.url).pathname;
  const mcp = JSON.parse(readFileSync(join(repo, '.mcp.json'), 'utf8'));
  assert.deepEqual(mcp.mcpServers['landing-factory'], {
    command: 'node',
    args: ['scripts/mcp/server.mjs'],
  });
  assert.ok(mcp.mcpServers.playwright && mcp.mcpServers['astro-docs']);
  const settings = JSON.parse(
    readFileSync(join(repo, '.claude/settings.json'), 'utf8'),
  );
  const allowed = settings.permissions.allow.filter((p) =>
    p.startsWith('mcp__landing-factory__'),
  );
  for (const name of [
    'list_landings',
    'get_landing',
    'get_qa',
    'get_report',
    'brief_init',
    'brief_validate',
    'brief_missing',
    'brief_summary',
    'brief_update',
    'choose_direction',
    'get_job',
    'list_jobs',
    'tail_job_log',
  ])
    assert.ok(allowed.includes(`mcp__landing-factory__${name}`), name);
  for (const name of [
    'propose_landing',
    'preview_landing',
    'generate_landing',
    'revise_landing',
    'run_qa',
    'run_report',
    'cancel_job',
  ])
    assert.ok(!allowed.includes(`mcp__landing-factory__${name}`), name);
  assert.ok(!settings.permissions.allow.includes('mcp__landing-factory'));
  assert.ok(!allowed.some((p) => p.endsWith('*')));
  const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.mcp, 'node scripts/mcp/server.mjs');
  assert.match(
    readFileSync(join(repo, '.gitignore'), 'utf8'),
    /^sites\/\*\/\.run-usage\.json$/m,
  );
  assert.match(readFileSync(join(repo, '.gitignore'), 'utf8'), /^\.cache\/$/m);
});

// --- visual directions ---------------------------------------------------------------------------------

const siteFiles = (dir) =>
  readdirSync(dir, { recursive: true }).map(String).sort();
const directionsRecord = () => ({
  version: 1,
  directions: [
    {
      id: 'a',
      archetype: 'swiss',
      traits: [],
      primary: '#92400e',
      displayFont: 'Fraunces',
      bodyFont: 'Inter',
      hero: 'split',
      idea: 'warm and editorial',
    },
    {
      id: 'b',
      archetype: 'collage',
      traits: [],
      primary: '#1d4ed8',
      displayFont: 'Inter',
      bodyFont: 'Inter',
      hero: 'typographic',
      idea: 'loud and playful',
    },
  ],
  choice: null,
});

test('choose_direction writes only directions.json, and get_landing shows the directions and the choice', async () => {
  const dir = join(root, 'sites/alpha');
  assert.equal((await ok('get_landing', { slug: 'alpha' })).directions, null);
  writeFileSync(
    join(dir, 'directions.json'),
    JSON.stringify(directionsRecord()),
  );
  mkdirSync(join(dir, 'src/pages/directions'), { recursive: true });
  try {
    const before = await ok('get_landing', { slug: 'alpha' });
    assert.deepEqual(before.directions, {
      directions: [
        {
          id: 'a',
          idea: 'warm and editorial',
          archetype: 'swiss',
          previewPath: '/directions/a/',
        },
        {
          id: 'b',
          idea: 'loud and playful',
          archetype: 'collage',
          previewPath: '/directions/b/',
        },
      ],
      choice: null,
    });
    const files = siteFiles(dir);
    const saved = await ok('choose_direction', {
      slug: 'alpha',
      direction: 'b',
      notes: 'warmer photos',
    });
    assert.equal(saved.saved, true);
    assert.equal(saved.choice.direction, 'b');
    const record = JSON.parse(
      readFileSync(join(dir, 'directions.json'), 'utf8'),
    );
    assert.deepEqual(record.choice, {
      direction: 'b',
      notes: 'warmer photos',
      date: new Date().toISOString().slice(0, 10),
    });
    assert.equal(record.directions.length, 2);
    assert.deepEqual(siteFiles(dir), files, 'no other file was created');
    const after = await ok('get_landing', { slug: 'alpha' });
    assert.equal(after.directions.choice.direction, 'b');
    assert.equal(after.directions.choice.notes, 'warmer photos');
  } finally {
    rmSync(join(dir, 'directions.json'), { force: true });
    rmSync(join(dir, 'src'), { recursive: true, force: true });
  }
});

test('choose_direction rejects an unknown direction, a missing record, long notes and a built site, and writes nothing', async () => {
  const dir = join(root, 'sites/alpha');
  assert.match(
    await refused('choose_direction', { slug: 'alpha', direction: 'a' }),
    /directions\.json does not exist/,
  );
  writeFileSync(
    join(dir, 'directions.json'),
    JSON.stringify(directionsRecord()),
  );
  const bytes = () => readFileSync(join(dir, 'directions.json'), 'utf8');
  const snapshot = bytes();
  try {
    mkdirSync(join(dir, 'src/pages/directions'), { recursive: true });
    for (const [args, pattern] of [
      [{ slug: 'alpha', direction: 'c' }, /unknown direction "c"/],
      [
        { slug: 'alpha', direction: 'a', notes: 'x'.repeat(2001) },
        /longer than 2000|maxLength/,
      ],
      [{ slug: 'alpha', direction: 'a', notes: 5 }, /notes|string/],
      [{ slug: '../etc', direction: 'a' }, /invalid slug/],
    ]) {
      assert.match(await refused('choose_direction', args), pattern);
      assert.equal(bytes(), snapshot);
    }
    rmSync(join(dir, 'src'), { recursive: true });
    assert.match(
      await refused('choose_direction', { slug: 'alpha', direction: 'a' }),
      /already built past the directions/,
    );
    assert.equal(bytes(), snapshot);
  } finally {
    rmSync(join(dir, 'directions.json'), { force: true });
    rmSync(join(dir, 'src'), { recursive: true, force: true });
  }
});
