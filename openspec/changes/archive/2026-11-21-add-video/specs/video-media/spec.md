## ADDED Requirements

### Requirement: Licensed video sources
The factory SHALL take video only from Pixabay (through the Pixabay API with the same key, license and host rules as photos) or from a file a person supplies with its source and permission, and SHALL record every video in `assets.json` with `kind: "video"`, its poster, duration, byte size and provenance.

#### Scenario: Pixabay video
- **WHEN** `find-images.mjs get <slug> pixabay-video:<id>` runs with a valid key
- **THEN** it downloads only from `cdn.pixabay.com`, encodes the file and appends an entry with `source: "pixabay"`, `kind: "video"`, the license and `credit: true`

#### Scenario: Customer video on a prospect
- **WHEN** `video.mjs import` runs with `--source customer` on a site whose brief is a prospect
- **THEN** it exits 1 and records nothing

### Requirement: One web encoding
Every video SHALL be encoded by the factory to H.264 MP4 without an audio track, at most 1280 px wide and 20 s long, with the index at the start of the file, plus a WebP poster, and SHALL be refused when it stays over `video.maxKb` after one stronger pass.

#### Scenario: Large source file
- **WHEN** a 4K, 60 s clip with sound is imported
- **THEN** the stored MP4 is at most 1280 px wide, at most 20 s, has no audio stream and has a poster next to it

#### Scenario: No ffmpeg
- **WHEN** `ffmpeg` is not installed
- **THEN** the command exits 1 naming the missing tool and writes nothing

### Requirement: Poster-first video layer
The optional video layer SHALL render each clip as a muted, looping, inline `<video>` with a poster and no `autoplay` attribute, play it only while in view, pause it off-screen, never play it under reduced motion and offer a visible pause control.

#### Scenario: Reduced motion
- **WHEN** a page with a clip loads with `prefers-reduced-motion: reduce`
- **THEN** no video plays and the poster is visible

#### Scenario: No JavaScript
- **WHEN** a page with a clip loads with JavaScript disabled
- **THEN** the poster is visible and no video plays

### Requirement: Video checks
QA SHALL fail a page whose clips play under reduced motion, show no poster without JavaScript, do not play when in view, or exceed `video.maxKb` per file or `video.maxPerPage` clips, and the final check SHALL fail a built video without an `assets.json` entry, license or permission, or poster.

#### Scenario: Uncredited clip
- **WHEN** the build serves an `.mp4` that `assets.json` does not list
- **THEN** `check-landing` fails `video-assets` naming the file
