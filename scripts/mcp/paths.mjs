// Paths and input checks for the MCP server. Every path is built from validated parts and must stay inside the repository.
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SLUG_PATTERN } from '../lib/sites.mjs';

/** The checkout this code lives in (where scripts/ are). */
export const CODE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

/** The root the tools read and write: LANDING_FACTORY_ROOT (tests) or the checkout. */
export const factoryRoot = (env = process.env) =>
  resolve(env.LANDING_FACTORY_ROOT || CODE_ROOT);

/** A failure a tool reports to the agent as text (a result with isError: true). */
export class ToolError extends Error {}

/** A problem with the call itself (unknown tool, malformed arguments): a JSON-RPC -32602 error. */
export class ParamsError extends Error {}

export function assertSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug))
    throw new ToolError(
      `invalid slug ${JSON.stringify(slug)}: use lowercase letters, digits and single hyphens (${SLUG_PATTERN})`,
    );
  return slug;
}

/** `join(root, ...parts)`, refused unless the result stays inside `root`. */
export function inside(root, ...parts) {
  const base = resolve(root);
  const path = resolve(base, ...parts);
  if (path !== base && !path.startsWith(base + sep))
    throw new ToolError('path escapes the repository');
  return path;
}

export const siteDir = (root, slug) => inside(root, 'sites', assertSlug(slug));
export const briefPath = (root, slug) =>
  join(siteDir(root, slug), 'brief.json');
export const jobsDir = (root) => inside(root, '.cache', 'jobs');
