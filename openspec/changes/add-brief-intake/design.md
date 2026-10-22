# Design

## Context

`/new-landing` (`.claude/skills/new-landing/SKILL.md`) starts from `--niche "..."` and an optional `--refs`. Phase 1 fills the RUN.md Inputs table and decides goal, audience and tone; phase 2 writes `PROPOSAL.md`, including a `Signals:` line read by `pick-archetypes.mjs`. Contact data is placeholder, and the page says so. `check-landing.mjs` runs the final rules; `credits.mjs` builds credits from `assets.json`, where every entry today comes from Commons, the Met, or a rendered poster (`source: "self"`).

The first real customer is the owner's digital-products landing, so the intake has to work for a real person with real products, prices and links.

## Goals / Non-Goals

Goals: one validated file holds the requirement; generation reads it; nothing unknown is presented as fact; the interview asks only what is missing; the final check proves the real facts made it to the page.

Non-goals: a web form or HTTP API (step 5, `add-agent-interface`); deploying to the chosen target (step 4); fetching files behind a login; translating the page into several languages (i18n is out of scope).

## Decisions

### 1. Brief file and schema

`sites/<slug>/brief.json`, versioned with the site. Schema in `scripts/lib/brief-schema.mjs` as a plain object plus a hand-written validator (no new dependency; `ajv` is only a transitive dependency). Shape, version 1:

```json
{
  "version": 1,
  "language": "es",
  "business": {
    "name": "", "description": "", "city": "", "country": "",
    "kind": "product | service | event | content | other"
  },
  "offer": [
    { "name": "", "description": "", "price": "", "currency": "", "url": "" }
  ],
  "audience": { "who": "", "needs": "", "objections": "" },
  "goal": {
    "primary": { "label": "", "url": "" },
    "secondary": { "label": "", "url": "" }
  },
  "tone": [""],
  "contact": {
    "email": "", "phone": "", "address": "", "hours": "",
    "social": [{ "network": "", "url": "" }]
  },
  "assets": [
    { "kind": "logo | photo | video | document | model | other", "path": "", "url": "",
      "owner": "", "permission": "", "notes": "" }
  ],
  "brand": { "colors": [""], "fonts": [""], "keep": "", "avoid": "" },
  "references": {
    "liked": [{ "url": "", "sheet": "", "why": "" }],
    "disliked": [{ "url": "", "why": "" }]
  },
  "legal": { "regulated": false, "notices": [""], "constraints": "" },
  "deploy": { "target": "cloudflare-pages | vercel | netlify | vps | shared-hosting | undecided", "domain": "" },
  "assumed": [{ "field": "contact.phone", "reason": "" }],
  "notes": ""
}
```

Rules enforced by `validate`:

- Required: `version`, `language` (language tag), `business.name`, `business.description`, `goal.primary.label`. Everything else is optional or recommended (see `missing`).
- Types and closed values: `business.kind`, `assets[].kind`, `deploy.target` from the lists above; `tone` and `brand.colors` arrays of strings; colors `#rrggbb`.
- Formats: URLs are `https://` or `http://`, or `mailto:`/`tel:` for `goal.*.url`; emails and phone numbers have a basic shape; `assets[].path` is relative to `sites/<slug>/` and must exist (checked when `--site` is given); each asset has `path` or `url`; `references.liked[].sheet`, when set, must match `patterns/<sheet>.md`.
- `assumed[].field` must be a dotted path that exists in the brief and is non-empty (an assumption is a value chosen for the customer, not a missing value). A missing value stays empty.
- Unknown keys fail (typos are the main risk of a hand-written brief).

Why a per-field `assumed` list instead of wrapping each value: the file stays readable and hand-editable, and later phases can treat any path in `assumed` as "not a customer fact".

### 2. `scripts/brief.mjs`

```text
node scripts/brief.mjs init --site <slug> [--niche "..."] [--lang es] [--force]
node scripts/brief.mjs validate (--site <slug> | --file <path>) [--json]
node scripts/brief.mjs missing (--site <slug> | --file <path>) [--json]
node scripts/brief.mjs summary (--site <slug> | --file <path>)
```

- `init` writes a skeleton with empty values (`business.description` seeded from `--niche`); refuses to overwrite without `--force`. Works before `new-site` (creates `sites/<slug>/` holding only `brief.json`; `new-site --allow-existing-docs` accepts a folder with `*.md` and `brief.json`).
- `missing` lists empty required fields first, then recommended ones in interview order: business, offer, audience, goal, contact, assets, brand, references, legal, deploy. Each with a short question hint in English (the skill asks in the customer's language).
- Exit codes: 0 valid / nothing required missing, 1 invalid or required missing, 2 bad usage.

### 3. `/brief-intake` skill

`.claude/skills/brief-intake/SKILL.md`, interactive (not run by `claude -p`). Steps: `init` if needed; read any material the user gives (pasted text, a file, links that are public and allowed by the network policy); fill what it states; run `missing`; ask the next 2 to 4 questions in the user's language, grouped by topic; after each answer, update and `validate`; for anything the user wants the agent to choose, write the value and add it to `assumed` with the reason; for anything the user does not know, leave it empty. Finish with `summary`, ask for a final confirmation, and tell the user the next command (`npm run new-landing -- <slug> --brief sites/<slug>/brief.json`). Liked references without a pattern sheet: suggest `/analyze-reference <url>` (the domain may need adding to the network allow list). Never invent prices, reviews, ratings, results, certifications or quotes; regulated niches get the same copy rules as `/new-landing`.

### 4. Generation reads the brief

- `new-landing.sh`: `--brief <file>` copies the file to `sites/<slug>/brief.json` after scaffolding (or uses an existing one), runs `brief.mjs validate --site <slug>` and stops on failure. `--niche` becomes optional when a brief exists (the skill uses `business.description`). `--lang` defaults to the brief's `language`. The prompt passes `--brief`.
- Skill phase 1 (Brief): with a brief, the Inputs table points at it and the decisions come from it. Without one, today's behavior stays (niche only, everything assumed).
- Phase 2 (Synthesis): brand, offer, audience, tone, calls to action and contact data come from the brief; `Signals:` are derived from it (kind, tone, offer, audience, `photo-rich` when the brief has 5 or more photos); `references.liked[].sheet` values become the run's refs; disliked references go in "What we leave"; `brand.colors`/`fonts`/`keep`/`avoid` go to the design-system subagent as constraints; `legal` adds notices and the regulated copy rules. Decisions list every `assumed` field and every empty recommended field the page needs (with the placeholder used).
- Customer facts are never labeled "sample" or "example"; placeholders for empty fields are.

### 5. Customer assets

`assets.json` entries with `source: "customer"`: `file` (copied into the site's `src/assets/`), `owner`, `permission` (as stated by the customer), `credit` (false unless the customer asks for a credit line). `credits.mjs` lists them in `CREDITS.md` under "Provided by the customer" and adds them to the footer only when `credit: true`. `check-landing` `images-credited` accepts `customer` entries with an `owner` and `permission`. The build uses customer photos before stock photos. Links behind a login are listed in RUN.md "To fetch by the owner"; the run never tries to get around access control.

### 6. `brief-facts` rule

In `check-landing`, only when `sites/<slug>/brief.json` exists. Reads the built `dist/index.html` text (no browser). Fails when a non-assumed, non-empty fact is missing: `business.name`, `goal.primary.url` (as an `href`), `contact.email` (text or `mailto:`), `contact.phone` (digits compared without spaces or `tel:`), each `offer[].name`, each `offer[].price`. Fails when an element containing a customer fact also says "ejemplo"/"example"/"sample" (the words list in `qa.config.json` under `brief.sampleWords`). Names the missing field. The rule needs `dist/`; when it is missing it fails asking for a build, like `scenes`.

## Risks / Trade-offs

- A strict schema can annoy a hand-written brief: the error messages name the field and the fix, and `init` writes a valid skeleton.
- `brief-facts` matches text, so formatting differences (prices "19 €" vs "19,00 €") can fail: prices compare after normalizing spaces, the currency symbol and a trailing ",00"/".00"; the rule prints what it looked for.
- The interview runs interactively only. Headless runs with a partial brief fill gaps as assumptions and list them at the checkpoint, which is the review point.

## Migration

None. Existing sites have no brief; every new rule is gated on `brief.json`.
