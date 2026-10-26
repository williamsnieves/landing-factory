---
name: landing-handoff
description: 'Move one finished landing from the factory to its owner''s own GitHub repository, host and domain, step by step: preflight and QA, the owner''s decisions (repository, visibility, target, domain), the factory branch with the target, export into a scratch folder and verification there, the owner''s checklist, the first push, the first CI without and then with the secrets, the domain guided from the owner''s screenshots, the live report on the domain, the export record in a factory pull request and the cleanup of the old host. Never asks for a secret in chat, never creates a repository or starts a workflow run itself, never changes DNS. Use when the user runs /landing-handoff <slug> or asks to hand off, deliver, publish, move or transfer a finished landing to its owner, to its own repository or to its domain. Interactive only: not run by claude -p. Not for building the landing (use new-landing) or for editing one that is already exported.'
user-invocable: true
argument-hint: '<slug>'
---

# landing-handoff

Move one finished landing from `sites/<slug>/` to the owner's repository, host and domain, in the order that worked the first time (`personal-brand`, 2026-10-26). The skill is **interactive only**: it needs the owner at several points, so `claude -p` and `scripts/new-landing.sh` never start it. The guide behind it is `docs/handoff.md`; the commands are `scripts/handoff.mjs` (read-only), `scripts/export.mjs` and `scripts/deploy/config.mjs`.

Read `CLAUDE.md` first ("Exporting a site", "CI and deployment", "Handing off a landing"). Talk to the owner in the language they write in; everything written into the repository (commits, docs, pull request) is English.

## Hard rules

- **Never ask for a secret in chat** (a token, an SSH key, an FTP password), and never accept one if it is pasted: tell the owner to put it only under the repository's **Settings > Secrets and variables > Actions**, and to rotate the one that was pasted.
- **Never call `create_repository` and never start a workflow run** (`actions_run_trigger`, `workflow_dispatch`). The Claude GitHub App answers 403 to both, and the owner must own those two actions. Ask the owner to do them.
- **Never change DNS or any host setting.** Say exactly what to click and which record to add; the owner does it. Never invent a record value: the host shows it.
- **Never push to a repository the owner did not name**, and never force-push.
- Never commit or push to the factory without the owner's say-so for this branch; never deploy from a local machine.
- A value the owner has not decided stays a question. Do not guess the repository name, visibility, target or domain.

## Steps

Stop at every "Stop" and wait for the owner.

1. **Preflight.** Run `node scripts/handoff.mjs check --site <slug>` (add `--visibility public|private` once it is known). Fix what it names (unused layer: `node scripts/site-layers.mjs prune --site <slug>` then `npm install`; no `site`: set it in `astro.config.mjs`; domain or target disagreeing with the brief: fix the side that is wrong, with the owner). Then `npm run qa -- --site <slug>` and `npm run report -- --site <slug> --only static`. **Stop** on any failure and fix the cause, never a threshold.
2. **Decisions.** Ask only what is missing, a few questions at a time: the repository owner and name (default the slug), public or private (public means export with `--no-brief`, since the brief holds customer contact data), the target (from the brief's `deploy.target`, else ask: Vercel, Cloudflare Pages, VPS or shared hosting), the production domain (from the brief and `site`; the apex or `www` form must be the one `site` uses). A VPS or shared target also needs its `host`, `user`, `path`, `hostKey` and `url` (`docs/deploy/vps.md`, `docs/deploy/shared-hosting.md`); the owner provides them.
3. **Factory branch.** If a merged change is not archived yet, archive it first (working agreement). Create `change/<slug>-handoff`. Set the target: `node scripts/deploy/config.mjs --site <slug> --from-brief --write` (Vercel is completed from the slug; for the others edit `sites/<slug>/site.config.json` by hand), validate with `node scripts/deploy/config.mjs --site <slug>`, run `node scripts/handoff.mjs check --site <slug> --visibility <v>` again. Commit only with the owner's say-so.
4. **Export and verify.** Export into a scratch folder outside the factory: `npm run export -- --site <slug> --out <scratch>/<slug> [--no-brief]`. In that folder run `npm ci`, `npm run lint`, `npm run build` and `node scripts/deploy.mjs --dry-run`. **Stop** if any fails; the export refuses and removes what it wrote when its own checks fail.
5. **Owner steps.** Run `node scripts/handoff.mjs plan --site <slug> --repo <owner>/<name> --visibility <v> [--old-host <name>]` and relay it in the owner's language: create the empty repository, give the Claude GitHub App access, then the secrets (names only), the first run by hand, the domain and the DNS. Offer to take them one at a time. **Stop** until the owner says the repository exists and the app has access.
6. **First push.** Attach the repository with `add_repo` (push access), clone it, copy the exported folder into the clone (not `node_modules/`, not `.git/`), commit and push to `main`. If `add_repo` is unavailable or refused, give the owner the git commands to run in the exported folder instead (`git init`, `git remote add origin ...`, commit, push); the order and the checks stay the same.
7. **CI, without then with the secrets.** Read the runs through the GitHub tools. The first run must pass QA and the static report and **skip the deploy** with a warning when the secret is not there yet: tell the owner that is expected. **Stop**: ask the owner to add the secret (never in chat) and to start **Actions > CI > Run workflow** on the production branch. Then read the run and find the deployment URL in its summary.
8. **Domain.** Ask for a screenshot of the host's domain screen and of the registrar's name servers, and give the exact steps from them using the `plan` rules: `site` decides the production domain, the twin redirects to it permanently, Vercel's "redirect apex to www" stays unchecked when `site` is the apex, and the DNS is edited where the name servers point (a previous host such as Netlify, or Cloudflare), or the name servers are first switched back to the registrar. **Stop** until the owner confirms the domain shows the new site.
9. **Domain check.** The production run now ends with the live report on the domain (`npm run report -- --only live --site-url`; its items are `not-run` and the job green while the domain does not answer). Read the artifact `landing-report-domain` of the latest production run. If this session can reach the domain (the proxy of cloud sessions may block it), also run `npm run report -- --site <slug> --url https://<domain>` in the factory. A failing item is fixed in the site (headers, 404), never in a threshold.
10. **Record and pull request.** Record the handoff in the factory: `npm run export -- --site <slug> --out <fresh scratch folder> --record https://github.com/<owner>/<name>` writes `sites/<slug>/EXPORTED.json` (the output folder is thrown away). Update `docs/status.md`, then, with the owner's say-so, commit on `change/<slug>-handoff` and open the pull request.
11. **Cleanup.** Relay the plan's cleanup section: only after the domain serves the new site, remove the domain from the old host, delete its DNS zone, then the old site or repository if wanted.

## Refreshing an already exported repository

An exported repository does not follow later factory changes (a new workflow step, a fixed script). To bring one up to date:

1. Export the site again into a **fresh scratch folder** (never into the existing clone), with the same flags as before (`--no-brief` for a public repository): `npm run export -- --site <slug> --out <scratch>/<slug>`. A site with an `EXPORTED.json` can still be exported.
2. Clone the owner's repository (`add_repo` with push access) and compare: `diff -ru <clone>/.github <scratch>/<slug>/.github` and `diff -ru <clone>/scripts <scratch>/<slug>/scripts`.
3. Copy `.github/workflows/ci.yml` and `scripts/` from the scratch export into the clone. If `package.json` dependencies or scripts changed, copy those too and refresh the lockfile (`npm install --package-lock-only`); never overwrite the owner's `src/`, content or `site.config.json` from the export.
4. In the clone run `npm ci`, `npm run lint`, `npm run build`, then commit with a message saying which factory change it brings, and push to a branch; with the owner's say-so merge it. The workflow run on that branch is the check.

## Output

Keep the owner's list short: what you did, the one thing you need next, and what the run showed. After each stop, say which step you are on out of 11.
