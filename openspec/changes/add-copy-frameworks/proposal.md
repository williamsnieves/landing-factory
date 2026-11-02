# Proposal: add-copy-frameworks

## Why

The factory makes landings that look designed, but nothing guides how their copy is written. `/new-landing` asks for original copy built on the customer's facts, with no promises of results in regulated niches. It has no method for the order of persuasion: which problem to open with, when to bring proof, where the offer and the call to action go. Every landing is therefore written from the agent's instinct, so the result differs from run to run and nobody can review the reasoning.

The owner shared two resources (2026-11-01):

- **A checklist for text written by AI.** It asks for:
  - every figure to have a source;
  - no promises of results, health, money or guarantees without backing;
  - real prices;
  - a person to read the copy;
  - a voice that sounds like the brand.

  It lists warning signs: round numbers without a source, studies without a name, "guaranteed", "the best in the world", "results in days".
- **A neuromarketing course guide with a mind map.** It is used in the follow-up change `add-neuromarketing-review`.

The owner decided (2026-11-01):

- two changes, copy frameworks first;
- vendor `copywriting`, `cro` and `marketing-psychology` from `marketingskills`, the repository `seo-audit` and `schema` already come from;
- the claims rule fails on promises and only warns about the rest.

## What Changes

- **Our own skill `copy-frameworks`** (`.claude/skills/copy-frameworks/`, written here, not vendored). It holds a catalog of the classic copywriting frameworks:
  - AIDA, PAS, FAB, BAB, 4P, PASTOR, QUEST, ACCA, the "Star, Story, Solution" story frame and SLAP for short pages;
  - for headlines, the 4U test.

  For each framework it gives the stages, what each stage must say, which landing section carries it, when it fits, when it does not and the usual mistakes. The skill writes the "Copy plan" of the proposal and then the copy from that plan.
- **A deterministic picker, `scripts/pick-copy-framework.mjs --site <slug> [--top N] [--json]`.** It ranks the frameworks from the brief, the same way `pick-archetypes` ranks layouts:
  - the business kind;
  - the offer, with its price and risk;
  - the goal: buy, lead or booking;
  - the regulated flag (`legal.regulated`);
  - whether there is real proof (the new `proof` list);
  - a new optional field, `audience.awareness`.

  Each candidate comes with its reasons. The catalog and the scoring rules live in `scripts/lib/copy-frameworks.mjs`, shared by the script and the tests.
- **Brief: `proof`.** An optional list of the customer's real proof: testimonials, figures, credentials, awards and press, each in their own words with an optional source link. It can never be assumed, and on a prospect brief each entry needs a source. Today the brief has no place for proof, so the copy cannot tell real proof from none.
- **Brief: `audience.awareness`.** An optional field from a closed list: `unaware`, `problem-aware`, `solution-aware`, `product-aware`, `most-aware`. It records how much the visitor already knows. `brief missing` lists it among the recommended fields, `/brief-intake` asks for it in plain words, and it may be listed in `assumed`. Older briefs stay valid.
- **Generation.**
  - **Synthesis.** It runs the picker and writes a "Copy plan" section in `PROPOSAL.md`: the chosen framework and why, every section mapped to a stage, the hero headline candidates checked with 4U, and the facts and proof each stage may use (from the brief only).
  - **Build.** It writes the copy from the plan with the vendored `copywriting` skill, for headline formulas and to avoid AI tells, and lists the framework in RUN.md "Design decisions".
  - **RUN.md "to confirm before launch".** It always says that a person must read the whole copy before publishing.
- **Final check: rule `copy-claims`** in `check-landing`. It reads the text of every built page except `404.html`, in Spanish and English; other languages get a "not covered" warning. Patterns live in `scripts/lib/copy-claims.mjs`.
  - **Fails:**
    - guaranteed results;
    - results within a time span;
    - absolute superlatives such as "the best in the world" or "number 1";
    - health promises such as "cures" or "no side effects";
    - money promises such as "earn €X" or "guaranteed income".
  - **Only warns:**
    - a percentage or a "N times" figure;
    - "studies show" without a named source;
    - a large round number;
    - urgency or scarcity words.
  - **A fail that matches the brief becomes a warning** when the brief states the same claim in the customer's own words, for example a money-back guarantee in an offer description. The claim is then the customer's, and a person confirms it.
- **Revision.** `revise-landing` keeps the landing's framework for `copy` items and runs the same rule as part of its checks, since it already runs `check-landing`.
- **Vendored `copywriting`** from `marketingskills` at the pinned commit, with one role: headline formulas, section copy types and avoiding AI tells while writing. It never picks the framework, which is the job of `copy-frameworks`. `cro` and `marketing-psychology` arrive with `add-neuromarketing-review`, where they get their roles.
- **Docs.** A new guide, `docs/copy.md`. CLAUDE.md gets a "Copy" section, a row in the vendored skills table and the new command.

## Out of scope

- Neuromarketing and the conversion review of a built page, which come in the next change, `add-neuromarketing-review`.
- A/B tests, analytics on the copy, rewriting existing landings. tupathdigital is revised later, through a revision round, once analytics give a baseline.
- Languages other than Spanish and English in the claims rule.
- Judging whether a claim is true: the rule flags wording, and a person decides.

## Impact

- New:
  - `.claude/skills/copy-frameworks/` (SKILL.md and `references/`);
  - `scripts/pick-copy-framework.mjs`, `scripts/lib/copy-frameworks.mjs`, `scripts/lib/copy-claims.mjs`;
  - `docs/copy.md`;
  - `.claude/skills/copywriting/` (vendored), with its license in `third-party-licenses/marketingskills.LICENSE`, already present.
- Changed:
  - `scripts/lib/brief-schema.mjs` and `scripts/brief.mjs` (`proof`, `audience.awareness`);
  - `scripts/check-landing.mjs` (`copy-claims`);
  - the `new-landing`, `brief-intake` and `revise-landing` skills (our own);
  - `agent-tooling.lock.json`, `.claude/settings.json` (allow the read-only picker);
  - CLAUDE.md.
- Tests:
  - `tests/copy-frameworks.test.mjs` (catalog and picker);
  - `tests/copy-claims.test.mjs` (patterns in `es` and `en`, the brief exception, the warnings);
  - brief tests for the new field;
  - the setup verify test for the new vendored skill.
- No change to sites, QA thresholds, CI or deploys. `check-landing` does not run in CI, so existing landings are only affected when they are revised.
