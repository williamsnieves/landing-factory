# Copy frameworks and claims

How the factory plans the order of a landing's copy, writes from that plan and checks the wording that must never ship. Design: `openspec/changes/add-copy-frameworks/`. The picker and the check are deterministic. They judge structure and wording, not whether a claim is true: a person reads the copy before it is published.

## What the factory does

| Stage     | What happens                                                                                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brief     | `audience.awareness` (how much the visitor already knows) and `proof` (the customer's real testimonials, figures, credentials, awards and press). `/brief-intake` asks for both and never invents proof. |
| Synthesis | `node scripts/pick-copy-framework.mjs --site <slug>` ranks the frameworks. `PROPOSAL.md` gets a "Copy plan": framework and why, every section mapped to a stage, 2 or 3 hero headlines scored with 4U, the proof inventory. |
| Build     | The copy is written from the plan, with the vendored `copywriting` skill for headline formulas and to avoid machine-sounding patterns. Proof is the brief's `proof` list and nothing else.          |
| Check     | The `copy-claims` rule of `check-landing` reads the built copy: promises fail, other wording warns.                                                                                                |
| Revision  | A `copy` item keeps the landing's framework; the same rule runs because `revise-landing` runs `check-landing`.                                                                                     |

## The brief

```json
{
  "audience": { "awareness": "solution-aware" },
  "proof": [
    { "kind": "testimonial", "text": "Said in the customer's own words.", "source": "https://example.com/review" },
    { "kind": "credential", "text": "Registered with the professional body since 2015." }
  ]
}
```

- `audience.awareness` is one of `unaware`, `problem-aware`, `solution-aware`, `product-aware`, `most-aware`. It may be listed in `assumed`. `brief missing` lists it after `audience.objections`.
- `proof` has at most 10 entries. `kind` is `testimonial`, `figure`, `credential`, `award` or `press`; `text` is the customer's own words; `source` is an optional `https` link. Proof can never be listed in `assumed` (validation fails), because it is the customer's own evidence. On a prospect brief each entry needs its `source`. `brief missing` asks for it after the offer; `summary` lists it.
- Older briefs stay valid.

## The picker

`node scripts/pick-copy-framework.mjs --site <slug> [--top N] [--json]` prints the top candidates (3 by default) with score, reasons and the stage-to-section map. `--list` prints the catalog. Exit 0 ok, 2 bad usage, a missing site or an invalid brief. The same brief always gives the same ranking; ties break by score, then id. It never writes anything.

Signals come from the brief: awareness (else `problem-aware`, printed as assumed), `business.kind`, the prices of the offer (`low` under 50, `high` over 500 in the offer's own currency, `mixed` when the offers span classes), the goal (`buy`, `booking` or `lead`, read from the primary action's label and URL), `proof` (real or none), `legal.regulated` and whether objections are stated. Without a brief the defaults are used and the output says so.

| Awareness        | Ranks first   |
| ---------------- | ------------- |
| `unaware`        | story, QUEST  |
| `problem-aware`  | PAS, PASTOR   |
| `solution-aware` | BAB, FAB      |
| `product-aware`  | FAB, 4P       |
| `most-aware`     | ACCA, SLAP    |

The other signals adjust the score. A high price or stated objections lift the frameworks that have a proof or objection stage (PASTOR, QUEST, 4P). A regulated niche lowers the promise-led ones (BAB, 4P) and the output says that their promise stage describes the service and never an outcome. No real proof keeps the framework and marks its proof stage "no proof available".

The catalog and the scoring are in `scripts/lib/copy-frameworks.mjs`; the skill `.claude/skills/copy-frameworks/` describes each framework in prose (`references/frameworks.md`) and the 4U headline test (`references/headlines.md`). The frameworks are AIDA, PAS, FAB, BAB, 4P, PASTOR, QUEST, ACCA, a story frame (Star, Story, Solution) and SLAP.

## Two skills, two roles

| Skill                              | Role                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `copy-frameworks` (ours)           | Pick the framework, write the Copy plan, map sections to stages, test headlines with 4U      |
| `copywriting` (vendored, MIT)      | While writing: headline formulas, copy for each kind of section, avoiding machine-sounding patterns |

When they disagree on structure the Copy plan wins, and the difference goes in RUN.md "Design decisions". The vendored skill mentions `.agents/product-marketing.md`, which does not exist here: the brief is the context.

## The `copy-claims` rule

`node scripts/check-landing.mjs --site <slug>` reads the visible text of every built page except `404.html` and the legal pages (the report's legal paths or `data-legal-page`), in Spanish and English. The language comes from `<html lang>`; a page in another language gets one `copy-claims-language` warning and is not scanned. A site without a build gets a `copy-claims-no-build` warning.

Patterns are whole phrases, matched case- and accent-insensitively, in `scripts/lib/copy-claims.mjs`.

| Level | Id                     | Catches                                                                 |
| ----- | ---------------------- | ----------------------------------------------------------------------- |
| fail  | `guaranteed-result`    | "resultados garantizados", "guaranteed results", satisfaction or money-back guarantees |
| fail  | `result-in-time`       | "resultados en 7 días", "results within two weeks"                       |
| fail  | `absolute-superlative` | "el mejor del mundo", "the best in the world", "número 1 en"             |
| fail  | `health-promise`       | "cura el dolor", "sin efectos secundarios", "no side effects"            |
| fail  | `money-promise`        | "gana 3.000 € al mes", "earn €X", "guaranteed income"                    |
| warn  | `unsourced-stat`       | a percentage or "N times" figure without a source on the line            |
| warn  | `study-claim`          | "studies show", "clínicamente probado" without a named source            |
| warn  | `round-number`         | a large round figure such as "+10.000"                                   |
| warn  | `urgency`              | "last units", "solo hoy", "plazas limitadas"                             |

A failure names the page, the phrase (cut at 80 characters) and the reason. **Brief exception:** when the brief's own, non-assumed text (`business.description`, `offer[].description`, `audience.*`, `legal.constraints`, `proof[].text`) holds the claim's key term, the failure becomes a `copy-claims-confirm` warning: the claim is the customer's, and a person confirms it. A claim the brief does not hold is rewritten. Do not widen a pattern or the exception to get a pass.

Fair wording is not flagged (a "garantía de 2 años según la ley", "the best way to start", "resultados" alone, a price such as "29,99 €"). If a fair sentence is flagged, narrow the pattern and add the sentence to `tests/copy-claims.test.mjs`.

`check-landing` does not run in CI, so existing landings are checked only when a revision or a person runs it.

## A person reads the copy

Every RUN.md lists under "to confirm before launch" that a person must read the whole copy before the page is published, then each `copy-claims` warning.

## Out of scope

Neuromarketing and the conversion review of a built page (the next change, `add-neuromarketing-review`), A/B tests, analytics on the copy, rewriting existing landings, languages other than Spanish and English in the claims rule, and judging whether a claim is true.
