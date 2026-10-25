// Tests for scripts/ai-images.mjs against a local fake Images API and a temporary sites/ folder. No network,
// no real key: the key is a fake built at runtime and must never appear in any output, file or manifest.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { aiEntries, consent, main } from '../scripts/ai-images.mjs';
import {
  TINY_PNG,
  TINY_WEBP,
  fakeKey,
  startFakeApi,
} from './ai-fake-server.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), 'ai-images-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const KEY = fakeKey();
const NOW = new Date('2026-10-25T10:00:00.000Z');
const PROMPT = 'An abstract gradient of light and glass shapes';
const briefFixture = () =>
  JSON.parse(
    readFileSync(join(ROOT, 'tests/fixtures/brief/brief.json'), 'utf8'),
  );

let counter = 0;
/** A temporary repo root with sites/demo (and optionally a brief, a manifest and a site qa.config.json). */
function makeRoot({ brief, images = [], config } = {}) {
  const root = mkdtempSync(join(tmp, `root${counter++}-`));
  const site = join(root, 'sites/demo');
  mkdirSync(site, { recursive: true });
  writeFileSync(join(site, 'assets.json'), JSON.stringify({ images }, null, 2));
  if (brief) writeFileSync(join(site, 'brief.json'), JSON.stringify(brief));
  if (config)
    writeFileSync(join(site, 'qa.config.json'), JSON.stringify(config));
  // The default config comes from the real repo root, so a root-level qa.config.json is copied.
  writeFileSync(
    join(root, 'qa.config.json'),
    readFileSync(join(ROOT, 'qa.config.json')),
  );
  return root;
}
const manifestOf = (root) =>
  JSON.parse(readFileSync(join(root, 'sites/demo/assets.json'), 'utf8'));

/** Run main() in process against the fake API, capturing all output. */
async function run(args, { root, api, key = KEY, extraEnv = {} } = {}) {
  const out = [];
  const err = [];
  const env = {
    ...(key ? { OPENAI_API_KEY: key } : {}),
    ...(api ? { OPENAI_BASE_URL: api.baseUrl } : {}),
    ...extraEnv,
  };
  const code = await main(
    args,
    { log: (m) => out.push(String(m)), error: (m) => err.push(String(m)) },
    { root, env, now: NOW },
  );
  const stdout = out.join('\n');
  const stderr = err.join('\n');
  assert.ok(
    !stdout.includes(KEY) && !stderr.includes(KEY),
    'the key never appears in output',
  );
  return { code, stdout, stderr };
}

const generate = (extra = []) => [
  'generate',
  'demo',
  '--prompt',
  PROMPT,
  '--as',
  'hero-glass',
  ...extra,
];

test('generate writes the file and a full provenance entry, with the config defaults', async () => {
  const api = await startFakeApi();
  const root = makeRoot();
  try {
    const { code, stdout } = await run(generate(['--title', 'Glass shapes']), {
      root,
      api,
    });
    assert.equal(code, 0, stdout);
    const file = join(root, 'sites/demo/src/assets/images/hero-glass.webp');
    assert.deepEqual(readFileSync(file), Buffer.from(TINY_WEBP, 'base64'));
    assert.deepEqual(api.requests[0].body, {
      model: 'gpt-image-1.5',
      prompt: PROMPT,
      size: '1536x1024',
      quality: 'high',
      n: 1,
      output_format: 'webp',
      output_compression: 90,
    });
    assert.deepEqual(manifestOf(root).images, [
      {
        file: 'hero-glass.webp',
        title: 'Glass shapes',
        source: 'ai',
        generator: 'openai',
        model: 'gpt-image-1.5',
        prompt: PROMPT,
        revisedPrompt: 'A revised prompt.',
        size: '1536x1024',
        quality: 'high',
        createdAt: '2026-10-25T10:00:00.000Z',
        terms: 'https://openai.com/policies/terms-of-use/',
        requestId: 'req_fake_123',
        usage: { input_tokens: 12, output_tokens: 34, total_tokens: 46 },
        credit: false,
        note: '',
      },
    ]);
    // Flags override the defaults; a second image appends and the count follows.
    const second = await run(
      [
        'generate',
        'demo',
        '--prompt',
        'Soft paper texture',
        '--as',
        'paper',
        '--size',
        '1024x1024',
        '--quality',
        'low',
        '--model',
        'gpt-image-1-mini',
        '--note',
        'texture',
      ],
      { root, api },
    );
    assert.equal(second.code, 0);
    assert.equal(api.requests[1].body.size, '1024x1024');
    assert.equal(api.requests[1].body.model, 'gpt-image-1-mini');
    const entry = manifestOf(root).images[1];
    assert.equal(entry.title, 'Soft paper texture');
    assert.equal(entry.note, 'texture');
    assert.equal(aiEntries(manifestOf(root)).length, 2);
    const count = await run(['count', 'demo'], { root });
    assert.match(count.stdout, /2 of 12 AI images/);
    // The same name is refused before a request.
    const again = await run(generate(), { root, api });
    assert.equal(again.code, 1);
    assert.match(again.stderr, /hero-glass\.webp already exists/);
    assert.equal(api.requests.length, 2);
  } finally {
    await api.close();
  }
});

test('--dry-run prints the request without the key, sends nothing and changes no file', async () => {
  const api = await startFakeApi();
  const root = makeRoot();
  const before = readFileSync(join(root, 'sites/demo/assets.json'), 'utf8');
  try {
    // Even without a key: a dry run never needs it.
    const { code, stdout } = await run(generate(['--dry-run']), {
      root,
      api,
      key: '',
    });
    assert.equal(code, 0);
    assert.match(
      stdout,
      /dry run: would send POST http:\/\/127\.0\.0\.1:\d+\/v1\/images\/generations/,
    );
    assert.match(stdout, /"model": "gpt-image-1\.5"/);
    assert.match(stdout, /"prompt": "An abstract gradient/);
    assert.doesNotMatch(stdout, /Bearer|authorization/i);
    assert.equal(api.requests.length, 0);
    assert.equal(existsSync(join(root, 'sites/demo/src')), false);
    assert.equal(
      readFileSync(join(root, 'sites/demo/assets.json'), 'utf8'),
      before,
    );
  } finally {
    await api.close();
  }
});

test('consent: not-allowed, empty and an assumed value exit 1 without a request; allowed and no brief generate', async () => {
  const api = await startFakeApi();
  try {
    for (const value of ['not-allowed', '']) {
      const brief = briefFixture();
      brief.brand.aiImages = value;
      const root = makeRoot({ brief });
      const { code, stderr } = await run(generate(), { root, api });
      assert.equal(code, 1, value);
      assert.match(stderr, /the customer did not allow AI images/);
      assert.match(
        stderr,
        new RegExp(`brand\\.aiImages is ${value || 'empty'}`),
      );
      assert.equal(existsSync(join(root, 'sites/demo/src')), false);
    }
    // A parent listed as assumed covers brand.aiImages: not the customer's answer.
    const assumed = briefFixture();
    assumed.assumed.push({ field: 'brand', reason: 'x' });
    assert.equal(consent(assumed).allowed, false);
    const older = briefFixture();
    delete older.brand.aiImages;
    assert.equal(consent(older).allowed, false);
    assert.equal(api.requests.length, 0);

    const allowed = makeRoot({ brief: briefFixture() });
    assert.equal((await run(generate(), { root: allowed, api })).code, 0);
    const noBrief = makeRoot();
    assert.equal((await run(generate(), { root: noBrief, api })).code, 0);
    assert.equal(api.requests.length, 2);
  } finally {
    await api.close();
  }
});

test('the cap refuses at the configured number, naming it, with no request; a site config can change it', async () => {
  const api = await startFakeApi();
  try {
    const images = Array.from({ length: 12 }, (_, i) => ({
      file: `a${i}.webp`,
      source: 'ai',
    }));
    const root = makeRoot({ images });
    const { code, stderr } = await run(generate(), { root, api });
    assert.equal(code, 1);
    assert.match(stderr, /12 AI images and the cap is 12/);
    assert.match(stderr, /aiImages\.maxPerSite/);
    // Non-AI entries do not count.
    const stock = makeRoot({
      images: Array.from({ length: 12 }, (_, i) => ({
        file: `s${i}.jpg`,
        source: 'met',
      })),
    });
    assert.equal((await run(generate(), { root: stock, api })).code, 0);
    // The site's own qa.config.json sets the cap.
    const config = JSON.parse(
      readFileSync(join(ROOT, 'qa.config.json'), 'utf8'),
    );
    config.aiImages.maxPerSite = 1;
    const capped = makeRoot({
      images: [{ file: 'a.webp', source: 'ai' }],
      config,
    });
    const refused = await run(generate(), { root: capped, api });
    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /1 AI images and the cap is 1/);
    assert.equal(api.requests.length, 1);
  } finally {
    await api.close();
  }
});

test('the prompt policy refuses with the rule and no request, from the brief and from the word lists', async () => {
  const api = await startFakeApi();
  try {
    const root = makeRoot({ brief: briefFixture() });
    for (const [prompt, rule] of [
      ['Hero art for Taller Plantilla', 'brand'],
      ['Our team around a table', 'people'],
      ['A logo on a wall', 'identity'],
      ['Before and after of a room', 'results'],
      ['Portrait of Marie Curie', 'real-person'],
    ]) {
      const { code, stderr } = await run(
        ['generate', 'demo', '--prompt', prompt, '--as', 'x'],
        { root, api },
      );
      assert.equal(code, 1, prompt);
      assert.match(
        stderr,
        new RegExp(`refused by the AI image policy: \\[${rule}\\]`),
      );
    }
    assert.equal(api.requests.length, 0);
  } finally {
    await api.close();
  }
});

test('no key exits 1 naming the variable with no request; a key echoed by the API is masked and nothing is written', async () => {
  const echo = await startFakeApi(() => ({
    status: 401,
    body: { error: { message: `Incorrect API key provided: ${KEY}.` } },
  }));
  try {
    const root = makeRoot();
    const noKey = await run(generate(), { root, api: echo, key: '' });
    assert.equal(noKey.code, 1);
    assert.match(noKey.stderr, /OPENAI_API_KEY/);
    assert.equal(echo.requests.length, 0);

    const failed = await run(generate(), { root, api: echo });
    assert.equal(failed.code, 1);
    assert.match(failed.stderr, /HTTP 401/);
    assert.match(failed.stderr, /\[redacted key\]/);
    assert.equal(existsSync(join(root, 'sites/demo/src')), false);
    assert.deepEqual(manifestOf(root).images, []);
  } finally {
    await echo.close();
  }
});

test('bad usage exits 2: no prompt, no name, bad size, unknown command, import without a prompt', async () => {
  const root = makeRoot();
  const cases = [
    ['generate', 'demo', '--as', 'x'],
    ['generate', 'demo', '--prompt', PROMPT],
    ['generate', 'demo', '--prompt', PROMPT, '--as', 'x', '--size', '5x5'],
    ['generate', 'demo', '--prompt', PROMPT, '--as', 'Bad Name'],
    ['generate', 'Bad_Slug', '--prompt', PROMPT, '--as', 'x'],
    ['frobnicate'],
    [],
    ['generate', 'demo', '--bogus'],
  ];
  for (const args of cases)
    assert.equal((await run(args, { root })).code, 2, args.join(' '));
  assert.equal(
    (
      await run(['generate', 'missing', '--prompt', PROMPT, '--as', 'x'], {
        root,
      })
    ).code,
    1,
  );

  const file = join(tmp, 'mine.png');
  writeFileSync(file, Buffer.from(TINY_PNG, 'base64'));
  const noPrompt = await run(
    [
      'import',
      'demo',
      file,
      '--generator',
      'Midjourney',
      '--model',
      'v7',
      '--created',
      '2026-10-20',
      '--terms',
      'https://example.com/terms',
    ],
    { root },
  );
  assert.equal(noPrompt.code, 2);
  assert.match(noPrompt.stderr, /import needs --prompt/);
  assert.deepEqual(manifestOf(root).images, []);
  assert.equal(existsSync(join(root, 'sites/demo/src')), false);
});

test('import copies the file, records the entry with imported: true and applies consent and the policy', async () => {
  const file = join(tmp, 'Cover Art.png');
  writeFileSync(file, Buffer.from(TINY_PNG, 'base64'));
  const flags = [
    '--generator',
    'Midjourney',
    '--model',
    'v7',
    '--created',
    '2026-10-20',
    '--terms',
    'https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service',
  ];
  const root = makeRoot({ brief: briefFixture() });
  const { code, stdout } = await run(
    [
      'import',
      'demo',
      file,
      ...flags,
      '--prompt',
      'Soft abstract waves',
      '--note',
      'made by the owner',
    ],
    { root },
  );
  assert.equal(code, 0, stdout);
  assert.deepEqual(
    readFileSync(join(root, 'sites/demo/src/assets/images/cover-art.png')),
    Buffer.from(TINY_PNG, 'base64'),
  );
  assert.deepEqual(manifestOf(root).images, [
    {
      file: 'cover-art.png',
      title: 'Soft abstract waves',
      source: 'ai',
      generator: 'Midjourney',
      model: 'v7',
      prompt: 'Soft abstract waves',
      revisedPrompt: '',
      createdAt: '2026-10-20T00:00:00.000Z',
      terms:
        'https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service',
      imported: true,
      credit: false,
      note: 'made by the owner',
    },
  ]);

  const refusedPolicy = await run(
    [
      'import',
      'demo',
      file,
      ...flags,
      '--prompt',
      'Our team photo',
      '--as',
      'team',
    ],
    { root },
  );
  assert.equal(refusedPolicy.code, 1);
  const notAllowed = briefFixture();
  notAllowed.brand.aiImages = 'not-allowed';
  const closed = makeRoot({ brief: notAllowed });
  const refusedConsent = await run(
    ['import', 'demo', file, ...flags, '--prompt', 'Soft waves'],
    { root: closed },
  );
  assert.equal(refusedConsent.code, 1);
  assert.match(refusedConsent.stderr, /did not allow AI images/);
  // A file that is not an image, a missing file and a bad date.
  const text = join(tmp, 'note.png');
  writeFileSync(text, 'not an image at all');
  assert.equal(
    (
      await run(
        [
          'import',
          'demo',
          text,
          ...flags,
          '--prompt',
          'Soft waves',
          '--as',
          'n',
        ],
        { root },
      )
    ).code,
    1,
  );
  assert.equal(
    (
      await run(
        [
          'import',
          'demo',
          join(tmp, 'nope.png'),
          ...flags,
          '--prompt',
          'Soft waves',
        ],
        { root },
      )
    ).code,
    1,
  );
  const badDate = [...flags];
  badDate[5] = 'yesterday';
  assert.equal(
    (
      await run(
        [
          'import',
          'demo',
          file,
          ...badDate,
          '--prompt',
          'Soft waves',
          '--as',
          'd',
        ],
        { root },
      )
    ).code,
    2,
  );
});

test('the CLI runs as a process: generate end to end against the fake API, and no output holds the key', async () => {
  const api = await startFakeApi();
  const root = makeRoot();
  const env = {
    ...process.env,
    OPENAI_API_KEY: KEY,
    OPENAI_BASE_URL: api.baseUrl,
    LANDING_FACTORY_ROOT: root,
  };
  for (const name of [
    'HTTPS_PROXY',
    'https_proxy',
    'HTTP_PROXY',
    'http_proxy',
    'NODE_USE_ENV_PROXY',
  ])
    delete env[name];
  try {
    const result = await new Promise((done) => {
      const child = spawn(
        process.execPath,
        [join(ROOT, 'scripts/ai-images.mjs'), ...generate(['--json'])],
        { env },
      );
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => (stdout += d));
      child.stderr.on('data', (d) => (stderr += d));
      child.on('close', (code) => done({ code, stdout, stderr }));
    });
    assert.equal(result.code, 0, result.stderr);
    assert.ok(!result.stdout.includes(KEY) && !result.stderr.includes(KEY));
    assert.equal(JSON.parse(result.stdout).file, 'hero-glass.webp');
    // The key is in no file of the temporary repo.
    const all = (dir) =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? all(join(dir, e.name)) : [join(dir, e.name)],
      );
    for (const file of all(root).filter((f) => !f.endsWith('.webp')))
      assert.ok(!readFileSync(file, 'utf8').includes(KEY), file);
    assert.equal(api.requests[0].headers.authorization, `Bearer ${KEY}`);
  } finally {
    await api.close();
  }
});

test('the npm script and the allow list exist, and the allow list stays narrow', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['ai-images'], 'node scripts/ai-images.mjs');
  assert.ok(!('openai' in { ...pkg.dependencies, ...pkg.devDependencies }));
  const allow = JSON.parse(
    readFileSync(join(ROOT, '.claude/settings.json'), 'utf8'),
  ).permissions.allow;
  assert.ok(allow.includes('Bash(node scripts/ai-images.mjs *)'));
  assert.ok(!allow.some((p) => /^Bash\(node (\*|scripts\/\*)/.test(p)));
});

test('the new-landing skill orders the image sources, limits AI to illustrative art with consent, and names the disclosure, the cap, RUN.md and the no-key fallback', () => {
  const skill = readFileSync(
    join(ROOT, '.claude/skills/new-landing/SKILL.md'),
    'utf8',
  );
  for (const needle of [
    '**AI images** (the fifth source',
    "1) the customer's own files; 2) Commons and The Met for real-world subjects",
    '3) an AI image, only for an illustrative, abstract, texture or generic-object need',
    'Never use an AI image where the page presents the picture as a real photo',
    '`brand.aiImages` must be `allowed`',
    'without a brief (a demo niche) it is allowed',
    'node scripts/ai-images.mjs count <slug>',
    'node scripts/ai-images.mjs generate <slug> --prompt',
    'node scripts/ai-images.mjs import <slug> <file>',
    '`--dry-run`',
    '`aiImages.maxPerSite`',
    'never names the business or a product of the brief',
    'never by an override',
    '`OPENAI_API_KEY`',
    'Never write it, print it or pass it as an argument',
    'fall back to Commons and The Met',
    'never invent an image',
    '<p data-ai-disclosure>',
    'Some images on this page were generated with AI.',
    'Algunas imágenes de esta página se generaron con IA.',
    'AI-generated images',
    '"3 of 12"',
    '`ai-provenance`',
  ])
    assert.ok(skill.includes(needle), needle);
  // The AI rules sit with the image rules, before the 3D scenes, and the order is customer, archives, AI.
  assert.ok(skill.indexOf('**AI images**') > skill.indexOf('**Images**'));
  assert.ok(skill.indexOf('**AI images**') < skill.indexOf('**3D scenes**'));
  assert.doesNotMatch(skill, /sk-[A-Za-z0-9]/);
});

// --------------------------------------------------------------------------------------------------
// Owner portrait (--subject owner)

const PORTRAIT_FLAGS = [
  '--generator',
  'ChatGPT',
  '--model',
  'gpt-image-1.5',
  '--created',
  '2026-10-20',
  '--terms',
  'https://openai.com/policies/terms-of-use/',
];
const PORTRAIT_PROMPT =
  'A half-human, half-machine portrait of the author, soft light';
const portraitImport = (extra = [], prompt = PORTRAIT_PROMPT) => [
  'import',
  'demo',
  join(tmp, 'owner.png'),
  ...PORTRAIT_FLAGS,
  '--prompt',
  prompt,
  ...extra,
];
const ownerBrief = (aiImages = 'allowed', ownerPortrait = 'allowed') => {
  const brief = briefFixture();
  brief.business.personalBrand = true;
  brief.brand.aiImages = aiImages;
  brief.brand.ownerPortrait = ownerPortrait;
  return brief;
};

test('import --subject owner is accepted with both consents and records subject owner', async () => {
  writeFileSync(join(tmp, 'owner.png'), Buffer.from(TINY_PNG, 'base64'));
  const root = makeRoot({ brief: ownerBrief() });
  const { code, stdout } = await run(portraitImport(['--subject', 'owner']), {
    root,
  });
  assert.equal(code, 0, stdout);
  const [entry] = manifestOf(root).images;
  assert.equal(entry.subject, 'owner');
  assert.equal(entry.source, 'ai');
  assert.equal(entry.imported, true);
  assert.equal(entry.file, 'owner.png');
  // Without the flag the same prompt is a people prompt and stays refused.
  const plain = await run(
    portraitImport([], 'Portrait of the owner, half machine'),
    { root: makeRoot({ brief: ownerBrief() }) },
  );
  assert.equal(plain.code, 1);
  assert.match(plain.stderr, /\[people\]/);
});

test('import --subject owner is refused without a brief, without the portrait consent and without AI consent, and changes nothing', async () => {
  writeFileSync(join(tmp, 'owner.png'), Buffer.from(TINY_PNG, 'base64'));
  const args = portraitImport(['--subject', 'owner']);
  const cases = [
    [makeRoot(), /needs a brief\.json that names the owner/],
    [
      makeRoot({ brief: ownerBrief('allowed', '') }),
      /brand\.ownerPortrait is empty/,
    ],
    [
      makeRoot({ brief: ownerBrief('allowed', 'not-allowed') }),
      /brand\.ownerPortrait is not-allowed/,
    ],
    [
      makeRoot({ brief: ownerBrief('not-allowed', 'allowed') }),
      /brand\.aiImages is not-allowed/,
    ],
    [
      makeRoot({ brief: ownerBrief('', 'allowed') }),
      /brand\.aiImages is empty/,
    ],
  ];
  for (const [root, message] of cases) {
    const { code, stderr } = await run(args, { root });
    assert.equal(code, 1, stderr);
    assert.match(
      stderr,
      /an AI portrait of the owner needs the owner's consent/,
    );
    assert.match(stderr, message);
    assert.deepEqual(manifestOf(root).images, []);
    assert.equal(existsSync(join(root, 'sites/demo/src')), false);
  }
  // A portrait consent listed as assumed does not count (validation also refuses the brief).
  const assumed = ownerBrief();
  assumed.assumed.push({ field: 'brand.ownerPortrait', reason: 'x' });
  const { code } = await run(args, { root: makeRoot({ brief: assumed }) });
  assert.equal(code, 1);
});

test('generate never accepts --subject, and import accepts only the subject owner', async () => {
  const api = await startFakeApi();
  try {
    const root = makeRoot({ brief: ownerBrief() });
    const generated = await run(generate(['--subject', 'owner']), {
      root,
      api,
    });
    assert.equal(generated.code, 2);
    assert.match(generated.stderr, /--subject is only for import/);
    assert.equal(api.requests.length, 0);
    assert.deepEqual(manifestOf(root).images, []);
    writeFileSync(join(tmp, 'owner.png'), Buffer.from(TINY_PNG, 'base64'));
    const other = await run(portraitImport(['--subject', 'team']), { root });
    assert.equal(other.code, 2);
    assert.match(other.stderr, /--subject must be "owner"/);
  } finally {
    await api.close();
  }
});

test('the owner exemption skips only the people and real-person rules: brand, logo and results are still refused', async () => {
  writeFileSync(join(tmp, 'owner.png'), Buffer.from(TINY_PNG, 'base64'));
  const subject = ['--subject', 'owner'];
  const refused = [
    [`Portrait of Taller Plantilla, the author`, 'brand'],
    ['The author next to a logo, half machine', 'identity'],
    ['The author, before and after the program', 'results'],
  ];
  for (const [prompt, rule] of refused) {
    const root = makeRoot({ brief: ownerBrief() });
    const { code, stderr } = await run(portraitImport(subject, prompt), {
      root,
    });
    assert.equal(code, 1, prompt);
    assert.match(stderr, new RegExp(`\\[${rule}\\]`), prompt);
    assert.deepEqual(manifestOf(root).images, []);
  }
  // A founder/owner/named-person prompt passes only with the subject.
  const allowed = await run(
    portraitImport(subject, 'Portrait of Maria Lopez, the founder and owner'),
    { root: makeRoot({ brief: ownerBrief() }) },
  );
  assert.equal(allowed.code, 0, allowed.stderr);
});

test('the new-landing skill limits the owner portrait to a personal brand with both consents, an import, honest alt text and the disclosure; and describes the 404 page', () => {
  const skill = readFileSync(
    join(ROOT, '.claude/skills/new-landing/SKILL.md'),
    'utf8',
  );
  for (const needle of [
    'the only AI image allowed to depict a person',
    '`business.personalBrand`',
    '`brand.aiImages` and `brand.ownerPortrait` both `allowed`',
    '--subject owner',
    '`generate` refuses `--subject`',
    '"AI-generated portrait of <name>"',
    'The page disclosure below stays',
    '**404 page** (every landing has one)',
    'keep `noindex`'.replace('keep', 'Keep'),
    'section-shots.mjs --site <slug> --include-404',
  ])
    assert.ok(skill.includes(needle), needle);
});
