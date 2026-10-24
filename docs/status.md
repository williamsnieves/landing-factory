# Project status

Read this first in a new or compacted session. Last updated: 2026-10-24 (add-ai-images in PR #20; next: its real smoke test in a new session).

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
| Product plan (`docs/product-plan.md`): archetypes, intake, report, deploy adapters, agent interface, 3D models | Agreed 2026-10-21 |
| add-design-archetypes (archetype blends, layout diversity), validated with `sites/{estudio-arquitectura,festival-electronica,app-finanzas}` | Merged (PR #14) and archived 2026-10-22; owner liked the previews, `minLayoutDistance` stays 0.2 |
| add-brief-intake (`brief.json`, `/brief-intake` interview, generation reads the brief, `brief-facts` check) | Merged (PR #15) and archived 2026-10-22 |
| Owner's digital-products landing `sites/tupathdigital` (first real customer test) | Merged: build from the brief (PR #16, with polish pass A after the owner's review) and redesign B from the owner's references (PR #17). Production: Pages project `tupathdigital` (https://tupathdigital.pages.dev) |
| add-landing-report (performance and security audit, OWASP Top 10:2025, starter CSP/HSTS/COOP, planning-folder fix) | Merged (PR #18) and archived 2026-10-24; every landing 0 fail in CI (warnings: existing sites have no script CSP, HSTS, COOP or 404 page) |
| add-legal-compliance (cookies and trackers, consent banner only when needed, legal notice and privacy policy from the brief, price-claim review) | Merged (PR #19) and archived 2026-10-24; every landing 0 fail (warn: market unknown; tupathdigital also warns on its "50% off" claims) |
| add-ai-images (AI-generated images as a recorded source) | PR #20 open, CI on branch `change/add-ai-images`; provider OpenAI gpt-image (owner, 2026-10-24); real smoke test (task 6.1) pending |

## Resume here (2026-10-24)

Branch `change/add-ai-images`, PR #20 open (implemented; 467 tests; clean-clone checks pass). Only task 6.1 is open: the real smoke test. The owner added `OPENAI_API_KEY` (environment variable) and `api.openai.com` (allowed domains) on 2026-10-24; they take effect in a new session (in the old one the domain answered 401 without a key). In the new session:

1. Check the key is visible without printing it (`[ -n "$OPENAI_API_KEY" ] && echo set`).
2. Create a throwaway site (`npm run new-site -- zz-ai-smoke`, no brief, so AI images are allowed), then `node scripts/ai-images.mjs generate zz-ai-smoke --prompt "abstract glass shapes over a soft blue gradient" --as smoke --quality low` (dry run first).
3. Check the file, the `assets.json` entry, `npm run credits -- --site zz-ai-smoke` (AI table) and `check-landing` `ai-provenance` with a `data-ai-disclosure` element; confirm the default model `gpt-image-1.5` works (if not, change `aiImages.model` in `qa.config.json` and `DEFAULT_CONFIG`).
4. Remove the throwaway site (and restore `package-lock.json` if `npm install` touched it), check task 6.1 with the result, push to PR #20 and tell the owner.

Reminder scheduled for 2026-11-01: the tupathdigital coupons FALL2026 (Etsy) and 92xsh57 (Gumroad) end on 31 October 2026; offer the owner to update or remove them.

## tupathdigital (owner's landing) facts

- Brief: `sites/tupathdigital/brief.json` (English page; 20 listings, 3 sold in both stores, so 17 cards; prices in USD; coupons 50% until 31 Oct 2026; downloads instant, some via a Google Drive link; about 9 sales, not shown; no contact email or domain yet; deploy target undecided). Product data: Gumroad public pages, Etsy from the owner's CSV export (Etsy listing pages answer with a bot challenge; never bypassed).
- References: `patterns/craftsman-contractor-21st-app.md`, `patterns/crypgo-21st-app.md`. No 3D models (owner).
- Coupons: codes and end date live in `sites/tupathdigital/src/data/catalog.ts` (`COUPONS`, `COUPON_END`, `COUPON_END_ISO`); the "50%" figure and the page meta description in `src/pages/index.astro` repeat them. Changing a coupon = edit those, update the brief notes, run site QA and `check-landing`, open a PR. A `coupon` field in the brief schema would make this data-driven (candidate for a later change).
- Pass B idea list not yet done: real reviews or ratings once the owner has them; a "prompt → result" showcase if the owner provides real examples.

## Owner decisions to keep (2026-10-21)

- 2026-10-24: AI images from OpenAI GPT image models (owner's choice over Gemini/Imagen, FLUX or import-only).
- 2026-10-24: legal compliance (cookies, GDPR, legal notice, price claims) as its own change `add-legal-compliance`, before `add-ai-images`.
- 2026-10-24: security audit framed by the OWASP Top 10; add `add-ai-images` after the report (today images come only from the customer, Commons/The Met or code-rendered posters; the owner can already hand in AI images made with their own tool as customer files).

- Archetypes are only a base: blends are driven by the requirement and the references; reference-led (`custom`) landings are allowed; deviations are logged, never failed.
- One landing per repository, introduced gradually: monorepo now, then an export command, then generation straight into a repository, then product storage (`docs/product-plan.md`).
- 3D models later may come from generators such as Meshy, purchases, open licenses or the customer's own files (for example a Drive link in the brief).
- First real customer test: the owner's own landing to promote their digital products, after `add-design-archetypes` and `add-brief-intake`.
- The intake interview follows the user's language (Spanish, English or other); the page language is a separate brief field (2026-10-22).

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
3. `add-landing-report` and `add-legal-compliance` (merged), then `add-ai-images` (owner, 2026-10-24), `add-deploy-adapters`, `add-agent-interface`, `add-3d-models`; one landing per repository introduced gradually (export first).

`add-ai-images`: the real smoke test (task 6.1) waits for `OPENAI_API_KEY` as an environment secret and `api.openai.com` in the allowed domains; the default model `gpt-image-1.5` is confirmed by it.

Small fixes pending: panaderia process heading covered at 375 px; `new-landing.sh` final check without `--refs`.

## Known gaps and follow-ups

- Existing sites do not have the starter's hardening yet (script CSP, HSTS, COOP in `public/_headers`): `npm run report` warns on each. Follow-up: one small site change per site to opt in (copy `security.csp` from the root `astro.config.mjs` and the two header lines; tupathdigital first if the owner wants it), then check its QA and the live report.
- tupathdigital legal follow-up (own site change, after add-legal-compliance merges): the report warns (no market) and flags the "50% off" coupons as price claims. The owner provides the markets (for example `EU`/`ES`) and the holder data (name or company, tax id, address, email, register if a company) and the processing answers; then add them to `sites/tupathdigital/brief.json` (never assumed), run `node scripts/legal.mjs --site tupathdigital --write`, add the legal notice and privacy policy pages with footer links, and review the coupon wording against the EU 30-day lowest-price rule (the coupons FALL2026 and 92xsh57 end on 31 October 2026, so they may simply be removed).
- Etsy listing pages answer with a bot challenge (never bypassed); product data came from the owner's Etsy CSV export. Gumroad public product pages are readable (title, image, price in JSON-LD).

- `section-shots.mjs` does not clear its output folder, so stale screenshots from earlier passes mix with new ones (seen on estudio-arquitectura). Clear `qa/<slug>/sections/` at the start of each run.

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
- CI Lighthouse variance (2026-10-21): festival-electronica scored 67 mobile performance in one CI run while it measures 97 to 99 locally (90 even at 3x the CPU slowdown); site jobs now take the median of 3 runs (`--runs 3`).
- Deploy task 2.1 (a commit with failing QA must not deploy) is not yet exercised on a real PR.
- Astro Docs MCP (`mcp.docs.astro.build`) may be blocked by the cloud network policy; add it to the environment's allowed domains if needed.
- The pattern validator rejects quoted `focus` values longer than 12 words: keep `focus` short.

## Environment facts

- Cloudflare Pages projects (names got a suffix because the base names were taken): starter `landing-factory-71t` (https://landing-factory-71t.pages.dev), bakery `panaderia-a3o` (https://panaderia-a3o.pages.dev), dental clinic `clinica-dental-9pd` (https://clinica-dental-9pd.pages.dev), samurai `samurai-1v4` (https://samurai-1v4.pages.dev). A new project's TLS certificate takes a few minutes after its first deploy (browsers show ERR_SSL_VERSION_OR_CIPHER_MISMATCH meanwhile). CI creates a new site's project on its first deploy. Preview aliases: `https://<branch-alias>.<project>.pages.dev`.
- GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are repository secrets (not environment secrets).
- Cloud session network: allowed domains include the three bakery sites, their CDNs (`cdn.sanity.io`, `cdnjs.cloudflare.com`, `unpkg.com`, `use.typekit.net`, `cdn.shopify.com`) and `*.pages.dev`, plus `crazy.studio`, `experience2026.funtech.inc`, `collectionapi.metmuseum.org`, `images.metmuseum.org`, `api.artic.edu`, `www.artic.edu`, Commons and Unsplash hosts. The Art Institute of Chicago image host answers with a bot challenge (never bypassed; source dropped). The Met search API moved to `/public/collection/v1.1/search` on 2026-10-01. New reference sites need their domains added by the user.
- Chromium for Playwright: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (matches the pinned `playwright@1.56.1`).
