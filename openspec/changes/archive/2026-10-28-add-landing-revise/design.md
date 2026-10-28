# Design: add-landing-revise

## Context

- **Delivery model** (owner decision, 2026-10-27): managed, with a transfer at the end.
  - The owner builds in the factory, exports to a repository in his own account and hosts the landing on his own Vercel or Cloudflare account.
  - When the customer wants the project, the repository and the responsibility are transferred.
- **What exists today:**
  - `new-landing.sh` (with optional `--directions`) builds a landing.
  - `npm run export` writes a standalone repository; `--record` writes `EXPORTED.json`. `changed-sites.mjs` then skips the site, so the factory's CI stops building it.
  - The exported repository's CI runs QA, the report and the deploy, with a preview URL on every pull request.
  - `/landing-handoff` documents how to refresh an exported repository's workflow and scripts from a fresh export, but nothing carries a site change into it.
  - `claude -p` usage is recorded through `scripts/lib/claude-stream.mjs` into `.run-usage.json`.
- **Facts from the first sync done by hand** (`personal-brand`, 2026-10-27):
  - a fresh export changes the lockfile (transitive versions) and the README's export line even when nothing real changed;
  - `brief.json` must stay out of a public repository.

## Goals / Non-Goals

**Goals:**

- One command per round of customer changes, with checks and a record of rounds and cost.
- One command that brings a revised landing into its managed repository as a reviewable change.
- A transfer checklist and a record that makes the factory leave a transferred landing alone.

**Non-Goals:**

- Revising inside a transferred repository.
- A factory organization or GitHub App.
- Automatic sync.
- Billing.
- Merging changes made directly in the repository back into the factory.

## Decisions

1. **The factory is the source of truth while a landing is managed.** Every change goes through `sites/<slug>/` and then sync. Changes made directly in the managed repository are overwritten by the next sync; `docs/revise.md` says so, and sync lists every file it changes so the pull request diff shows it.

2. **`scripts/revise-landing.sh <slug> --feedback <file> [--model M] [--max-attempts N]`.**
   - **It refuses (exit 1) when:**
     - the site is missing;
     - the site is transferred;
     - the site has direction pages and no build (`src/pages/directions/` exists);
     - the site has no finished build (`RUN.md` without `Result: passed`).
   - **It exits 2** when the feedback file is empty, longer than 4000 characters, or not a file.
   - **How it runs:** it starts `claude -p "/revise-landing <slug> --round N --feedback-file <path>"` through `claude-stream.mjs` and appends to `sites/<slug>/.revise.log` (git-ignored like `.run.log`).
   - **Outcome:** the `Result:` line the skill writes in `sites/<slug>/REVISION.md`, which is overwritten each round with the latest round's notes. It is `passed`, `failed` or `needs-rebuild`, and the script exits non-zero on `failed`.
   - **Round record:** `revisions.json` gets the round with its usage.

3. **The skill `.claude/skills/revise-landing/SKILL.md`.**
   - **Read first:** the brief, `PROPOSAL.md`, `design-system/<slug>/MASTER.md` and `directions.json` if present.
   - **Classify each feedback item** as one of:
     - **fact:** a price, link, name, contact or product. Update `brief.json` first with the validated brief tool, never inventing values.
     - **copy:** wording.
     - **content:** an image, or adding or removing a section from the existing page map.
     - **style:** a token or spacing within the design system.
     - **rebuild:** a different look, archetype, palette family or page structure.

     Any rebuild item stops the round before editing, with `Result: needs-rebuild` and the reason. The fix is `--directions` or a new build, decided by a person.
   - **Edits:** only `sites/<slug>/` and `design-system/<slug>/MASTER.md`. The same rules as the build apply:
     - image sources and credits;
     - AI image consent;
     - legal pages (`legal.mjs --write` when legal facts change);
     - multi-locale copy written in every locale;
     - tokens only;
     - the architecture contract.
   - **Checks:** QA loop (`npm run qa -- --site <slug>`, up to `--max-attempts`), `npm run report -- --site <slug> --only static`, `layout-signature --write`, `check-landing --site <slug>`, then `site-layers check` and `npm run lint`.
   - **Never:** commit, push, deploy or sync.

4. **`sites/<slug>/revisions.json`** (schema `scripts/lib/revisions-schema.mjs`, unknown keys fail):

   ```json
   {
     "version": 1,
     "rounds": [
       {
         "n": 1,
         "date": "YYYY-MM-DD",
         "feedback": "as given",
         "items": [{ "kind": "copy", "summary": "..." }],
         "briefChanged": false,
         "files": ["src/..."],
         "result": "passed",
         "usage": { "costUsd": 0.42 }
       }
     ]
   }
   ```

   The skill writes the round without `usage`, and `revise-landing.sh` adds `usage` from `.run-usage.json` (`null` when not reported). The feedback is stored as the customer gave it; it is the customer's text, never rewritten.

5. **`scripts/sync-export.mjs --site <slug> --into <clone> [--brief|--no-brief] [--dry-run]`.**
   - **It refuses (exit 1) when:**
     - there is no `EXPORTED.json`;
     - the site is transferred;
     - `<clone>` is not a git work tree;
     - the clone's `remote.origin.url` is not the recorded repository (compared after normalizing `https`, `ssh` and a trailing `.git`, ignoring credentials);
     - the clone has uncommitted changes.
   - **Brief:** taken from `EXPORTED.json` `noBrief`. A record without the field (`personal-brand`) needs `--brief` or `--no-brief` (exit 2 otherwise). `npm run export` now writes `noBrief` into the record.
   - **Steps:** export into a fresh scratch folder (the export's own checks run), then mirror it into the clone: add, change and delete, except for these paths:
     - `.git` and git-ignored paths are never touched;
     - `package-lock.json` is kept unless `package.json` changed, and then regenerated with `npm install --package-lock-only` in the clone;
     - `README.md` is kept when the only difference is the export line.
   - **Output:** the files added, changed and deleted. `--dry-run` only prints. It never commits or pushes.
   - **After it:** the skill (or a person) runs `npm ci && npm run lint && npm run build` in the clone, pushes a branch `revise/<n>` and opens a pull request. The repository's CI gives the customer's preview URL.

6. **Transfer.**
   - `handoff.mjs transfer-plan --site <slug> --to <github-owner>` is read-only and prints numbered steps:
     1. GitHub > Settings > Transfer ownership to `<github-owner>`; the Claude GitHub App cannot do it.
     2. The customer creates their own host project for the site's target and adds the target's secrets by name.
     3. The customer starts the first run by hand.
     4. The domain moves to the customer's host, following the plan's DNS rules.
     5. The owner removes his host project, secrets and DNS records, and removes the repository from the Claude app access if it is still listed.
   - `scripts/transfer.mjs record --site <slug> --to <github-owner> [--repository <https-url>]` writes `transferredTo`, `transferredAt` and the new repository URL (default `https://github.com/<github-owner>/<repo name>`) into `EXPORTED.json`. It refuses a site without the record or already transferred.
   - The check `isTransferred(record)` lives in one module and is used by `revise-landing.sh`, `sync-export.mjs` and the MCP tool.

7. **Agent interface.**
   - `revise_landing` takes `{ slug, feedback, model? }`. The feedback is written by the server to `.cache/jobs/<id>/feedback.txt` and passed as `--feedback <path>`.
   - It is a fixed command entry, with no shell; the existing safety assertion covers it.
   - It is not in the allow list.
   - `get_landing` adds `revisions` (count, last result), `exported` (repository) and `transferred` (to, date).

## Risks / Trade-offs

- **Direct edits in a managed repository are lost on sync.** The rule is documented, and every sync is a pull request whose diff shows the loss.
- **Feedback classification is a judgement.** A wrong "style" call can drift a design. The skill lists the items and their kinds in `REVISION.md`, and the person reviews the pull request.
- **The lockfile is regenerated only when `package.json` changed.** The managed repository keeps its own pinned transitive versions, which avoids noise in the pull request.
- **Once transferred, the factory folder stays as a record.** `check-landing` still compares new landings with it.
