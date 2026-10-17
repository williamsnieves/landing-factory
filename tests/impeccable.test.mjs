import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../scripts/qa/config.mjs';
import { parseFindings } from '../scripts/qa/impeccable.mjs';

const { severityMap, failOn } = DEFAULT_CONFIG.impeccable;
const sample = (name) =>
  readFileSync(
    new URL(`./fixtures/impeccable/${name}`, import.meta.url),
    'utf8',
  );

// detect-findings.json is real `impeccable@4.6.0 detect --json` output (only the file path was
// rewritten); detect-clean.json is the real output for src/ at the time of writing.
test('parses real detect output and maps severities', () => {
  const findings = parseFindings(sample('detect-findings.json'), {
    severityMap,
  });
  assert.equal(findings.length, 5);
  const byRule = (rule) => findings.filter((f) => f.rule === rule);
  assert.equal(byRule('gradient-text').length, 2);
  assert.equal(byRule('gradient-text')[0].severity, 'warning');
  assert.equal(byRule('gradient-text')[0].level, 'minor');
  assert.equal(byRule('bounce-easing')[0].level, 'info');
  assert.equal(
    byRule('overused-font')[0].file,
    'tests/fixtures/qa-sample/bad.html',
  );
  assert.equal(
    findings.filter((f) => failOn.includes(f.level)).length,
    0,
    'warnings and advisories alone must not fail QA',
  );
});

test('a clean run parses to no findings', () => {
  assert.deepEqual(
    parseFindings(sample('detect-clean.json'), { severityMap }),
    [],
  );
});

test('error severity maps to major, which fails by default', () => {
  const synthetic = [
    {
      antipattern: 'made-up-rule',
      severity: 'error',
      file: 'src/a.astro',
      line: 7,
      snippet: 'x',
    },
  ];
  const [finding] = parseFindings(synthetic, { severityMap });
  assert.equal(finding.level, 'major');
  assert.ok(failOn.includes(finding.level));
  assert.equal(finding.line, 7);
});

test('advisory flag always wins and unknown severities are treated as major', () => {
  const [advisory, unknown] = parseFindings(
    [
      { antipattern: 'a', severity: 'error', advisory: true },
      { antipattern: 'b', severity: 'catastrophic' },
    ],
    { severityMap },
  );
  assert.equal(advisory.level, 'info');
  assert.equal(unknown.level, 'major');
  assert.equal(unknown.unmappedSeverity, true);
});

test('tolerates a wrapped array and rejects unexpected shapes loudly', () => {
  assert.equal(
    parseFindings(
      { findings: [{ antipattern: 'a', severity: 'warning' }] },
      { severityMap },
    ).length,
    1,
  );
  assert.throws(
    () => parseFindings('{"nope": 1}', { severityMap }),
    /unexpected shape/,
  );
  assert.throws(
    () => parseFindings('not json', { severityMap }),
    /not valid JSON/,
  );
});
