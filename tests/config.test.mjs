import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  DEFAULT_CONFIG,
  loadConfig,
  validateConfig,
} from '../scripts/qa/config.mjs';

const read = (file) =>
  JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));

test('qa.config.json is valid and matches the roadmap defaults', () => {
  const file = read('qa.config.json');
  assert.deepEqual(validateConfig(file), []);
  assert.deepEqual(file, DEFAULT_CONFIG);
});

test('a missing config file falls back to the defaults', () => {
  const config = loadConfig('/nonexistent/qa.config.json');
  assert.deepEqual(
    config.viewports.map((v) => v.width),
    [375, 768, 1440],
  );
  assert.deepEqual(config.lighthouse.thresholds, {
    performance: 90,
    accessibility: 90,
    seo: 90,
  });
  assert.deepEqual(config.impeccable.failOn, ['major']);
});

test('invalid configs are rejected with the offending path', () => {
  const bad = structuredClone(DEFAULT_CONFIG);
  bad.lighthouse.thresholds.performance = 'high';
  bad.lighthouse.thresholds.pwa = 90;
  bad.impeccable.severityMap.error = 'catastrophic';
  bad.surprise = true;
  const errors = validateConfig(bad).join('\n');
  assert.match(errors, /lighthouse\.thresholds\.performance/);
  assert.match(errors, /lighthouse\.thresholds\.pwa/);
  assert.match(errors, /impeccable\.severityMap/);
  assert.match(errors, /config\.surprise/);
});

test('the impeccable version in qa.config.json matches agent-tooling.lock.json', () => {
  const lock = read('agent-tooling.lock.json');
  const pin = lock.tools.find((t) => t.name === 'impeccable').cli;
  assert.equal(`impeccable@${read('qa.config.json').impeccable.version}`, pin);
});

test('threeD defaults to a 200 KB gzip budget and is validated', () => {
  assert.equal(DEFAULT_CONFIG.threeD.maxGzipKb, 200);
  assert.deepEqual(validateConfig(structuredClone(DEFAULT_CONFIG)), []);
  const bad = structuredClone(DEFAULT_CONFIG);
  bad.threeD.maxGzipKb = 0;
  bad.threeD.extra = true;
  const errors = validateConfig(bad);
  assert.ok(errors.some((e) => e.startsWith('threeD.maxGzipKb')));
  assert.ok(errors.some((e) => e.startsWith('threeD.extra')));
});

test('diversity thresholds default to the calibrated values and are validated', () => {
  assert.deepEqual(DEFAULT_CONFIG.diversity, {
    minLayoutDistance: 0.2,
    maxHashMatch: 0.5,
    hashHamming: 10,
  });
  const bad = structuredClone(DEFAULT_CONFIG);
  bad.diversity.minLayoutDistance = 2;
  bad.diversity.maxHashMatch = -1;
  bad.diversity.hashHamming = 2.5;
  bad.diversity.extra = true;
  const errors = validateConfig(bad).join('\n');
  assert.match(errors, /diversity\.minLayoutDistance/);
  assert.match(errors, /diversity\.maxHashMatch/);
  assert.match(errors, /diversity\.hashHamming/);
  assert.match(errors, /diversity\.extra/);
});

test('aiImages defaults to openai gpt-image-1.5, 1536x1024, high quality and 12 per site, and is validated', () => {
  assert.deepEqual(DEFAULT_CONFIG.aiImages, {
    provider: 'openai',
    model: 'gpt-image-1.5',
    size: '1536x1024',
    quality: 'high',
    maxPerSite: 12,
  });
  assert.deepEqual(validateConfig(structuredClone(DEFAULT_CONFIG)), []);
  assert.equal(loadConfig('/nonexistent').aiImages.maxPerSite, 12);
  const bad = structuredClone(DEFAULT_CONFIG);
  bad.aiImages.provider = 'other';
  bad.aiImages.size = '10x10';
  bad.aiImages.quality = 'ultra';
  bad.aiImages.maxPerSite = -1;
  bad.aiImages.model = 'a b';
  bad.aiImages.extra = true;
  const errors = validateConfig(bad).join('\n');
  for (const key of [
    'provider',
    'size',
    'quality',
    'maxPerSite',
    'model',
    'extra',
  ])
    assert.match(errors, new RegExp(`aiImages\\.${key}`), key);
});
