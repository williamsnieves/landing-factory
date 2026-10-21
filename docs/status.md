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
| add-3d-scenes (opt-in Three.js scenes, 3D QA budgets, Met images), validated with `sites/samurai` | Merged (PR #13) and archived; production https://samurai-1v4.pages.dev |
| Product plan (`docs/product-plan.md`): archetypes, intake, report, deploy adapters, agent interface, 3D models | Agreed 2026-10-21; step 1 `add-design-archetypes` in progress: catalog, validator, `pick-archetypes`, `layout-signature` and the `layout-diversity` rule are implemented (tasks 1 to 3); the three-niche pilot (task 4) is next |

## How to generate a landing

```bash
QA_CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npm run new-landing -- <slug> --niche "..." [--refs a,b] [--auto] [--model sonnet]
```

Without `--auto` it stops after `sites/<slug>/PROPOSAL.md`; continue with `--resume --auto`. A full run takes about an hour (most of it Commons image downloads). Then review `sites/<slug>/RUN.md` and `npm run section-shots -- --site <slug>`, commit, and open a PR (CI deploys the preview to a new Pages project).

## Next

Follow `docs/product-plan.md`:

1. `add-design-archetypes` (archetype blends steered by the requirement and the references, real diversity measure), validated by the three-niche pilot. Archetypes are a starting grammar, not a template; the hard rules are the quality budgets, licensing and originality, and the layout diversity rule.
2. `add-brief-intake`; then the owner's digital-products landing as the first real customer test.
3. `add-landing-report`, `add-deploy-adapters`, `add-agent-interface`, `add-3d-models`; one landing per repository introduced gradually (export first).

Small fixes pending: panaderia process heading covered at 375 px; `new-landing.sh` final check without `--refs`.

## Known gaps and follow-ups

- Layout diversity calibration (2026-10-21, `qa.config.json` `diversity`: `minLayoutDistance` 0.2, `maxHashMatch` 0.5, `hashHamming` 10): panaderia and clinica-dental are close (distance 0.13, they would fail `layout-diversity` against each other); samurai is far from both (0.35 and 0.34). Fixtures: same layout in new colors 0.00 with 100% matching slices, one-feature restyles 0.04 to 0.14, a brutalist page 0.56. CI does not run `check-landing`, so the existing sites do not fail anything; the rule applies to a site under check against the others.

- `new-landing.sh`'s own final check runs `check-landing` without `--refs` (it receives pattern slugs, not URLs), so originality is only checked when the skill passes the sheets' source URLs. Map sheet slugs to their source URL in the script.
- samurai review (2026-10-21, owner): looks good; the sword was the only clearly 3D element; a navigable 3D samurai needs real models (`add-3d-models`).
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
