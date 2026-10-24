# Deploy to shared hosting (Hostinger web hosting)

A site with `"target": "shared"` is uploaded by CI over SSH with rsync into the site's document root (`public_html`). The changes are applied at the end of the transfer and files that are no longer in the build are removed. Hostinger's web hosting plans include SSH on port `65002`. When a plan has no SSH, the fallback is FTP over explicit TLS (FTPS). Plain FTP is refused because it sends the password in clear text.

Production deploys from `main` only. Pull request previews go to Cloudflare Pages when `"previews": "cloudflare"` and its secrets exist; the default is `"cloudflare"`, and `"none"` (used in the example below) deploys nothing on a branch: the PR comment then says there is no preview.

## Secrets

| Secret                | When                                                                              |
| --------------------- | --------------------------------------------------------------------------------- |
| `DEPLOY_SSH_KEY`      | `protocol: "ssh"` (default): the private half of a key made only for deploying    |
| `DEPLOY_FTP_PASSWORD` | `protocol: "ftps"`: the password of an FTP account limited to the document root   |

Add them under **Settings > Secrets and variables > Actions**. Never paste them into a chat or commit them.

## 1. Enable SSH and add the key (hPanel)

1. In **hPanel > Websites > Manage > Advanced > SSH Access**, enable SSH. Note the IP or host name, the port (`65002`) and the username (like `u123456789`).
2. Make a key pair on your own machine: `ssh-keygen -t ed25519 -C "landing-factory deploy" -f ./deploy_key -N ""`.
3. In the same page, **Add SSH key**, paste the content of `deploy_key.pub`.
4. Paste the content of `deploy_key` into the repository secret `DEPLOY_SSH_KEY`, then delete both local files.

## 2. Pin the server's host key

```bash
ssh-keyscan -t ed25519 -p 65002 <host>
```

Put the printed line (it starts with `[<host>]:65002`) in `hostKey`. Compare its fingerprint (`ssh-keyscan ... | ssh-keygen -lf -`) with the one Hostinger shows for the server if it lists it. The line is public data and is committed.

## 3. The document root

Hostinger puts each domain's site in `domains/<domain>/public_html` under the account home. Use that path, relative to the home folder:

```bash
ssh -p 65002 u123456789@<host> 'ls -la domains/acme.com/public_html'
```

**The upload deletes everything in that folder that is not in the build** (except `.well-known/`, which hosts certificate challenges). Point `path` only at the folder that belongs to this site. The deploy refuses a path that does not end in `public_html` unless you list it in `allowPath`, and it refuses `/`, `~`, empty paths and `..`.

## 4. Site configuration

In `sites/<slug>/site.config.json`:

```json
{
  "target": "shared",
  "previews": "none",
  "shared": {
    "protocol": "ssh",
    "host": "srv123.hstgr.io",
    "port": 65002,
    "user": "u123456789",
    "path": "domains/acme.com/public_html",
    "hostKey": "[srv123.hstgr.io]:65002 ssh-ed25519 AAAA...",
    "url": "https://acme.com"
  }
}
```

`protocol` is `ssh` or `ftps`; `ftp` is rejected. `previews` is `none` or `cloudflare` (then the `cloudflare` section is required).

## 5. FTPS fallback (no SSH on the plan)

1. In **hPanel > Files > FTP Accounts**, create an account whose folder is the document root only. Use a long random password.
2. Set `DEPLOY_FTP_PASSWORD`, and use `"protocol": "ftps"` with the FTP host, port `21` and the account name. There is no `hostKey` for FTPS: the server's TLS certificate is verified.
3. CI installs `lftp` for this case only. The transfer forces TLS on the control and data channels and verifies the certificate.

The FTPS path is tested by its command plan only (no FTPS server in tests); the first real deploy confirms it.

## 6. HTTPS and headers

Enable the free SSL certificate in **hPanel > Security > SSL** and turn on **Force HTTPS**. The deploy uploads an `.htaccess` generated from the build's headers: security headers on every path, a year of `immutable` caching for `/_astro/*`, the `404.html` page, no directory listings and a redirect from HTTP to HTTPS. Apache and LiteSpeed (Hostinger's servers) both read it; it needs `mod_headers`, which Hostinger enables. See it with:

```bash
node scripts/deploy.mjs --site <slug> --dry-run
```

The dry run connects to nothing. Real deploys run only from CI.

## Point the domain and run the report

Point the domain's name servers (or its `A` record) to Hostinger as hPanel shows under **Domains**. When the domain answers over HTTPS, check the final URL:

```bash
npm run report -- --site <slug> --url https://<domain>
```
