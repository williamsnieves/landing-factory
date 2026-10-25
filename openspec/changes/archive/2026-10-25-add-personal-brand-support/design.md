# Design: add-personal-brand-support

## Context

- `new-site` copies the starter's layout, motion, 3D, legal, styles and headers and writes a placeholder `src/pages/index.astro`. The report's 404 item (`scripts/report/`) passes when the build has `dist/404.html`. The QA config excludes `404.html` from page checks.
- `scripts/ai-images.mjs import` runs `requireAllowed`: the customer's `brand.aiImages` consent, then `checkPrompt`. The prompt policy refuses `people` (owner, founder, team...) and `real-person` prompts for every image. Entries are validated by `credits.mjs` and `check-landing` `ai-provenance`.
- The brief has `brand.aiImages` (never assumable, empty counts as not allowed). `brief missing` has a `when` mechanism (`markets`) for conditional fields.

## Decisions

### 1. The 404 page is a plain scaffold file

`notFoundPage({ title, lang })` in `scripts/new-site.mjs` returns an Astro page: frontmatter constants (same `constLine` style as the placeholder, so Prettier keeps them), `BaseLayout` with `noindex`, an eyebrow `404`, an `h1`, a sentence and a link to `/`. Texts exist for `en` and `es`; any other language tag gets English, since the skill restyles the page and writes the real copy in the page language. The title is `<Not found> | <site title>`. It is a generated file, not a copy from the starter, so `COPIED_PATHS` does not change and "starter copies nothing else new" holds.

- **Why not copy the starter's 404:** the starter has none.
- **Skill:** the build phase adds a "404 page" part: restyle in the landing's design, same header and footer, links home and to `goal.primary`, keep `noindex`. QA still excludes `404.html` (it is not a landing page and has no Lighthouse budget), so the review step needs another way to see it: `section-shots.mjs` gets `--include-404` (off by default, so nothing else changes). The skill uses it in the review step.

### 2. Two brief fields, one conditional question

- `brand.ownerPortrait`: string enum `allowed` | `not-allowed` | empty. Listing it in `assumed` fails validation with "owner-portrait consent cannot be assumed", like `brand.aiImages`. It is the owner's decision.
- `business.personalBrand`: boolean, default `false`. It is the customer's statement that the business is a person. `missingFields` lists `brand.ownerPortrait` (after `brand.aiImages`, before the references) only when it is true (`when: 'personal-brand'`); `summarizeBrief` prints "Personal brand: yes" and the consent.
- **Alternative rejected:** a new `business.kind` value `person`. `kind` says what is sold (product, service, event, content); a personal brand sells any of them.
- `ownerPortraitConsent(brief)` in `brief-schema.mjs` is the single rule: a brief exists, `business.name` is filled (the brief names the owner), `aiImages` is allowed (the existing `aiImagesConsent`) and `ownerPortrait` is `allowed` and not assumed. It returns `{ allowed, reason }` so the CLI and the check print the same reason. No brief: never allowed.

### 3. `--subject owner` on import only

- `import` takes `--subject owner`; any other value exits 2. `generate` given `--subject` exits 2 with the reason (the API is text-only here; a face is never generated). All provenance flags stay required, and the cap and consent checks run as for every AI image.
- The entry gets `subject: "owner"` and `imported: true`.
- **Policy:** `checkPrompt(prompt, brief, { subject })` skips the rule ids in `OWNER_EXEMPT_RULES = ['people', 'real-person']` when `subject === 'owner'`. `brand`, `identity` and `results` still apply. A consequence worth stating: for a personal brand whose business name is the person's name, the stored prompt must not contain that name (use "the author", "a half-human, half-machine figure"). That is the intended `brand` rule, not a bug, and the refusal says which word matched.
- **No cap beyond `maxPerSite`.** One portrait is expected; the rule is not enforced as a count.

### 4. Final check and credits

- `check-landing` `ai-provenance`: for each entry with `subject`: a value other than `owner` fails; `owner` fails unless `ownerPortraitConsent(brief)` allows it (no brief file also fails, since the consent cannot exist). The prompt policy re-check passes `subject` so a hand-edited entry cannot use the exemption without the consent. The disclosure rule is unchanged.
- `credits.mjs` validation is unchanged (`subject` is optional); the AI table's Notes column starts with "Portrait of the owner, made with their consent" for such entries.

### 5. Skill rules for the portrait

The portrait is the one AI image that may depict a person. The skill allows it only when both consents are `allowed`, only as an imported file, never as a testimonial or a "photo of" caption. Alt text: "AI-generated portrait of <name>" in the page language; the page disclosure ("Some images on this page were generated with AI.") stays. The portrait is a stylized image the owner made and approved, so the page labels it as AI instead of presenting it as a photograph.

## Risks

- The policy exemption is lexical, like the rest of the policy: it only skips two rules for an entry marked `subject: "owner"`. A hand-edited `assets.json` can mark an entry, so the final check demands both consents in the brief.
- The brand rule can refuse an owner prompt that contains the owner's name. It is documented in the skill and the refusal message.
