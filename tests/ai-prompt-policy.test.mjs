// Tests for scripts/lib/ai-prompt-policy.mjs: one test per rule, in English and Spanish, and prompts that pass.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  brandNames,
  checkPrompt,
  formatViolations,
  normalize,
} from '../scripts/lib/ai-prompt-policy.mjs';

const brief = JSON.parse(
  readFileSync(new URL('./fixtures/brief/brief.json', import.meta.url), 'utf8'),
);
// A tech-product brief like the spec's example.
const tech = {
  business: { name: 'Tupath Digital' },
  offer: [{ name: 'Meshy 54 3D models' }, { name: 'AI' }],
};
const rules = (prompt, b = null) => checkPrompt(prompt, b).map((v) => v.rule);

test('allowed: abstract art, textures and generic objects pass', () => {
  for (const prompt of [
    'An abstract gradient of light and glass shapes',
    'Macro texture of brushed aluminium, soft studio light',
    'A single ceramic cup on a linen cloth, top view',
    'Un degradado abstracto de luz y formas de cristal',
    'Textura de papel artesanal con fibras visibles',
    'Isometric illustration of a floating island with a tiny lighthouse',
    'A personal computer made of paper, flat colours',
  ])
    assert.deepEqual(checkPrompt(prompt, brief), [], prompt);
});

test('brand: the business name or a product name from the brief is refused, accents and case aside', () => {
  const found = checkPrompt('Hero art for meshy 54 3d MODELS, glowing', tech);
  assert.deepEqual(
    found.map((v) => v.rule),
    ['brand'],
  );
  assert.match(found[0].reason, /Meshy 54 3D models/);
  assert.deepEqual(rules('Neon sign saying TUPATH digital', tech), ['brand']);
  assert.deepEqual(rules('Una escena para Taller Plantilla', brief), ['brand']);
  assert.deepEqual(rules('curso orden en 5 dias', brief), ['brand']);
  // Names shorter than 4 characters are not matched ("AI"), and no brief means nothing to match.
  assert.deepEqual(rules('An AI themed abstract pattern', tech), []);
  assert.deepEqual(rules('Meshy 54 3D models', null), []);
  assert.deepEqual(
    brandNames(tech).map((n) => n.normal),
    ['tupath digital', 'meshy 54 3d models'],
  );
});

test('people: team, staff, customers, founder, owner, testimonials and reviews, in English and Spanish', () => {
  for (const prompt of [
    'Our team working together at a desk',
    'Photo of the staff in front of the shop',
    'Smiling customers holding the product',
    'our clients celebrating',
    'The founder at her desk',
    'A CEO portrait in an office',
    'The shop owner behind the counter',
    'A testimonial card with five stars',
    'Customer reviews on a wall',
    'El equipo de trabajo en la oficina',
    'Los empleados sonriendo',
    'Nuestros clientes en la tienda',
    'La fundadora en su despacho',
    'El dueño de la panadería',
    'Un testimonio con cinco estrellas',
    'Reseñas de clientes en una pared',
    'Clientes de la clínica',
  ])
    assert.ok(rules(prompt).includes('people'), prompt);
});

test('identity: logo, brand mark and packaging of ours', () => {
  for (const prompt of [
    'A logo on a white wall',
    'The brand mark in gold foil',
    'Brand-mark embossed on leather',
    'Un logotipo minimalista',
    'El isotipo de la empresa',
    'Packaging of our product line',
    'Empaque de nuestros productos',
    'La marca registrada en relieve',
  ])
    assert.ok(rules(prompt).includes('identity'), prompt);
  assert.ok(!rules('Una marca de agua sutil en papel').includes('identity'));
});

test('results: before and after, results of', () => {
  for (const prompt of [
    'Before and after of a smile',
    'before/after comparison of skin',
    'Antes y después de la reforma',
    'Results of the treatment',
    'Resultados de la dieta en 30 días',
  ])
    assert.ok(rules(prompt).includes('results'), prompt);
});

test('real-person: a portrait or photo of a named person, a celebrity, a famous person', () => {
  for (const prompt of [
    'A portrait of Albert Einstein, oil painting',
    'Photo of Marie Curie in her lab',
    'Retrato de Frida Kahlo',
    'A celebrity on a red carpet',
    'Una persona famosa en un escenario',
    'A famous person at a podium',
    'A likeness of a pop singer',
  ])
    assert.ok(rules(prompt).includes('real-person'), prompt);
  // A portrait of a generic subject or a place is fine.
  assert.deepEqual(rules('A portrait of a fox in watercolour'), []);
  assert.deepEqual(rules('Photo of the sea at dawn'), []);
});

test('formatViolations names every rule with the match and the reason', () => {
  const text = formatViolations(checkPrompt('Our team and the logo', null));
  assert.match(text, /\[people\] "team"/);
  assert.match(text, /\[identity\] "logo"/);
  assert.equal(normalize('  Dueño—Ñandú  '), 'dueno nandu');
});
