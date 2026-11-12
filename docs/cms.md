# Git CMS (Pages CMS)

Routine content edits (a new job, a product, a removed discount) without code, on a landing that lives in its own repository. Owner decision 2026-11-12: a git-based CMS, and of those Pages CMS (open source, MIT, hosted at app.pagescms.org). It edits JSON or YAML files in the repository through its GitHub App from one `.pages.yml` file; each save is a commit, and the repository's own CI checks and deploys it. It adds nothing to the published site: no admin page, no script, no CSP origin.

## What can be edited

Only content files under `src/content/` of the site, in JSON or YAML. Each one is loaded by an Astro content collection declared in `src/content.config.ts` (the `file` or `glob` loader and a schema from `astro/zod`). A wrong value (a price written as a word, a missing required field) fails `astro check` and the build, so the repository's CI does not deploy it and the live site keeps its previous version.

Not editable through the CMS: images or any upload (an uploaded image would have no license record, credit or `assets.json` entry; an image change still goes through the factory), components, styles, copy that lives in code modules.

## `.pages.yml`

Written by hand in `sites/<slug>/.pages.yml`; it is exported to the repository root, where Pages CMS reads it. The factory reads only these keys and ignores the rest (`components`, `settings`, `cache`, `hide`):

- `content`: a non-empty list of entries with `name`, `label`, `type` (`collection` or `file`), `path`, `format` (`json` or `yaml`) and `fields`.
- `media` and `actions` are refused (uploads, and workflows an action could run).

`node scripts/cms.mjs check --site <slug>` validates it (exit 0 valid, 1 invalid, 2 bad usage or no `.pages.yml`). It fails when:

- a `type` is not `collection` or `file`, or a `format` is not `json` or `yaml`;
- a `path` is not a clean relative path inside `src/content/` (no leading or trailing slash, no `..`), does not exist, is not a folder for a `collection` or a file for a `file`, or is listed twice;
- a `path` is not referenced in `src/content.config.ts`. The rule: the path relative to the site root (or without its leading `src/`) appears in that file as a whole path (`./src/content/jobs` and `src/content/jobs/*.json` count for `src/content/jobs`; `src/content/jobs-old` does not);
- a `media` or `actions` key is present (top level or on an entry).

The export runs the same check first and exits 1, writing nothing, when it fails. The CMS paths are the `path` of each entry: the folder of a `collection`, the file of a `file`.

## Set up (the owner)

`node scripts/handoff.mjs plan ...` adds a "Content editing (Pages CMS)" section for a site with `.pages.yml`:

1. Install the Pages CMS GitHub App on this repository only (Only select repositories), never on all of them: it can write to any repository it reaches.
2. Open the repository at app.pagescms.org and check that the collections appear.
3. Invite each editor by email. A customer needs no GitHub account.

## How a save reaches production

Pages CMS commits each save to the branch it was opened on, the production branch. The repository's CI runs types, build, QA and the static report before the deploy step. A bad edit fails there and never deploys. The content stays in plain JSON or YAML, so editing by hand or reverting a commit always works.

## Factory and repository: option (a)

While a landing is managed, the factory is the source of truth, except for the CMS paths, which belong to the repository.

- `sync-export.mjs` never adds, changes or deletes a file under a CMS path in the clone. When the factory's copy differs from the clone's (or exists on one side only), it prints `kept (managed by the CMS): <file>` and a hint with the pull command. The factory's `.pages.yml` itself syncs normally, and a path removed from it is no longer protected.
- `node scripts/cms.mjs pull --site <slug> --from <clone> [--dry-run]` copies the files under the CMS paths from the clone into `sites/<slug>/` (add, change, delete inside those paths only) and prints them. It never commits. It refuses (exit 1, nothing written) a site without `.pages.yml` or `EXPORTED.json`, a transferred site, a clone whose `origin` is not the recorded repository, a clone that is not a work tree root and a clone with uncommitted changes. Update the clone first (`git pull`), then pull.
- Run the pull before a revision round that touches content, and before a sync when sync listed kept files.
- A revision round never edits CMS content: a feedback item that only changes it is classified `cms` and listed in `REVISION.md` under "Edit in the CMS".

## Still owed

The first real edit through app.pagescms.org on a repository with a `.pages.yml`: install the app, edit one entry, see the commit, the CI run and the deploy. Existing sites (`personal-brand`, `tupathdigital`) move their lists to collections in their own site changes. Out of scope: uploads, other CMSs, self-hosting Pages CMS, a pull request per edit, generating `.pages.yml` from the schemas, `/new-landing` writing collections.
