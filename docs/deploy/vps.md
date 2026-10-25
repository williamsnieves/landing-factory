# Deploy to a VPS (Hostinger VPS or DigitalOcean Droplet)

A site with `"target": "vps"` is uploaded by CI over SSH with rsync into a new release folder, and a `current` symlink is switched to it in one step, so visitors never see a half-uploaded site. The last 5 releases are kept; rolling back is a symlink change. Production deploys from `main` only; pull request previews go to Cloudflare Pages when its secrets exist (`"previews": "cloudflare"`, the default) and otherwise the PR comment says there is no preview.

The server needs only SSH, `rsync` and a web server (Caddy or Nginx). Nothing else is installed by the deploy.

## Secrets

| Secret           | What it is                                                                        |
| ---------------- | --------------------------------------------------------------------------------- |
| `DEPLOY_SSH_KEY` | The private half of a key pair made only for deploying (OpenSSH or PEM, multiline) |

Create the pair on your own machine, never on the server. Never paste the private key into a chat or commit it:

```bash
ssh-keygen -t ed25519 -C "landing-factory deploy" -f ./deploy_key -N ""
```

Paste the content of `deploy_key` into the repository secret `DEPLOY_SSH_KEY` (**Settings > Secrets and variables > Actions**), put `deploy_key.pub` on the server (below), then delete both local files. One key serves every VPS site of the repository, so use one server per key or accept the shared access.

## 1. Create the server

- **Hostinger VPS (KVM):** pick Ubuntu 24.04 in hPanel > VPS. Note the IPv4 address. The panel shows the root password or lets you add an SSH key.
- **DigitalOcean Droplet:** Create > Droplets > Ubuntu 24.04. Add your own SSH key at creation. Note the IPv4 address.

## 2. Create the deploy user (never deploy as root)

Log in as root once (`ssh root@<ip>`) and run:

```bash
adduser --disabled-password --gecos "" deploy
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
# paste the content of deploy_key.pub into this file:
nano /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys && chown -R deploy:deploy /home/deploy/.ssh
apt-get update && apt-get install -y rsync
mkdir -p /var/www/acme/releases && chown -R deploy:deploy /var/www/acme
```

Then turn password logins off: in `/etc/ssh/sshd_config.d/50-hardening.conf` put `PasswordAuthentication no` and `PermitRootLogin prohibit-password`, and run `systemctl reload ssh`. Test `ssh -i deploy_key deploy@<ip>` from another terminal before closing the root session.

## 3. Firewall

Allow SSH, HTTP and HTTPS only:

```bash
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

On a DigitalOcean Droplet you can also use a Cloud Firewall with the same three ports. Hostinger has the equivalent under VPS > Security > Firewall.

## 4. Pin the server's host key

The deploy never trusts a key on first use: the server's host key is part of `site.config.json`. Read it and compare its fingerprint with the one in the provider's console (DigitalOcean: the Droplet's web console, `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`; Hostinger: the VPS browser terminal, same command):

```bash
ssh-keyscan -t ed25519 <ip>
ssh-keyscan -t ed25519 <ip> | ssh-keygen -lf -
```

The first command prints the line to put in `hostKey`. It is public data and is committed.

## 5. Site configuration

In `sites/<slug>/site.config.json`:

```json
{
  "target": "vps",
  "previews": "cloudflare",
  "cloudflare": { "pagesProject": "acme", "productionBranch": "main" },
  "vps": {
    "host": "203.0.113.10",
    "port": 22,
    "user": "deploy",
    "path": "/var/www/acme",
    "hostKey": "203.0.113.10 ssh-ed25519 AAAA...",
    "url": "https://acme.com",
    "keep": 5
  }
}
```

`path` must be absolute, two folders deep at least (`/var/www/acme`), and owned by the deploy user. The web server serves `<path>/current`. `previews` is `cloudflare` or `none`; `keep` is how many releases to keep (2 to 50). `root` as user is refused.

## 6. The web server

See the headers the server must send, generated from the site's build:

```bash
npm run build -w site-<slug>
node scripts/deploy.mjs --site <slug> --print-config
```

### Caddy (preferred: HTTPS is automatic)

```bash
apt-get install -y caddy
```

Put the generated `Caddyfile.snippet` into `/etc/caddy/Caddyfile` (replace the example host with your domain), then `systemctl reload caddy`. Caddy gets and renews the certificate by itself once the DNS record points to the server.

### Nginx with Certbot

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

Save the generated `nginx.conf.snippet` as `/etc/nginx/sites-available/acme`, link it into `sites-enabled`, run `nginx -t && systemctl reload nginx`, then `certbot --nginx -d acme.com -d www.acme.com`. Certbot adds the 443 listener and the redirect from HTTP to HTTPS, and renews on a timer. The snippet repeats the security headers in every `location` because Nginx does not inherit `add_header` into a block that sets its own.

## 7. Try it without deploying

```bash
node scripts/deploy.mjs --site <slug> --dry-run
```

Prints the commands (with the key path and the pinned `known_hosts` shown as placeholders), the release id and the generated server snippets. It connects to nothing. Real deploys run only from CI.

## 8. Deploying and rolling back

Merging to `main` runs QA, the static report, the upload and the switch, then the live report on `url`. Every release is a folder under `<path>/releases/`; unchanged files are hard links to the previous release, so uploads are small.

To roll back, switch `current` to the previous release over SSH (this is a symlink change, nothing is deleted):

```bash
ssh deploy@<ip> 'cd /var/www/acme && ls -1 releases && ln -sfn releases/<previous-id> current.tmp && mv -Tf current.tmp current'
```

`node scripts/deploy.mjs --site <slug> --rollback` does the same from CI. A button to run it (a manual workflow input) is a follow-up. To leave the VPS, set `target` back to `cloudflare`.

## Point the domain and run the report

Create the DNS records at your registrar or DNS host: an `A` record for the apex (and `AAAA` if the server has IPv6) and a `CNAME` or `A` for `www`, both to the server. When the domain answers over HTTPS, check the final URL:

```bash
npm run report -- --site <slug> --url https://<domain>
```
