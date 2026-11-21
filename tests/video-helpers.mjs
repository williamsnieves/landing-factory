// Shared helpers of the video tests: is ffmpeg there, a clip made with ffmpeg's test source, the top-level
// atoms of an MP4. Tests that need ffmpeg skip with SKIP_REASON when it is absent.
import { execFileSync } from 'node:child_process';

function has(binary) {
  try {
    execFileSync(binary, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export const HAS_FFMPEG = has('ffmpeg') && has('ffprobe');
export const SKIP_REASON = HAS_FFMPEG
  ? false
  : 'ffmpeg and ffprobe are not installed';

/** Writes a test clip: testsrc video, optionally a sine audio track. */
export function makeClip(
  file,
  { size = '320x180', rate = 25, seconds = 2, audio = true } = {},
) {
  const args = [
    '-v',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    `testsrc=size=${size}:rate=${rate}:duration=${seconds}`,
  ];
  if (audio)
    args.push('-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}`);
  args.push('-pix_fmt', 'yuv420p', '-shortest', file);
  execFileSync('ffmpeg', args);
  return file;
}

/** Top-level atom names of an MP4 file, in order. */
export function topLevelAtoms(bytes) {
  const atoms = [];
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    let size = bytes.readUInt32BE(offset);
    atoms.push(bytes.subarray(offset + 4, offset + 8).toString('latin1'));
    if (size === 1) size = Number(bytes.readBigUInt64BE(offset + 8));
    if (size === 0) break;
    offset += size;
  }
  return atoms;
}
