// The fixed table of commands a job may run. A tool picks a kind and supplies checked arguments; nothing else
// reaches a process. Free text (a niche) is one argv element and never goes through a shell.
// Nothing here publishes: no deploy, wrangler, git, gh or push (tests/mcp-jobs.test.mjs asserts it).
import { existsSync } from 'node:fs';

import { ToolError, assertSlug, inside, siteDir } from './paths.mjs';

export const QA_SKIPS = [
  'layout',
  'reduced-motion',
  'scenes',
  'lighthouse',
  'impeccable',
];
const MODEL = /^[a-z0-9.-]+$/;
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/;
const SHEET = /^[a-z0-9_]+(-[a-z0-9]+)*$/;

/**
 * kind: { class, script (relative to the checkout), runner }.
 * `class` decides the concurrency limit: "generation" (one per landing) or "check".
 */
export const JOB_KINDS = {
  propose: {
    class: 'generation',
    runner: 'bash',
    script: 'scripts/new-landing.sh',
  },
  preview: {
    class: 'generation',
    runner: 'bash',
    script: 'scripts/new-landing.sh',
  },
  generate: {
    class: 'generation',
    runner: 'bash',
    script: 'scripts/new-landing.sh',
  },
  qa: { class: 'check', runner: 'node', script: 'scripts/qa.mjs' },
  report: {
    class: 'check',
    runner: 'node',
    script: 'scripts/landing-report.mjs',
  },
};

function cleanNiche(niche) {
  if (niche === undefined) return null;
  if (typeof niche !== 'string') throw new ToolError('niche must be a string');
  const text = niche.trim();
  if (!text) return null;
  if (/[\r\n]/.test(text)) throw new ToolError('niche must be a single line');
  if (text.length > 500)
    throw new ToolError('niche is longer than 500 characters');
  return text;
}

function checkRefs(root, refs) {
  if (refs === undefined) return [];
  if (!Array.isArray(refs))
    throw new ToolError('refs must be an array of pattern sheet slugs');
  if (refs.length > 3)
    throw new ToolError('refs takes at most 3 pattern sheets');
  for (const ref of refs) {
    if (typeof ref !== 'string' || !SHEET.test(ref))
      throw new ToolError(`invalid sheet slug ${JSON.stringify(ref)} in refs`);
    if (!existsSync(inside(root, 'patterns', `${ref}.md`)))
      throw new ToolError(
        `patterns/${ref}.md does not exist (run /analyze-reference first)`,
      );
  }
  return refs;
}

function checkModel(model) {
  if (model === undefined) return null;
  if (typeof model !== 'string' || !MODEL.test(model))
    throw new ToolError(
      `invalid model ${JSON.stringify(model)}: expected ${MODEL}`,
    );
  return model;
}

function checkLang(lang) {
  if (lang === undefined) return null;
  if (typeof lang !== 'string' || !LANG.test(lang))
    throw new ToolError(
      `invalid lang ${JSON.stringify(lang)}: use a language tag such as es or en`,
    );
  return lang;
}

function requireSite(root, slug) {
  if (!existsSync(inside(siteDir(root, slug), 'package.json')))
    throw new ToolError(`sites/${slug} does not exist or is not a site yet`);
}

function requireNicheOrBrief(root, slug, niche) {
  if (!niche && !existsSync(inside(siteDir(root, slug), 'brief.json')))
    throw new ToolError(
      `give a niche, or create a brief first (brief_init, then brief_update) for ${slug}`,
    );
}

/**
 * Build the command of a job. Returns { kind, slug, argv } with argv relative to the checkout
 * (run with the checkout as cwd). Throws ToolError for any argument that fails its check.
 */
export function buildCommand(kind, input, root) {
  const spec = JOB_KINDS[kind];
  if (!spec) throw new ToolError(`unknown job kind ${JSON.stringify(kind)}`);
  const slug = assertSlug(input.slug);
  const argv = [spec.runner, spec.script, slug];
  if (kind === 'propose' || kind === 'generate' || kind === 'preview') {
    const niche = cleanNiche(input.niche);
    const refs = checkRefs(root, input.refs);
    const model = checkModel(input.model);
    requireNicheOrBrief(root, slug, niche);
    if (kind === 'generate') {
      argv.push('--auto');
      if (input.resume === true) {
        requireSite(root, slug);
        argv.push('--resume');
      }
    }
    if (kind === 'preview') {
      argv.push('--directions');
      if (input.count !== undefined) {
        if (input.count !== 2 && input.count !== 3)
          throw new ToolError('count must be 2 or 3');
        argv.push('--count', String(input.count));
      }
    }
    if (niche) argv.push('--niche', niche);
    if (refs.length) argv.push('--refs', refs.join(','));
    if (kind === 'propose' || kind === 'preview') {
      const lang = checkLang(input.lang);
      if (lang) argv.push('--lang', lang);
    }
    if (model) argv.push('--model', model);
    if (kind === 'generate' && input.maxAttempts !== undefined) {
      if (
        !Number.isInteger(input.maxAttempts) ||
        input.maxAttempts < 0 ||
        input.maxAttempts > 20
      )
        throw new ToolError('maxAttempts must be an integer from 0 to 20');
      argv.push('--max-attempts', String(input.maxAttempts));
    }
  } else if (kind === 'qa') {
    requireSite(root, slug);
    argv.splice(2, 1, '--site', slug);
    if (input.skip !== undefined) {
      if (
        !Array.isArray(input.skip) ||
        input.skip.some((s) => !QA_SKIPS.includes(s))
      )
        throw new ToolError(`skip takes any of: ${QA_SKIPS.join(', ')}`);
      if (input.skip.length)
        argv.push('--skip', [...new Set(input.skip)].join(','));
    }
  } else if (kind === 'report') {
    requireSite(root, slug);
    argv.splice(2, 1, '--site', slug);
    if (input.url !== undefined) {
      let url;
      try {
        url = new URL(input.url);
      } catch {
        throw new ToolError(`url ${JSON.stringify(input.url)} is not a URL`);
      }
      if (url.protocol !== 'https:')
        throw new ToolError('url must start with https://');
      if (url.username || url.password)
        throw new ToolError('url must not carry credentials');
      argv.push('--url', input.url);
    }
  }
  return { kind, slug, argv };
}
