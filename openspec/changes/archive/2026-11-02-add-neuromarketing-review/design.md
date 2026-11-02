# Design: add-neuromarketing-review

## Context

After `add-copy-frameworks`, a landing has a persuasion order and a wording check. The build still decides layout, emphasis, the number of calls to action and the place of proof by instinct, and nothing reviews the result for conversion before the impeccable polish. The owner's course guide gives ten strategies and a mind map; they need sorting by evidence and by the factory's rules before they become instructions.

## Decisions

### 1. One skill, two moments

`conversion-psychology` is used twice:

- **in the synthesis**, to write the Conversion plan;
- **after QA**, to review the built page.

The two vendored skills each have one role:

| Skill                           | Role                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `conversion-psychology` (ours)  | Conversion plan; conversion review and its single fix round; the ethics line      |
| `marketing-psychology` (vendor) | Reference of principles while writing the plan; never overrides our catalog's evidence levels or constraints |
| `cro` (vendor)                  | Review framework for the built page: value proposition, headline, call to action, hierarchy, trust, objections, friction |
| `copy-frameworks` (ours)        | Unchanged: the persuasion order. The Conversion plan builds on the Copy plan, never replaces it |

### 2. The catalog sorts the guide by evidence and by rules

`references/principles.md` has one entry per principle, with:

- the area;
- what it means on a landing;
- how to apply it;
- the evidence level;
- the factory constraint;
- the "never" version.

The ten strategies of the guide map onto it like this:

| Guide strategy           | Becomes                                                                 | Evidence | Constraint |
| ------------------------ | ----------------------------------------------------------------------- | -------- | ---------- |
| Irresistible headlines   | A familiar phrase with a twist, as one 4U candidate in the Copy plan     | mixed    | Copy plan owns headlines |
| Emotional responses      | One primary emotional target, carried by copy, imagery and tone         | mixed    | Facts and tone come from the brief |
| Attention with gaze      | A face looking toward the headline or call to action draws the eye there | mixed    | Only a licensed photo with a face; never an AI person; never cropping a customer photo |
| Dopamine and reward      | Visible progress on multi-step forms; "what you get" made concrete      | weak     | Contests, points and gamification are out of scope |
| Colors and emotion       | The emotional target goes to ui-ux-pro-max as an input                  | weak     | ui-ux-pro-max picks the palette; contrast rules stand |
| Fewer choices            | One primary call to action; at most three offers side by side; one highlighted with a reason | strong | Offers are the brief's |
| Pricing                  | Anchors and order only with real prices; round against exact pricing is a note to the customer | mixed | Prices are customer facts; never changed |
| Fonts                    | Simple, legible type for actions; display type for one memorable line   | weak     | ui-ux-pro-max picks fonts; legibility and QA win |
| Trust                    | Real proof, contact data, legal pages, process transparency, risk reversal the customer states | strong | No invented proof or guarantee |
| The smile                | A positive human image only when a licensed photo exists and fits      | weak     | Same as gaze |

The mind map's branches fill the rest:

- **cognitive fluency:** clear language, scannable structure, low effort;
- **reciprocity:** a free resource only when the customer has one;
- **risk reversal:** trial, guarantee and refund, only as stated by the customer;
- **decision architecture:** contrast, anchoring and framing, plus scarcity only when real;
- **memory:** peak-end, ending on a strong call to action;
- **storytelling:** already in the Copy plan's story frame;
- **ethics:** transparency, real scarcity and honest claims, as a checklist.

Ecommerce and post-purchase branches apply only to the parts a landing holds (product clarity, returns information). Experimentation is out of scope.

A `weak` principle is only ever a tiebreaker and never overrides legibility, contrast, QA or a brief fact.

### 3. The Conversion plan

The synthesis writes `## Conversion plan` with these fields:

1. **Emotional target:** one of trust, calm, joy, excitement, pride, belonging or relief. It may be paired with a secondary target, and comes with the reason from the brief. It is copied into MASTER.md as an "Emotional target" line for ui-ux-pro-max. Fear and anger are never targets, even for a problem-aware audience: PAS agitation names the problem and does not frighten.
2. **Attention path:** the hero's focal point, the one primary call to action, its label, and the secondary action if any, which is visually weaker.
3. **Choice:** the offers shown and how many sit side by side (three at most); which one is highlighted and why; the anchor, only from real prices.
4. **Trust and risk:** the proof shown and where (from `proof`), contact data, the legal pages, and the guarantee only when the brief states one.
5. **Ending:** the final section and its call to action.
6. **Ethics check:** the checklist from `references/ethics.md`, ticked or explained.

### 4. The audit script

`scripts/conversion-audit.mjs --site <slug> [--json]` uses the helpers `check-landing` already has (`htmlToText`, `builtPages`, `hrefsOf`). It reads `dist/index.html`, or each locale's home page on a multi-locale site, and the brief. It starts no browser, changes nothing and prints these findings:

| Id                    | Level | Measures |
| --------------------- | ----- | -------- |
| `hero-h1`             | warn  | the first section in `<main>` has an `h1` |
| `hero-cta`            | warn  | the first section links to `goal.primary.url` (a placeholder link when there is no brief) |
| `closing-cta`         | warn  | the last section before the footer links to the primary URL |
| `cta-destinations`    | warn  | over 3 distinct external destinations in `<main>`, not counting legal, contact and in-page anchors |
| `form-fields`         | warn  | a form with over 5 visible fields |
| `offers-side-by-side` | warn  | over 3 offer cards in one section (repeated elements with a price) |
| `proof-shown`         | info  | each `proof` entry found or not on the page |
| `proof-without-brief` | warn  | testimonial or rating markup (`blockquote` with a person's name, stars) on a site whose brief has no `proof` |
| `contact-visible`     | warn  | a brief contact value is not on the page |
| `legal-linked`        | info  | the legal pages are linked from the footer |

Every finding is a warning or info, because these are heuristics: the script exits 0 even with findings. It exits 2 on bad usage or a missing build. A finding names the page, a selector and the reason. The skill reads it with the section screenshots and decides; a person can override a finding with a reason in RUN.md.

### 5. The `dark-patterns` rule

This is the only new failing check, since these patterns are unethical whatever the evidence. It reads every built page except `404.html` and fails on:

- **a pre-checked checkbox:** an `input[type=checkbox]` with a `checked` attribute inside a `<form>`;
- **a countdown:** an element with `data-countdown`, or an inline or bundled script that pairs `setInterval` with day, hour, minute or second labels in the same component. The script check is a best-effort pattern on the built JavaScript of the page;
- **confirmshaming:** a link or button whose text starts with a refusal ("no", "no thanks", "no, gracias", "prefiero no") and continues with self-blame. The Spanish and English patterns live in `scripts/lib/dark-patterns.mjs`.

Fair cases must pass: an unchecked consent box, a date written as text ("hasta el 30 de noviembre"), a plain "No, gracias".

### 6. One review round

The review happens once, after QA passes and before the impeccable polish. It is the same kind of single round as the polish.

**The skill may change:**

- the order of sections when the Copy plan allows it;
- where calls to action are placed, and their labels;
- the emphasis of copy;
- the number of form fields, but only optional ones the brief does not require;
- whether a secondary call to action is shown or hidden.

**It never changes:** tokens, fonts, palette, images, facts, prices, the archetype or the layout grammar. A finding that needs any of those goes to RUN.md "Conversion review", under "for a person".

QA runs again afterwards. If the review turned QA red, the edit that caused it is undone.

### 7. Vendoring

`cro` and `marketing-psychology` get lock entries with the same repository and commit as the other three `marketingskills` skills. `cro` keeps its `references/` folder. Neither file is ever edited.

## Risks

- **Heuristics misread a layout.** The audit only warns, and the skill looks at the screenshots before acting.
- **Weak evidence presented as fact.** Every principle carries its evidence level, and the docs say the factory does not claim neuroscience results.
- **Manipulation.** The ethics checklist covers it, together with `dark-patterns` (fail), `copy-claims` (fail and warn) and the rule that urgency, scarcity, proof and guarantees come only from the customer.
- **Over-editing.** There is one round, with a fixed list of what may change, and QA runs again after it.

## Verification

- **`npm test`:**
  - each audit heuristic on small `dist/` fixtures, both hit and miss;
  - the JSON shape and exit codes;
  - each dark pattern in `es` and `en`, plus the fair cases;
  - the lock and skill checks.
- **Real sites:**
  - the audit and `check-landing` on every existing site;
  - findings listed in the pull request and not fixed.
- **Repository checks:** `npm run lint`, `npm run format:check`, `npm run check`, `npm run setup:verify`, `openspec validate add-neuromarketing-review --strict`.
