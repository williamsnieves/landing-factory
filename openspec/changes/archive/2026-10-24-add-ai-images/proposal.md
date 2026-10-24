# Proposal: add-ai-images

## Why

Landings get images from four places today:

- the customer's own files;
- Wikimedia Commons;
- The Met's open-access collection;
- posters rendered from 3D scenes.

Commons is slow (rate limits dominate run time) and its stock rarely fits an abstract or stylized direction. Some niches, such as tech and AI products, need illustrative art that no archive has.

The owner wants AI-generated images as a fifth, recorded source (owner, 2026-10-24) and chose OpenAI's GPT image models for it. The factory's rules stay as they are:

- every image has provenance and terms on record;
- nothing on a page pretends to be what it is not;
- AI images never pose as real photos of a business, its people or its products.

## What Changes

- **Generating images.** A new tool, `node scripts/ai-images.mjs generate <slug> --prompt "..." --as <name> [--size ...] [--quality ...] [--model ...] [--dry-run]`:
  - calls the OpenAI Images API through the proxy;
  - writes the file to `sites/<slug>/src/assets/images/`;
  - appends a provenance entry to `assets.json`: `source: "ai"`, generator, model, prompt, revised prompt when the API returns one, size, quality, creation date, a link to the generator's terms, and the token usage the API reports.

  The API key comes only from the `OPENAI_API_KEY` environment variable. It is never printed, logged or stored.
- **Importing images the owner made.** `node scripts/ai-images.mjs import <slug> <file> --generator ... --model ... --prompt ... --created ... --terms <url>` records an AI image the owner made with their own tool, with the same provenance fields.
- **Prompt policy.** The tool refuses a prompt that:
  - names the business or one of its products from the brief;
  - asks for its team, staff, customers, founder, testimonials or logo;
  - asks for a real, named person;
  - asks for results (before/after).

  Each refusal says why. AI images are for illustration, abstract art, textures, generic objects and scenes.
- **Customer consent.** A new brief field, `brand.aiImages`, takes the values `allowed`, `not-allowed` or empty.
  - With a brief, the tool generates only when the field is `allowed`.
  - Without a brief (demo niches), generation is allowed.
  - The `/brief-intake` interview asks for it.
- **Cost guard.** A per-site cap on generated images comes from `qa.config.json` `aiImages.maxPerSite`, defaulting to 12. `--dry-run` prints the request without calling the API.
- **Disclosure and checks.**
  - `credits.mjs` lists AI images under "AI-generated images", with tool, model and date, and marks `src/data/credits.json` so the footer can say that some images are AI-generated.
  - `check-landing` gains an `ai-provenance` rule. It fails when an `ai` entry lacks a provenance field, when its file is missing, when a site uses AI images without a visible disclosure on the page (an element marked `data-ai-disclosure`), or when a brief says `not-allowed` and an AI image is present.
- **Generation.** The `/new-landing` skill picks the source per image:
  - the customer's files first;
  - Commons and The Met for real-world subjects;
  - AI images for illustrative or abstract art, when allowed, within the cap.

  The skill records the reasons in `RUN.md`.

## Capabilities

### New Capabilities

- `ai-images`: AI image generation and import, the provenance record, the prompt policy, consent, the cost cap, key handling, and disclosure enforced by the final check.

### Modified Capabilities

- `landing-generation`: new requirement on when generation uses AI images and how it records them.
- `brief-intake`: new requirement for the customer's AI-image consent field.

## Impact

- **New code:**
  - `scripts/ai-images.mjs`;
  - `scripts/lib/openai-images.mjs`, a small adapter with no SDK: one `fetch` to the Images endpoint;
  - tests with a local fake API server.
- **Changed code:**
  - `scripts/credits.mjs`;
  - `scripts/check-landing.mjs`;
  - `scripts/lib/brief-schema.mjs`;
  - `scripts/brief.mjs`;
  - `qa.config.json` and `scripts/qa/config.mjs`;
  - `.claude/skills/new-landing/SKILL.md` and `.claude/skills/brief-intake/SKILL.md`;
  - `.claude/settings.json` (allow `node scripts/ai-images.mjs *`);
  - `package.json` (an `ai-images` script).
- **Docs:** `CLAUDE.md` (sources, licensing and credits), `README.md`, `scripts/README.md`, `docs/status.md`.
- **No new npm dependencies.** Images are saved as the API returns them (WebP by default). Astro's image pipeline makes the served variants.
- **Environment:**
  - Real generation needs `OPENAI_API_KEY` in the environment, as a secret, and `api.openai.com` in the allowed domains.
  - Neither is set in the cloud session today. Tests never call the real API, and a real smoke generation is verified once the owner adds both.
  - CI never generates images: generated files are committed like any other image.
- **Costs:** each generated image is billed to the owner's OpenAI account. The cap and `--dry-run` keep runs predictable.
- **Out of scope:**
  - image editing and inpainting;
  - other providers (the adapter keeps one place to add them);
  - video;
  - existing sites (no images are replaced);
  - judging the image content automatically (a person reviews the screenshots, as today).
