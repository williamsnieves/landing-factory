// The new-landing skill's SEO step, the vendored SEO skills and their lock entries (add-seo).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const skill = read('.claude/skills/new-landing/SKILL.md');

test('the new-landing skill names the SEO skills, src/data/seo.ts, customer facts only and no review markup', () => {
  for (const needle of [
    '.claude/skills/seo-audit/SKILL.md',
    '.claude/skills/schema/SKILL.md',
    'src/data/seo.ts',
    'customer facts only',
    'the `jsonLd` prop',
    'No `review`, `aggregateRating` or rating markup unless the customer gave real reviews',
    '`.agents/product-marketing.md`, which does not exist here',
    'seo.primaryKeyword',
    'seo.schemaType',
    'mark each as assumed',
    'no JSON-LD and no sitemap entry for direction pages',
    'no `seo-*` item may fail',
  ])
    assert.ok(skill.includes(needle), needle);
  assert.ok(
    skill.indexOf('SEO: fill the "SEO" section') <
      skill.indexOf('### 3. Checkpoint'),
  );
  assert.ok(skill.indexOf('**SEO** (skills') > skill.indexOf('### 5. Build'));
});

test('seo-audit and schema are vendored from one repository and commit, with the license', () => {
  const lock = JSON.parse(read('agent-tooling.lock.json'));
  const entries = ['seo-audit', 'schema'].map((name) =>
    lock.tools.find((t) => t.name === name),
  );
  for (const entry of entries) {
    assert.ok(entry, 'lock entry');
    assert.equal(
      entry.fetch.repo,
      'https://github.com/coreyhaines31/marketingskills.git',
    );
    assert.equal(entry.commit, '0cd9b3a0ef4c411a1d690419ce843f2a1da32cce');
    assert.equal(entry.license, 'MIT');
    assert.deepEqual(entry.licenseFiles, [
      'third-party-licenses/marketingskills.LICENSE',
    ]);
    assert.ok(existsSync(join(ROOT, entry.skillFile)), entry.skillFile);
    assert.equal(entry.fetch.subpath, `skills/${entry.name}`);
    assert.equal(entry.path, `.claude/skills/${entry.name}`);
  }
  assert.ok(
    existsSync(join(ROOT, 'third-party-licenses/marketingskills.LICENSE')),
  );
  assert.match(
    read('third-party-licenses/README.md'),
    /marketingskills\.LICENSE/,
  );
});

test('CLAUDE.md lists both vendored SEO skills with a never-edit note', () => {
  const claude = read('CLAUDE.md');
  assert.match(claude, /`seo-audit`/);
  assert.match(claude, /`schema`/);
  assert.match(claude, /never edit/i);
});
