// The dark-patterns patterns and the check-landing rule (add-neuromarketing-review, task 2.1).
import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { runChecks } from '../scripts/check-landing.mjs';
import {
  confirmshamingLanguage,
  pageScripts,
  scanDarkPatterns,
  scriptTicksCountdown,
} from '../scripts/lib/dark-patterns.mjs';
import { parseTree } from '../scripts/lib/html-tree.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/landing');
const tmp = mkdtempSync(join(tmpdir(), 'dark-patterns-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const html = (body, head = '') =>
  `<!doctype html><html lang="es"><head><title>x</title>${head}</head><body><main>${body}</main></body></html>`;
const hits = (body, scripts = []) =>
  scanDarkPatterns({
    page: '/index.html',
    tree: parseTree(html(body)),
    scripts,
  });
const ids = (body, scripts) => hits(body, scripts).map((h) => h.id);

test('a pre-checked checkbox in a form fails and names the field', () => {
  const found = hits(
    '<form><input type="checkbox" name="newsletter" checked> <input type="CHECKBOX" id="promo" checked="checked"></form>',
  );
  assert.deepEqual(
    found.map((h) => h.id),
    ['prechecked-checkbox', 'prechecked-checkbox'],
  );
  assert.match(found[0].message, /"newsletter"/);
  assert.match(found[1].message, /"promo"/);
  assert.equal(found[0].item, '/index.html#prechecked-checkbox');
});

test('fair forms pass: an unchecked consent box, a checked box outside a form, a checked radio', () => {
  assert.deepEqual(
    ids('<form><input type="checkbox" name="consent" required></form>'),
    [],
  );
  assert.deepEqual(
    ids('<p><input type="checkbox" checked disabled> done</p>'),
    [],
  );
  assert.deepEqual(
    ids('<form><input type="radio" name="plan" checked></form>'),
    [],
  );
});

test('a data-countdown element fails; a deadline written as a date passes', () => {
  assert.deepEqual(ids('<div data-countdown="2026-12-01">00:00</div>'), [
    'countdown-element',
  ]);
  assert.deepEqual(
    ids(
      '<p>Oferta válida hasta el 30 de noviembre. Offer ends on 30 November.</p>',
    ),
    [],
  );
  assert.deepEqual(
    ids('<time datetime="2026-11-30">30 de noviembre</time>'),
    [],
  );
});

test('a ticking script fails; motion-style code does not', () => {
  const ticking = `const t=setInterval(()=>{render({days:d,hours:h,minutes:m,seconds:s})},1000);const labels=["days","hours","minutes","seconds"];`;
  assert.ok(scriptTicksCountdown(ticking));
  assert.ok(
    scriptTicksCountdown(
      `setInterval(tick,1e3);const l={d:'días',h:'horas',m:'minutos'}`,
    ),
  );
  assert.deepEqual(ids('<p>x</p>', [{ name: 'inline', text: ticking }]), [
    'countdown-script',
  ]);
  // setInterval alone, a single unit label, or labels without setInterval are fair
  assert.ok(!scriptTicksCountdown('setInterval(()=>poll(),5000)'));
  assert.ok(!scriptTicksCountdown(`setInterval(f,1000);x=["seconds"]`));
  assert.ok(!scriptTicksCountdown(`const labels=["days","hours","minutes"]`));
  // minified animation-library shaped code: setInterval for a ticker, unit words only as property names
  assert.ok(
    !scriptTicksCountdown(
      `var _tick=function(){setInterval(function(){return _ticker.update()},1e3/60)};e.seconds=1;e.minutes=2;var days=3;`,
    ),
  );
});

test('confirmshaming fails in Spanish and English', () => {
  const shame = [
    'No, prefiero seguir perdiendo dinero',
    'No, gracias, prefiero pagar de más',
    'Prefiero quedarme sin clientes',
    'No quiero ahorrar dinero',
    'Odio ahorrar',
    'No me importa ahorrar',
    'No thanks, I hate saving money',
    "No, I'd rather pay more",
    'No thanks, I prefer to keep losing money',
    "I don't want to succeed",
    'Keep me broke',
    "No, I don't want to be successful",
  ];
  for (const text of shame) {
    const found = hits(`<p><a href="#x">${text}</a></p>`);
    assert.deepEqual(
      found.map((h) => h.id),
      ['confirmshaming'],
      text,
    );
  }
  assert.equal(
    confirmshamingLanguage('No, prefiero seguir perdiendo dinero'),
    'es',
  );
  assert.equal(confirmshamingLanguage('No thanks, I hate saving money'), 'en');
  // buttons too, and accents are folded
  assert.deepEqual(
    ids('<button type="button">NO, PREFIERO PAGAR DE MÁS</button>'),
    ['confirmshaming'],
  );
});

test('fair declines pass', () => {
  for (const text of [
    'No, gracias',
    'No thanks',
    'No, thank you',
    'Ahora no',
    'Quizá más tarde',
    'Not now',
    'Prefiero pagar después',
    'Prefiero no recibir correos',
    "I'd rather talk to a person",
    'No quiero recibir correos',
    'No me interesa por ahora',
    "I don't want updates by email",
    'Skip for now',
    'Odio las colas, reserva online',
  ])
    assert.deepEqual(ids(`<a href="#x">${text}</a>`), [], text);
});

test('pageScripts reads inline executable scripts and the local files a page references, once', () => {
  const dist = mkdtempSync(join(tmp, 'd-'));
  mkdirSync(join(dist, '_astro'));
  writeFileSync(
    join(dist, '_astro/a.js'),
    'setInterval(f,1000);["days","hours"]',
  );
  writeFileSync(join(dist, '_astro/b.js'), 'var b=1');
  const tree = parseTree(
    html(
      '<script>var inline=1</script><script type="application/ld+json">{"a":1}</script><script type="module" src="/_astro/a.js"></script><script src="/_astro/a.js"></script><script src="https://cdn.test/x.js"></script>',
      '<link rel="modulepreload" href="/_astro/b.js"><link rel="modulepreload" href="/_astro/missing.js">',
    ),
  );
  const found = pageScripts(dist, tree);
  assert.deepEqual(found.map((s) => s.name).sort(), [
    '_astro/a.js',
    '_astro/b.js',
    'an inline script',
  ]);
  assert.ok(
    scanDarkPatterns({ page: '/', tree, scripts: found }).some(
      (h) => h.id === 'countdown-script' && /_astro\/a\.js/.test(h.message),
    ),
  );
});

// --- the rule in check-landing ------------------------------------------------------------------------

const freshRoot = () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
};
const siteDir = (root) => join(root, 'sites/good');
function withDist(root, files) {
  const dist = join(siteDir(root), 'dist');
  mkdirSync(dist, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dist, name)), { recursive: true });
    writeFileSync(join(dist, name), content);
  }
  return root;
}
const darkFailures = async (root) =>
  (await runChecks({ slug: 'good', root })).failures.filter(
    (f) => f.rule === 'dark-patterns',
  );

test('without a build the rule only warns and the fixture site still passes', async () => {
  const result = await runChecks({ slug: 'good', root: freshRoot() });
  assert.equal(result.verdict, 'passed');
  assert.ok(result.checks.some((c) => c.name === 'dark-patterns' && c.ok));
  assert.ok(result.warnings.some((w) => w.rule === 'dark-patterns-no-build'));
});

test('a pre-checked newsletter box fails naming the page and the field', async () => {
  const root = withDist(freshRoot(), {
    'index.html': html(
      '<h1>Taller</h1><form><input type="checkbox" name="newsletter" checked></form>',
    ),
  });
  const failures = await darkFailures(root);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].item, '/index.html#prechecked-checkbox');
  assert.match(failures[0].message, /\/index\.html: .*"newsletter"/);
  assert.equal((await runChecks({ slug: 'good', root })).verdict, 'failed');
});

test('a countdown element, a ticking page script and confirmshaming each fail; the fair page passes', async () => {
  const root = withDist(freshRoot(), {
    'index.html': html(
      '<h1>Taller</h1><div data-countdown>3d</div><a href="/x">No, prefiero seguir perdiendo dinero</a>',
      '<script type="module" src="/_astro/timer.js"></script>',
    ),
    '_astro/timer.js':
      'setInterval(tick,1000);const u=["horas","minutos","segundos"];',
    'otra/index.html': html(
      '<p>Hasta el 30 de noviembre</p><a href="/">No, gracias</a>',
    ),
  });
  const failures = await darkFailures(root);
  assert.deepEqual(failures.map((f) => f.item).sort(), [
    '/index.html#confirmshaming',
    '/index.html#countdown-element',
    '/index.html#countdown-script',
  ]);
  assert.ok(failures.every((f) => !f.message.includes('otra')));
});

test('404.html is skipped', async () => {
  const root = withDist(freshRoot(), {
    'index.html': html('<h1>Taller</h1>'),
    '404.html': html(
      '<form><input type="checkbox" name="n" checked></form><div data-countdown></div>',
    ),
  });
  assert.deepEqual(await darkFailures(root), []);
  assert.equal((await runChecks({ slug: 'good', root })).verdict, 'passed');
});

test('the bundles the starter and the existing sites ship do not trigger the countdown pattern', () => {
  const folders = [
    join(ROOT, 'dist'),
    ...readdirSync(join(ROOT, 'sites'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => join(ROOT, 'sites', e.name, 'dist')),
  ]
    .map((d) => join(d, '_astro'))
    .filter((d) => existsSync(d));
  let scanned = 0;
  for (const dir of folders)
    for (const file of readdirSync(dir).filter((f) => /\.m?js$/.test(f))) {
      scanned += 1;
      assert.ok(
        !scriptTicksCountdown(readFileSync(join(dir, file), 'utf8')),
        `${dir}/${file}`,
      );
    }
  // Builds are not committed: with none present this test only checks that the loop is sound.
  assert.ok(scanned >= 0);
});
