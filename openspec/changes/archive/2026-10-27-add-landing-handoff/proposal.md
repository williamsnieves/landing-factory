# Proposal: add-landing-handoff

## Why

On 2026-10-26 the owner's landing moved from `sites/personal-brand` to its own repository, deployed to Vercel and took the owner's domain. That was the factory's first real handoff. It took about twenty manual steps across this session, the owner, GitHub, Vercel and the domain registrar. Several of them were learned the hard way:

- **GitHub limits.** The Claude GitHub App cannot create a repository or start a workflow run; both answered 403. It can push once the repository is in its access.
- **Apex and `www`.** Vercel's default ("redirect the apex to www") contradicted the landing's `site` URL, which is the canonical and hreflang base.
- **The real DNS host.** The domain was registered at Namecheap but its DNS lived at Netlify (NS1 name servers). Namecheap only shows host records after switching back to BasicDNS.
- **No live report on the final domain.** It could not run from the session, because the proxy blocks the domain, and the exported CI only checks the deployment URL.

Every landing that goes to its owner repeats these steps. They should be one guided, repeatable flow that does the checks itself and tells the owner exactly what to do and when.

## What Changes

- **`scripts/handoff.mjs`** (no new dependency), with two read-only subcommands:
  - `check --site <slug> [--visibility public|private]` runs the preflight. It refuses (exit 1, naming every problem) when:
    - the site does not exist or is already exported;
    - it holds an unused layer;
    - its `site.config.json` is invalid;
    - its `astro.config.mjs` has no `site`;
    - the brief's `deploy.domain` disagrees with `site`;
    - its target is still the default `cloudflare` while the brief asks for another one.

    It warns when a public repository would carry `brief.json` and its `--no-brief` alternative.
  - `plan --site <slug> --repo <owner>/<name> --visibility public|private` prints the owner's checklist in Markdown, from the site's real configuration:
    - create the empty repository;
    - give the Claude GitHub App access;
    - the secrets the target needs, by name only;
    - start the first run by hand after the secrets exist;
    - the domain steps of the target, with the apex or `www` choice taken from `site`;
    - how to find where the DNS really lives (registrar or a previous host's name servers);
    - cleanup of the old host.
- **Live report on the production domain in exported repositories.** On the production branch, after the deploy, the exported workflow runs the live report on the landing's `site` URL as well as on the deployment URL.
  - While the domain does not point at the new host yet, its items are `not-run` and the job stays green.
  - Once it does, a failing item fails the job.
  - The sticky summary shows both results.
- **The skill `/landing-handoff <slug>`** (`.claude/skills/landing-handoff/SKILL.md`, interactive, not for `claude -p`). It drives the whole move in the order learned:
  1. preflight and QA;
  2. decisions (repository, visibility, target, domain);
  3. the factory branch `change/<slug>-handoff` with the target;
  4. export into a scratch folder and verify it there;
  5. the owner's checklist;
  6. attach, clone, copy and push the first commit;
  7. the first CI without secrets, then with them;
  8. the domain, guided from the owner's screenshots;
  9. the live report on the domain;
  10. the export record and the factory pull request;
  11. cleanup of the old host.

  It never asks for a secret in chat. It never tries to create repositories or start runs itself; it asks the owner. It never changes DNS.
- **`docs/handoff.md`:**
  - the guide behind the skill;
  - the three delivery models (managed, managed with transfer, customer's own account), of which only the third is automated now;
  - DNS cases: DNS at the registrar, DNS at a previous host such as Netlify, Cloudflare DNS;
  - the apex and `www` rule;
  - what the Claude GitHub App can and cannot do.

## Capabilities

### New Capabilities

- `landing-handoff`: moving one finished landing from the factory to its owner's repository, host and domain: the preflight, the owner's checklist, the guided flow and the record.

### Modified Capabilities

- `site-export`: the exported workflow also runs the live report on the landing's own domain on the production branch.

## Impact

- **New:**
  - `scripts/handoff.mjs`;
  - `tests/handoff.test.mjs`;
  - `.claude/skills/landing-handoff/SKILL.md` (our own skill, not vendored);
  - `docs/handoff.md`.
- **Changed:**
  - `scripts/export/templates/ci.yml` (production domain live report) and its test;
  - `package.json` (`handoff` script);
  - `.claude/settings.json` (allow `node scripts/handoff.mjs`; it is read-only);
  - `CLAUDE.md`, `docs/status.md`, `docs/export.md`.
- **The owner's repository** `williamsnieves/personal-brand` is not changed by this pull request. Its workflow gets the domain report by a re-export. The skill documents that step, and doing it there is a separate, small push to that repository after this merges.
- **Out of scope:**
  - the managed model: a factory GitHub organization, a GitHub App that creates repositories, transfers;
  - DNS changes through registrar APIs;
  - adding domains through the Vercel or Cloudflare APIs;
  - Bitbucket and other CI systems;
  - re-syncing factory updates into exported repositories.
