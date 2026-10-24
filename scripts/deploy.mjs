#!/usr/bin/env node
// Publish a site's static build to its deploy target: Vercel, a VPS or shared hosting (Cloudflare Pages stays in
// the workflow's wrangler steps). Real deploys run only from CI; locally only --dry-run works.
//
//   node scripts/deploy.mjs [--site <slug>] [--branch <name>] [--dist <dir>] [--dry-run] [--json] [--github-output]
//   node scripts/deploy.mjs --site <slug> --rollback [--dry-run]      (vps only)
//   node scripts/deploy.mjs --site <slug> --print-config             (the generated header configuration)
//
// Credentials come only from the environment (VERCEL_TOKEN, DEPLOY_SSH_KEY, DEPLOY_FTP_PASSWORD) and never
// reach an argument, an output line, a file in the repository or an error. VERCEL_API_URL overrides the API
// base (tests). On success the last stdout line is JSON: { target, environment, url, aliasUrl? }.
// Exit codes: 0 ok, 1 refused or failed, 2 bad usage or invalid configuration.
// Design: openspec/changes/add-deploy-adapters/design.md.
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  ConfigError,
  loadSiteConfig,
  targetSection,
} from './deploy/config.mjs';
import { BuildMissing, listBuild } from './deploy/files.mjs';
import { PASSWORD_VARIABLE, planFtps } from './deploy/ftps.mjs';
import { generateHeaderConfig, parseHeadersFile } from './deploy/headers.mjs';
import { buildPlan, hostOf, renderPlan } from './deploy/plan.mjs';
import { redact, secretValues } from './deploy/redact.mjs';
import {
  KEY_VARIABLE,
  RsyncError,
  localTransport,
  planRollback,
  planShared,
  planVps,
  releaseId,
  runSteps,
  sshTransport,
  stageBuild,
  withSession,
  withTempDir,
} from './deploy/rsync.mjs';
import { VercelError, deployToVercel } from './deploy/vercel.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

class Refused extends Error {}
class Usage extends Error {}

const HELP = `Usage: node scripts/deploy.mjs [--site <slug>] [--branch <name>] [--dist <dir>] [--dry-run] [--json] [--github-output]
       node scripts/deploy.mjs --site <slug> --rollback [--dry-run]
       node scripts/deploy.mjs --site <slug> --print-config

Publishes the site's build (sites/<slug>/dist, or dist/ for the starter) to the target in site.config.json:
vercel, vps or shared. Real deploys run only from CI (CI=true and GITHUB_ACTIONS=true); --dry-run prints the
plan (files, sizes, generated header configuration, commands without secrets) and changes nothing.
Secrets are read from the environment only: VERCEL_TOKEN, DEPLOY_SSH_KEY, DEPLOY_FTP_PASSWORD.
Exit codes: 0 ok, 1 refused or failed, 2 bad usage or invalid configuration.`;

const isCI = (env) => env.CI === 'true' && env.GITHUB_ACTIONS === 'true';

function summary(env, text) {
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(env.GITHUB_STEP_SUMMARY, `${text}\n`);
}

export async function main(argv, io = console, deps = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        branch: { type: 'string' },
        dist: { type: 'string' },
        'dry-run': { type: 'boolean' },
        json: { type: 'boolean' },
        rollback: { type: 'boolean' },
        'github-output': { type: 'boolean' },
        'print-config': { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    io.error(`deploy: ${error.message}\n\n${HELP}`);
    return 2;
  }
  const { values } = parsed;
  const env = deps.env ?? process.env;
  const secrets = secretValues(env);
  // Belt and braces: nothing printed may contain a credential.
  const out = {
    log: (m) => io.log(redact(m, secrets)),
    error: (m) => io.error(redact(m, secrets)),
  };
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  try {
    return await run({ values, env, io: out, deps, secrets });
  } catch (error) {
    if (error instanceof Usage) {
      out.error(`deploy: ${error.message}\n\n${HELP}`);
      return 2;
    }
    if (error instanceof ConfigError) {
      out.error(`deploy: ${error.message}`);
      return 2;
    }
    out.error(`deploy: ${error.message}`);
    return 1;
  }
}

async function run({ values, env, io, deps, secrets }) {
  const root =
    deps.root ??
    (env.LANDING_FACTORY_ROOT ? resolve(env.LANDING_FACTORY_ROOT) : ROOT);
  const slug = values.site ?? '';
  if (slug && !SLUG_PATTERN.test(slug))
    throw new Usage(`"${slug}" is not a valid site slug`);
  if (values.rollback && values['print-config'])
    throw new Usage('--rollback and --print-config do not combine');
  const dryRun = Boolean(values['dry-run']);

  const config = loadSiteConfig(root, slug);
  const section =
    config.target === 'cloudflare' ? config.cloudflare : targetSection(config);
  if (values.rollback && config.target !== 'vps')
    throw new Usage(
      `--rollback applies to the vps target only (this site deploys to ${config.target})`,
    );

  if (!dryRun && !values['print-config'] && !isCI(env))
    throw new Refused(
      'deploys run only from CI (CI=true and GITHUB_ACTIONS=true); use --dry-run to see the plan',
    );
  if (deps.localRoot && !env.NODE_TEST_CONTEXT)
    throw new Refused('the local transport is for tests only');

  if (config.target === 'cloudflare') {
    if (dryRun || values['print-config']) {
      io.log(
        'deploy: Cloudflare Pages is deployed by the wrangler steps of the workflow; nothing to do here.',
      );
      return 0;
    }
    throw new Refused(
      'the cloudflare target is deployed by the wrangler steps of the workflow, not by this command',
    );
  }

  const dist = resolve(
    values.dist ??
      (slug ? join(root, 'sites', slug, 'dist') : join(root, 'dist')),
  );
  const headersFile = join(dist, '_headers');
  const files = listBuild(dist);
  if (!existsSync(headersFile))
    throw new Refused(
      `${relative(root, headersFile)} is missing; build the site first`,
    );
  const rules = parseHeadersFile(readFileSync(headersFile, 'utf8'));

  if (values['print-config']) {
    const options =
      config.target === 'vps'
        ? { site: hostOf(section.url), root: `${section.path}/current` }
        : {};
    for (const [name, content] of Object.entries(
      generateHeaderConfig(config.target, rules, options),
    ))
      io.log(`# --- ${name} ---\n${content.trimEnd()}\n`);
    return 0;
  }

  const branch =
    values.branch ?? (env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || '');
  const productionBranch = section.productionBranch;
  const environment =
    !branch || branch === productionBranch ? 'production' : 'preview';
  const commit = env.COMMIT_SHA || env.GITHUB_SHA || '';
  if (!dryRun && config.target !== 'vercel' && environment !== 'production')
    throw new Refused(
      `${config.target} deploys publish from ${productionBranch} only (this run is on ${branch}); previews are not available for this target`,
    );

  const plan = buildPlan({
    config,
    slug,
    dist: relative(root, dist) || '.',
    files,
    rules,
    environment,
    branch,
    commit,
    now: deps.now,
    secretsPresent: Object.fromEntries(
      ['VERCEL_TOKEN', KEY_VARIABLE, PASSWORD_VARIABLE].map((n) => [
        n,
        Boolean(env[n]),
      ]),
    ),
    rollback: Boolean(values.rollback),
  });

  if (dryRun) {
    if (!branch)
      plan.notes.push(
        `no branch given; assuming ${productionBranch} (production)`,
      );
    io.log(values.json ? JSON.stringify(plan) : renderPlan(plan));
    return 0;
  }

  const log = (m) => io.error(`deploy: ${m}`);
  let result;
  try {
    result =
      config.target === 'vercel'
        ? await deployVercel({
            config,
            dist,
            files,
            rules,
            environment,
            branch,
            commit,
            env,
            deps,
            log,
          })
        : await deploySsh({
            config,
            section,
            dist,
            values,
            env,
            deps,
            secrets,
            log,
            commit,
          });
  } catch (error) {
    if (error instanceof VercelError || error instanceof RsyncError) {
      io.error(`deploy: ${error.message}`);
      return error.code === 'no-token' ||
        error.code === 'no-key' ||
        error.code === 'bad-key'
        ? 2
        : 1;
    }
    throw error;
  }
  const done = { target: config.target, environment, ...result };
  io.log(JSON.stringify(done));
  if (values['github-output'] && env.GITHUB_OUTPUT)
    appendFileSync(
      env.GITHUB_OUTPUT,
      `url=${done.url}\nalias=${done.aliasUrl ?? ''}\nenvironment=${environment}\n`,
    );
  summary(
    env,
    [
      `### Deployment: ${config.target}${slug ? ` (${slug})` : ''}`,
      '',
      `- Environment: ${environment}`,
      `- Branch: \`${branch}\``,
      `- URL: ${done.url}`,
    ]
      .concat(done.aliasUrl ? [`- Alias: ${done.aliasUrl}`] : [])
      .concat(done.release ? [`- Release: \`${done.release}\``] : [])
      .join('\n'),
  );
  return 0;
}

async function deployVercel({
  config,
  dist,
  files,
  rules,
  environment,
  branch,
  commit,
  env,
  deps,
  log,
}) {
  const json = generateHeaderConfig('vercel', rules)['vercel.json'];
  const bytes = Buffer.from(json);
  const all = [
    ...files.filter((f) => f.path !== 'vercel.json'),
    {
      path: 'vercel.json',
      size: bytes.length,
      sha1: createHash('sha1').update(bytes).digest('hex'),
      content: bytes,
    },
  ];
  const deployed = await deployToVercel({
    dist,
    files: all,
    project: config.vercel.project,
    team: config.vercel.team,
    production: environment === 'production',
    branch,
    commit,
    token: env.VERCEL_TOKEN,
    baseUrl: env.VERCEL_API_URL,
    fetchImpl: deps.fetchImpl,
    pollMs: deps.pollMs,
    timeoutMs: deps.timeoutMs,
    log,
  });
  return {
    url: deployed.url,
    ...(deployed.aliasUrl ? { aliasUrl: deployed.aliasUrl } : {}),
  };
}

async function deploySsh({
  config,
  section,
  dist,
  values,
  env,
  deps,
  secrets,
  log,
  commit,
}) {
  const ftps = config.target === 'shared' && section.protocol === 'ftps';
  const { planVps, planRollback, planShared } =
    await import('./deploy/rsync.mjs');
  const { planFtps } = await import('./deploy/ftps.mjs');
  const run = (steps, extra = {}) =>
    runSteps(steps, {
      secrets,
      log,
      bins: deps.bins,
      source: env,
      exec: deps.exec,
      ...extra,
    });
  const headers = parseHeadersFile(
    readFileSync(join(dist, '_headers'), 'utf8'),
  );

  const withTransport = async (fn) => {
    if (ftps) {
      if (!env[PASSWORD_VARIABLE])
        throw new RsyncError(
          `${PASSWORD_VARIABLE} is not set; export it in the environment (never pass it as an argument)`,
          'no-key',
        );
      return withTempDir(deps.tmpBase, (dir) => fn({ dir }));
    }
    return withSession(
      { key: env[KEY_VARIABLE], hostKey: section.hostKey, base: deps.tmpBase },
      ({ keyPath, knownHostsPath, dir }) =>
        fn({
          dir,
          transport: deps.localRoot
            ? localTransport(deps.localRoot)
            : sshTransport({ ...section, keyPath, knownHostsPath }),
        }),
    );
  };

  if (values.rollback)
    return withTransport(async ({ transport }) => {
      const previous = await run(planRollback({ vps: section, transport }));
      return { url: section.url, release: previous, action: 'rollback' };
    });

  if (config.target === 'vps')
    return withTransport(async ({ transport }) => {
      const id = releaseId(deps.now ?? new Date(), commit);
      await run(planVps({ vps: section, dist, id, transport }));
      return { url: section.url, release: id };
    });

  return withTransport(async ({ dir, transport }) => {
    const staging = stageBuild(
      dist,
      dir,
      generateHeaderConfig('shared', headers),
    );
    await run(
      ftps
        ? planFtps({ shared: section, staging })
        : planShared({ shared: section, staging, transport }),
    );
    return { url: section.url };
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(redact(error?.message ?? error, secretValues(process.env)));
      process.exitCode = 2;
    },
  );
}
