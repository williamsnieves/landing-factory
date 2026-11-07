// Map coordinates of the brief (design: openspec/changes/add-maps/design.md): contact.geo and contact.mapInteractive.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PROSPECT_FACT_FIELDS,
  emptyBrief,
  missingFields,
  summarizeBrief,
  uncoveredProspectFacts,
  validateBrief,
} from '../scripts/lib/brief-schema.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixture = (name) =>
  JSON.parse(
    readFileSync(join(ROOT, 'tests/fixtures', name, 'brief.json'), 'utf8'),
  );
const options = {
  baseDir: join(ROOT, 'tests/fixtures/brief'),
  patternsDir: join(ROOT, 'patterns'),
};
const paths = (errors) => errors.map((e) => e.path);

test('valid coordinates, with and without zoom, and the interactive flag', () => {
  const brief = fixture('brief');
  brief.contact.geo = { lat: 41.6563, lng: -0.8784 };
  assert.deepEqual(validateBrief(brief, options), []);
  brief.contact.geo.zoom = 18;
  brief.contact.mapInteractive = true;
  assert.deepEqual(validateBrief(brief, options), []);
});

test('the skeleton still validates and an out-of-range value names its field', () => {
  assert.deepEqual(
    validateBrief(emptyBrief({ language: 'en', niche: 'x' }), options).filter(
      (e) => e.path.startsWith('contact'),
    ),
    [],
  );
  const brief = fixture('brief');
  brief.contact.geo = { lat: 95, lng: -200, zoom: 11 };
  assert.deepEqual(paths(validateBrief(brief, options)), [
    'contact.geo.lat',
    'contact.geo.lng',
    'contact.geo.zoom',
  ]);
  brief.contact.geo = { lat: 'north', lng: 1, zoom: 15.5 };
  assert.deepEqual(paths(validateBrief(brief, options)), [
    'contact.geo.lat',
    'contact.geo.zoom',
  ]);
});

test('latitude and longitude come together; unknown keys fail', () => {
  const brief = fixture('brief');
  brief.contact.geo = { lat: 41.6 };
  assert.deepEqual(paths(validateBrief(brief, options)), ['contact.geo.lng']);
  brief.contact.geo = { lat: '', lng: '', zoom: 16 };
  assert.deepEqual(paths(validateBrief(brief, options)), ['contact.geo.lat']);
  brief.contact.geo = { lat: 0, lng: 0, altitude: 3 };
  assert.deepEqual(paths(validateBrief(brief, options)), [
    'contact.geo.altitude',
  ]);
});

test('on a prospect brief contact.geo is a fact: it needs a source or an assumed entry', () => {
  assert.ok(PROSPECT_FACT_FIELDS.includes('contact.geo'));
  const brief = fixture('prospect');
  brief.contact.geo = { lat: 37.4, lng: -5.99 };
  const bare = uncoveredProspectFacts(brief);
  assert.deepEqual(bare, ['contact.geo']);
  assert.deepEqual(paths(validateBrief(brief, options)), ['contact.geo']);
  brief.prospect.sources.push({
    field: 'contact.geo',
    url: 'https://www.openstreetmap.org/#map=17/37.4/-5.99',
    retrieved: '2026-11-07',
  });
  assert.deepEqual(uncoveredProspectFacts(brief), []);
  brief.prospect.sources.pop();
  brief.assumed.push({ field: 'contact.geo', reason: 'read from the map' });
  assert.ok(!uncoveredProspectFacts(brief).includes('contact.geo'));
});

test('missing asks for the coordinates right after the address, and only with an address', () => {
  const brief = fixture('brief');
  brief.contact.address = 'Calle Alameda 12, Sevilla';
  brief.contact.geo = { lat: '', lng: '', zoom: '' };
  const asked = missingFields(brief).map((f) => f.path);
  assert.ok(asked.includes('contact.geo'));
  const order = missingFields(brief).filter((f) => !f.required);
  const at = order.findIndex((f) => f.path === 'contact.geo');
  assert.ok(at >= 0);
  brief.contact.address = '';
  assert.ok(!missingFields(brief).some((f) => f.path === 'contact.geo'));
  brief.contact.address = 'Calle Alameda 12';
  brief.contact.geo = { lat: 1, lng: 2 };
  assert.ok(!missingFields(brief).some((f) => f.path === 'contact.geo'));
});

test('summary shows the coordinates, the default zoom and the interactive map', () => {
  const brief = fixture('brief');
  brief.contact.geo = { lat: 41.6563, lng: -0.8784 };
  brief.contact.mapInteractive = true;
  const text = summarizeBrief(brief);
  assert.match(text, /Contact geo: 41\.6563, -0\.8784, zoom 16/);
  assert.match(text, /Interactive map: yes/);
  brief.assumed = [{ field: 'contact.geo', reason: 'chosen' }];
  assert.match(summarizeBrief(brief), /zoom 16 \(assumed\)/);
});
