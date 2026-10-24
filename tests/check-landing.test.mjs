// Tests for scripts/check-landing.mjs on the fixture root tests/fixtures/landing (copied to a temp folder
// and mutated per case). The originality test serves a reference page from a local HTTP server.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  aiDisclosureIn,
  colorTokens,
  contrastRatio,
  countFileUses,
  findCopiedSentences,
  htmlToText,
  main,
  normalizeWords,
  paletteHexes,
  parseLandingMeta,
  runChecks,
  shingles,
} from '../scripts/check-landing.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURE = join(ROOT, 'tests/fixtures/landing');
const tmp = mkdtempSync(join(tmpdir(), 'check-landing-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const freshRoot = () => {
  const root = mkdtempSync(join(tmp, 'root-'));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
};
const site = (root, file = '') => join(root, 'sites/good', file);
const edit = (path, change) =>
  writeFileSync(path, change(readFileSync(path, 'utf8')));
const failuresOf = async (root, rule) =>
  (await runChecks({ slug: 'good', root })).failures.filter(
    (f) => f.rule === rule,
  );
const quiet = { log() {}, error() {} };

test('the fixture site passes every check', async () => {
  const result = await runChecks({ slug: 'good', root: freshRoot() });
  assert.deepEqual(result.failures, []);
  assert.equal(result.verdict, 'passed');
  assert.deepEqual(result.skipped, ['originality']);
});

test('an image without an assets.json entry fails naming the file, and so does a manifest entry without a file', async () => {
  const root = freshRoot();
  mkdirSync(site(root, 'public'), { recursive: true });
  writeFileSync(site(root, 'src/assets/images/stray.png'), 'x');
  writeFileSync(site(root, 'public/hero-og.jpg'), 'x');
  const failures = await failuresOf(root, 'uncredited-image');
  assert.deepEqual(failures.map((f) => f.item).sort(), [
    'public/hero-og.jpg',
    'src/assets/images/stray.png',
  ]);
  // favicon.svg is exempt.
  writeFileSync(site(root, 'public/favicon.svg'), '<svg/>');
  assert.equal((await failuresOf(root, 'uncredited-image')).length, 2);
  // An entry whose file is gone.
  rmSync(site(root, 'src/assets/images/team.jpg'));
  const orphan = (await failuresOf(root, 'uncredited-image')).find(
    (f) => f.item === 'team.jpg',
  );
  assert.match(orphan.message, /no such image/);
});

test('images outside src/assets/images can be listed by their path', async () => {
  const root = freshRoot();
  mkdirSync(site(root, 'public/img'), { recursive: true });
  writeFileSync(site(root, 'public/img/og.jpg'), 'x');
  edit(site(root, 'assets.json'), (text) => {
    const data = JSON.parse(text);
    data.images.push({
      ...data.images[1],
      file: 'img/og.jpg',
      title: 'File:Sample og.jpg',
      sourcePage: 'https://commons.wikimedia.org/wiki/File:Sample_og.jpg',
    });
    return JSON.stringify(data, null, 2);
  });
  assert.deepEqual(await failuresOf(root, 'uncredited-image'), []);
});

test('CREDITS.md or credits.json out of sync fails with the command to fix it', async () => {
  const root = freshRoot();
  edit(site(root, 'CREDITS.md'), (t) => t.replace('Ana Pan', 'Somebody Else'));
  let [failure] = await failuresOf(root, 'credits-stale');
  assert.equal(failure.item, 'CREDITS.md');
  assert.match(failure.message, /node scripts\/credits\.mjs --site good/);
  edit(site(root, 'src/data/credits.json'), (t) =>
    t.replace('Ana Pan', 'Somebody Else'),
  );
  [failure] = await failuresOf(root, 'credits-stale');
  assert.equal(failure.item, 'CREDITS.md, src/data/credits.json');
});

test('a photo used from more than two places fails and lists every use; crops of one source add up', async () => {
  const root = freshRoot();
  edit(site(root, 'src/pages/index.astro'), (t) =>
    t.replace(
      '<img src={images.team.src.src}',
      '<img src={images.hero.src.src} alt="again" />\n  <img src={images.hero.src.src} alt="third" />\n  <img src={images.team.src.src}',
    ),
  );
  // images.ts binds hero once and uses it once; the page references it through images.hero (not counted):
  // the count is per reference to the imported binding.
  assert.deepEqual(await failuresOf(root, 'photo-overuse'), []);
  edit(site(root, 'src/data/images.ts'), (t) =>
    t.replace(
      "team: { src: team, alt: 'The team.' },",
      "team: { src: team, alt: 'The team.' },\n  again: { src: hero, alt: 'Again.' },\n  third: { src: hero, alt: 'Third.' },",
    ),
  );
  const [failure] = await failuresOf(root, 'photo-overuse');
  assert.equal(failure.item, 'hero.jpg');
  assert.match(failure.message, /Sample hero\.jpg is used 3 times \(max 2\)/);
  assert.match(failure.message, /src\/data\/images\.ts -> hero\.jpg x3/);
});

test('use counting: imports bind names, object keys and property accesses are not uses, strings and url() count', () => {
  const root = freshRoot();
  writeFileSync(
    site(root, 'src/data/more.ts'),
    `import hero from '../assets/images/hero.jpg?url';
// import hero from '../assets/images/hero.jpg'; (commented out)
const a = { hero: 1, b: hero };
const c = other.hero;
const d = [hero, hero];
`,
  );
  writeFileSync(
    site(root, 'src/styles/extra.css'),
    ".x { background: url('../assets/images/hero.jpg'); }\n.y { background: url(../assets/images/hero.jpg.bak); }\n",
  );
  const uses = countFileUses(site(root), ['hero.jpg', 'team.jpg']);
  const bySource = Object.fromEntries(
    uses.get('hero.jpg').map((u) => [u.source, u.count]),
  );
  assert.deepEqual(bySource, {
    'src/data/images.ts': 1,
    'src/data/more.ts': 3,
    'src/styles/extra.css': 1,
  });
});

test('palette hex or font family of MASTER.md missing from tokens.css fails', async () => {
  const root = freshRoot();
  edit(site(root, 'src/styles/tokens.css'), (t) =>
    t.replace('#2b1d14', '#000000').replace('Fraunces Variable', 'Georgia Pro'),
  );
  const failures = await failuresOf(root, 'tokens-mismatch');
  assert.deepEqual(failures.map((f) => f.item).sort(), ['#2b1d14', 'Fraunces']);
  assert.match(
    failures.find((f) => f.item === '#2b1d14').message,
    /palette color #2b1d14/,
  );
  // Case-insensitive and 3-digit hex are matched.
  const ok = freshRoot();
  edit(site(ok, 'src/styles/tokens.css'), (t) =>
    t.replace('#faf5ec', '#FAF5EC').replace('Inter Variable', 'INTER'),
  );
  assert.deepEqual(await failuresOf(ok, 'tokens-mismatch'), []);
  // A missing MASTER.md is reported too.
  rmSync(join(root, 'design-system/good'), { recursive: true });
  assert.match(
    (await failuresOf(root, 'tokens-mismatch'))[0].message,
    /MASTER\.md does not exist/,
  );
});

test('contrast: a failing token pair is named with its ratio; passing and absent pairs are silent', async () => {
  const root = freshRoot();
  // The fixture has ink, paper and primary: all pairs among them pass.
  assert.deepEqual(await failuresOf(root, 'contrast'), []);
  edit(site(root, 'src/styles/tokens.css'), (t) =>
    t.replace('--color-ink: #2b1d14', '--color-ink: #b8aa98'),
  );
  const failures = await failuresOf(root, 'contrast');
  assert.deepEqual(failures.map((f) => f.item).sort(), [
    'ink/paper',
    'paper/ink',
  ]);
  assert.match(
    failures[0].message,
    /ink #b8aa98 on paper #faf5ec has contrast [12]\.\d\d:1/,
  );
  // A 3-digit hex is understood; pairs with a missing token are skipped.
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.deepEqual(colorTokens('--color-a: #FFF; --color-b: rgb(1 2 3);'), {
    a: '#ffffff',
  });
});

test('the palette section ignores hex colors in other sections', () => {
  const md =
    '# T\n\n## Intro\n\n| a | b |\n| - | - |\n| x | `#111111` |\n\n## Palette\n\n| r | h |\n| - | - |\n| p | `#AABBCC` |\n| q | `#abc` |\n\n### Sub\n\n| r | h |\n| - | - |\n| z | `#222222` |\n\n## Other\n\n| r | h |\n| - | - |\n| z | `#333333` |\n';
  assert.deepEqual(
    paletteHexes(md),
    ['#aabbcc', '#aabbcc', '#222222'].filter((v, i, a) => a.indexOf(v) === i),
  );
  assert.equal(paletteHexes('# T\n\nno palette here'), null);
});

test('landing-meta must exist and be valid; parse reads the fenced block', async () => {
  assert.deepEqual(
    parseLandingMeta(
      'x\n```landing-meta\nprimary: #fff\ndisplay-font: Fraunces\nhero: split\n```\n',
    ),
    {
      primary: '#fff',
      displayFont: 'Fraunces',
      bodyFont: '',
      hero: 'split',
      archetype: '',
      traits: [],
    },
  );
  assert.deepEqual(
    parseLandingMeta(
      '```landing-meta\nprimary: #fff\ndisplay-font: F\nhero: split\narchetype: swiss-grid-minimal+drop-cap\ntraits: drop-cap, ref:a-b/marquee-type\n```\n',
    ).traits,
    ['drop-cap', 'ref:a-b/marquee-type'],
  );
  assert.equal(parseLandingMeta('```js\nprimary: #fff\n```'), null);
  const root = freshRoot();
  edit(join(root, 'design-system/good/MASTER.md'), (t) =>
    t.replace('hero: full-bleed-photo', 'hero: parallax-carousel'),
  );
  const [failure] = await failuresOf(root, 'landing-meta');
  assert.match(failure.message, /hero must be one of full-bleed-photo, split/);
  const bare = freshRoot();
  edit(join(bare, 'design-system/good/MASTER.md'), (t) =>
    t.replace(/```landing-meta[\s\S]*?```/, ''),
  );
  assert.match(
    (await failuresOf(bare, 'landing-meta'))[0].message,
    /no ```landing-meta block/,
  );
});

test('diversity fails naming the other site only when primary, display font and hero all match', async () => {
  const root = freshRoot();
  assert.deepEqual(await failuresOf(root, 'diversity'), []);
  const other = join(root, 'design-system/other/MASTER.md');
  // Two of three match: still fine.
  edit(other, (t) =>
    t.replaceAll('#0f766e', '#92400E').replace('hero: split', 'hero: split'),
  );
  assert.deepEqual(await failuresOf(root, 'diversity'), []);
  edit(other, (t) => t.replace('hero: split', 'hero: full-bleed-photo'));
  const [failure] = await failuresOf(root, 'diversity');
  assert.equal(failure.item, 'other');
  assert.match(
    failure.message,
    /looks like sites\/other: same primary color #92400e, display font Fraunces and hero type full-bleed-photo/,
  );
});

test('htmlToText drops scripts and styles, keeps block boundaries and decodes entities', () => {
  const text = htmlToText(
    '<html><head><title>T</title><style>p{color:red}</style></head><body><script>var a = "x y z";</script><h1>Pan &amp; caf&eacute;</h1><p>Hello <strong>big</strong> world.</p><ul><li>One</li><li>Two</li></ul><!-- hidden --></body></html>',
  );
  assert.equal(text, 'Pan & caf&eacute;\nHello big world.\nOne\nTwo');
});

test('normalization drops accents and punctuation; shingles need 8 words', () => {
  assert.deepEqual(normalizeWords('¡Pan, café y MÁS!'), [
    'pan',
    'cafe',
    'y',
    'mas',
  ]);
  assert.equal(shingles(normalizeWords('a b c d e f g')).size, 0);
  assert.equal(shingles(normalizeWords('a b c d e f g h i')).size, 2);
});

test('findCopiedSentences matches 8 shared words, quotes at most 12 and ignores shorter overlaps', () => {
  const reference = [
    {
      url: 'https://ref.test/',
      text: 'Welcome to our family bakery where every loaf is shaped by hand each morning before sunrise.\nOpen daily',
    },
  ];
  const pages = [
    {
      page: '/index.html',
      text: 'Home\nWhere every LOAF is shaped by hand, each morning! Come in.\nOpen daily\nWelcome to our family kitchen',
    },
  ];
  const failures = findCopiedSentences(pages, reference);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].item, '/index.html');
  assert.match(
    failures[0].message,
    /^"Where every LOAF is shaped by hand, each morning!" shares 8 words in a row with https:\/\/ref\.test\//,
  );
  const long = findCopiedSentences(
    [
      {
        page: '/p',
        text: 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen.',
      },
    ],
    [
      {
        url: 'https://r.test',
        text: 'x one two three four five six seven eight y',
      },
    ],
  );
  assert.match(
    long[0].message,
    /^"one two three four five six seven eight nine ten eleven twelve\.\.\."/,
  );
});

/** Serve fixed HTML pages on 127.0.0.1 and return { base, close }. */
async function serve(pages) {
  const server = createServer((req, res) => {
    const body = pages[req.url];
    res.writeHead(body ? 200 : 404, { 'content-type': 'text/html' });
    res.end(body ?? 'not found');
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}

test('--refs: a deliberately copied sentence in the built page is reported, an original page passes', async () => {
  const copied =
    'Our sourdough rests for thirty six hours before it ever meets the oven.';
  const server = await serve({
    '/ref': `<html><body><nav>Home Shop</nav><h1>Other Bakery</h1><p>${copied} Visit us today.</p><script>var x="ignored words here and there and more";</script></body></html>`,
  });
  try {
    const root = freshRoot();
    mkdirSync(site(root, 'dist'), { recursive: true });
    writeFileSync(
      site(root, 'dist/index.html'),
      `<html><body><h1>Good</h1><p>We bake slowly. ${copied}</p><p>Pan nuestro de cada dia.</p></body></html>`,
    );
    const out = [];
    const code = await main(
      ['--site', 'good', '--refs', `${server.base}/ref`],
      { log: (m) => out.push(m), error: (m) => out.push(m) },
      { root },
    );
    const text = out.join('\n');
    assert.equal(code, 1);
    assert.match(
      text,
      /\[copy-match\] "Our sourdough rests for thirty six hours before it ever meets the\.\.\."/,
    );
    assert.match(text, /FAIL originality/);
    // Rewriting the sentence passes.
    writeFileSync(
      site(root, 'dist/index.html'),
      '<html><body><p>Our loaves prove overnight, then bake until the crust crackles.</p></body></html>',
    );
    assert.equal(
      await main(['--site', 'good', '--refs', `${server.base}/ref`], quiet, {
        root,
      }),
      0,
    );
    // Nothing was written to disk for the reference: only dist and the fixture files exist.
    assert.equal(
      spawnSync('grep', ['-rl', 'Other Bakery', root]).stdout.length,
      0,
    );
  } finally {
    await server.close();
  }
});

test('exit codes: 1 on failures, 2 when the run breaks (no dist, unreadable reference, unknown site, bad usage)', async () => {
  const root = freshRoot();
  writeFileSync(site(root, 'src/assets/images/stray.png'), 'x');
  assert.equal(await main(['--site', 'good'], quiet, { root }), 1);
  rmSync(site(root, 'src/assets/images/stray.png'));
  assert.equal(await main(['--site', 'good'], quiet, { root }), 0);
  // --refs without dist/.
  assert.equal(
    await main(['--site', 'good', '--refs', 'http://127.0.0.1:1/x'], quiet, {
      root,
    }),
    2,
  );
  mkdirSync(site(root, 'dist'));
  writeFileSync(site(root, 'dist/index.html'), '<p>x</p>');
  // Unreadable reference (connection refused).
  assert.equal(
    await main(['--site', 'good', '--refs', 'http://127.0.0.1:1/x'], quiet, {
      root,
    }),
    2,
  );
  assert.equal(await main(['--site', 'nope'], quiet, { root }), 2);
  assert.equal(await main(['--site', 'Bad Slug'], quiet, { root }), 2);
  assert.equal(await main([], quiet, { root }), 2);
  assert.equal(await main(['--wat'], quiet, { root }), 2);
  const json = [];
  await main(
    ['--site', 'good', '--json'],
    { log: (m) => json.push(m), error() {} },
    { root },
  );
  assert.equal(JSON.parse(json[0]).verdict, 'passed');
  const help = spawnSync(
    process.execPath,
    ['scripts/check-landing.mjs', '--help'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--refs/);
});

test('the real panaderia site passes the final check, except that its layout is close to clinica-dental (calibration evidence)', async () => {
  const result = await runChecks({ slug: 'panaderia', root: ROOT });
  const layout = result.failures.filter((f) => f.rule === 'layout-diversity');
  assert.deepEqual(
    result.failures.filter((f) => f.rule !== 'layout-diversity'),
    [],
  );
  // The measure sees what the three generated sites share (rounded photos, pill buttons, wordmark
  // footer); samurai is far from both. Not a failure of the change: CI does not run check-landing.
  assert.deepEqual(
    layout.map((f) => f.item),
    ['clinica-dental'],
  );
});

// --- scenes rule (add-3d-scenes, Decision 7) ---------------------------------------------

const sceneFigure = (name, img) =>
  `<figure data-scene="${name}" class="x">${img ? `<picture><img alt="a" src="${img}" /></picture>` : ''}<div data-scene-mount></div></figure>`;

const withDist = (root, html) => {
  mkdirSync(site(root, 'dist'), { recursive: true });
  writeFileSync(
    site(root, 'dist/index.html'),
    `<html><body>${html}</body></html>`,
  );
};

test('scenes: a poster recorded in assets.json passes, with Astro hashed names', async () => {
  const root = freshRoot();
  withDist(
    root,
    sceneFigure('hero', '/_astro/hero.BCLsWVUo_Z1hYIWH.jpg') +
      sceneFigure('crest', '/team.jpg'),
  );
  assert.deepEqual(await failuresOf(root, 'scenes'), []);
});

test('scenes: a scene without a poster img, or with a poster missing from assets.json, fails naming the scene', async () => {
  const root = freshRoot();
  withDist(
    root,
    sceneFigure('hero', null) +
      sceneFigure('crest', '/_astro/unknown.AAA_BBB.jpg'),
  );
  const failures = await failuresOf(root, 'scenes');
  assert.equal(failures.length, 2);
  assert.match(failures[0].message, /scene "hero".*no poster/);
  assert.match(
    failures[1].message,
    /scene "crest".*unknown\.AAA_BBB\.jpg.*not in assets\.json/,
  );
});

test('scenes: a self-rendered poster recorded with source "self" passes', async () => {
  const root = freshRoot();
  edit(site(root, 'assets.json'), (text) => {
    const manifest = JSON.parse(text);
    manifest.images.push({
      file: 'hero-poster.jpg',
      title: 'Poster of the "hero" 3D scene',
      sourcePage: 'site code: src/scenes/hero.ts',
      author: 'Original',
      license: 'Original (rendered from site code)',
      credit: false,
      source: 'self',
      retrievedAt: '2026-10-21T00:00:00.000Z',
    });
    return JSON.stringify(manifest);
  });
  mkdirSync(site(root, 'src/assets/images'), { recursive: true });
  writeFileSync(site(root, 'src/assets/images/hero-poster.jpg'), 'x');
  withDist(root, sceneFigure('hero', '/_astro/hero-poster.CCC_DDD.jpg'));
  assert.deepEqual(await failuresOf(root, 'scenes'), []);
});

test('scenes: more than two distinct scenes fail; a site using <Scene3D /> without dist fails', async () => {
  const root = freshRoot();
  withDist(
    root,
    ['a', 'b', 'c'].map((n) => sceneFigure(n, '/team.jpg')).join(''),
  );
  const many = await failuresOf(root, 'scenes');
  assert.equal(many.length, 1);
  assert.match(many[0].message, /3 scenes.*at most 2/);

  const other = freshRoot();
  writeFileSync(
    site(other, 'src/pages/index.astro'),
    '---\n---\n<Scene3D scene="x" />\n',
  );
  const noDist = await failuresOf(other, 'scenes');
  assert.equal(noDist.length, 1);
  assert.match(noDist[0].message, /does not exist; build first/);
});

// --- brief-facts (add-brief-intake) -----------------------------------------------------------------

const BRIEF_FIXTURE = join(ROOT, 'tests/fixtures/brief');
const briefRoot = (change = (brief) => brief) => {
  const root = freshRoot();
  const brief = JSON.parse(
    readFileSync(join(BRIEF_FIXTURE, 'brief.json'), 'utf8'),
  );
  mkdirSync(site(root, 'assets'), { recursive: true });
  cpSync(join(BRIEF_FIXTURE, 'assets'), site(root, 'assets'), {
    recursive: true,
  });
  writeFileSync(
    site(root, 'brief.json'),
    JSON.stringify(change(brief) ?? brief),
  );
  return root;
};
const goodPage = `<header><a href="https://example.com/tienda/pack-notion-freelance">Comprar el pack</a></header>
<h1>Taller Plantilla</h1>
<section><h2>Pack Notion Freelance</h2><p>29 €</p></section>
<section><h2>Curso Orden en 5 días</h2><p>59,00 €</p></section>
<footer><p>Escríbenos: <a href="mailto:hola@example.com">hola@example.com</a></p></footer>`;
const factFailures = async (root) => failuresOf(root, 'brief-facts');

test('brief-facts: a site without brief.json does not run the rule; with one that matches the page it passes', async () => {
  const plain = await runChecks({ slug: 'good', root: freshRoot() });
  assert.ok(!plain.checks.some((c) => c.name === 'brief-facts'));
  const root = briefRoot();
  withDist(root, goodPage);
  const result = await runChecks({ slug: 'good', root });
  assert.deepEqual(
    result.failures.filter((f) => f.rule === 'brief-facts'),
    [],
  );
  assert.ok(result.checks.some((c) => c.name === 'brief-facts' && c.ok));
});

test('brief-facts: a missing price or name, URL or email fails naming the field', async () => {
  const root = briefRoot();
  withDist(root, goodPage.replace('59,00 €', 'consultar'));
  const failures = await factFailures(root);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].item, 'offer[1].price');
  assert.match(
    failures[0].message,
    /offer\[1\]\.price "59".*not on the built page/,
  );

  const dropped = briefRoot();
  withDist(
    dropped,
    goodPage
      .replace('Taller Plantilla', 'Otro nombre')
      .replace(
        'href="https://example.com/tienda/pack-notion-freelance"',
        'href="#"',
      )
      .replace(/hola@example\.com/g, 'info@example.com')
      .replace('Curso Orden en 5 días', 'Curso'),
  );
  assert.deepEqual(
    (await factFailures(dropped)).map((f) => f.item).sort(),
    [
      'business.name',
      'contact.email',
      'goal.primary.url',
      'offer[1].name',
    ].sort(),
  );
});

test('brief-facts: a phone must be on the page unless it is assumed or empty; spaces and tel: links are accepted', async () => {
  const withPhone = (extra = {}) =>
    briefRoot((brief) => {
      brief.contact.phone = '+34 600 123 456';
      return Object.assign(brief, extra);
    });
  const missing = withPhone();
  withDist(missing, goodPage);
  const failures = await factFailures(missing);
  assert.deepEqual(
    failures.map((f) => f.item),
    ['contact.phone'],
  );

  const assumed = withPhone({
    assumed: [{ field: 'contact.phone', reason: 'placeholder number' }],
  });
  withDist(assumed, goodPage);
  assert.deepEqual(await factFailures(assumed), []);

  const spaced = withPhone();
  withDist(spaced, `${goodPage}<p>Tel. +34600 12 34 56</p>`);
  assert.deepEqual(await factFailures(spaced), []);
  const link = withPhone();
  withDist(link, `${goodPage}<a href="tel:+34600123456">Llámanos</a>`);
  assert.deepEqual(await factFailures(link), []);
  // An empty phone in the brief is not required.
  const empty = briefRoot();
  withDist(empty, goodPage);
  assert.deepEqual(await factFailures(empty), []);
});

test('brief-facts: prices ignore spaces, the currency and a trailing ,00 but not other digits', async () => {
  const prices = (...texts) => {
    const root = briefRoot();
    withDist(
      root,
      goodPage.replace('29 €', texts[0]).replace('59,00 €', texts[1]),
    );
    return factFailures(root);
  };
  assert.deepEqual(await prices('€ 29.00', '59 EUR'), []);
  assert.deepEqual(await prices('29,00€', '€59'), []);
  assert.equal((await prices('129 €', '59 €'))[0].item, 'offer[0].price');
  assert.equal((await prices('29,5 €', '59 €'))[0].item, 'offer[0].price');
  assert.equal((await prices('29 €', '1.59 €'))[0].item, 'offer[1].price');
  assert.equal((await prices('29 €', '59,50 €'))[0].item, 'offer[1].price');
});

test('brief-facts: an element that holds a customer fact and says "ejemplo" fails; placeholders elsewhere do not', async () => {
  const root = briefRoot();
  withDist(
    root,
    goodPage.replace(
      '<p>Escríbenos:',
      '<p>Texto de ejemplo para los otros datos</p><p>Contacto de ejemplo:',
    ),
  );
  const failures = await factFailures(root);
  assert.deepEqual(
    failures.map((f) => f.item),
    ['contact.email'],
  );
  assert.match(
    failures[0].message,
    /customer fact.*says "ejemplo".*never labeled as sample data/,
  );

  const priced = briefRoot();
  withDist(
    priced,
    goodPage.replace('<p>29 €</p>', '<p>Precio de ejemplo: 29 €</p>'),
  );
  assert.deepEqual(
    (await factFailures(priced)).map((f) => f.item),
    ['offer[0].price'],
  );
  // The domain example.com inside a real email is not a sample label.
  const clean = briefRoot();
  withDist(clean, goodPage);
  assert.deepEqual(await factFailures(clean), []);
  // A product name that contains the word is the customer's own.
  const named = briefRoot((brief) => {
    brief.offer[0].name = 'Plantilla de ejemplo para clientes';
  });
  withDist(
    named,
    goodPage.replace(
      'Pack Notion Freelance',
      'Plantilla de ejemplo para clientes',
    ),
  );
  assert.deepEqual(await factFailures(named), []);
});

test('brief-facts: no dist asks for a build; an invalid brief fails with the validator errors', async () => {
  const noDist = await factFailures(briefRoot());
  assert.equal(noDist.length, 1);
  assert.match(
    noDist[0].message,
    /dist\/index\.html does not exist; build first/,
  );

  const invalid = briefRoot((brief) => {
    brief.contact.email = 'nope';
  });
  withDist(invalid, goodPage);
  const failures = await factFailures(invalid);
  assert.equal(failures.length, 1);
  assert.match(
    failures[0].message,
    /brief\.json is invalid.*contact\.email: expected an email/s,
  );

  const broken = briefRoot();
  writeFileSync(site(broken, 'brief.json'), '{ nope');
  assert.match((await factFailures(broken))[0].message, /not valid JSON/);
});

test('images-credited: a customer asset needs an owner and a permission', async () => {
  const root = freshRoot();
  mkdirSync(site(root, 'src/assets/images'), { recursive: true });
  writeFileSync(site(root, 'src/assets/images/logo.svg'), '<svg/>');
  edit(site(root, 'assets.json'), (text) => {
    const manifest = JSON.parse(text);
    manifest.images.push({
      file: 'logo.svg',
      source: 'customer',
      credit: false,
    });
    return JSON.stringify(manifest);
  });
  const failures = await failuresOf(root, 'uncredited-image');
  assert.equal(failures.length, 1);
  assert.match(failures[0].message, /customer asset.*without "owner"/);
  edit(site(root, 'assets.json'), (text) => {
    const manifest = JSON.parse(text);
    manifest.images.at(-1).owner = 'Taller Plantilla';
    manifest.images.at(-1).permission = 'Free use on the business website';
    return JSON.stringify(manifest);
  });
  assert.deepEqual(await failuresOf(root, 'uncredited-image'), []);
  // Credits for the customer file are generated by credits.mjs, so the credits rule asks for a sync, not a failure of the file.
  const credits = await failuresOf(root, 'credits-stale');
  assert.equal(credits.length, 1);
});

// --- ai-provenance (add-ai-images) --------------------------------------------------------------------

const AI_ENTRY = {
  file: 'glass.webp',
  title: 'Abstract glass shapes',
  source: 'ai',
  generator: 'openai',
  model: 'gpt-image-1.5',
  prompt: 'An abstract gradient of light and glass shapes',
  revisedPrompt: '',
  size: '1536x1024',
  quality: 'high',
  createdAt: '2026-10-25T10:00:00.000Z',
  terms: 'https://openai.com/policies/terms-of-use/',
  credit: false,
  note: '',
};
const DISCLOSURE =
  '<footer><p data-ai-disclosure>Some images on this page were generated with AI.</p></footer>';
/** The fixture site with one AI image (file included), an up-to-date credits and a built page. */
async function aiRoot({
  entry = {},
  html = DISCLOSURE,
  file = true,
  brief,
} = {}) {
  const root = briefRoot();
  rmSync(site(root, 'brief.json'));
  if (brief) writeFileSync(site(root, 'brief.json'), JSON.stringify(brief));
  const manifestPath = site(root, 'assets.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.images.push({ ...AI_ENTRY, ...entry });
  writeFileSync(manifestPath, JSON.stringify(manifest));
  if (file)
    cpSync(
      site(root, 'src/assets/images/hero.jpg'),
      site(root, 'src/assets/images/glass.webp'),
    );
  const { syncCredits } = await import('../scripts/credits.mjs');
  try {
    syncCredits({ slug: 'good', root });
  } catch {
    // an entry with a missing field makes the credits throw; the rule still runs
  }
  withDist(root, html);
  return root;
}
const aiFailures = async (root) => {
  const result = await runChecks({ slug: 'good', root });
  return {
    result,
    failures: result.failures.filter((f) => f.rule === 'ai-provenance'),
  };
};

test('ai-provenance: a site without AI images does not run the rule; a clean AI site passes it and the whole check', async () => {
  const plain = await runChecks({ slug: 'good', root: freshRoot() });
  assert.ok(!plain.checks.some((c) => c.name === 'ai-provenance'));

  const root = await aiRoot();
  const { result, failures } = await aiFailures(root);
  assert.deepEqual(failures, []);
  assert.ok(result.checks.some((c) => c.name === 'ai-provenance' && c.ok));
  assert.deepEqual(
    result.failures.filter((f) => f.rule !== 'brief-facts'),
    [],
    'credits, photo uses and the rest also pass',
  );
  // With a brief that allows AI images it passes as well.
  const allowed = briefRoot();
  const brief = JSON.parse(readFileSync(site(allowed, 'brief.json'), 'utf8'));
  assert.equal(brief.brand.aiImages, 'allowed');
  const withBrief = await aiRoot({ brief });
  assert.deepEqual((await aiFailures(withBrief)).failures, []);
});

test('ai-provenance: a missing model, prompt, date or terms fails naming the file and the field', async () => {
  for (const field of ['model', 'generator', 'prompt', 'createdAt', 'terms']) {
    const root = await aiRoot({ entry: { [field]: '' } });
    const { failures } = await aiFailures(root);
    assert.ok(
      failures.some(
        (f) => f.item === 'glass.webp' && f.message.includes(`no "${field}"`),
      ),
      field,
    );
  }
  const noModel = await aiRoot({ entry: { model: undefined } });
  const { failures } = await aiFailures(noModel);
  assert.match(failures[0].message, /glass\.webp.*no "model"/);
});

test('ai-provenance: an entry whose file is missing fails', async () => {
  const root = await aiRoot({ file: false });
  const { failures } = await aiFailures(root);
  assert.equal(failures.length, 1);
  assert.match(
    failures[0].message,
    /glass\.webp is listed in assets\.json but no such image/,
  );
});

test('ai-provenance: a brief that does not allow AI images fails with an AI entry (not-allowed, empty and assumed)', async () => {
  const base = JSON.parse(
    readFileSync(join(BRIEF_FIXTURE, 'brief.json'), 'utf8'),
  );
  for (const [aiImages, assumed] of [
    ['not-allowed', false],
    ['', false],
    ['allowed', true],
  ]) {
    const brief = structuredClone(base);
    brief.brand.aiImages = aiImages;
    if (assumed) brief.assumed.push({ field: 'brand', reason: 'x' });
    const root = await aiRoot({ brief });
    const { failures } = await aiFailures(root);
    assert.equal(failures.length, 1, `${aiImages} ${assumed}`);
    assert.equal(failures[0].item, 'brief.json');
    assert.match(failures[0].message, /brand\.aiImages is .*not "allowed"/);
  }
});

test('ai-provenance: a missing, empty or hidden data-ai-disclosure fails; a page that is not built fails', async () => {
  const none = await aiRoot({ html: '<footer><p>Hello</p></footer>' });
  assert.match(
    (await aiFailures(none)).failures[0].message,
    /no element with data-ai-disclosure/,
  );
  const empty = await aiRoot({
    html: '<footer><p data-ai-disclosure> </p></footer>',
  });
  assert.match((await aiFailures(empty)).failures[0].message, /is empty/);
  for (const html of [
    '<p data-ai-disclosure hidden>Some images were generated with AI.</p>',
    '<p data-ai-disclosure style="display:none">Some images were generated with AI.</p>',
    '<p aria-hidden="true" data-ai-disclosure>Some images were generated with AI.</p>',
  ]) {
    const hidden = await aiRoot({ html });
    assert.match(
      (await aiFailures(hidden)).failures[0].message,
      /is hidden/,
      html,
    );
  }
  const unbuilt = await aiRoot();
  rmSync(site(unbuilt, 'dist'), { recursive: true });
  assert.match(
    (await aiFailures(unbuilt)).failures[0].message,
    /dist\/index\.html does not exist/,
  );
  // The second element wins when the first is hidden; markup and entities are read as text.
  assert.equal(
    aiDisclosureIn(
      '<p data-ai-disclosure hidden>x</p><p data-ai-disclosure>Hecho <b>con</b> IA</p>',
    ).text,
    'Hecho con IA',
  );
});

test('ai-provenance: a prompt that breaks the policy fails, also from a hand-edited entry', async () => {
  const root = await aiRoot({ entry: { prompt: 'Our team at the office' } });
  const { failures } = await aiFailures(root);
  assert.equal(failures.length, 1);
  assert.match(
    failures[0].message,
    /breaks the prompt policy: \[people\] "team"/,
  );
  // The brand rule uses the brief.
  const brief = JSON.parse(
    readFileSync(join(BRIEF_FIXTURE, 'brief.json'), 'utf8'),
  );
  const named = await aiRoot({
    brief,
    entry: { prompt: 'Art for Taller Plantilla' },
  });
  assert.match((await aiFailures(named)).failures[0].message, /\[brand\]/);
});

test('ai-provenance: two AI images with the same title are not one photo for the reuse rule', async () => {
  const root = await aiRoot();
  const manifestPath = site(root, 'assets.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.images.push({ ...AI_ENTRY, file: 'glass-2.webp' });
  writeFileSync(manifestPath, JSON.stringify(manifest));
  cpSync(
    site(root, 'src/assets/images/hero.jpg'),
    site(root, 'src/assets/images/glass-2.webp'),
  );
  writeFileSync(
    site(root, 'src/pages/ai.astro'),
    `---\nimport a from '../assets/images/glass.webp';\nimport b from '../assets/images/glass-2.webp';\n---\n<img src={a.src} /><img src={a.src} /><img src={b.src} /><img src={b.src} />`,
  );
  const { result } = await aiFailures(root);
  assert.deepEqual(
    result.failures.filter((f) => f.rule === 'photo-overuse'),
    [],
  );
});
