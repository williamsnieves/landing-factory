# Proposal: add-deploy-adapters

## Why

Every landing deploys to Cloudflare Pages today. Customers host elsewhere, and the owner named three places (owner, 2026-10-24):

- **Vercel**;
- **their own server**: a Hostinger VPS or a DigitalOcean Droplet;
- **shared hosting**: Hostinger's web hosting plans.

The build output is static `dist/`, so each place only needs:

- a way to upload the files safely from CI;
- the same cache and security headers that `public/_headers` gives Cloudflare;
- a guide that ends with pointing the domain and running the landing report on the final URL.

## What Changes

- **Deploy target per site.** `site.config.json` gains `target`: `cloudflare` (the default, so existing sites change nothing), `vercel`, `vps` or `shared`. Each target has its own non-secret settings section:
  - Vercel: project name, team;
  - VPS and shared: host, port, user, path, the pinned host key, the public URL.

  Secrets stay in CI (`VERCEL_TOKEN`, `DEPLOY_SSH_KEY`, `DEPLOY_FTP_PASSWORD`).
- **One deploy command:** `node scripts/deploy.mjs --site <slug> [--dry-run]`. It reads the target and runs its adapter:
  - **Vercel:** the Vercel REST API, with `fetch` and no CLI dependency. It uploads each file by its SHA-1 and creates the deployment: production on the main branch, preview on others. It waits until the deployment is ready and prints the URL.
  - **VPS:** rsync over SSH with a pinned host key. It uploads into a new release folder and switches a `current` symlink in one step, so visitors never see a half-uploaded site. It keeps the last 5 releases, which makes rollback a symlink change.
  - **Shared hosting:** rsync over SSH (Hostinger's web plans include SSH, on port 65002) into the document root, with updates applied at the end. The fallback is FTPS, explicit TLS only, through `lftp`. Plain FTP is refused because it sends the password in clear text.
- **Real deploys only from CI.** A deploy outside CI is refused, and locally only `--dry-run` works. A dry run prints the plan (files, sizes, generated configs, the commands without secrets) and touches nothing. This keeps the rule "never deploy from a local machine".
- **Headers on every target, translated from `_headers`.** `scripts/deploy/headers.mjs` turns the built `dist/_headers` into:
  - `vercel.json` headers for Vercel;
  - a Caddy snippet and an Nginx snippet for a VPS;
  - an `.htaccess` file for shared hosting (Apache or LiteSpeed, with `mod_headers` and `ErrorDocument 404`).

  The landing report's live checks then verify the result on the real URL.
- **CI:**
  - The deploy step dispatches on the site's target. The secrets gate names the secrets that target needs.
  - Vercel gets per-branch previews.
  - VPS and shared hosting publish production from `main` only. A PR for such a site still gets a Cloudflare preview when the Cloudflare secrets exist (`previews: "cloudflare"`, the default for these targets). Otherwise the PR comment says there is no preview for that target.
  - The live report runs on whatever URL the target returns.
- **Guides:** `docs/deploy/` gets:
  - `cloudflare.md`;
  - `vercel.md`;
  - `vps.md`, covering a Hostinger VPS and a DigitalOcean Droplet: SSH user and key, Caddy with automatic HTTPS, or Nginx with Certbot, folders, firewall;
  - `shared-hosting.md`, covering Hostinger hPanel: enabling SSH, the document root, the domain, FTPS fallback.

  Each guide ends with pointing the domain and running `npm run report -- --site <slug> --url https://<domain>`.

## Capabilities

### New Capabilities

- `deploy-adapters`: deploy targets per site, the adapters (Vercel, VPS, shared hosting), dry run, CI-only real deploys, header translation, atomic releases and rollback, secret handling, and the guides.

### Modified Capabilities

- `deployment`: two existing requirements change.
  - "Preview per branch" now depends on the target: Vercel and Cloudflare get native previews, and VPS and shared targets fall back to Cloudflare previews or say there is none.
  - "Deploy each changed site" now deploys to the site's target instead of always to Cloudflare Pages.

## Impact

- **New code:**
  - `scripts/deploy.mjs`;
  - `scripts/deploy/{config,headers,vercel,rsync,ftps,plan}.mjs`;
  - tests: a fake Vercel API, rsync from one local folder to another (rsync and ssh are on CI runners; in cloud sessions, `apt-get install -y rsync openssh-client`), and unit tests for the header translators.
- **Changed code:**
  - `.github/workflows/ci.yml`: deploy dispatch, secrets gate per target, preview fallback;
  - `scripts/new-site.mjs`: `site.config.json` gets `target: "cloudflare"`;
  - `.claude/settings.json`: allows `node scripts/deploy.mjs --site * --dry-run` only;
  - `package.json`: a `deploy` script;
  - the `/new-landing` skill: sets the target from the brief's `deploy.target`.
- **Docs:** `CLAUDE.md` (CI and deployment, commands), `README.md` (Deployment), `docs/deploy/*.md`, `docs/status.md`.
- **No new npm dependencies.**
  - Vercel goes through `fetch`.
  - VPS and shared hosting use the system's `rsync` and `ssh`, which come with GitHub's Ubuntu runners.
  - `lftp` is installed with `apt` in CI only when the FTPS fallback is used.
- **Real deploys are not verified in this change:** the owner has no Vercel, VPS or Hostinger account yet. Adapters are verified with a fake Vercel API, real rsync from one local folder to another, and dry runs. The first real deploy for each target is a follow-up, once the owner has an account and adds the secrets.
- **Out of scope:**
  - Netlify;
  - DigitalOcean App Platform;
  - containers (Docker);
  - previews on a VPS;
  - per-site secrets (one set of secrets per target for the whole repository);
  - automatic DNS and domain setup;
  - moving existing sites off Cloudflare.
