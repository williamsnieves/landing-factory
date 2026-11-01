---
name: copy-frameworks
description: 'Choose the persuasion structure of a landing''s copy and write it down before any copy exists: run the deterministic picker (node scripts/pick-copy-framework.mjs --site <slug>), write the "Copy plan" of PROPOSAL.md (framework and why, every section mapped to a stage, 2 or 3 hero headlines checked with 4U, the inventory of real proof) and write the copy from that plan. Frameworks: AIDA, PAS, FAB, BAB, 4P, PASTOR, QUEST, ACCA, a story frame (Star, Story, Solution) and SLAP. Use during the /new-landing synthesis and build, in a /revise-landing round with copy items, or when the user asks which copy framework fits a landing. Does not write the sentences by itself (use copywriting for headline formulas and to avoid AI tells) and does not review a built page.'
user-invocable: false
---

# copy-frameworks

This skill decides the order in which a landing persuades: what the visitor reads first, when proof appears, where the offer and the action go. It is ours, written for this repository. The vendored `copywriting` skill (`.claude/skills/copywriting/SKILL.md`) helps with the sentences. When the two disagree on structure, the Copy plan wins and the difference goes in RUN.md "Design decisions".

| Skill            | Role                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `copy-frameworks` | Pick the framework with the script, write the Copy plan, map sections to stages, test headlines with 4U |
| `copywriting`    | While writing: headline formulas, copy for each kind of section, avoiding the tells of machine writing |

`copywriting` mentions `.agents/product-marketing.md`, which does not exist here: the brief is the context. It never picks the framework.

## Inputs

Only the brief (`sites/<slug>/brief.json`) and the proposal. Facts, prices, names and proof come from the brief. Whatever is empty or listed in `assumed` is not a customer fact and the copy does not present it as one.

## 1. Pick

```bash
node scripts/pick-copy-framework.mjs --site <slug>          # top 3 with scores, reasons and the stage-to-section map
node scripts/pick-copy-framework.mjs --site <slug> --json
node scripts/pick-copy-framework.mjs --list                 # the whole catalog
```

The picker reads `audience.awareness` (how much the visitor already knows: `unaware`, `problem-aware`, `solution-aware`, `product-aware`, `most-aware`), `business.kind`, the prices of the offer, the primary action, the `proof` list, `legal.regulated` and `audience.objections`. Without `audience.awareness` it uses `problem-aware` and says so: carry that into the proposal's Decisions as an assumption the reviewer can change. Without a brief it uses defaults and says so. The same brief always gives the same ranking.

Take the top candidate unless the brief clearly argues otherwise. An override is allowed, and its reason is written in the Copy plan. Notes marked `!` in the output are binding:

- A regulated niche with a promise-led framework (BAB, 4P): the "promise" or "after" stage describes the service and never an outcome. No health, money or result promises.
- No real proof: keep the framework, mark the proof stage "no proof available" and fill it with the process, guarantees the customer states, or their own facts. Never an invented testimonial, rating, figure or award.

## 2. Copy plan

Fill the `## Copy plan` section of `PROPOSAL.md` (the template has the headings):

1. **Framework:** the id, the picker's reasons, and any override with its reason.
2. **Awareness:** the level used and whether it is assumed.
3. **Stage to section:** a table with one row per planned section of the page map: section, stage, what it says (one sentence), and the facts it uses (named brief fields). A stage may span two sections, and on a short page two stages may share one section; every section of the page map appears, and every stage is carried somewhere.
4. **Hero headline candidates:** two or three, each scored on 4U (see `references/headlines.md`), with the chosen one marked. Urgency scores only when it is true.
5. **Proof inventory:** each `proof` entry of the brief by kind, and what is missing. Write "no proof available" rather than leave the stage empty.

A multi-locale landing has one framework and one plan; each locale is written as natural text, not as a word-for-word translation.

## 3. Write from the plan

- Follow the stage order of the plan section by section. The hero carries the first stage and the headline chosen in the plan.
- Use `copywriting` for headline formulas and to avoid machine-sounding patterns, and let the tone words of the brief set the voice.
- Show as proof only what `proof` holds, in the customer's words (a figure with its source link when there is one). No invented numbers, reviews, ratings, studies, awards, "years of experience" or customer names.
- No promise of results, no result within a time span, no absolute superlative ("the best in the world", "number 1"), no health or money promise unless the brief states the claim in the customer's own words. The final check `copy-claims` fails these and warns about unsourced percentages, unnamed studies, large round numbers and urgency wording.
- Urgency and scarcity only when true and given by the customer.
- Prices are the brief's prices, written as given.

## 4. Record

- RUN.md "Design decisions": the framework, the awareness level (and that it was assumed, if so), and any place the build left the plan.
- RUN.md "to confirm before launch": a person must read the whole copy before the page is published, and every `copy-claims-confirm` warning needs a decision.

## Revision rounds

A `copy` item of `/revise-landing` keeps the landing's framework: read the Copy plan in `PROPOSAL.md`, change the sentences inside their stage, and do not move stages between sections. Changing the framework is a `rebuild` item. A new customer fact (a price, a guarantee, a testimonial) goes into `brief.json` first, then the copy.

## Reference

- `references/frameworks.md`: each framework in detail (stages, what each says, sections, when it fits, when it does not, usual mistakes).
- `references/headlines.md`: the 4U test and how to apply it.
