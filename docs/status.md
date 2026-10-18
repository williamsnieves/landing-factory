# Project status

Read this first in a new or compacted session. Last updated: 2026-10-18.

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
| Pilot step 3-6: build the bakery landing in `sites/panaderia/` | Built on `pilot/panaderia-build`, PR open for review |
| add-new-landing-skill (`/new-landing`, one command per landing) | Planned, after the pilot; its plan already targets `sites/<slug>/` |

## Next steps (pilot)

1. ~~Archive `add-site-workspaces` on a new branch `pilot/panaderia-build`.~~ Done.
2. ~~Design system~~ Done: `design-system/panaderia/MASTER.md` and the site tokens (Fraunces + Inter, self-hosted).
3. ~~Build~~ Done: 9 sections + gluten-free block, Commons photos in `CREDITS.md`, new `data-marquee-scrub` and `data-pin-steps` primitives (site only).
4. ~~QA loop~~ Done: site QA passed (Lighthouse worst 99/100/100, 0 impeccable findings). PR with preview: review it, then merge.
5. ~~Lessons~~ Done: `docs/pilot-panaderia-lessons.md` (input for add-new-landing-skill task 0.1).
6. After merge: production at https://panaderia-a3o.pages.dev; then start `add-new-landing-skill` (archive nothing first: the pilot is not an OpenSpec change).

## Known gaps and follow-ups

- `/analyze-reference` cannot scroll wheel-driven virtual scrollers (main element clipped, content moved by `transform`, as on sonomabakery.com): recon reports `document` and captures one screen. Needs a recon change (drive scrolling with wheel events when scrollTop does not move).
- Deploy task 2.1 (a commit with failing QA must not deploy) is not yet exercised on a real PR.
- Astro Docs MCP (`mcp.docs.astro.build`) may be blocked by the cloud network policy; add it to the environment's allowed domains if needed.
- The pattern validator rejects quoted `focus` values longer than 12 words: keep `focus` short.

## Environment facts

- Cloudflare Pages projects (names got a suffix because the base names were taken): starter `landing-factory-71t` (https://landing-factory-71t.pages.dev), bakery `panaderia-a3o` (https://panaderia-a3o.pages.dev after the first `main` deploy). Preview aliases: `https://<branch-alias>.<project>.pages.dev`.
- GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are repository secrets (not environment secrets).
- Cloud session network: allowed domains include the three bakery sites, their CDNs (`cdn.sanity.io`, `cdnjs.cloudflare.com`, `unpkg.com`, `use.typekit.net`, `cdn.shopify.com`) and `*.pages.dev`. New reference sites need their domains added by the user.
- Chromium for Playwright: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (matches the pinned `playwright@1.56.1`).
