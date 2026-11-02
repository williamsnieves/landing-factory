# Conversion plan, review and dark patterns

How the factory plans the conversion side of a landing, reviews the built page once and refuses the manipulative patterns that must never ship. Design: `openspec/changes/add-neuromarketing-review/`. The audit measures markup and the rule checks patterns; neither judges whether a page will convert, and the factory claims no neuroscience results. A person reads the page before it is published.

## What the factory does

| Stage     | What happens                                                                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Synthesis | `PROPOSAL.md` gets a "Conversion plan" after the Copy plan: the emotional target, the attention path with one primary call to action, the choice architecture, trust and risk, the ending and an ethics check. |
| Design    | The emotional target goes into `MASTER.md` as an `Emotional target:` line, an input to ui-ux-pro-max. It still picks palette and fonts alone.                                                              |
| Review    | After QA passes and before the impeccable polish, `node scripts/conversion-audit.mjs --site <slug>` and the section screenshots feed one round of fixes. RUN.md gets a "Conversion review".                  |
| Check     | The `dark-patterns` rule of `check-landing` fails a pre-checked checkbox, a countdown timer and confirmshaming.                                                                                            |
| Revision  | A `revise-landing` round with `copy` or `content` items runs the audit afterwards and lists new findings in REVISION.md. It does not fix findings it did not cause.                                        |

The skills: `conversion-psychology` (ours, `.claude/skills/conversion-psychology/`) owns the plan, the review and the catalog. `copy-frameworks` (ours) still owns the persuasion order; the Conversion plan builds on the Copy plan and never replaces it. `marketing-psychology` (vendored) is a reference of principles while writing the plan and `cro` (vendored) is the review framework for the built page; neither decides palette, fonts, the copy framework or facts.

## The catalog

`.claude/skills/conversion-psychology/references/principles.md` has one entry per principle in ten areas: attention, fluency, emotion, trust, risk, choice, price, memory, reciprocity and ethics. Each entry says what it means on a landing, how to apply it, its evidence level, the factory constraint it must respect and the version it must never become.

| Level    | Meaning                                                                                   | Use                                                                          |
| -------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `strong` | Consistent findings or basic usability practice                                           | Can drive a decision                                                         |
| `mixed`  | Plausible and often reported; effects vary or replications disagree                       | Can drive a decision when the brief supports it                              |
| `weak`   | Contested, small or single-study evidence                                                 | A tiebreaker only; never overrides legibility, contrast, QA or a brief fact  |

The ten strategies of the owner's course guide are mapped to it, with their evidence. Several are weak or mixed: color and emotion, fonts that are "hard to read" for memory, round against exact prices, the smile and "dopamine". They do not become rules. Gamification, contests, points, popups, exit-intent, post-purchase and loyalty, and A/B tests do not fit a static landing and are listed as out of scope with the reason.

## The Conversion plan

Six fields, each tied to the brief:

1. **Emotional target:** one of trust, calm, joy, excitement, pride, belonging or relief, with the reason. Never fear or anger.
2. **Attention path:** the hero's focal point, the one primary call to action and its label, the weaker secondary action. A gaze cue only with a licensed photo that has a face.
3. **Choice:** the offers shown (three side by side at most), the highlighted one and why, anchors only from real prices.
4. **Trust and risk:** proof from the brief's `proof`, contact data, the legal pages, and a guarantee only when the brief states one.
5. **Ending:** the last section repeats the primary call to action.
6. **Ethics check:** `.claude/skills/conversion-psychology/references/ethics.md`.

## The audit

```bash
node scripts/conversion-audit.mjs --site <slug>          # human text
node scripts/conversion-audit.mjs --site <slug> --json   # { site, brief, pages, findings: [{ id, level, page, selector, message }] }
```

It reads `sites/<slug>/dist/` and `brief.json`, starts no browser and writes nothing. A multi-locale site is audited on each locale's home page. Exit 0 with or without findings, 2 for bad usage, an unknown site or no build. Sections are the direct children of `<main>` that are a `<section>` or carry an id; the hero is the first and the closing section the last before the footer.

| Id                    | Level | Measures                                                                                                             |
| --------------------- | ----- | -------------------------------------------------------------------------------------------------------------------- |
| `hero-h1`             | warn  | the first section has an `h1`                                                                                        |
| `hero-cta`            | warn  | the first section links to `goal.primary.url` (any link when there is no brief); `utm_*` parameters are ignored       |
| `closing-cta`         | warn  | the last section links to it                                                                                         |
| `cta-destinations`    | warn  | more than 3 distinct link destinations in `<main>`, not counting in-page anchors, `mailto:`, `tel:`, legal pages or a repeated URL |
| `form-fields`         | warn  | a form with more than 5 visible fields (hidden, honeypot, checkbox and radio inputs are not counted)                  |
| `offers-side-by-side` | warn  | more than 3 siblings in one section that each hold a price (a currency symbol or code next to a number)                |
| `proof-shown`         | info  | each `proof` entry of the brief is on the page or not                                                                |
| `proof-without-brief` | warn  | a `blockquote`, a `data-testimonial` element or star-rating markup (star glyph, or an `aria-label` such as "4.8 stars") while the brief has no `proof` |
| `contact-visible`     | warn  | a non-assumed contact email, phone or address of the brief is not on the page                                        |
| `legal-linked`        | info  | the legal pages built for the page's locale and whether the page links them                                          |

Every finding is a heuristic. The build reads them with the section screenshots (`node scripts/section-shots.mjs --site <slug>`) and decides; a person can override a finding with a reason in RUN.md.

## The review round

One round, after QA passes and before the impeccable polish, like the polish itself.

- **May change:** the order of sections when the Copy plan allows it; where calls to action sit and their labels; the emphasis of copy; optional form fields the brief does not require; showing or hiding a secondary action.
- **Never changes:** tokens, fonts, palette, images, facts, prices, the archetype or the layout grammar, and any proof, guarantee, urgency or scarcity the brief does not state. A finding that needs one of these goes to RUN.md "Conversion review" under "for a person".
- QA runs again. If the review turned it red, the edit that caused it is undone.

## The `dark-patterns` rule

`check-landing` fails, on every built page except `404.html`, with the page and the field or text in the message:

| Id                    | Fails                                                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prechecked-checkbox` | an `input type="checkbox"` with `checked` inside a `<form>`                                                                                                      |
| `countdown-element`   | an element marked `data-countdown`                                                                                                                               |
| `countdown-script`    | a script the page references (inline, or a local `.js` from `<script src>` or `modulepreload`) that has `setInterval` together with two or more quoted unit labels (days, hours, minutes, seconds, and the Spanish words). Imported chunks are not followed |
| `confirmshaming`      | a link or button that declines with self-blame, in Spanish or English ("No, prefiero seguir perdiendo dinero", "No thanks, I hate saving money")                  |

Fair cases pass: an unchecked consent box, a deadline written as a date ("until 30 November"), "No, gracias" and "No thanks". The patterns are whole phrases kept narrow on purpose; a false positive is fixed by narrowing a pattern and adding the fair sentence to `tests/dark-patterns.test.mjs`, never by loosening the rule. With no build the rule only warns (`dark-patterns-no-build`). The animation and smooth-scroll bundles the starter ships do not trigger the countdown pattern.

## Out of scope

Eye tracking, heatmaps, analytics, A/B tests and session recordings; gamification, contests, popups, exit-intent, email sequences, post-purchase and loyalty; changing palette or fonts from the review (a restyle is a person's decision, `--restyle`); changing prices or adding guarantees or proof the customer did not give; rewriting existing landings.
