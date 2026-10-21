# Project status

Read this first in a new or compacted session. Last updated: 2026-10-18 (add-new-landing-skill).

## Working agreements

- One OpenSpec change = one branch `change/<name>` = one PR. Pilot work uses `pilot/<slug>`.
- Never start the next change until the user says the previous PR was merged (a GitHub merge event alone is not the go-ahead).
- After each merge: archive the change (`openspec archive <name> --yes`) as the first commit of the next branch.
- Implementation is delegated to a Sonnet subagent; the main session reviews the diff, re-runs the full checks in a clean clone, then commits, pushes, opens the PR and watches CI.
- Chat with the user in Spanish; all repo docs, commits and PR descriptions in English (see CLAUDE.md).
- Before pushing: `npm ci && npx prettier --check . && npm run check && npm run check:sites && npm run validate:patterns && npm test && npm run qa` (plus `npm run qa -- --site <slug>` when a site changed) and `openspec validate --all --strict`.

## Where we are

| Roadmap step | State |
| --- | --- |
| setup-astro-starter, setup-ai-tooling, add-qa-pipeline, add-cloudflare-preview-deploy, add-analyze-reference-skill, fix-recon-scroll-containers, add-site-workspaces | Merged and archived |
| Pilot step 1-2: bakery references analyzed, landing proposal approved | Merged (PR #9): `patterns/{sonomabakery,blackstarbakery,bernicebakery}-com.md`, `sites/panaderia/PROPOSAL.md` |
| Pilot step 3-6: build the bakery landing in `sites/panaderia/` | Merged (PR #11), production https://panaderia-a3o.pages.dev; lessons in `docs/pilot-panaderia-lessons.md` |
| add-new-landing-skill (`/new-landing`, one command per landing) | Merged (PR #12) and archived; `sites/clinica-dental` in production at https://clinica-dental-9pd.pages.dev |
| add-3d-scenes (opt-in Three.js scenes, 3D QA budgets, Met images), validated with `sites/samurai` | On `change/add-3d-scenes`, PR open; scene still to be checked on a real device (task 4.2) |

## How to generate a landing

```bash
QA_CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npm run new-landing -- <slug> --niche "..." [--refs a,b] [--auto] [--model sonnet]
```

Without `--auto` it stops after `sites/<slug>/PROPOSAL.md`; continue with `--resume --auto`. A full run takes about an hour (most of it Commons image downloads). Then review `sites/<slug>/RUN.md` and `npm run section-shots -- --site <slug>`, commit, and open a PR (CI deploys the preview to a new Pages project).

## Next

1. `add-3d-scenes`: 3D support validated with a samurai landing (references: crazy.studio, experience2026.funtech.inc; 3D modeled in code, public-domain museum images). Decided 2026-10-21: 3D before the three-niche pilot.
2. Follow-up pilot (roadmap MVP check): three different niches with `new-landing.sh --auto`, one PR, checked for diversity by `check-landing`.

## Known gaps and follow-ups

- `new-landing.sh`'s own final check runs `check-landing` without `--refs` (it receives pattern slugs, not URLs), so originality is only checked when the skill passes the sheets' source URLs. Map sheet slugs to their source URL in the script.
- 3D: headless QA renders WebGL with SwiftShader; it checks errors, fallbacks and budgets, not looks. Mobile performance with scenes sits near the limit (samurai: 93).
- `sites/samurai`: historical copy should get an expert read before any public use (Muromachi dating of the katana, the ninja/samurai myth row, "in less than ten years" for 1868-1876); `src/data/sources.ts` is hand-written next to `assets.json`.

- panaderia at 375 px: the process heading "Cuatro pasos, ningún atajo." is partly covered by the arch photo (found with `section-shots`; QA does not catch it). Small site fix.
- clinica-dental (generated, kept as is for the validation): the "Llamar" button text wraps at 375 px; the aligners photo is weak; only 7 distinct photos because of Commons rate limits.
- Wikimedia Commons rate-limits the shared egress (HTTP 429); image sourcing dominates run time. A second open source (or an Unsplash API key) would help.
- `claude -p` ignores `.claude/settings.json` permissions in an untrusted folder; `new-landing.sh` passes them with `--allowedTools`. Keep that list reviewed.

- `/analyze-reference` cannot scroll wheel-driven virtual scrollers (main element clipped, content moved by `transform`, as on sonomabakery.com): recon reports `document` and captures one screen. Needs a recon change (drive scrolling with wheel events when scrollTop does not move).
- Deploy task 2.1 (a commit with failing QA must not deploy) is not yet exercised on a real PR.
- Astro Docs MCP (`mcp.docs.astro.build`) may be blocked by the cloud network policy; add it to the environment's allowed domains if needed.
- The pattern validator rejects quoted `focus` values longer than 12 words: keep `focus` short.

## Environment facts

- Cloudflare Pages projects (names got a suffix because the base names were taken): starter `landing-factory-71t` (https://landing-factory-71t.pages.dev), bakery `panaderia-a3o` (https://panaderia-a3o.pages.dev), dental clinic `clinica-dental-9pd` (https://clinica-dental-9pd.pages.dev). CI creates a new site's project on its first deploy. Preview aliases: `https://<branch-alias>.<project>.pages.dev`.
- GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are repository secrets (not environment secrets).
- Cloud session network: allowed domains include the three bakery sites, their CDNs (`cdn.sanity.io`, `cdnjs.cloudflare.com`, `unpkg.com`, `use.typekit.net`, `cdn.shopify.com`) and `*.pages.dev`. New reference sites need their domains added by the user.
- Chromium for Playwright: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (matches the pinned `playwright@1.56.1`).
