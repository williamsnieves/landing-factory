# Proposal

## Why

Today a landing starts from one line (`--niche "..."`). The skill invents the brand, the offer, the audience, the contact data and the call to action, and writes "sample data" on the page. That is fine for factory tests, but a real customer (the first one is the owner's own digital-products landing) has a name, real products and prices, a goal, links, assets of their own, references they like and dislike, and constraints. Step 2 of `docs/product-plan.md`: capture the requirement once, in a validated file, and make every later phase read from it instead of guessing.

## What Changes

- **`sites/<slug>/brief.json`**: one validated file per landing, with business and offer (products, prices), audience, goal and calls to action (label and real URL), tone, language, real contact data (email, phone, address, hours, social links), the customer's own assets (local files or links, with who owns them), brand constraints (existing colors, logo, fonts to keep), references liked and disliked (with why), legal constraints (regulated niche, required notices) and the deploy target and domain. Every field the customer did not give is either left empty or listed in `assumed` with the reason; nothing is presented as a customer fact unless it came from the customer.
- **`scripts/brief.mjs`**: `init` (writes a skeleton, optionally seeded from a niche line), `validate` (schema, types, URLs, emails, `assumed` paths exist), `missing` (required and recommended fields still empty, in interview order), `summary` (a short readable view). The schema lives in `scripts/lib/brief-schema.mjs`; no new dependency.
- **`/brief-intake <slug>` skill**: an agent-led interview in the customer's language. It reads what already exists (brief.json, a pasted text, a document or a list of links), asks only for what is missing, a few questions at a time, confirms what it understood, writes and validates `brief.json`, and marks what the customer skipped as assumed. It never invents facts, prices, reviews or results. A filled `brief.json` written by hand (the "form") is accepted the same way.
- **`/new-landing` reads the brief**: `new-landing.sh --brief <file>` (or an existing `sites/<slug>/brief.json`) makes `--niche` optional. The brief phase copies and validates it; the synthesis takes brand, offer, audience, tone, calls to action, contact data, references and constraints from it, derives the `Signals:` from it, and lists the brief's assumptions under Decisions. Liked references that have a sheet in `patterns/` are passed to `pick-archetypes`; the rest are listed as "to analyze". Disliked references become "avoid" notes. Brand colors and fonts to keep constrain the design system.
- **Customer assets**: local files named in the brief are recorded in `assets.json` with `source: "customer"` (owner and permission as given by the customer, no public credit line unless asked) and used before stock photos. Links that need a login (for example a private Drive folder) are listed as "to fetch by the owner", never accessed around their access control.
- **Final check `brief-facts`**: when a brief exists, `check-landing` fails if a non-assumed fact is missing from the built page (business name, primary call-to-action URL, contact email and phone, each listed product name and price), or if the page labels customer data as sample data.
- **Validation**: a fixture brief for a fictional customer goes through `brief.mjs validate`, the interview in a scripted run, and a `new-landing.sh --brief ... --dry-run` that writes a proposal built from it.

## Capabilities

### New Capabilities

- `brief-intake`: a validated requirement file per landing, filled by an interview that asks only for what is missing and never invents facts.

### Modified Capabilities

- `landing-generation`: generation reads the brief; the final check verifies the brief's facts appear on the page.

## Impact

- New: `scripts/brief.mjs`, `scripts/lib/brief-schema.mjs`, `.claude/skills/brief-intake/SKILL.md`, `tests/brief.test.mjs`, a fixture brief under `tests/fixtures/brief/`.
- Changed: `scripts/new-landing.sh` (`--brief`, `--niche` optional with a brief), `.claude/skills/new-landing/SKILL.md` (brief and synthesis phases), `scripts/new-site.mjs` templates (proposal Brief section), `scripts/check-landing.mjs` (`brief-facts`), `scripts/credits.mjs` and `check-landing` (`source: "customer"`), `.claude/settings.json` allow list, `CLAUDE.md`, `docs/status.md`.
- Existing sites have no brief and are unaffected (`brief-facts` only runs when `brief.json` exists).
- Out of scope: a web form or HTTP API for the brief (comes with `add-agent-interface`), downloading from private storage, the deploy target itself (`add-deploy-adapters` reads the field later).
