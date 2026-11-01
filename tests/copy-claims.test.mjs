// The copy-claims patterns and the check-landing rule (add-copy-frameworks, task 3.1).
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { main, runChecks } from '../scripts/check-landing.mjs';
import {
  CLAIM_PATTERNS,
  FAIL_IDS,
  PHRASE_MAX,
  WARN_IDS,
  foldText,
  scanClaims,
} from '../scripts/lib/copy-claims.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/landing');
const tmp = mkdtempSync(join(tmpdir(), 'copy-claims-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const ids = (text, lang) => scanClaims(text, lang).map((h) => h.id);
const hits = (text, lang) =>
  scanClaims(text, lang)
    .map((h) => h.id)
    .sort();

test('every id has a pattern in both languages (round-number is language-neutral)', () => {
  for (const id of FAIL_IDS) {
    for (const lang of ['es', 'en'])
      assert.ok(
        CLAIM_PATTERNS.some((p) => p.id === id && p.lang === lang),
        `${id}/${lang}`,
      );
    for (const p of CLAIM_PATTERNS.filter((p) => p.id === id)) {
      assert.equal(p.level, 'fail');
      assert.ok(p.terms.length > 0, `${id} has key terms`);
      assert.ok(p.reason.length > 10);
    }
  }
  for (const id of WARN_IDS) {
    const ps = CLAIM_PATTERNS.filter((p) => p.id === id);
    assert.ok(ps.length > 0, id);
    for (const p of ps) assert.equal(p.level, 'warn');
  }
});

test('fail patterns in Spanish', () => {
  const cases = {
    'guaranteed-result': [
      'Resultados garantizados para tu negocio',
      'Garantizamos los resultados',
      'Satisfacción 100% garantizada',
      'Garantía de devolución en 30 días',
      'O te devolvemos tu dinero',
    ],
    'result-in-time': [
      'Resultados en 7 días',
      'Verás resultados visibles en solo 2 semanas',
      'Pierde 5 kilos en 10 días',
    ],
    'absolute-superlative': [
      'El mejor del mundo',
      'La mejor panadería del país',
      'Número 1 en ventas',
      'Una calidad inigualable',
      'Sin competencia',
    ],
    'health-promise': [
      'Elimina el dolor de espalda para siempre',
      'Cura la ansiedad',
      'Sin efectos secundarios',
      'Un tratamiento milagroso',
    ],
    'money-promise': [
      'Gana 3.000 € al mes',
      'Genera hasta 500 euros por semana',
      'Ingresos garantizados',
      'Duplica tus ingresos',
      'Libertad financiera',
    ],
  };
  for (const [id, texts] of Object.entries(cases))
    for (const text of texts)
      assert.ok(ids(text, 'es').includes(id), `${id}: ${text}`);
});

test('fail patterns in English', () => {
  const cases = {
    'guaranteed-result': [
      'Guaranteed results every time',
      'Success is guaranteed',
      '100% money-back guarantee',
      'Satisfaction guaranteed',
      'Love it or your money back',
    ],
    'result-in-time': [
      'See results in 7 days',
      'Visible results within two weeks',
      'Lose 5 kg in 10 days',
    ],
    'absolute-superlative': [
      'The best in the world',
      "The world's best coffee",
      'The best agency in the country',
      'Number one in sales',
      'Second to none',
    ],
    'health-promise': [
      'Cures back pain',
      'No side effects',
      'Without any side effects',
      'A miracle cure',
    ],
    'money-promise': [
      'Earn €5,000 a month',
      'Make $300 per week',
      'Guaranteed income',
      'Double your money',
      'Financial freedom',
    ],
  };
  for (const [id, texts] of Object.entries(cases))
    for (const text of texts)
      assert.ok(ids(text, 'en').includes(id), `${id}: ${text}`);
});

test('warn patterns', () => {
  assert.deepEqual(hits('El 87% de los clientes repite', 'es'), [
    'unsourced-stat',
  ]);
  assert.deepEqual(hits('Works 3 times faster', 'en'), ['unsourced-stat']);
  assert.deepEqual(hits('Los estudios demuestran que funciona', 'es'), [
    'study-claim',
  ]);
  assert.deepEqual(hits('Studies show that it works', 'en'), ['study-claim']);
  assert.deepEqual(hits('Clínicamente probado', 'es'), ['study-claim']);
  assert.deepEqual(hits('Más de +10.000 clientes', 'es'), ['round-number']);
  assert.deepEqual(hits('Trusted by 5,000 families', 'en'), ['round-number']);
  assert.deepEqual(hits('Últimas unidades', 'es'), ['urgency']);
  assert.deepEqual(hits('Solo hoy: plazas limitadas', 'es'), [
    'urgency',
    'urgency',
  ]);
  assert.deepEqual(hits('Only today', 'en'), ['urgency']);
  for (const hit of scanClaims('Resultados garantizados y el 87% repite', 'es'))
    assert.ok(['fail', 'warn'].includes(hit.level));
});

test('fair sentences do not match', () => {
  const fair = {
    es: [
      'Garantía de 2 años según la ley',
      'Los resultados se explican en la consulta',
      'Resultados',
      'Precio desde 29,99 €',
      'Pack completo por 1.200 €',
      'La mejor forma de empezar es una llamada',
      'Entrega en 3 días laborables',
      'Respuesta en 24 horas',
      'Jamón curado artesanal',
      'Fundada en el año 2000',
      'Código postal 46000, Valencia',
      'IVA incluido (21%)',
      'El paso número 1 de 3 es tu nombre',
      'Llámanos al 900 000 000',
      'Una cura de reposo en la montaña',
      'Obtén 10 € de descuento en tu primer pedido',
    ],
    en: [
      'The best way to start is a call',
      'Results are explained at the first visit',
      'Results',
      'Price from €29.99',
      'A 2-year warranty as required by law',
      'Delivery in 3 working days',
      'Get your quote in 24 hours',
      'Cured ham, made by hand',
      'Founded in 2000',
      'Get 20€ off your first order',
      'Step number 1 of 3',
      'Our best seller this spring',
      'Make a reservation online',
      'Call us on 900 000 000',
    ],
  };
  for (const [lang, texts] of Object.entries(fair))
    for (const text of texts)
      assert.deepEqual(scanClaims(text, lang), [], `${lang}: ${text}`);
});

test('matching ignores accents and case, and long phrases are cut to 80 characters', () => {
  assert.equal(foldText('GARANTÍA Ñandú “x”'), 'garantia nandu "x"');
  assert.ok(ids('RESULTADOS GARANTIZADOS', 'es').includes('guaranteed-result'));
  assert.ok(ids('Resultados garantizados', 'es').includes('guaranteed-result'));
  const phrase = scanClaims(
    `The best ${'really very '.repeat(2)}agency in the world`,
    'en',
  );
  for (const h of phrase) assert.ok(h.phrase.length <= PHRASE_MAX);
});

test('language selects the pattern set', () => {
  assert.deepEqual(ids('Resultados garantizados', 'en'), []);
  assert.deepEqual(ids('Guaranteed results', 'es'), []);
  assert.ok(ids('Guaranteed results', null).length > 0);
  assert.ok(ids('Resultados garantizados', null).length > 0);
});

// --- the rule in check-landing ------------------------------------------------------------------------

const freshRoot = () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
};
const siteDir = (root) => join(root, 'sites/good');
const page = (body, lang = 'es', attrs = '') =>
  `<!doctype html><html lang="${lang}"><head><title>x</title></head><body ${attrs}><main>${body}</main></body></html>`;
function withDist(root, files) {
  const dist = join(siteDir(root), 'dist');
  mkdirSync(dist, { recursive: true });
  for (const [name, html] of Object.entries(files)) {
    mkdirSync(join(dist, name, '..'), { recursive: true });
    writeFileSync(join(dist, name), html);
  }
  return root;
}
const briefWith = (patch) => {
  const brief = {
    version: 1,
    language: 'es',
    business: { name: 'Taller', description: 'Hacemos cosas.' },
    offer: [],
    audience: {},
    ...patch,
  };
  return JSON.stringify(brief);
};
const copyFailures = async (root) =>
  (await runChecks({ slug: 'good', root })).failures.filter(
    (f) => f.rule === 'copy-claims',
  );
const warningRules = async (root) =>
  (await runChecks({ slug: 'good', root })).warnings.map((w) => w.rule);

test('without a build the rule only warns; the fixture site still passes', async () => {
  const result = await runChecks({ slug: 'good', root: freshRoot() });
  assert.equal(result.verdict, 'passed');
  assert.ok(result.checks.some((c) => c.name === 'copy-claims' && c.ok));
  assert.ok(result.warnings.some((w) => w.rule === 'copy-claims-no-build'));
});

test('a promise on a Spanish page fails naming the page, the phrase and the reason', async () => {
  const root = withDist(freshRoot(), {
    'index.html': page('<h1>Resultados garantizados en 7 días</h1>'),
  });
  const failures = await copyFailures(root);
  assert.deepEqual(failures.map((f) => f.item).sort(), [
    '/index.html#guaranteed-result',
    '/index.html#result-in-time',
  ]);
  for (const f of failures) {
    assert.match(f.message, /\/index\.html/);
    assert.match(f.message, /"Resultados garantizados/);
    assert.match(f.message, /promesa|respaldar|plazo/);
  }
  const result = await runChecks({ slug: 'good', root });
  assert.equal(result.verdict, 'failed');
  assert.equal(
    await main(['--site', 'good'], { log() {}, error() {} }, { root }),
    1,
  );
});

test('English pages and nested pages are scanned; clean pages pass', async () => {
  const root = withDist(freshRoot(), {
    'index.html': page('<h1>A calm bakery</h1><p>Open daily.</p>', 'en'),
    'menu/index.html': page('<p>We offer the best in the world.</p>', 'en'),
  });
  const failures = await copyFailures(root);
  assert.deepEqual(
    failures.map((f) => f.item),
    ['/menu/index.html#absolute-superlative'],
  );
});

test('warn ids never fail: stats, studies, round numbers and urgency', async () => {
  const root = withDist(freshRoot(), {
    'index.html': page(
      '<p>El 87% de los clientes repite.</p><p>Los estudios demuestran que funciona.</p><p>Más de +10.000 clientes.</p><p>Últimas unidades.</p>',
    ),
  });
  assert.deepEqual(await copyFailures(root), []);
  const rules = await warningRules(root);
  for (const id of ['unsourced-stat', 'study-claim', 'round-number', 'urgency'])
    assert.ok(rules.includes(`copy-claims-${id}`), id);
  assert.equal((await runChecks({ slug: 'good', root })).verdict, 'passed');
});

test('404.html and the legal pages are skipped', async () => {
  const bad = '<p>Resultados garantizados. Sin efectos secundarios.</p>';
  const root = withDist(freshRoot(), {
    'index.html': page('<h1>Panadería</h1>'),
    '404.html': page(bad),
    'aviso-legal/index.html': page(bad),
    'es/privacidad/index.html': page(bad),
    'legal-notice/index.html': page(bad, 'en'),
    'privacy/index.html': page(bad, 'en'),
    'cookies/index.html': page(bad, 'es', 'data-legal-page="notice"'),
  });
  assert.deepEqual(await copyFailures(root), []);
  // The same text on an ordinary page fails.
  writeFileSync(join(siteDir(root), 'dist/terms-of-use.html'), page(bad));
  assert.ok((await copyFailures(root)).length > 0);
});

test('a page in another language gets one "not covered" warning and is not scanned', async () => {
  const root = withDist(freshRoot(), {
    'index.html': page('<h1>Panadería</h1>'),
    'fr/index.html': page(
      '<p>Résultats garantis. Resultados garantizados.</p>',
      'fr',
    ),
  });
  assert.deepEqual(await copyFailures(root), []);
  const result = await runChecks({ slug: 'good', root });
  const notCovered = result.warnings.filter(
    (w) => w.rule === 'copy-claims-language',
  );
  assert.equal(notCovered.length, 1);
  assert.match(notCovered[0].message, /\/fr\/index\.html/);
  assert.match(notCovered[0].message, /"fr"/);
});

test('the brief exception turns a failure into copy-claims-confirm, and ignores assumed text', async () => {
  const body = page(
    '<p>Satisfacción garantizada o te devolvemos tu dinero.</p>',
  );
  const stated = withDist(freshRoot(), { 'index.html': body });
  writeFileSync(
    join(siteDir(stated), 'brief.json'),
    briefWith({
      offer: [
        {
          name: 'Pack',
          description:
            'Si no te convence, te devolvemos el importe: devolución en 14 días.',
        },
      ],
    }),
  );
  assert.deepEqual(await copyFailures(stated), []);
  const confirm = (
    await runChecks({ slug: 'good', root: stated })
  ).warnings.filter((w) => w.rule === 'copy-claims-confirm');
  assert.ok(confirm.length > 0);
  assert.match(confirm[0].message, /person must confirm/);

  // The same text under `assumed` is the agent's, not the customer's.
  const assumed = withDist(freshRoot(), { 'index.html': body });
  writeFileSync(
    join(siteDir(assumed), 'brief.json'),
    briefWith({
      offer: [{ name: 'Pack', description: 'Devolución en 14 días.' }],
      assumed: [
        { field: 'offer[0].description', reason: 'chosen by the agent' },
      ],
    }),
  );
  assert.ok((await copyFailures(assumed)).length > 0);

  // A brief that does not hold the claim does not excuse it.
  const unrelated = withDist(freshRoot(), { 'index.html': body });
  writeFileSync(join(siteDir(unrelated), 'brief.json'), briefWith({}));
  assert.ok((await copyFailures(unrelated)).length > 0);

  // proof[].text counts as the customer's own words.
  const proof = withDist(freshRoot(), {
    'index.html': page('<p>Sin efectos secundarios.</p>'),
  });
  writeFileSync(
    join(siteDir(proof), 'brief.json'),
    briefWith({
      proof: [
        {
          kind: 'credential',
          text: 'Tratamiento sin efectos secundarios, avalado por el colegio médico.',
        },
      ],
    }),
  );
  assert.deepEqual(await copyFailures(proof), []);
});

test('loose brief words do not excuse a stronger claim', async () => {
  const cases = [
    ['<p>Resultados garantizados.</p>', 'Garantía de 2 años según la ley.'],
    [
      '<p>El mejor pan del mundo.</p>',
      'Queremos ser la mejor panadería del barrio.',
    ],
    [
      '<p>Gana 3.000 € al mes.</p>',
      'Beneficios del curso: aprender a hornear.',
    ],
  ];
  for (const [body, description] of cases) {
    const root = withDist(freshRoot(), { 'index.html': page(body) });
    writeFileSync(
      join(siteDir(root), 'brief.json'),
      briefWith({ offer: [{ name: 'Pack', description }] }),
    );
    assert.ok((await copyFailures(root)).length > 0, body);
  }
});
