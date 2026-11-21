import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import {
  encodeArgs,
  encodeVideo,
  probeVideo,
  VideoError,
} from '../scripts/lib/video-encode.mjs';
import {
  HAS_FFMPEG,
  makeClip,
  SKIP_REASON,
  topLevelAtoms,
} from './video-helpers.mjs';

const dir = mkdtempSync(join(tmpdir(), 'video-encode-'));
after(() => rmSync(dir, { recursive: true, force: true }));

test('encodeArgs: argv only, no audio, faststart, scaled, fps capped for fast sources', () => {
  const args = encodeArgs({
    input: 'in.mov',
    output: 'out.mp4',
    maxWidth: 1280,
    maxSeconds: 20,
    crf: 28,
    fps: 60,
  });
  assert.ok(args.includes('-an'));
  assert.equal(args[args.indexOf('-t') + 1], '20');
  assert.equal(args[args.indexOf('-movflags') + 1], '+faststart');
  assert.match(
    args[args.indexOf('-vf') + 1],
    /scale=min\(1280\\,iw\):-2,fps=30/,
  );
  const slow = encodeArgs({
    input: 'a',
    output: 'b',
    maxWidth: 1280,
    maxSeconds: 20,
    crf: 28,
    fps: 24,
  });
  assert.doesNotMatch(slow[slow.indexOf('-vf') + 1], /fps=/);
});

test(
  'a large clip with sound is encoded to a small, silent, faststart MP4 with a poster',
  { skip: SKIP_REASON },
  async () => {
    const input = makeClip(join(dir, 'big.mp4'), {
      size: '1600x900',
      rate: 50,
      seconds: 21,
    });
    const out = join(dir, 'out');
    const result = await encodeVideo({ input, outDir: out, name: 'loop' });
    const probe = await probeVideo(result.file);
    assert.ok(probe.width <= 1280);
    assert.equal(probe.width, 1280);
    assert.ok(probe.durationSec <= 20.2);
    assert.equal(probe.hasAudio, false);
    assert.equal(probe.videoCodec, 'h264');
    assert.ok(probe.fps <= 30.5);
    assert.ok(existsSync(join(out, 'loop.poster.webp')));
    const poster = readFileSync(join(out, 'loop.poster.webp'));
    assert.equal(poster.subarray(0, 4).toString('latin1'), 'RIFF');
    assert.equal(poster.subarray(8, 12).toString('latin1'), 'WEBP');
    const atoms = topLevelAtoms(readFileSync(result.file));
    assert.ok(atoms.includes('moov') && atoms.includes('mdat'));
    assert.ok(
      atoms.indexOf('moov') < atoms.indexOf('mdat'),
      `moov must come before mdat, got ${atoms.join(',')}`,
    );
    assert.equal(result.bytes, readFileSync(result.file).length);
  },
);

test('a small source is not upscaled', { skip: SKIP_REASON }, async () => {
  const input = makeClip(join(dir, 'small.mp4'), { size: '320x180' });
  const result = await encodeVideo({
    input,
    outDir: join(dir, 'out2'),
    name: 'small',
  });
  assert.equal(result.width, 320);
  assert.equal(result.height, 180);
});

test(
  'a clip still over the limit after the stronger pass is refused and leaves nothing',
  { skip: SKIP_REASON },
  async () => {
    const input = makeClip(join(dir, 'huge.mp4'), {
      size: '1280x720',
      seconds: 4,
    });
    const out = join(dir, 'out3');
    await assert.rejects(
      encodeVideo({ input, outDir: out, name: 'huge', maxKb: 1 }),
      (error) =>
        error instanceof VideoError &&
        /KB after a stronger pass/.test(error.message),
    );
    assert.equal(existsSync(join(out, 'huge.mp4')), false);
    assert.equal(existsSync(join(out, 'huge.poster.webp')), false);
  },
);

test(
  'a file without a video stream is refused',
  { skip: SKIP_REASON },
  async () => {
    const { execFileSync } = await import('node:child_process');
    const audio = join(dir, 'only-audio.m4a');
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=1',
      audio,
    ]);
    await assert.rejects(
      encodeVideo({ input: audio, outDir: join(dir, 'o4'), name: 'a' }),
      /no video stream/,
    );
  },
);

test('an invalid name is refused before anything runs', async () => {
  await assert.rejects(
    encodeVideo({ input: 'x', outDir: dir, name: '../evil' }),
    /lowercase/,
  );
});

test('a missing ffmpeg is named and nothing is written', async () => {
  const out = join(dir, 'o5');
  const input = join(dir, 'present.mp4');
  (await import('node:fs')).writeFileSync(input, 'x');
  await assert.rejects(
    encodeVideo({
      input,
      outDir: out,
      name: 'a',
      env: {
        NODE_TEST_CONTEXT: '1',
        FFMPEG_BIN: join(dir, 'no-such-ffmpeg'),
      },
    }),
    /ffmpeg is not installed/,
  );
  assert.equal(existsSync(join(out, 'a.mp4')), false);
});

test('without NODE_TEST_CONTEXT the binary override is ignored', async () => {
  if (!HAS_FFMPEG) return;
  await assert.doesNotReject(
    probeVideo(makeClip(join(dir, 'p.mp4')), {
      FFPROBE_BIN: '/nonexistent',
    }),
  );
});
