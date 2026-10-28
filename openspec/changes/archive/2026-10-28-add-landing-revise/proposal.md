# Proposal: add-landing-revise

## Why

Owner decision (2026-10-27): until there are paying customers, the factory works in the **managed, with transfer** model:

1. The owner shows a preview (`--directions`), or skips it and builds directly.
2. The owner builds the landing in the factory.
3. The owner creates a private or public repository in his own account and exports the landing to it (`/landing-handoff`). It is hosted on his own Vercel or Cloudflare account.
4. If the customer wants the project, the repository and the responsibility are **transferred** to them. From then on the factory does nothing more with it.

Two pieces are missing from that model:

- **Changes requested by the customer.** Today each round of changes is a manual edit in a session, with no fixed flow and no record of rounds or cost. The rounds per landing are one of the measures the product plan asks for (`docs/product-plan.md`, step 12). Once a landing is exported, the factory's CI skips it, and nothing carries a factory change into the landing's repository.
- **The transfer.** There is no checklist and no record. Without a record, nothing stops the factory from editing or pushing to a landing that is no longer ours.

## What Changes

- **Revision run.**
  - `scripts/revise-landing.sh <slug> --feedback <file> [--model M]` runs `claude -p "/revise-landing <slug> ..."`. The new skill is `.claude/skills/revise-landing/SKILL.md`.
  - It applies the customer's feedback as targeted edits to `sites/<slug>/`, without regenerating anything.
  - It updates `brief.json` first when the feedback changes a customer fact (a price, a link, a name).
  - Then it runs QA, the static report, `layout-signature --write` and `check-landing`.
  - It records the round in `sites/<slug>/revisions.json`: number, date, the feedback as given, files changed, result and usage.
  - A round that asks for a different look or structure stops with `Result: needs-rebuild`. It does not rebuild silently, and it points to `--directions` or a new build.
- **Sync to the landing's repository** (exported, not transferred).
  - `node scripts/sync-export.mjs --site <slug> --into <clone>` re-exports into a scratch folder and copies the result into a clone of the repository. It keeps `.git`. It prints the changed files and their count.
  - It refuses when:
    - the site is not exported;
    - the site is transferred;
    - the clone's `origin` is not the repository in `EXPORTED.json`;
    - the clone has uncommitted changes.
  - It never commits or pushes. The skill (or a person) pushes a branch and opens a pull request there, and that repository's CI gives the preview URL for the customer.
  - The same flags as the original export apply. They are recorded in `EXPORTED.json` (`noBrief`).
- **Transfer.**
  - `node scripts/handoff.mjs transfer-plan --site <slug> --to <github-owner>` prints the checklist, all steps done by the owner:
    - transfer the repository (Settings > Transfer ownership; the Claude GitHub App cannot);
    - the customer creates their host project and adds their own secrets;
    - move the domain;
    - remove the owner's project, secrets and DNS records afterwards.
  - `node scripts/transfer.mjs record --site <slug> --to <github-owner>` writes `transferredTo` and `transferredAt` into `EXPORTED.json`.
  - After that, `revise-landing.sh`, `sync-export.mjs` and the MCP revision job refuse the site.
- **Agent interface:**
  - a `revise_landing` job in the fixed command table, taking the feedback as one text argument and not allowed without approval;
  - `get_landing` shows the rounds, the export and the transfer state.

  Sync and transfer are not in the MCP interface: it never publishes.
- **Docs:**
  - `docs/revise.md` (rounds, needs-rebuild, sync, transfer);
  - `docs/handoff.md`: the delivery models table now marks "managed, with transfer" as the current model, done in the owner's account;
  - `docs/product-plan.md`: the decision;
  - `CLAUDE.md` and `docs/status.md`.

## Capabilities

### New Capabilities

- `landing-revision`: rounds of customer changes on a built landing, recorded, checked, and refused after a transfer.

### Modified Capabilities

- `landing-handoff`: sync of a managed landing's repository, and the transfer checklist and record.
- `agent-interface`: the `revise_landing` job and the revision state in `get_landing`.

## Impact

- **New:**
  - `scripts/revise-landing.sh`;
  - `scripts/sync-export.mjs`, `scripts/transfer.mjs`;
  - `scripts/lib/revisions-schema.mjs`;
  - `.claude/skills/revise-landing/SKILL.md`;
  - `tests/revise-landing.test.mjs`, `tests/sync-export.test.mjs`, `tests/transfer.test.mjs`;
  - `docs/revise.md`.
- **Changed:**
  - `scripts/handoff.mjs` (`transfer-plan`, read-only like the rest of it) and `tests/handoff.test.mjs`;
  - `scripts/export.mjs` (records `noBrief`);
  - `scripts/mcp/{commands,tools,landings}.mjs` and their tests;
  - `.claude/settings.json`: no new allowed command: `revise-landing.sh`, `sync-export.mjs` and `transfer.mjs record` write, so a person approves each run; `handoff.mjs` stays read-only and allowed;
  - `package.json` (`revise` script);
  - `CLAUDE.md`, `docs/handoff.md`, `docs/product-plan.md`, `docs/status.md`.
- **Existing sites:** unchanged. `personal-brand` is the owner's own landing, so it is never transferred, and it can now get rounds and syncs.
- **Out of scope:**
  - a factory GitHub organization or a GitHub App that creates or transfers repositories;
  - revisions inside a transferred repository;
  - automatic sync on every factory change;
  - billing.
