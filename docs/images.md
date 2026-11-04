# Images

Where a landing's photos come from, in which order, how the keys work, what the licenses forbid and how every landing is checked for visuals. Design: `openspec/changes/add-stock-images/design.md`.

**The rules and checks here support compliance and are not legal advice.** The license points below were read from the providers' pages by the owner on 2026-11-04; the providers can change them, so a person confirms them again (task 6.1 of the change) before a landing goes live.

## Sources and order

Every image need is filled in this order (`/new-landing` and `/revise-landing` follow it):

1. The customer's files (`source: "customer"`).
2. AI images, only where the brief allows them and the art direction asks for illustration (see "AI images" in `CLAUDE.md`). A prospect cannot consent, so a prospect landing has none.
3. **Pexels** photos the owner imported by hand (below).
4. **Pixabay**, for business, people-at-work, place and object photos.
5. Wikimedia Commons and The Met, for real, named subjects and for historical or cultural niches.
6. SVG and CSS art made in the build.

`scripts/new-landing.sh --sources` picks the archives to search: the default is `pixabay,commons`, and `--sources commons,met` keeps working. Every photo is downloaded once, committed with the site and served from the landing itself, so there is no third-party host at view time, no cookie and no change to the Content-Security-Policy. Each file is recorded in `sites/<slug>/assets.json` and credited by `node scripts/credits.mjs --site <slug>`.

## Pixabay (automatic)

```bash
node scripts/find-images.mjs search "physiotherapy treatment room" --source pixabay --lang en --min-width 1280 --orientation landscape
node scripts/find-images.mjs get <slug> pixabay:<id> --as treatment-room
```

- `search` asks the Pixabay API for photos only, with safe search on, the orientation, the minimum width and the query language. It prints one hit per entry: the `pixabay:<id>` reference, the size, the user and the tags. Identical searches are cached for 24 hours in `.cache/pixabay/` (git-ignored; the file name is a hash of the query, never the key).
- `get` downloads the large image (up to 1280 px wide) from `pixabay.com` or `cdn.pixabay.com` only; any other host exits 1 and nothing is written. The entry records `source: "pixabay"`, `pixabayId`, `title` (the first three tags), `sourcePage`, `author` and `authorUrl`, `license: "Pixabay Content License"`, `licenseUrl` and `credit: true`.
- Requests are throttled (1 s apart) and retried on HTTP 429 and 503 with a capped backoff, inside Pixabay's limit of about 100 requests per 60 seconds.
- 1280 px is enough for sections and cards. For a full-bleed hero the build prefers an imported Pexels photo, a Commons image at 1920 px or SVG art, and says so in `RUN.md`.

### The Pixabay key

1. The owner registers at pixabay.com and copies the free API key from the API documentation page.
2. He adds it as the environment variable `PIXABAY_API_KEY` in the **Claude cloud environment's settings** (the environment's variables), and adds `pixabay.com` to the environment's allowed hosts. He never types the key into a chat.
3. It is **not** a GitHub secret and **not** a network secret: Pixabay takes the key as a URL parameter (`?key=...`), which the session proxy cannot inject. CI never calls Pixabay.

The key is read only from `PIXABAY_API_KEY`, never from an argument. Because it travels in a URL, every URL printed or placed in an error shows `key=***`, and the key is never stored in `assets.json`, `CREDITS.md` or the cache. Without the key `search` and `get` exit 1 saying to set `PIXABAY_API_KEY`; `npm run preflight -- --sources pixabay` (the default of `new-landing.sh`) only warns when the host or the key is missing, and the build falls back to Commons and SVG art, noted in `RUN.md`.

## Pexels (manual import)

Pexels has paused the issuing of new API keys (the owner saw "New API key issuance is currently paused" on 2026-11-04), and `www.pexels.com` answers bots with a challenge the factory does not bypass. So the owner picks and downloads Pexels photos himself and imports them:

```bash
node scripts/find-images.mjs import <slug> ~/Downloads/pexels-photo-1234567.jpeg \
  --source pexels --page https://www.pexels.com/photo/woman-stretching-1234567/ \
  --author "Ana Ruiz" [--author-url https://www.pexels.com/@ana-ruiz/] [--title "Stretching in a studio"] [--as studio]
```

- It makes no network request and needs no key.
- `--page` must be a `https://www.pexels.com/photo/...` URL (exit 2 otherwise); the file must be a JPEG, PNG or WebP (exit 1 otherwise); an existing target is never overwritten (exit 1).
- The entry records `source: "pexels"`, `pexelsId` (the trailing number of the page), `title` (default "Photo by <author>"), `sourcePage`, `author`, `authorUrl`, `license: "Pexels License"`, `licenseUrl`, `credit: true` and `imported: true`.
- A photo the owner leaves in `assets.json` (or names in the brief notes) comes first among stock in the next build.

## License rules

Both lists were confirmed by the owner from the license pages (`https://www.pexels.com/license/`, `https://pixabay.com/service/license-summary/`) on 2026-11-04. Commercial use and modification are allowed and no attribution is required, and the factory credits every photographer anyway.

Not allowed, so the build never does it:

- Showing an identifiable person in a bad light or in an offensive way.
- Implying endorsement by the people or brands in a photo. A stock person is never presented as the business's team, customers, patients, founder or reviewers, and never sits next to a quote, a name, a testimonial or a result.
- Using a photo as part of a logo, brand mark, trade name or business name.
- Showing a recognisable trademark, logo or brand (Pixabay forbids commercial use of such content). The build skips those photos, and a person checks by eye before launch.
- Misleading or deceptive use.
- Selling unaltered copies.
- Redistributing photos on other stock or wallpaper platforms.

A photo that shows people is illustrative: the page carries the caption "Foto ilustrativa" (`es`) or "Illustrative photo" (`en`) wherever it could be read as showing the business, and the build prefers hands, spaces and objects for the business's own roles. Credits: Pixabay and Pexels photos appear in the photo table of `CREDITS.md` and in `src/data/credits.json` with the photographer and the license, plus one "Photos provided by Pixabay" or "Photos provided by Pexels" line for each provider used.

Pending owner confirmation (task 6.1): the Pixabay API facts in `design.md` (parameters, limits, the 24-hour cache rule, no permanent hotlinking) and that commercial use needs no attribution, to be read at `https://pixabay.com/api/docs/` and `https://pixabay.com/service/license-summary/`.

## Every landing carries visuals

The owner's rule (2026-11-04): a landing without images or SVG resources is very rare. `check-landing` enforces it with the rule `visual-assets`, read from the built home page (each locale's home page on a multi-locale site):

- **Visual.** An `img` (or a `picture` with one), a `video`, an element with `data-scene` (a 3D poster), an illustration drawn in HTML and CSS with `role="img"` and an `aria-label` (such as a product mock), or an inline `svg` whose `viewBox` is at least 96 units wide. An `aria-hidden="true"` svg with a `width` or `height` attribute under 48 is an icon and does not count; CSS backgrounds are not read.
- **Sections.** The direct `section` children of `<main>`, or its direct children when it has none. The prospect notice is not a section.
- **Fails** (`visual-assets`) when the page has no visual, or when the first section (the hero) has none, naming the page and the section.
- **Warns** (`visual-assets-sparse`) when fewer than half of the sections carry a visual. Without a build the rule only warns (`visual-assets-no-build`).

The proposal's imagery plan names a visual for the hero and for at least half of the sections, each tagged with its source. Existing landings are not rebuilt; the rule applies from the next `check-landing` run.

## Prospect landings

Pixabay and imported Pexels photos are allowed on a prospect landing: they show no brand of the prospect, as Commons and The Met images do. The `prospect` rule still refuses `source: "customer"` and `source: "ai"`. See `docs/prospect.md`.
