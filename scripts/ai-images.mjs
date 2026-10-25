#!/usr/bin/env node
// Generate AI images (OpenAI Images API) into a site, or record AI images the owner made elsewhere, with
// provenance in sites/<slug>/assets.json (the manifest scripts/credits.mjs and scripts/check-landing.mjs read).
//
//   node scripts/ai-images.mjs generate <slug> --prompt "..." --as <name> [--size S] [--quality Q] [--model M] [--title T] [--note N] [--dry-run] [--json]
//   node scripts/ai-images.mjs import   <slug> <file> --generator G --model M --prompt P --created <date> --terms <url> [--title T] [--as name] [--note N] [--subject owner] [--json]
//   node scripts/ai-images.mjs count    <slug> [--json]
//
// The key is read only from OPENAI_API_KEY and never printed, stored or passed as an argument. OPENAI_BASE_URL
// overrides the endpoint (tests). Before any request the tool checks the customer's consent (brief
// brand.aiImages), the cap per site (qa.config.json aiImages.maxPerSite) and the prompt policy
// (scripts/lib/ai-prompt-policy.mjs). Design: openspec/changes/add-ai-images/design.md.
// Exit codes: 0 ok, 1 refused or failed, 2 bad usage.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { reexecWithEnvProxy } from '../.claude/skills/analyze-reference/scripts/proxy.mjs';
import { readManifest, writeManifest } from './find-images.mjs';
import { validateSlug } from './new-site.mjs';
import { aiImagesConsent, ownerPortraitConsent } from './lib/brief-schema.mjs';
import { checkPrompt, formatViolations } from './lib/ai-prompt-policy.mjs';
import {
  FORMATS,
  GENERATOR,
  ImageApiError,
  KEY_VARIABLE,
  TERMS_URL,
  buildRequest,
  generateImage,
  imageFormatOf,
  redact,
} from './lib/openai-images.mjs';
import {
  AI_IMAGE_QUALITIES,
  AI_IMAGE_SIZES,
  loadConfig,
} from './qa/config.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SAFE_FILE = /^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/;
const MODEL = /^[A-Za-z0-9._-]+$/;
const EXTENSION_OF = { webp: '.webp', png: '.png', jpeg: '.jpg' };

export const isAi = (entry) => entry?.source === 'ai';

/** Raised for a refusal or failure the CLI turns into exit 1. */
class Refused extends Error {}
/** Raised for bad usage: exit 2. */
class Usage extends Error {}

/** The AI entries of a manifest. */
export const aiEntries = (manifest) => manifest.images.filter(isAi);

/** The brief of a site, or null when it has none. Throws Refused when it cannot be read. */
export function readBrief(siteDir, slug) {
  const path = join(siteDir, 'brief.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Refused(
      `sites/${slug}/brief.json is not valid JSON (${error.message}); fix it first`,
    );
  }
}

export const consent = aiImagesConsent;

/** The aiImages settings of a site: its own qa.config.json when it has one, else the root's. */
export function aiConfig(root, slug) {
  const site = join(root, 'sites', slug, 'qa.config.json');
  const file = existsSync(site) ? site : join(root, 'qa.config.json');
  try {
    return loadConfig(file).aiImages;
  } catch (error) {
    throw new Refused(error.message);
  }
}

function siteContext(root, slug) {
  const slugError = validateSlug(slug);
  if (slugError) throw new Usage(slugError);
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(siteDir))
    throw new Refused(
      `sites/${slug} does not exist; run npm run new-site -- ${slug} first`,
    );
  const manifestPath = join(siteDir, 'assets.json');
  const manifest = readManifest(manifestPath);
  return {
    siteDir,
    manifestPath,
    manifest,
    brief: readBrief(siteDir, slug),
    config: aiConfig(root, slug),
  };
}

/** Consent, then policy; throws Refused with the reasons. The cap is checked by the caller for generation. */
function requireAllowed({ brief, slug, prompt, subject }) {
  if (subject === 'owner') {
    const owner = ownerPortraitConsent(brief);
    if (!owner.allowed)
      throw new Refused(
        `an AI portrait of the owner needs the owner's consent in sites/${slug}/brief.json (brand.aiImages and brand.ownerPortrait both "allowed", and a business name): ${owner.reason}`,
      );
  }
  const { allowed, value } = consent(brief);
  if (!allowed)
    throw new Refused(
      `the customer did not allow AI images (sites/${slug}/brief.json brand.aiImages is ${value}); use the customer's files, Commons or The Met instead`,
    );
  const violations = checkPrompt(prompt, brief, { subject });
  if (violations.length)
    throw new Refused(
      `prompt refused by the AI image policy: ${formatViolations(violations)}. AI images are for abstract art, textures, generic objects and scenes; reword the prompt`,
    );
}

function requireCapacity({ manifest, config }) {
  const count = aiEntries(manifest).length;
  if (count >= config.maxPerSite)
    throw new Refused(
      `the site already has ${count} AI images and the cap is ${config.maxPerSite} (qa.config.json aiImages.maxPerSite); no request was sent`,
    );
}

/** The target file name: --as with or without an extension, checked against the real format of the bytes. */
export function chooseFileName(as, format) {
  if (as !== basename(as))
    throw new Usage(`--as must be a plain file name, got "${as}"`);
  const extension = EXTENSION_OF[format];
  const name = /\.[A-Za-z0-9]+$/.test(as) ? as : `${as}${extension}`;
  if (!SAFE_FILE.test(name))
    throw new Usage(
      `--as "${as}": use lowercase letters, digits, "-", "_" and "." with a .webp, .png or .jpg extension`,
    );
  const given = name.match(/\.([a-z]+)$/)[1].replace('jpeg', 'jpg');
  if (given !== extension.slice(1))
    throw new Refused(
      `--as "${as}" says .${given} but the image is ${format}; use ${as.replace(/\.[A-Za-z0-9]+$/, '')}${extension}`,
    );
  return name;
}

/** Refuse before any request when the file name is taken (with or without the extension the image will get). */
function requireFreeName({ siteDir, manifest }, slug, as) {
  const names = /\.[A-Za-z0-9]+$/.test(as)
    ? [as]
    : Object.values(EXTENSION_OF).map((extension) => `${as}${extension}`);
  const taken = names.find(
    (name) =>
      existsSync(join(siteDir, 'src/assets/images', name)) ||
      manifest.images.some((e) => e.file === name),
  );
  if (taken)
    throw new Refused(
      `${taken} already exists in sites/${slug}; pick another name with --as`,
    );
}

function saveImage({
  siteDir,
  manifest,
  manifestPath,
  slug,
  file,
  bytes,
  entry,
}) {
  const target = join(siteDir, 'src/assets/images', file);
  if (existsSync(target) || manifest.images.some((e) => e.file === file))
    throw new Refused(
      `${file} already exists in sites/${slug}; pick another name with --as`,
    );
  mkdirSync(dirname(target), { recursive: true });
  if (bytes) writeFileSync(target, bytes);
  return {
    target,
    commit: () => {
      manifest.images.push(entry);
      writeManifest(manifestPath, manifest);
    },
  };
}

const defaultTitle = (prompt) => {
  const text = prompt.replace(/\s+/g, ' ').trim();
  return text.length > 100 ? `${text.slice(0, 97)}...` : text;
};

// --------------------------------------------------------------------------------------------------
// Commands

async function generate({ args, values, io, deps, root }) {
  const [slug, ...rest] = args;
  if (values.subject !== undefined)
    throw new Usage(
      '--subject is only for import: generation never makes a portrait of a person (text-only prompts); make the portrait with your own tool and import it',
    );
  if (!slug || rest.length) throw new Usage('generate needs exactly <slug>');
  const prompt = String(values.prompt ?? '').trim();
  if (!prompt) throw new Usage('generate needs --prompt "<text>"');
  if (!values.as) throw new Usage('generate needs --as <file name>');
  const ctx = siteContext(root, slug);
  const model = values.model ?? ctx.config.model;
  const size = values.size ?? ctx.config.size;
  const quality = values.quality ?? ctx.config.quality;
  if (!MODEL.test(model))
    throw new Usage(`--model "${model}" is not a model id`);
  if (!AI_IMAGE_SIZES.includes(size))
    throw new Usage(`--size must be one of ${AI_IMAGE_SIZES.join(', ')}`);
  if (!AI_IMAGE_QUALITIES.includes(quality))
    throw new Usage(
      `--quality must be one of ${AI_IMAGE_QUALITIES.join(', ')}`,
    );
  // Check the name early with the format we ask for (the real one is verified after the response).
  chooseFileName(values.as, 'webp');

  requireAllowed({ brief: ctx.brief, slug, prompt });
  requireCapacity(ctx);
  requireFreeName(ctx, slug, values.as);

  const env = deps.env ?? process.env;
  const request = buildRequest({
    prompt,
    model,
    size,
    quality,
    baseUrl: env.OPENAI_BASE_URL || undefined,
  });
  if (values['dry-run']) {
    io.log(
      `dry run: would send POST ${request.url} (headers are never shown)\n${JSON.stringify(request.body, null, 2)}\nNothing was sent or written. AI images on sites/${slug}: ${aiEntries(ctx.manifest).length} of ${ctx.config.maxPerSite}.`,
    );
    return 0;
  }

  // The env this command was given is the only source of the key: never fall back to process.env.
  const apiKey = env[KEY_VARIABLE] ?? '';
  const result = await generateImage({
    prompt,
    model,
    size,
    quality,
    baseUrl: env.OPENAI_BASE_URL || undefined,
    apiKey,
    fetchImpl: deps.fetchImpl,
  }).catch((error) => {
    if (error instanceof ImageApiError)
      throw new Refused(redact(error.message, apiKey));
    throw error;
  });

  const file = chooseFileName(values.as, result.format);
  const entry = {
    file,
    title: values.title?.trim() || defaultTitle(prompt),
    source: 'ai',
    generator: GENERATOR,
    model,
    prompt,
    revisedPrompt: result.revisedPrompt,
    size,
    quality,
    createdAt: (deps.now ?? new Date()).toISOString(),
    terms: TERMS_URL,
    requestId: result.requestId,
    usage: result.usage,
    credit: false,
    note: values.note ?? '',
  };
  const saved = saveImage({ ...ctx, slug, file, bytes: result.bytes, entry });
  saved.commit();
  if (values.json) io.log(JSON.stringify(entry, null, 2));
  else
    io.log(
      `Saved ${file} (${(result.bytes.length / 1024).toFixed(0)} KB, ${size}, ${quality}) to sites/${slug}/src/assets/images/\n  ${entry.title}\n  ${model}${result.usage ? `, ${result.usage.input_tokens ?? '?'} input and ${result.usage.output_tokens ?? '?'} output tokens` : ''}\nAppended to sites/${slug}/assets.json (${aiEntries(ctx.manifest).length} of ${ctx.config.maxPerSite} AI images). Next: node scripts/credits.mjs --site ${slug}`,
    );
  return 0;
}

function importImage({ args, values, io, root }) {
  const [slug, source, ...rest] = args;
  if (!slug || !source || rest.length)
    throw new Usage('import needs <slug> and <file>');
  for (const [flag, label] of [
    ['generator', '--generator <tool name>'],
    ['model', '--model <model id>'],
    ['prompt', '--prompt "<text>"'],
    ['created', '--created <date>'],
    ['terms', '--terms <url of the generator terms>'],
  ])
    if (!String(values[flag] ?? '').trim())
      throw new Usage(`import needs ${label}`);
  const created = String(values.created).trim();
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(created) ||
    Number.isNaN(Date.parse(created))
  )
    throw new Usage(
      `--created must be an ISO date such as 2026-10-24, got "${created}"`,
    );
  let terms;
  try {
    terms = new URL(String(values.terms).trim());
  } catch {
    terms = null;
  }
  if (!terms || !/^https?:$/.test(terms.protocol))
    throw new Usage('--terms must be an http(s) URL of the generator terms');

  if (values.subject !== undefined && values.subject !== 'owner')
    throw new Usage(
      `--subject must be "owner" (the only subject allowed), got "${values.subject}"`,
    );
  const subject = values.subject;
  const ctx = siteContext(root, slug);
  const prompt = String(values.prompt).trim();
  requireAllowed({ brief: ctx.brief, slug, prompt, subject });

  const path = resolve(source);
  if (!existsSync(path)) throw new Refused(`${source} does not exist`);
  const bytes = readFileSync(path);
  const format = imageFormatOf(bytes);
  if (!format) throw new Refused(`${source} is not a WebP, PNG or JPEG image`);
  const file = chooseFileName(
    values.as ??
      basename(source)
        .toLowerCase()
        .replace(/\.[a-z0-9]+$/, '')
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    format,
  );
  const entry = {
    file,
    title: values.title?.trim() || defaultTitle(prompt),
    source: 'ai',
    generator: String(values.generator).trim(),
    model: String(values.model).trim(),
    prompt,
    revisedPrompt: '',
    createdAt: new Date(created).toISOString(),
    terms: terms.href,
    imported: true,
    ...(subject ? { subject } : {}),
    credit: false,
    note: values.note ?? '',
  };
  const saved = saveImage({ ...ctx, slug, file, bytes, entry });
  saved.commit();
  if (values.json) io.log(JSON.stringify(entry, null, 2));
  else
    io.log(
      `Imported ${file} to sites/${slug}/src/assets/images/\n  ${entry.generator}, ${entry.model}, ${entry.createdAt.slice(0, 10)}\nAppended to sites/${slug}/assets.json. Next: node scripts/credits.mjs --site ${slug}`,
    );
  return 0;
}

function count({ args, values, io, root }) {
  const [slug, ...rest] = args;
  if (!slug || rest.length) throw new Usage('count needs exactly <slug>');
  const ctx = siteContext(root, slug);
  const used = aiEntries(ctx.manifest).length;
  const cap = ctx.config.maxPerSite;
  const consentState = consent(ctx.brief);
  if (values.json)
    io.log(
      JSON.stringify({
        count: used,
        cap,
        remaining: Math.max(0, cap - used),
        consent: consentState.allowed,
      }),
    );
  else
    io.log(
      `sites/${slug}: ${used} of ${cap} AI images; the customer ${consentState.allowed ? 'allows' : `does not allow (brand.aiImages: ${consentState.value})`} them`,
    );
  return 0;
}

// --------------------------------------------------------------------------------------------------
// CLI

const HELP = `Usage:
  node scripts/ai-images.mjs generate <slug> --prompt "<text>" --as <name> [--size S] [--quality Q] [--model M] [--title T] [--note N] [--dry-run] [--json]
  node scripts/ai-images.mjs import <slug> <file> --generator <tool> --model <id> --prompt "<text>" --created <date> --terms <url> [--title T] [--as <name>] [--note N] [--subject owner] [--json]
  node scripts/ai-images.mjs count <slug> [--json]

generate  Create one image with the OpenAI Images API, save it in sites/<slug>/src/assets/images/ and append its
          provenance entry (source "ai": generator, model, prompt, revised prompt, size, quality, date, terms link,
          request id, token usage) to sites/<slug>/assets.json. Run scripts/credits.mjs afterwards.
            --size S       1536x1024 (default), 1024x1024 or 1024x1536
            --quality Q    low, medium or high (default high)
            --model M      a model id (default: qa.config.json aiImages.model)
            --dry-run      print the request (never the key) and change nothing
import    Record an AI image made with your own tool (same provenance fields, all required), copied into the site.
            --subject owner  an AI portrait of the brand owner: only with a brief that has brand.aiImages and
                           brand.ownerPortrait both "allowed" (never without a brief); the people and real-person
                           rules are skipped for it, brand, logo and results still apply. generate refuses --subject.
count     AI images on the site, the cap and the customer's consent.

The key comes only from the ${KEY_VARIABLE} environment variable. Refused before any request: the customer did
not allow AI images (with a brief, brand.aiImages must be "allowed"), the site is at the cap (qa.config.json
aiImages.maxPerSite, default 12), or the prompt names the business or its products, asks for its team, staff,
customers, founder, testimonials or logo, a real person, or results such as before and after.
Exit codes: 0 ok, 1 refused or failed, 2 bad usage.`;

export async function main(argv, io = console, deps = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        prompt: { type: 'string' },
        as: { type: 'string' },
        size: { type: 'string' },
        quality: { type: 'string' },
        model: { type: 'string' },
        title: { type: 'string' },
        note: { type: 'string' },
        generator: { type: 'string' },
        created: { type: 'string' },
        terms: { type: 'string' },
        subject: { type: 'string' },
        'dry-run': { type: 'boolean' },
        json: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    io.error(`ai-images: ${error.message}\n\n${HELP}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  const [command, ...args] = positionals;
  const env = deps.env ?? process.env;
  const root =
    deps.root ??
    (env.LANDING_FACTORY_ROOT ? resolve(env.LANDING_FACTORY_ROOT) : ROOT);
  // Belt and braces: nothing printed may contain the key.
  const key = env[KEY_VARIABLE] ?? '';
  const safe = {
    log: (m) => io.log(redact(m, key)),
    error: (m) => io.error(redact(m, key)),
  };
  const commands = { generate, import: importImage, count };
  if (!commands[command]) {
    safe.error(
      `ai-images: ${command ? `unknown command "${command}"` : 'a command is required'}\n\n${HELP}`,
    );
    return 2;
  }
  try {
    return await commands[command]({ args, values, io: safe, deps, root });
  } catch (error) {
    if (error instanceof Usage) {
      safe.error(`ai-images: ${error.message}\n\n${HELP}`);
      return 2;
    }
    if (error instanceof Refused) {
      safe.error(`ai-images: ${error.message}`);
      return 1;
    }
    safe.error(`ai-images: ${error.message}`);
    return 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url) &&
  !reexecWithEnvProxy()
) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(redact(error?.message ?? error, process.env[KEY_VARIABLE]));
      process.exitCode = 2;
    },
  );
}
