// Catalog and picker of copywriting frameworks (add-copy-frameworks, tasks 1.1 and 1.2).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { AWARENESS_LEVELS as SCHEMA_LEVELS } from '../scripts/lib/brief-schema.mjs';
import {
  AWARENESS_LEVELS,
  FRAMEWORKS,
  SECTIONS,
  deriveSignals,
  goalOf,
  parsePrice,
  rankFrameworks,
} from '../scripts/lib/copy-frameworks.mjs';
import { main, pickFramework } from '../scripts/pick-copy-framework.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'copy-frameworks-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

/** A minimal valid brief; `extra` is merged shallowly per top-level key. */
function brief(extra = {}) {
  return {
    version: 1,
    language: 'en',
    business: {
      name: 'Test Shop',
      description: 'Sells things.',
      kind: 'product',
    },
    offer: [{ name: 'Thing', price: '29', currency: 'EUR' }],
    audience: { who: 'People', needs: 'Things', objections: '' },
    goal: {
      primary: { label: 'Buy it', url: 'https://example.com/shop/thing' },
    },
    ...extra,
  };
}
function site(slug, content) {
  const root = mkdtempSync(join(tmp, 'root-'));
  mkdirSync(join(root, 'sites', slug), { recursive: true });
  if (content)
    writeFileSync(
      join(root, 'sites', slug, 'brief.json'),
      JSON.stringify(content),
    );
  return root;
}
const rank = (b) => rankFrameworks(deriveSignals(b));
const ids = (b, n = 2) =>
  rank(b)
    .slice(0, n)
    .map((c) => c.id);

test('the catalog is closed: every framework has stages, sections and fit signals', () => {
  assert.deepEqual(
    FRAMEWORKS.map((f) => f.id).sort(),
    [
      '4p',
      'aida',
      'acca',
      'bab',
      'fab',
      'pas',
      'pastor',
      'quest',
      'slap',
      'story',
    ].sort(),
  );
  assert.deepEqual(AWARENESS_LEVELS, SCHEMA_LEVELS);
  for (const f of FRAMEWORKS) {
    assert.ok(f.name && f.summary, f.id);
    assert.ok(f.stages.length >= 3, `${f.id} stages`);
    assert.equal(new Set(f.stages.map((s) => s.id)).size, f.stages.length);
    for (const s of f.stages) {
      assert.ok(s.says.length > 20, `${f.id}/${s.id} says`);
      assert.ok(s.sections.length > 0);
      for (const section of s.sections)
        assert.ok(SECTIONS.includes(section), `${f.id}/${s.id}: ${section}`);
    }
    assert.deepEqual(
      Object.keys(f.awareness).sort(),
      [...AWARENESS_LEVELS].sort(),
    );
    assert.ok(
      f.fits.length + f.avoid.length > 0 || f.id === 'pas' || f.awareness,
      f.id,
    );
    if (f.proofStage)
      assert.ok(
        f.stages.some((s) => s.id === f.proofStage),
        f.id,
      );
  }
  // The initials of the acronym frameworks match their stages.
  const initials = (id) =>
    FRAMEWORKS.find((f) => f.id === id)
      .stages.map((s) => s.name[0])
      .join('');
  assert.equal(initials('aida'), 'AIDA');
  assert.equal(initials('pas'), 'PAS');
  assert.equal(initials('fab'), 'FAB');
  assert.equal(initials('bab'), 'BAB');
  assert.equal(initials('4p'), 'PPPP');
  assert.equal(initials('pastor'), 'PASTOR');
  assert.equal(initials('quest'), 'QUEST');
  assert.equal(initials('acca'), 'ACCA');
  assert.equal(initials('slap'), 'SLAP');
});

test('signals derive from the brief', () => {
  assert.equal(parsePrice('29,99 €'), 29.99);
  assert.equal(parsePrice('1.200'), 1200);
  assert.equal(parsePrice('desde 59'), 59);
  assert.equal(parsePrice('a consultar'), null);

  const s = deriveSignals(brief());
  assert.deepEqual(
    { ...s },
    {
      awareness: 'problem-aware',
      awarenessAssumed: true,
      kind: 'product',
      price: 'low',
      goal: 'buy',
      proof: 'none',
      regulated: 'false',
      objections: 'absent',
      noBrief: false,
    },
  );
  const high = deriveSignals(
    brief({ offer: [{ name: 'A', price: '1.200' }, { name: 'B' }] }),
  );
  assert.equal(high.price, 'high');
  assert.equal(
    deriveSignals(
      brief({
        offer: [
          { name: 'A', price: '9' },
          { name: 'B', price: '900' },
        ],
      }),
    ).price,
    'mixed',
  );
  assert.equal(deriveSignals(brief({ offer: [{ name: 'A' }] })).price, 'none');
  assert.equal(
    deriveSignals(brief({ offer: [{ name: 'A', price: '120' }] })).price,
    'mid',
  );
  assert.equal(
    deriveSignals(brief({ audience: { objections: 'Fear of cost' } }))
      .objections,
    'present',
  );
  assert.equal(
    deriveSignals(brief({ legal: { regulated: true } })).regulated,
    'true',
  );
  assert.equal(
    deriveSignals(brief({ proof: [{ kind: 'figure', text: '300 clients' }] }))
      .proof,
    'real',
  );
  const stated = deriveSignals(
    brief({ audience: { awareness: 'most-aware' } }),
  );
  assert.equal(stated.awareness, 'most-aware');
  assert.equal(stated.awarenessAssumed, false);
  const listed = deriveSignals(
    brief({
      audience: { awareness: 'most-aware' },
      assumed: [{ field: 'audience.awareness', reason: 'guess' }],
    }),
  );
  assert.equal(listed.awarenessAssumed, true);
  assert.equal(deriveSignals(null).noBrief, true);

  const goal = (label, url = '') =>
    goalOf({ goal: { primary: { label, url } } });
  assert.equal(goal('Reservar cita', 'https://x.example/form'), 'booking');
  assert.equal(goal('Comprar el pack', 'https://x.example/tienda/p'), 'buy');
  assert.equal(goal('Escribirnos', 'mailto:a@b.co'), 'lead');
  assert.equal(goal('Learn more'), 'lead');
});

test('one fixture per awareness level ranks its frameworks first', () => {
  const expected = {
    unaware: ['story', 'quest'],
    'problem-aware': ['pas', 'pastor'],
    'solution-aware': ['bab', 'fab'],
    'product-aware': ['fab', '4p'],
    'most-aware': ['acca', 'slap'],
  };
  for (const [level, top] of Object.entries(expected)) {
    // A neutral brief (no kind, no price, lead goal) so only the ladder speaks.
    const b = {
      version: 1,
      language: 'en',
      business: { name: 'N', description: 'D' },
      audience: { awareness: level },
      goal: { primary: { label: 'Talk to us' } },
    };
    assert.deepEqual([...ids(b, 2)].sort(), [...top].sort(), level);
    const first = rank(b)[0];
    assert.ok(
      first.reasons[0].includes(level),
      `${level}: the reasons name the awareness level`,
    );
  }
});

test('a high price or objections lift the frameworks with a proof or objection stage', () => {
  const base = brief({
    audience: { awareness: 'solution-aware', objections: '' },
    offer: [{ name: 'A', price: '9' }],
  });
  const dear = brief({
    audience: { awareness: 'solution-aware', objections: 'Is it worth it?' },
    offer: [{ name: 'A', price: '2.500' }],
  });
  const pos = (b, id) => rank(b).findIndex((c) => c.id === id);
  for (const id of ['pastor', 'quest', '4p'])
    assert.ok(pos(dear, id) < pos(base, id), id);
  assert.ok(
    rank(dear).find((c) => c.id === 'slap').score <
      rank(base).find((c) => c.id === 'slap').score,
  );
});

test('a regulated niche ranks promise-led frameworks lower and says what the promise stage may do', () => {
  const service = {
    business: { name: 'N', description: 'D', kind: 'service' },
  };
  const open = brief({ ...service, audience: { awareness: 'solution-aware' } });
  const regulated = brief({
    ...service,
    audience: { awareness: 'solution-aware' },
    legal: { regulated: true },
  });
  assert.equal(rank(open)[0].id, 'bab');
  const r = rank(regulated);
  assert.notEqual(r[0].id, 'bab');
  const bab = r.find((c) => c.id === 'bab');
  assert.match(
    bab.notes.join(' '),
    /describes the service and never an outcome/,
  );
  assert.ok(bab.score < rank(open).find((c) => c.id === 'bab').score);
  const fourP = r.find((c) => c.id === '4p');
  assert.match(fourP.notes.join(' '), /Promise.*never an outcome/);
  assert.equal(
    rank(regulated)
      .find((c) => c.id === 'pas')
      .notes.join(' ')
      .includes('outcome'),
    false,
  );
});

test('no real proof keeps proof frameworks and marks their proof stage', () => {
  const b = brief({
    audience: { awareness: 'problem-aware', objections: 'Trust' },
    offer: [{ name: 'A', price: '900' }],
  });
  const pastor = rank(b).find((c) => c.id === 'pastor');
  assert.ok(pastor, 'pastor stays in the ranking');
  assert.match(
    pastor.notes.join(' '),
    /"Testimony" stage "no proof available"/,
  );
  const withProof = rank({
    ...b,
    proof: [{ kind: 'testimonial', text: 'Great work' }],
  }).find((c) => c.id === 'pastor');
  assert.equal(withProof.notes.length, 0);
  assert.ok(withProof.score > pastor.score);
});

test('ranking is deterministic and ties break by score then id', () => {
  const b = brief({ audience: { awareness: 'unaware' } });
  assert.deepEqual(rank(b), rank(structuredClone(b)));
  const r = rank({ version: 1, business: {}, goal: {} });
  for (let i = 1; i < r.length; i++) {
    const [a, c] = [r[i - 1], r[i]];
    assert.ok(a.score > c.score || (a.score === c.score && a.id < c.id));
  }
});

test('the picker reads the site brief, says when awareness was assumed and runs the same twice', () => {
  const root = site('shop', brief());
  const a = pickFramework({ root, slug: 'shop' });
  assert.equal(a.signals.awarenessAssumed, true);
  assert.deepEqual(a, pickFramework({ root, slug: 'shop' }));

  const run = (args, env = {}) =>
    spawnSync('node', ['scripts/pick-copy-framework.mjs', ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, LANDING_FACTORY_ROOT: root, ...env },
    });
  const first = run(['--site', 'shop']);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /problem-aware was assumed/);
  assert.match(first.stdout, /Top 3 frameworks/);
  assert.match(first.stdout, /stage -> section:/);
  assert.equal(first.stdout, run(['--site', 'shop']).stdout);
  const json = JSON.parse(
    run(['--site', 'shop', '--top', '2', '--json']).stdout,
  );
  assert.equal(json.candidates.length, 2);
  assert.equal(json.signals.awareness, 'problem-aware');

  const noBrief = run(['--site', 'bare'], {
    LANDING_FACTORY_ROOT: site('bare', null),
  });
  assert.equal(noBrief.status, 0);
  assert.match(noBrief.stdout, /no brief\.json: default signals/);
});

test('--list prints every framework with its stages and fit signals', () => {
  const out = spawnSync('node', ['scripts/pick-copy-framework.mjs', '--list'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(out.status, 0);
  for (const f of FRAMEWORKS) {
    assert.ok(out.stdout.includes(`${f.id}  ${f.name}`), f.id);
    for (const s of f.stages) assert.ok(out.stdout.includes(s.name), s.name);
  }
  assert.match(out.stdout, /fits: /);
  assert.match(out.stdout, /4U/);
});

test('bad usage, a missing site and an invalid brief exit 2', () => {
  const io = { log() {}, error() {} };
  const saved = process.env.LANDING_FACTORY_ROOT;
  process.env.LANDING_FACTORY_ROOT = site('shop', brief());
  try {
    assert.equal(main([], io), 2);
    assert.equal(main(['--site', 'shop', '--top', '0'], io), 2);
    assert.equal(main(['--site', 'shop', '--nope'], io), 2);
    assert.equal(main(['--site', 'Bad Slug'], io), 2);
    assert.equal(main(['--site', 'missing'], io), 2);
    assert.equal(main(['--site', 'shop'], io), 0);
    process.env.LANDING_FACTORY_ROOT = site(
      'bad',
      brief({ audience: { awareness: 'curious' } }),
    );
    const errors = [];
    assert.equal(
      main(['--site', 'bad'], { log() {}, error: (m) => errors.push(m) }),
      2,
    );
    assert.match(errors.join('\n'), /audience\.awareness/);
  } finally {
    if (saved === undefined) delete process.env.LANDING_FACTORY_ROOT;
    else process.env.LANDING_FACTORY_ROOT = saved;
  }
});
