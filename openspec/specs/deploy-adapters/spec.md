# deploy-adapters Specification

## Purpose
Publishes a landing's static build to the host its customer uses (Cloudflare Pages, Vercel, a VPS or shared hosting) from CI only, with the same cache and security headers on every target, atomic releases where the host allows it, secrets kept out of the repository and output, and a guide per target that ends with the landing report on the final URL.

## Requirements

### Requirement: Deploy target per site
Each site's configuration SHALL name its deploy target (`cloudflare`, `vercel`, `vps` or `shared`) with that target's non-secret settings; a configuration without a target SHALL mean `cloudflare`, and an unknown target or a missing required setting SHALL stop the deploy with exit code 2 naming the field.

#### Scenario: Existing site
- **WHEN** a site's configuration has only the Cloudflare section
- **THEN** it deploys to Cloudflare Pages as before

#### Scenario: VPS without a host key
- **WHEN** a site's target is `vps` and its configuration has no pinned host key
- **THEN** the deploy command exits 2 naming the missing field and connects to nothing

### Requirement: Real deploys only from CI
The deploy command SHALL refuse a real deploy outside CI and SHALL offer a dry run that prints the plan (files, sizes, generated configuration, commands without secrets) and changes nothing locally or remotely.

#### Scenario: Local deploy attempt
- **WHEN** the deploy command runs without `--dry-run` outside CI
- **THEN** it exits 1 saying deploys run only from CI and sends nothing

#### Scenario: Dry run
- **WHEN** the deploy command runs with `--dry-run`
- **THEN** it prints the target, the file count and size, the generated header configuration and the commands, and no secret value

### Requirement: Same headers on every target
The deploy SHALL translate the built site's headers file into the target's own configuration (Vercel configuration, Caddy and Nginx snippets for a VPS, `.htaccess` for shared hosting), preserving long immutable caching of hashed assets, every security header and the 404 page.

#### Scenario: Shared hosting headers
- **WHEN** a site with HSTS, nosniff and immutable caching for `/_astro/*` deploys to shared hosting
- **THEN** the uploaded `.htaccess` sets those headers for the same paths and serves `404.html` for unknown paths

### Requirement: Vercel deploy
A Vercel deploy SHALL upload the build's files and create a deployment through the Vercel API with the token from the environment, production on the production branch and a preview on any other branch, wait until it is ready, and print its URL; a failed or timed-out deployment SHALL exit 1 with the reason.

#### Scenario: Preview deploy
- **WHEN** a branch other than the production branch deploys a Vercel site
- **THEN** a preview deployment is created and its URL is printed for the PR comment and the live report

### Requirement: Atomic VPS releases
A VPS deploy SHALL upload over SSH with the pinned host key into a new release folder, switch the served folder to it in one step, keep the last five releases and allow rolling back to the previous release.

#### Scenario: Interrupted upload
- **WHEN** the upload of a new release fails halfway
- **THEN** the served folder still points at the previous release and the deploy exits 1

#### Scenario: Rollback
- **WHEN** the rollback command runs for a VPS site with two releases
- **THEN** the served folder points at the previous release

### Requirement: Shared hosting deploy
A shared-hosting deploy SHALL upload over SSH with the pinned host key into the document root, applying changes at the end and removing files that are no longer in the build; when the host offers no SSH it SHALL use FTP over explicit TLS and MUST refuse plain FTP.

#### Scenario: Plain FTP configured
- **WHEN** a shared-hosting site is configured with plain FTP
- **THEN** the deploy exits 2 saying plain FTP sends the password in clear text

### Requirement: Secrets stay secret
Deploy credentials SHALL be read only from the environment and MUST NOT appear in output, logs, files written by the deploy or error messages; the SSH host key is pinned from the site configuration and host key checking is never disabled.

#### Scenario: Wrong token
- **WHEN** the Vercel API rejects the token and echoes it in the error
- **THEN** the printed error has the token masked

### Requirement: Guide per target
Each target SHALL have a guide that covers the account and secrets it needs, the server or panel setup, pointing the domain and running the landing report on the final URL.

#### Scenario: Owner sets up a Droplet
- **WHEN** the owner follows the VPS guide for a DigitalOcean Droplet
- **THEN** it ends with the report command on the domain's HTTPS URL
