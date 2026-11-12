# Proposal: add-git-cms

## Why

A landing changes rarely, but when it does the change is small and routine: a new job and an edited skill on the owner's personal page, or a product added and a discount removed on tupathdigital. Today that content sits in TypeScript modules (`src/content/en.ts`, `src/data/catalog.ts`), so each edit means editing code, then a factory branch, a sync into the exported repository and a pull request. The owner wants these edits to stop being a chore (2026-11-12).

The owner chose a **git-based CMS** and, of those, **Pages CMS**. It is open source (MIT) and hosted at app.pagescms.org. It edits JSON or YAML files in a GitHub repository through its GitHub App, from one `.pages.yml` file at the repository root. Each save is a commit, and the repository's own CI builds, checks and deploys it.

It adds nothing to the published site: no admin page, no script and no CSP origin. Editors can be invited by email, so a customer does not need a GitHub account.

This lifts the "no CMS" line of CLAUDE.md "Scope discipline" for this one approach.

The owner also chose **option (a)** for the source of truth. The content files the CMS manages belong to the exported repository. `sync-export` never overwrites them, and a new command copies them back into the factory when the factory needs them.

## What Changes

- **Content convention.** Editable content lives in JSON or YAML files under `src/content/` of a site.
  - Each file belongs to an Astro content collection declared in `src/content.config.ts`, with a schema (the `file` or `glob` loader and `astro/zod`).
  - A bad edit, such as a price written as text or a missing required field, fails `astro check` and the build. CI then blocks the deploy, so a broken edit never goes live.
- **CMS configuration.** A site opts in with `sites/<slug>/.pages.yml`, written by hand per site. It lands at the root of the exported repository, where Pages CMS reads it. `node scripts/cms.mjs check --site <slug>` validates it (exit 0 valid, 1 invalid, 2 bad usage):
  - every `content[]` entry is `type: collection` or `file`;
  - every `path` is inside `src/content/` and exists;
  - every `format` is `json` or `yaml`;
  - every path is referenced by `src/content.config.ts`;
  - there is no `media` (uploads are out of scope: an uploaded image would have no license record);
  - there are no `actions` (they run workflows).
- **Sync keeps CMS content (option a).** For a site with `.pages.yml`, `sync-export.mjs` never adds, changes or deletes a file under a CMS path in the clone.
  - When the factory copy of such a file differs from the clone's, sync keeps the clone's, lists it as `kept (managed by the CMS)` and names the pull command.
  - Every other file, `.pages.yml` included, syncs as today.
- **Pull.** `node scripts/cms.mjs pull --site <slug> --from <clone>` copies the CMS paths from a clone of the recorded repository into `sites/<slug>/` (add, change, delete inside those paths only) and prints the files.
  - It refuses (exit 1, writing nothing):
    - a site without `.pages.yml` or without `EXPORTED.json`;
    - a transferred site;
    - a clone whose `origin` is not the recorded repository;
    - a clone with uncommitted changes.
  - It never commits.
- **Revision rounds.** On a site with `.pages.yml`, a feedback item that only changes CMS-managed content is classified `cms` and is not edited. `REVISION.md` lists it under "Edit in the CMS" with the file. Every other item is handled as today.
- **Handoff.** `handoff.mjs plan` adds the Pages CMS steps for a site with `.pages.yml`:
  - install the Pages CMS GitHub App on the repository only;
  - open the repository in app.pagescms.org;
  - invite editors by email;
  - know that every save is a commit on the production branch, which CI checks before it deploys.
- **Docs.** `docs/cms.md` (what can be edited, how to set it up, how a save reaches production, pull before a revision round); CLAUDE.md ("Git CMS" section, "Scope discipline", "Revising a landing"); `docs/revise.md`; `docs/handoff.md`.

## Capabilities

### New Capabilities

- `git-cms`: the content convention, `.pages.yml` and its check, and the pull command.

### Modified Capabilities

- `landing-handoff`: sync keeps CMS-managed files; the owner checklist gets the Pages CMS steps.
- `landing-revision`: CMS-managed content is left to the CMS.
- `site-export`: `.pages.yml` travels to the repository root.

## Impact

- **Code:**
  - new `scripts/cms.mjs` and `scripts/lib/cms-config.mjs`;
  - `scripts/sync-export.mjs`, `scripts/handoff.mjs`;
  - the export file list, so the dotfile `.pages.yml` is copied;
  - `.claude/skills/revise-landing/SKILL.md` (our own skill);
  - `yaml` as a direct devDependency of the factory. It is already in the tree; only the factory scripts use it and it is never exported.
- **Tests:**
  - the config check (valid, path outside `src/content/`, missing path, path not in `content.config.ts`, `media` or `actions` present, bad format);
  - sync keeping CMS files and reporting them;
  - pull (copies, deletes inside the paths only, the four refusals);
  - the handoff plan with and without `.pages.yml`.
  - Tests never call Pages CMS or GitHub.
- **Existing sites:** none changes in this change. `personal-brand` (jobs and skills) and `tupathdigital` (products and discounts) move to content collections and get their `.pages.yml` in their own site changes afterwards.
  - Each of those changes goes factory first, then sync, then a pull request in its repository.
  - After that, the owner installs the GitHub App.
- **Verification owed after merge:** the first real edit through app.pagescms.org on one of those repositories. The owner does it: install the app, edit one entry, see the commit, the CI run and the deploy.
- **Out of scope:**
  - media uploads;
  - other CMSs (Decap, Sveltia, Keystatic, Tina);
  - self-hosting Pages CMS;
  - Google Sheets;
  - editing on a branch with a pull request per edit;
  - a CMS on sites that were never exported;
  - generating `.pages.yml` from the schemas;
  - `/new-landing` writing content collections (a later change once two sites use them).
