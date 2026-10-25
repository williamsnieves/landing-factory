// scripts/new-landing.sh with --langs and a bilingual brief (add-bilingual-landing). Same stub `claude` as
// tests/new-landing.test.mjs: it records its arguments; preflight and npm install are skipped; the real Claude run
// never starts, and every site is created in a temp root, never in sites/.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCRIPT = join(ROOT, 'scripts/new-landing.sh');
const tmp = mkdtempSync(join(tmpdir(), 'i18n-new-landing-test-'));
const factoryRoot = mkdtempSync(join(tmpdir(), 'i18n-new-landing-root-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
  rmSync(factoryRoot, { recursive: true, force: true });
});

const argsFile = join(tmp, 'claude-args.txt');
const stubDir = join(tmp, 'bin');
mkdirSync(stubDir);
writeFileSync(
  join(stubDir, 'claude'),
  `#!/usr/bin/env bash
printf '%s\\n' "$@" > "${argsFile}"
echo "stub claude ran"
target="$LANDING_FACTORY_ROOT/sites/$(echo "$2" | sed -n 's#^/new-landing \\([a-z0-9-]*\\) .*#\\1#p')/RUN.md"
if [ -n "\${STUB_RESULT:-}" ] && [ -f "$target" ]; then
  sed -i "s/^Result: .*/Result: $STUB_RESULT/" "$target"
fi
exit 0
`,
);
chmodSync(join(stubDir, 'claude'), 0o755);

function run(args, env = {}) {
  return spawnSync('bash', [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env.PATH}`,
      NEW_LANDING_SKIP: 'preflight,install,final-check',
      LANDING_FACTORY_ROOT: factoryRoot,
      ...env,
    },
  });
}
const recorded = () => readFileSync(argsFile, 'utf8').trimEnd().split('\n');
const site = (slug, rel) => join(factoryRoot, 'sites', slug, rel);

const briefFixture = join(ROOT, 'tests/fixtures/brief/brief.json');
const base = `zz-nli-${process.pid}`;

test('a brief with two languages scaffolds a multi-locale site and passes --langs to the skill', () => {
  const file = join(tmp, 'brief-bilingual.json');
  const data = JSON.parse(readFileSync(briefFixture, 'utf8'));
  data.language = 'en';
  data.languages = ['en', 'es'];
  data.assets = [];
  writeFileSync(file, JSON.stringify(data));
  const slug = `${base}-bi`;
  const r = run([slug, '--brief', file, '--dry-run'], {
    STUB_RESULT: 'dry-run-done',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(
    readFileSync(site(slug, 'astro.config.mjs'), 'utf8'),
    /locales: \['en', 'es'\],\s*defaultLocale: 'en',/,
  );
  assert.ok(existsSync(site(slug, 'src/pages/es/index.astro')));
  assert.ok(existsSync(site(slug, 'src/i18n/ui.ts')));
  assert.match(recorded()[1], /--lang en --langs en,es$/);
});

test('a brief with one language stays single-language', () => {
  const slug = `${base}-one`;
  const file = join(tmp, 'brief-one.json');
  const data = JSON.parse(readFileSync(briefFixture, 'utf8'));
  data.languages = ['es'];
  data.assets = [];
  writeFileSync(file, JSON.stringify(data));
  const r = run([slug, '--brief', file, '--dry-run'], {
    STUB_RESULT: 'dry-run-done',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(!existsSync(site(slug, 'src/i18n')));
  assert.doesNotMatch(recorded()[1], /--langs/);
});

test('--langs works without a brief, keeps --lang as the default locale and is validated before anything is created', () => {
  const slug = `${base}-langs`;
  const r = run(
    [slug, '--niche', 'a studio', '--langs', 'en,es', '--lang', 'es'],
    { STUB_RESULT: 'checkpoint' },
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(
    readFileSync(site(slug, 'astro.config.mjs'), 'utf8'),
    /locales: \['es', 'en'\],\s*defaultLocale: 'es',/,
  );
  assert.match(recorded()[1], /--lang es --langs en,es$/);
  for (const langs of ['en', 'en;es', 'EN,es', 'en,']) {
    const bad = run([`${base}-bad`, '--niche', 'x', '--langs', langs]);
    assert.equal(bad.status, 2, langs);
    assert.match(bad.stderr, /--langs/);
  }
  assert.ok(!existsSync(site(`${base}-bad`, '')));
  assert.match(run(['--help']).stdout, /--langs <a,b>/);
});
