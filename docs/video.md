# Video

Some landings are carried by moving footage: a looping clip behind the first statement, one short clip per feature, a gallery of clips. The factory takes footage from three places, encodes every file the same way, records it with its license or permission, and checks that the page stays usable without playback. Design: `openspec/changes/add-video/design.md`. Owner decisions (2026-11-20): one reference sheet (`patterns/buzzy-now.md`), stock video from Pixabay, and any video the owner or the customer supplies, converted to the best web format by the factory.

**The rules and checks here support compliance and are not legal advice.** The Pixabay license points are the same as for photos (see `docs/images.md`); a person confirms them again before a landing goes live.

## Sources and order

1. Footage the customer supplied (`source: "customer"`, with owner and permission).
2. Footage the factory owner supplied (`source: "owner"`, their own work).
3. **Pixabay video** (`source: "pixabay"`, Pixabay Content License).
4. No clip: the poster frame as a still image, or SVG art.

There is no AI video, no Pexels video and no audio. A prospect landing may use Pixabay video and the owner's own footage, never a customer file (a prospect has agreed to nothing).

## Pixabay video

```bash
node scripts/find-images.mjs search "ocean waves" --source pixabay-video --lang en --orientation landscape
node scripts/find-images.mjs get <slug> pixabay-video:<id> --as ocean-loop
```

- `search` uses the videos endpoint of the Pixabay API (`/api/videos/`), with the same key from `PIXABAY_API_KEY` (never an argument, masked in everything printed), safe search and a 24-hour cache in `.cache/pixabay/` (a separate cache key from photos). `--orientation` and `--min-width` apply to the medium rendition. Each hit shows `pixabay-video:<id>`, the size, the duration, the user and the tags.
- `get` downloads the `medium` rendition (the `small` one when there is no medium), up to 1280 px wide, **only from `cdn.pixabay.com`**; any other host exits 1 before anything is downloaded. `--as` is a plain name without extension.
- Then the encoder runs (below) and the entry is appended to `assets.json`: `source: "pixabay"`, `kind: "video"`, `pixabayId`, `title`, `sourcePage`, `author`, `authorUrl`, `license: "Pixabay Content License"`, `licenseUrl`, `credit: true`, plus `poster`, `durationSec`, `bytes`, `width` and `height`.

## A file you supply

```bash
node scripts/video.mjs import <slug> <file> --source customer --owner "Clinica Ribera" --permission "Written permission, 2026-11-01" --as waiting-room [--credit]
node scripts/video.mjs import <slug> <file> --source owner --author "Your name" --as studio-loop
```

- Any format `ffmpeg` reads. No URL download: you supply the file. `--source customer` needs `--owner` and `--permission` and is refused (exit 1, nothing written) on a prospect brief; `--source owner` needs `--author` and records "Own footage of the site owner". `--credit` adds a public credit line (default: none). Exit codes: 0 ok, 1 refused or failed (nothing written), 2 bad usage.
- Both kinds go in the same `assets.json` as photos (`images`), marked `kind: "video"` and with their `poster`. The checks that look at photos skip videos: the photo-reuse limit does not count a clip, and a poster is the clip's own file, not an uncredited image.

## One encoder

Every clip, from either path, goes through `scripts/lib/video-encode.mjs`, which calls the system `ffmpeg` and `ffprobe` (always with an argument array, never a shell):

- H.264 MP4 (`libx264`, high profile, `yuv420p`, CRF 28), **no audio track**, at most **1280 px wide** (never upscaled), at most **20 s** (a longer file is cut), at most 30 frames per second, `+faststart` so the index sits at the start of the file and playback can begin before the download ends.
- A WebP poster from the frame at 0.5 s (the first frame of a clip shorter than a second), same width.
- Output in `sites/<slug>/src/assets/video/<name>.mp4` and `<name>.poster.webp`.
- If the MP4 is over `video.maxKb` (default 4000 KB, `qa.config.json`) the encoder tries once more with CRF + 4; still over, it exits 1 with the measured size and records nothing. A file with no video stream, or a still image, is refused.
- `ffmpeg` is a system tool, not an npm dependency. When it is missing the command exits 1 naming it and writes nothing. The tests that need it skip with a reason; CI installs it for `npm test`. CI never downloads or encodes a landing's video: encoded files are committed like any other asset.

H.264 alone is enough: every browser plays it, the file is one, and at this size a 10 to 15 s loop is usually 1.5 to 4 MB. A second format can be added later behind the same function.

## The component

`<VideoLoop video={clip} poster={poster} label="..." priority fill class="..." locale="es">children</VideoLoop>` (`src/components/video/`, an optional layer):

- A `<figure data-video>` holding the poster as real HTML (an `astro:assets` `<picture>`: the LCP candidate, and what visitors see without JavaScript or under reduced motion) and, over it, a `<video muted loop playsinline preload="none">` with a `<source type="video/mp4">` and **no `autoplay` attribute**. The video is invisible until it has actually played, so the poster is always the picture of the clip. Children are drawn over the clip: put the scrim and the statement there.
- The clip is imported through Vite as a URL (`import clip from '../assets/video/name.mp4'`), so it is fingerprinted and served from the site. The page adds no origin and the Content-Security-Policy does not change (`media-src` falls back to `default-src 'self'`). A file under about 4 KB would be inlined as a `data:` URL by Vite and blocked: real clips are far above it.
- `client.ts` (an Astro-processed module script, never `is:inline`) plays a clip while at least a quarter of it is in view, pauses it off-screen and in a hidden tab, never plays under `prefers-reduced-motion: reduce` (and pauses if the preference changes), and shows a pause/play button (WCAG 2.2.2: motion that lasts more than 5 seconds needs a way to stop it). The button's labels are in `texts.ts` (`en`, `es`; other locales show English). It disconnects its observers on `astro:before-swap`.
- A clip without `label` is decorative (`aria-hidden`); with one, the video carries it as its accessible name.
- `priority` loads the poster eagerly with high priority. Use it for the clip of the first screen only: the final check expects the hero clip's poster to be that image.
- **Layer.** `video` is an optional layer like `3d`, `legal`, `forms` and `maps` (`scripts/site-layers.mjs`): `new-site` copies `src/components/video/` into every site, the build prunes it when no page imports it, `add video --site <slug>` restores it.
- **Starter demo.** `/video/` (`noindex`) shows the component over `src/assets/video/demo-loop.mp4`, a 4 s clip made from ffmpeg's own generated `gradients` source (nothing filmed, provenance "self") and encoded with the factory encoder (about 40 KB with its poster). The starter has no `assets.json`; delete the folder and the clip in a real landing.

## Checks

- **QA** (`npm run qa`, group `video`, `--skip video` skips it): on every page with `[data-video]`:
  - `video-reduced-motion`: a load with `prefers-reduced-motion: reduce` must leave every video paused and every poster visible;
  - `video-no-js`: a load with JavaScript disabled must show the poster and play nothing;
  - `video-runtime`: a normal load at 1440 px, scrolled to each clip, must start it (not paused, `currentTime` advancing) within `video.playTimeoutMs` (8 s) with no console or page errors about media. A browser that cannot decode H.264 cannot play any clip: the report then says playback was not verified instead of failing;
  - `video-budget`: each served `.mp4` stays within `video.maxKb` (4000) and the page within `video.maxPerPage` (6) clips.
- **Final check** (`check-landing`, rule `video-assets`, only when `dist/` has an `.mp4` or `assets.json` has video entries): every video file in the build has an `assets.json` entry; each entry has its file, a license (or owner and permission for a customer file) and a poster that exists; the poster of a clip in the first section is an eager, high-priority image. A warning (`video-assets-no-build`) says when there is no build to check.
- **Credits.** `credits.mjs` lists clips under "Video" in `CREDITS.md` and adds the footer credit of the author and "Videos provided by Pixabay" (one line "Photos and videos provided by Pixabay" when both are used). A customer or owner clip with `credit: false` adds no footer line.

## Archetype

`design-archetypes/cinematic-loop.md`: a full-bleed muted looping clip behind a centred statement and a strong scrim, a framed second clip overlapping the next band, one short clip per feature row, a clip gallery that loads in view, alternating dark and light bands and one bright accent for the main action. Impact `balanced` and `bold`; it lends `video-scrim-hero` and `clip-feature-rows`; `pick-archetypes` maps the `buzzy-now` sheet onto it. Its guard rails: every clip has a poster and a reduced-motion form, at most one clip playing per viewport, 4.5:1 text contrast over the brightest frame, no sound, no countdown or urgency strip.

## Out of scope

AI video, Pexels video, audio, a second format (WebM, AV1), streaming (HLS), a video CMS, downloading a video from a URL, subtitles, video analytics, video downloaded or encoded in CI.
