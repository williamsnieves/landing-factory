// Runs the real "Check deploy prerequisites" script of ci.yml (both jobs) with simulated step outputs and
// secrets, so the dispatch for each target and the unchanged Cloudflare behavior are exercised, not just matched.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  dispatch,
  githubOutputLines,
  resolveConfig,
} from '../scripts/deploy/config.mjs';
import {
  ROOT,
  scratch,
  sharedConfig,
  vercelConfig,
  vpsConfig,
} from './deploy-helpers.mjs';

const workflow = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');

/** The `run: |` script of the gate step of a job, de-indented. */
function gateScript(job) {
  const start = workflow.indexOf(`\n  ${job}:`);
  const nextJob = workflow.slice(start + 1).search(/\n {2}[a-z][\w-]*:\n/);
  const section = workflow.slice(
    start,
    nextJob < 0 ? undefined : start + 1 + nextJob,
  );
  const at = section.indexOf('- name: Check deploy prerequisites');
  const run = section.indexOf('        run: |\n', at);
  const lines = [];
  for (const line of section
    .slice(run + '        run: |\n'.length)
    .split('\n')) {
    if (line.trim() && !line.startsWith(' '.repeat(10))) break;
    lines.push(line.slice(10));
  }
  return lines.join('\n');
}

function runGate(
  job,
  { config, branch, secrets = [], fork = false, site = 'acme' },
) {
  const d = dispatch(resolveConfig(config), branch);
  const outputs = Object.fromEntries(
    githubOutputLines(d).map((l) => l.split(/=(.*)/s).slice(0, 2)),
  );
  const dir = scratch('gate');
  const out = join(dir, 'out');
  const summary = join(dir, 'summary');
  writeFileSync(out, '');
  writeFileSync(summary, '');
  const env = {
    PATH: process.env.PATH,
    GITHUB_OUTPUT: out,
    GITHUB_STEP_SUMMARY: summary,
    IS_FORK: String(fork),
    SITE: site,
    TARGET: outputs.target,
    EFFECTIVE_TARGET: outputs.effective_target,
    DEPLOY_VIA: outputs.deploy_via,
    NEEDED_SECRETS: outputs.secrets,
  };
  for (const name of [
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'VERCEL_TOKEN',
    'DEPLOY_SSH_KEY',
    'DEPLOY_FTP_PASSWORD',
  ])
    env[`HAS_${name}`] = String(secrets.includes(name));
  const result = spawnSync('bash', ['-e', '-c', gateScript(job)], {
    env,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const values = Object.fromEntries(
    readFileSync(out, 'utf8')
      .trim()
      .split('\n')
      .map((l) => l.split(/=(.*)/s).slice(0, 2)),
  );
  return {
    ...values,
    stdout: result.stdout,
    summary: readFileSync(summary, 'utf8'),
  };
}

const CF = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];
const cloudflare = {
  target: 'cloudflare',
  cloudflare: { pagesProject: 'acme', productionBranch: 'main' },
};

for (const job of ['deploy', 'site-qa-deploy']) {
  test(`${job} gate: a Cloudflare site deploys with both secrets and warns with the original text without them`, () => {
    for (const branch of ['main', 'change/x']) {
      const ok = runGate(job, { config: cloudflare, branch, secrets: CF });
      assert.equal(ok.enabled, 'true');
      assert.equal(ok.skip, '');
    }
    const none = runGate(job, { config: cloudflare, branch: 'change/x' });
    assert.equal(none.enabled, 'false');
    assert.equal(none.skip, 'missing');
    assert.match(
      none.stdout,
      /::warning title=Deploy skipped(?: \(acme\))?::Missing GitHub secret\(s\): CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID\. Add them under Settings > Secrets and variables > Actions \(see README, Deployment\)\./,
    );
    const one = runGate(job, {
      config: cloudflare,
      branch: 'main',
      secrets: ['CLOUDFLARE_ACCOUNT_ID'],
    });
    assert.match(
      one.stdout,
      /Missing GitHub secret\(s\): CLOUDFLARE_API_TOKEN\./,
    );
  });

  test(`${job} gate: a fork never deploys`, () => {
    const forked = runGate(job, {
      config: cloudflare,
      branch: 'change/x',
      secrets: CF,
      fork: true,
    });
    assert.equal(forked.enabled, 'false');
    assert.equal(forked.skip, 'fork');
    assert.match(forked.stdout, /Pull request from a fork/);
  });

  test(`${job} gate: Vercel needs VERCEL_TOKEN on every branch`, () => {
    for (const branch of ['main', 'change/x']) {
      assert.equal(
        runGate(job, {
          config: vercelConfig(),
          branch,
          secrets: ['VERCEL_TOKEN'],
        }).enabled,
        'true',
      );
      const missing = runGate(job, {
        config: vercelConfig(),
        branch,
        secrets: CF,
      });
      assert.equal(missing.enabled, 'false');
      assert.match(
        missing.stdout,
        /Missing GitHub secret\(s\): VERCEL_TOKEN\./,
      );
    }
  });

  test(`${job} gate: a VPS site needs the SSH key on main and the Cloudflare secrets on a branch`, () => {
    assert.equal(
      runGate(job, {
        config: vpsConfig(),
        branch: 'main',
        secrets: ['DEPLOY_SSH_KEY'],
      }).enabled,
      'true',
    );
    const mainMissing = runGate(job, {
      config: vpsConfig(),
      branch: 'main',
      secrets: CF,
    });
    assert.equal(mainMissing.enabled, 'false');
    assert.match(
      mainMissing.stdout,
      /Missing GitHub secret\(s\): DEPLOY_SSH_KEY\./,
    );
    assert.equal(
      runGate(job, { config: vpsConfig(), branch: 'change/x', secrets: CF })
        .enabled,
      'true',
    );
    const branch = runGate(job, {
      config: vpsConfig(),
      branch: 'change/x',
      secrets: ['DEPLOY_SSH_KEY'],
    });
    assert.equal(branch.enabled, 'false');
    assert.equal(branch.skip, 'missing');
    assert.match(branch.stdout, /CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID/);
  });

  test(`${job} gate: previews none deploys nothing on a branch and says so`, () => {
    const config = { ...vpsConfig(), previews: 'none' };
    const branch = runGate(job, {
      config,
      branch: 'change/x',
      secrets: [...CF, 'DEPLOY_SSH_KEY'],
    });
    assert.equal(branch.enabled, 'false');
    assert.equal(branch.skip, 'no-preview');
    assert.match(branch.stdout, /no preview/);
    assert.equal(
      runGate(job, { config, branch: 'main', secrets: ['DEPLOY_SSH_KEY'] })
        .enabled,
      'true',
    );
  });

  test(`${job} gate: shared hosting asks for the FTP password only over FTPS`, () => {
    assert.equal(
      runGate(job, {
        config: sharedConfig(),
        branch: 'main',
        secrets: ['DEPLOY_SSH_KEY'],
      }).enabled,
      'true',
    );
    const ftps = sharedConfig({ protocol: 'ftps', port: undefined });
    delete ftps.shared.hostKey;
    assert.equal(
      runGate(job, {
        config: ftps,
        branch: 'main',
        secrets: ['DEPLOY_FTP_PASSWORD'],
      }).enabled,
      'true',
    );
    assert.equal(
      runGate(job, {
        config: ftps,
        branch: 'main',
        secrets: ['DEPLOY_SSH_KEY'],
      }).enabled,
      'false',
    );
  });
}
