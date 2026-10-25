# Project status

Read this first in a new or compacted session. Last updated: 2026-10-25 (personal-brand landing merged, PR #28; next: the owner's question about moving it to its own repository, Vercel and his domain).

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
| Owner's personal-brand landing `sites/personal-brand` (bilingual) | Merged (PR #28); Cloudflare project `personal-brand-8i7` (https://personal-brand-8i7.pages.dev once `main` deploys) |

## Resume here (2026-10-25)

`main` has everything above (last merge: PR #28). Branch `change/status-after-personal-brand` only refreshes this file. Nothing is half done.

**Next, the owner's pending question (he asked to talk about it after the landing):** move `sites/personal-brand` to its own repository and deploy it from there to **Vercel**, then move the domain **williansnieves.com** from Netlify to Vercel. The old site lives in Bitbucket and on Netlify (Vue); it is replaced by this landing. Points to settle with him:
- How to export one landing as a standalone repository (the product plan's "export command": copy `sites/<slug>/` plus what it needs from the starter, its own `package.json`, lockfile, CI workflow with QA, report and the Vercel deploy step, `scripts/` it uses). Whether to build that export as a factory change first (reusable) or do a one-off move.
- Vercel needs his account, a project and the `VERCEL_TOKEN` secret (plus org and project ids if the adapter asks); `api.vercel.com` is not in this environment's allowed domains (CI deploys, not this session). In `site.config.json` the target is still `cloudflare` (see the follow-ups).
- Domain move: DNS at his registrar from Netlify to Vercel (his step, guided); `site` in `astro.config.mjs` is already `https://williansnieves.com`, so canonical and hreflang URLs are right once the domain points to Vercel.

Other items the owner can pick: tupathdigital coupons (reminder below), hardening for the other six sites, the factory follow-ups listed below, `add-3d-models`, the first real `generate_landing` through the MCP server.

Reminder scheduled for 2026-11-01 (trigger `trig_013qv2DNicfU16Ah9auQ5uWb`): the tupathdigital coupons FALL2026 (Etsy) and 92xsh57 (Gumroad) end on 31 October 2026; offer the owner to update or remove them.

## The owner's personal-brand landing (merged, PR #28)

- **Inputs:** `sites/personal-brand/brief.json` (from `/brief-intake personal-brand`: personal brand, `languages: ["en", "es"]`, tone "like himself, a touch of humor, professional", free palette, no market so no legal pages, no call to action and no email by his choice; LinkedIn `https://www.linkedin.com/in/willians-nieves` is the only access link, GitHub in the footer), `CONTENT.md` (facts from his CV and the old Vue site; phone and email left out on purpose), the pattern sheets `product-inc`, `sankar-work`, `sebg-ch` (owner's references, robots checked), his `{W}` logo SVG and his ChatGPT portrait.
- **Design:** concept "Two halves": the half-human, half-machine portrait guides a dark, glowing page with a color field per section; sections hero, about, a pinned AI-engineering stage, career path (Glintt 2025 back to Teravision 2015, CV dates), skills (incl. "JEV, a System 1 decision model", owner wording), beyond the code, education; 404 in the same design. English at `/`, Spanish at `/es/`.
- **AI images (all recorded in `assets.json`):** the owner portrait (`--subject owner`, ChatGPT, GPT-6 per the owner, his recalled prompt, exact date unknown) and three backgrounds he made in ChatGPT (GPT-6) from prompts written for the palette (hero, AI stage, beyond the code), shown through `src/components/sections/Backdrop.astro` with a dark veil. Footer disclosure in both languages.
- **Results:** QA passed, Lighthouse 98/100/100/100 on `/` and `/es/`; report 0 fail (warns: legal requirements unknown, mobile LCP); live report 0 fail, 0 warn; check-landing passed incl. `i18n`, `ai-provenance`, `brief-facts`. Cost: proposal $0.69, build $4.85.
- **Open:** deploy target is still `cloudflare` in `site.config.json` (brief says Vercel, see "Resume here"); native readers for the English and Spanish copy; a smaller portrait for phones would help mobile LCP.

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
- Cloud session network: allowed domains include the bakery and pilot reference sites and CDNs, `*.pages.dev`, Met and Commons hosts, `api.openai.com`, and (added 2026-10-25 for the personal-brand references) `www.product.inc`, `product.inc`, `sankar.work`, `www.sankar.work`, `www.sebg.ch`, `sebg.ch`; a newly added domain worked without a new session. `api.vercel.com` is not allowed. New reference sites need their domains added by the user.
- `OPENAI_API_KEY` is set in the environment and works in this session (only the `claude -p` allow list blocked it during a build). Sessions lack `rsync` and `ssh` by default (`apt-get install -y rsync openssh-client`). The `claude` CLI is at `/opt/node22/bin/claude`.
- Chromium for Playwright: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. In scratch scripts outside the repo, load Playwright with `createRequire(process.cwd() + '/')('playwright')` from the repo root.
