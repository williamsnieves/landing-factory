#!/usr/bin/env node
// The deploy target of a site: schema, defaults and validation of `site.config.json`, the dispatch CI needs
// (`--github-output`) and the mapping from the customer brief. Design: openspec/changes/add-deploy-adapters/design.md.
//
//   node scripts/deploy/config.mjs [--site <slug>] [--branch <name>] [--github-output] [--json]
//   node scripts/deploy/config.mjs --site <slug> --from-brief [--write]
//
// A configuration without `target` means `cloudflare`, so every existing site is unchanged. Only the chosen
// target's section is required; unknown keys fail. Secrets never live here (VERCEL_TOKEN, DEPLOY_SSH_KEY and
// DEPLOY_FTP_PASSWORD are repository secrets); the SSH host key is public data and is pinned here.
// Exit codes: 0 ok, 1 the brief target is not supported, 2 invalid configuration or bad usage.
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const TARGETS = ['cloudflare', 'vercel', 'vps', 'shared'];
export const PREVIEW_MODES = ['native', 'cloudflare', 'none'];
/** Targets whose previews are native to the host. */
export const NATIVE_PREVIEW_TARGETS = ['cloudflare', 'vercel'];

export const CLOUDFLARE_SECRETS = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
];

/** Brief `deploy.target` values to a deploy target (null: nothing decided, keep the default). */
const BRIEF_TARGETS = {
  'cloudflare-pages': 'cloudflare',
  vercel: 'vercel',
  vps: 'vps',
  'shared-hosting': 'shared',
  undecided: null,
};

/** A configuration problem. `field` is the dotted name the message talks about. */
export class ConfigError extends Error {
  constructor(field, message) {
    super(`site.config.json: ${field}: ${message}`);
    this.name = 'ConfigError';
    this.field = field;
  }
}

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const HOST = /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/;
const USER = /^[A-Za-z_][A-Za-z0-9_.-]{0,31}$/;
const SAFE_PATH = /^[A-Za-z0-9._/~-]+$/;
const KEY_TYPE =
  /^(?:ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(?:256|384|521)|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com)$/;

function section(raw, name, allowed) {
  const value = raw[name];
  if (!isObject(value))
    throw new ConfigError(
      name,
      `the "${name}" section is required for this target`,
    );
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      throw new ConfigError(
        `${name}.${key}`,
        `unknown setting (allowed: ${allowed.join(', ')})`,
      );
  return value;
}

function text(value, field, pattern, hint) {
  if (typeof value !== 'string' || !value.trim())
    throw new ConfigError(field, `is required${hint ? ` (${hint})` : ''}`);
  if (pattern && !pattern.test(value))
    throw new ConfigError(
      field,
      `"${value}" is not valid${hint ? ` (${hint})` : ''}`,
    );
  return value;
}

function integer(value, field, { min, max, fallback }) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max)
    throw new ConfigError(field, `must be an integer from ${min} to ${max}`);
  return value;
}

function httpsUrl(value, field) {
  text(
    value,
    field,
    null,
    'the public https URL of the site, used by the live report',
  );
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigError(field, `"${value}" is not a URL`);
  }
  if (url.protocol !== 'https:')
    throw new ConfigError(field, 'must be an https:// URL');
  if (url.username || url.password)
    throw new ConfigError(field, 'must not contain credentials');
  return value.replace(/\/+$/, '');
}

/** Path rules every remote path obeys (design Decision 5). `kind` is 'vps' (absolute), 'shared' (document root rule) or 'allow' (an allowPath entry). */
export function checkRemotePath(path, field, kind, allowPath = []) {
  text(path, field, null, 'the folder on the server');
  if (!SAFE_PATH.test(path))
    throw new ConfigError(
      field,
      `"${path}" may only contain letters, digits, ".", "_", "-", "/" and "~"`,
    );
  const trimmed = path.replace(/\/+$/, '') || '/';
  if (trimmed === '/' || trimmed === '~' || trimmed === '.' || trimmed === '..')
    throw new ConfigError(field, `"${path}" is not a safe deploy folder`);
  if (trimmed.split('/').includes('..'))
    throw new ConfigError(field, 'must not contain ".."');
  if (trimmed.startsWith('~'))
    throw new ConfigError(
      field,
      'must not start with "~"; use a path relative to the account home or an absolute path',
    );
  if (kind === 'vps') {
    if (!trimmed.startsWith('/'))
      throw new ConfigError(
        field,
        'must be an absolute path such as /var/www/site',
      );
    if (trimmed.split('/').filter(Boolean).length < 2)
      throw new ConfigError(
        field,
        `"${path}" is too shallow; use a folder owned by the site such as /var/www/site`,
      );
  } else if (
    kind === 'shared' &&
    !(trimmed === 'public_html' || trimmed.endsWith('/public_html')) &&
    !allowPath.includes(trimmed)
  ) {
    throw new ConfigError(
      field,
      `"${path}" must end in public_html (the site's own document root) or be listed in allowPath, because the upload removes files that are not in the build`,
    );
  }
  return trimmed;
}

function hostKey(value, field, host, port) {
  text(
    value,
    field,
    null,
    `a known_hosts line; run ssh-keyscan -t ed25519${port === 22 ? '' : ` -p ${port}`} ${host}`,
  );
  const parts = value.trim().split(/\s+/);
  if (
    value.includes('\n') ||
    parts.length < 3 ||
    !KEY_TYPE.test(parts[1]) ||
    !/^[A-Za-z0-9+/=]+$/.test(parts[2])
  )
    throw new ConfigError(
      field,
      'must be one known_hosts line: "<host> <key type> <base64 key>"',
    );
  const names = parts[0];
  const wanted = port === 22 ? [host, `[${host}]:22`] : [`[${host}]:${port}`];
  if (
    !names.startsWith('|1|') &&
    !names.split(',').some((name) => wanted.includes(name))
  )
    throw new ConfigError(
      field,
      `names "${names}" but the server is ${wanted[wanted.length - 1]}; the line must start with that host`,
    );
  return value.trim();
}

function productionBranch(value, field) {
  if (value === undefined) return 'main';
  return text(value, field, /^[A-Za-z0-9._/-]+$/);
}

function validateSsh(raw, name, defaults, kind) {
  const allowed = [
    'host',
    'port',
    'user',
    'path',
    'hostKey',
    'url',
    'productionBranch',
  ];
  if (kind === 'vps') allowed.push('keep');
  else allowed.push('protocol', 'allowPath');
  const s = section(raw, name, allowed);
  const protocol = kind === 'shared' ? (s.protocol ?? 'ssh') : 'ssh';
  if (kind === 'shared') {
    if (protocol === 'ftp')
      throw new ConfigError(
        `${name}.protocol`,
        'plain FTP sends the password in clear text and is refused; use "ftps" (explicit TLS) or "ssh"',
      );
    if (!['ssh', 'ftps'].includes(protocol))
      throw new ConfigError(
        `${name}.protocol`,
        `"${protocol}" is not supported; use "ssh" or "ftps"`,
      );
  }
  const host = text(
    s.host,
    `${name}.host`,
    HOST,
    'the server name or IPv4 address',
  );
  const port = integer(s.port, `${name}.port`, {
    min: 1,
    max: 65535,
    fallback: kind === 'vps' ? 22 : protocol === 'ssh' ? defaults.sshPort : 21,
  });
  const user = text(s.user, `${name}.user`, USER, 'the SSH or FTP account');
  if (user === 'root')
    throw new ConfigError(
      `${name}.user`,
      'deploying as root is refused; create a dedicated deploy user',
    );
  const allowPath = s.allowPath ?? [];
  if (!Array.isArray(allowPath) || allowPath.some((p) => typeof p !== 'string'))
    throw new ConfigError(
      `${name}.allowPath`,
      'must be a list of folder paths',
    );
  const normalizedAllow = allowPath.map((p) =>
    checkRemotePath(p, `${name}.allowPath`, 'allow'),
  );
  const result = {
    ...(kind === 'shared' ? { protocol } : {}),
    host,
    port,
    user,
    path: checkRemotePath(s.path, `${name}.path`, kind, normalizedAllow),
    ...(protocol === 'ssh'
      ? { hostKey: hostKey(s.hostKey, `${name}.hostKey`, host, port) }
      : {}),
    url: httpsUrl(s.url, `${name}.url`),
    productionBranch: productionBranch(
      s.productionBranch,
      `${name}.productionBranch`,
    ),
  };
  if (kind === 'vps')
    result.keep = integer(s.keep, `${name}.keep`, {
      min: 2,
      max: 50,
      fallback: 5,
    });
  else result.allowPath = normalizedAllow;
  return result;
}

function validateCloudflare(raw) {
  const c = section(raw, 'cloudflare', ['pagesProject', 'productionBranch']);
  return {
    pagesProject: text(
      c.pagesProject,
      'cloudflare.pagesProject',
      /^[A-Za-z0-9][A-Za-z0-9-]*$/,
      'the Pages project name',
    ),
    productionBranch: productionBranch(
      c.productionBranch,
      'cloudflare.productionBranch',
    ),
  };
}

function validateVercel(raw) {
  const v = section(raw, 'vercel', ['project', 'team', 'productionBranch']);
  return {
    project: text(
      v.project,
      'vercel.project',
      /^[a-z0-9][a-z0-9._-]{0,99}$/,
      'the Vercel project name',
    ),
    ...(v.team === undefined
      ? {}
      : {
          team: text(
            v.team,
            'vercel.team',
            /^[A-Za-z0-9_-]+$/,
            'a team id such as team_abc or a team slug',
          ),
        }),
    productionBranch: productionBranch(
      v.productionBranch,
      'vercel.productionBranch',
    ),
  };
}

/**
 * Validate and normalize a parsed `site.config.json`. Throws ConfigError naming the field.
 * Returns { target, previews, cloudflare?, vercel?, vps?, shared? } (only the sections the run needs).
 */
export function resolveConfig(raw) {
  if (!isObject(raw)) throw new ConfigError('(file)', 'must be a JSON object');
  const known = ['target', 'previews', ...TARGETS];
  for (const key of Object.keys(raw))
    if (!known.includes(key))
      throw new ConfigError(
        key,
        `unknown setting (allowed: ${known.join(', ')})`,
      );

  const target = raw.target ?? 'cloudflare';
  if (!TARGETS.includes(target))
    throw new ConfigError(
      'target',
      `"${target}" is not a deploy target (use ${TARGETS.join(', ')})`,
    );

  const nativeTarget = NATIVE_PREVIEW_TARGETS.includes(target);
  const previews = raw.previews ?? (nativeTarget ? 'native' : 'cloudflare');
  if (!PREVIEW_MODES.includes(previews))
    throw new ConfigError(
      'previews',
      `"${previews}" is not valid (use ${PREVIEW_MODES.join(', ')})`,
    );
  if (nativeTarget && previews !== 'native')
    throw new ConfigError(
      'previews',
      `${target} has native previews; the only valid value is "native"`,
    );
  if (!nativeTarget && previews === 'native')
    throw new ConfigError(
      'previews',
      `${target} has no previews of its own; use "cloudflare" or "none"`,
    );

  const config = { target, previews };
  if (target === 'vercel') config.vercel = validateVercel(raw);
  if (target === 'vps')
    config.vps = validateSsh(raw, 'vps', { sshPort: 22 }, 'vps');
  if (target === 'shared')
    config.shared = validateSsh(raw, 'shared', { sshPort: 65002 }, 'shared');
  // The Cloudflare section is also needed when previews of another target are published there.
  if (target === 'cloudflare' || previews === 'cloudflare')
    config.cloudflare = validateCloudflare(raw);
  return config;
}

/** The site's raw configuration file: sites/<slug>/site.config.json, or the root one without a slug. */
export function configPath(root, slug) {
  return slug
    ? join(root, 'sites', slug, 'site.config.json')
    : join(root, 'site.config.json');
}

export function loadSiteConfig(root = ROOT, slug = '') {
  const path = configPath(root, slug);
  if (!existsSync(path))
    throw new ConfigError(
      '(file)',
      `${slug ? `sites/${slug}/` : ''}site.config.json does not exist`,
    );
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new ConfigError('(file)', `is not valid JSON (${error.message})`);
  }
  return resolveConfig(raw);
}

/** The section that belongs to the target. */
export const targetSection = (config) => config[config.target];

/** Secrets (names only) a target needs. */
export function secretsFor(target, config) {
  if (target === 'cloudflare') return [...CLOUDFLARE_SECRETS];
  if (target === 'vercel') return ['VERCEL_TOKEN'];
  if (target === 'vps') return ['DEPLOY_SSH_KEY'];
  if (target === 'shared')
    return [
      config.shared?.protocol === 'ftps'
        ? 'DEPLOY_FTP_PASSWORD'
        : 'DEPLOY_SSH_KEY',
    ];
  return [];
}

/**
 * What CI does for this run. `deployVia` is "wrangler" (the Cloudflare steps), "script" (deploy.mjs) or "none".
 * VPS and shared hosting publish production from their production branch only; on any other branch they take
 * the Cloudflare preview when `previews` says so, and otherwise deploy nothing.
 */
export function dispatch(config, branch = '') {
  const section = targetSection(config);
  const productionBranch = section.productionBranch;
  const isProduction = !branch || branch === productionBranch;
  const fallbackTarget = !NATIVE_PREVIEW_TARGETS.includes(config.target);
  let effective = config.target;
  let deployVia = config.target === 'cloudflare' ? 'wrangler' : 'script';
  let previewFallback = false;
  if (fallbackTarget && !isProduction) {
    previewFallback = true;
    if (config.previews === 'cloudflare') {
      effective = 'cloudflare';
      deployVia = 'wrangler';
    } else {
      effective = 'none';
      deployVia = 'none';
    }
  }
  const secrets = deployVia === 'none' ? [] : secretsFor(effective, config);
  return {
    target: config.target,
    previews: config.previews,
    productionBranch,
    isProduction,
    effectiveTarget: effective,
    deployVia,
    previewFallback,
    secrets,
    needsLftp:
      deployVia === 'script' &&
      config.target === 'shared' &&
      config.shared.protocol === 'ftps',
  };
}

/** GITHUB_OUTPUT lines for a dispatch result. */
export function githubOutputLines(d) {
  return [
    `target=${d.target}`,
    `previews=${d.previews}`,
    `production_branch=${d.productionBranch}`,
    `is_production=${d.isProduction}`,
    `effective_target=${d.effectiveTarget}`,
    `deploy_via=${d.deployVia}`,
    `preview_fallback=${d.previewFallback}`,
    `secrets=${d.secrets.join(' ')}`,
    `needs_lftp=${d.needsLftp}`,
  ];
}

/** Brief `deploy.target` to a deploy target. Throws for a target the factory does not support yet. */
export function mapBriefTarget(value) {
  if (value === undefined || value === '') return null;
  if (value === 'netlify')
    throw new ConfigError(
      'deploy.target',
      'netlify is not supported yet (targets: cloudflare-pages, vercel, vps, shared-hosting)',
    );
  if (!(value in BRIEF_TARGETS))
    throw new ConfigError(
      'deploy.target',
      `"${value}" is not a brief deploy target`,
    );
  return BRIEF_TARGETS[value];
}

/**
 * Apply the brief's target to a raw site.config.json. Vercel can be completed from the slug; a VPS or
 * shared hosting needs a host, a user and a pinned host key the brief cannot hold, so the site keeps its
 * current target and the missing settings are listed. Returns { raw, applied, note }.
 */
export function applyBriefTarget(raw, briefTarget, slug) {
  const target = mapBriefTarget(briefTarget);
  if (!target || target === (raw.target ?? 'cloudflare'))
    return {
      raw,
      applied: false,
      note: target
        ? `target is already ${target}`
        : 'the brief has no deploy target',
    };
  if (target === 'cloudflare')
    return {
      raw: { ...raw, target: 'cloudflare' },
      applied: true,
      note: 'target set to cloudflare',
    };
  if (target === 'vercel') {
    return {
      raw: {
        ...raw,
        target: 'vercel',
        vercel: raw.vercel ?? { project: slug, productionBranch: 'main' },
      },
      applied: true,
      note: 'target set to vercel; add the VERCEL_TOKEN repository secret (docs/deploy/vercel.md)',
    };
  }
  const guide = target === 'vps' ? 'vps.md' : 'shared-hosting.md';
  return {
    raw,
    applied: false,
    note: `the brief asks for ${target}; the site stays on its current target until site.config.json gets a "${target}" section (host, user, path, hostKey, url; docs/deploy/${guide}) and "target": "${target}"`,
  };
}

const HELP = `Usage: node scripts/deploy/config.mjs [--site <slug>] [--branch <name>] [--github-output] [--json]
       node scripts/deploy/config.mjs --site <slug> --from-brief [--write]

Validates site.config.json (the starter's when --site is absent) and prints what CI should do on --branch
(default: GITHUB_HEAD_REF or GITHUB_REF_NAME). --github-output appends the result to $GITHUB_OUTPUT.
--from-brief maps sites/<slug>/brief.json deploy.target into the configuration (--write saves it).
Exit codes: 0 ok, 1 unsupported brief target, 2 invalid configuration or bad usage.`;

export function main(argv, io = console, env = process.env, root = ROOT) {
  let args;
  try {
    args = parseArgs({
      args: argv,
      options: {
        site: { type: 'string' },
        branch: { type: 'string' },
        'github-output': { type: 'boolean' },
        json: { type: 'boolean' },
        'from-brief': { type: 'boolean' },
        write: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    }).values;
  } catch (error) {
    io.error(`deploy config: ${error.message}\n\n${HELP}`);
    return 2;
  }
  if (args.help) {
    io.log(HELP);
    return 0;
  }
  const slug = args.site ?? '';
  try {
    if (args['from-brief']) return fromBrief({ args, slug, io, root });
    const config = loadSiteConfig(root, slug);
    const branch =
      args.branch ?? (env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || '');
    const d = dispatch(config, branch || '');
    if (args['github-output']) {
      const lines = `${githubOutputLines(d).join('\n')}\n`;
      if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, lines);
      else io.log(lines.trimEnd());
    } else if (args.json) io.log(JSON.stringify({ ...d, config }));
    else io.log(githubOutputLines(d).join('\n'));
    return 0;
  } catch (error) {
    if (error instanceof ConfigError) {
      io.error(`deploy config: ${error.message}`);
      return error.field === 'deploy.target' ? 1 : 2;
    }
    io.error(`deploy config: ${error.message}`);
    return 2;
  }
}

function fromBrief({ args, slug, io, root }) {
  if (!slug) {
    io.error('deploy config: --from-brief needs --site <slug>');
    return 2;
  }
  const briefPath = join(root, 'sites', slug, 'brief.json');
  if (!existsSync(briefPath)) {
    io.log(`deploy config: sites/${slug} has no brief.json; nothing to apply`);
    return 0;
  }
  const brief = JSON.parse(readFileSync(briefPath, 'utf8'));
  const path = configPath(root, slug);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const result = applyBriefTarget(raw, brief.deploy?.target, slug);
  if (result.applied && args.write)
    writeFileSync(path, `${JSON.stringify(result.raw, null, 2)}\n`);
  resolveConfig(result.raw);
  io.log(`deploy config: ${result.note}`);
  return 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
