# Proposal: add-neuromarketing-review

## Why

`add-copy-frameworks` gave every landing a persuasion order (the Copy plan) and a check on wording that must never ship. What the factory still lacks is the other half of conversion. Nothing plans:

- where the eye goes first;
- how many decisions the visitor has to make;
- how trust and risk are handled;
- what the visitor remembers at the end.

Nothing reviews the built page against those questions either. The landings are made to convert, and today conversion is left to the art direction.

The owner shared (2026-11-01) a neuromarketing course guide with ten strategies and a mind map of conversion psychology. The ten strategies are:

1. irresistible headlines;
2. emotional responses;
3. guiding attention with gaze;
4. reward ("dopamine");
5. color and emotion;
6. fewer choices;
7. pricing;
8. fonts;
9. trust;
10. the smile.

The mind map covers attention, cognitive fluency, emotion, trust, reciprocity, risk reversal, decision architecture, price perception, storytelling, memory, landing page psychology, ecommerce, post-purchase, experimentation and ethics.

The owner decided (2026-11-01):

- the frameworks come first, which is done;
- this change brings a neuromarketing skill that is "very solid", so landings convert better;
- `cro` and `marketing-psychology` are vendored from `marketingskills`.

Some of the guide's claims are weak or contested evidence: color meanings, round against exact prices, hard-to-read fonts helping memory, a smile raising spend. Some do not fit a static landing: contests, points, gamification. Some collide with factory rules:

- palette and fonts belong to ui-ux-pro-max only;
- no people in AI images;
- the customer's prices are facts.

The skill has to sort them, not apply them blindly.

## What Changes

- **Our own skill `conversion-psychology`** (`.claude/skills/conversion-psychology/`, written here in our own words, not vendored). It holds a catalog of principles in ten areas: attention, fluency, emotion, trust, risk, choice, price, memory, reciprocity and ethics. Each principle has:
  - what it means for a landing;
  - how it is applied;
  - its evidence level (`strong`, `mixed` or `weak`);
  - the factory constraint it must respect;
  - what it must never become (the dark-pattern version).

  The ten strategies of the guide and the branches of the mind map are mapped onto it. Principles that do not fit a static landing (gamification, contests, post-purchase loyalty, A/B testing) are listed as out of scope with the reason.
- **A Conversion plan in the proposal.** The `/new-landing` synthesis writes a "Conversion plan" in `PROPOSAL.md`, after the Copy plan:
  - **Emotional target:** one primary emotion, from the brief and the niche. It is an input to ui-ux-pro-max, which still picks palette and fonts alone, and MASTER.md records it.
  - **Attention path:** what the eye lands on in the hero, one primary call to action, and a gaze cue only when a licensed photo with a face exists.
  - **Choice architecture:** how many offers, which one is highlighted and why, and anchors only from real prices.
  - **Trust and risk:** real proof, real contact data, the legal pages, and only the guarantees the customer states.
  - **The ending:** the last section repeats the primary call to action.
  - **Ethics:** a checklist.
- **A conversion review of the built page.** After QA passes and before the impeccable polish, a person or the skill runs `node scripts/conversion-audit.mjs --site <slug> [--json]`. It reads `dist/` and the brief only, starts no browser and changes nothing. It reports measurable heuristics as findings:
  - the hero has an `h1` and a link to the primary call-to-action URL;
  - the call to action is repeated in the last section before the footer;
  - the number of distinct call-to-action destinations in `<main>`;
  - the fields per form;
  - the offers shown side by side;
  - proof shown against the brief's `proof`;
  - contact data visible;
  - legal pages linked.

  The skill reads the audit and the section screenshots (`section-shots.mjs`) with the vendored `cro` framework, applies the fixes that stay within the build's rules in one round (order, call-to-action placement, copy emphasis, form fields), and writes a "Conversion review" in RUN.md: findings, what changed, and what is left for a person.
- **Final check: rule `dark-patterns`** in `check-landing`, run on every site. It fails on:
  - **a pre-checked checkbox** in a form;
  - **a countdown timer**, meaning an element marked `data-countdown` or a script-driven ticking timer. A real deadline is written as a date.
  - **confirmshaming**, in Spanish and English, on a decline link or button: "No, prefiero seguir perdiendo dinero", "No thanks, I hate saving".

  Patterns live in `scripts/lib/dark-patterns.mjs`.
- **Revision.** A `revise-landing` round with `copy` or `content` items runs the audit afterwards and notes new findings in REVISION.md; it does not fix unrelated findings.
- **Vendored `cro` and `marketing-psychology`** from `marketingskills`, at the pinned commit, each with one role:
  - `cro`: the review framework for a built page;
  - `marketing-psychology`: a reference of principles while writing the Conversion plan.

  Neither decides palette, fonts, the framework or facts.
- **Docs.** A new guide, `docs/conversion.md`. CLAUDE.md gets a "Conversion" section, the command row and the vendored skills rows.

## Out of scope

- Eye tracking, heatmaps, analytics, A/B tests, session recordings: anything that needs traffic or a tracker. The measurement the owner plans for tupathdigital is Cloudflare Web Analytics, outside the factory.
- Gamification, contests, points, popups, exit-intent, email sequences, post-purchase and loyalty.
- Changing palette or fonts from the review. A restyle remains a person's decision (`--restyle`).
- Changing prices, adding guarantees or proof the customer did not give.
- Rewriting existing landings. tupathdigital gets its review through a revision round once analytics give a baseline.

## Impact

- New:
  - `.claude/skills/conversion-psychology/` (SKILL.md and `references/principles.md`, `references/ethics.md`);
  - `scripts/conversion-audit.mjs`, `scripts/lib/conversion-audit.mjs`, `scripts/lib/dark-patterns.mjs`;
  - `docs/conversion.md`;
  - `.claude/skills/cro/` and `.claude/skills/marketing-psychology/` (vendored, MIT).
- Changed:
  - `scripts/check-landing.mjs` (`dark-patterns`);
  - the `new-landing` and `revise-landing` skills;
  - `design-system/_template.md` (an "Emotional target" line);
  - `scripts/new-site.mjs` (a "Conversion plan" heading in the PROPOSAL template);
  - `agent-tooling.lock.json`, `.claude/settings.json` (allow the read-only audit);
  - CLAUDE.md, `docs/status.md`.
- Tests:
  - `tests/conversion-audit.test.mjs` (each heuristic on fixture `dist/` folders, the JSON shape, exit codes);
  - `tests/dark-patterns.test.mjs` (each fail in `es` and `en`, fair cases that must pass: an unchecked consent box, a date written as text, a polite decline);
  - the skill and lock tests for the new vendored skills.
- No change to sites, QA thresholds, CI or deploys.
