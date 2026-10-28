# Revising a landing, syncing it and transferring it

Owner decision (2026-10-27): until there are paying customers the factory works in the **managed, with transfer** model.

1. The owner shows a preview (`--directions`, see `docs/preview.md`), or skips it and builds directly.
2. The owner builds the landing in the factory (`scripts/new-landing.sh`).
3. The owner creates a private or public repository in his own account and exports the landing to it (`/landing-handoff`, `docs/handoff.md`). It is hosted on his own Vercel or Cloudflare account.
4. The customer asks for changes. Each round is a revision in the factory, carried into the repository by a sync and reviewed in a pull request there.
5. If the customer wants the project, the repository and the responsibility are **transferred**. From then on the factory does nothing more with it.

While a landing is managed, **the factory is the source of truth**. Every change goes through `sites/<slug>/` and then a sync. A change made directly in the managed repository is overwritten by the next sync (the pull request diff shows it).

## A revision round

```bash
scripts/revise-landing.sh <slug> --feedback <file> [--model M] [--max-attempts N]
# or: npm run revise -- <slug> --feedback <file>
```

The feedback file holds the customer's words as given (not empty, at most 4000 characters). The script starts `claude -p "/revise-landing <slug> --round N --feedback-file <file>"` (skill: `.claude/skills/revise-landing/SKILL.md`) and logs to `sites/<slug>/.revise.log` (git-ignored).

The skill classifies every feedback item and then edits only `sites/<slug>/` and `design-system/<slug>/MASTER.md`:

| Kind      | What it is                                                              | What happens                                               |
| --------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| `fact`    | A price, link, name, contact or product                                 | `brief.json` is updated and validated first, then the page |
| `copy`    | Wording of existing text, in every locale                               | Targeted edit in the content modules                       |
| `content` | An image, or a section added or removed from the existing page map      | Targeted edit, image sources and credits as in the build   |
| `style`   | A token or spacing change inside the design system                      | `tokens.css` and `MASTER.md` change together               |
| `rebuild` | A different look, archetype, palette family or page structure           | The round stops: nothing is edited                         |

Then it runs, in order: QA (`npm run qa -- --site <slug>`, up to `--max-attempts` fix rounds), the static report, `layout-signature --write`, `check-landing`, the layer check and lint. It never commits, pushes, deploys or syncs.

### The record

- `sites/<slug>/revisions.json` (schema `scripts/lib/revisions-schema.mjs`, unknown keys fail) has one entry per round: number, date, the feedback as given, the items with their kind, whether the brief changed, the files, the result (`passed`, `failed`, `needs-rebuild`) and the usage. The skill writes the round; the script adds the usage from `.run-usage.json` (`null` when not reported). This is where the rounds per landing and the cost per round are read.
- `sites/<slug>/REVISION.md` is overwritten each round with the latest round's notes. Its `Result:` line decides the exit code: `passed` and `needs-rebuild` exit 0, `failed` exits 1.

### Needs rebuild

A round that asks for a different look or structure ("completely different style, darker and more editorial") ends with `Result: needs-rebuild`. Nothing but `revisions.json` and `REVISION.md` changes. A person decides: `scripts/new-landing.sh <slug> --directions` to show new looks and let the customer choose, or a new build. The factory never rebuilds silently.

### Refusals

`revise-landing.sh` exits 1, names the reason and does not start `claude` for: a missing site, a site transferred to its customer, a site with direction pages and no build, and a site without a finished build (`RUN.md` without `Result: passed`). An empty, too long or missing feedback file exits 2.

## Sync to the landing's repository

```bash
node scripts/sync-export.mjs --site <slug> --into <clone> [--brief | --no-brief] [--no-lockfile] [--dry-run]
```

`<clone>` is a clone of the repository in `sites/<slug>/EXPORTED.json`, at its root, with no uncommitted changes. The command exports the site into a scratch folder (the export's own checks run) and mirrors the result into the clone: files are added, changed and deleted, and the list and the count are printed. It never commits or pushes.

Kept as they are in the clone: `.git` and git-ignored paths; `package-lock.json` unless `package.json` changed (then it is regenerated with `npm install --package-lock-only`, or skipped with `--no-lockfile` when offline); `README.md` when only its export line (date and factory commit) differs.

It refuses (exit 1, nothing written): a site without `EXPORTED.json`, a transferred site, a clone whose `origin` is not the recorded repository (compared after normalizing `https`, `ssh` and `.git`, ignoring credentials), a path that is not a work tree root, and a clone with uncommitted changes. Whether `brief.json` travels comes from the record (`noBrief`, written by `npm run export -- --record`). A record from before that field (`personal-brand`) needs `--brief` or `--no-brief` (exit 2 otherwise).

Then, in the clone: `npm ci && npm run lint && npm run build`, push a branch such as `revise/<n>` and open a pull request. That repository's CI gives the customer's preview URL. Merging it deploys to production.

## Transfer

```bash
node scripts/handoff.mjs transfer-plan --site <slug> --to <github-owner>   # read-only checklist
node scripts/transfer.mjs record --site <slug> --to <github-owner> [--repository <https-url>]
```

`transfer-plan` prints the steps, all done by the owner or the customer:

1. Transfer the repository (GitHub > Settings > General > Danger Zone > Transfer ownership). The Claude GitHub App cannot do it.
2. Record it in the factory once GitHub shows the new owner.
3. The customer creates their host project for the site's target and adds their own secrets, by name.
4. The customer starts the first run by hand.
5. The domain moves to the customer's host.
6. The owner removes his host project, secrets and DNS records, and the repository from the Claude app access.

`record` writes `transferredTo`, `transferredAt` and the new repository URL (default `https://github.com/<owner>/<name>`) into `EXPORTED.json`. It refuses a site without the record and one already transferred. After it, `revise-landing.sh`, `sync-export.mjs` and the MCP revision job refuse the site. The folder stays in the factory as a record; `check-landing` still compares new landings with its layout signature. Revisions inside a transferred repository are out of scope.

## Agent interface

The `revise_landing` job (`slug`, `feedback`, `model?`, `maxAttempts?`) writes the feedback to `.cache/jobs/<id>/feedback.txt` and runs `revise-landing.sh <slug> --feedback <that file>`. It refuses a transferred site and is not allowed without a person's approval. `get_landing` shows the rounds (count, last result and cost), the repository the landing was exported to and the transfer state. Sync and transfer are not in the interface: it never publishes. See `docs/agent-interface.md`.
