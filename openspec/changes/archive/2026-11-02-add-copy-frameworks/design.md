# Design: add-copy-frameworks

## Context

Copy is written in the `/new-landing` build phase, with rules only on facts (from the brief, never invented) and on regulated niches. Layouts already have a deterministic picker (`pick-archetypes`), so a landing's structure can be reviewed. This change gives copy the same treatment:

- a closed catalog;
- a scored pick from the brief;
- a plan in the proposal;
- one final check on wording that must never ship.

## Decisions

### 1. Our skill decides; the vendored one helps write

`copy-frameworks` is written in this repository, because `marketingskills` has no framework catalog or selection rule: its `copywriting` skill has headline formulas, section types and an "AI tells" list, and `marketing-psychology` mentions AIDA only as a funnel. Roles:

| Skill                         | Role                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `copy-frameworks` (ours)      | Pick the framework (through the script), write the Copy plan, map sections to stages, 4U headlines |
| `copywriting` (vendored, MIT) | While writing: headline formulas, section copy types, avoid AI tells                               |

When they disagree on structure, the plan wins and the difference goes in RUN.md "Design decisions", the same rule as design-taste-frontend against the proposal. The vendored file mentions `.agents/product-marketing.md`; here the brief is the context, as with `seo-audit`.

### 2. Catalog and scoring in code

`scripts/lib/copy-frameworks.mjs` exports `FRAMEWORKS`. Each framework has:

- `id`, `name` and `stages[]`, where each stage has `{ id, says, sections }`;
- `fits` and `avoid`, written in the brief's signals.

The signals are derived from the brief:

| Signal        | From                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `awareness`   | `audience.awareness`, else `problem-aware`, reported as assumed                                        |
| `kind`        | `business.kind`                                                                                        |
| `price`       | `offer[].price`: `none`, `low` (under 50 in the offer's currency), `mid`, `high` (over 500), or `mixed` |
| `goal`        | `goal.primary`: `buy` when the URL is a checkout or store, `booking`, `lead` (a form or contact)        |
| `proof`       | `real` when the brief's new `proof` list has an entry, else `none`                                     |
| `regulated`   | `legal.regulated`                                                                                      |
| `objections`  | present or not (`audience.objections`)                                                                 |

The first scoring table follows the awareness ladder:

| Awareness        | Frameworks that rank first |
| ---------------- | -------------------------- |
| `unaware`        | story and QUEST            |
| `problem-aware`  | PAS and PASTOR             |
| `solution-aware` | BAB and FAB                |
| `product-aware`  | FAB and 4P                 |
| `most-aware`     | ACCA and SLAP              |

The other signals adjust the score:

- **High price, or objections present:** frameworks with a proof or objection stage rank higher (PASTOR, QUEST, 4P).
- **Regulated niche:** promise-led frameworks (BAB, 4P's "promise") rank lower. A regulated landing that uses one gets a written note that the "promise" stage describes the service and never an outcome.
- **No real proof:** frameworks whose proof stage is mandatory are not removed. The plan marks that stage "no proof available" and fills it with process, guarantees the customer states, or the customer's own facts.

Like `pick-archetypes`, the picker prints:

- the top candidates (3 by default);
- each candidate's score and reasons;
- the stage-to-section map.

It is deterministic: ties break by score, then id. Exit codes: 0 ok; 2 bad usage, missing site or invalid brief. A site without a brief takes its signals from `--niche`-style defaults (`awareness` `problem-aware`, `proof` `none`) and says so.

### 3. Copy plan in the proposal

The synthesis writes `## Copy plan` with:

- the framework and the reason from the picker, plus any override and its reason;
- a table of section, stage, what it says and the facts it uses;
- 2–3 hero headline candidates, each scored on 4U (useful, urgent, unique, ultra-specific; urgency only when it is real);
- the proof inventory: what is real, from the brief, and what is missing.

A multi-locale landing keeps one framework and writes each locale naturally. The build reads the plan, and a `copy` item in a revision keeps it.

### 4. The claims rule

`scripts/lib/copy-claims.mjs` exports `CLAIM_PATTERNS`. Each pattern has an `id`, `level` (`fail` or `warn`), `lang` (`es` or `en`), a regular expression and a short reason.

The rule reads the visible text of every built HTML page, except `404.html` and the legal pages, through `htmlToText`. It reports the page, the matched phrase (at most 80 characters) and the reason.

Fail ids:

| Id                       | Catches                       |
| ------------------------ | ----------------------------- |
| `guaranteed-result`      | guaranteed results            |
| `result-in-time`         | results within a time span    |
| `absolute-superlative`   | "the best in the world", "number 1" |
| `health-promise`         | cures, no side effects        |
| `money-promise`          | earn €X, guaranteed income    |

Warn ids:

| Id               | Catches                                      |
| ---------------- | -------------------------------------------- |
| `unsourced-stat` | a percentage or a "N times" figure           |
| `study-claim`    | "studies show" without a named source        |
| `round-number`   | a large round number such as "+10.000"       |
| `urgency`        | "last units", "only today"                   |

**Brief exception.** A fail match turns into a warning (`copy-claims-confirm`) when the brief's own text has the claim's key term. The text searched is `business.description`, offer descriptions, `audience`, `legal.constraints` and `proof[].text`, but never the fields listed in `assumed`. A money-back guarantee the customer described may then be shown, and a person confirms it. A claim the brief does not hold must be rewritten.

The page language comes from `<html lang>`. A page in another language gets one `copy-claims-language` warning and is not scanned.

`check-landing` runs the rule on every site. Existing sites are checked only when a revision or a person runs `check-landing`, since CI never runs it.

### 5. Brief fields

**`proof`** is an optional list of at most 10 `{ kind, text, source? }`:

- `kind` is one of `testimonial`, `figure`, `credential`, `award` or `press`;
- `text` is the customer's own words;
- `source` is an optional `https` URL.

Proof is a customer fact, so `proof` and its entries can never be listed in `assumed`: validation fails, as it does for `legal.holder`. On a prospect brief every entry needs a `source`, and `PROSPECT_FACT_FIELDS` gains `proof[].text`. `brief missing` asks for it after the offer, `summary` lists it, and `/brief-intake` asks for it without suggesting any. The build shows only these entries as proof, never an invented figure or review. Review or rating markup stays forbidden unless they are real reviews, as before.

**`audience.awareness`** is a `str({ enum: AWARENESS_LEVELS })`:

- it may be listed in `assumed`;
- `brief missing` puts it after `audience.objections`;
- `/brief-intake` asks: "Does your visitor already know they have the problem / that solutions exist / your product?".

It is not a prospect fact, so it needs no source.

### 6. Vendoring

`agent-tooling.lock.json` gets a `copywriting` entry with the same repository and commit as `seo-audit` and `schema` (subpath `skills/copywriting`). `setup:agent` installs it and `setup:verify` checks it. The vendored files are never edited.

## Risks

- **False positives.** The rule may flag fair wording. The patterns are narrow (whole phrases, not single words), each fail names its reason, and the brief exception covers the customer's own claims. A fail is fixed by rewriting, never by widening the exception.
- **Rigid copy.** A framework can make the copy formulaic. The plan maps stages to sections, and the skill tells the writer that a stage may span sections or be merged when the page is short.
- **Awareness is a guess.** When it is not answered, the assumption is printed and listed in the proposal, and the person reviewing the proposal can change it.

## Verification

- **`npm test`:**
  - the catalog shape;
  - picker ranking for fixture briefs (one per awareness level, regulated, high price, no proof);
  - determinism;
  - claims patterns in `es` and `en`, both fail and warn;
  - the brief exception;
  - the language warning;
  - the new brief field;
  - setup verify for the vendored skill.
- **Real sites:**
  - `check-landing` on each existing site with a brief prints the rule's result. Findings on existing sites are listed in the pull request, not fixed here.
  - The picker on each existing brief gives a ranking.
- **Repository checks:** `npm run lint`, `npm run format:check`, `openspec validate add-copy-frameworks --strict`.
