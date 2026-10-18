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
    },
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

test('the real panaderia site passes the final check', async () => {
  const result = await runChecks({ slug: 'panaderia', root: ROOT });
  assert.deepEqual(result.failures, []);
});
