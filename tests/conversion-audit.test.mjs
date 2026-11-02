// The conversion audit: each heuristic on small dist/ fixtures, a multi-locale site, no brief, the JSON shape and
// the exit codes (add-neuromarketing-review, task 1.1).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { main } from '../scripts/conversion-audit.mjs';
import { auditSite } from '../scripts/lib/conversion-audit.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'conversion-audit-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const PRIMARY = 'https://wa.me/34600000000';
let counter = 0;

/** A site under a fresh root. `files` maps dist-relative paths to HTML; `brief` is written when given. */
function makeSite({ files, brief, config } = {}) {
  const root = join(tmp, `root${(counter += 1)}`);
  const site = join(root, 'sites', 'demo');
  const put = (path, text) => {
    mkdirSync(dirname(join(site, path)), { recursive: true });
    writeFileSync(join(site, path), text);
  };
  put('package.json', '{"name":"site-demo"}');
  if (brief) put('brief.json', JSON.stringify(brief));
  if (config) put('astro.config.mjs', config);
  for (const [path, html] of Object.entries(files ?? {}))
    put(`dist/${path}`, html);
  return root;
}

const page = (main, { lang = 'en', footer = '' } = {}) =>
  `<!doctype html><html lang="${lang}"><head><title>t</title></head><body><header><a href="/">Home</a></header><main>${main}</main><footer>${footer}</footer></body></html>`;

const GOOD = page(
  `<section id="top"><h1>Sell your home</h1><a href="${PRIMARY}">Ask</a></section>
   <section id="how"><h2>How</h2><p>Steps</p></section>
   <section id="end"><h2>Ready?</h2><a href="${PRIMARY}">Ask now</a></section>`,
  { footer: '<a href="/privacy/">Privacy</a>' },
);
const BRIEF = {
  business: { name: 'Demo' },
  goal: { primary: { label: 'Ask', url: PRIMARY } },
  contact: { email: 'hi@demo.test', phone: '+34 600 000 000' },
};
const GOOD_FILES = {
  'index.html': GOOD,
  'privacy/index.html': page('<section id="p"><h1>Privacy</h1></section>'),
};

const audit = (root) => auditSite({ root, slug: 'demo' });
const ids = (result, level) =>
  result.findings.filter((f) => !level || f.level === level).map((f) => f.id);

test('a well-formed page has no warnings', () => {
  const brief = {
    ...BRIEF,
    contact: { email: 'hi@demo.test', phone: '+34 600 000 000' },
  };
  const root = makeSite({
    files: {
      ...GOOD_FILES,
      'index.html': page(
        `<section id="top"><h1>Sell</h1><a href="${PRIMARY}">Ask</a></section>
         <section id="c"><p>hi@demo.test</p><p><a href="tel:+34600000000">+34 600 000 000</a></p><a href="${PRIMARY}">Ask</a></section>`,
        { footer: '<a href="/privacy/">Privacy</a>' },
      ),
    },
    brief,
  });
  const result = audit(root);
  assert.deepEqual(ids(result, 'warn'), []);
  assert.deepEqual(ids(result, 'info'), ['legal-linked']);
  assert.match(result.findings[0].message, /legal pages linked: \/privacy\//);
});

test('hero-h1 and hero-cta: hit and miss', () => {
  const root = makeSite({
    files: {
      'index.html': page(
        `<section id="top"><h2>No h1</h2><a href="https://other.test">Other</a></section>
         <section id="end"><a href="${PRIMARY}">Ask</a></section>`,
      ),
    },
    brief: BRIEF,
  });
  const found = audit(root).findings.filter((f) => f.level === 'warn');
  assert.deepEqual(found.map((f) => f.id).sort(), [
    'contact-visible',
    'contact-visible',
    'hero-cta',
    'hero-h1',
  ]);
  const cta = found.find((f) => f.id === 'hero-cta');
  assert.equal(cta.page, '/');
  assert.match(cta.selector, /^section#top/);
  assert.match(cta.message, /wa\.me/);
  // miss: tracking parameters on the primary link still count as the primary link
  const ok = makeSite({
    files: {
      'index.html': page(
        `<section id="top"><h1>x</h1><a href="${PRIMARY}?utm_source=a&utm_medium=b">Ask</a></section>
         <section id="end"><a href="${PRIMARY}/">Ask</a></section>`,
      ),
    },
    brief: { ...BRIEF, contact: {} },
  });
  assert.deepEqual(ids(audit(ok), 'warn'), []);
});

test('closing-cta: the last section before the footer must link to the primary URL', () => {
  const root = makeSite({
    files: {
      'index.html': page(
        `<section id="top"><h1>x</h1><a href="${PRIMARY}">Ask</a></section>
         <section id="end"><h2>The end</h2><p>No link</p></section>`,
      ),
    },
    brief: { ...BRIEF, contact: {} },
  });
  const result = audit(root);
  assert.deepEqual(ids(result, 'warn'), ['closing-cta']);
  assert.match(result.findings[0].selector, /^section#end/);
  assert.equal(result.findings[0].page, '/');
});

test('without a brief any link in the hero and the closing section will do', () => {
  const root = makeSite({
    files: {
      'index.html': page(
        `<section id="top"><h1>x</h1><a href="#contact">Go</a></section>
         <section id="end"><h2>End</h2></section>`,
      ),
    },
  });
  const result = audit(root);
  assert.equal(result.brief, null);
  assert.deepEqual(ids(result, 'warn'), ['closing-cta']);
});

test('cta-destinations ignores anchors, mailto, tel, legal pages and repeated URLs', () => {
  const links = (hrefs) => hrefs.map((h) => `<a href="${h}">l</a>`).join('');
  const base = (hrefs) =>
    makeSite({
      files: {
        'index.html': page(
          `<section id="top"><h1>x</h1>${links(hrefs)}</section><section id="end">${links([PRIMARY])}</section>`,
        ),
      },
      brief: { ...BRIEF, contact: {} },
    });
  // four distinct external destinations plus the primary one: 5 > 3
  const many = audit(
    base([
      PRIMARY,
      'https://a.test/',
      'https://b.test/',
      'https://c.test/',
      'https://a.test/#frag',
    ]),
  );
  const hit = many.findings.find((f) => f.id === 'cta-destinations');
  assert.ok(hit);
  assert.match(hit.message, /4 distinct/);
  // everything excluded: no finding
  const few = audit(
    base([
      PRIMARY,
      PRIMARY,
      '#top',
      '/#top',
      'mailto:a@b.test',
      'tel:+34600000000',
      '/privacy/',
      '/aviso-legal/',
      'https://a.test/',
      'https://a.test/',
    ]),
  );
  assert.ok(!ids(few).includes('cta-destinations'));
});

test('form-fields counts visible fields only', () => {
  const field = (n) => `<input name="f${n}" type="text">`;
  const form = (inner) =>
    `<form action="/x">${inner}<button type="submit">Send</button></form>`;
  const run = (inner) =>
    audit(
      makeSite({
        files: {
          'index.html': page(
            `<section id="top"><h1>x</h1><a href="${PRIMARY}">a</a>${form(inner)}</section><section id="end"><a href="${PRIMARY}">a</a></section>`,
          ),
        },
        brief: { ...BRIEF, contact: {} },
      }),
    );
  const six =
    [1, 2, 3, 4].map(field).join('') +
    '<textarea name="m"></textarea><select name="s"><option>a</option></select>';
  const hit = run(six).findings.find((f) => f.id === 'form-fields');
  assert.ok(hit);
  assert.match(hit.message, /6 visible fields/);
  const exempt =
    [1, 2, 3, 4, 5].map(field).join('') +
    '<input type="hidden" name="access_key" value="x"><input type="checkbox" name="consent" required>' +
    '<input type="text" name="botcheck" style="display:none">' +
    '<div hidden><input name="hid"></div>';
  assert.ok(!ids(run(exempt)).includes('form-fields'));
});

test('offers-side-by-side warns over three priced siblings in one section', () => {
  const card = (n, price) =>
    `<article><h3>Plan ${n}</h3><p>${price}</p></article>`;
  const run = (cards) =>
    audit(
      makeSite({
        files: {
          'index.html': page(
            `<section id="top"><h1>x</h1><a href="${PRIMARY}">a</a></section>
             <section id="plans"><div>${cards.join('')}</div></section>
             <section id="end"><a href="${PRIMARY}">a</a></section>`,
          ),
        },
        brief: { ...BRIEF, contact: {} },
      }),
    );
  const hit = run([
    card(1, '19 €'),
    card(2, '$29'),
    card(3, '39 EUR'),
    card(4, '49 euros'),
  ]).findings.find((f) => f.id === 'offers-side-by-side');
  assert.ok(hit);
  assert.match(hit.message, /4 items with a price/);
  assert.match(hit.selector, /^section#plans/);
  assert.ok(
    !ids(
      run([card(1, '19 €'), card(2, '29 €'), card(3, '39 €'), card(4, 'Free')]),
    ).includes('offers-side-by-side'),
  );
});

test('proof-shown reports each proof entry; proof-without-brief flags quotes and stars without brief proof', () => {
  const withProof = {
    ...BRIEF,
    contact: {},
    proof: [
      { kind: 'testimonial', text: 'They sold it in a week.' },
      { kind: 'figure', text: 'More than 200 homes' },
    ],
  };
  const files = {
    'index.html': page(
      `<section id="top"><h1>x</h1><a href="${PRIMARY}">a</a></section>
       <section id="p"><blockquote>They sold it in a week.</blockquote></section>
       <section id="end"><a href="${PRIMARY}">a</a></section>`,
    ),
  };
  const shown = audit(makeSite({ files, brief: withProof }));
  const proof = shown.findings.filter((f) => f.id === 'proof-shown');
  assert.equal(proof.length, 2);
  assert.match(proof[0].message, /is on the page/);
  assert.match(proof[1].message, /is not on the page/);
  assert.ok(!ids(shown).includes('proof-without-brief'));

  const without = audit(makeSite({ files, brief: { ...BRIEF, contact: {} } }));
  assert.ok(ids(without, 'warn').includes('proof-without-brief'));
  const stars = audit(
    makeSite({
      files: {
        'index.html': page(
          `<section id="top"><h1>x</h1><a href="${PRIMARY}">a</a><p aria-label="4.8 stars">rating</p></section><section id="end"><a href="${PRIMARY}">a</a></section>`,
        ),
      },
      brief: { ...BRIEF, contact: {} },
    }),
  );
  assert.ok(ids(stars, 'warn').includes('proof-without-brief'));
  const glyph = audit(
    makeSite({
      files: {
        'index.html': page(
          `<section id="top"><h1>x</h1><a href="${PRIMARY}">a</a><p>★★★★★</p></section><section id="end"><a href="${PRIMARY}">a</a></section>`,
        ),
      },
    }),
  );
  assert.ok(ids(glyph, 'warn').includes('proof-without-brief'));
});

test('contact-visible: a missing email or phone warns, an assumed one does not', () => {
  const files = { 'index.html': GOOD };
  const miss = audit(makeSite({ files, brief: BRIEF }));
  const found = miss.findings.filter((f) => f.id === 'contact-visible');
  assert.equal(found.length, 2);
  const assumed = audit(
    makeSite({
      files,
      brief: {
        ...BRIEF,
        assumed: [
          { field: 'contact.email', reason: 'x' },
          { field: 'contact.phone', reason: 'x' },
        ],
      },
    }),
  );
  assert.ok(!ids(assumed).includes('contact-visible'));
});

test('legal-linked says which legal pages are not linked', () => {
  const root = makeSite({
    files: {
      'index.html': page(
        `<section id="top"><h1>x</h1><a href="${PRIMARY}">a</a></section><section id="end"><a href="${PRIMARY}">a</a></section>`,
      ),
      'privacy/index.html': page('<section id="p"><h1>Privacy</h1></section>'),
    },
    brief: { ...BRIEF, contact: {} },
  });
  const legal = audit(root).findings.find((f) => f.id === 'legal-linked');
  assert.equal(legal.level, 'info');
  assert.match(legal.message, /not linked from this page: \/privacy\//);
});

const I18N_CONFIG = `export default { i18n: { locales: ['en', 'es'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } } };`;

test('a multi-locale site is audited on each locale home page', () => {
  const root = makeSite({
    config: I18N_CONFIG,
    files: {
      'index.html': GOOD,
      'es/index.html': page(
        `<section id="top"><h1>Vende</h1><a href="${PRIMARY}">Pide</a></section><section id="end"><h2>Fin</h2></section>`,
        { lang: 'es' },
      ),
    },
    brief: { ...BRIEF, contact: {} },
  });
  const result = audit(root);
  assert.deepEqual(
    result.pages.map((p) => [p.page, p.locale]),
    [
      ['/', 'en'],
      ['/es/', 'es'],
    ],
  );
  const closing = result.findings.filter((f) => f.id === 'closing-cta');
  assert.deepEqual(
    closing.map((f) => f.page),
    ['/es/'],
  );
});

test('--json shape and exit 0 with findings', () => {
  const root = makeSite({
    files: { 'index.html': page('<section id="top"><h2>x</h2></section>') },
    brief: BRIEF,
  });
  const out = [];
  const code = main(
    ['--site', 'demo', '--json'],
    { log: (m) => out.push(m), error: () => assert.fail('no error output') },
    { LANDING_FACTORY_ROOT: root },
  );
  assert.equal(code, 0);
  const json = JSON.parse(out.join('\n'));
  assert.deepEqual(Object.keys(json), ['site', 'brief', 'pages', 'findings']);
  assert.equal(json.site, 'demo');
  assert.ok(json.findings.length > 0);
  for (const f of json.findings) {
    assert.deepEqual(Object.keys(f), [
      'id',
      'level',
      'page',
      'selector',
      'message',
    ]);
    assert.ok(['warn', 'info'].includes(f.level));
  }
  const human = [];
  main(
    ['--site', 'demo'],
    { log: (m) => human.push(m), error: () => {} },
    {
      LANDING_FACTORY_ROOT: root,
    },
  );
  assert.match(human.join('\n'), /conversion-audit demo: \d+ warning/);
});

test('exit 2 for bad usage, an unknown site and no build; nothing is written', () => {
  const run = (args, root) =>
    spawnSync(
      process.execPath,
      [join(ROOT, 'scripts/conversion-audit.mjs'), ...args],
      {
        encoding: 'utf8',
        env: { ...process.env, LANDING_FACTORY_ROOT: root },
      },
    );
  const root = makeSite({ files: {} });
  const noBuild = run(['--site', 'demo'], root);
  assert.equal(noBuild.status, 2);
  assert.match(noBuild.stderr, /build first/);
  assert.equal(run([], root).status, 2);
  assert.equal(run(['--bogus'], root).status, 2);
  const missing = run(['--site', 'nope'], root);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /not a site/);
  assert.equal(run(['--site', 'Bad_Slug'], root).status, 2);
  const withFindings = run(
    ['--site', 'demo'],
    makeSite({
      files: { 'index.html': page('<section id="a"><h2>x</h2></section>') },
    }),
  );
  assert.equal(withFindings.status, 0);
});
