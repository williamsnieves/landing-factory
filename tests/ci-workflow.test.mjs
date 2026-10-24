// Structure of .github/workflows/ci.yml: the landing report gates the deploy and runs live after it.
// No YAML library is a dependency, so the workflow is read as text and split by job and step.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const text = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');

/** Jobs of the workflow: { name: { steps: [{ name, body }] } }, in file order. */
function parseJobs(source) {
  const jobs = {};
  const lines = source.split('\n');
  let job = null;
  let step = null;
  for (const line of lines) {
    const jobMatch = /^ {2}([a-z][\w-]*):\s*$/.exec(line);
    if (jobMatch && lines.indexOf(line) > lines.indexOf('jobs:')) {
      job = jobMatch[1];
      jobs[job] = { steps: [], head: '' };
      step = null;
      continue;
    }
    if (!job) continue;
    const stepMatch = /^ {6}- (?:name: (.+)|uses: (.+)|run: (.+))$/.exec(line);
    if (stepMatch) {
      step = {
        name: (stepMatch[1] ?? stepMatch[2] ?? stepMatch[3]).trim(),
        body: line,
      };
      jobs[job].steps.push(step);
    } else if (step) step.body += `\n${line}`;
    else jobs[job].head += `\n${line}`;
  }
  return jobs;
}
const jobs = parseJobs(text);
const index = (job, name) => {
  const i = jobs[job].steps.findIndex((s) => s.name === name);
  assert.ok(i >= 0, `${job}: no step named "${name}"`);
  return i;
};
const stepOf = (job, name) => jobs[job].steps[index(job, name)];

test('the workflow keeps its four jobs', () => {
  assert.deepEqual(Object.keys(jobs), [
    'qa',
    'deploy',
    'sites',
    'site-qa-deploy',
  ]);
});

test('root qa job: the static report runs after QA and before the built site is uploaded', () => {
  const qa = index(
    'qa',
    'QA (build, screenshots, overflow, reduced motion, Lighthouse, impeccable)',
  );
  const report = index('qa', 'Landing report (static checks)');
  const upload = index('qa', 'Upload built site');
  assert.ok(
    qa < report && report < upload,
    'QA, then the report, then the site artifact',
  );
  assert.match(
    stepOf('qa', 'Landing report (static checks)').body,
    /run: npm run report -- --only static$/m,
  );
  assert.doesNotMatch(
    stepOf('qa', 'Landing report (static checks)').body,
    /\bif:/,
    'a failing report must stop the job',
  );
  const artifact = stepOf('qa', 'Upload landing report').body;
  assert.match(artifact, /name: landing-report$/m);
  assert.match(artifact, /if: always\(\)/);
  assert.match(
    jobs.qa.head,
    /report_static: \$\{\{ steps\.report_summary\.outputs\.static \}\}/,
  );
});

test('deploy job: the live report runs after the URL is captured, before the comment, and fails the job at the end', () => {
  const capture = index('deploy', 'Capture deployment URLs');
  const live = index('deploy', 'Landing report (live checks)');
  const comment = index('deploy', 'Comment preview URL on the pull request');
  const fail = index('deploy', 'Fail when the live report failed');
  assert.ok(capture < live && live < comment && comment < fail);
  const body = stepOf('deploy', 'Landing report (live checks)').body;
  assert.match(body, /continue-on-error: true/);
  assert.match(body, /npm run report -- --only live --url "\$DEPLOY_URL"/);
  assert.match(body, /DEPLOY_URL: \$\{\{ steps\.output\.outputs\.url \}\}/);
  assert.match(
    stepOf('deploy', 'Upload live report').body,
    /name: landing-report-live$/m,
  );
  assert.match(
    stepOf('deploy', 'Fail when the live report failed').body,
    /steps\.live_report\.outcome == 'failure'/,
  );
  // The live report is not a precondition of the deploy: it follows the Deploy step.
  assert.ok(index('deploy', 'Deploy to Cloudflare Pages') < live);
});

test('site job: static report after QA and before any deploy step, live report after the URL capture', () => {
  const job = 'site-qa-deploy';
  const qa = index(
    job,
    'QA (build, screenshots, overflow, reduced motion, Lighthouse, impeccable)',
  );
  const report = index(job, 'Landing report (static checks)');
  const gate = index(job, 'Check deploy prerequisites');
  const deploy = index(job, 'Deploy to Cloudflare Pages');
  assert.ok(qa < report && report < gate && gate < deploy);
  assert.match(
    stepOf(job, 'Landing report (static checks)').body,
    /npm run report -- --site "\$SITE" --only static$/m,
  );
  const capture = index(job, 'Capture deployment URLs');
  const live = index(job, 'Landing report (live checks)');
  const comment = index(job, 'Comment preview URL on the pull request');
  assert.ok(deploy < capture && capture < live && live < comment);
  assert.match(
    stepOf(job, 'Landing report (live checks)').body,
    /npm run report -- --site "\$SITE" --only live --url "\$DEPLOY_URL"/,
  );
  const artifact = stepOf(job, 'Upload landing report').body;
  assert.match(artifact, /name: landing-report-\$\{\{ matrix\.site \}\}$/m);
  assert.match(artifact, /!qa\/\$\{\{ matrix\.site \}\}\/report\/latest/);
});

test('both sticky comments carry the report line, and the comment markers are unchanged', () => {
  assert.equal((text.match(/- Report: static /g) ?? []).length, 2);
  assert.ok(
    text.includes("const marker = '<!-- landing-factory-preview -->';"),
  );
  assert.ok(
    text.includes('const marker = `<!-- landing-factory-preview:${site} -->`;'),
  );
});

test('no step prints a secret: the report steps use no secrets', () => {
  for (const [job, { steps }] of Object.entries(jobs))
    for (const step of steps.filter(
      (s) => /report/i.test(s.name) && s.body.includes('npm run report'),
    ))
      assert.doesNotMatch(step.body, /secrets\./, `${job}: ${step.name}`);
});

test('the workflow parses as YAML when a parser is installed', async () => {
  let parse;
  try {
    ({ parse } = await import('yaml'));
  } catch {
    return; // no YAML parser installed: the structural tests above are the check
  }
  const doc = parse(text);
  assert.deepEqual(Object.keys(doc.jobs), [
    'qa',
    'deploy',
    'sites',
    'site-qa-deploy',
  ]);
  assert.equal(doc.jobs.deploy.needs, 'qa');
  assert.ok(doc.jobs['site-qa-deploy'].steps.every((s) => s.uses || s.run));
});
