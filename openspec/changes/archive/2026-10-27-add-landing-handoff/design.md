# Design: add-landing-handoff

## Context

The first handoff (`personal-brand`, 2026-10-26, recorded in `docs/status.md`) used:

- `npm run export -- --site personal-brand --out <scratch> --no-brief`, then a copy into a clone of the owner's empty repository, one commit and a push;
- `--record <url>` for `sites/personal-brand/EXPORTED.json`;
- a change of `sites/personal-brand/site.config.json` to `vercel`.

**What went wrong or needed the owner:**
- `create_repository` and `workflow_dispatch` both answered 403 "Resource not accessible by integration". `add_repo` with push access worked, because the owner's app installation covers all repositories.
- The first CI ran before `VERCEL_TOKEN` existed. The deploy was skipped, as designed, and the owner started the second run by hand.
- Vercel's "redirect apex to www" default was wrong for a site whose `site` is the apex.
- The DNS was Netlify DNS (`dns1-4.p05.nsone.net`) on a Namecheap registration. Namecheap shows host records only after switching to BasicDNS.
- The live report covered only the deployment URL. The session proxy blocks the owner's domain and `*.vercel.app`.

**Facts the tools can use:**
- the brief has `deploy.target` and `deploy.domain` (`scripts/lib/brief-schema.mjs`);
- `scripts/deploy/config.mjs` exports `loadSiteConfig`, `dispatch`, `secretsFor`;
- `scripts/site-layers.mjs` exports the layer check;
- the live report marks an unreachable host's items `not-run` (`scripts/report/live.mjs`);
- the built `dist/index.html` carries the canonical URL, which is absolute when `site` is set.

## Goals / Non-Goals

**Goals:**

- One command answers "is this landing ready to hand off?".
- One command prints the owner's exact checklist for this landing's target and domain.
- A skill runs the whole move in the order that worked, stops where the owner must act, and never handles secrets.
- Exported repositories check their real domain on every production deploy.

**Non-Goals:**

- The managed model: a factory organization, a GitHub App that creates repositories, transfers.
- Registrar or host APIs for DNS and domains.
- Re-syncing exported repositories.
- Non-GitHub CI.

## Decisions

1. **`scripts/handoff.mjs` is read-only and has two subcommands.** It writes nothing, so it can be allowed in `.claude/settings.json` like the other read-only scripts.
   - `check --site <slug> [--visibility public|private] [--json]`. Each problem is a line naming the field and the fix. Exit codes: 0 ready (warnings allowed), 1 not ready, 2 bad usage. The problems:
     - the site is missing, or `EXPORTED.json` exists;
     - an unused layer (from `site-layers.mjs`);
     - `site.config.json` does not load (`ConfigError` text);
     - no `site` in `astro.config.mjs` (static text scan for `site: '...'` or `"..."`, the same style the bilingual check uses);
     - the brief's `deploy.domain` is not the host of `site`, or not `www.` plus it;
     - the brief's `deploy.target` maps (`mapBriefTarget`) to a target other than the configured one.

     The warning: `--visibility public` with a `brief.json` present says the export should use `--no-brief`.
   - `plan --site <slug> --repo <owner>/<name> --visibility public|private [--old-host <name>]` prints Markdown with numbered sections. Problems from `check` are listed first under "Fix before handing off".

     | Section                | Content                                                                                                                                                                                                                                                                                                                                                                       |
     | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
     | Repository             | create `<owner>/<name>` with the visibility and no README, `.gitignore` or license; the Claude GitHub App must include it (Settings > Applications > Installed GitHub Apps > Claude > Repository access)                                                                                                                                                                                 |
     | Secrets                | `secretsFor(target)` by name, where to add them (Settings > Secrets and variables > Actions), and how to create each one (from `docs/deploy/<target>.md`)                                                                                                                                                                                                                         |
     | First runs             | the first push runs QA and skips the deploy until the secrets exist; then **Actions > CI > Run workflow** on the production branch                                                                                                                                                                                                                                            |
     | Domain                 | per target. For apex vs `www`: if `site` is the apex, the apex is the production domain and `www` is a 308 redirect to it ("redirect apex to www" unchecked); if `site` is `www.`, the reverse. Then: copy the exact records the host shows; the values are never invented by the tool                                                                                         |
     | Where the DNS lives    | read the name servers at the registrar: the registrar's own (for example Namecheap BasicDNS) means edit there; another host's (for example `*.nsone.net` for Netlify, `*.ns.cloudflare.com` for Cloudflare) means either edit at that host or switch the name servers back to the registrar first, then add the records (recommended, so the domain does not depend on a host)    |
     | Check                  | wait for the host to show the domain as valid; the production CI checks the domain on the next deploy (Decision 3)                                                                                                                                                                                                                                                             |
     | Cleanup                | once the domain serves the new site: remove the domain from the old host, delete its DNS zone, then the old site and repository if wanted (`--old-host` names it in the text)                                                                                                                                                                                                    |

   Alternative rejected: putting all this text in the skill only. The script keeps the target-specific parts tested and in one place, and the skill relays them in the owner's language.

2. **The skill `.claude/skills/landing-handoff/SKILL.md`.** It is interactive, in the owner's language, and lists its stop points.

   **Phases:**
   1. **Preflight:** `node scripts/handoff.mjs check --site <slug>`, then `npm run qa -- --site <slug>` and `npm run report -- --site <slug> --only static`. Stop on failure.
   2. **Decisions:** repository owner and name (default the slug), visibility, target (from the brief, else asked), domain (from the brief and `site`). Ask only what is missing.
   3. **Factory branch:** archive any merged change first, as the working agreement says; set `site.config.json` through `node scripts/deploy/config.mjs --site <slug> --from-brief --write` or by editing it; commit.
   4. **Export and verify:** export into a scratch folder (`--no-brief` when public), then `npm ci`, `npm run lint`, `npm run build` and `node scripts/deploy.mjs --dry-run` there.
   5. **Owner steps:** `node scripts/handoff.mjs plan ...`, relayed. Stop until the owner says the repository exists.
   6. **First push:** `add_repo` with push access, clone, copy the export, commit, push. If `add_repo` is unavailable or refused, give the owner the git commands for the exported folder instead.
   7. **CI:** read the runs through the GitHub tools. The first run must pass QA and skip the deploy; ask for the secret and the manual run; check the deployed URL in the log.
   8. **Domain:** ask for screenshots of the host's domain screen and of the registrar's name servers, and give exact steps from them (Decision 1 rules). Stop until the owner confirms the domain shows the new site.
   9. **Domain check:** the production run's domain report (Decision 3). If this session can reach the domain, also `npm run report -- --site <slug> --url https://<domain>`.
   10. **Record:** `npm run export -- ... --record <repo-url>` into a throwaway folder, which writes `EXPORTED.json`; update `docs/status.md`; open the factory pull request.
   11. **Cleanup:** the plan's cleanup section, relayed.

   **Hard rules:**
   - never ask for a token in chat;
   - never call `create_repository` or start a workflow (known 403, and the owner must own those actions);
   - never change DNS or host settings;
   - never push to a repository the owner did not name.

3. **Domain live report in the exported workflow.**
   - **The report option:** `landing-report.mjs` gets `--site-url`. It reads the canonical URL of `dist/index.html`, keeps its origin, and uses it as `--url`. It exits 2 when there is no absolute canonical URL. A small module, `scripts/report/site-url.mjs`, does the reading.
   - **The step:** `templates/ci.yml` gains, after the deployment report, on the production branch only (`steps.target.outputs.is_production == 'true'`, from `deploy/config.mjs`; checked in implementation), a step `Landing report (live, site domain)` with `id: domain_report`, `continue-on-error`, running `npm run report -- --only live --site-url`.
   - **Results:** the summary lines and the final failing step consider both reports. An unreachable domain gives `not-run` items and passes, so the job stays green until the domain points at the host; after that a failing item fails the job.
   - **Why the canonical URL:** it is exactly what search engines see. It needs no import of `astro.config.mjs`, which would pull Astro into the deploy job.
   - **Factory sites:** the factory's own workflow is unchanged. Factory sites have no own domains.

4. **Records and docs.** `docs/handoff.md` holds:
   - the delivery models;
   - the checklist explained;
   - the DNS cases with the Netlify and Namecheap example;
   - what the GitHub App can do (push yes; create repositories and start runs no).

   `CLAUDE.md` gets a short "Handing off a landing" section; `docs/export.md` links to it.

5. **Tests** (`tests/handoff.test.mjs` on fixture factories through the existing `LANDING_FACTORY_ROOT` pattern, no network):
   - **`check`:** each refusal named, a ready site exits 0, the public warning, `--json`;
   - **`plan`:** Vercel apex, Vercel `www`, Cloudflare and VPS sections; no secret value can appear (fake values built at run time in the environment are asserted absent);
   - **`site-url.mjs`:** absolute canonical, relative canonical (exit 2), missing;
   - **The template:** it has the domain step, production-only, after the deployment report, with the final failure step covering both.

## Risks / Trade-offs

- **Host dashboards change wording.** The plan names screens in plain words and tells the owner to copy the exact records the host shows, so a renamed button does not break it.
- **The domain report fails a production run** once the domain points to the host, for example on a header missing at a host level. That is intended: the domain is what visitors see. The fix is in the site's headers, never in the threshold.
- **The skill depends on GitHub tools in the session.** Without them it falls back to giving the owner commands. The order and the checks stay the same.
- **The existing owner repository lacks the domain step** until it is re-exported. The skill documents how to refresh `.github/workflows/ci.yml` and `scripts/` from a fresh export; doing it for `personal-brand` is a follow-up push to that repository.
