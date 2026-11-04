# Design: add-pexels-images

## Facts this design relies on

- **API.** From the official `pexels` npm client, version 1.4.0, read in this session:
  - the base is `https://api.pexels.com/v1/`;
  - photo search is `search?query=&orientation=&size=&locale=&per_page=&page=`, and one photo is `photos/<id>`;
  - the key goes raw in the `Authorization` header;
  - a photo object has `id`, `width`, `height`, `url` (the photo page), `alt`, `photographer`, `photographer_url`, `photographer_id`, `avg_color` and `src` (`original`, `large2x`, `large`, `medium`, `small`, `portrait`, `landscape`, `tiny`).
- **License.** `www.pexels.com` answers this session with a Cloudflare bot challenge, so its license and API terms pages were not read, and the challenge is not bypassed. Task 6.1 asks the owner to read `https://www.pexels.com/license/` and the API terms in a browser and confirm the points the proposal relies on:
  - commercial use and modification are allowed;
  - attribution is not required;
  - the API asks for a link to Pexels and credit to photographers;
  - downloaded photos may be served from our own site;
  - there are restrictions on identifiable people and endorsement, on selling unaltered copies and on running a competing service.

  If a point differs, the change follows the page.

## Module

- **`scripts/lib/pexels.mjs`** holds `searchPexels({ query, orientation, minWidth, locale, perPage, fetchImpl })`, `getPexelsPhoto(id)` and `pexelsEntry(photo, { file, width, note })`, all pure apart from `fetch`.
- **`find-images.mjs`** adds `pexels` to `SOURCES` and parses `pexels:<id>` and `https://www.pexels.com/photo/<slug>-<id>/`. Its existing pieces are reused:
  - throttling (at least 1 s apart);
  - the backoff on 429 and 503, honoring `Retry-After`;
  - the proxy re-exec;
  - the standard widths (960, 1280, 1920);
  - the atomic file write and the manifest append.
- **Download.** The file comes from `src.original` with `?auto=compress&cs=tinysrgb&w=<width>`. The download URL must parse as `https:` with host `images.pexels.com`; otherwise the command exits 1 and nothing is written.
- **Search output.** One line per hit: `pexels:<id>`, the size, the photographer, the alt text and the average color, so the build can pick by tone.

## Key handling

- The key comes from `PEXELS_API_KEY` when set, and is sent as `Authorization: <key>`.
- When the variable is unset, the request goes out without the header, so the session proxy can add a credential saved for `api.pexels.com`.
- On 401 or 403 the command exits 1 with "no Pexels API key: set PEXELS_API_KEY or save a credential for api.pexels.com".
- Every error message passes through `scripts/report/mask.mjs` and an exact replacement of the key value, as `ai-images.mjs` does.
- Tests build a fake key at runtime and assert it never appears in stdout, stderr, `assets.json` or `CREDITS.md`.

## Test hooks

- `PEXELS_API_URL` (base) and `PEXELS_IMAGE_HOSTS` (comma list of extra allowed image origins, for example `http://127.0.0.1:<port>`) are honored only when `NODE_TEST_CONTEXT` is set.
- In production the only download origin is `https://images.pexels.com`.

## Credits

- A Pexels entry is a stock entry (it has `sourcePage`), so the existing grouping, the `CREDITS.md` photo table and `credits.json` work unchanged.
- `credits.mjs` adds, when any entry has `source: "pexels"`:
  - in `CREDITS.md`, under the photo table, the line "Photos provided by [Pexels](https://www.pexels.com).";
  - in `credits.json`, a last item `{ "author": "Pexels", "license": "Photos provided by Pexels", "url": "https://www.pexels.com" }`.

  Existing footers already render every item, so no component changes.
- `check-landing` `credits-in-sync` compares against the same output, so it stays exact.

## visual-assets

- The rule reads `dist/index.html` (and `/<locale>/index.html` on a multi-locale site) with the existing `html-tree` helpers.
- **Sections** are the direct `section` children of `<main>`, or `<main>`'s direct children when it has no `section`. The prospect notice strip is skipped.
- **A visual** is one of:
  - an `img`, or a `picture` with an `img` inside;
  - a `video`;
  - an element with `data-scene` (its poster is an `img`);
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

- `preflight.mjs` gets `pexels` in `SOURCE_HOST_CHECKS`, with `api.pexels.com` (expects 200, 401 or 403: the host answers) and `images.pexels.com`. Pexels failures are warnings: the result stays ok, and the line says the build will fall back to Commons.
- `new-landing.sh` defaults `--sources` to `pexels,commons`, validates the list against `pexels|commons|met`, and passes it to the skill.

## Skill

- **`new-landing` image section:**
  - the source order;
  - `search ... --source pexels --lang <page language>`;
  - prefer hands, spaces and objects for the business's own roles;
  - the "Foto ilustrativa" / "Illustrative photo" caption when a photo could be read as the business;
  - never a stock person beside a quote, a name or a result;
  - with no Pexels key or host, note it in RUN.md Images and use Commons and SVG.
- **Imagery plan:** the proposal names a visual for the hero and for at least half of the sections, each tagged with its source.
- **Prospect section:** Pexels, Commons and The Met.
- **`revise-landing`:** new images follow the same order.
