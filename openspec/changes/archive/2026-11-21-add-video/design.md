# Design: add-video

## Encoding

One function, `encodeVideo({ input, outDir, name, maxWidth = 1280, maxSeconds = 20, crf = 28 })`, used by both sources:

- `ffprobe` first: refuse a file with no video stream, and report width, height, duration and codecs.
- `ffmpeg -i <in> -t <maxSeconds> -an -vf "scale='min(<maxWidth>,iw)':-2,fps=min(30\,source)" -c:v libx264 -preset slow -crf <crf> -pix_fmt yuv420p -profile:v high -movflags +faststart <name>.mp4`. Every argument is an argv element (`execFile`), never a shell string.
- Poster: one frame at 0.5 s (or the first frame of a shorter clip) as WebP, same width.
- If the result is over `video.maxKb`, retry once with `crf + 4`; still over: exit 1 with the measured size, nothing recorded.
- Output in `sites/<slug>/src/assets/video/` (`<name>.mp4`, `<name>.poster.webp`); the MP4 is imported through Vite as a URL so it is fingerprinted, and the poster goes through `astro:assets`.

H.264 MP4 alone is chosen over adding WebM or AV1: every browser plays it, the file is one, and at 1280 px, no audio and CRF 28 a 10 to 15 s loop is usually 1.5 to 4 MB. A second format can be added later behind the same function.

## Sources

- **Pixabay video.** The videos endpoint of the same API (`/api/videos/`), same key from `PIXABAY_API_KEY`, safe search, cached 24 h. `get` downloads the `medium` rendition (or `small` when `medium` is absent) only from `cdn.pixabay.com`, then encodes it. Entry: `source: "pixabay"`, `kind: "video"`, `pixabayId`, `license: "Pixabay Content License"`, `credit: true`, `author`, `page`.
- **Supplied file.** `video.mjs import <slug> <file> --source customer --owner "..." --permission "..." [--credit]` or `--source owner` (the factory owner's own footage, with `--author`). Same encoder. A prospect brief refuses `customer` (like customer images). No URL download: the person supplies the file.

## Layer

`<VideoLoop video poster label? decorative? class? />`: `<figure data-video>` holding `<video muted loop playsinline preload="none" poster="...">` with a `<source type="video/mp4">`, and a small pause/play button. The module script (`client.ts`, Astro-processed, never `is:inline`): if `matchMedia('(prefers-reduced-motion: reduce)')` matches, do nothing; else an IntersectionObserver plays at 25% visibility and pauses below it, `visibilitychange` pauses in hidden tabs, and the button toggles a per-clip paused state that observers respect. `astro:before-swap` disconnects observers. No autoplay attribute means no-JS shows the poster.

## Checks

QA adds a `video` group for pages with `[data-video]`: reduced-motion load (every video `paused`, `currentTime` 0, poster visible), JS-disabled load (poster visible), normal load scrolled to each clip (it plays without errors), budget (byte size of each `.mp4` in `dist/` against `video.maxKb`, count per page against `video.maxPerPage`). `--skip video` skips it. `check-landing` `video-assets` reads `dist/` and `assets.json`.

## Archetype

`cinematic-loop` front matter: fits `bold`, `product-showcase`, `storytelling`, `photo-rich` (the closest existing signal to rich media; the sheet says footage counts), avoid `few-assets`, `serious`, `local-service`; impact `[balanced, bold]`; hero `[video]`; lends `video-scrim-hero`, `clip-feature-rows` (added to the closed trait vocabulary). The sheet requires: every clip has a poster and a reduced-motion form, at most one clip playing per viewport, a scrim giving 4.5:1 text contrast over the brightest frame, no sound, no countdown or urgency strip.
