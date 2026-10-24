// The deploy plan: what a run would do, built without touching the network or the server. A dry run prints it;
// a real run executes the same steps. Credentials appear by name only. Design: Decision 2.
import { generateHeaderConfig } from './headers.mjs';
import { formatBytes, totalBytes } from './files.mjs';
import { planFtps } from './ftps.mjs';
import {
  displayArgv,
  planRollback,
  planShared,
  planVps,
  releaseId,
  sshTransport,
} from './rsync.mjs';
import { buildDeployment, describeRequests } from './vercel.mjs';

export const TMP = '<tmp>';

/** Host name of a URL, for the generated server snippets. */
export const hostOf = (url) => new URL(url).hostname;

/**
 * Build the plan. `files` is listBuild(dist); `rules` the parsed `_headers`. Returns
 * { target, environment, branch, files, generated, steps: [{ title, command }], requests, secrets, notes, url }.
 */
export function buildPlan({
  config,
  slug,
  dist,
  files,
  rules,
  environment,
  branch,
  commit = '',
  now = new Date(),
  secretsPresent = {},
  rollback = false,
}) {
  const target = config.target;
  const plan = {
    target,
    site: slug || '(starter)',
    environment,
    branch,
    dist,
    files: { count: files.length, bytes: totalBytes(files) },
    generated: {},
    steps: [],
    requests: [],
    secrets: [],
    notes: [],
    url: '',
  };
  const secret = (name) =>
    plan.secrets.push({ name, present: Boolean(secretsPresent[name]) });

  if (target === 'cloudflare') {
    plan.notes.push(
      'Cloudflare Pages is deployed by the wrangler steps of the workflow (npx wrangler pages deploy), not by this command.',
    );
    return plan;
  }

  if (target === 'vercel') {
    const generated = generateHeaderConfig('vercel', rules);
    plan.generated = generated;
    const json = Buffer.from(generated['vercel.json']);
    const all = [...files, { path: 'vercel.json', size: json.length }];
    plan.files = { count: all.length, bytes: totalBytes(all) };
    const production = environment === 'production';
    plan.requests = describeRequests({
      team: config.vercel.team,
      files: [...files, { sha1: 'generated-vercel-json' }],
      production,
    });
    const body = buildDeployment({
      project: config.vercel.project,
      files: [],
      production,
      branch,
      commit,
    });
    plan.steps.push({
      title: `create the ${production ? 'production' : 'preview'} deployment (body without the file list)`,
      command: JSON.stringify({ ...body, files: `<${all.length} files>` }),
    });
    secret('VERCEL_TOKEN');
    return plan;
  }

  const section = config[target];
  plan.url = section.url;
  const id = releaseId(now, commit);
  const placeholders = {
    keyPath: `${TMP}/id`,
    knownHostsPath: `${TMP}/known_hosts`,
  };
  const transport = sshTransport({ ...section, ...placeholders });
  let steps;
  if (target === 'vps') {
    plan.generated = generateHeaderConfig('vps', rules, {
      site: hostOf(section.url),
      root: `${section.path}/current`,
    });
    steps = rollback
      ? planRollback({ vps: section, transport })
      : planVps({ vps: section, dist, id, transport });
    plan.release = id;
    plan.notes.push(
      `The web server serves ${section.path}/current; the generated Caddy and Nginx snippets are for the server's own configuration (docs/deploy/vps.md).`,
    );
  } else {
    plan.generated = generateHeaderConfig('shared', rules);
    const staging = `${TMP}/staging`;
    steps =
      section.protocol === 'ftps'
        ? planFtps({ shared: section, staging })
        : planShared({ shared: section, staging, transport });
    plan.notes.push(
      `The upload removes files in ${section.path} that are not in the build, except /.well-known/; .htaccess is part of the upload.`,
    );
  }
  plan.steps = steps.map((s) => ({
    title: s.title,
    command: displayArgv(s.argv),
  }));
  if (section.hostKey) plan.hostKey = section.hostKey;
  secret(
    target === 'shared' && section.protocol === 'ftps'
      ? 'DEPLOY_FTP_PASSWORD'
      : 'DEPLOY_SSH_KEY',
  );
  return plan;
}

/** The plan as text for a person. */
export function renderPlan(plan, { dryRun = true } = {}) {
  const lines = [
    `Deploy plan${dryRun ? ' (dry run: nothing is sent or changed)' : ''}`,
    `Site: ${plan.site}    Target: ${plan.target}    Environment: ${plan.environment} (branch ${plan.branch || 'not given'})`,
  ];
  if (plan.url) lines.push(`URL: ${plan.url}`);
  if (plan.release) lines.push(`Release: ${plan.release}`);
  lines.push(
    `Build: ${plan.dist} (${plan.files.count} files, ${formatBytes(plan.files.bytes)})`,
  );
  for (const secret of plan.secrets)
    lines.push(
      `Secret ${secret.name}: ${secret.present ? 'set in the environment' : 'not set'} (value never printed)`,
    );
  for (const note of plan.notes) lines.push(`Note: ${note}`);
  if (plan.hostKey) lines.push(`Pinned host key: ${plan.hostKey}`);
  if (plan.requests.length) {
    lines.push('', 'API requests:');
    plan.requests.forEach((r) => lines.push(`  ${r}`));
  }
  if (plan.steps.length) {
    lines.push('', 'Steps:');
    plan.steps.forEach((s, i) =>
      lines.push(`  ${i + 1}. ${s.title}`, `     $ ${s.command}`),
    );
  }
  for (const [name, content] of Object.entries(plan.generated))
    lines.push('', `--- generated: ${name} ---`, content.trimEnd());
  return lines.join('\n');
}
