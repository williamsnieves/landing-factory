// docs/deploy guides: each names its secrets, matches the configuration shape and ends with the report command.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { resolveConfig } from '../scripts/deploy/config.mjs';
import { ROOT } from './deploy-helpers.mjs';

const GUIDES = {
  'cloudflare.md': ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
  'vercel.md': ['VERCEL_TOKEN'],
  'vps.md': ['DEPLOY_SSH_KEY'],
  'shared-hosting.md': ['DEPLOY_SSH_KEY', 'DEPLOY_FTP_PASSWORD'],
};
const REPORT = 'npm run report -- --site <slug> --url https://<domain>';
const read = (name) => readFileSync(join(ROOT, 'docs/deploy', name), 'utf8');

for (const [name, secrets] of Object.entries(GUIDES)) {
  test(`${name} names its secrets and ends with the report on the final URL`, () => {
    const text = read(name);
    for (const secret of secrets)
      assert.ok(text.includes(`\`${secret}\``), secret);
    const trimmed = text.trimEnd();
    assert.ok(trimmed.endsWith('```'), 'the last thing is a code block');
    const blocks = trimmed.split('```');
    assert.equal(
      blocks
        .at(-2)
        .trim()
        .replace(/^bash\n/, ''),
      REPORT,
    );
    assert.match(
      trimmed.slice(0, trimmed.lastIndexOf('```', trimmed.length - 4)),
      /Point the domain and run the report/,
    );
  });

  test(`${name} never asks to paste a secret into a chat or commit it`, () => {
    const text = read(name);
    assert.match(text, /[Nn]ever (paste|commit)/);
    assert.doesNotMatch(text, /StrictHostKeyChecking=no/);
  });
}

test('the configuration examples in the guides are valid configurations', () => {
  for (const name of Object.keys(GUIDES)) {
    const blocks = [...read(name).matchAll(/```json\n([\s\S]*?)```/g)].map(
      (m) => m[1],
    );
    for (const block of blocks) {
      const raw = JSON.parse(block);
      // The pinned keys are shown as AAAA...: swap in a well-formed key before validating.
      const fix = (section) => {
        if (section?.hostKey)
          section.hostKey = section.hostKey.replace(
            'AAAA...',
            'AAAAC3NzaC1lZDI1NTE5AAAAIexample',
          );
        if (section?.url)
          section.url = section.url.replace('acme.com', 'acme.com');
      };
      fix(raw.vps);
      fix(raw.shared);
      if (raw.vercel?.team) raw.vercel.team = 'team_example1';
      assert.doesNotThrow(
        () => resolveConfig(raw),
        `${name}: ${block.slice(0, 40)}`,
      );
    }
  }
});

test('the guides cover what the proposal promises', () => {
  const vps = read('vps.md');
  for (const word of [
    'Hostinger',
    'DigitalOcean',
    'Caddy',
    'Nginx',
    'Certbot',
    'ufw',
    'authorized_keys',
    'ssh-keyscan',
    'rollback',
    'A` record',
  ])
    assert.ok(vps.includes(word), word);
  const shared = read('shared-hosting.md');
  for (const word of [
    'hPanel',
    '65002',
    'public_html',
    'FTPS',
    'SSH Access',
    'SSL',
  ])
    assert.ok(shared.includes(word), word);
  assert.match(read('vercel.md'), /Settings > Domains/);
});
