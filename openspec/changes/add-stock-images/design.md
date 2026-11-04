# Design: add-stock-images

## Facts this design relies on

- **Pexels.**
  - Its API no longer issues new keys ("New API key issuance is currently paused", seen by the owner on 2026-11-04).
  - Its license restrictions were confirmed by the owner from `https://www.pexels.com/license/` on the same day:
    - identifiable people may not appear in a bad light or in an offensive way;
    - unaltered copies may not be sold;
    - endorsement by the people or brands in a photo may not be implied;
    - photos may not be redistributed on other stock or wallpaper platforms;
    - photos may not be used as part of a trademark, design mark, trade name, business name or service mark.
  - `www.pexels.com` answers this session with a Cloudflare bot challenge, which is not bypassed.
- **Pixabay** (from its public API documentation as known when this was written; task 6.1 asks the owner to confirm the points against `https://pixabay.com/api/docs/` and `https://pixabay.com/service/license-summary/` in a browser, and the change follows those pages where they differ):
  - **Search:** `GET https://pixabay.com/api/` with `key`, `q`, `lang`, `image_type=photo`, `orientation` (`all`, `horizontal`, `vertical`), `min_width`, `min_height`, `safesearch=true`, `per_page` (3 to 200), `page` and `id`. The key is a URL parameter.
  - **A hit** has `id`, `pageURL`, `tags`, `previewURL`, `webformatURL` (640 px), `largeImageURL` (up to 1280 px), `imageWidth`, `imageHeight`, `user`, `user_id` and `userImageURL`. Larger files need approved full API access, which this change does not use.
  - **Terms:** about 100 requests per 60 seconds; requests cached for 24 hours; no permanent hotlinking (images are downloaded to your server); no systematic mass downloads; and show users where images come from when displaying search results.
  - **The content license:** free commercial use and modification without required attribution, with the same restrictions as Pexels (offensive or bad-light use of identifiable people, implied endorsement, unaltered resale, redistribution as standalone files on other platforms, use in a trademark).
  - **Size:** 1280 px is enough for most sections. For a full-bleed hero the skill prefers a Pexels import, Commons at 1920 px or SVG art, and RUN.md notes it.

## Module

- **`scripts/lib/pixabay.mjs`** holds `searchPixabay({ query, orientation, minWidth, lang, perPage, fetchImpl, now })`, `getPixabayPhoto(id)`, `pixabayEntry(hit, { file, note })` and `maskKey(text)`, all pure apart from `fetch` and the cache.
- **The cache.** Search results are cached for 24 hours in `.cache/pixabay/<sha256 of the query without the key>.json`; the key is never part of a cache file or its name.
- **Downloads** come only from `largeImageURL` whose host is `pixabay.com` (or `cdn.pixabay.com`) over `https:`; another host exits 1 and nothing is written.
- **`find-images.mjs`** adds `pixabay` to `SOURCES`, parses `pixabay:<id>` and `https://pixabay.com/photos/<slug>-<id>/`, and reuses its existing pieces:
  - throttling, here at least 1 s apart;
  - the backoff on 429 and 503;
  - the proxy re-exec;
  - the atomic file write and the manifest append.
- **Search output.** One line per hit: `pixabay:<id>`, the size, the user and the tags.
- **The title** is the first three tags, capitalised ("Physiotherapy, back, massage"), unless `--title` is given.

## Pexels import

- `find-images.mjs import <slug> <file> --source pexels --page <url> --author <name> [--author-url <url>] [--title <text>] [--as <name>]`.
- **The page** must parse as `https://www.pexels.com/photo/...`. The id is the trailing number of the slug (stored as `pexelsId` when present).
- **The file** must exist and have a JPEG, PNG or WebP signature. It is copied to `src/assets/images/<as or the file's name>`; an existing file is not overwritten (exit 1).
- **The entry:** `source: "pexels"`, `pexelsId`, `title` (default "Photo by <author>"), `sourcePage`, `author`, `authorUrl`, `license: "Pexels License"`, `licenseUrl: "https://www.pexels.com/license/"`, `credit: true`, `imported: true`.
- No network and no key.

## Key handling (Pixabay)

- The key comes only from `PIXABAY_API_KEY`. Without it, `search` and `get` exit 1 with "set PIXABAY_API_KEY in the environment's settings".
- Because the key is a URL parameter, every URL that is printed or put in an error passes through `maskKey`, which replaces the `key` parameter with `***`, and through an exact replacement of the value.
- Tests build a fake key at runtime and assert it never appears in stdout, stderr, `assets.json`, `CREDITS.md` or `.cache/`.
- The session proxy cannot inject a URL parameter, so a network-secret credential is not an option for Pixabay: the variable is.

## Test hooks

- `PIXABAY_API_URL` (base) and `STOCK_IMAGE_HOSTS` (a comma list of extra allowed image origins, for example `http://127.0.0.1:<port>`) are honored only when `NODE_TEST_CONTEXT` is set.
- In production the download origins are `https://pixabay.com` and `https://cdn.pixabay.com`.

## Credits

- Pixabay and Pexels entries are stock entries (they have `sourcePage`), so the existing grouping, the `CREDITS.md` photo table and `credits.json` work unchanged.
- `credits.mjs` adds one provider line per provider used:
  - in `CREDITS.md` under the table: "Photos provided by [Pixabay](https://pixabay.com)." and "Photos provided by [Pexels](https://www.pexels.com).";
  - in `credits.json`, a last item each: `{ "author": "Pixabay", "license": "Photos provided by Pixabay", "url": "https://pixabay.com" }`.

  Existing footers render every item.
- `credits-in-sync` compares against the same output.

## visual-assets

- The rule reads `dist/index.html` (and `/<locale>/index.html` on a multi-locale site) with the existing `html-tree` helpers.
- **Sections** are the direct `section` children of `<main>`, or `<main>`'s direct children when it has no `section`. The prospect notice is skipped.
- **A visual** is one of:
  - an `img`, or a `picture` with an `img` inside;
  - a `video`;
  - an element with `data-scene`;
  - an inline `svg` with a `viewBox` width of at least 96 that is not `aria-hidden="true"` with width or height attributes under 48.
- **Failures and warnings:**
  - no visual on the page: fail;
  - no visual in the first section: fail (`visual-assets`, naming the section's id or its first heading);
  - visuals in fewer than half of the sections: the warning `visual-assets-sparse`, with the count.
- **Fixtures:**
  - a hero with only a 24-unit icon fails;
  - a hero with an `img` passes;
  - a 120-unit decorative SVG counts;
  - two of eight sections with visuals gives the warning.

## Preflight and the script

- `preflight.mjs` gets `pixabay` in `SOURCE_HOST_CHECKS`: `pixabay.com` answers, and `PIXABAY_API_KEY` is set (checked as a boolean, never printed). A failure is a warning: the result stays ok, and the line says the build will fall back to Commons.
- `new-landing.sh` defaults `--sources` to `pixabay,commons`, validates the list against `pixabay|commons|met`, and passes it to the skill.

## Skill

- **`new-landing` image section:**
  - the source order;
  - Pixabay commands with `--lang <page language>`;
  - imported Pexels photos come first among stock when the owner left any in the site's `assets.json` or named them in the brief notes;
  - prefer hands, spaces and objects for the business's own roles;
  - the "Foto ilustrativa" / "Illustrative photo" caption where a photo could be read as the business;
  - never a stock person beside a quote, a name or a result;
  - never a stock photo in a logo or brand mark;
  - with no Pixabay key or host, note it in RUN.md Images and use Commons and SVG.
- **Imagery plan:** the proposal names a visual for the hero and for at least half of the sections, each tagged with its source.
- **Prospect section:** Pixabay, imported Pexels photos, Commons and The Met.
- **`revise-landing`:** new images follow the same order, and a customer may ask for a specific Pexels photo, which the owner imports.
