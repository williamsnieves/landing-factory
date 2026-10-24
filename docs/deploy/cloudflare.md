# Deploy to Cloudflare Pages

Cloudflare Pages is the default target: a site without `target` in its `site.config.json` deploys here, with a preview per branch and production from `main`. CI uses `wrangler pages deploy`; nothing is deployed from a local machine.

## Secrets

Add these as repository secrets (**Settings > Secrets and variables > Actions > New repository secret**). Never paste them into a chat or commit them.

| Secret                  | What it is                                                                        |
| ----------------------- | --------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | API token with one permission: **Account > Cloudflare Pages > Edit**              |
| `CLOUDFLARE_ACCOUNT_ID` | The account ID (dashboard home, right sidebar, or `dash.cloudflare.com/<id>/...`) |

Create the token at **My Profile > API Tokens > Create Token > Create Custom Token** and scope it to your account only.

## Site configuration

```json
{
  "target": "cloudflare",
  "cloudflare": { "pagesProject": "acme", "productionBranch": "main" }
}
```

`pagesProject` must be unique across Cloudflare Pages (lowercase letters, digits and `-`). CI creates the project on the first deploy if it does not exist. `new-site` writes this file for every new site.

## What CI does

- Push to `main`: production deployment at the project's production URL.
- Any other branch with a pull request: preview at `https://<branch-alias>.<project>.pages.dev`, one comment per site on the PR.
- Without the two secrets (or on a fork) the deploy steps are skipped with a warning and the job stays green.
- Headers come from `public/_headers`, which Cloudflare Pages reads from `dist/_headers`.

Other targets can also use Cloudflare for previews: a `vps` or `shared` site with `"previews": "cloudflare"` gets its pull request previews here (it needs the `cloudflare` section above).

## Custom domain

In the Cloudflare dashboard open **Workers & Pages > your project > Custom domains > Set up a custom domain** and follow the DNS steps. HTTPS is automatic. A new project's certificate can take a few minutes.

## Point the domain and run the report

Once the domain answers over HTTPS, check the final URL (TLS, redirects, headers, caching, private paths, 404):

```bash
npm run report -- --site <slug> --url https://<domain>
```
