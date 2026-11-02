---
name: conversion-psychology
description: 'Plan and review the conversion side of a landing, with honest evidence levels: write the "Conversion plan" of PROPOSAL.md after the Copy plan (emotional target, attention path with one primary call to action, choice architecture, trust and risk, the ending, an ethics check), then review the built page once with node scripts/conversion-audit.mjs and the section screenshots and apply a fixed list of edits. Holds the catalog of principles (attention, fluency, emotion, trust, risk, choice, price, memory, reciprocity, ethics) sorted by evidence (strong, mixed, weak) and by the factory rules. Use during the /new-landing synthesis and after the QA loop passes, in a /revise-landing round with copy or content items, or when the user asks how a landing should guide attention, handle choice, trust or risk. Does not pick the copy framework (use copy-frameworks), palette or fonts (ui-ux-pro-max), and never invents proof, guarantees, urgency or prices.'
user-invocable: false
---

# conversion-psychology

This skill decides how a landing guides a visitor to one action: where the eye lands, how many decisions the visitor makes, how trust and risk are handled and what is remembered at the end. It is ours, written for this repository, in our own words. It claims no neuroscience results: every principle in the catalog carries an evidence level, and a `weak` one is only ever a tiebreaker.

It is used twice: in the synthesis, to write the Conversion plan, and after QA passes, to review the built page once.

## Roles

| Skill                          | Role                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `conversion-psychology` (ours) | The Conversion plan, the single review round and its edit limits, the catalog with evidence levels, the ethics line           |
| `copy-frameworks` (ours)       | Unchanged: the persuasion order and the Copy plan. The Conversion plan builds on it and never replaces it                      |
| `marketing-psychology` (vendored) | A reference of principles while writing the plan. Where it disagrees with the catalog on evidence or constraints, the catalog wins |
| `cro` (vendored)               | The review framework for the built page: value proposition, headline, call to action, hierarchy, trust, objections, friction  |
| `ui-ux-pro-max`                | Palette and fonts, the only one. The emotional target is an input to its queries, not an instruction                          |

The vendored skills mention `.agents/product-marketing.md`, experiments, analytics and A/B tests. None of that exists here: the brief is the context and the factory measures no traffic. Neither vendored skill decides palette, fonts, the copy framework or facts.

## Inputs

The brief (`sites/<slug>/brief.json`) and the proposal up to the Copy plan. Facts, prices, proof, guarantees, deadlines and contact data come from the brief. Whatever is empty or listed in `assumed` is not a customer fact and is never presented as one. Read `references/principles.md` for the catalog and `references/ethics.md` for the checklist.

## 1. Conversion plan (synthesis)

Fill the `## Conversion plan` section of `PROPOSAL.md` after the Copy plan:

1. **Emotional target.** One of trust, calm, joy, excitement, pride, belonging or relief, optionally with a secondary one, and the reason from the brief (tone words, audience, niche, the problem the audience arrives with). Fear and anger are never targets, even for a problem-aware audience: the problem stage of a framework names the problem and does not frighten. The target goes into MASTER.md as an `Emotional target:` line, an input to ui-ux-pro-max.
2. **Attention path.** The hero's focal point, the one primary call to action with its label and URL (`goal.primary`), and the secondary action if any, visually weaker. A gaze cue only when a licensed photo with a face exists and fits.
3. **Choice.** The offers shown, how many sit side by side (three at most), the highlighted one and why, and the anchor, only from the brief's real prices.
4. **Trust and risk.** The proof shown and where (the brief's `proof` and nothing else; "no proof available" otherwise), contact data, the legal pages, and a guarantee only when the brief states one.
5. **Ending.** The final section and its repeat of the primary call to action.
6. **Ethics check.** The checklist of `references/ethics.md`, ticked or explained.

The plan is a short list, not an essay. Every item names the brief fields it uses.

## 2. Conversion review (after QA passes, before the polish)

```bash
node scripts/conversion-audit.mjs --site <slug>          # human text
node scripts/conversion-audit.mjs --site <slug> --json   # { site, brief, pages, findings: [{ id, level, page, selector, message }] }
```

The audit reads `dist/` and the brief, starts no browser, changes nothing and exits 0 even with findings (2 for bad usage or no build). Its findings are heuristics: confirm each one on the section screenshots (`node scripts/section-shots.mjs --site <slug>`) before acting.

| Id                    | Level | Meaning                                                                 |
| --------------------- | ----- | ----------------------------------------------------------------------- |
| `hero-h1`             | warn  | the first section of `<main>` has no `h1`                               |
| `hero-cta`            | warn  | the first section does not link to the primary call-to-action URL       |
| `closing-cta`         | warn  | the last section before the footer does not link to it                  |
| `cta-destinations`    | warn  | more than 3 distinct link destinations in `<main>`                      |
| `form-fields`         | warn  | a form with more than 5 visible fields                                  |
| `offers-side-by-side` | warn  | more than 3 priced items side by side in one section                    |
| `proof-shown`         | info  | each `proof` entry of the brief is on the page or not                   |
| `proof-without-brief` | warn  | testimonial or star-rating markup while the brief has no `proof`        |
| `contact-visible`     | warn  | a non-assumed contact value of the brief is not on the page             |
| `legal-linked`        | info  | the legal pages and whether the page links them                         |

Read the findings through the `cro` questions (value proposition, headline, call to action, hierarchy, trust, objections, friction) and the catalog, then apply fixes in **one round**.

**Allowed edits:** the order of sections when the Copy plan allows it; where calls to action are placed and their labels; the emphasis of copy (what is a heading, a lead sentence, a button label); optional form fields the brief does not require; showing or hiding a secondary action.

**Never changed in the review:** tokens, fonts, palette, images, facts, prices, the archetype and the layout grammar, and any proof, guarantee, urgency or scarcity the brief does not state. A finding that needs one of these is not applied. It goes to RUN.md "Conversion review" under "for a person", with the reason.

Re-run `npm run qa -- --site <slug>`. If the review turned QA red, undo the edit that caused it. A person can override a finding with a reason written in RUN.md.

## 3. Record

RUN.md "Conversion review": the findings (id, page), what changed (file and why), what is left for a person and why, and the plan items the page could not honor. Write it when there are no findings too.

A `/revise-landing` round with `copy` or `content` items runs the audit afterwards and notes new findings in REVISION.md. It does not fix findings the round did not cause.

## 4. Evidence rules

- Every principle used in the plan or the review is looked up in `references/principles.md`, with its evidence level and its constraint.
- `strong` can drive a decision. `mixed` can drive it when the brief supports it. `weak` only breaks a tie and never overrides legibility, contrast, QA or a brief fact.
- Write "tends to" and "may", never "proves" or "the brain". The factory does not claim neuroscience results, and neither does the page copy.
- The final check `dark-patterns` fails a pre-checked checkbox, a countdown timer and confirmshaming; `copy-claims` fails and warns on promises, unsourced figures and urgency wording. Urgency, scarcity, proof and guarantees come only from the customer.
