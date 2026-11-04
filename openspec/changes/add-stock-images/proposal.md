# Proposal: add-stock-images

## Why

The first real prospect run (fisioterapia-ribera, PR #55) showed how far a landing falls when its imagery is weak. The owner judged the page correct but not striking (2026-11-04). The factory's stock sources are Wikimedia Commons and The Met: archives that suit history, places and museum objects, but rarely have the modern photos a business page needs, such as treatment rooms, offices, food, sport or hands at work. With no customer files and no AI images (a prospect cannot consent), the build had two discreet Commons photos and leaned on type alone.

The owner decided (2026-11-04):

- a modern stock source is added for when AI images are not allowed or not asked for;
- a landing always carries images or SVG visuals: "a landing without images or SVG resources is very rare".

Pexels was the first choice, but it has paused the issuing of new API keys ("New API key issuance is currently paused", seen by the owner on 2026-11-04). The owner chose:

- **Pixabay** as the automatic source. Its content license is similar, and a free key is issued at once to a registered account.
- **Manual Pexels import** for photos the owner picks and downloads on pexels.com himself.

Both sources fit the factory's rules. Their photos are downloaded and served from the landing itself: there is no third-party host at view time, no cookie and no CSP change, the same as Commons today. Both licenses allow commercial use and modification without required attribution, and the factory credits every photographer anyway.

## What Changes

- **Pixabay in `find-images.mjs`.**
  - `search "<query>" --source pixabay` searches the Pixabay API: photos only, safe search on, orientation, minimum width, and the language from `--lang`.
  - `get <slug> pixabay:<id>` (or a Pixabay photo page URL) downloads the large image, up to 1280 px wide, from `pixabay.com`. It appends to `assets.json` an entry with:
    - `source: "pixabay"` and `pixabayId`;
    - `title` (from the tags);
    - `sourcePage` (the photo page) and `author` (the user name), with `authorUrl`;
    - `license: "Pixabay Content License"` with its `licenseUrl`;
    - `credit: true`.
  - Pixabay can be combined with the other sources (`--source pixabay,commons`).
- **The Pixabay key.** It is read only from `PIXABAY_API_KEY`, never from an argument. Pixabay takes the key as a URL parameter, so every printed URL, error and log line masks it, and it is never stored.
  - Requests stay within Pixabay's limits: throttled, a backoff on 429, and identical searches cached for 24 hours in `.cache/`.
  - A missing key is reported as "set PIXABAY_API_KEY". The owner adds it in the environment's settings, as with `OPENAI_API_KEY`.
- **Manual Pexels import.** `find-images.mjs import <slug> <file> --source pexels --page <https://www.pexels.com/photo/...> --author "<photographer>" [--author-url <url>] [--title "..."] [--as <name>]`
  - It copies a photo the owner downloaded into `src/assets/images/` and records `source: "pexels"`, `license: "Pexels License"`, `licenseUrl` and `credit: true`.
  - It refuses a page that is not a `www.pexels.com/photo/` URL, and a file that is not a JPEG, PNG or WebP.
  - It needs no key and no network.
- **Credits.** Pixabay and Pexels photos are stock entries, so `credits.mjs` lists them in the photo table of `CREDITS.md` and in `src/data/credits.json` with the photographer and the license.
  - It adds one "Photos provided by Pixabay" or "Photos provided by Pexels" line per provider used, linking the provider.
  - `check-landing` `images-credited` and `credits-in-sync` accept both.
- **The source order** in `/new-landing` (and `/revise-landing` for new images):
  1. the customer's files;
  2. AI images, where the brief allows them and the art direction asks for illustration;
  3. Pexels photos the owner imported;
  4. **Pixabay** for business, people-at-work, place and object photos;
  5. Commons and The Met for real, named subjects and historical or cultural niches;
  6. SVG and CSS art made in the build.

  `--sources` defaults to `pixabay,commons`, and `--sources commons,met` keeps working.
- **The license rules** (both lists confirmed by the owner from the license pages on 2026-11-04):
  - no identifiable person in a bad light or an offensive way;
  - no implied endorsement by the people or brands in a photo, so a stock person is never presented as the business's team, customers or patients, and never placed next to a quote, a name or a result;
  - no photo as part of a logo, brand mark, trade name or business name;
  - no photo that shows a recognisable trademark, logo or brand (Pixabay);
  - no misleading or deceptive use;
  - no selling of unaltered copies;
  - no redistribution on other stock platforms.

  Every stock photo carries the caption "Foto ilustrativa" or "Illustrative photo" where the page could be read as showing the business. The skill prefers hands, spaces and objects for the business's own roles.
- **Prospect landings** may use Pixabay and imported Pexels photos: they show no brand of the prospect. The `prospect` rule keeps refusing `source: "customer"` and `source: "ai"`.
- **Every landing carries visuals.** A new `check-landing` rule, `visual-assets`, reads the built home page (and each locale's home page).
  - It fails when the first section (the hero) has no visual, or when the page has none at all.
  - It warns (`visual-assets-sparse`) when fewer than half of the sections in `<main>` carry one.
  - A visual is an `img`, a `picture`, a `video`, a `[data-scene]` poster, an HTML and CSS illustration with `role="img"` and an `aria-label`, or an inline `svg` whose `viewBox` is at least 96 units wide, so icons do not count.
  - The proposal's imagery plan names a visual for the hero and for at least half of the sections.

## Capabilities

### Modified Capabilities

- `landing-generation`:
  - the Pixabay source and the manual Pexels import, with their provenance and credits;
  - the source order and the stock-photo license rules;
  - the `visual-assets` rule.
- `prospect-landings`: stock photos from Pixabay and Pexels allowed.

## Impact

- **Code:**
  - `scripts/find-images.mjs`, a new `scripts/lib/pixabay.mjs`, `scripts/credits.mjs`;
  - `scripts/check-landing.mjs` (`visual-assets`, credit rules for both sources);
  - `scripts/preflight.mjs`: with `pixabay` among the sources it checks the host and the key. Either one missing is a warning, never a failure, and the build falls back to Commons.
  - `scripts/new-landing.sh` (`--sources` default).
- **Skills:**
  - `new-landing` (image section, prospect section, imagery plan);
  - `revise-landing` (new images follow the same order).
- **Docs:** CLAUDE.md ("Generating a landing", "Prospect landings", "Licensing and credits", the `find-images` row of "Commands"), a new `docs/images.md` (sources, order, keys, license rules, the manual Pexels flow), `docs/prospect.md`, `docs/status.md`.
- **Tests (local fakes only, never the real API):**
  - `tests/find-images-stock.test.mjs`, served by a fake API and image host. `PIXABAY_API_URL` and a test image host are honored only when `NODE_TEST_CONTEXT` is set.
  - `tests/credits.test.mjs`;
  - `tests/check-landing.test.mjs` (`visual-assets`).
- **Environment:**
  - Real searches need `pixabay.com` in the session's allowed hosts and `PIXABAY_API_KEY` in the environment's variables. The owner creates the key at pixabay.com and adds it in Settings himself, never in chat.
  - CI never calls Pixabay: downloaded photos are committed like any other image.
- **Existing landings** are unchanged. `visual-assets` applies to `check-landing` runs from now on, so existing sites are not rebuilt.
