# Proposal: add-personal-brand-support

## Why

The owner's personal-brand landing comes next (owner decision, 2026-10-25). Two things the factory cannot do yet get in the way:

- **No 404 page.** A new site has only a placeholder home page, so the landing report's 404 item warns until someone adds `src/pages/404.astro` by hand (tupathdigital did it in its own change). Every new landing should start with one.
- **No way to show the owner.** The owner made a half-human, half-machine AI portrait of themselves with ChatGPT and wants it on their page. The AI-image rules forbid it: the prompt policy refuses prompts about founders, owners and named people, so `ai-images import` refuses the owner's own prompt, and the customer consent covers only "illustrations, never your people". A personal brand is a business whose subject is a person, so an exception is needed, and only that exception.

## What Changes

- **Default 404 page (A).**
  - `new-site` writes `src/pages/404.astro` next to the placeholder home page: `noindex`, `BaseLayout`, a short heading and a link home, in English or in the `--lang` language (`en`, `es`; English for other tags).
  - The report's 404 item passes from the first build.
  - Nothing else new is copied from the starter.
  - The `/new-landing` build phase restyles it in the landing's design and links the primary call to action. QA keeps excluding `404.html`; the review step looks at it with `section-shots.mjs --include-404`.
- **Owner portrait consent (B).**
  - The brief gets `brand.ownerPortrait` (`allowed`, `not-allowed` or empty, like `brand.aiImages`) and `business.personalBrand` (boolean: the business is a person).
  - The consent is never assumable.
  - `/brief-intake` asks it only when `business.personalBrand` is true; `brief missing` and `summary` follow.
- **Importing the portrait.**
  - `ai-images import <slug> <file> --subject owner ...` records it, with every existing provenance flag still required.
  - Allowed only when a brief exists, names the business, and has `brand.aiImages: allowed` and `brand.ownerPortrait: allowed`.
  - The entry gets `subject: "owner"`.
  - `generate` never accepts `--subject`: OpenAI generation stays text-only and editing a photo is out of scope.
- **Prompt policy exemption.** For a `subject: "owner"` entry the policy skips only the `people` and `real-person` rules. `brand`, `identity` and `results` still apply.
- **Final check and credits.**
  - `ai-provenance` fails on an owner entry without both consents, and on a `subject` other than `owner`. The visible `data-ai-disclosure` rule applies as for every AI image.
  - `credits.mjs` lists the portrait under "AI-generated images" noting it is a portrait of the owner made with their consent.
- **Generation.** The `/new-landing` skill treats the owner portrait as the only AI image allowed to depict a person. Its alt text says "AI-generated portrait of <name>", never "photo", and the page disclosure stays.

## Capabilities

### Modified Capabilities

- `site-workspaces`: the scaffold also writes the 404 page.
- `landing-generation`: the build includes a restyled 404 page; the owner portrait rules.
- `ai-images`: the owner portrait import and the narrow policy exemption.
- `brief-intake`: the owner-portrait consent and the personal-brand flag.

## Impact

- **Changed code:** `scripts/new-site.mjs`, `scripts/lib/brief-schema.mjs`, `scripts/lib/ai-prompt-policy.mjs`, `scripts/ai-images.mjs`, `scripts/check-landing.mjs`, `scripts/credits.mjs`, `scripts/section-shots.mjs` (`--include-404`), tests for each, `.claude/skills/new-landing/SKILL.md` and `.claude/skills/brief-intake/SKILL.md`.
- **Docs:** `CLAUDE.md`, `docs/legal.md`, `docs/status.md`, `docs/agent-interface.md`, `scripts/README.md`.
- **Existing sites:** unchanged (no 404 is added to them; briefs without the new fields stay valid).
- **No new dependencies.**
- **Out of scope:**
  - generating or editing a portrait with the API;
  - portraits of anyone but the brand owner (team, customers, testimonials);
  - the owner's landing itself (slug and brief come at intake);
  - a consent banner.
