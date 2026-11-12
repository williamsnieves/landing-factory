# Design: add-git-cms

## Context

Exported landings live in their own repositories (`personal-brand` on Vercel, `tupathdigital` on Cloudflare), and the factory is the source of truth: `sync-export.mjs` mirrors `sites/<slug>/` into a clone and overwrites what differs. Content that changes often (jobs, skills, products, discounts) sits in TypeScript modules. Pages CMS edits JSON, YAML or Markdown files in a GitHub repository from a `.pages.yml` at the repository root, through its GitHub App, and commits each save.

The configuration schema below was read from the Pages CMS source (`lib/config-schema.ts`, MIT, commit `6f4e860`, 2026-06-08), since pagescms.org was not reachable from the session: top-level keys `media`, `content`, `components`, `actions`, `settings`, `cache`, `hide`; a content entry has `name`, `label`, `type` (`collection` or `file`), `path` (relative, no leading or trailing slash), `format` (`json`, `yaml`, frontmatter variants, `datagrid`, `code`, `raw`), `fields`, `list`, `view`, `filename`, `subfolders`, `commit`, `actions`.

## Goals / Non-Goals

**Goals:** routine content edits without code, checked by the build before they go live; no change to the published page; the factory never silently overwrites an edit made in the CMS.

**Non-goals:** uploads, other CMSs, migrating existing sites (their own changes), generating `.pages.yml`.

## Decisions

1. **Content in collections with schemas.** A CMS edit must not be able to break the page silently. Astro content collections with `astro/zod` schemas make `astro check` and the build fail on a wrong type or a missing field, and the exported CI runs both before it deploys. JSON or YAML only: Markdown bodies are not needed for lists of jobs or products, and fewer formats keep the check simple.
2. **`.pages.yml` written by hand, checked by a script.** Generating it from zod schemas would need a schema walker for little gain: a site has two to five editable lists. `cms.mjs check` enforces the rules that matter for safety (paths inside `src/content/`, every path backed by a collection, no `media`, no `actions`). Field definitions are left to the author and to Pages CMS's own validation.
3. **No uploads.** A `media` key would let an editor add images that have no license record, credit or `assets.json` entry, which breaks the licensing rule. Text and data only for now; an image change still goes through the factory.
4. **Sync keeps CMS paths (owner option a).** The CMS paths are read from the factory's `.pages.yml` (the same file the repository has, since sync carries it). Sync treats files under those paths as owned by the clone: never added, changed or deleted, and a difference is reported, not resolved. Reading the clone's `.pages.yml` instead was rejected: a path removed from the CMS in the factory would stay protected forever.
5. **Pull is explicit.** `cms.mjs pull` copies the clone's CMS paths into the factory so a revision round or a later sync starts from what is live. It shares `sync-export.mjs`'s clone checks (recorded origin, clean work tree, not transferred) through a small helper in `scripts/lib/` instead of copying them.
6. **Revision rounds leave CMS content alone.** A round could pull first, but the clone is the owner's and a round never touches it. The skill classifies an item that only changes CMS-managed content as `cms` and lists it for the editor; anything else in the same feedback proceeds. `revisions-schema.mjs` gains the `cms` kind.
7. **Edits go to the production branch.** Pages CMS commits to the branch it is opened on. The exported CI runs QA and the static report before the deploy step, so an edit that breaks the build never deploys; the live site keeps the previous version. A pull request per edit was rejected as too heavy for routine changes.
8. **`yaml` as a devDependency.** It is already installed (through `@astrojs/check`); declaring it keeps knip happy and avoids a hand-written parser. Only factory scripts import it, so the export closure never includes it.

## Risks / Trade-offs

- **The Pages CMS GitHub App has write access** to each repository it is installed on. Mitigation: install it on the selected repositories only (the checklist says so); commits are visible in the history and revertible.
- **A hosted third-party service** could change or stop. The content stays in plain JSON or YAML in the repository; editing by hand or self-hosting Pages CMS (MIT) remain possible.
- **Factory and repository drift** for CMS paths is reported by sync but not merged automatically. Acceptable: the pull is one command and sync names it.
- **The configuration format may change** (Pages CMS 2.x). The check validates only the keys we rely on and ignores the rest.
