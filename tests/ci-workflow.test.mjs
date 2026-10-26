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

test('root qa job: lint runs right after Prettier and before the type checks', () => {
  const prettier = index('qa', 'Prettier');
  const lint = index('qa', 'Lint');
  assert.equal(lint, prettier + 1, 'Lint follows Prettier');
  assert.ok(lint < index('qa', 'Types and Astro diagnostics'));
  assert.match(stepOf('qa', 'Lint').body, /run: npm run lint$/m);
  assert.doesNotMatch(stepOf('qa', 'Lint').body, /\bif:|continue-on-error/);
  for (const job of ['deploy', 'sites', 'site-qa-deploy'])
    assert.ok(
      !jobs[job].steps.some((step) => step.name === 'Lint'),
      `${job} does not repeat lint`,
    );
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
  assert.match(
    body,
    /DEPLOY_URL: \$\{\{ steps\.output\.outputs\.url \|\| steps\.target_deploy\.outputs\.url \}\}/,
  );
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

const DEPLOY_JOBS = ['deploy', 'site-qa-deploy'];
const CLOUDFLARE_STEPS = {
  deploy: [
    'Read Pages project from site.config.json',
    'Ensure the Pages project exists',
    'Deploy to Cloudflare Pages',
    'Capture deployment URLs',
  ],
  'site-qa-deploy': [
    'Read Pages project from the site configuration',
    'Ensure the Pages project exists',
    'Deploy to Cloudflare Pages',
    'Capture deployment URLs',
  ],
};
const NEW_SECRETS = ['VERCEL_TOKEN', 'DEPLOY_SSH_KEY', 'DEPLOY_FTP_PASSWORD'];

for (const job of DEPLOY_JOBS) {
  test(`${job}: the target is read, then the gate, then every deploy step`, () => {
    const target = index(job, 'Read deploy target');
    const gate = index(job, 'Check deploy prerequisites');
    assert.ok(target < gate);
    for (const name of [
      ...CLOUDFLARE_STEPS[job],
      'Install lftp (FTPS fallback only)',
      "Deploy to the site's target",
    ])
      assert.ok(gate < index(job, name), `${name} follows the gate`);
    const body = stepOf(job, 'Read deploy target').body;
    assert.match(body, /id: target$/m);
    assert.match(
      body,
      job === 'deploy'
        ? /node scripts\/deploy\/config\.mjs --branch "\$BRANCH" --github-output/
        : /node scripts\/deploy\/config\.mjs --site "\$SITE" --branch "\$BRANCH" --github-output/,
    );
    assert.doesNotMatch(body, /secrets\./);
  });

  test(`${job}: the Cloudflare steps keep their commands and run only when the target dispatches to wrangler`, () => {
    for (const name of CLOUDFLARE_STEPS[job]) {
      assert.match(
        stepOf(job, name).body,
        /if: steps\.gate\.outputs\.enabled == 'true' && steps\.target\.outputs\.deploy_via == 'wrangler'/,
        name,
      );
    }
    const deploy = stepOf(job, 'Deploy to Cloudflare Pages').body;
    assert.match(
      deploy,
      job === 'deploy'
        ? /npx wrangler pages deploy dist \\/
        : /npx wrangler pages deploy "sites\/\$SITE\/dist" \\/,
    );
    assert.match(deploy, /--project-name "\$CF_PAGES_PROJECT" \\/);
    assert.match(deploy, /--branch "\$BRANCH" \\/);
    // The Cloudflare secrets stay in the job environment, as before.
    assert.match(
      jobs[job].head,
      /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/,
    );
    assert.match(
      jobs[job].head,
      /CLOUDFLARE_ACCOUNT_ID: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/,
    );
  });

  test(`${job}: the script deploy runs scripts/deploy.mjs for non-Cloudflare targets and exposes url and alias`, () => {
    const step = stepOf(job, "Deploy to the site's target").body;
    assert.match(step, /id: target_deploy$/m);
    assert.match(
      step,
      /if: steps\.gate\.outputs\.enabled == 'true' && steps\.target\.outputs\.deploy_via == 'script'/,
    );
    assert.match(
      step,
      job === 'deploy'
        ? /run: node scripts\/deploy\.mjs --branch "\$BRANCH" --github-output/
        : /run: node scripts\/deploy\.mjs --site "\$SITE" --branch "\$BRANCH" --github-output/,
    );
    const lftp = stepOf(job, 'Install lftp (FTPS fallback only)').body;
    assert.match(lftp, /steps\.target\.outputs\.needs_lftp == 'true'/);
    assert.match(lftp, /deploy_via == 'script'/);
    assert.ok(
      index(job, 'Install lftp (FTPS fallback only)') <
        index(job, "Deploy to the site's target"),
    );
    // The live report and the comment read the URL of whichever deploy ran.
    const live = stepOf(job, 'Landing report (live checks)').body;
    assert.match(
      live,
      /DEPLOY_URL: \$\{\{ steps\.output\.outputs\.url \|\| steps\.target_deploy\.outputs\.url \}\}/,
    );
    const comment = stepOf(job, 'Comment preview URL on the pull request').body;
    assert.match(
      comment,
      /DEPLOY_URL: \$\{\{ steps\.output\.outputs\.url \|\| steps\.target_deploy\.outputs\.url \}\}/,
    );
    assert.match(
      comment,
      /ALIAS_URL: \$\{\{ steps\.output\.outputs\.alias \|\| steps\.target_deploy\.outputs\.alias \}\}/,
    );
    assert.ok(
      index(job, "Deploy to the site's target") <
        index(job, 'Landing report (live checks)'),
    );
  });

  test(`${job}: the secrets gate checks the secrets of the effective target without reading their values`, () => {
    const gate = stepOf(job, 'Check deploy prerequisites').body;
    assert.match(
      gate,
      /NEEDED_SECRETS: \$\{\{ steps\.target\.outputs\.secrets \}\}/,
    );
    assert.match(
      gate,
      /DEPLOY_VIA: \$\{\{ steps\.target\.outputs\.deploy_via \}\}/,
    );
    assert.match(gate, /for name in \$NEEDED_SECRETS; do/);
    assert.match(gate, /::warning title=Deploy skipped/);
    for (const name of [
      'CLOUDFLARE_API_TOKEN',
      'CLOUDFLARE_ACCOUNT_ID',
      ...NEW_SECRETS,
    ])
      assert.match(
        gate,
        new RegExp(`HAS_${name}: \\$\\{\\{ secrets\\.${name} != '' \\}\\}`),
        name,
      );
    assert.match(gate, /Pull request from a fork/);
  });

  test(`${job}: a branch of a target without previews gets a comment when nothing is deployed`, () => {
    const step = stepOf(job, 'Comment that the target has no preview').body;
    assert.match(step, /steps\.gate\.outputs\.enabled != 'true'/);
    assert.match(step, /steps\.target\.outputs\.preview_fallback == 'true'/);
    assert.match(step, /github\.event_name == 'pull_request'/);
    assert.match(step, /No preview: the/);
    assert.doesNotMatch(step, /- Report: static /);
    assert.ok(
      index(job, 'Comment preview URL on the pull request') <
        index(job, 'Comment that the target has no preview'),
    );
    assert.ok(
      index(job, 'Comment that the target has no preview') <
        index(job, 'Fail when the live report failed'),
    );
  });
}

test('the new deploy secrets appear only in the env of the script deploy step (and as booleans in the gate)', () => {
  for (const name of NEW_SECRETS) {
    const lines = text
      .split('\n')
      .filter((line) => line.includes(`secrets.${name}`));
    assert.equal(lines.length, 4, `${name}: gate and deploy step in both jobs`);
    for (const line of lines)
      assert.match(
        line,
        new RegExp(
          `^ {10}(HAS_${name}: \\$\\{\\{ secrets\\.${name} != '' \\}\\}|${name}: \\$\\{\\{ secrets\\.${name} \\}\\})$`,
        ),
        `${name}: ${line}`,
      );
  }
  for (const job of DEPLOY_JOBS) {
    assert.doesNotMatch(
      jobs[job].head,
      new RegExp(NEW_SECRETS.join('|')),
      'not in the job env',
    );
    for (const step of jobs[job].steps) {
      const holdsSecret = NEW_SECRETS.some((n) =>
        step.body.includes(`secrets.${n} }}`),
      );
      if (holdsSecret) assert.equal(step.name, "Deploy to the site's target");
      // No run script interpolates a secret expression.
      const runBody = step.body.split(/\n {8}run: /)[1] ?? '';
      assert.doesNotMatch(runBody, /\$\{\{ secrets\./, `${job}: ${step.name}`);
    }
  }
});

test('the other jobs never touch the new deploy secrets', () => {
  for (const job of ['qa', 'sites'])
    for (const step of jobs[job].steps)
      assert.doesNotMatch(
        step.body,
        new RegExp(NEW_SECRETS.join('|')),
        `${job}: ${step.name}`,
      );
});

test('no step turns host key checking off or runs a deploy outside the target step', () => {
  assert.doesNotMatch(text, /StrictHostKeyChecking/);
  const deployCalls = text
    .split('\n')
    .filter((l) => /run: .*scripts\/deploy\.mjs/.test(l));
  assert.equal(deployCalls.length, 2);
  for (const line of deployCalls) assert.doesNotMatch(line, /--rollback/);
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
