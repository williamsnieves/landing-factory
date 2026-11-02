// Tests for the layout signature (scripts/layout-signature.mjs, scripts/lib/layout-core.mjs) and the
// layout-diversity rule of check-landing. The browser tests measure small generated pages
// (tests/fixtures/layout/page.mjs) that differ in one feature each; they are skipped when no Chromium is
// available (set QA_CHROME_PATH).
import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { runChecks } from '../scripts/check-landing.mjs';
import {
  dHash,
  main,
  measureDist,
  signaturePath,
} from '../scripts/layout-signature.mjs';
import {
  FEATURES,
  compareSignatures,
  featureDistance,
  hamming,
  hashMatchShare,
  rangeProblem,
  targetWarnings,
} from '../scripts/lib/layout-core.mjs';
import { writeLayoutPage } from './fixtures/layout/page.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'layout-signature-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const chrome =
  process.env.QA_CHROME_PATH ||
  process.env.CHROME_PATH ||
  chromium.executablePath();
const skip = existsSync(chrome)
  ? false
  : 'no Chromium (set QA_CHROME_PATH or run npx playwright install chromium)';
const quiet = { log() {}, error() {} };

const VARIANTS = {
  base: {},
  recolor: { accent: 'hsl(200, 60%, 35%)', paper: '#eef4f8', hue: 200 },
  round0: { radius: 0 },
  rect: { buttonShape: 'rect' },
  noeyebrow: { eyebrow: false },
  cols3: { cols: 3 },
  rotate: { rotate: 5 },
  fcols: { footer: 'columns' },
  upper: { upper: true },
  brutalist: {
    radius: 0,
    buttonShape: 'rect',
    eyebrow: false,
    footer: 'columns',
    cols: 1,
    upper: true,
    mono: true,
    paper: '#ffffff',
  },
};
const cache = new Map();
async function signatureOf(name) {
  if (!cache.has(name)) {
    const dir = writeLayoutPage(join(tmp, 'pages'), name, VARIANTS[name]);
    cache.set(name, await measureDist({ distDir: dir }));
  }
  return cache.get(name);
}

// --------------------------------------------------------------------------------------------------
// Pure model

test('feature distance: identical is 0, a categorical change counts its weight, a numeric one is scaled', () => {
  const a = { buttonShape: 'pill', imageRadius: 0, eyebrowShare: 1 };
  assert.equal(featureDistance(a, a).distance, 0);
  const total = FEATURES.reduce((s, f) => s + f.weight, 0);
  const shape = featureDistance(a, { ...a, buttonShape: 'rect' });
  assert.ok(Math.abs(shape.distance - 2 / total) < 1e-9);
  const radius = featureDistance(a, { ...a, imageRadius: 20 });
  assert.ok(Math.abs(radius.distance - (0.5 * 2) / total) < 1e-9);
  // beyond the scale a numeric difference is capped at 1
  assert.equal(
    featureDistance({ imageRadius: 0 }, { imageRadius: 400 }).distance,
    featureDistance({ imageRadius: 0 }, { imageRadius: 40 }).distance,
  );
});

test('hamming distance and the share of matching slices', () => {
  assert.equal(hamming('0000000000000000', 'ffffffffffffffff'), 64);
  assert.equal(hamming('00000000000000ff', '0000000000000000'), 8);
  const a = ['0000000000000000', 'ffffffffffffffff'];
  assert.equal(hashMatchShare(a, a, 0), 1);
  assert.equal(hashMatchShare(a, ['0000000000000001'], 2), (1 + 1) / 3);
  assert.equal(hashMatchShare(a, [], 10), 0);
  assert.equal(
    hashMatchShare(['00000000000000ff'], ['0000000000000000'], 7),
    0,
  );
});

test('dHash is stable and flips with the direction of the gradient', async () => {
  const ramp = (reverse) =>
    sharp(
      Buffer.from(
        Array.from({ length: 90 * 80 }, (_, i) => {
          const x = i % 90;
          return reverse ? 255 - x * 2.8 : x * 2.8;
        }),
      ),
      { raw: { width: 90, height: 80, channels: 1 } },
    )
      .png()
      .toBuffer();
  const up = await dHash(await ramp(false));
  const down = await dHash(await ramp(true));
  assert.match(up, /^[0-9a-f]{16}$/);
  assert.equal(up, await dHash(await ramp(false)));
  assert.equal(hamming(up, down), 64);
});

test('archetype range problems and target warnings', () => {
  assert.equal(rangeProblem('imageRadius', ['0', '4']), null);
  assert.match(rangeProblem('imageRadius', ['4', '0']), /min is greater/);
  assert.match(rangeProblem('eyebrowShare', ['0', '2']), /between 0 and 1/);
  assert.match(rangeProblem('buttonShape', ['oval']), /unknown value/);
  assert.equal(rangeProblem('buttonShape', ['pill', 'rect']), null);
  const warnings = targetWarnings(
    { imageRadius: 24, buttonShape: 'pill', eyebrowShare: 0 },
    {
      imageRadius: ['0', '4'],
      buttonShape: ['rect', 'text'],
      eyebrowShare: ['0', '0.5'],
    },
  );
  assert.deepEqual(
    warnings.map((w) => w.feature),
    ['imageRadius', 'buttonShape'],
  );
});

// --------------------------------------------------------------------------------------------------
// Measuring (browser)

test('the base page reads as the shared grammar', { skip }, async () => {
  const { features, hashes, mobile, page } = await signatureOf('base');
  assert.equal(page, '/');
  assert.equal(features.sectionCount, 4);
  assert.equal(features.cols2Share, 1);
  assert.ok(features.splitRatio > 0.9);
  assert.equal(features.imageRadius, 24);
  assert.equal(features.buttonShape, 'pill');
  assert.ok(features.buttonRadius >= 20);
  assert.equal(features.eyebrowShare, 1);
  assert.equal(features.footerType, 'wordmark');
  assert.equal(features.headingAlign, 'left');
  assert.equal(features.rotatedShare, 0);
  assert.ok(hashes.length >= 2);
  for (const h of hashes) assert.match(h, /^[0-9a-f]{16}$/);
  assert.ok(mobile.screens > 3);
});

for (const [name, check] of Object.entries({
  round0: (f) => assert.equal(f.imageRadius, 0),
  rect: (f) => {
    assert.equal(f.buttonShape, 'rect');
    assert.equal(f.buttonRadius, 0);
  },
  noeyebrow: (f) => assert.equal(f.eyebrowShare, 0),
  cols3: (f) => {
    assert.equal(f.cols3Share, 1);
    assert.equal(f.cols2Share, 0);
  },
  rotate: (f) => assert.equal(f.rotatedShare, 1),
  fcols: (f) => assert.equal(f.footerType, 'columns'),
  upper: (f) => assert.equal(f.headingCase, 1),
}))
  test(
    `a page differing in one feature (${name}) changes that feature`,
    { skip },
    async () => {
      const base = await signatureOf('base');
      const variant = await signatureOf(name);
      check(variant.features);
      const { distance, parts } = featureDistance(
        base.features,
        variant.features,
      );
      assert.ok(distance > 0, name);
      // a restyle of one feature stays under the layout threshold; a new column count is a new layout
      if (name !== 'cols3') assert.ok(distance < 0.2, `${name}: ${distance}`);
      const changed = parts.filter((p) => p.d > 0).map((p) => p.name);
      if (name !== 'cols3') assert.ok(changed.length <= 4, changed.join());
    },
  );

test(
  'same layout in new colors is a near match; another composition is far away',
  { skip },
  async () => {
    const base = await signatureOf('base');
    const recolor = await signatureOf('recolor');
    const brutalist = await signatureOf('brutalist');
    const same = compareSignatures(base, recolor, { hashHamming: 10 });
    assert.ok(same.distance < 0.01);
    assert.equal(same.hashMatch, 1);
    const far = compareSignatures(base, brutalist, { hashHamming: 10 });
    assert.ok(far.distance > 0.4, String(far.distance));
    assert.ok(far.hashMatch < 0.2);
  },
);

test(
  '--write stores a small signature, leaves no server and reports bad usage',
  { skip },
  async () => {
    const root = mkdtempSync(join(tmp, 'root-'));
    const dist = join(root, 'sites/demo/dist');
    mkdirSync(dist, { recursive: true });
    cpSync(join(tmp, 'pages/base'), dist, { recursive: true });
    const realListen = Server.prototype.listen;
    const servers = [];
    Server.prototype.listen = function (...args) {
      servers.push(this);
      return realListen.apply(this, args);
    };
    try {
      assert.equal(await main(['--site', 'demo', '--write'], quiet, root), 0);
    } finally {
      Server.prototype.listen = realListen;
    }
    assert.ok(servers.length >= 1);
    for (const s of servers) assert.equal(s.listening, false);
    const file = signaturePath(root, 'demo');
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(doc.site, 'demo');
    assert.equal(doc.version, 1);
    assert.ok(readFileSync(file).length < 6000);
    assert.equal(await main([], quiet, root), 2);
    assert.equal(await main(['--site', 'Bad Slug'], quiet, root), 2);
    assert.equal(await main(['--write', '--dist', dist], quiet, root), 2);
    assert.equal(await main(['--site', 'nope'], quiet, root), 1);
  },
);

// --------------------------------------------------------------------------------------------------
// check-landing: layout-diversity and the archetype-target warning

const FIXTURE = join(ROOT, 'tests/fixtures/landing');
function landingRoot(mine, theirs) {
  const root = mkdtempSync(join(tmp, 'landing-'));
  cpSync(FIXTURE, root, { recursive: true });
  cpSync(join(ROOT, 'design-archetypes'), join(root, 'design-archetypes'), {
    recursive: true,
  });
  const put = (slug, sig) =>
    sig &&
    writeFileSync(
      signaturePath(root, slug),
      `${JSON.stringify({ site: slug, ...sig })}\n`,
    );
  put('good', mine);
  put('other', theirs);
  return root;
}
const layoutFailures = async (root) =>
  (await runChecks({ slug: 'good', root })).failures.filter(
    (f) => f.rule === 'layout-diversity',
  );

test(
  'a site with the same layout in new colors fails naming the other site and the shared features',
  { skip },
  async () => {
    const root = landingRoot(
      await signatureOf('recolor'),
      await signatureOf('base'),
    );
    const [failure] = await layoutFailures(root);
    assert.equal(failure.item, 'other');
    assert.match(
      failure.message,
      /same layout as sites\/other: layout distance 0\.00 is under 0\.2/,
    );
    assert.match(failure.message, /100% of the viewport screenshots match/);
    assert.match(
      failure.message,
      /shared features: .*(imageRadius 24|buttonShape pill)/,
    );
    assert.equal((await runChecks({ slug: 'good', root })).verdict, 'failed');
  },
);

test(
  'a genuinely different layout passes, and thresholds come from qa.config.json',
  { skip },
  async () => {
    const root = landingRoot(
      await signatureOf('brutalist'),
      await signatureOf('base'),
    );
    assert.deepEqual(await layoutFailures(root), []);
    writeFileSync(
      join(root, 'qa.config.json'),
      JSON.stringify({ diversity: { minLayoutDistance: 0.9 } }),
    );
    const [failure] = await layoutFailures(root);
    assert.match(failure.message, /is under 0\.9/);
    writeFileSync(
      join(root, 'qa.config.json'),
      JSON.stringify({
        diversity: { minLayoutDistance: 0.2, maxHashMatch: 0 },
      }),
    );
    // brutalist vs base: no matching slices, still passes at maxHashMatch 0
    assert.deepEqual(await layoutFailures(root), []);
  },
);

test('a missing signature fails only when another site has one; no other signature means nothing to compare', async () => {
  const sig = {
    features: { buttonShape: 'pill' },
    hashes: ['0000000000000000'],
  };
  const missing = await layoutFailures(landingRoot(null, sig));
  assert.equal(missing.length, 1);
  assert.match(missing[0].message, /layout-signature\.mjs --site good --write/);
  assert.deepEqual(await layoutFailures(landingRoot(null, null)), []);
  assert.deepEqual(await layoutFailures(landingRoot(sig, null)), []);
  // a signature that cannot be parsed counts as missing
  const root = landingRoot(sig, sig);
  writeFileSync(signaturePath(root, 'good'), '{nope');
  assert.equal((await layoutFailures(root)).length, 1);
});

test(
  'the archetype-target warning lists features outside the primary archetype ranges and never fails',
  { skip },
  async () => {
    const root = landingRoot(await signatureOf('base'), null);
    const master = join(root, 'design-system/good/MASTER.md');
    writeFileSync(
      master,
      readFileSync(master, 'utf8').replace(
        'hero: full-bleed-photo',
        'hero: full-bleed-photo\narchetype: brutalist-raw\ntraits: visible-grid',
      ),
    );
    const result = await runChecks({ slug: 'good', root });
    assert.equal(result.verdict, 'passed', JSON.stringify(result.failures));
    const [warning] = result.warnings;
    assert.equal(warning.rule, 'archetype-target');
    assert.match(warning.message, /outside the brutalist-raw ranges/);
    assert.match(warning.message, /imageRadius 24 \(expected 0 to 2\)/);
    assert.match(warning.message, /buttonShape pill \(expected rect \| text\)/);
    // `custom` and an unknown archetype name
    writeFileSync(
      master,
      readFileSync(master, 'utf8').replace(
        'archetype: brutalist-raw',
        'archetype: custom',
      ),
    );
    // (the fixture has no build, so copy-claims only warns that it did not run)
    assert.deepEqual(
      (await runChecks({ slug: 'good', root })).warnings.filter(
        (w) => w.rule === 'archetype-target',
      ),
      [],
    );
    writeFileSync(
      master,
      readFileSync(master, 'utf8').replace(
        'archetype: custom',
        'archetype: nonexistent',
      ),
    );
    const bad = await runChecks({ slug: 'good', root });
    assert.ok(
      bad.failures.some(
        (f) =>
          f.rule === 'landing-meta' &&
          /not in design-archetypes/.test(f.message),
      ),
    );
  },
);
