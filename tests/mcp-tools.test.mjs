// Landing, QA, report and brief tools, and the argv each job tool builds, on a temporary fixture repository.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { JOB_KINDS, buildCommand } from '../scripts/mcp/commands.mjs';
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
    'propose',
    'qa',
    'report',
  ]);
  // Every command the tools can build starts with one of the table's scripts.
  const scripts = new Set(Object.values(JOB_KINDS).map((s) => s.script));
  for (const [kind, input] of [
    ['propose', { slug: 'alpha' }],
    ['generate', { slug: 'alpha' }],
    ['qa', { slug: 'alpha' }],
    ['report', { slug: 'alpha' }],
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
    'get_job',
    'list_jobs',
    'tail_job_log',
  ])
    assert.ok(allowed.includes(`mcp__landing-factory__${name}`), name);
  for (const name of [
    'propose_landing',
    'generate_landing',
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
