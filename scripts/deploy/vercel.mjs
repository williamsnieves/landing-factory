// The Vercel adapter: the REST API with `fetch`, no CLI. Files are uploaded by SHA-1 (POST /v2/files), then a
// deployment is created (POST /v13/deployments) and polled until it is ready. The token comes only from
// VERCEL_TOKEN and goes only into the Authorization header; every error text passes through redact().
// Design: openspec/changes/add-deploy-adapters/design.md, Decision 4.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { redact } from './redact.mjs';

export const DEFAULT_API_URL = 'https://api.vercel.com';
export const TOKEN_VARIABLE = 'VERCEL_TOKEN';
export const UPLOAD_CONCURRENCY = 4;
export const POLL_MS = 3000;
export const TIMEOUT_MS = 300_000;

/** An error whose message is safe to print. */
export class VercelError extends Error {
  constructor(message, code = 'api') {
    super(message);
    this.name = 'VercelError';
    this.code = code;
  }
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** `?teamId=...` (or `?slug=...` for a team slug). */
export function teamQuery(team) {
  if (!team) return '';
  return `${team.startsWith('team_') ? 'teamId' : 'slug'}=${encodeURIComponent(team)}`;
}

const withQuery = (url, ...parts) => {
  const query = parts.filter(Boolean).join('&');
  return query ? `${url}?${query}` : url;
};

/** The body of POST /v13/deployments; production only on the production branch. */
export function buildDeployment({
  project,
  files,
  production,
  branch,
  commit,
}) {
  return {
    name: project,
    project,
    ...(production ? { target: 'production' } : {}),
    files: files.map(({ path, sha1, size }) => ({
      file: path,
      sha: sha1,
      size,
    })),
    projectSettings: {
      framework: null,
      buildCommand: null,
      installCommand: null,
      outputDirectory: null,
    },
    meta: { branch: branch ?? '', commit: commit ?? '' },
  };
}

/** What a dry run prints about the API calls (never a header). */
export function describeRequests({
  base = DEFAULT_API_URL,
  team,
  files,
  production,
}) {
  const q = teamQuery(team);
  return [
    `POST ${withQuery(`${base}/v2/files`, q)} x ${new Set(files.map((f) => f.sha1)).size} unique file(s), header x-vercel-digest: <sha1>`,
    `POST ${withQuery(`${base}/v13/deployments`, q)} (${production ? 'target: production' : 'preview'})`,
    `GET ${withQuery(`${base}/v13/deployments/<id>`, q)} until readyState is READY`,
  ];
}

/**
 * Upload the files and create the deployment. `files` come from listBuild() plus the generated `vercel.json`
 * (as `{ path, size, sha1, content }`); `dist` is where the others are read from.
 * Returns { id, url, aliasUrl, readyState }.
 */
export async function deployToVercel({
  dist,
  files,
  project,
  team,
  production,
  branch,
  commit,
  token = process.env[TOKEN_VARIABLE],
  baseUrl = process.env.VERCEL_API_URL || DEFAULT_API_URL,
  fetchImpl = globalThis.fetch,
  pollMs = POLL_MS,
  timeoutMs = TIMEOUT_MS,
  log = () => {},
}) {
  if (!token || !String(token).trim())
    throw new VercelError(
      `${TOKEN_VARIABLE} is not set; export it in the environment (never pass it as an argument)`,
      'no-token',
    );
  const key = String(token).trim();
  const base = String(baseUrl).replace(/\/+$/, '');
  const q = teamQuery(team);
  const safe = (text) => redact(text, [key]);

  async function call(
    method,
    path,
    { headers = {}, body, expectJson = true } = {},
  ) {
    let response;
    try {
      response = await fetchImpl(withQuery(`${base}${path}`, q), {
        method,
        headers: { authorization: `Bearer ${key}`, ...headers },
        body,
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      throw new VercelError(
        safe(`request ${method} ${path} failed: ${error.message}`),
        'network',
      );
    }
    const raw = await response.text().catch(() => '');
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // not JSON
    }
    if (!response.ok) {
      const message =
        data?.error?.message ??
        (raw.trim().slice(0, 300) || response.statusText);
      throw new VercelError(
        safe(
          `Vercel API ${method} ${path} answered HTTP ${response.status}: ${message}`,
        ),
        'api',
      );
    }
    if (expectJson && data === null)
      throw new VercelError(
        safe(`Vercel API ${method} ${path} answered without JSON`),
        'response',
      );
    return data;
  }

  const bySha = new Map();
  for (const file of files)
    if (!bySha.has(file.sha1)) bySha.set(file.sha1, file);
  const unique = [...bySha.values()];
  log(`uploading ${unique.length} unique file(s) to Vercel`);
  let next = 0;
  const worker = async () => {
    while (next < unique.length) {
      const file = unique[next++];
      const content = file.content ?? readFileSync(join(dist, file.path));
      await call('POST', '/v2/files', {
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': String(content.length),
          'x-vercel-digest': file.sha1,
        },
        body: content,
        expectJson: false,
      });
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, unique.length) }, worker),
  );

  const created = await call('POST', '/v13/deployments', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(
      buildDeployment({ project, files, production, branch, commit }),
    ),
  });
  if (!created?.id)
    throw new VercelError(
      'Vercel API created a deployment without an id',
      'response',
    );
  log(`deployment ${created.id} created; waiting until it is ready`);

  const deadline = Date.now() + timeoutMs;
  let state = created;
  for (;;) {
    const status = String(state.readyState ?? state.status ?? '');
    if (status === 'READY') break;
    if (status === 'ERROR' || status === 'CANCELED')
      throw new VercelError(
        safe(
          `deployment ${created.id} ${status}: ${state.errorMessage ?? state.error?.message ?? 'no reason given'}`,
        ),
        'failed',
      );
    if (Date.now() >= deadline)
      throw new VercelError(
        `deployment ${created.id} was not ready after ${Math.round(timeoutMs / 1000)} s (last state ${status || 'unknown'})`,
        'timeout',
      );
    await sleep(pollMs);
    state = await call(
      'GET',
      `/v13/deployments/${encodeURIComponent(created.id)}`,
    );
  }

  const host = String(state.url ?? created.url ?? '').replace(
    /^https?:\/\//,
    '',
  );
  if (!host)
    throw new VercelError(
      'Vercel API reported no URL for the deployment',
      'response',
    );
  const aliases = Array.isArray(state.alias) ? state.alias : [];
  const aliasHost = production
    ? aliases.find((a) => typeof a === 'string' && a !== host)
    : '';
  return {
    id: created.id,
    url: `https://${host}`,
    ...(aliasHost ? { aliasUrl: `https://${aliasHost}` } : {}),
    readyState: 'READY',
  };
}
