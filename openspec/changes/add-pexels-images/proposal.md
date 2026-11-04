# Proposal: add-pexels-images

## Why

The first real prospect run (fisioterapia-ribera, PR #55) showed how far a landing falls when its imagery is weak. The owner judged the page correct but not striking (2026-11-04). The factory's stock sources are Wikimedia Commons and The Met: archives that suit history, places and museum objects, but rarely have the modern photos a business page needs, such as treatment rooms, offices, food, sport or hands at work. With no customer files and no AI images (a prospect cannot consent), the build had two discreet Commons photos and leaned on type alone.

The owner decided (2026-11-04):

- Pexels becomes an image source, used when AI images are not allowed or not asked for;
- a landing always carries images or SVG visuals: "a landing without images or SVG resources is very rare".

Pexels fits the factory's rules:

- Its photos can be downloaded and served from the landing itself. There is no third-party host at view time, no cookie and no CSP change, the same as Commons today (Unsplash, by contrast, asks API users to hotlink its CDN).
- Its license allows free commercial use and modification without required attribution. The API asks for a link to Pexels and credit to photographers, which the factory gives anyway through `CREDITS.md` and the footer.
- Its catalog covers businesses.

## What Changes

- **Pexels in `find-images.mjs`.**
  - `search "<query>" --source pexels` searches the Pexels API: orientation, minimum width, and the locale from `--lang`.
  - `get <slug> pexels:<id>` (or a Pexels photo URL) downloads one photo from `images.pexels.com` at a standard width and appends it to `assets.json`. The entry has:
    - `source: "pexels"` and `pexelsId`;
    - `title` (the photo's alt text, or "Photo by <photographer>");
    - `sourcePage` (the photo page) and `author` (the photographer), with `authorUrl`;
    - `license: "Pexels License"` with its `licenseUrl`;
    - `credit: true`.
  - Pexels can be combined with the other sources (`--source pexels,commons`).
- **The key.** It is read only from `PEXELS_API_KEY` and sent as the `Authorization` header, never as an argument. It is never printed, logged or stored.
  - Without the variable the request goes out without a key, so a credential saved for `api.pexels.com` in the session's network settings works. A 401 or 403 then names both ways to provide the key.
  - Downloads are accepted only from `https://images.pexels.com`. Requests are throttled and back off on 429, as for Commons.
- **Credits.** Pexels photos are stock entries, so `credits.mjs` lists them in the photo table of `CREDITS.md` and in `src/data/credits.json` with the photographer and the license. When the manifest has any Pexels entry, it adds one "Photos provided by Pexels" line, with a link to `https://www.pexels.com`, to both. `check-landing` `images-credited` and `credits-in-sync` accept Pexels entries.
- **The source order** in `/new-landing` (and `/revise-landing` for new images):
  1. the customer's files;
  2. AI images, where the brief allows them and the art direction asks for illustration;
  3. **Pexels** for business, people-at-work, place and object photos;
  4. Commons and The Met for real, named subjects and historical or cultural niches;
  5. SVG and CSS art made in the build.

  `--sources` defaults to `pexels,commons`, and `--sources commons,met` keeps working.
- **People in stock photos.**
  - A Pexels photo of a person is illustrative. It is never presented as the business's team, customers or patients, and never placed next to a quote, a name or a result.
  - The skill prefers hands, spaces and objects for a business's own roles, and every stock photo carries the caption "Foto ilustrativa" or "Illustrative photo" where the page could be read as showing the business.
- **Prospect landings** may use Pexels: it shows no brand of the prospect. The `prospect` rule keeps refusing `source: "customer"` and `source: "ai"`.
- **Every landing carries visuals.** A new `check-landing` rule, `visual-assets`, reads the built home page (and each locale's home page).
  - It fails when the first section (the hero) has no visual, or when the page has none at all.
  - It warns (`visual-assets-sparse`) when fewer than half of the sections in `<main>` carry one.
  - A visual is an `img`, a `picture`, a `video`, a `[data-scene]` poster or an inline `svg` whose `viewBox` is at least 96 units wide, so icons do not count.
  - The proposal's imagery plan names a visual for the hero and for at least half of the sections.

## Capabilities

### Modified Capabilities

- `landing-generation`:
  - the Pexels source and its provenance;
  - the source order;
  - the rule on people in stock photos;
  - the `visual-assets` rule.
- `prospect-landings`: Pexels allowed.

## Impact

- **Code:**
  - `scripts/find-images.mjs`, a new `scripts/lib/pexels.mjs`, `scripts/credits.mjs`;
  - `scripts/check-landing.mjs` (`visual-assets`, credit rules for Pexels) and `scripts/lib/html-tree.mjs` if a helper is needed;
  - `scripts/new-landing.sh` (`--sources` default) and `scripts/preflight.mjs`: with `pexels` among the sources it checks `api.pexels.com` and `images.pexels.com`; an unreachable host or a missing key is a warning, never a failure, and the build falls back to Commons.
- **Skills:**
  - `new-landing` (image section, prospect section, imagery plan);
  - `revise-landing` (new images follow the same order).
- **Docs:** CLAUDE.md ("Generating a landing", "Prospect landings", "Licensing and credits"), a new `docs/images.md` (sources, order, keys, people rule), `docs/prospect.md`, `docs/status.md`.
- **Tests (local fakes only, never the real API):**
  - `tests/find-images-pexels.test.mjs`, served by a fake API and image host. `PEXELS_API_URL` and a test image host are honored only when `NODE_TEST_CONTEXT` is set.
  - `tests/credits.test.mjs`;
  - `tests/check-landing.test.mjs` (`visual-assets`).
- **Environment:**
  - Real searches need `api.pexels.com` in the session's allowed hosts, plus a Pexels API key: the owner creates it at pexels.com and saves it through the secure credential form, never in chat. `images.pexels.com` is already allowed.
  - CI never calls Pexels: downloaded photos are committed like any other image.
- **Existing landings** are unchanged. `visual-assets` applies to `check-landing` runs from now on, so existing sites are not rebuilt.
