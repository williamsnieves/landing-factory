# Handing off a landing

A finished landing can move from the factory (`sites/<slug>/`) to its owner's own GitHub repository, host and domain. The first real handoff (`personal-brand`, 2026-10-26) took about twenty manual steps across a Claude session, the owner, GitHub, Vercel and the domain registrar. This guide and the skill `/landing-handoff <slug>` (`.claude/skills/landing-handoff/SKILL.md`) turn those steps into one guided, repeatable flow that does the checks itself and tells the owner exactly what to do and when.

This is support for the move, not legal advice; the legal pages and the cookie rules are in `docs/legal.md`.

## Delivery models

| Model                              | Who owns the repository and the host                              | State                     |
| ---------------------------------- | ----------------------------------------------------------------- | ------------------------- |
| Managed                            | The factory (an organization of its own), the customer sees a URL | Not built                 |
| Managed, with a transfer at the end | The factory first, then the repository moves to the customer      | Not built                 |
| The customer's own account         | The customer creates the repository and the host account          | **Automated by this flow** |

Only the third model exists. The first two need a factory GitHub organization and a GitHub App that creates repositories and transfers them, which is out of scope for now.

## The tools

- `node scripts/handoff.mjs check --site <slug> [--visibility public|private] [--json]` is the preflight. Exit 0 means ready (warnings allowed), 1 not ready, 2 bad usage. It refuses, naming every problem, when:
  - the site does not exist or already has an `EXPORTED.json`;
  - it holds an unused optional layer (`node scripts/site-layers.mjs prune`);
  - `site.config.json` is invalid;
  - `astro.config.mjs` has no `site` (an absolute https URL: it is the canonical and hreflang base, and the address of the domain report);
  - the brief's `deploy.domain` is not the host of `site` (its `www` twin is accepted);
  - the brief names a deploy target other than the configured one, typically the default `cloudflare` while the brief says Vercel.

  It warns when `--visibility public` would carry `brief.json` (customer contact data): export with `--no-brief`.

- `node scripts/handoff.mjs plan --site <slug> --repo <owner>/<name> --visibility public|private [--old-host <name>]` prints the owner's checklist in Markdown from the site's real configuration. Problems from `check` come first and make the exit code 1; the checklist is still printed when the configuration loads. The secret names and where to create them come from the "Secrets" table of `docs/deploy/<target>.md`; values are never read.

Both are read-only. The skill drives them together with `npm run export`, the deploy configuration and the GitHub tools.

## The checklist, explained

1. **Repository.** The owner creates the repository **empty** (no README, `.gitignore` or license, so the first push is a plain push) and gives the Claude GitHub App access to it.
2. **Secrets.** Each secret the target needs, by name, under **Settings > Secrets and variables > Actions**. Never in a chat or a file.
3. **First runs.** The first push runs format, lint, types, QA and the static report; the deploy is skipped with a warning because the secrets do not exist yet, and the run stays green. When they exist, the owner starts **Actions > CI > Run workflow** on the production branch by hand.
4. **Domain.** The steps of the target (below).
5. **Where the DNS lives.** See "DNS cases".
6. **Check.** The exported workflow runs the live report on the deployment URL and, on the production branch, on the landing's own domain (`npm run report -- --only live --site-url`, which takes the origin of the absolute canonical URL in `dist/index.html`). While the domain does not point at the new host every item is `not-run` and the job stays green; once it does, a failing item fails the job after the report is uploaded (`landing-report-domain`). The run summary shows both results.
7. **Cleanup.** Only when the domain serves the new site: remove the domain from the old host, delete its DNS zone, then the old site or repository if wanted.

## The apex and `www` rule

The landing's `site` decides the production domain. If `site` is `https://example.com`, the apex is production and `www.example.com` redirects to it with a permanent redirect; if `site` is `https://www.example.com`, the reverse. The two must agree because `site` is the canonical URL and the hreflang base.

The trap on Vercel: its default is "redirect the apex to www", which contradicts a `site` on the apex. Keep the apex as the production domain, leave that option unchecked, and add `www` as a permanent (308) redirect to the apex.

## Domain steps per target

- **Vercel:** **Project > Settings > Domains**, add the production domain and the redirecting twin, then create the DNS records Vercel shows (usually `A` for the apex, `CNAME` for `www`).
- **Cloudflare Pages:** **Workers & Pages > project > Custom domains**. An apex custom domain is simplest when the DNS zone is on Cloudflare; the twin gets a Redirect Rule.
- **VPS:** `A` records at the DNS host, the web server configuration (the generated header snippets are in `node scripts/deploy.mjs --site <slug> --dry-run`), a TLS certificate and the redirect.
- **Shared hosting:** add the domain in the hosting panel with the document root from `site.config.json`, enable SSL and force HTTPS, create the records the panel shows.

The tools never invent a record value: the host shows the exact records and the owner copies them.

## DNS cases

Read the **name servers** of the domain at the registrar first. They say where the DNS really lives.

1. **DNS at the registrar.** The name servers are the registrar's own (for example Namecheap BasicDNS). Add the records there.
2. **DNS at a previous host.** The name servers belong to another host, for example `dns1.p05.nsone.net` for Netlify DNS. The records are edited there, or, better because the domain then depends on no host, the name servers are switched back to the registrar and the records added there. In the first handoff the domain was registered at Namecheap but its DNS lived at Netlify, and Namecheap showed host records only after switching back to BasicDNS.
3. **Cloudflare DNS.** The name servers are `*.ns.cloudflare.com`. Edit the records in Cloudflare. For a Cloudflare Pages site this is the easy case.

When in doubt the owner sends a screenshot of the registrar's name server screen and of the host's domain screen, and the skill gives the steps from them.

## What the Claude GitHub App can and cannot do

- **Can:** push to a repository that is in its access (an installation covering the owner's repositories works), read runs and logs through the GitHub tools.
- **Cannot:** create a repository or start a workflow run; both answer 403 "Resource not accessible by integration". These two steps stay with the owner, and the skill never tries them.

## Refreshing an exported repository

An exported repository does not follow later factory changes. To bring one up to date (for example to get the domain report step), export the site again into a fresh scratch folder, compare `.github/workflows/ci.yml` and `scripts/` with the repository's, copy them over, copy changed `package.json` dependencies (refresh the lockfile with `npm install --package-lock-only`), and check the result with `npm ci`, `npm run lint` and `npm run build`. Never overwrite the owner's `src/`, content or `site.config.json`. The skill has the same procedure ("Refreshing an already exported repository"). An already recorded site (`EXPORTED.json`) can be exported again; the export does not touch the record.

## Out of scope

The managed model, DNS changes through registrar APIs, adding domains through the Vercel or Cloudflare APIs, Bitbucket and other CI systems, and automatic re-syncing of factory updates into exported repositories.
