# Design: add-ai-images

## Context

- **Images today:** `scripts/find-images.mjs` downloads Commons and Met images into `sites/<slug>/src/assets/images/` and appends entries to `sites/<slug>/assets.json` (`{ images: [...] }`). Network calls go through the proxy re-exec helper. Exit codes are 0, 1 and 2.
- **Credits:** `scripts/credits.mjs` validates the manifest:
  - stock entries need `file`, `title`, `sourcePage`, `author`, `license` and `credit`;
  - `source: "customer"` entries need `file`, `owner`, `permission` and `credit`.

  It writes the `CREDITS.md` table and `src/data/credits.json` (the footer list, an array).
- **Final check:** `check-landing` `images-credited` fails on files without entries, entries without files, and customer entries without owner or permission.
- **Brief:** it has `brand: { colors, fonts, keep, avoid }`. Identity fields can't be assumed (the `legal` precedent).
- **Generation:** the `/new-landing` skill sources images in the build phase. Customer files come first, then Commons and The Met.
- **Provider and environment:** the owner chose OpenAI's GPT image models. The cloud session has no `OPENAI_API_KEY`, and `api.openai.com` is not reachable through the proxy yet. The current docs list `gpt-image-1`, `gpt-image-1-mini`, `gpt-image-1.5` and `gpt-image-2`; the Images endpoint takes `size` (1024x1024, 1024x1536, 1536x1024), `quality` (low, medium, high or auto) and `output_format` (png, jpeg or webp), and returns base64 data.

## Goals / Non-Goals

**Goals:**

- One small CLI on the `find-images` model, with no SDK and no new dependency.
- Provenance strong enough that a reviewer, or a later legal review, can see what made each image and under which terms.
- AI images never stand in for the business's real people, products or results, and a page that uses them says so.
- Tests that never touch the real API or need a key.

**Non-Goals:**

- Editing or inpainting.
- Variations.
- Multiple providers at once.
- Automatic content review of the images.
- Replacing images on existing sites.

## Decisions

### 1. Tool and adapter

**CLI:** `scripts/ai-images.mjs`:

```text
generate <slug> --prompt "<text>" --as <name> [--size 1536x1024|1024x1024|1024x1536]
         [--quality low|medium|high] [--model <id>] [--title "<short description>"] [--note ...] [--dry-run]
import   <slug> <file> --generator <name> --model <id> --prompt "<text>" --created <ISO date>
         --terms <url> [--title ...] [--as <name>]
count    <slug>        (AI entries and the cap)
```

**Adapter:** `scripts/lib/openai-images.mjs` exports `generateImage({ prompt, model, size, quality, format, fetchImpl, baseUrl, apiKey })`.

- **Request:**
  - `POST {baseUrl}/v1/images/generations`;
  - body `{ model, prompt, size, quality, n: 1, output_format: "webp", output_compression: 90 }`;
  - header `Authorization: Bearer <key>`.
- **Returns:** `{ bytes, revisedPrompt, usage, requestId }`.
- **Configuration:**
  - `baseUrl` defaults to `https://api.openai.com`; `OPENAI_BASE_URL` overrides it, and the tests use that to point at a local fake server;
  - `fetchImpl` is injectable.
- **Errors:** status and message, passed through `mask()` (`scripts/report/mask.mjs`). The key is also removed by exact replacement before anything is printed.
- **Defaults** come from `qa.config.json` `aiImages`: `{ provider: "openai", model: "gpt-image-1.5", size: "1536x1024", quality: "high", maxPerSite: 12 }`, validated in `scripts/qa/config.mjs`.
  - The model stays configurable because the model list changes. `gpt-image-1.5` is named in both the reference and the guide.
  - The first real generation confirms the default. If it fails, the default changes in the PR before merge.
- **Alternative rejected:** the `openai` npm SDK. It would be a new dependency for a single POST.

### 2. Provenance entry

```json
{
  "file": "hero-glass.webp",
  "title": "Abstract glass shapes over a blue gradient",
  "source": "ai",
  "generator": "openai",
  "model": "gpt-image-1.5",
  "prompt": "...",
  "revisedPrompt": "...or empty",
  "size": "1536x1024",
  "quality": "high",
  "createdAt": "2026-10-25T10:00:00.000Z",
  "terms": "https://openai.com/policies/terms-of-use/",
  "requestId": "req_...",
  "usage": { "input_tokens": 0, "output_tokens": 0 },
  "credit": false,
  "note": ""
}
```

- **Imports** carry the same fields, with `generator` set to the tool's name, `imported: true`, no `requestId` and no `usage`.
- **`credits.mjs`:** gets `AI_REQUIRED_FIELDS = file, title, generator, model, prompt, createdAt, terms, credit` and `isAi`.
  - `CREDITS.md` gets an "AI-generated images" table (file, tool and model, date, terms link) between the credit markers, after the customer table.
  - `credits.json` keeps its shape. AI images need no footer credit line; the disclosure is a separate element.
- **C2PA:** OpenAI embeds C2PA metadata in its outputs. The file stored in the repo keeps it. The variants Astro serves are re-encoded and may drop it. The page disclosure covers transparency, and the docs say this.

### 3. Prompt policy (`scripts/lib/ai-prompt-policy.mjs`)

The policy checks the prompt case-insensitively, on word boundaries, in English and Spanish. Each rule has an id and a reason.

| Rule | Refuses |
| --- | --- |
| `brand` | the brief's `business.name` or any `offer[].name` (normalized, at least 4 characters) |
| `people` | team/equipo, staff/personal/empleados, our customers/nuestros clientes, client(s) of, founder/fundador/fundadora, CEO, owner/dueño, testimonial/testimonio, review/reseña |
| `identity` | logo, brand mark/marca, packaging of our |
| `results` | before and after/antes y después, results of/resultados de |
| `real-person` | "portrait of" or "photo of" followed by two capitalized words, "celebrity", "famous person" or "famoso" |

- **Limits:** this is best-effort lexical filtering. The skill's rule (Decision 6) and the reviewer's screenshot pass back it up. There is no override flag: a needed exception goes through a person editing the manifest by hand, which the final check still verifies.
- **Imports:** the same policy runs on imported prompts.

### 4. Consent and cap

- **Brief field:** `brand.aiImages` is a string enum: `allowed`, `not-allowed` or `''`.
  - Listing it in `assumed` is a validation error.
  - `missing` lists it as recommended after `brand`.
  - The interview asks: "May the page use AI-generated illustrations (never photos of your people or products)?"
- **Permission:**
  - Without a `brief.json`, generation is allowed (demo niches).
  - With a brief, only `allowed` permits generating or importing.
- **Cap:** `count(source === 'ai') >= aiImages.maxPerSite` refuses before any request.

### 5. Final check `ai-provenance` (check-landing)

It fails when any of these holds:

1. an AI entry lacks one of `AI_REQUIRED_FIELDS`;
2. its file is missing (the existing logic is reused);
3. AI entries exist while a brief says anything but `allowed`;
4. AI entries exist and `dist/index.html` has no element with `data-ai-disclosure` and non-empty text;
5. an AI entry's prompt breaks the policy. This catches entries edited by hand.

The rule never starts a browser and reads `dist/index.html` like `brief-facts` does.

### 6. Generation skill

The image step of `/new-landing` becomes:

1. the customer's files;
2. Commons and The Met for real-world subjects the page names (a bakery's bread, a museum object);
3. AI images, only when allowed and only for illustrative, abstract, texture or generic-object art (for example a tech product's hero art or section backgrounds), within the cap.

- **Footer:** the footer gets `<p data-ai-disclosure>` with "Some images on this page were generated with AI." (`es`: "Algunas imágenes de esta página se generaron con IA.").
- **`RUN.md`:** Images lists each AI image with its prompt summary, reason and the count against the cap.
- **No key:** when `OPENAI_API_KEY` is missing, the skill notes it and falls back to archives. It never invents images.

### 7. Security and environment

- **Key:**
  - read only from `process.env.OPENAI_API_KEY`;
  - never in arguments, files or output;
  - `--dry-run` prints the request body and the URL, never the headers.
- **Proxy:** `reexecWithEnvProxy`, as in `find-images.mjs`.
- **Allow list:** `.claude/settings.json` allows `node scripts/ai-images.mjs *`. Generation calls cost money, so the skill keeps to the cap and the tool enforces it.
- **CI:** never calls the tool.

## Risks / Trade-offs

- **[Model ids change]** → the model is configurable. The default is confirmed by the first real run, and an unknown-model error from the API is printed clearly.
- **[Lexical prompt policy misses a case or blocks a fair prompt]** → it is backed by the skill rule and the reviewer, has no silent override, and has tests per rule. A false block is fixed by rewording the prompt.
- **[Cost runaway in an auto run]** → the hard cap per site and the dry run, plus usage recorded per image.
- **[Real generation cannot be verified in this session]** → the tests use a local fake API. The real smoke test (task 6.1) needs the owner to add `OPENAI_API_KEY` as an environment secret and `api.openai.com` to the allowed domains. Until then that task stays open and the PR says so.
- **[AI imagery and disclosure rules (for example EU AI Act transparency duties from August 2026)]** → the page always discloses AI images, which is broader than the deep-fake duty. This is not legal advice; `docs/legal.md` gains a line.

## Migration Plan

1. Land the tool, the checks and the skill changes. Existing sites have no AI entries, so nothing changes for them.
2. The owner adds the key and the domain, and the real smoke test runs on a throwaway site, which is then removed.
3. **Rollback:** the tool is opt-in. Removing the skill step disables AI sourcing, and the checks only act on `ai` entries.

## Implementation notes

Choices made while implementing, none of which changes the specified behavior:

- **Consent lives in the brief module.** The rule "only an explicit `allowed`, never assumed" is `aiImagesConsent(brief)` in `scripts/lib/brief-schema.mjs`, used by the tool and by `check-landing`. A parent listed as assumed (`brand`) also makes the value not count, because `isAssumed` covers children. The assumed-list error for `brand.aiImages` is checked before the "field is empty" error, so an empty consent listed as assumed still says that the customer must decide.
- **`brand.aiImages` in the interview order.** It follows `brand.fonts` and precedes `references.liked` in `MISSING_FIELDS`. The shared brief fixture gained `"aiImages": "allowed"` so its existing "missing" expectations stay as they were.
- **Policy refinements.** The text is matched after removing accents (patterns are written without them). Plain `customers` and `clientes` are refused, but `client` only with "our/my/your/the" or "client(s) of", and `personal` only in "personal de/del" and "nuestro/el personal", because a bare `personal` ("personal computer") and `client` ("client-server") are common non-people words. The real-person rule matches `portrait/photo/picture/headshot/retrato/foto of` followed by two capitalized words on the original text (case-sensitive on the name), plus `celebrity`, `famous person`, `famoso`, `look-alike` and `likeness of`. The `identity` rule also covers `isotipo` and `marca registrada/corporativa/de la empresa`, not a bare `marca`.
- **Cap and imports.** The cap is checked by `generate` only (it guards cost); `import` applies consent and the prompt policy but not the cap. `count` reports both.
- **Order of checks in `generate`.** Usage, then site, consent, prompt policy, cap, free file name, `--dry-run`, key, request. A dry run therefore also shows consent, policy, cap and name refusals, and never needs the key. The file name is checked before the request so a taken name costs nothing; the extension comes from the format the API returns (checked by magic bytes), and an explicit extension that disagrees is refused.
- **Config per site.** The cap and defaults come from `sites/<slug>/qa.config.json` when it exists, else from the root `qa.config.json` (the same override rule QA uses). `LANDING_FACTORY_ROOT` moves `sites/` and the config lookup for tests, like `find-images`.
- **`ai-provenance` runs only when the manifest has an AI entry.** Existing sites keep byte-identical `check-landing` output. The missing-file failure is reported by `ai-provenance` as well as by `images-credited`. `photo-uses` keys an AI entry by its file (AI images have no source page and their titles are free text).
- **Credits.** `validateManifest` requires `AI_REQUIRED_FIELDS` for `source: "ai"` entries and no stock fields. The "AI-generated images" table sits after the customer table inside the credit markers; an AI entry never reaches `credits.json`, even with `credit: true`.
- **Errors never carry the key.** `redact()` replaces the exact key with `[redacted key]` and masks anything shaped like `sk-...` with `mask()` (four characters and the length); the CLI wraps its output in the same function as a last guard, and the dry run prints the URL and body only.
- **Not verified here.** The real API call (task 6.1): the default model, the request fields (`output_format`, `output_compression`, `quality`) and the response shape (`data[0].b64_json`, `usage`, `x-request-id`) follow the documented API and are exercised only against a local fake server.
