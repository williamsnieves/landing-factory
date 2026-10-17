import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWranglerOutput } from '../scripts/parse-wrangler-output.mjs';

test('reads url and alias from wrangler ND-JSON output', () => {
  const ndjson = [
    '{"type":"wrangler-session","version":1}',
    '{"type":"pages-deploy","version":1,"url":"https://abc123.site.pages.dev","timestamp":"t"}',
    '{"type":"pages-deploy-detailed","version":1,"url":"https://abc123.site.pages.dev","alias":"https://feat.site.pages.dev"}',
  ].join('\n');
  assert.deepEqual(parseWranglerOutput(ndjson, ''), {
    url: 'https://abc123.site.pages.dev',
    alias: 'https://feat.site.pages.dev',
  });
});

test('falls back to stdout when the output file is empty', () => {
  const out =
    'Take a peek over at https://abc123.site.pages.dev\nDeployment alias URL: https://feat.site.pages.dev\n';
  assert.deepEqual(parseWranglerOutput('', out), {
    url: 'https://abc123.site.pages.dev',
    alias: 'https://feat.site.pages.dev',
  });
});

test('returns empty values when nothing is found', () => {
  assert.deepEqual(parseWranglerOutput('not json\n', 'nothing'), {
    url: '',
    alias: '',
  });
});
