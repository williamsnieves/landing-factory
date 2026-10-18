import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  AccessError,
  VIEWPORTS,
  analyzeMotion,
  aggregateStyles,
  classifyFont,
  cleanup,
  defaultOutRoot,
  describeColor,
  detectLibraries,
  parseTransform,
  recon,
  slugFromUrl,
} from '../.claude/skills/analyze-reference/scripts/recon.mjs';
import { build, startStatic } from '../scripts/qa/server.mjs';
import { startFixtureServer } from './fixtures/analyze/server.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCRIPT = join(ROOT, '.claude/skills/analyze-reference/scripts/recon.mjs');
const out = mkdtempSync(join(tmpdir(), 'recon-test-'));
after(() => rmSync(out, { recursive: true, force: true }));

// ---------------------------------------------------------------- pure helpers

describe('pure helpers', () => {
  test('slugFromUrl keeps the host only', () => {
    assert.equal(
      slugFromUrl('https://www.Example.co.uk/a/b?x=1'),
      'example-co-uk',
    );
    assert.equal(slugFromUrl('http://127.0.0.1:8080/'), '127-0-0-1');
  });

  test('classifyFont uses generic keywords and never returns names', () => {
    assert.equal(
      classifyFont('"Zephyr Display", Georgia, serif').class,
      'serif',
    );
    assert.equal(classifyFont('Inter, Helvetica, sans-serif').class, 'sans');
    assert.equal(classifyFont('"JetBrains Mono", monospace').class, 'mono');
    assert.equal(classifyFont('Pacifico, cursive').class, 'display');
    assert.equal(
      classifyFont('system-ui, -apple-system, sans-serif').systemStack,
      true,
    );
    assert.equal(classifyFont('Mystery').class, 'unknown');
    assert.ok(
      !JSON.stringify(classifyFont('"Zephyr Display", serif')).includes(
        'Zephyr',
      ),
    );
  });

  test('describeColor returns roles by lightness, chroma and temperature', () => {
    assert.equal(describeColor(0, 0, 0).label, 'near-black neutral');
    assert.equal(describeColor(250, 250, 250).label, 'near-white neutral');
    assert.equal(describeColor(11, 11, 15).label, 'near-black neutral');
    assert.equal(describeColor(30, 30, 34).label, 'very dark neutral');
    const accent = describeColor(255, 90, 31);
    assert.equal(accent.temperature, 'warm');
    assert.match(accent.label, /warm (saturated|vivid)$/);
    assert.equal(describeColor(30, 90, 220).temperature, 'cool');
    for (const c of [describeColor(255, 90, 31), describeColor(1, 2, 3)])
      assert.ok(!/#|rgb|hsl/i.test(JSON.stringify(c)));
  });

  test('parseTransform reads matrix() and matrix3d()', () => {
    assert.equal(parseTransform('none').identity, true);
    const t = parseTransform('matrix(1, 0, 0, 1, 0, 40)');
    assert.equal(t.ty, 40);
    assert.equal(t.identity, false);
    assert.equal(
      parseTransform('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,12,0,1)').ty,
      12,
    );
  });

  test('detectLibraries merges evidence and grades confidence', () => {
    const libs = detectLibraries({
      globals: { gsap: 'v3.12', Lenis: '' },
      classes: { lenis: 1, 'pin-spacer': 2, swiper: 0 },
      scriptFiles: ['ScrollTrigger.min.js', 'app.js'],
      domains: ['cdn.example'],
      canvases: { count: 1, contexts: ['webgl2'] },
      viewTransition: { calls: 0, cssRule: true, named: 0 },
    });
    const by = Object.fromEntries(libs.map((l) => [l.name, l]));
    assert.equal(by.gsap.confidence, 'high');
    assert.equal(by.Lenis.confidence, 'high');
    assert.equal(by.ScrollTrigger.confidence, 'high'); // dom + script
    assert.equal(by.WebGL.confidence, 'high');
    assert.equal(by['View Transitions'].confidence, 'medium');
    assert.equal(by.Swiper, undefined);
    const weak = detectLibraries({
      globals: {},
      classes: {},
      scriptFiles: [],
      domains: ['assets.website-files.com'],
    });
    assert.equal(weak[0].name, 'Webflow');
    assert.equal(weak[0].confidence, 'low');
  });

  test('aggregateStyles reports abstract numbers only', () => {
    const base = {
      tag: 'p',
      heading: false,
      chars: 100,
      font: 'Inter, sans-serif',
      size: 16,
      weight: '400',
      lh: 25.6,
      ls: 0,
      upper: false,
      color: 'rgb(244, 239, 230)',
      bg: 'rgba(0, 0, 0, 0)',
      bgGradient: false,
      border: null,
      accentText: false,
      display: 'block',
      cols: 0,
      gap: 0,
      pad: [0, 0, 0, 0],
      mar: [0, 0, 16, 0],
      width: 600,
      area: 1000,
      sectionIndex: 0,
      depth: 1,
    };
    const records = [
      base,
      {
        ...base,
        tag: 'h1',
        heading: true,
        size: 96,
        lh: 96,
        font: 'Georgia, serif',
        ls: -3,
        chars: 30,
      },
      {
        ...base,
        tag: 'div',
        chars: 0,
        bg: 'rgb(255, 90, 31)',
        display: 'grid',
        cols: 3,
        gap: 24,
        pad: [32, 32, 32, 32],
        area: 50000,
        width: 1100,
      },
    ];
    const agg = aggregateStyles(records, {
      viewportWidth: 1440,
      pageBackground: 'rgb(11, 11, 15)',
      bodySize: 16,
    });
    assert.equal(agg.typography.headingClass, 'serif');
    assert.equal(agg.typography.bodyClass, 'sans');
    assert.equal(agg.colors.theme, 'dark');
    assert.equal(agg.layout.display.grid, 1);
    assert.equal(agg.spacing.baseUnitPx, 8);
    assert.ok(agg.colors.accents[0].value.includes('warm'));
    assert.ok(!/#[0-9a-f]{3}|rgb\(|Inter|Georgia/i.test(JSON.stringify(agg)));
  });

  test('analyzeMotion finds pin, parallax and reveal in synthetic frames', () => {
    const vh = 900;
    const elements = [
      { id: 0, section: 1, role: null, pinSpacer: true },
      { id: 1, section: 2, role: null, pinSpacer: false },
      { id: 2, section: 3, role: null, pinSpacer: false },
    ];
    const frames = [];
    for (const y of [0, 450, 900, 1350, 1800, 2250]) {
      const held = y >= 1000 ? 0 : 1000 - y;
      const layerTop = 2000 - y * 0.7;
      const cardTop = 1200 - y;
      const cardVisible = cardTop < vh;
      frames.push({
        scrollY: y,
        settled: false,
        items: [
          [0, held, 900, 1, 'none', 'static'],
          [1, layerTop, 700, 1, 'none', 'static'],
          [
            2,
            cardTop,
            200,
            cardVisible ? 0.3 : 0,
            'matrix(1, 0, 0, 1, 0, 40)',
            'static',
          ],
        ],
      });
      frames.push({
        scrollY: y,
        settled: true,
        items: [
          [0, held, 900, 1, 'none', 'static'],
          [1, layerTop, 700, 1, 'none', 'static'],
          [
            2,
            cardTop,
            200,
            cardVisible ? 1 : 0,
            cardVisible ? 'none' : 'matrix(1, 0, 0, 1, 0, 40)',
            'static',
          ],
        ],
      });
    }
    const obs = analyzeMotion(frames, { viewportHeight: vh, elements });
    const kinds = obs.map((o) => `${o.kind}:${o.trigger}`);
    assert.ok(kinds.includes('pin:scroll'), kinds.join());
    assert.ok(kinds.includes('parallax:scroll'), kinds.join());
    assert.ok(kinds.includes('reveal:scroll'), kinds.join());
    const parallax = obs.find((o) => o.kind === 'parallax');
    assert.ok(
      parallax.speedRatioRange[0] > 0.6 && parallax.speedRatioRange[0] < 0.8,
    );
  });
});

// ---------------------------------------------------------------- cleanup

describe('cleanup', () => {
  test('.cache/ is git-ignored and the default output lives under it', () => {
    assert.match(
      readFileSync(join(ROOT, '.gitignore'), 'utf8'),
      /^\.cache\/$/m,
    );
    const r = spawnSync(
      'git',
      ['check-ignore', '-q', '.cache/analyze/x/screens/375-1.png'],
      { cwd: ROOT },
    );
    assert.equal(r.status, 0, 'git must ignore .cache/analyze/**');
    assert.equal(defaultOutRoot(), join(ROOT, '.cache', 'analyze'));
  });

  test('cleanup removes the folder, is idempotent and refuses unsafe slugs', () => {
    const root = mkdtempSync(join(out, 'clean-'));
    const run = spawnSync(process.execPath, [SCRIPT, '--help']);
    assert.equal(run.status, 0);
    assert.throws(() => cleanup('../etc', root), /Invalid slug/);
    assert.throws(() => cleanup('UPPER', root), /Invalid slug/);
    assert.equal(cleanup('nothing-here', root), false);
  });
});

// ---------------------------------------------------------------- browser runs

describe('recon in Chromium', { concurrency: false }, () => {
  let fx;
  let demo;
  before(async () => {
    fx = await startFixtureServer({
      '/forbidden': [403, { 'content-type': 'text/html' }, 'no'],
      '/gone': [404, { 'content-type': 'text/html' }, 'no'],
    });
    if (!existsSync(join(ROOT, 'dist/index.html'))) await build(ROOT);
    demo = await startStatic(join(ROOT, 'dist'));
  });
  after(async () => {
    await fx?.close();
    await demo?.close();
  });

  test(
    'fixture page: sections, libraries, canvas/WebGL, motion and screenshots; no site content',
    { timeout: 180000 },
    async () => {
      const outRoot = mkdtempSync(join(out, 'fx-'));
      const { output, dir } = await recon(`${fx.baseUrl}/index.html`, {
        slug: 'fixture',
        outRoot,
      });
      const json = readFileSync(join(dir, 'recon.json'), 'utf8');

      assert.equal(output.title, 'Fixture Reference Page');
      assert.equal(output.access.status, 'ok');
      assert.equal(output.scroller.kind, 'document');
      assert.equal(
        output.viewports[1440].docHeightPx,
        output.scroller.scrollHeightPx,
      );
      assert.ok(
        output.sections.length >= 4,
        `sections: ${output.sections.length}`,
      );
      const hero = output.sections.find((x) => x.firstHeading?.level === 1);
      assert.equal(hero.firstHeading.words, 5);
      assert.equal(output.sections[0].role, 'banner');
      assert.equal(output.sections.at(-1).role, 'contentinfo');
      assert.deepEqual(
        output.sections.map((x) => x.top),
        [...output.sections.map((x) => x.top)].sort((a, b) => a - b),
        'sections are in page order',
      );
      assert.ok(
        output.sections.every(
          (s) => typeof s.heightVh === 'number' && typeof s.words === 'number',
        ),
      );
      assert.ok(output.landmarks.main === 1);

      const libs = Object.fromEntries(output.libraries.map((l) => [l.name, l]));
      for (const name of ['gsap', 'ScrollTrigger', 'Lenis', 'WebGL']) {
        assert.ok(libs[name], `${name} detected: ${Object.keys(libs)}`);
        assert.equal(libs[name].confidence, 'high', name);
        assert.ok(libs[name].evidence.length > 0);
      }
      assert.ok(libs.gsap.evidence.some((e) => /global gsap/.test(e)));
      assert.ok(libs.Lenis.evidence.some((e) => /html\.lenis class/.test(e)));
      assert.equal(output.canvas.count, 1);
      assert.ok(output.canvas.contexts.includes('webgl'));

      assert.ok(output.motion.scrollTriggers.count >= 1);
      assert.ok(output.motion.scrollTriggers.pinned >= 1);
      assert.ok(output.motion.scrollTriggers.scrubbed >= 1);
      const kinds = output.motion.observations.map(
        (o) => `${o.kind}:${o.trigger}`,
      );
      assert.ok(kinds.includes('pin:scroll'), kinds.join());
      assert.ok(kinds.includes('reveal:scroll'), kinds.join());
      assert.ok(kinds.includes('sticky-chrome:scroll'), kinds.join());
      assert.equal(output.motion.smoothScroll.lenisClass, true);

      assert.equal(output.styles.typography.headingClass, 'serif');
      assert.equal(output.styles.typography.bodyClass, 'sans');
      assert.equal(output.styles.colors.theme, 'dark');
      assert.match(output.styles.colors.pageBackground, /dark|black/);
      assert.ok(output.styles.colors.accents.some((a) => /warm/.test(a.value)));
      assert.ok(output.styles.layout.display.grid >= 1);
      assert.ok(output.styles.layout.contentWidth.maxPx <= 1100 + 1);

      // Abstraction: no page copy, font names or color codes are stored.
      for (const forbidden of [
        'Quillfeather',
        'marmalade',
        'kettle',
        'Zephyr',
        'Inter Nova',
        'Georgia',
        'copper',
      ])
        assert.ok(
          !json.toLowerCase().includes(forbidden.toLowerCase()),
          `recon.json leaks "${forbidden}"`,
        );
      assert.ok(!/#[0-9a-f]{3,8}\b/i.test(json), 'no hex colors');
      assert.ok(!/rgba?\(|hsla?\(/i.test(json), 'no color functions');

      for (const vp of VIEWPORTS) {
        const shot = join(dir, 'screens', `${vp.width}-1.png`);
        assert.ok(
          existsSync(shot) && statSync(shot).size > 1000,
          `${vp.width}-1.png`,
        );
      }
      assert.ok(
        output.screenshots.every((s) =>
          /^screens\/(375|768|1440)-\d+\.png$/.test(s),
        ),
      );
      // The fixture's 96px headline and 3-column grid really do overflow at 375 px; recon must report it.
      assert.equal(output.viewports[375].horizontalOverflow, true);
      assert.equal(output.viewports[1440].horizontalOverflow, false);

      cleanup('fixture', outRoot);
      assert.equal(existsSync(dir), false);
    },
  );

  test(
    'inner scroll container: screenshots cover the wrapper, motion is sampled, scroller is recorded',
    { timeout: 180000 },
    async () => {
      const outRoot = mkdtempSync(join(out, 'sc-'));
      const { output, dir } = await recon(
        `${fx.baseUrl}/scroll-container.html`,
        {
          slug: 'scroll-container',
          outRoot,
        },
      );
      // 5 panels of one viewport plus a sticky bar: the document itself is one viewport tall.
      assert.equal(output.scroller.kind, 'container');
      assert.ok(output.scroller.scrollHeightPx >= 4.5 * 900);
      assert.equal(output.scroller.clientHeightPx, 900);
      assert.equal(
        output.viewports[1440].docHeightPx,
        output.scroller.scrollHeightPx,
      );
      for (const w of [375, 768, 1440]) {
        const shots = output.screenshots.filter((x) =>
          x.startsWith(`screens/${w}-`),
        );
        assert.ok(shots.length >= 5, `${w}px: ${shots.length} screenshots`);
        assert.ok(
          output.viewports[w].docHeightPx >
            3 * VIEWPORTS.find((v) => v.width === w).height,
        );
      }
      assert.ok(output.motion.framesSampled >= 8);
      const kinds = output.motion.observations.map(
        (o) => `${o.kind}:${o.trigger}`,
      );
      assert.ok(kinds.includes('reveal:scroll'), kinds.join());
      assert.equal(output.motion.smoothScroll.easedWheelScroll, false);
      assert.ok(
        output.motion.smoothScroll.wheelSamples.at(-1).scrollY > 0,
        'the wheel probe reached the inner scroller',
      );
      cleanup('scroll-container', outRoot);
      assert.equal(existsSync(dir), false);
    },
  );

  test(
    "the starter's own built demo: Lenis, pinned section, reveal and parallax",
    { timeout: 180000 },
    async () => {
      const outRoot = mkdtempSync(join(out, 'demo-'));
      const { output, dir } = await recon(`${demo.baseUrl}/`, {
        slug: 'starter-demo',
        outRoot,
      });
      const names = output.libraries.map((l) => l.name);
      assert.ok(names.includes('Lenis'), names.join());
      assert.ok(names.includes('ScrollTrigger'), names.join());
      const kinds = output.motion.observations.map(
        (o) => `${o.kind}:${o.trigger}`,
      );
      assert.ok(kinds.includes('pin:scroll'), kinds.join());
      assert.ok(kinds.includes('reveal:load'), kinds.join());
      assert.ok(kinds.includes('reveal:scroll'), kinds.join());
      assert.ok(kinds.includes('parallax:scroll'), kinds.join());
      assert.equal(output.title, 'Landing Factory Starter');
      assert.equal(output.scroller.kind, 'document');
      assert.ok(output.sections.length >= 4);
      assert.ok(
        !/Motion that respects/.test(
          readFileSync(join(dir, 'recon.json'), 'utf8'),
        ),
        'headline copy not stored',
      );
      cleanup('starter-demo', outRoot);
      assert.equal(existsSync(dir), false);
    },
  );

  test(
    'a page without libraries yields an empty library list',
    { timeout: 120000 },
    async () => {
      const outRoot = mkdtempSync(join(out, 'plain-'));
      const { output } = await recon(`${fx.baseUrl}/plain.html`, {
        slug: 'plain',
        outRoot,
      });
      assert.deepEqual(output.libraries, []);
      assert.equal(output.canvas.count, 0);
      cleanup('plain', outRoot);
    },
  );

  test(
    'login, bot challenge, 403 and 404 pages abort with an explanation and leave nothing behind',
    { timeout: 180000 },
    async () => {
      const cases = [
        ['/login.html', 'login'],
        ['/challenge.html', 'blocked'],
        ['/forbidden', 'blocked'],
        ['/gone', 'unreachable'],
      ];
      for (const [path, kind] of cases) {
        const outRoot = mkdtempSync(join(out, 'abort-'));
        await assert.rejects(
          recon(`${fx.baseUrl}${path}`, { slug: 'aborted', outRoot }),
          (e) =>
            e instanceof AccessError &&
            e.kind === kind &&
            e.message.length > 20,
          path,
        );
        assert.equal(
          existsSync(join(outRoot, 'aborted')),
          false,
          `${path} left files`,
        );
      }
      const outRoot = mkdtempSync(join(out, 'refused-'));
      await assert.rejects(
        recon('http://127.0.0.1:1/', { slug: 'refused', outRoot }),
        (e) => e.kind === 'unreachable',
      );
      assert.equal(existsSync(join(outRoot, 'refused')), false);
    },
  );

  test(
    'a forced error midway (after screenshots exist) removes the folder',
    { timeout: 180000 },
    async () => {
      const outRoot = mkdtempSync(join(out, 'fail-'));
      const dir = join(outRoot, 'forced');
      const phases = [];
      await assert.rejects(
        recon(`${fx.baseUrl}/plain.html`, {
          slug: 'forced',
          outRoot,
          failAfter: 'screens',
          log: (m) => {
            phases.push(m);
            // Prove there was something to delete at the moment of failure.
            if (m === 'phase screens done')
              assert.ok(existsSync(join(dir, 'screens', '1440-1.png')));
          },
        }),
        /forced failure after phase "screens"/,
      );
      assert.ok(phases.includes('phase screens done'));
      assert.equal(existsSync(dir), false);
    },
  );

  test(
    'CLI: --fail-after exits 1 and removes the folder; success keeps it until --cleanup',
    { timeout: 240000 },
    async () => {
      const outRoot = mkdtempSync(join(out, 'cli-'));
      const run = (args) =>
        new Promise((done) => {
          const c = spawn(process.execPath, [
            SCRIPT,
            ...args,
            '--out-root',
            outRoot,
          ]);
          let stderr = '';
          let stdout = '';
          c.stderr.on('data', (d) => (stderr += d));
          c.stdout.on('data', (d) => (stdout += d));
          c.on('close', (code) => done({ code, stderr, stdout }));
        });
      const failed = await run([
        `${fx.baseUrl}/plain.html`,
        '--slug',
        'cli-fail',
        '--fail-after',
        'motion',
      ]);
      assert.equal(failed.code, 1, failed.stderr);
      assert.match(failed.stderr, /forced failure/);
      assert.equal(existsSync(join(outRoot, 'cli-fail')), false);

      const ok = await run([`${fx.baseUrl}/plain.html`, '--slug', 'cli-ok']);
      assert.equal(ok.code, 0, ok.stderr);
      assert.ok(existsSync(join(outRoot, 'cli-ok', 'recon.json')));
      const cleaned = await run(['--cleanup', 'cli-ok']);
      assert.equal(cleaned.code, 0);
      assert.equal(existsSync(join(outRoot, 'cli-ok')), false);

      const login = await run([
        `${fx.baseUrl}/login.html`,
        '--slug',
        'cli-login',
      ]);
      assert.equal(login.code, 3);
      assert.match(login.stderr, /NOT ANALYZABLE \(login\)/);
      assert.equal(existsSync(join(outRoot, 'cli-login')), false);

      const bad = await run(['--cleanup', '../oops']);
      assert.equal(bad.code, 1);
    },
  );
});

test('CLI --help and usage errors', () => {
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--help']).status, 0);
  assert.equal(spawnSync(process.execPath, [SCRIPT]).status, 2);
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--nope']).status, 2);
});
