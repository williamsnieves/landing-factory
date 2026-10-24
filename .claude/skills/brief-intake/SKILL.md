---
name: brief-intake
description: 'Interview a customer and write a validated requirement file, sites/<slug>/brief.json: business and offer (products, prices), audience, goal and calls to action with real URLs, tone, language, contact data, the customer''s own assets, brand constraints, references liked and disliked, legal constraints and the deploy target. Reads what already exists (a brief.json, pasted text, a document, a list of public links), asks only for what is missing, a few questions at a time and in the language the user writes in, confirms what it understood and marks what the customer left to the agent as assumed. Never invents facts, prices, reviews, ratings or results. Use when the user runs /brief-intake <slug> or asks to capture, collect, start or complete the brief or requirement of a landing before generating it. Interactive only: not run by claude -p. Not for building the landing (use new-landing).'
user-invocable: true
argument-hint: '<slug> [--lang es]'
---

# brief-intake

Capture what a customer wants once, in `sites/<slug>/brief.json`, so that `/new-landing` reads it instead of guessing. This skill is an interview and it is **interactive only**: it needs a person to answer, so it is never started by `claude -p` or by `scripts/new-landing.sh`. The file it writes is validated by `scripts/brief.mjs`; the schema is in `scripts/lib/brief-schema.mjs` (read it for the exact fields).

Read `CLAUDE.md` first. Two languages are kept apart:

- **Interview language**: whatever the user writes in (Spanish, English or any other). Never assume one; answer and ask in the language of their latest messages, and switch if they switch.
- **Page language** (`language` in `brief.json`, a tag such as `es` or `en-GB`): the language of the landing's copy. It may differ from the interview language (a customer can be interviewed in English for a Spanish page). Ask for it explicitly. Only if the user does not say, default it to the interview language and add `{ "field": "language", "reason": "..." }` to `assumed`.

Field names, notes about the process and everything you write into the repo besides customer values are in English; the customer's own values (names, descriptions, labels, tone words) stay in the words they gave.

## Rules that never bend

- **Never invent** prices, product names, reviews, ratings, testimonials, results, awards, certifications, years of experience, addresses, phone numbers, emails, opening hours or quotes. A value the customer did not give is either left empty or, when the customer asks you to choose it, written and listed in `assumed` with the reason.
- **Empty beats made up.** If the customer does not know, leave the field empty and move on. A field in `assumed` must hold a value (an assumption is a value chosen for the customer); a missing value stays empty and is not listed.
- Only what the customer stated, pasted or linked goes in as their fact. Public links you read (when the network policy allows) are material to quote back for confirmation, not facts to copy in silently.
- Regulated niches (health, dental, legal, finance, supplements) get the same copy rules as `/new-landing`: no promises of results, no diagnosis or treatment claims, no invented reviews or credentials. Ask about required legal notices and write them in `legal`.
- Never access a private link around its access control (a Drive folder that asks for a login): record it as an asset `url` and tell the customer the owner has to fetch the files.
- Ask 2 to 4 questions at a time, grouped by topic, never the whole form at once. Never ask again for something the material already answered.

## Steps

1. **Start or resume.** If `sites/<slug>/brief.json` exists, read it and continue from it. Otherwise run `node scripts/brief.mjs init --site <slug> [--lang <tag>] [--niche "<one line>"]` (it creates `sites/<slug>/` holding only `brief.json`; `new-site --allow-existing-docs` accepts that folder later). Never use `--force` without the customer's say-so.
2. **Read what exists.** Take whatever the customer gives (pasted text, a file, an old brief, public links) and fill the fields it states, using the customer's wording. Local files (logo, photos) are asset entries with a `path` relative to `sites/<slug>/`; put the files there. A link goes in an asset's `url`.
3. **Find the gaps.** Run `node scripts/brief.mjs missing --site <slug>`. It lists empty required fields first, then recommended ones in this topic order, each with a question hint:
   business, offer (name, price, currency, link per product), audience, goal (primary and secondary action with real URLs), tone, contact (email, phone, address, hours, social), legal identity (markets, holder, privacy contact, data processing; see "The legal step"), assets (own logo, photos, videos, documents, with owner and permission), brand (colors and fonts to keep, what to avoid, AI-generated images; see "The AI images question"), references (liked with why, disliked with why), legal notices (regulated niche, notices, constraints), deploy (target and domain).
4. **Ask the next 2 to 4 questions** from the first topics that still have gaps, in the user's language, with a short reason when it helps ("so the page can show your real prices"). Offer to skip: "if you don't know, leave it and we will mark it as a placeholder".
5. **Write and validate after every answer.** Update `brief.json`, then run `node scripts/brief.mjs validate --site <slug>`. Fix the errors it names (each gives the field path and what is expected) before asking more. Required fields that are still empty are expected until you have asked for them.
6. **Mark choices as assumed.** When the customer says "you choose" for something (the tone, the headline angle, a placeholder price), write the value and add `{ "field": "<dotted.path>", "reason": "<why, who confirms>" }` to `assumed`. Dotted paths look like `tone`, `contact.hours`, `offer[0].price`. Anything the customer skips stays empty.
7. **Liked references.** For each liked URL, check `patterns/` for a matching sheet and set `sheet` to its slug when one exists. Without a sheet, tell the customer that `/analyze-reference <url>` can create one (the domain may need adding to the network allow list) and leave `sheet` empty.
8. **Confirm.** Run `node scripts/brief.mjs summary --site <slug>`, read it back in the user's language (assumed values are marked), and ask for a final confirmation or corrections. Apply corrections, validate again.
9. **Finish.** Run `node scripts/brief.mjs validate --site <slug>` and `node scripts/brief.mjs missing --site <slug>`. Report what is still empty (and will become placeholders marked as examples on the page), then tell the user the next command:

   `npm run new-landing -- <slug> --brief sites/<slug>/brief.json`

   (or `--refs` to add pattern sheets, `--auto` to skip the proposal checkpoint). Do not start the landing yourself, and never commit, push or deploy.

A filled `brief.json` written by hand (a form the customer completed) is accepted the same way: validate it, run `missing`, ask only about the gaps.

## The legal step

Asked right after the contact data, because it decides which legal pages the landing needs. Give one line of why with each question, in the user's language.

1. **Markets.** "Where will you sell or promote this (countries)?" Why: the countries decide which legal pages the page needs (a privacy policy for the EU, a legal notice as well for Spain). Write `legal.markets` as `EU` or ISO 3166-1 codes in capitals (`ES`, `DE`, `US`). If the customer names no country, leave it empty: the landing is then generated with its legal requirements marked unknown.
2. **Holder** (only when a market is named). "Who runs the page: the legal name of the person or company, the tax id (NIF, CIF, VAT number), the address and an email?" Why: the legal notice and the privacy policy must show who is responsible. Also ask for the register entry when the holder is a company (`legal.holder.register`) and for the email that handles privacy requests (`legal.privacyContact`; it may be the holder's email).
3. **Data processing.** "Will the page use analytics, forms or embeds such as video or maps?" Why: analytics and embeds may set cookies, which needs a consent mechanism; no cookies means no banner. Write `legal.processing.analytics` (`none`, `cookieless` or `cookies`), `forms` (true or false) and the embed names in `embeds`.

Never assume holder identity data. `legal.holder.*` and `legal.privacyContact` are what the customer says, nothing else: never write them from a guess, from the business contact data or from another customer, and never list them in `assumed` (validation fails with "holder identity data cannot be assumed"). When the customer does not know the tax id yet, leave it empty: the legal pages then show a visible pending legal review marker and the landing report fails until the value is given. The processing answers may be assumed when the customer says "you choose".

Tell the customer once that the generated pages and the checks support compliance and are not legal advice, and that a lawyer should review them before the page goes live in production.

## The AI images question

Asked with the brand questions. Ask it as: "May the page use AI-generated illustrations (never photos of your people or products)?" Give the reason in one line: the factory can generate abstract art, textures and generic scenes with an AI image model, every such image is recorded and the page says so, and AI images never stand in for your real team, products, customers or results. Write `brand.aiImages` as `allowed` or `not-allowed`.

Never assume it. `brand.aiImages` is the customer's decision: never write it from a guess or a default and never list it in `assumed` (validation fails with "AI-image consent cannot be assumed"). When the customer does not answer, leave it empty: an empty value counts as not allowed and no AI image is generated for that landing.

## Field notes

- `goal.primary.label` is the one action the page drives; its `url` may be `https://`, `mailto:` or `tel:`.
- Prices are strings as the customer says them (`"29"`, `"29,90"`), with `currency` apart (`"EUR"`). The final check looks for each product name and price on the built page.
- `assets[].owner` and `permission` say who owns a file and what they allow; they feed `CREDITS.md`. A public credit line only appears when the customer asks for it.
- `references.disliked` entries become "avoid" notes for the design; `brand.keep` and `brand.avoid` constrain the palette and fonts.
- `deploy.target` is one of `cloudflare-pages`, `vercel`, `netlify`, `vps`, `shared-hosting`, `undecided`; today only Cloudflare Pages deploys (CI), the field records the wish.
