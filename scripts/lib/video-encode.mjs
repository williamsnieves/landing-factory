// The one video encoder of the factory: probe a file and turn it into a web loop (H.264 MP4, no audio track,
// at most 1280 px wide and 20 s long, index at the start of the file) plus a WebP poster. Both video sources
// (Pixabay downloads in scripts/find-images.mjs and supplied files in scripts/video.mjs) go through it.
// Design: openspec/changes/add-video/design.md.
//
// ffmpeg and ffprobe are system tools, always started with execFile and an argv array (never a shell). When
// one is missing the error names it and nothing is written. Test hooks, honored only when NODE_TEST_CONTEXT
// is set: FFMPEG_BIN and FFPROBE_BIN (a path, to simulate a missing tool).
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { loadConfig } from '../qa/config.mjs';

const run = promisify(execFile);

export const DEFAULTS = Object.freeze({
  maxWidth: 1280,
  maxSeconds: 20,
  crf: 28,
  maxKb: 4000,
  retryStep: 4,
});

/** An error whose message is safe to print. */
export class VideoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VideoError';
  }
}

const NAME = /^[a-z0-9][a-z0-9-]*$/;

function tool(name, env = process.env) {
  const variable = name === 'ffmpeg' ? 'FFMPEG_BIN' : 'FFPROBE_BIN';
  return env.NODE_TEST_CONTEXT && env[variable] ? env[variable] : name;
}

/** Runs a tool; a missing binary becomes a VideoError that names it. */
async function exec(name, args, env = process.env) {
  try {
    return await run(tool(name, env), args, {
      maxBuffer: 32 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
    });
  } catch (error) {
    if (error.code === 'ENOENT')
      throw new VideoError(
        `${name} is not installed: install ffmpeg (for example apt-get install ffmpeg) and run again; nothing was written`,
      );
    const detail = String(error.stderr ?? error.message)
      .trim()
      .split('\n')
      .slice(-3)
      .join(' ');
    throw new VideoError(`${name} failed: ${detail}`);
  }
}

/** `video.maxKb` for a site: its own qa.config.json when it has one, else the factory's. */
export function videoMaxKb(root, slug) {
  const own = join(root, 'sites', slug, 'qa.config.json');
  const file = existsSync(own) ? own : join(root, 'qa.config.json');
  return loadConfig(file).video.maxKb;
}

/** Throws a VideoError when ffmpeg or ffprobe cannot be started. */
export async function assertTools(env = process.env) {
  await exec('ffmpeg', ['-version'], env);
  await exec('ffprobe', ['-version'], env);
}

const rate = (text) => {
  const [a, b] = String(text ?? '0/1')
    .split('/')
    .map(Number);
  return b ? a / b : 0;
};

/**
 * What ffprobe says about a file: { width, height, durationSec, fps, videoCodec, audioCodec, hasAudio }.
 * Refuses a file with no video stream or with no duration (a still image).
 */
export async function probeVideo(file, env = process.env) {
  const { stdout } = await exec(
    'ffprobe',
    [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      file,
    ],
    env,
  );
  let data;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new VideoError(`${file} is not a media file ffprobe can read`);
  }
  const streams = data.streams ?? [];
  const video = streams.find((s) => s.codec_type === 'video');
  if (!video) throw new VideoError(`${file} has no video stream`);
  const audio = streams.find((s) => s.codec_type === 'audio');
  const durationSec = Number(data.format?.duration ?? video.duration ?? 0);
  if (!(durationSec > 0.1))
    throw new VideoError(
      `${file} has no duration: it is a still image, not a video`,
    );
  return {
    width: Number(video.width),
    height: Number(video.height),
    durationSec,
    fps: rate(video.avg_frame_rate) || rate(video.r_frame_rate),
    videoCodec: video.codec_name,
    audioCodec: audio?.codec_name ?? null,
    hasAudio: Boolean(audio),
  };
}

/** The ffmpeg argv of one encoding pass (exported for the tests). */
export function encodeArgs({ input, output, maxWidth, maxSeconds, crf, fps }) {
  const filters = [`scale=min(${maxWidth}\\,iw):-2`];
  if (fps > 30.5) filters.push('fps=30');
  return [
    '-y',
    '-v',
    'error',
    '-i',
    input,
    '-t',
    String(maxSeconds),
    '-an',
    '-vf',
    filters.join(','),
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    String(crf),
    '-pix_fmt',
    'yuv420p',
    '-profile:v',
    'high',
    '-movflags',
    '+faststart',
    output,
  ];
}

/**
 * Encode `input` into `<outDir>/<name>.mp4` and `<outDir>/<name>.poster.webp`. One stronger pass (crf + 4)
 * when the MP4 is over `maxKb`; still over: a VideoError with the measured size and nothing is left on disk.
 * Returns { file, poster, bytes, width, height, durationSec, crf, source }.
 */
export async function encodeVideo({
  input,
  outDir,
  name,
  maxWidth = DEFAULTS.maxWidth,
  maxSeconds = DEFAULTS.maxSeconds,
  crf = DEFAULTS.crf,
  maxKb = DEFAULTS.maxKb,
  env = process.env,
}) {
  if (!NAME.test(String(name ?? '')))
    throw new VideoError(
      `video name "${name}" must be lowercase letters, digits and "-"`,
    );
  if (!existsSync(input)) throw new VideoError(`${input} does not exist`);
  await assertTools(env);
  const source = await probeVideo(input, env);
  mkdirSync(outDir, { recursive: true });
  const mp4 = join(outDir, `${name}.mp4`);
  const poster = join(outDir, `${name}.poster.webp`);
  const cleanup = () => {
    rmSync(mp4, { force: true });
    rmSync(poster, { force: true });
  };

  try {
    let used = crf;
    let bytes = 0;
    for (let pass = 0; pass < 2; pass += 1) {
      await exec(
        'ffmpeg',
        encodeArgs({
          input,
          output: mp4,
          maxWidth,
          maxSeconds,
          crf: used,
          fps: source.fps,
        }),
        env,
      );
      bytes = statSync(mp4).size;
      if (bytes <= maxKb * 1024) break;
      if (pass === 0) used += DEFAULTS.retryStep;
      else
        throw new VideoError(
          `${name}.mp4 is ${(bytes / 1024).toFixed(0)} KB after a stronger pass (limit ${maxKb} KB, video.maxKb in qa.config.json): trim the clip or use a simpler one; nothing was recorded`,
        );
    }
    const result = await probeVideo(mp4, env);
    // The poster: one early frame (the first frame of a clip shorter than a second), same width as the video.
    await exec(
      'ffmpeg',
      [
        '-y',
        '-v',
        'error',
        '-ss',
        result.durationSec >= 1 ? '0.5' : '0',
        '-i',
        mp4,
        '-frames:v',
        '1',
        '-c:v',
        'libwebp',
        '-quality',
        '80',
        poster,
      ],
      env,
    );
    if (!existsSync(poster))
      throw new VideoError(`ffmpeg wrote no poster for ${name}`);
    return {
      file: mp4,
      poster,
      bytes,
      width: result.width,
      height: result.height,
      durationSec: Math.round(result.durationSec * 100) / 100,
      crf: used,
      source,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}
