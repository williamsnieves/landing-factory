#!/usr/bin/env node
// Record a video file a person supplies (the customer's, or the factory owner's own footage) in a site:
// encode it with the factory encoder (scripts/lib/video-encode.mjs: H.264 MP4, no audio track, at most
// 1280 px wide and 20 s, faststart, plus a WebP poster) into sites/<slug>/src/assets/video/ and append an
// entry with kind "video" to sites/<slug>/assets.json. Pixabay video comes through
// `node scripts/find-images.mjs get <slug> pixabay-video:<id>`. Design: openspec/changes/add-video/design.md.
//
//   node scripts/video.mjs import <slug> <file> --source customer --owner "<name>" --permission "<what was allowed>" [--as <name>] [--credit] [--title <text>] [--note <text>] [--json]
//   node scripts/video.mjs import <slug> <file> --source owner --author "<name>" [--as <name>] [--credit] [--title <text>] [--note <text>] [--json]
//
// No URL download: the person supplies the file. A prospect brief refuses --source customer (a prospect has
// agreed to nothing). Exit codes: 0 ok, 1 refused or failed (nothing written), 2 bad usage.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { readManifest, writeManifest } from './find-images.mjs';
import { isProspect } from './lib/brief-schema.mjs';
import { SLUG_PATTERN } from './lib/sites.mjs';
import {
  assertTools,
  encodeVideo,
  videoMaxKb,
  VideoError,
} from './lib/video-encode.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = ['customer', 'owner'];
const NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Bad usage: exit 2. */
class UsageError extends Error {}
/** A refusal or failure: exit 1. */
class Refused extends Error {}

const HELP = `Usage:
  node scripts/video.mjs import <site-slug> <file> --source customer --owner <name> --permission <text> [--as <name>] [--credit] [--title <text>] [--note <text>] [--json]
  node scripts/video.mjs import <site-slug> <file> --source owner --author <name> [--as <name>] [--credit] [--title <text>] [--note <text>] [--json]

import   Encode a video file you supply (any format ffmpeg reads) into sites/<site-slug>/src/assets/video/<name>.mp4
         and <name>.poster.webp (H.264, no audio track, at most 1280 px wide and 20 s, index at the start) and
         append an entry with kind "video" to sites/<site-slug>/assets.json. Needs ffmpeg.
           --source customer  a file the customer gave; needs --owner and --permission (refused for a prospect brief)
           --source owner     the factory owner's own footage; needs --author
           --as <name>        file name without extension (lowercase letters, digits, "-"; default: the file's name)
           --credit           also show a public credit line in the footer (default: no)
           --title, --note    free text stored in the manifest
Pixabay video: node scripts/find-images.mjs get <site-slug> pixabay-video:<id>.
Exit codes: 0 ok, 1 refused or failed (nothing written), 2 bad usage.`;

const fileStem = (file) =>
  basename(file)
    .replace(/\.[A-Za-z0-9]{2,5}$/, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

/** The brief of a site, or null; an unreadable brief is a refusal. */
function readBrief(siteDir, slug) {
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

/**
 * Encode `file` into the site and record it. Returns { entry, path, bytes }. Throws UsageError (bad
 * arguments) or Refused (everything else, including an ffmpeg that is missing).
 */
export async function importVideo({
  slug,
  file,
  source,
  owner,
  permission,
  author,
  credit = false,
  title,
  as,
  note = '',
  root = ROOT,
  now = new Date(),
  env = process.env,
}) {
  if (!SLUG_PATTERN.test(slug ?? ''))
    throw new UsageError(`invalid site slug "${slug}"`);
  if (!SOURCES.includes(source))
    throw new UsageError(`import needs --source ${SOURCES.join(' or ')}`);
  if (source === 'customer') {
    if (!String(owner ?? '').trim())
      throw new UsageError('--source customer needs --owner <name>');
    if (!String(permission ?? '').trim())
      throw new UsageError('--source customer needs --permission <text>');
  } else if (!String(author ?? '').trim())
    throw new UsageError('--source owner needs --author <name>');
  const name = as ?? fileStem(file);
  if (!NAME.test(name))
    throw new UsageError(
      `--as "${as ?? name}": use lowercase letters, digits and "-" (no extension)`,
    );
  const siteDir = join(root, 'sites', slug);
  if (!existsSync(siteDir))
    throw new Refused(
      `sites/${slug} does not exist; run npm run new-site -- ${slug} first`,
    );
  if (!existsSync(file)) throw new Refused(`${file} does not exist`);

  const brief = readBrief(siteDir, slug);
  if (source === 'customer' && isProspect(brief))
    throw new Refused(
      `sites/${slug} is a prospect landing: a prospect has not agreed to anything, so a customer video is refused (use a Pixabay clip or your own footage with --source owner)`,
    );

  const outDir = join(siteDir, 'src/assets/video');
  const manifestPath = join(siteDir, 'assets.json');
  const manifest = readManifest(manifestPath);
  const mp4 = `${name}.mp4`;
  if (
    existsSync(join(outDir, mp4)) ||
    manifest.images.some((entry) => entry.file === mp4)
  )
    throw new Refused(
      `${mp4} already exists in sites/${slug}; pick another name with --as`,
    );

  let encoded;
  try {
    await assertTools(env);
    encoded = await encodeVideo({
      input: file,
      outDir,
      name,
      maxKb: videoMaxKb(root, slug),
      env,
    });
  } catch (error) {
    if (error instanceof VideoError) throw new Refused(error.message);
    throw error;
  }

  const common = {
    file: mp4,
    title: String(title ?? '').trim() || name.replace(/-/g, ' '),
  };
  const media = {
    credit: Boolean(credit),
    source,
    kind: 'video',
    poster: `${name}.poster.webp`,
    durationSec: encoded.durationSec,
    bytes: encoded.bytes,
    width: encoded.width,
    height: encoded.height,
    retrievedAt: now.toISOString(),
    note,
  };
  const entry =
    source === 'customer'
      ? {
          ...common,
          owner: owner.trim(),
          permission: permission.trim(),
          ...media,
        }
      : {
          ...common,
          author: author.trim(),
          license: 'Own footage of the site owner',
          ...media,
        };
  manifest.images.push(entry);
  writeManifest(manifestPath, manifest);
  return { entry, path: encoded.file, bytes: encoded.bytes };
}

export async function main(argv, io = console, root = ROOT) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        source: { type: 'string' },
        owner: { type: 'string' },
        permission: { type: 'string' },
        author: { type: 'string' },
        credit: { type: 'boolean' },
        title: { type: 'string' },
        as: { type: 'string' },
        note: { type: 'string' },
        json: { type: 'boolean' },
        help: { type: 'boolean' },
      },
    });
  } catch (error) {
    io.error(`video: ${error.message}\n\n${HELP}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.help) {
    io.log(HELP);
    return 0;
  }
  const [command, ...args] = positionals;
  const usage = (message) => {
    io.error(`video: ${message}\n\n${HELP}`);
    return 2;
  };
  if (command !== 'import')
    return usage(
      command ? `unknown command "${command}"` : 'a command is required',
    );
  if (args.length !== 2) return usage('import needs <site-slug> and <file>');
  try {
    const result = await importVideo({
      slug: args[0],
      file: resolve(args[1]),
      source: values.source?.trim().toLowerCase(),
      owner: values.owner,
      permission: values.permission,
      author: values.author,
      credit: values.credit,
      title: values.title,
      as: values.as,
      note: values.note,
      root: process.env.LANDING_FACTORY_ROOT
        ? resolve(process.env.LANDING_FACTORY_ROOT)
        : root,
    });
    if (values.json) io.log(JSON.stringify(result.entry, null, 2));
    else
      io.log(
        `Imported ${result.entry.file} (${result.entry.width} px wide, ${result.entry.durationSec} s, ${(result.bytes / 1024).toFixed(0)} KB) and ${result.entry.poster} into sites/${args[0]}/src/assets/video/\n  ${result.entry.title}\nAppended to sites/${args[0]}/assets.json. Next: node scripts/credits.mjs --site ${args[0]}`,
      );
    return 0;
  } catch (error) {
    if (error instanceof UsageError) return usage(error.message);
    io.error(`video: ${error.message}`);
    return 1;
  }
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
      console.error(error);
      process.exitCode = 2;
    },
  );
}
