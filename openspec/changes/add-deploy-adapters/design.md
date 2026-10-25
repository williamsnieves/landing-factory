# Design: add-deploy-adapters

## Context

- **CI today** (`.github/workflows/ci.yml`):
  - The root `deploy` job and the `site-qa-deploy` matrix job read `site.config.json` → `cloudflare.pagesProject` and `productionBranch`.
  - They gate on `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, create the Pages project, run `wrangler pages deploy` and capture URLs with `scripts/parse-wrangler-output.mjs`.
  - They post the sticky comment and run the live report (`npm run report -- --only live --url`).
- **Headers:** `public/_headers` lands in `dist/_headers`. Only Cloudflare reads it.
- **Brief:** it already has `deploy.target` with the enum `cloudflare-pages | vercel | netlify | vps | shared-hosting | undecided`.
- **Rule:** never deploy from a local machine. Generation never deploys.
- **Environment:**
  - GitHub's Ubuntu runners include `rsync` and `ssh`.
  - Cloud sessions do not, but `apt-get install -y rsync openssh-client` works.
  - `api.vercel.com` is not in this session's allowed domains.
  - The owner has no accounts on the new targets yet.

## Goals / Non-Goals

**Goals:**

- One command and one configuration shape for every target.
- No new npm dependency.
- Atomic switches where the host allows it.
- Headers preserved everywhere.
- Real deploys only from CI. Everything can be verified with dry runs, a fake API and local rsync.

**Non-Goals:**

- Netlify and DigitalOcean App Platform.
- Containers.
- Previews on a VPS.
- DNS automation.
- Per-site secrets.
- Migrating existing sites.

## Decisions

### 1. Configuration (`scripts/deploy/config.mjs`)

```json
{
  "target": "vps",
  "previews": "cloudflare",
  "cloudflare": { "pagesProject": "acme", "productionBranch": "main" },
  "vercel": { "project": "acme", "team": "team_x", "productionBranch": "main" },
  "vps": { "host": "203.0.113.10", "port": 22, "user": "deploy", "path": "/var/www/acme",
           "hostKey": "203.0.113.10 ssh-ed25519 AAAA...", "url": "https://acme.com", "keep": 5 },
  "shared": { "protocol": "ssh", "host": "srv123.hstgr.io", "port": 65002, "user": "u123",
              "path": "domains/acme.com/public_html", "hostKey": "...", "url": "https://acme.com" }
}
```

- **Target:** `target` defaults to `cloudflare`, and only the chosen target's section is required.
- **Previews:** `previews` is `native` for Cloudflare and Vercel. VPS and shared hosting default to `cloudflare`, and `none` is allowed.
- **Shared hosting protocol:** `protocol` is `ssh` or `ftps`. `ftp` is refused with exit 2.
- **Validation:** with the reasons. Exit 2 names the field.
- **Host key:** `hostKey` is a `known_hosts` line. It is public data, so it is committed, and it pins the server.
- **Brief mapping:** `cloudflare-pages` → `cloudflare`, `shared-hosting` → `shared`. `netlify` is reported as unsupported for now.

### 2. Command (`scripts/deploy.mjs`)

```text
deploy.mjs --site <slug> [--branch <name>] [--dry-run] [--json]
deploy.mjs --site <slug> --rollback          (vps only)
```

- **Inputs:** `--site` absent means the starter root. The branch defaults to `GITHUB_HEAD_REF || GITHUB_REF_NAME`.
- **Refusal outside CI:** without `--dry-run` and without `CI=true` and `GITHUB_ACTIONS=true`, the command exits 1 with "deploys run only from CI".
- **Output:** on success it prints one line of JSON (`{ target, environment: production|preview, url, aliasUrl? }`), which the workflow reads instead of parsing per target. With `--dry-run` it prints the plan:
  - target and environment;
  - file count and total size;
  - the generated header configuration;
  - the commands, with the key path and tokens redacted.
- **Secrets:** read only from `process.env`, and passed through the `mask()` and exact-redaction pattern from `ai-images`.
- **Cloudflare:** this target stays in the workflow (wrangler and its existing steps). `deploy.mjs` handles `vercel`, `vps` and `shared`, and for `cloudflare` it prints "use the wrangler steps", so the working path does not move in this change.

### 3. Header translation (`scripts/deploy/headers.mjs`)

It reuses the `_headers` parser from `scripts/report/headers.mjs`. Rules are `{ pattern, headers }` with Cloudflare path patterns (`/*`, `/_astro/*`). The translators:

- **Vercel:** `vercel.json` with `{ headers: [{ source: "/(.*)", headers: [...] }, { source: "/_astro/(.*)", ... }], cleanUrls: false, trailingSlash: true }`. It is uploaded with the files.
- **Caddy:** a site block snippet with `header` directives under `@astro path /_astro/*` matchers, `handle_errors` rewriting to `/404.html`, and `file_server`.
- **Nginx:** a `server` snippet with `add_header ... always`, `location /_astro/`, `error_page 404 /404.html`, `try_files $uri $uri/ =404`. Nginx's `add_header` inheritance is handled by repeating the global headers inside each location.
- **`.htaccess`:** `<IfModule mod_headers.c>` with `Header always set`, a `<FilesMatch>` or `<If "%{REQUEST_URI} =~ m#^/_astro/#">` block for the cache rule, `ErrorDocument 404 /404.html`, `Options -Indexes`, and a redirect to HTTPS behind `RewriteCond %{HTTPS} off` (works on LiteSpeed and Apache).

Every translator is a pure function with snapshot-style unit tests. A property test checks that each header of each rule appears in each output.

### 4. Vercel adapter (`scripts/deploy/vercel.mjs`)

1. Walk `dist/` and compute the SHA-1 and size of each file. Add the generated `vercel.json`.
2. Upload each file: `POST https://api.vercel.com/v2/files` with `Authorization: Bearer $VERCEL_TOKEN`, `x-vercel-digest: <sha1>`, `Content-Length`, and the body as the bytes. Use `?teamId=` when `team` is set. Uploads run with concurrency 4. A 200 answer means "already have it", so re-uploads are cheap.
3. `POST /v13/deployments?teamId=...` with `{ name: project, project, target: production|undefined, files: [{ file, sha, size }], projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null }, meta: { branch, commit } }`.
4. Poll `GET /v13/deployments/{id}` every 3 seconds, for up to 5 minutes, until `readyState` is `READY`. `ERROR` or `CANCELED` exits 1 with `errorMessage`.
5. **Output:**
   - the URL is `https://<deployment.url>`;
   - production also prints the project's production alias when the response lists it in `alias`;
   - previews print the deployment URL.

- **Configuration:** `VERCEL_API_URL` overrides the base URL; tests point it at a local fake server. `fetchImpl` is injectable.
- **Alternative rejected:** the `vercel` npm CLI. It is a heavy dependency, the factory already uses `fetch` for OpenAI, and the REST shape is documented (`/v2/files`, `/v13/deployments`).

### 5. rsync adapters (`scripts/deploy/rsync.mjs`)

- **SSH setup:** written to a temporary folder (`mkdtemp`, mode 0700) and deleted in `finally`:
  - the key from `DEPLOY_SSH_KEY`, written to a 0600 file;
  - `known_hosts` from `hostKey`;
  - `ssh -i <key> -p <port> -o IdentitiesOnly=yes -o UserKnownHostsFile=<tmp>/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes`.
- **VPS:**
  1. `rsync -az --delete --link-dest=<path>/current/ dist/ user@host:<path>/releases/<UTC timestamp>-<sha7>/`. Hard links to the current release keep uploads small.
  2. Over SSH: `ln -sfn releases/<id> <path>/current.tmp && mv -Tf <path>/current.tmp <path>/current`. `mv -T` makes the switch atomic.
  3. Prune to the last `keep` releases by listing them and removing the older ones. Removal is limited to `<path>/releases/` and to names matching the release-id pattern.
  4. `--rollback` points `current` at the previous release with the same atomic switch.
  5. The web server's root is `<path>/current`.
- **Shared hosting with SSH:** `rsync -az --delete-after --delay-updates dist/ user@host:<path>/`, followed by the generated `.htaccess`.
  - Files in the document root that the build never had are removed by `--delete-after`, so the path must be the site's own document root. The guide stresses this.
  - The command refuses a path that is empty, `/`, `~`, or that does not end in `public_html` or a folder named in the config's `allowPath`.
- **Path safety:** every remote path is validated against `^[A-Za-z0-9._/~-]+$`, and no shell metacharacters are allowed. Remote commands are passed as fixed argument lists, never built from unchecked strings.
- **Tests:**
  - **Plans:** the command plans (argv) are asserted exactly.
  - **Real rsync:** an integration test runs real rsync from one local folder to another, with the remote replaced by a local path through a test-only `transport: "local"` the CLI refuses outside tests. It checks the release layout, the atomic symlink, pruning to 5 and rollback.
  - **Shared hosting:** a test checks `--delete-after` and the `.htaccess` in place.
  - **Missing tools:** without rsync, the integration test fails with "install rsync". It never skips silently, and the docs give the apt command.

### 6. FTPS fallback (`scripts/deploy/ftps.mjs`)

- **Command:** `lftp -e "set ftp:ssl-force true; set ftp:ssl-protect-data true; set ssl:verify-certificate true; mirror --reverse --delete --verbose dist/ <path>/; put .htaccess -o <path>/.htaccess; bye" -u user,<password from env via LFTP_PASSWORD and --env-password> host`.
- **Password:** read from `DEPLOY_FTP_PASSWORD`, passed through the environment and never as an argument.
- **Installation:** in CI, `sudo apt-get install -y lftp` runs only when the target is `shared` with `ftps`.
- **Verification:** only the plan is unit-tested here, because there is no FTPS server in tests. The first real use verifies it, as the PR states.

### 7. CI wiring

- **Read the target:** a step `node scripts/deploy/config.mjs --site "$SITE" --github-output` writes `target`, `previews`, `production_branch` and `needs_secrets` to `GITHUB_OUTPUT`.
- **Secrets gate:** the gate step checks the secrets of the effective target for this run. That target is the site's own, or `cloudflare` when this is a preview and `previews` is `cloudflare`. It warns and skips if any secret is missing, never echoing values.
- **Cloudflare:** the existing wrangler steps run when the effective target is `cloudflare`.
- **Other targets:**
  - a `Deploy` step runs `node scripts/deploy.mjs --site "$SITE"` with `VERCEL_TOKEN` and `DEPLOY_SSH_KEY` or `DEPLOY_FTP_PASSWORD` in `env`, only for that step;
  - it parses the JSON line for `url`;
  - VPS and shared deploys run only on the production branch;
  - preview runs of those targets take the Cloudflare path, or skip with a comment line "no preview for target vps".
- **After the deploy:** the comment and the live report use the captured URL, as today.
- **Tests:** `tests/ci-workflow.test.mjs` asserts the dispatch structure.

### 8. Guides (`docs/deploy/`)

- **`cloudflare.md`:** today's flow, moved out of the README.
- **`vercel.md`:**
  - create a token with the deploy scope only;
  - optional team id;
  - `VERCEL_TOKEN` as a repository secret;
  - `site.config.json`;
  - domain in Vercel;
  - the report.
- **`vps.md`:** for a Hostinger VPS (KVM) and a DigitalOcean Droplet:
  - create a `deploy` user, add the public key to `authorized_keys`, disable password SSH;
  - `ssh-keyscan -t ed25519 host` checked against the provider's console fingerprint, giving `hostKey`;
  - firewall: 22, 80, 443;
  - Caddy (preferred: automatic HTTPS) or Nginx with Certbot, using the generated snippet;
  - folders;
  - DNS A/AAAA records;
  - rollback;
  - the report.
- **`shared-hosting.md`:** Hostinger hPanel:
  - SSH access (port 65002);
  - add the public key;
  - host key;
  - document root `domains/<domain>/public_html`;
  - FTPS fallback with an FTP account limited to that folder;
  - SSL in hPanel;
  - the report.

Each guide lists the secrets by name and never asks to paste them into chat or commit them.

## Risks / Trade-offs

- **[Vercel API shape changes, or the token scope is wrong]** → the endpoints follow Vercel's current docs (`/v2/files`, `/v13/deployments`). Errors print the status and the masked message. The first real deploy is a follow-up task.
- **[`--delete-after` on the wrong shared-hosting path wipes other files]** → strict path checks (it must end in `public_html` or a path in `allowPath`) and a guide warning. The dry run shows the target path.
- **[Leaked SSH key]** → the key lives only in the CI secret and a temporary 0600 file that is deleted afterwards. The guide recommends a dedicated `deploy` user and key, never root.
- **[Host key spoofing]** → `StrictHostKeyChecking=yes` with the pinned key. There is no trust on first use.
- **[No real-target verification in this change]** → fakes, local rsync and dry runs. The PR states it, and `docs/status.md` lists the first real deploy per target.
- **[CI workflow complexity grows]** → the dispatch logic lives in scripts (`config.mjs --github-output`, `deploy.mjs`), so the YAML stays thin, and a structure test asserts it.

## Migration Plan

1. Existing sites have no `target`, so they read as `cloudflare`, and CI behaves as today.
2. A customer site sets `target` and its section, and the owner adds the target's secrets. The next merge to `main` deploys there.
3. **Rollback:**
   - VPS: `deploy.mjs --rollback`, run from a manual `workflow_dispatch` input. The guide describes it as a follow-up if the button is not added.
   - Other targets: set `target` back to `cloudflare`.

## Implementation notes

Differences from the decisions above, found while implementing. Spec behavior is unchanged.

- **`.htaccess` and FTPS ride in the same upload (Decisions 5 and 6).** With `--delete-after` a separately uploaded `.htaccess` would be removed by the next run, and a trailing `put` is a second, non-atomic step. The deploy copies `dist/` into a staging folder inside the 0700 session folder, adds the generated `.htaccess`, and uploads that one tree (one `rsync`, one `lftp mirror`). `dist/` itself is never changed.
- **Extra safety flags.** rsync adds `--chmod=D755,F644` (the web server must read the files whatever the CI umask) and, for shared hosting, `--exclude=/.well-known/` so certificate challenges survive `--delete-after`. ssh adds `-F /dev/null` (ignore any user config), `-o GlobalKnownHostsFile=/dev/null` (only the pinned key counts) and `ConnectTimeout=20`.
- **A failed VPS upload removes its half release.** Otherwise a half-uploaded folder would count as a release and a later rollback could point at it. The `rm -rf` is limited to the release id validated against the release pattern.
- **The local test transport is a library dependency, not a configuration value (Decision 5).** `main(argv, io, { localRoot })` runs remote scripts with `sh -c` against a local folder. No flag or configuration key selects it (`vps.transport` is an unknown key and exits 2), and it is refused unless `NODE_TEST_CONTEXT` is set (Node's test runner sets it).
- **Dispatch (Decision 7).** `config.mjs --github-output` writes `deploy_via` (`wrangler`, `script`, `none`), `effective_target`, `secrets`, `preview_fallback`, `needs_lftp`, `is_production` and `production_branch`. The Cloudflare steps keep their text and gain one condition (`deploy_via == 'wrangler'`). `checkout` and `setup-node` now run before the gate (the target is read from the repository), which costs a few seconds on runs that skip the deploy. The gate receives only booleans (`secrets.X != ''`); the values of `VERCEL_TOKEN`, `DEPLOY_SSH_KEY` and `DEPLOY_FTP_PASSWORD` appear only in the `env` of the `Deploy to the site's target` step. The step id `target_deploy` feeds the live report and the comment through `steps.output.outputs.url || steps.target_deploy.outputs.url`. A gate `skip` output (`fork`, `no-preview`, `missing`) decides the "no preview" comment. `tests/ci-gate.test.mjs` runs the real gate script for each target and for the unchanged Cloudflare messages.
- **Rollback.** `deploy.mjs --rollback` exists and is tested; the manual `workflow_dispatch` input to run it is still a follow-up, as the migration plan allows. The VPS guide shows the equivalent two SSH commands.
- **Additions.** `scripts/deploy/files.mjs` (build listing with SHA-1) and `scripts/deploy/redact.mjs` (secret redaction); `--print-config` on the command (the generated header configuration, no CI needed); `config.mjs --from-brief --write` for the `/new-landing` skill (completes `vercel`, only reports what `vps` and `shared` still need, since a host key cannot come from a brief); `scripts/deploy.mjs` and `scripts/deploy/` are shared paths in `changed-sites.mjs`; a team that is not a `team_...` id is sent as `slug`.
- **Defaults.** Shared hosting over SSH defaults to port 65002 (Hostinger) and FTPS to 21; `vps.keep` is 2 to 50 (default 5); a `root` user and paths shallower than two folders (VPS) are refused.
