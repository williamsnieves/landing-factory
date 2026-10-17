# Design

## Context

See `proposal.md` — Why. The site is 100% static (`dist/`). QA (`add-qa-pipeline`) already runs in Actions.

## Goals / Non-Goals

**Goals:** per-branch previews and production with a push, gated by QA.

**Non-Goals:** custom domains, analytics, Cloudflare functions/SSR.

## Decisions

1. **Deploy from GitHub Actions with `wrangler pages deploy`** instead of Cloudflare's native Git integration. Reason: the native integration cannot wait for our QA and deploys even when it fails. With Actions, the `deploy` job has `needs: qa`. Alternative: native integration + "branch build controls" → simpler but no gate.
2. **One `ci.yml` workflow** with `qa` → `deploy` jobs (replacing `qa.yml`, reusing its steps) to avoid building twice: `qa` uploads `dist/` as an artifact and `deploy` downloads it.
3. **`--branch=${{ github.head_ref || github.ref_name }}`**: Pages creates per-branch aliases (`<branch>.<project>.pages.dev`), giving a stable URL.
4. **PR comment** via `marocchino/sticky-pull-request-comment` (or a script with `actions/github-script` and an HTML marker) so it updates instead of duplicating.
5. **PRs from forks** don't deploy (no secrets); the job is skipped with a message.
6. **Cloudflare Pages vs Workers Static Assets**: Cloudflare is steering new sites to Workers; we keep Pages per the roadmap and because per-branch previews are built in. If Pages is deprecated, migrating means changing the deploy command.

## Risks / Trade-offs

- [Token with excessive permissions] → document a token with only "Cloudflare Pages: Edit".
- [Long branch names or names with `/` produce truncated aliases] → Pages normalizes them; document the URL format.
- [Every generated site will need its own Pages project] → the project name is read from `site.config.json`/a variable; `add-new-landing-skill` fills it in.
