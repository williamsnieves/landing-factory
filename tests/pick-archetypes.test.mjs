// Tests for scripts/pick-archetypes.mjs on a temp factory root with the real catalog and synthetic
// sites and reference sheets.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../scripts/lib/archetypes.mjs';
import {
  main,
  parseSignalsLine,
  pickBlends,
  readRefSheet,
} from '../scripts/pick-archetypes.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'pick-archetypes-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

function freshRoot() {
  const root = mkdtempSync(join(tmp, 'root-'));
  cpSync(join(ROOT, 'design-archetypes'), join(root, 'design-archetypes'), {
    recursive: true,
  });
  mkdirSync(join(root, 'patterns'));
  return root;
}
function addSite(root, slug, { signals, archetype, run } = {}) {
  const dir = join(root, 'sites', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{}');
  if (signals)
    writeFileSync(
      join(dir, 'PROPOSAL.md'),
      `# Proposal\n\n## Brief\n\n- **Niche:** x\n- **Signals:** ${signals}\n`,
    );
  if (run) writeFileSync(join(dir, 'RUN.md'), run);
  if (archetype) {
    mkdirSync(join(root, 'design-system', slug), { recursive: true });
    writeFileSync(
      join(root, 'design-system', slug, 'MASTER.md'),
      `# M\n\n\`\`\`landing-meta\nprimary: #123456\ndisplay-font: F\nhero: split\narchetype: ${archetype}\n\`\`\`\n`,
    );
  }
  return dir;
}
function addRef(root, slug, body) {
  writeFileSync(
    join(root, 'patterns', `${slug}.md`),
    `---\nurl: 'https://example.invalid/'\nslug: '${slug}'\n---\n\n# ${slug}\n\n${body}\n`,
  );
}
const SCROLL_STORY = `## Summary

A narrative site told in numbered chapters; a chapter index marks progress.

## Hero

Hero type: full-bleed photo, one statement per screen.

## Motion

A horizontal track is pinned and panels move sideways with the scroll; a fixed full-viewport canvas holds a 3d scene behind the text.

## What to take / what to avoid

Avoid the bento tile grid.`;
const TILES = `## Summary

A product catalog laid out as a bento tile grid, with spec chips on each tile.

## Hero

Hero type: split.`;

test('the Signals line is parsed in plain and bold forms; other text is ignored', () => {
  assert.deepEqual(parseSignalsLine('x\nSignals: calm, Premium ; bold\n'), [
    'calm',
    'premium',
    'bold',
  ]);
  assert.deepEqual(parseSignalsLine('- **Signals:** calm, bold'), [
    'calm',
    'bold',
  ]);
  assert.deepEqual(parseSignalsLine('- **Signals**: calm'), ['calm']);
  assert.equal(parseSignalsLine('no such line'), null);
});

test('blends are ranked by fits minus avoids and the output is deterministic', () => {
  const root = freshRoot();
  addSite(root, 'shop', {
    signals: 'local-service, conversion-first, craft, calm, photo-rich',
  });
  const a = pickBlends({ root, slug: 'shop' });
  const b = pickBlends({ root, slug: 'shop' });
  assert.deepEqual(a, b);
  assert.equal(a.blends[0].primary, 'warm-local-service');
  assert.ok(a.blends[0].reasons.some((r) => /warm-local-service fits/.test(r)));
  for (let i = 1; i < a.blends.length; i += 1)
    assert.ok(a.blends[i - 1].score >= a.blends[i].score);

  addSite(root, 'tool', {
    signals: 'technical, data-heavy, serious, conversion-first',
  });
  const t = pickBlends({ root, slug: 'tool' });
  assert.equal(t.blends[0].primary, 'data-and-proof');
  const penalized = t.blends.find((x) => x.primary === 'collage-scrapbook');
  assert.ok(penalized.score < t.blends[0].score);
  assert.ok(penalized.reasons.some((r) => /avoids/.test(r)));

  // brief.json wins over the proposal
  writeFileSync(
    join(root, 'sites/tool/brief.json'),
    JSON.stringify({ signals: ['playful', 'craft', 'photo-rich'] }),
  );
  const j = pickBlends({ root, slug: 'tool' });
  assert.equal(j.signalsSource, 'brief.json');
  assert.equal(j.blends[0].primary, 'collage-scrapbook');
});

test('a secondary must lend a trait the primary does not reject', () => {
  const root = freshRoot();
  addSite(root, 'x', { signals: 'bold, playful' });
  const { blends } = pickBlends({ root, slug: 'x' });
  const catalog = new Map(loadCatalog(root).map((a) => [a.name, a]));
  const pairs = blends.filter((b) => b.secondary);
  assert.ok(pairs.length > 10);
  for (const b of pairs) {
    const p = catalog.get(b.primary);
    const s = catalog.get(b.secondary);
    assert.ok(b.traits.length >= 1 && b.traits.length <= 2);
    for (const t of b.traits) {
      assert.ok(s.lends.includes(t));
      assert.ok(!p.rejects.includes(t), `${b.primary} rejects ${t}`);
    }
  }
  // typographic-poster rejects spec-chips and bento-grid: no bento secondary for it
  assert.ok(
    !blends.some(
      (b) =>
        b.primary === 'typographic-poster' &&
        b.secondary === 'bento-product-showcase',
    ),
  );
});

test('blends used by other sites are excluded and the next distinct blend is proposed', () => {
  const root = freshRoot();
  addSite(root, 'shop', {
    signals: 'local-service, conversion-first, craft, calm, photo-rich',
  });
  const first = pickBlends({ root, slug: 'shop' }).blends[0];
  assert.ok(first.secondary);
  addSite(root, 'older', {
    archetype: `${first.primary}+${first.secondary}`,
  });
  const next = pickBlends({ root, slug: 'shop' });
  assert.ok(
    !next.blends.some(
      (b) => b.primary === first.primary && b.secondary === first.secondary,
    ),
  );
  assert.ok(
    next.excluded.some(
      (e) => e.blend === `${first.primary}+${first.secondary}`,
    ),
  );
  // the same primary with another secondary is still offered
  assert.ok(next.blends.some((b) => b.primary === first.primary));
  assert.ok(next.blends[0].score <= first.score);

  // a primary already used by two other sites is dropped entirely
  addSite(root, 'older2', { archetype: `${first.primary}+data-and-proof` });
  const dropped = pickBlends({ root, slug: 'shop' });
  assert.ok(!dropped.blends.some((b) => b.primary === first.primary));
  assert.notEqual(dropped.blends[0].primary, first.primary);
  // the site itself and sites without an archetype line never exclude anything
  addSite(root, 'plain', {});
  assert.throws(() => pickBlends({ root, slug: 'plain' }), /no signals/);
});

test('reference sheets are mapped onto signals, traits and hero types', () => {
  const root = freshRoot();
  addRef(root, 'scroll-story', SCROLL_STORY);
  const sheet = readRefSheet(root, 'scroll-story');
  assert.deepEqual(sheet.traits, [
    'chapter-index',
    'chaptered-overlay',
    'horizontal-chapter',
    'scene-backdrop',
  ]);
  assert.ok(sheet.signals.includes('storytelling'));
  assert.ok(sheet.signals.includes('experimental'));
  assert.deepEqual(sheet.heroes, ['full-bleed-photo']);
  // "What to take / what to avoid" is advice, not description: the bento tile grid is not a trait
  assert.ok(!sheet.traits.includes('bento-grid'));
  assert.equal(readRefSheet(root, 'missing'), null);
});

test('references can raise a different archetype to the top', () => {
  const root = freshRoot();
  addSite(root, 'x', { signals: 'educational' });
  const without = pickBlends({ root, slug: 'x', refs: [] });
  assert.notEqual(without.blends[0].primary, 'bento-product-showcase');
  addRef(root, 'tiles', TILES);
  const withRef = pickBlends({ root, slug: 'x', refs: ['tiles'] });
  assert.equal(withRef.blends[0].primary, 'bento-product-showcase');
  assert.ok(
    withRef.blends[0].reasons.some((r) =>
      /owns reference-led traits bento-grid, spec-chips/.test(r),
    ),
  );
  assert.equal(withRef.custom.eligible, false);
  assert.ok(!withRef.blends.some((b) => b.primary === 'custom'));
  // a lent trait of the ref that the primary does not own is offered as ref:<sheet>/<trait>
  const other = withRef.blends.find(
    (b) =>
      b.primary === 'swiss-grid-minimal' && b.secondary === 'data-and-proof',
  );
  assert.ok(other.refTraits.includes('ref:tiles/bento-grid'));
  // references named in RUN.md and PROPOSAL.md are found without --refs
  addSite(root, 'y', {
    signals: 'calm, educational',
    run: '# Run\n\n## Inputs\n\n| Field | Value |\n| --- | --- |\n| Niche | x |\n| References | tiles (sources commons) |\n',
  });
  assert.deepEqual(
    pickBlends({ root, slug: 'y' }).refs.map((r) => r.slug),
    ['tiles'],
  );
  const lead = pickBlends({ root, slug: 'y' }).blends[0];
  assert.ok(
    [lead.primary, lead.secondary].includes('bento-product-showcase'),
    `${lead.primary}+${lead.secondary}`,
  );
  assert.throws(
    () => pickBlends({ root, slug: 'x', refs: ['nope'] }),
    /patterns\/nope\.md/,
  );
});

test('clear references give a reference-led (custom) outcome with archetypes only filling gaps', () => {
  const root = freshRoot();
  addSite(root, 'x', { signals: 'calm, educational' });
  addRef(root, 'scroll-story', SCROLL_STORY);
  const result = pickBlends({ root, slug: 'x', refs: ['scroll-story'] });
  assert.equal(result.custom.eligible, true);
  const top = result.blends[0];
  assert.equal(top.primary, 'custom');
  assert.equal(top.secondary, null);
  assert.ok(top.refTraits.includes('ref:scroll-story/horizontal-chapter'));
  assert.equal(top.fills.length, 2);
  assert.ok(top.reasons.some((r) => /reference-led: scroll-story/.test(r)));
  // named archetype blends are still listed after it
  assert.ok(
    result.blends.some((b) => b.primary === 'horizontal-chapter-story'),
  );
  // a used custom landing never excludes a custom outcome
  addSite(root, 'older', { archetype: 'custom' });
  assert.equal(
    pickBlends({ root, slug: 'x', refs: ['scroll-story'] }).blends[0].primary,
    'custom',
  );
});

test('bad input is reported with exit code 2 and the CLI prints reasons or JSON', async () => {
  const root = freshRoot();
  addSite(root, 'x', { signals: 'calm, glittery' });
  const lines = [];
  const io = { log: (m) => lines.push(m), error: (m) => lines.push(m) };
  assert.equal(await main(['--site', 'x', '--root', root], io), 2);
  assert.match(
    lines.join('\n'),
    /unknown signal\(s\) in PROPOSAL\.md: glittery/,
  );
  assert.equal(await main([], io), 2);
  assert.equal(await main(['--site', 'x', '--top', '0'], io), 2);
  assert.equal(await main(['--site', 'nobrief', '--root', root], io), 2);

  addSite(root, 'ok', { signals: 'calm, premium' });
  lines.length = 0;
  assert.equal(
    await main(['--site', 'ok', '--root', root, '--top', '2'], io),
    0,
  );
  assert.match(lines[0], /^pick-archetypes ok/);
  assert.match(lines[0], /traits to borrow/);
  lines.length = 0;
  assert.equal(
    await main(['--site', 'ok', '--root', root, '--json', '--top', '3'], io),
    0,
  );
  const json = JSON.parse(lines[0]);
  assert.equal(json.blends.length, 3);
  assert.deepEqual(json.signals, ['calm', 'premium']);

  const r = spawnSync(
    process.execPath,
    ['scripts/pick-archetypes.mjs', '--help'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  assert.equal(r.status, 0);
  assert.match(r.stdout, /--refs/);
});
