# Project status

Read this first in a new or compacted session. Last updated: 2026-10-28 (add-seo merged, PR #37, and archived; reference sheets merged, PR #36; the real-estate end-to-end test `casavela` is running its directions on `change/casavela-test`).

## Working agreements

- One OpenSpec change = one branch `change/<name>` = one PR. Site changes (no spec change) also get their own `change/<name>` branch and PR. Pilot work uses `pilot/<slug>`.
- Never start the next change until the user says the previous PR was merged (a GitHub merge event alone is not the go-ahead).
- After each merge: archive the change (`openspec archive <name> --yes`) as the first commit of the next branch.
- Implementation is delegated to a Sonnet subagent; the main session reviews the diff, re-runs the full checks in a clean clone, then commits, pushes, opens the PR and watches CI. Independent work can run in a subagent with `isolation: "worktree"` (create the branch from `origin/main` inside it; remove the worktree after pushing).
- Chat with the user in Spanish; all repo docs, commits and PR descriptions in English (see CLAUDE.md).
- Before pushing: `npm ci && npx prettier --check . && npm run check && npm run check:sites && npm run validate:patterns && npm run validate:archetypes && npm test && npm run qa` (plus `npm run qa -- --site <slug>` when a site changed) and `openspec validate --all --strict`.
- This session cannot re-run GitHub Actions jobs (the API answers 403). When a job fails for a reason outside the PR (runner noise, a new Pages project's TLS), explain it once in a PR comment and ask the owner to press "Re-run failed jobs".

## Where we are

| Roadmap step | State |
| --- | --- |
| setup-astro-starter, setup-ai-tooling, add-qa-pipeline, add-cloudflare-preview-deploy, add-analyze-reference-skill, fix-recon-scroll-containers, add-site-workspaces | Merged and archived |
| Pilot: bakery references, proposal, build (`sites/panaderia`) | Merged (PR #9, #11), production https://panaderia-a3o.pages.dev; lessons in `docs/pilot-panaderia-lessons.md` |
| add-new-landing-skill (`/new-landing`) | Merged (PR #12); `sites/clinica-dental` at https://clinica-dental-9pd.pages.dev |
| add-3d-scenes (opt-in Three.js scenes), validated with `sites/samurai` | Merged (PR #13); https://samurai-1v4.pages.dev |
| Product plan (`docs/product-plan.md`) | Agreed 2026-10-21 |
| add-design-archetypes, validated with `sites/{estudio-arquitectura,festival-electronica,app-finanzas}` | Merged (PR #14) |
| add-brief-intake (`brief.json`, `/brief-intake`) | Merged (PR #15) |
| Owner's digital-products landing `sites/tupathdigital` | Merged (PR #16, #17); https://tupathdigital.pages.dev |
| add-landing-report (OWASP Top 10:2025, performance, starter CSP/HSTS/COOP) | Merged (PR #18) |
| add-legal-compliance (cookies, trackers, legal pages from the brief, price claims) | Merged (PR #19) |
| add-ai-images (OpenAI images as a recorded source) | Merged (PR #20, smoke test PR #21) |
| add-deploy-adapters (Vercel, VPS, shared hosting from CI) | Merged (PR #22); real deploys per target pending accounts |
| add-agent-interface (local MCP server, no publishing; cost per run in `RUN.md`) | Merged (PR #23) and archived. The server connects in Claude Code sessions (`list_landings` worked from a real session). First real `generate_landing` through the server not run yet |
| tupathdigital legal follow-up (markets US and EU, holder name, privacy contact, `/privacy/`) | Merged (PR #24) |
| tupathdigital hardening (script CSP, HSTS, COOP, 404 page) | Merged (PR #25); live report 0 warn |
| add-personal-brand-support (default 404 for new sites; owner AI portrait as the one person exception) | Merged (PR #26) and archived |
| add-bilingual-landing (opt-in multi-locale landings on Astro i18n routing) | Merged (PR #27) and archived |
| Owner's personal-brand landing `sites/personal-brand` (bilingual) | Merged (PR #28); moved to its own repository (see the next rows) |
| add-site-export (`npm run export`: one site as a standalone repository) | Merged (PR #29) and archived |
| add-code-quality (ESLint, knip, optional site layers, architecture contract) | Merged (PR #30) and archived |
| personal-brand handoff (Vercel target, export, `EXPORTED.json`) | Merged (PR #31; a site change, nothing to archive). Live at https://williansnieves.com from https://github.com/williamsnieves/personal-brand |
| add-landing-handoff (handoff preflight and owner checklist, `/landing-handoff` skill, domain live report in exported repositories) | Merged (PR #32) and archived. personal-brand refreshed from a fresh export (williamsnieves/personal-brand#1, merged): its production run checked https://williansnieves.com, 0 fail, 1 warn (unknown path answers 308 before the 404) |
| add-landing-preview (2 or 3 visual directions before the full build, recorded choice, `preview_landing` and `choose_direction`) | Merged (PR #33) and archived. First real directions run not done yet (owner: later) |
| add-landing-revise (revision rounds, sync to the managed repository, transfer checklist and record, `revise_landing`) | Merged (PR #34) and archived. First real revision round not run yet |
| Channels decision (product plan step 12) | Merged (PR #35); docs only |
| Reference sheets linear-app, stripe-com, vercel-com, framer-com (owner references) | Merged (PR #36). raycast.com skipped (recon screenshot timeout; retry later) |
| add-seo (vendored `seo-audit` and `schema` skills, brief `seo` fields, Open Graph, JSON-LD, sitemap and robots.txt in new sites, `seo` report area) | Merged (PR #37) and archived |
| End-to-end test of track 1: `sites/casavela` (fictional real-estate agency and mortgage adviser, Valencia, Spanish) | Directions run started 2026-10-28T21:56:35Z on `change/casavela-test`, not finished at the last update |

## Resume here (2026-10-26)

`main` has everything up to PR #37 (add-seo). Branch `change/casavela-test` holds the add-seo archive commit and this status; the casavela files are being written by the run and are not committed yet.

**Resume the casavela test here (2026-10-28):**
- Brief: `sites/casavela/brief.json` (also in the session scratchpad as `casavela-brief.json`). Fictional business "Casavela Inmobiliaria", Valencia, `kind: service`, `legal.regulated: true` (mortgages; the calculator carries a notice that it is indicative), no `legal.markets`, `brand.aiImages` empty (no AI images). Every contact value is an example and listed in `assumed`: phone `+34 600 000 000`, WhatsApp `https://wa.me/34600000000` (primary call to action), `tel:` as secondary, `hola@example.com`, an example address and hours. SEO: primary keyword "valoración de vivienda gratis en Valencia", area Valencia, Burjassot, Paterna, Mislata, `schemaType: RealEstateAgent`. Liked references: `stripe-com` (stat strip), `framer-com` (sticky panel for the mortgage calculator). No form (lead forms are `add-lead-forms`, later).
- Command: `scripts/new-landing.sh casavela --brief <brief> --directions --auto` with `QA_CHROME_PATH` set, started 2026-10-28T21:56:35Z in the background; log `sites/casavela/.run.log`. The "Ignoring 53 permissions.allow entries ... workspace has not been trusted" line is harmless: `new-landing.sh` passes `--allowedTools` explicitly.
- When it ends: read `RUN.md` (`Result: directions` expected), `DIRECTIONS.md` and the `Usage:` line; run `node scripts/directions.mjs check --site casavela`; then `npm install` if the lockfile changed, commit the site and push `change/casavela-test`, open the pull request so CI deploys the Pages preview, and send the owner `https://change-casavela-test.casavela.pages.dev/directions/a/` (and `/b/`, `/c/`). Record duration and cost in `docs/customer-runs.md`.
- Then: the owner picks a direction (`node scripts/directions.mjs choose --site casavela --direction <id> --notes "..."`), `scripts/new-landing.sh casavela --brief sites/casavela/brief.json --resume --auto` builds the landing, one revision round with feedback the owner writes as the customer (`npm run revise -- casavela --feedback <file>`), every cost and time into `docs/customer-runs.md`, and fix whatever the first real runs of directions and revisions show.

Next after the test, in this order (owner, 2026-10-28):

1. Finish the casavela test (above). Lead forms (`add-lead-forms`) are needed before selling to this niche.
2. A `product-led-saas` archetype from the four reference sheets (lends `ui-frame-hero`, `two-tone-heading`, `logo-strip-under-hero`; signals technical, premium, conversion-first), a small change of its own.
3. Prospect mode (`add-prospect-landings`): public facts with sources, no prospect brand assets, `noindex` until sold, a sales kit.
4. tupathdigital to production in a private repository, last (owner).

**Two tracks and the repository (owner, 2026-10-28, `docs/channels.md`):** track 1, the owner builds landings and then offers them; track 2 later, a self-serve web app driven by the Agent SDK with the same harness; Telegram serves both. The factory repository stays public (free CI) until the flow is polished and tupathdigital is in production, then goes private.

**The session's network:** the owner added linear.app, stripe.com, vercel.com, framer.com, raycast.com and their CDNs to the environment's allowed domains (2026-10-28).

**Channels (owner decision, 2026-10-28, `docs/channels.md`):** one engine and thin clients; the web app is the source of truth (directions, choice and comments, approval, structured data, rounds, later billing); chat is the way in and for notifications (interview, "preview ready", small changes), Telegram before WhatsApp; publishing, sync and transfer stay with the owner. Where the engine runs (VPS, GitHub Actions or cloud sessions) is open and is decided from the measured customer runs.

**Delivery model (owner decision, 2026-10-27): managed, with transfer.** The owner shows a preview (`--directions`, optional), builds in the factory, creates a private or public repository in his own account and exports to it (`/landing-handoff`), hosted on his own Vercel or Cloudflare account. Customer changes are revision rounds in the factory (`npm run revise`), carried into the repository with `sync-export.mjs` as a pull request. If the customer wants the project, the repository and responsibility are transferred (`handoff.mjs transfer-plan`, then `transfer.mjs record`); the factory then leaves it alone.

**Pending real runs (owner: later):** the first `--directions` run (cost per direction, estimate $1 to $1.50) and the first real revision round. A sync of `personal-brand` (2026-10-27, `--no-brief`) changed nothing, as expected right after its refresh.

**add-landing-handoff in short** (see its `proposal.md`, `design.md`, `tasks.md`):
- `scripts/handoff.mjs check --site <slug> [--visibility public|private]`: read-only preflight (not exported, no unused layer, valid `site.config.json`, `site` set in `astro.config.mjs`, brief `deploy.domain` and `deploy.target` agree; warns when a public repository would carry `brief.json`).
- `scripts/handoff.mjs plan --site <slug> --repo <owner>/<name> --visibility ...`: the owner's checklist in Markdown (empty repository and app access, secrets by name, first run by hand, domain steps with the apex/www choice from `site`, where the DNS really lives, cleanup of the old host).
- `/landing-handoff <slug>` skill: the 11-phase flow of the first handoff, with stop points and hard rules (no secrets in chat, no repository creation or workflow dispatch by the agent, no DNS changes).
- Exported repositories: `landing-report.mjs --site-url` (origin of the canonical URL in `dist/index.html`) and a production-only live report on the landing's own domain (unreachable domain: `not-run`, job green; reachable and failing: job red).
- `docs/handoff.md`: delivery models (managed, managed with transfer, customer's own account; only the last is automated), DNS cases, GitHub App limits.
- Follow-up after it merges: refresh `williamsnieves/personal-brand`'s workflow and `scripts/` from a fresh export so it gets the domain report (a small push to that repository).

**The owner's landing moved (2026-10-26), the first real handoff and the first real Vercel deploy of the factory:**
- Repository: https://github.com/williamsnieves/personal-brand (public, owner's account), one initial commit made from `npm run export -- --site personal-brand --no-brief`. The owner created the empty repository: the Claude GitHub App cannot create repositories (403 "Resource not accessible by integration") nor dispatch workflows; it can push once the repository is in the app's access (the owner's installation covers all repositories).
- CI there: run 1 (push) passed QA, lint and the static report and skipped the deploy without `VERCEL_TOKEN`; run 2 (manual, after the owner added the secret) deployed to Vercel production through `scripts/deploy.mjs` (project `personal-brand` in the owner's personal account, scope `willians-nieves-projects`, alias https://personal-brand-theta-ten.vercel.app) and the live report on the deployment URL passed (0 fail, 3 warn).
- Domain: the DNS was Netlify DNS (Namecheap "Custom DNS" `dns1-4.p05.nsone.net`, two Netlify records, no MX). Now Namecheap BasicDNS with `A @ 216.198.79.1` and `CNAME www e23985b8cab511d7.vercel-dns-017.com` (values Vercel showed; the legacy `76.76.21.21` and `cname.vercel-dns.com` still work). In Vercel, `williansnieves.com` is the production domain (apex kept, since `site` in `astro.config.mjs` and the canonical and hreflang URLs use it; Vercel's "redirect apex to www" default was unchecked) and `www` redirects with a 308. The owner confirmed the domain serves the new site.
- Cleanup done by the owner (2026-10-26): the Netlify site and DNS zone and the old Bitbucket repository are deleted.
- Live report on `https://williansnieves.com` (2026-10-26, from this session through `--site-url` on a fresh export, the proxy now reaches the domain): passed, 0 fail, 1 warn (an unknown path answers 308, Vercel's trailing-slash redirect, before the 404), 1 not run (plain HTTP did not resolve through the proxy). add-landing-handoff also makes the owner's CI check the domain on every production deploy.

**Next (product plan steps 11 and 12, `docs/product-plan.md`):**
1. `add-landing-handoff` (merged and archived, see above). Lessons it encodes: the app cannot create repositories or dispatch workflows; the Vercel apex/www choice must match `site`; Namecheap only shows host records after switching to BasicDNS; preview and deployment URLs need the domain in this session's allowed list to be checked from here. For customers, the managed model (a factory GitHub organization and Vercel team, transfer on request) needs a GitHub App that can create repositories.
2. `add-landing-preview` (merged and archived): 2 or 3 short visual directions before the full build; the owner relays the choice (`directions.mjs choose`). `add-landing-revise` (implemented, PR open): revision rounds, sync and transfer.
3. Channels decision: recorded (`docs/channels.md`); building waits for 3 to 5 customers recorded in `docs/customer-runs.md`.

Other items the owner can pick: tupathdigital coupons (reminder below), hardening for the other six sites, the factory follow-ups listed below, `add-3d-models`, the first real `generate_landing` through the MCP server.

Reminder scheduled for 2026-11-01 (trigger `trig_013qv2DNicfU16Ah9auQ5uWb`): the tupathdigital coupons FALL2026 (Etsy) and 92xsh57 (Gumroad) end on 31 October 2026; offer the owner to update or remove them.

## The owner's personal-brand landing (merged, PR #28)

- **Inputs:** `sites/personal-brand/brief.json` (from `/brief-intake personal-brand`: personal brand, `languages: ["en", "es"]`, tone "like himself, a touch of humor, professional", free palette, no market so no legal pages, no call to action and no email by his choice; LinkedIn `https://www.linkedin.com/in/willians-nieves` is the only access link, GitHub in the footer), `CONTENT.md` (facts from his CV and the old Vue site; phone and email left out on purpose), the pattern sheets `product-inc`, `sankar-work`, `sebg-ch` (owner's references, robots checked), his `{W}` logo SVG and his ChatGPT portrait.
- **Design:** concept "Two halves": the half-human, half-machine portrait guides a dark, glowing page with a color field per section; sections hero, about, a pinned AI-engineering stage, career path (Glintt 2025 back to Teravision 2015, CV dates), skills (incl. "JEV, a System 1 decision model", owner wording), beyond the code, education; 404 in the same design. English at `/`, Spanish at `/es/`.
- **AI images (all recorded in `assets.json`):** the owner portrait (`--subject owner`, ChatGPT, GPT-6 per the owner, his recalled prompt, exact date unknown) and three backgrounds he made in ChatGPT (GPT-6) from prompts written for the palette (hero, AI stage, beyond the code), shown through `src/components/sections/Backdrop.astro` with a dark veil. Footer disclosure in both languages.
- **Results:** QA passed, Lighthouse 98/100/100/100 on `/` and `/es/`; report 0 fail (warns: legal requirements unknown, mobile LCP); live report 0 fail, 0 warn; check-landing passed incl. `i18n`, `ai-provenance`, `brief-facts`. Cost: proposal $0.69, build $4.85.
- **Moved:** now lives in https://github.com/williamsnieves/personal-brand and deploys to Vercel at https://williansnieves.com (see "Resume here"); the factory keeps the folder as the record (`EXPORTED.json`) and its CI no longer builds it. Changes to the landing now happen in that repository.
- **Open:** native readers for the English and Spanish copy; a smaller portrait for phones would help mobile LCP.

## Factory follow-ups (found 2026-10-25)

- `claude -p` runs: the new-landing skill called `node /home/user/landing-factory/scripts/ai-images.mjs ...` with an absolute path, which the `--allowedTools` patterns (relative `node scripts/...`) do not match, so AI generation was blocked during the personal-brand build; also `node scripts/deploy/config.mjs --from-brief --write` is not in the allow list, so a run cannot set a non-Cloudflare target. Fix: make the skill use relative script paths (or allow both forms) and add the deploy config command.
- CI live report on a brand-new Cloudflare Pages project: it runs right after the first deploy, before Cloudflare issues the TLS certificate for the deployment hostname (about two minutes), so `live-tls` fails once. Fix: wait (bounded) for the URL to answer over TLS before the live checks.
- QA full-page screenshots with motion on repeat the top of the page after a pinned section (capture artifact; the real page and the reduced-motion capture are correct). Fix in `scripts/qa.mjs` (capture full pages with reduced motion, or refresh ScrollTrigger first).
- Prompt policy: fixed in PR #28 (short exclusion clauses such as "No people, no logos." are skipped by the word rules; the brand rule still reads the whole prompt).
- samurai mobile performance is near the limit on CI runners (86 in one CI run, 93 locally); a lighter hero poster would give margin.

## tupathdigital (owner's landing) facts

- Brief: `sites/tupathdigital/brief.json` (English page; 20 listings, 3 sold in both stores, so 17 cards; prices in USD; coupons 50% until 31 Oct 2026; downloads instant, some via a Google Drive link; about 9 sales, not shown; no domain yet; legal markets US and EU, holder name `tupathdigital`, legal and privacy email tupathdigital@gmail.com (not `contact.email`), no analytics, forms or embeds; deploy target undecided). Product data: Gumroad public pages, Etsy from the owner's CSV export (Etsy listing pages answer with a bot challenge; never bypassed).
- Has `/privacy/`, a 404 page, the starter's script CSP, HSTS and COOP. Report warns only on image savings, "no rule set for US" and the "50% off" price claims (review them against the EU 30-day rule or remove the coupons after 31 October).
- References: `patterns/craftsman-contractor-21st-app.md`, `patterns/crypgo-21st-app.md`. No 3D models (owner).
- Coupons: codes and end date live in `sites/tupathdigital/src/data/catalog.ts` (`COUPONS`, `COUPON_END`, `COUPON_END_ISO`); the "50%" figure and the page meta description in `src/pages/index.astro` repeat them. Changing a coupon = edit those, update the brief notes, run site QA and `check-landing`, open a PR. A `coupon` field in the brief schema would make this data-driven (candidate for a later change).

## Owner decisions to keep

- 2026-10-25: personal-brand landing in English (default) and Spanish, with Astro's built-in i18n; his AI portrait allowed as the one person image; no legal pages for the portfolio (he never had them); no call to action and no email for now; the landing later moves to its own repository and deploys to Vercel; old Netlify blog link dropped.
- 2026-10-25: the external skill `crear-web-portfolio` was reviewed and not vendored (Hostinger, plain HTML, no license); its portfolio ideas (case studies, one clear path, show then tell) were used in the proposal in our own words.
- 2026-10-25: tupathdigital markets US and EU (worldwide reach through US stores); its hardening opted in.
- 2026-10-25: agent interface first as a local MCP server over stdio, every action except publishing.
- 2026-10-24: deploy adapters for Vercel, VPS (Hostinger VPS, DigitalOcean Droplet) and shared hosting (Hostinger web hosting); Netlify and DigitalOcean App Platform later.
- 2026-10-24: AI images from OpenAI GPT image models; legal compliance as its own change; security audit framed by the OWASP Top 10.
- Archetypes are only a base: blends are driven by the requirement and the references; reference-led (`custom`) landings are allowed; deviations are logged, never failed.
- One landing per repository, introduced gradually: monorepo now, then an export command, then generation straight into a repository, then product storage (`docs/product-plan.md`).
- 3D models later may come from generators such as Meshy, purchases, open licenses or the customer's own files.
- The intake interview follows the user's language; the page language is a separate brief field.

## How to generate a landing

```bash
QA_CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npm run new-landing -- <slug> --brief sites/<slug>/brief.json [--refs a,b] [--auto]
```

Without `--auto` it stops after `sites/<slug>/PROPOSAL.md` (review it with the owner, record his confirmations under Decisions); continue with `--resume --auto`. A bilingual brief (`languages` with two tags) makes a multi-locale site. Import the owner's AI images with `node scripts/ai-images.mjs import ...` before the build when they exist. Then review `RUN.md`, take real screenshots while scrolling (QA's full-page captures can repeat sections, see follow-ups), commit and open a PR (CI deploys the preview to a new Pages project).

## Known gaps and follow-ups

- Existing sites other than tupathdigital and personal-brand lack the starter's hardening (script CSP, HSTS, COOP, 404 page): one small site change per site.
- First real deploy per target (add-deploy-adapters): verified only with a fake Vercel API, local rsync and dry runs. Needs the owner's accounts and secrets: Vercel (`VERCEL_TOKEN`), VPS (host, `DEPLOY_SSH_KEY`, pinned host key), Hostinger shared hosting (SSH key, or `DEPLOY_FTP_PASSWORD` for FTPS).
- `section-shots.mjs` does not clear its output folder (stale screenshots mix with new ones).
- `new-landing.sh`'s own final check runs `check-landing` without `--refs` (it receives sheet slugs, not URLs); map sheet slugs to their source URLs.
- Layout diversity: panaderia and clinica-dental are close (distance 0.13); CI does not run `check-landing`.
- samurai historical copy needs an expert read before public use; panaderia process heading covered at 375 px; clinica-dental "Llamar" wraps at 375 px.
- Wikimedia Commons rate-limits the shared egress (HTTP 429).
- `claude -p` ignores `.claude/settings.json` permissions in an untrusted folder; `new-landing.sh` passes them with `--allowedTools`; keep that list reviewed (see factory follow-ups).
- `/analyze-reference` cannot scroll wheel-driven virtual scrollers.
- CI Lighthouse variance: site jobs take the median of 3 runs and can still dip on a slow runner (samurai 86 once).
- The pattern validator rejects quoted `focus` values longer than 12 words.

## Environment facts

- Cloudflare Pages projects: starter `landing-factory-71t`, `panaderia-a3o`, `clinica-dental-9pd`, `samurai-1v4`, `tupathdigital`, `personal-brand-8i7` (and the archetype pilot sites). A new project's TLS certificate takes about two minutes after its first deploy. CI creates a new site's project on its first deploy. Preview aliases: `https://<branch-alias>.<project>.pages.dev`.
- GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are repository secrets.
- Cloud session network: `williansnieves.com`, `www.williansnieves.com` and `*.vercel.app` are blocked by the proxy (403 on CONNECT) unless the owner adds them. The Claude GitHub App answers 403 to `create_repository` and to `workflow_dispatch`/re-runs; `add_repo` with push access works for repositories in the app's installation (the owner's covers all repositories). Allowed domains include the bakery and pilot reference sites and CDNs, `*.pages.dev`, Met and Commons hosts, `api.openai.com`, and (added 2026-10-25 for the personal-brand references) `www.product.inc`, `product.inc`, `sankar.work`, `www.sankar.work`, `www.sebg.ch`, `sebg.ch`; a newly added domain worked without a new session. `api.vercel.com` is not allowed. New reference sites need their domains added by the user.
- `OPENAI_API_KEY` is set in the environment and works in this session (only the `claude -p` allow list blocked it during a build). Sessions lack `rsync` and `ssh` by default (`apt-get install -y rsync openssh-client`). The `claude` CLI is at `/opt/node22/bin/claude`.
- Chromium for Playwright: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. In scratch scripts outside the repo, load Playwright with `createRequire(process.cwd() + '/')('playwright')` from the repo root.
