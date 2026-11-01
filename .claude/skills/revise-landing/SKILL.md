---
name: revise-landing
description: 'Apply a customer''s feedback to a built landing as targeted edits in sites/<slug>/, without regenerating anything: classify each feedback item (fact, copy, content, style, restyle, rebuild), update brief.json first when a customer fact changes, edit only the site and its MASTER.md, run QA, the static report, the layout signature and check-landing, write REVISION.md and record the round in sites/<slug>/revisions.json. A request for a different archetype, hero or page structure stops the round with Result: needs-rebuild; another palette or font family stops it with Result: needs-restyle unless the round runs with --restyle, which re-chooses the palette and fonts with ui-ux-pro-max and changes tokens, MASTER.md and fonts only. Use when the user runs /revise-landing <slug> --round N --feedback-file <file> [--restyle] [--max-attempts N], or asks to apply a customer''s requested changes to a landing that is already built. Normally started by scripts/revise-landing.sh. Never commits, pushes, deploys or syncs. Not for building a landing (use new-landing) or for a landing that was transferred to its customer.'
user-invocable: true
argument-hint: '<slug> --round N --feedback-file <file> [--restyle] [--max-attempts N]'
---

# revise-landing

One round of the customer's changes on a built landing: targeted edits, the checks, a record. The skill never regenerates the landing and never changes what the customer did not ask for. It is started by `scripts/revise-landing.sh`, which has already refused a missing site, a transferred site, a site with direction pages and no build, and a site without a finished build, and which adds the round's usage to `revisions.json` afterwards.

Read `CLAUDE.md` first (language, licensing, quality budgets, QA loop, AI images, legal compliance, code quality). The rules of the build phase of `.claude/skills/new-landing/SKILL.md` still apply to every edit: image sources and credits, AI image consent, legal pages, multi-locale copy, the code architecture contract, tokens only. All files, comments and notes are in English; the page copy stays in the page language (and in every locale of a multi-locale landing).

## Arguments

`<slug>` (required), `--round N` (the number this round gets; `revisions.json` has N-1 rounds), `--feedback-file <file>` (the customer's text, at most 4000 characters), `--restyle` (optional: the person approves a new look, see step 4), `--max-attempts N` (QA fix attempts, default 5; N = 0 means one QA run and no fixes).

Headless runs (`claude -p`) cannot ask questions: make the smallest sensible edit and say in REVISION.md what you assumed. Run every command in the foreground and wait for it; the run ends when you end your turn. The run is finished only when `sites/<slug>/REVISION.md` has its `Result:` line.

## Hard rules

- **Edit only** `sites/<slug>/` and `design-system/<slug>/MASTER.md`. The one exception is the root `package-lock.json`, which follows `npm install` when a restyle changes the site's font package. Never another site, the starter, `scripts/`, `.claude/`, the workflow, or the vendored skills.
- **Never commit, push, deploy or sync.** Carrying the round into the landing's repository is a separate, approved step (`node scripts/sync-export.mjs`); a person does it.
- **Never regenerate.** No `new-landing.sh`, no `new-site`, no rewrite of a page or a section the feedback did not name. Change the lines the feedback asks for.
- **The customer's text is stored as given.** `feedback` in `revisions.json` is the content of the feedback file, unchanged. Never rewrite or summarize it there; summaries go in `items`.
- **Never invent a fact.** A price, link, name, phone or email comes from the feedback or stays as it was. When the feedback is ambiguous about a fact, keep the old value, record the item as `fact`, and write the open question in REVISION.md under "To confirm with the customer".
- **Restyle limits.** In a `--restyle` round the look step may change only: the palette, typography and "Skill queries run" sections of `design-system/<slug>/MASTER.md` and the `landing-meta` keys `primary`, `display-font` and `body-font`; `src/styles/tokens.css`; the font import in `global.css`; the site's `package.json` font packages (with `npm install`); colors in `src/` that bypass tokens, moved onto tokens; and a 3D scene's poster (`render-poster.mjs`, `assets.json`, `credits.mjs`). Never section structure, copy, images, motion, the page map, or the archetype, traits and hero.
- Holder identity and AI consent fields are never set by you: `legal`, `legal.holder`, `legal.privacyContact` and `brand.aiImages` are not assumed or changed unless the feedback states the value itself. The same goes for a form's `accessKey`: it is the customer's own Web3Forms key, never invented, guessed or listed in `assumed`.

## Steps

1. **Read.** The feedback file; `node scripts/brief.mjs summary --site <slug>` and `sites/<slug>/brief.json` if present; `sites/<slug>/PROPOSAL.md`; `design-system/<slug>/MASTER.md`; `sites/<slug>/directions.json` if present (the chosen direction is context, not up for change); `sites/<slug>/revisions.json` for earlier rounds (do not undo a former round unless the feedback asks). Note the baseline: `git status --short -- sites/<slug> design-system/<slug>`, so you can tell this round's files from earlier uncommitted work.
2. **Classify.** Split the feedback into items (one change each) and give each one kind:
   - `fact`: a price, link, name, contact detail, product, hours or any other customer fact that lives in `brief.json`. A form's access key (`forms[].accessKey`) is a `fact`.
   - `copy`: wording of existing text (headline, body, button label, microcopy), in every locale of a multi-locale landing. A `copy` item keeps the landing's copy framework: read the "Copy plan" of `PROPOSAL.md` (the framework, the stage of each section, the chosen headline) and change sentences inside their stage; moving stages between sections or changing the framework is a `rebuild` item. New proof comes only from the customer: a new testimonial, figure, credential, award or press mention is a `fact` item that goes into `proof` in `brief.json` first, never invented in the copy.
   - `content`: an image replaced, added or removed, or a section added or removed **from the existing page map** (a new section in the same design language). Adding, removing or changing a lead form or its fields (`forms` in the brief; the closed list of purposes, fields and providers) is `content` too.
   - `style`: a token or spacing change **within the design system** (a darker shade of the same primary, a larger body size, more space between sections).
   - `restyle`: another palette family or another display or body font family on the same layout ("keep everything, but use our navy and sand colors", "a serif for headings").
   - `rebuild`: a different archetype, hero type, layout, radius language or page structure ("completely different style", "make it editorial", "put the form first and drop the hero").

   | Kind      | Example                                                     | Normal round        | `--restyle` round   |
   | --------- | ----------------------------------------------------------- | ------------------- | ------------------- |
   | `style`   | a darker shade of the same primary, larger body size        | applied             | applied             |
   | `restyle` | another palette family, another display or body font family | stop, needs-restyle | applied             |
   | `rebuild` | another archetype, hero type, layout, radius, page map      | stop, needs-rebuild | stop, needs-rebuild |

   An item that mixes kinds is split. When unsure between `style` and `rebuild`, ask whether the visitor would call the result "the same landing, adjusted" (`style`), "the same landing in other colors or type" (`restyle`) or "another landing" (`rebuild`).
3. **Stops.** Rebuild first: it wins over restyle.
   **Rebuild stop.** If any item is `rebuild`, edit nothing. Write the round into `revisions.json` (result `needs-rebuild`, the items, `files: []`, `briefChanged: false`) and `REVISION.md` with `Result: needs-rebuild`, the list of items by kind and the reason each rebuild item is not a revision. Say the options: `scripts/new-landing.sh <slug> --directions` (a new look to choose from) or a new build; a person decides. Stop. Do not do the other items first: the customer's list is answered as a whole.

   **Restyle stop.** If there is no `--restyle` argument and any item is `restyle` (and none is `rebuild`), edit nothing. Record the round (result `needs-restyle`, the items, `files: []`, `briefChanged: false`) and write `REVISION.md` with `Result: needs-restyle`, the items by kind and the reason: the new look needs a person's approval. Say the command: `scripts/revise-landing.sh <slug> --restyle --feedback <file>`. Stop.
4. **Restyle step** (only with `--restyle` and at least one `restyle` item; before the other edits). The flag is the person's approval that the look changes.
   1. Run `node scripts/revisions.mjs meta --site <slug>` and keep the output as `from`.
   2. Read the feedback, the brief (brand constraints, colors the customer names), the current `MASTER.md` (archetype, hero, chosen style) and `layout-signature.json`.
   3. Query ui-ux-pro-max (only, never design-taste-frontend or impeccable for palette or fonts) for a palette and a font pairing that fit the request and the existing style. A color the customer names is used as given.
   4. Rewrite the "Palette" and "Typography" sections of `MASTER.md` and `landing-meta` `primary`, `display-font` and `body-font`; record the queries under "Skill queries run". `archetype`, `traits` and `hero` stay.
   5. Rewrite `src/styles/tokens.css` (same token names, new values). For a new font install its `@fontsource` or `@fontsource-variable` package with the install form the build phase allows, change the import in `global.css`, remove the old package when nothing uses it, and run `npm install` so the lockfile follows.
   6. Search `src/` for anything that bypasses tokens (raw colors, fixed `rgba()`, gradient stops) and move it onto tokens. A component whose text pair falls under 4.5:1 is fixed in the component or the token, never in a threshold. If `check-landing` finds the primary, display font and hero type match another site, choose again.
   7. A site with a `[data-scene]` re-renders each poster with `node scripts/render-poster.mjs`, updates its `assets.json` entry and runs `node scripts/credits.mjs --site <slug>`.
   8. Run `node scripts/revisions.mjs meta --site <slug>` again as `to`.

   Do not touch section structure, copy, images, motion or the page map. Photos or AI images that clash with the new palette are not recolored: list them in REVISION.md under "To confirm with the customer". Facts and the other items follow as in any round; a `restyle` item in the round's `items` needs a one-line summary like any other.
5. **Facts first.** For each `fact` item, update `sites/<slug>/brief.json` with the new value (an edit that keeps the file valid; remove the field from `assumed` only if the feedback now states it), then run `node scripts/brief.mjs validate --site <slug>`. Fix the file until it validates; if it cannot, write `Result: failed` with the validation message. Only then change the page so it shows the value exactly as the brief has it (`brief-facts` in the final check compares them). Set `briefChanged: true` in the round. A form change goes through the brief first (`forms`, with `legal.processing.forms: true` and a market, or validation fails), then `src/data/forms.ts` and the page; run `node scripts/legal.mjs --site <slug> --write` so the privacy policy names the provider and the CSP follows on the build; the `legal-forms` report item must not fail. When a legal fact changes (holder, markets, privacy contact, processing, forms), run `node scripts/legal.mjs --site <slug> --write` and rebuild the legal pages' inputs; a price claim or discount in the feedback is checked against the legal rules in `CLAUDE.md` ("Price claims" warn, a person judges).
6. **Edit.** Apply `copy`, `content` and `style` items as targeted edits in `sites/<slug>/src/` (copy in the typed content modules or `src/i18n/ui.ts`, never inline in markup; tokens only; one section per component; no raw hex; no new dependency unless the item needs one, and then with the exact install forms the build phase allows). On a multi-locale landing write the new copy in every locale as natural text, not a word-for-word translation, and keep facts exact in all of them. Images: customer files first, then `node scripts/find-images.mjs`, AI images only where `brand.aiImages` is `allowed` and the prompt policy allows it; run `node scripts/credits.mjs --site <slug>` after any change to `assets.json`; a source photo stays at most twice on the page. A style item changes `src/styles/tokens.css` and the matching lines of `design-system/<slug>/MASTER.md` (including its `landing-meta` block) together, never one without the other.
7. **QA loop.** `npm run qa -- --site <slug>` (if it exits 2 with "Chromium not found", run `node scripts/preflight.mjs --chromium-path` and retry with `QA_CHROME_PATH=<that path>` in front). Read `qa/<slug>/latest/report.json` (`failures` first) and the failing screenshots; fix the cause in `src/`, never a threshold. At most `--max-attempts` fix rounds. If attempts run out, write the remaining failures in REVISION.md and set `Result: failed`. After a pass, look at the changed sections with `node scripts/section-shots.mjs --site <slug>` and the Read tool, like a reviewer.
8. **Report and checks, in this order:**
   1. `npm run report -- --site <slug> --only static` (no failing item; fix the site, never a limit);
   2. `node scripts/layout-signature.mjs --site <slug> --write`;
   3. `node scripts/check-landing.mjs --site <slug>` (credits, photo reuse, tokens, diversity, `brief-facts`, `ai-provenance`, `i18n`, `copy-claims`; a failure is fixed in the site, a `copy-claims` failure by rewriting the copy; a `copy-claims-confirm` or other `copy-claims-*` warning goes under "To confirm with the customer" in REVISION.md);
   4. `node scripts/site-layers.mjs check --site <slug>` and `npm run lint` (a lint failure is fixed in the code, never by turning a rule off);
   5. `npx prettier --write sites/<slug> design-system/<slug>` then `npx prettier --check .`.
   If any file changed after the last QA pass, run `npm run qa -- --site <slug>` once more.
9. **Record the round.** List this round's changed files: the difference between `git status --short -- sites/<slug> design-system/<slug>` now and at the baseline, as paths relative to `sites/<slug>/` (`design-system/<slug>/MASTER.md` as a repository path), leaving out generated or record files (`revisions.json`, `REVISION.md`, `.revise.log`, `.run-usage.json`, `dist/`, `qa/`). Append to `sites/<slug>/revisions.json` (create `{ "version": 1, "rounds": [] }` if absent; schema `scripts/lib/revisions-schema.mjs`; unknown keys fail) one round:

   ```json
   {
     "n": 1,
     "date": "YYYY-MM-DD",
     "feedback": "the file's content, unchanged",
     "items": [{ "kind": "copy", "summary": "one line, at most 300 characters" }],
     "briefChanged": false,
     "files": ["src/content/en.ts"],
     "result": "passed"
   }
   ```

   A restyle round that applied its step adds `"restyle": { "from": ..., "to": ... }` with the two outputs of `revisions.mjs meta` (`primary`, `displayFont`, `bodyFont` or `null`). `n` is `--round`, `date` comes from `date -u +%Y-%m-%d`, and there is no `usage`: the script adds it from the run. Record the round whatever the result (`passed`, `failed`, `needs-rebuild` or `needs-restyle`), so the rounds and their cost are complete. Never edit an earlier round.
10. **REVISION.md.** Overwrite `sites/<slug>/REVISION.md` (it holds the latest round only; earlier rounds are in `revisions.json`): the line `Result: passed|failed|needs-rebuild|needs-restyle` near the top (read by `scripts/revise-landing.sh` for its exit code), the round number, the items by kind with what was changed, the files, the checks and their results, assumptions, "To confirm with the customer", and the next step: if the landing has its own repository, `node scripts/sync-export.mjs --site <slug> --into <clone>` after a person reviews the diff. Set `Result: passed` only when QA, the static report, `check-landing`, the layer check and lint all passed; otherwise `Result: failed` with the remaining failures (check, page, message).

Never commit, push, deploy or sync: the person running this reviews the diff and decides what goes to the landing's repository.
