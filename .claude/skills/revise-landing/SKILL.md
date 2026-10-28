---
name: revise-landing
description: 'Apply a customer''s feedback to a built landing as targeted edits in sites/<slug>/, without regenerating anything: classify each feedback item (fact, copy, content, style, rebuild), update brief.json first when a customer fact changes, edit only the site and its MASTER.md, run QA, the static report, the layout signature and check-landing, write REVISION.md and record the round in sites/<slug>/revisions.json. A request for a different look, archetype, palette family or page structure stops the round with Result: needs-rebuild. Use when the user runs /revise-landing <slug> --round N --feedback-file <file> [--max-attempts N], or asks to apply a customer''s requested changes to a landing that is already built. Normally started by scripts/revise-landing.sh. Never commits, pushes, deploys or syncs. Not for building a landing (use new-landing) or for a landing that was transferred to its customer.'
user-invocable: true
argument-hint: '<slug> --round N --feedback-file <file> [--max-attempts N]'
---

# revise-landing

One round of the customer's changes on a built landing: targeted edits, the checks, a record. The skill never regenerates the landing and never changes what the customer did not ask for. It is started by `scripts/revise-landing.sh`, which has already refused a missing site, a transferred site, a site with direction pages and no build, and a site without a finished build, and which adds the round's usage to `revisions.json` afterwards.

Read `CLAUDE.md` first (language, licensing, quality budgets, QA loop, AI images, legal compliance, code quality). The rules of the build phase of `.claude/skills/new-landing/SKILL.md` still apply to every edit: image sources and credits, AI image consent, legal pages, multi-locale copy, the code architecture contract, tokens only. All files, comments and notes are in English; the page copy stays in the page language (and in every locale of a multi-locale landing).

## Arguments

`<slug>` (required), `--round N` (the number this round gets; `revisions.json` has N-1 rounds), `--feedback-file <file>` (the customer's text, at most 4000 characters), `--max-attempts N` (QA fix attempts, default 5; N = 0 means one QA run and no fixes).

Headless runs (`claude -p`) cannot ask questions: make the smallest sensible edit and say in REVISION.md what you assumed. Run every command in the foreground and wait for it; the run ends when you end your turn. The run is finished only when `sites/<slug>/REVISION.md` has its `Result:` line.

## Hard rules

- **Edit only** `sites/<slug>/` and `design-system/<slug>/MASTER.md`. Never another site, the starter, `scripts/`, `.claude/`, the workflow, or the vendored skills.
- **Never commit, push, deploy or sync.** Carrying the round into the landing's repository is a separate, approved step (`node scripts/sync-export.mjs`); a person does it.
- **Never regenerate.** No `new-landing.sh`, no `new-site`, no rewrite of a page or a section the feedback did not name. Change the lines the feedback asks for.
- **The customer's text is stored as given.** `feedback` in `revisions.json` is the content of the feedback file, unchanged. Never rewrite or summarize it there; summaries go in `items`.
- **Never invent a fact.** A price, link, name, phone or email comes from the feedback or stays as it was. When the feedback is ambiguous about a fact, keep the old value, record the item as `fact`, and write the open question in REVISION.md under "To confirm with the customer".
- Holder identity and AI consent fields are never set by you: `legal`, `legal.holder`, `legal.privacyContact` and `brand.aiImages` are not assumed or changed unless the feedback states the value itself.

## Steps

1. **Read.** The feedback file; `node scripts/brief.mjs summary --site <slug>` and `sites/<slug>/brief.json` if present; `sites/<slug>/PROPOSAL.md`; `design-system/<slug>/MASTER.md`; `sites/<slug>/directions.json` if present (the chosen direction is context, not up for change); `sites/<slug>/revisions.json` for earlier rounds (do not undo a former round unless the feedback asks). Note the baseline: `git status --short -- sites/<slug> design-system/<slug>`, so you can tell this round's files from earlier uncommitted work.
2. **Classify.** Split the feedback into items (one change each) and give each one kind:
   - `fact`: a price, link, name, contact detail, product, hours or any other customer fact that lives in `brief.json`.
   - `copy`: wording of existing text (headline, body, button label, microcopy), in every locale of a multi-locale landing.
   - `content`: an image replaced, added or removed, or a section added or removed **from the existing page map** (a new section in the same design language).
   - `style`: a token or spacing change **within the design system** (a darker shade of the same primary, a larger body size, more space between sections).
   - `rebuild`: a different look, archetype, palette family, display font family or page structure ("completely different style", "make it editorial", "a dark theme", "put the form first and drop the hero").
   An item that mixes kinds is split. When unsure between `style` and `rebuild`, ask whether the visitor would call the result "the same landing, adjusted" (`style`) or "another landing" (`rebuild`).
3. **Rebuild stop.** If any item is `rebuild`, edit nothing. Write the round into `revisions.json` (result `needs-rebuild`, the items, `files: []`, `briefChanged: false`) and `REVISION.md` with `Result: needs-rebuild`, the list of items by kind and the reason each rebuild item is not a revision. Say the options: `scripts/new-landing.sh <slug> --directions` (a new look to choose from) or a new build; a person decides. Stop. Do not do the other items first: the customer's list is answered as a whole.
4. **Facts first.** For each `fact` item, update `sites/<slug>/brief.json` with the new value (an edit that keeps the file valid; remove the field from `assumed` only if the feedback now states it), then run `node scripts/brief.mjs validate --site <slug>`. Fix the file until it validates; if it cannot, write `Result: failed` with the validation message. Only then change the page so it shows the value exactly as the brief has it (`brief-facts` in the final check compares them). Set `briefChanged: true` in the round. When a legal fact changes (holder, markets, privacy contact, processing), run `node scripts/legal.mjs --site <slug> --write` and rebuild the legal pages' inputs; a price claim or discount in the feedback is checked against the legal rules in `CLAUDE.md` ("Price claims" warn, a person judges).
5. **Edit.** Apply `copy`, `content` and `style` items as targeted edits in `sites/<slug>/src/` (copy in the typed content modules or `src/i18n/ui.ts`, never inline in markup; tokens only; one section per component; no raw hex; no new dependency unless the item needs one, and then with the exact install forms the build phase allows). On a multi-locale landing write the new copy in every locale as natural text, not a word-for-word translation, and keep facts exact in all of them. Images: customer files first, then `node scripts/find-images.mjs`, AI images only where `brand.aiImages` is `allowed` and the prompt policy allows it; run `node scripts/credits.mjs --site <slug>` after any change to `assets.json`; a source photo stays at most twice on the page. A style item changes `src/styles/tokens.css` and the matching lines of `design-system/<slug>/MASTER.md` (including its `landing-meta` block) together, never one without the other.
6. **QA loop.** `npm run qa -- --site <slug>` (if it exits 2 with "Chromium not found", run `node scripts/preflight.mjs --chromium-path` and retry with `QA_CHROME_PATH=<that path>` in front). Read `qa/<slug>/latest/report.json` (`failures` first) and the failing screenshots; fix the cause in `src/`, never a threshold. At most `--max-attempts` fix rounds. If attempts run out, write the remaining failures in REVISION.md and set `Result: failed`. After a pass, look at the changed sections with `node scripts/section-shots.mjs --site <slug>` and the Read tool, like a reviewer.
7. **Report and checks, in this order:**
   1. `npm run report -- --site <slug> --only static` (no failing item; fix the site, never a limit);
   2. `node scripts/layout-signature.mjs --site <slug> --write`;
   3. `node scripts/check-landing.mjs --site <slug>` (credits, photo reuse, tokens, diversity, `brief-facts`, `ai-provenance`, `i18n`; a failure is fixed in the site);
   4. `node scripts/site-layers.mjs check --site <slug>` and `npm run lint` (a lint failure is fixed in the code, never by turning a rule off);
   5. `npx prettier --write sites/<slug> design-system/<slug>` then `npx prettier --check .`.
   If any file changed after the last QA pass, run `npm run qa -- --site <slug>` once more.
8. **Record the round.** List this round's changed files: the difference between `git status --short -- sites/<slug> design-system/<slug>` now and at the baseline, as paths relative to `sites/<slug>/` (`design-system/<slug>/MASTER.md` as a repository path), leaving out generated or record files (`revisions.json`, `REVISION.md`, `.revise.log`, `.run-usage.json`, `dist/`, `qa/`). Append to `sites/<slug>/revisions.json` (create `{ "version": 1, "rounds": [] }` if absent; schema `scripts/lib/revisions-schema.mjs`; unknown keys fail) one round:

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

   `n` is `--round`, `date` comes from `date -u +%Y-%m-%d`, and there is no `usage`: the script adds it from the run. Record the round whatever the result (`passed`, `failed` or `needs-rebuild`), so the rounds and their cost are complete. Never edit an earlier round.
9. **REVISION.md.** Overwrite `sites/<slug>/REVISION.md` (it holds the latest round only; earlier rounds are in `revisions.json`): the line `Result: passed|failed|needs-rebuild` near the top (read by `scripts/revise-landing.sh` for its exit code), the round number, the items by kind with what was changed, the files, the checks and their results, assumptions, "To confirm with the customer", and the next step: if the landing has its own repository, `node scripts/sync-export.mjs --site <slug> --into <clone>` after a person reviews the diff. Set `Result: passed` only when QA, the static report, `check-landing`, the layer check and lint all passed; otherwise `Result: failed` with the remaining failures (check, page, message).

Never commit, push, deploy or sync: the person running this reviews the diff and decides what goes to the landing's repository.
