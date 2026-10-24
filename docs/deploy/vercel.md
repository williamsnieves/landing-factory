# Deploy to Vercel

A site with `"target": "vercel"` is deployed by `node scripts/deploy.mjs` from CI through the Vercel REST API (no Vercel CLI): it uploads each file by its SHA-1, creates a deployment (production on the production branch, a preview on any other branch), waits until it is ready and passes its URL to the pull request comment and the landing report.

## Secrets

| Secret         | What it is                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `VERCEL_TOKEN` | A Vercel access token. Create it under **Account Settings > Tokens**, scope it to the team, and give it a short expiry |

Add it as a repository secret (**Settings > Secrets and variables > Actions**). It is read only from the environment of the deploy step; never paste it into a chat or commit it. One token serves every Vercel site of the repository.

## Site configuration

In `sites/<slug>/site.config.json`:

```json
{
  "target": "vercel",
  "vercel": { "project": "acme", "team": "team_xxxxxxxx", "productionBranch": "main" }
}
```

- `project`: the Vercel project name. Vercel creates it on the first deployment.
- `team`: optional. A team id (`team_...`, **Team Settings > General**) or a team slug. Leave it out for a personal account.
- `productionBranch`: defaults to `main`.

Previews are native (`previews` is always `native` for this target). Preview deployments are protected by default (Vercel Authentication): the live report would see a login page. For a site that should be checked on every preview, turn the protection off for previews in **Project Settings > Deployment Protection**.

## Headers and 404

The deploy turns `dist/_headers` into a `vercel.json` uploaded with the files: the same security headers on every path, `/_astro/*` cached for a year as `immutable`, trailing slashes as Astro writes them. Vercel serves `404.html` for unknown paths by itself. See the generated file with `node scripts/deploy.mjs --site <slug> --dry-run`.

## Try it without deploying

```bash
node scripts/deploy.mjs --site <slug> --dry-run
```

Prints the API calls, the files and the generated `vercel.json`; it sends nothing. Real deploys run only from CI.

## Domain

In Vercel open **Project > Settings > Domains**, add the domain and create the DNS record Vercel shows (an `A` record for the apex, a `CNAME` for `www`). HTTPS certificates are automatic.

## Point the domain and run the report

When the domain answers over HTTPS, check the final URL:

```bash
npm run report -- --site <slug> --url https://<domain>
```
