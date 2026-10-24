// perfDetail(lhr): the Lighthouse performance detail QA stores next to the scores (presets[].detail).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { perfDetail } from '../scripts/qa/lighthouse.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sample = () =>
  JSON.parse(
    readFileSync(join(ROOT, 'tests/fixtures/qa/lhr-sample.json'), 'utf8'),
  );

test('every field is read from a Lighthouse 13 result (insight audits)', () => {
  const d = perfDetail(sample());
  assert.equal(d.lcpMs, 2486);
  assert.equal(
    d.lcpElement.selector,
    'main#main > section.relative > div.mx-auto > h1.font-display',
  );
  assert.match(d.lcpElement.snippet, /^<h1 /);
  assert.equal(
    d.lcpElement.label,
    'Motion that respects the people watching it.',
  );
  assert.equal(d.cls, 0);
  assert.equal(d.tbtMs, 74);
  assert.equal(d.totalByteWeightKb, 168.4);
  assert.equal(d.requestCount, 3);
  assert.deepEqual(d.images, { savingsKb: 0, items: [] });
  assert.deepEqual(d.fonts, { items: [] });
  // Same-origin URLs are stored as paths, independent of the QA server's port.
  assert.deepEqual(d.renderBlocking, [
    { url: '/_astro/BaseLayout.CyUZBW-g.css', sizeKb: 29.3, wastedMs: 302 },
  ]);
  assert.deepEqual(d.thirdParties, []);
});

test('an audit Lighthouse did not run gives null, never a guess', () => {
  const lhr = sample();
  delete lhr.audits['lcp-breakdown-insight'];
  delete lhr.audits['image-delivery-insight'];
  delete lhr.audits['font-display-insight'];
  delete lhr.audits['third-parties-insight'];
  lhr.audits['render-blocking-insight'].scoreDisplayMode = 'notApplicable';
  delete lhr.audits['network-requests'];
  const d = perfDetail(lhr);
  assert.equal(d.lcpElement, null);
  assert.equal(d.images, null);
  assert.equal(d.fonts, null);
  assert.equal(d.thirdParties, null);
  assert.equal(d.renderBlocking, null);
  assert.equal(d.requestCount, null);
  assert.equal(d.lcpMs, 2486);
  assert.deepEqual(perfDetail({ audits: {} }).cls, null);
});

test('the legacy Lighthouse audit ids are read too', () => {
  const lhr = sample();
  lhr.audits['largest-contentful-paint-element'] = {
    scoreDisplayMode: 'informative',
    details: {
      type: 'table',
      items: [
        {
          node: {
            type: 'node',
            selector: 'img.hero',
            snippet: '<img>',
            nodeLabel: 'Hero',
          },
        },
      ],
    },
  };
  lhr.audits['modern-image-formats'] = {
    scoreDisplayMode: 'metricSavings',
    details: {
      type: 'opportunity',
      overallSavingsBytes: 204800,
      items: [
        {
          url: 'http://127.0.0.1:33669/img/hero.jpg',
          totalBytes: 307200,
          wastedBytes: 204800,
        },
      ],
    },
  };
  lhr.audits['font-display'] = {
    scoreDisplayMode: 'metricSavings',
    details: {
      type: 'table',
      items: [{ url: 'https://fonts.example/f.woff2', wastedMs: 120.4 }],
    },
  };
  lhr.audits['third-party-summary'] = {
    scoreDisplayMode: 'informative',
    details: {
      type: 'table',
      items: [
        { entity: 'Example CDN', transferSize: 20480, mainThreadTime: 55.4 },
      ],
    },
  };
  const d = perfDetail(lhr);
  assert.equal(d.lcpElement.selector, 'img.hero');
  assert.deepEqual(d.images.items[0], {
    audit: 'modern-image-formats',
    url: '/img/hero.jpg',
    totalKb: 300,
    savingsKb: 200,
  });
  assert.equal(d.images.savingsKb, 200);
  assert.deepEqual(d.fonts.items, [
    { url: 'https://fonts.example/f.woff2', wastedMs: 120 },
  ]);
  assert.deepEqual(d.thirdParties, [
    { entity: 'Example CDN', sizeKb: 20, mainThreadMs: 55 },
  ]);
});
