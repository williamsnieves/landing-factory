# Proposal: add-video

## Why

The owner wants a new kind of landing where moving footage carries the page (owner request 2026-11-19, reference buzzy.now; artlist.io could not be analyzed because its TDM reservation file cannot be verified). Today the factory can only find and record still images, `landing-meta` already allows `hero: video` but nothing builds or checks one, and no archetype owns a video-led grammar. Owner decisions (2026-11-20): one reference (`patterns/buzzy-now.md`), stock video from Pixabay, and any video the owner or customer supplies, converted to the best web format by the factory.

## What Changes

- **Video sources.** `find-images.mjs` gains Pixabay videos (`--source pixabay-video` search, `get <slug> pixabay-video:<id>`; same key, license and host rules as Pixabay photos). A new `scripts/video.mjs import <slug> <file> --source customer|owner ...` takes a supplied file. Every video, from either path, goes through one encoder (`scripts/lib/video-encode.mjs`, system `ffmpeg`): H.264 MP4, no audio track, at most 1280 px wide, at most 20 s, `+faststart`, plus a WebP poster from an early frame. Each is recorded in `assets.json` with `kind: "video"`, its poster, duration, size and provenance. `credits.mjs` lists videos. AI video, Pexels video and audio are out of scope.
- **Video layer.** `src/components/video/` (an optional layer like maps): `<VideoLoop />` renders a poster-first `<video muted loop playsinline preload="none">` with no `autoplay` attribute; its module script starts playback only when the clip is in view, pauses it off-screen and in hidden tabs, never plays under `prefers-reduced-motion`, and shows a visible pause button (autoplaying motion longer than 5 s needs one, WCAG 2.2.2). Without JavaScript the poster shows. Decorative clips are `aria-hidden`; meaningful ones carry a label.
- **Checks.** QA (pages with `[data-video]`): a reduced-motion load and a JavaScript-disabled load show the poster and play nothing; a normal load plays the clip in view; each served video stays within `video.maxKb` (default 4000) and the page within `video.maxPerPage` (default 6). `check-landing` `video-assets`: every video in the build has an `assets.json` entry with license or permission and a poster, and the hero video's poster is the LCP candidate.
- **Archetype.** A 15th sheet, `cinematic-loop`: a full-bleed muted looping clip behind a centred statement with a strong scrim, a framed second clip overlapping the next band, one short clip per feature row, a clip gallery that loads in view, alternating dark and light bands, one bright accent for the main action. Impact `balanced` and `bold`; lends `video-scrim-hero` and `clip-feature-rows`. `REF_RULES` maps the `buzzy-now` sheet onto it.
- **Docs.** `docs/video.md`; CLAUDE.md ("Generating a landing" images line, a "Video" section, layers, QA, archetypes count); the `new-landing` skill's source order and build rules for video.

## Capabilities

### New Capabilities

- `video-media`: video sources, the encoder, the record, the layer and its checks.

### Modified Capabilities

- `design-archetypes`: the `cinematic-loop` archetype.

## Impact

- **Code:** `scripts/find-images.mjs`, `scripts/lib/pixabay.mjs`, new `scripts/video.mjs` and `scripts/lib/video-encode.mjs`, `scripts/credits.mjs`, `scripts/check-landing.mjs`, `scripts/qa.mjs` and `scripts/qa/`, `scripts/site-layers.mjs`, `scripts/new-site.mjs`, `scripts/pick-archetypes.mjs`, `src/components/video/`, a `/video/` noindex demo page, `knip.json`, `qa.config.json`, `design-archetypes/cinematic-loop.md`, `patterns/buzzy-now.md`.
- **Tests:** encoder (a tiny video generated at test time with ffmpeg's test source), Pixabay video search and get against a local fake server, `video.mjs import` refusals, QA fixtures for reduced motion, no-JS and budget, `check-landing` `video-assets`, layer prune and add, archetype validation and ranking.
- **Dependencies:** none added to npm; `ffmpeg` is a system tool needed only to encode (tests that need it skip with a reason when it is absent; CI installs it for them). CI never downloads or encodes a landing's video: encoded files are committed.
- **No existing site changes.**
