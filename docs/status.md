# Project status

Read this first in a new or compacted session. Last updated: 2026-11-11 (add-newsletter PR #63 merged and archived; add-reference-archetypes open as PR #64, CI green, waiting for the owner's merge. Before that, fix-prospect-run-findings PR #61 and add-maps PR #62. Before that, since 2026-11-03: fix-test-run-findings PR #53 and archive #54; the first real prospect test, fisioterapia-ribera, PR #55; add-stock-images PR #56 and archive #57 with the first real Pixabay run; add-calm-statement-archetype PR #58, archived in #60; the fisioterapia-ribera rebuild on `calm-statement`, PR #60, which the owner liked). Start with "Resume here" and its "What is left".

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
| End-to-end test of track 1: `sites/casavela` (fictional real-estate agency and mortgage adviser, Valencia, Spanish) | Closed 2026-10-30 (PR #38, the add-seo, fix-motion-reveal and fix-reveal-check-timing archives ride on it). Preview https://change-casavela-test.casavela-4bm.pages.dev/ ; cost and findings below and in `docs/customer-runs.md` |
| fix-motion-reveal (revealed blocks ended 32 px low in every landing; QA check `reveal-end-state`) | Merged (PR #39), archived on `change/casavela-test` |
| fix-reveal-check-timing (the check waits for the motion layer: network idle, re-scroll) | Merged (PR #40), archived on `change/casavela-test` |
| personal-brand sync (both fixes and the SEO report area) | Merged (williamsnieves/personal-brand#2); production on https://williansnieves.com |
| casavela test (site, palette, test record, archives of add-seo, fix-motion-reveal, fix-reveal-check-timing) | Merged (PR #38) |
| add-lead-forms (brief `forms`, `<LeadForm />` and `forms` layer, Web3Forms with a WhatsApp fallback, CSP only where used, privacy text naming the provider, `legal-forms` report item, starter demo `/forms/`) | Merged (PR #41) and archived on `change/add-landing-restyle`. First real submission pending (owner's key) |
| add-landing-restyle (`revise-landing --restyle`, palette and font changes on the same layout) | Merged (PR #42), archived on `change/add-product-led-saas-archetype` |
| add-product-led-saas-archetype (the `product-led-saas` archetype sheet, three traits, reference rules) | Merged (PR #43), archived on `change/add-prospect-landings` |
| add-prospect-landings (brief `prospect` section with a source per fact, `prospect.mjs write\|kit\|sold`, `noindex` and a visible notice, the `prospect` rule of `check-landing`, the sales kit) | Merged (PR #44), archived on `change/tupathdigital-handoff` |
| tupathdigital production prep (coupons removed, domain, SEO opt-in, cookieless analytics, UTM) | Merged (PR #45; a site change, nothing to archive) |
| tupathdigital handoff (private repository williamsnieves/tupathdigital, Cloudflare Pages, `tupathdigital.com`, `EXPORTED.json`, brand favicon) | Merged (PR #46; williamsnieves/tupathdigital#1 for the favicon). Live on https://tupathdigital.com |
| Status update (2026-10-31) | Merged (PR #47; docs only) |
| add-copy-frameworks (our `copy-frameworks` skill and `pick-copy-framework.mjs`, Copy plan in the proposal, brief `proof` and `audience.awareness`, the `copy-claims` rule of `check-landing`, vendored `copywriting`; guide `docs/copy.md`) | Merged (PR #48), archived on `change/add-neuromarketing-review` |
| add-neuromarketing-review (our `conversion-psychology` skill with evidence levels, Conversion plan, `conversion-audit.mjs` and one review round before the polish, the `dark-patterns` rule, vendored `cro` and `marketing-psychology`; guide `docs/conversion.md`) | Merged (PR #49), archived in PR #50 (with a status update) |
| Test landing `sites/turnio` (fictional SaaS, Spanish, `product-led-saas`; first real run of the Copy plan, the Conversion plan, the conversion review, `copy-claims` and `dark-patterns`) | Merged (PR #51; a site change, nothing to archive). Preview https://change-turnio-test.turnio.pages.dev ; details in "Resume here" and `docs/customer-runs.md` |

## Resume here (2026-11-03)

**add-git-cms (implemented on `change/add-git-cms`, owner decision 2026-11-12).** Pages CMS as the git-based CMS for exported landings: `.pages.yml` per site checked by `scripts/cms.mjs check`, exported to the repository root, `sync-export` keeps the CMS paths (`kept (managed by the CMS)`), `cms.mjs pull` brings live content back, the handoff plan has the Pages CMS steps, revision rounds classify `cms` items. No existing site changed. Owed: the first real edit through app.pagescms.org; `personal-brand` and `tupathdigital` move their lists to collections in their own changes. Guide `docs/cms.md`.

**Where we are.** `main` has everything up to PR #63 (`add-newsletter`), archived as the first commit of `change/add-reference-archetypes`. The open change is `add-reference-archetypes` (PR #64, all 12 CI jobs green on 2026-11-11, waiting for the owner's merge); after the owner says it is merged, archive it as the first commit of the next branch.

**add-reference-archetypes (PR #64, open, owner request 2026-11-11).** The owner sent three references for new creative archetypes. claude.dev and shopify.com/editions/fall2026 passed the robots and TDM checks and became `patterns/claude-dev.md` and `patterns/shopify-editions.md`; openai.com/es-ES answered 403 to automated access and was not analyzed (not bypassed). The hosts were added to the environment's allowed list. Two new archetypes (14 sheets): `chaptered-atlas` (a first screen that maps the chapters and navigates, one saturated colour field per chapter, fixed chapter rail, giant vertical word; impact balanced/bold; traits `self-map-hero`, `chapter-color-fields`; at most six chapters, reduced-motion form, contrast checked on every field) and `dev-console` (developer-tool typesetting: mono metadata and key hints, an index or changelog list as the hero, fixed identity column, one original motif drawn in code, closing dot field; impact quiet/balanced; traits `mono-meta-rows`, `generative-dot-field`). `REF_RULES` maps the two sheets; with them as references the reference-led `custom` outcome still ranks first, the new archetype is the best blend. Ranking change for existing briefs: only app-finanzas (already built) now tops with `dev-console+product-led-saas` instead of `product-led-saas+calm-statement`.

**add-newsletter (PR #63, merged; owner decision 2026-11-07: Brevo).** Brevo: French, servers in the EU, free plan 300 emails a day, double opt-in built into its sign-up forms; MailerLite cut its free plan to 250 subscribers and 2,500 emails a month in June 2026. A form with `purpose: "newsletter"`, `provider: "brevo"` and `action` (the customer's Brevo form URL, `https://<id>.sibforms.com/serve/...`, never assumed); `<NewsletterForm />` posts plain HTML (no Brevo script, no reCAPTCHA, consent required and unchecked, double opt-in note); the CSP opens only that form origin in `form-action`; the privacy policy names Brevo (Sendinblue SAS); `legal-forms` accepts `*.sibforms.com` matched on the parsed host. **Owed, left for last by the owner (2026-11-11; needs a card on Brevo):** the first real sign-up with the owner's Brevo account (create a form with "Double confirmation" on, compare the field names `EMAIL`, `FIRSTNAME`, `OPT_IN`, `email_address_check`, `locale`, `html_type` with Brevo's generated embed code, receive the confirmation email, see the contact in the list).

**Maps preview:** the owner could not open the `/maps/` preview on 2026-11-07 (Saturday evening): very likely LaLiga's blocking of Cloudflare IPs during matches; retry outside match times or on another network.

**add-maps (PR #62, merged; owner decision 2026-11-07: OpenStreetMap).** `contact.geo` (`lat`, `lng`, `zoom`) and `contact.mapInteractive` in the brief (coordinates read by a person from openstreetmap.org, never geocoded; sourced or assumed on a prospect); `scripts/static-map.mjs render --site <slug>` composes a map image at build time from at most 16 OSM tiles (default 1024x512, one at a time, 7-day cache, identifying User-Agent) and records it in `assets.json` (`source: "osm"`, ODbL, attribution); the optional `maps` layer (`<LocationMap />`: image, marker in the primary colour, visible attribution, "Get directions" links to Google Maps, Apple Maps and OpenStreetMap, optional interactive OSM embed loaded only on click); `check-landing` `map-attribution`; credits; the report classifies `openstreetmap.org` as an embed; the privacy policy names OpenStreetMap when the interactive map is on. `tile.openstreetmap.org` is in the session's allowed hosts (owner). Guide `docs/maps.md`; demo page `/maps/` (Plaza del Pilar, Zaragoza; 8 real tiles fetched).

**fisioterapia-ribera rebuild (2026-11-06, PR #60).** Same prospect brief, `brand.impact: balanced` (assumed), images Pixabay first and Commons as fallback (owner, at the checkpoint). Blend `calm-statement+warm-local-service` (`hours-card`), hero `illustration`: a very large `h1` ("Tu fisioterapeuta en Zaragoza, de principio a fin.") with an inline SVG thread from "principio" to "fin" that returns in five sections; wine `#7a2e3f` on sand and clay fields, Lora and Nunito Sans; two illustrative Pixabay photos; PASTOR copy. Proposal $2.01 (4 min), build $14.51 (about 35 min); QA, `check-landing` and both reports passed, CI green on the first run. One warning kept as a deviation: `archetype-target` fullBleedShare 0. **Owner verdict: liked it a lot** (the first version was "correct but not striking"). The run again skipped the sales kit, and the kit was not Prettier-formatted: both are fixed in `fix-prospect-run-findings`.

**fix-prospect-run-findings (open).** `new-landing.sh` writes the sales kit after every passed prospect auto run; the kit is Prettier-formatted, describes the final design (landing-meta of MASTER.md and the RUN.md signature moment line, no planned deviations) and names the image sources used; `layout-signature` leaves off-screen links (the skip link) out of the button measures; the static report warns on a repeated path pattern in `dist/_headers` (`headers-duplicate-paths`).

**What add-calm-statement-archetype brought (PR #58).**
- A 12th archetype, `calm-statement`: calm but striking pages without photographs (one oversized statement per screen, soft full-bleed colour fields, one recurring drawn line or shape, slow reveals). It lends `statement-band` and `line-art-thread`.
- `brand.impact` in the brief (`quiet`, `balanced`, `bold`; it may be assumed, `/brief-intake` asks it). Every sheet lists the impact levels it can deliver, and `pick-archetypes` adds or subtracts 2 by impact (`balanced` assumed when empty). The weight is 2, not 1, because with 1 a `quiet` request still left `calm-statement` first; a reference-led (`custom`) outcome also gets the bonus, so clear references keep leading.
- A "Signature moment" section in every `PROPOSAL.md` (section, what it shows, technique, reduced-motion and no-JS form, brief facts), at every impact level, recorded in RUN.md "Design decisions".
- For fisioterapia-ribera's signals the picker now ranks `calm-statement` first (8.5 balanced against `swiss-grid-minimal` 1; with `quiet`, swiss 5 against 4.5).

**Images (add-stock-images, PR #56, archived in #57).** Pexels paused new API keys on 2026-11-04, so Pixabay is the automatic stock source (`find-images.mjs --source pixabay`, key in `PIXABAY_API_KEY` as a Claude environment variable, never a GitHub or network secret since it travels in the URL; downloads only from `pixabay.com`/`cdn.pixabay.com`, large image up to 1280 px) and Pexels photos the owner picks are imported by hand (`find-images.mjs import ... --source pexels`). The owner confirmed both license pages (no recognisable brands or logos, no stock photo in a logo or business name, no implied endorsement, stock people captioned as illustrative). The first real Pixabay search and download worked on 2026-11-05. The `visual-assets` final-check rule fails a home page or hero with no visual (photo, poster, `role="img"` illustration or SVG of at least 96 units); casavela and festival-electronica fail it today (text-only heroes) and get a visual in their next revision.

**fisioterapia-ribera (PR #55).** The first real prospect run (fictional physiotherapy clinic in Zaragoza): proposal $1.91, build $12.73. It found and fixed a real bug (prospect builds wrote a second `/*` block in `_headers`, and Cloudflare Pages served only that one, dropping the security headers). The owner judged the page "correct but not striking", which led to the two changes above. Open findings from that run: the run skipped the sales kit (written by hand); `layout-diversity` turned the approved filled button into a text link; `layout-signature` counted the off-screen skip link as a filled button; `SALES.md` repeats the proposal's planned deviations; the static report did not catch duplicated `_headers` blocks.

**fisioterapia-ribera prospect test (2026-11-03 to 2026-11-04, PR #55).** The first real prospect run: a fictional physiotherapy clinic in Zaragoza, every fact assumed, no sources and no proof, regulated health niche. It used `swiss-grid-minimal+warm-local-service` with a 0-50 minute ruler as its twist, PAS copy and a trust-and-calm conversion plan. Proposal $1.91, build $12.73 (34 min). QA, `check-landing` (including `prospect`) and the static report passed. Findings:
- The run skipped the sales kit; it was written by hand.
- `layout-diversity` turned the approved filled button into a text link.
- `layout-signature` counted the off-screen skip link as a filled button.
- `SALES.md` copies the proposal's planned deviations.
- A real factory bug, found and fixed in the PR: prospect builds appended a second `/*` block to `_headers`, and Cloudflare Pages kept only that one, dropping the security headers. The static report did not catch it; the live one did.
- The new `--wait-tls` worked on the first real new project (13 attempts, about 2 minutes).

Owner verdict: correct but not striking. Causes: no references, a quiet archetype, the calm target applied to the visuals, and only two Commons photos. Owner decisions (2026-11-04): add a modern stock source (`add-stock-images`: Pixabay, plus manual Pexels imports), always ship images or SVG visuals, then a new archetype for calm-but-striking pages without photos (`add-calm-statement-archetype`, with an impact level in the brief and a signature moment in every proposal). The owner's copywriting and neuromarketing resources (2026-11-01: an AI-output checklist, a neuromarketing course guide with ten strategies and a mind map) became two changes: add-copy-frameworks (PR #48) and add-neuromarketing-review (PR #49). Every new landing now gets a Copy plan (`pick-copy-framework`) and a Conversion plan in its proposal, one conversion review round after QA (`conversion-audit`), and the `copy-claims` and `dark-patterns` rules in its final check. Existing landings are unchanged; their audit findings are in PR #49 (personal-brand has no call to action in its closing section; tupathdigital has 22 link destinations and 6 offers side by side; panaderia and app-finanzas show 6 offers side by side). tupathdigital is live on https://tupathdigital.com from the owner's private repository https://github.com/williamsnieves/tupathdigital (Cloudflare Pages, deploys on each merge to its `main`); the factory keeps `sites/tupathdigital/` as the source of truth and the record (`EXPORTED.json`), and its CI no longer builds it. The owner made a promotional video of the landing with Hyperframes for social media (outside the factory; not in any repository).

**turnio test (2026-11-02 to 2026-11-03, PR #51).** A fictional SaaS ("Turnio": online booking and WhatsApp reminders for hair salons and beauty centres, Madrid, Spanish; plans Gratis 0 €, Pro 19 €/mes, Equipo 39 €/mes; every business fact in `assumed`; `proof` empty on purpose; references `linear-app` and `stripe-com`). It is the first landing on `product-led-saas` and the first real run of both new skills.
- Proposal: blend `product-led-saas+data-and-proof` (`comparison-table`, `ref:linear-app/mono-labels`; the picker's top `custom` was set aside because its marquee and scene traits clash with `calm`), Copy plan FAB (picker rank 1; headline "Tus clientes reservan solos." scored on 4U), Conversion plan relief and calm, one primary call to action "Empieza gratis", Pro highlighted for a factual reason, ethics check ticked. 3 min, $1.97.
- Owner review: approved with one correction (the Pro tag claimed WhatsApp was Pro-only; Equipo has it too), recorded as Decision 10.
- Build: berry `#be185d` on warm off-white, Plus Jakarta Sans and JetBrains Mono, hero `typographic` with a day's agenda drawn in HTML/CSS, no photos, no AI images, no people, no invented proof (a fact strip replaces the logo strip). QA passed on attempt 1; the conversion review found nothing to change (one info: no legal pages, no market); `layout-diversity` first failed against app-finanzas (0.05) and the build recomposed the page; every final rule passed, one `archetype-target` warning recorded as a deviation. 31 min, $14.56. Total $16.53.
- CI: the live report failed once on `live-tls` because the new Pages project's certificate was issued about two minutes after the deploy (as with casavela); the owner re-ran the job and it passed (0 fail, 0 warn).
- Findings (small follow-ups): `pick-copy-framework` says "audience.awareness is not stated" when it is stated but listed in `assumed` (should say "stated, assumed"); the picker labels a sign-up URL `goal lead` (a sign-up or trial could be its own goal kind); the comparison table inferred an "Enlace de reservas" tick for Pro and Equipo that the brief names only for Gratis (RUN.md asks a person to confirm); the TLS wait before the live report on a new Pages project is now seen twice.

**How a tupathdigital change goes now:** a revision round in the factory (`npm run revise -- tupathdigital --feedback <file>`, or a direct site change on a factory branch for small things), then `node scripts/sync-export.mjs --site tupathdigital --into <clone of the private repository>`, a branch and a pull request there (its CI gives the preview), merge, production. The favicon went this way (williamsnieves/tupathdigital#1). A revision round now also runs the conversion audit and the `copy-claims` and `dark-patterns` rules.

**What is left (2026-11-11).**

Next, in order (the owner chose them on 2026-11-04 and 2026-11-05):
A. After the owner confirms the merge of PR #64, archive `add-reference-archetypes` (first commit of the next branch). Next, in the owner's order: content from outside sources at build time (Google Sheets or a git-based CMS: decide the source and scope with the owner before proposing; a CMS is out of scope today), then a first landing on `chaptered-atlas` or `dev-console` when a brief fits. Last: the first real Brevo sign-up (the owner postponed it, 2026-11-11: it needs a card on Brevo). A first landing with a real map (for example fisioterapia-ribera with assumed coordinates) can follow in a site change.
B. Done 2026-11-06: the fisioterapia-ribera rebuild (PR #60) and the prospect-run findings (`fix-prospect-run-findings`).
C. Older sites without a visual in the hero (casavela, festival-electronica fail `visual-assets`): fix in their next revision.
D. Owner previews may not open on Saturdays and Sundays during football matches (LaLiga blocking of Cloudflare IPs on some Spanish ISPs, seen again 2026-11-07); retry later or on another network.

Owner, on tupathdigital:
1. Enable Cloudflare Web Analytics in the Pages project (Workers & Pages > tupathdigital > Metrics), if not done; the CSP and the privacy policy already allow and name it. Store visits and sales come from Etsy and Gumroad stats (UTM on the store links).
2. Legal holder data when he decides (tax id, address; an ES market and the LSSI-CE legal notice if he sells from Spain). Today the holder is the name "tupathdigital" only.
3. New coupons and products: he sends them; they become the **first real revision round** (`npm run revise`), then a sync. A `coupon` field in the brief schema would make coupons a fact instead of copy (candidate small change).
4. Measure conversion before investing more (owner's goal): visits (Web Analytics) against store clicks and sales (Etsy and Gumroad stats, UTM).

First real runs still missing (the features exist and are tested with stubs only):
5. A revision round (`npm run revise`) and a restyle round (`--restyle`).
6. A prospect landing for a real business (the fictional fisioterapia-ribera test ran the flow on 2026-11-04, PR #55).
7. The first real Web3Forms submission with the owner's key on a custom domain (and reading the free plan's monthly limit), and the first real `generate_landing` through the MCP server.
8. Real deploys to a VPS and to shared hosting (Hostinger), never run with an account.

Decisions waiting for the owner:
9. The factory repository was to stay public "until tupathdigital is in production" (2026-10-28): that condition is met. Going private costs GitHub Actions minutes (2,000 a month free on private repositories; a factory PR runs about ten jobs, a few minutes each): decide now or keep it public.
10. Track 1 customers: `docs/customer-runs.md` has two test runs (casavela, turnio) and no real customer; channels (web app, Telegram) wait for 3 to 5.
11. Hosting in Spain: LaLiga's court-ordered blocking makes Cloudflare-served sites unreachable on some Spanish ISPs during matches. tupathdigital stays on Cloudflare (owner, 2026-10-31); Hostinger (the shared target) is the alternative if Spanish traffic matters.

Factory follow-ups, small (details under "Factory follow-ups" and "Known gaps"). Done in `fix-test-run-findings` (2026-11-03): the CI live report waits up to 300 s for a new Pages project's certificate (`landing-report.mjs --wait-tls`), the picker says "listed as assumed" for an assumed awareness, a `signup` goal kind (FAB, AIDA, SLAP fit it), and `brief-facts` accepts a UTM-tagged primary URL. Still open: `section-shots.mjs` keeps stale screenshots; QA full-page captures repeat the top after a pinned section; the hardening and SEO opt-in of the older sites (panaderia, clinica-dental, samurai, estudio-arquitectura, festival-electronica, app-finanzas); the handoff's first copy into the owner's repository should not hand-copy the export (it missed `scripts/qa/`).


**tupathdigital handoff (2026-10-31), done.** `main` has everything up to PR #45 (tupathdigital production prep, details below). The landing now lives in the owner's **private** repository https://github.com/williamsnieves/tupathdigital (exported with `brief.json`), deploys to the Cloudflare Pages project `tupathdigital` from its own CI (the owner added a new `CLOUDFLARE_API_TOKEN` scoped to Pages and `CLOUDFLARE_ACCOUNT_ID`) and is live on https://tupathdigital.com:
- Vercel was ruled out: its fair-use guidelines restrict Hobby to non-commercial personal use and count advertising the sale of a product as commercial (Pro needed). Hostinger was weighed (shared target, no Cloudflare IPs, paid); the owner stays on Cloudflare Pages for now. Known risk: in Spain, LaLiga's court-ordered blocking of Cloudflare IPs makes `*.pages.dev` and Cloudflare-proxied sites unreachable on some ISPs during football matches (the owner saw it on the preview).
- Domain: Namecheap name servers moved to Cloudflare (zone `tupathdigital.com`, Free plan); the Namecheap parking records were deleted, mail records kept; Pages custom domains `tupathdigital.com` and `www.tupathdigital.com`; a Single Redirect rule sends `https://www.*` to `https://${1}` (301, query string preserved). The owner confirmed the redirect.
- The first push missed `scripts/qa/` (a copy that excluded every `qa` folder); fixed in the second commit there, CI run 3 green with the production deploy. Lesson: copy an export with `sync-export.mjs`-style exact mirroring or exclude only the top-level `/qa/`.
- After the handoff the owner asked for a brand favicon: the circle mark of `logo.webp` (`public/favicon-48.png`, `public/apple-touch-icon.png`), made in the factory, synced with `sync-export.mjs` into the private repository (its PR #1). This branch also records `sites/tupathdigital/EXPORTED.json`, so the factory CI no longer builds the site; changes now go factory first, then `sync-export.mjs` and a pull request in that repository.
- Open: the owner enables Web Analytics in the Pages project (if not done yet); legal holder data (tax id, address; an ES market and LSSI legal notice if selling from Spain); new coupons and products from the owner (a revision round, then a sync); the domain live report runs in that repository's CI on each production deploy (this session's proxy cannot reach the domain).

**Production prep (PR #45, merged).** `sites/tupathdigital/` was prepared for the owner's domain (owner decisions 2026-10-31):
- Coupons removed (FALL2026 and 92xsh57 expired on 31 October 2026): no code, discount badge, end date or coupon FAQ left, and the Coupons section is gone. The hero fragment and the figure tile now state facts from the brief (17 products, 4 shelves). New coupons and products will come from the owner.
- Domain `tupathdigital.com` (apex canonical, `www` redirects at Cloudflare), host Cloudflare Pages, `site` set in `astro.config.mjs`, brief `deploy` filled.
- SEO opted in: `seoFiles()` (sitemap, `Sitemap:` line), `robots.txt`, canonical, `og:*`, `twitter:card`, JSON-LD (`src/data/seo.ts`: Organization, WebSite and an ItemList of Products with the brief prices and store URLs, no reviews). Primary keyword "AI products" is assumed in the brief.
- Analytics: Cloudflare Web Analytics, cookieless. The owner enables it in the Pages project (the beacon is injected at the edge, nothing in the HTML); the CSP allows `https://static.cloudflareinsights.com` (script) and `https://cloudflareinsights.com` (connect); the privacy policy names Cloudflare, Inc.
- UTM (`utm_source=tupathdigital.com&utm_medium=referral&utm_campaign=landing`) on the store buttons and calls to action through `storeLink()` in `catalog.ts`. The footer "Etsy shop" link stays untagged: `check-landing` `brief-facts` needs the exact primary URL as an `href` on the page.
- Legal holder stays "tupathdigital" for now.

**add-lead-forms in short (merged 2026-10-31, `docs/forms.md`, CLAUDE.md "Lead forms").**
- **Owner decisions (2026-10-30):** a hosted form service, Web3Forms first, and no backend of our own; a prefilled WhatsApp message as the fallback when there is no access key.
- **Web3Forms facts** (docs.web3forms.com, now in the allowed domains with `web3forms.com` and `api.web3forms.com`):
  - The endpoint is `POST https://api.web3forms.com/submit`.
  - The access key is public by design. API calls must come from the browser; server side needs a paid plan.
  - JavaScript submits use `FormData` or JSON and never `redirect`. `redirect` is free for no-JS submits.
  - The `botcheck` honeypot is free, and so is hCaptcha; reCAPTCHA, Turnstile and domain restriction are paid.
  - Submissions are not stored, and logs are kept about two months. Servers are in the US; the company is Web3Creative, India.
  - Some free subdomains are blocked, so `*.pages.dev` previews may not deliver.
  - `web3forms.com` itself shows a Cloudflare challenge to this session (not bypassed), so the free plan's monthly limit is unconfirmed.
- **A form needs a privacy policy.** It requires `legal.markets` and `legal.processing.forms: true`, and holder identity is never assumed. So casavela (sample data) keeps WhatsApp; the starter's `noindex` `/forms/` page is the proof.
- **Result:** 946 tests passed; the starter's QA and report passed (`legal-forms` passes on the demo). PR #41 CI was green.

**casavela test: what was done (2026-10-28 to 2026-10-30).**
- Brief: fictional "Casavela Inmobiliaria", Valencia; every contact value is an example listed in `assumed` and tagged "Dato de ejemplo" on the page; WhatsApp as the primary call to action, no form; no legal market; SEO keyword "valoración de vivienda gratis en Valencia", `schemaType: RealEstateAgent`; references `stripe-com` and `framer-com`.
- Directions: 3 (a Claridad custom, b brutalist-raw+data-and-proof, c warm-local-service+data-and-proof), 35 min, $16.75; all passed QA and `directions.mjs check`.
- Choice (owner): a as the base (split hero, valuation card, sticky mortgage calculator) plus c's Valencia photo and local strip; then a palette change after the first build.
- Build: 40 min, $16.53, Lighthouse 100/100/100, check-landing and the static report passed.
- Palette: the owner's Pinterest board (real-estate palettes) read in this session (the owner added `es.pinterest.com`, `pinterest.com`, `*.pinterest.com`, `i.pinimg.com`, `*.pinimg.com`; thumbnails were only viewed in the scratchpad and deleted). Recurring family: deep navy, sand, cream, near-black. ui-ux-pro-max gave primary `#232d47`, surface `#ebe2d3`, paper `#fbf7f0`, ink `#1c1a17`, terracotta accent. Applied by resuming the build from the design system: 10 min, $3.93. Owner: approved.
- Total: $37.21, about 85 minutes of machine time.

**casavela test: findings.**
1. A palette change has no command. The revise skill classifies a different palette family as `rebuild`; the workaround was to add the palette to `directions.json` `choice.notes` (by hand, since `directions.mjs choose` refuses once the direction pages are gone), reset the design-system to final-check rows of `RUN.md` to `pending` and run `new-landing.sh --resume --auto`. It worked and cost a quarter of a build. Candidate change `add-landing-restyle`: `new-landing.sh <slug> --restyle --notes "..."` (or a `restyle` kind in revisions) that records the request, re-runs the design system and recolors without regenerating sections, and records the round in `revisions.json`.
2. Every landing's reveals ended 32 px low (`clearProps: 'transform'` handed the element back to the stylesheet's start offset). Fixed in the starter and every site (PR #39) with a new QA check; the check then gave a false failure on a slow runner (motion initialized after QA's scroll) and was fixed (PR #40). Found by the build's screenshot review, not by QA: keep the reviewer pass.
3. A new Pages project's TLS certificate is not ready when the live report runs (casavela's first deploy); the owner re-ran the job. Still open as a factory follow-up (below).
4. Pages project names get a suffix (`casavela-4bm`); read the URL from the sticky comment, never guess it.
5. CI Lighthouse variance again (PR #39: clinica-dental 89, samurai 86 on mobile; both passed on re-run).
6. The first real revision round (`npm run revise`) is still not run: the only change the owner asked for was rebuild-class.

**The owner's list of 2026-10-28 is done:** `add-landing-restyle` (PR #42), `add-product-led-saas-archetype` (PR #43), `add-prospect-landings` (PR #44) and tupathdigital in production (PRs #45, #46). None of the three new features has had a real run yet (see "What is left").

**Two tracks and the repository (owner, 2026-10-28, `docs/channels.md`):** track 1, the owner builds landings and then offers them; track 2 later, a self-serve web app driven by the Agent SDK with the same harness; Telegram serves both. The factory repository stays public (free CI) until the flow is polished and tupathdigital is in production, then goes private.

**The session's network:** the owner added linear.app, stripe.com, vercel.com, framer.com, raycast.com and their CDNs (2026-10-28) Pinterest (`es.pinterest.com`, `pinterest.com`, `*.pinterest.com`, `i.pinimg.com`, `*.pinimg.com`, 2026-10-30) and Web3Forms (`web3forms.com`, `docs.web3forms.com`, `api.web3forms.com`, 2026-10-30) to the environment's allowed domains.

**Channels (owner decision, 2026-10-28, `docs/channels.md`):** one engine and thin clients; the web app is the source of truth (directions, choice and comments, approval, structured data, rounds, later billing); chat is the way in and for notifications (interview, "preview ready", small changes), Telegram before WhatsApp; publishing, sync and transfer stay with the owner. Where the engine runs (VPS, GitHub Actions or cloud sessions) is open and is decided from the measured customer runs.

**Delivery model (owner decision, 2026-10-27): managed, with transfer.** The owner shows a preview (`--directions`, optional), builds in the factory, creates a private or public repository in his own account and exports to it (`/landing-handoff`), hosted on his own Vercel or Cloudflare account. Customer changes are revision rounds in the factory (`npm run revise`), carried into the repository with `sync-export.mjs` as a pull request. If the customer wants the project, the repository and responsibility are transferred (`handoff.mjs transfer-plan`, then `transfer.mjs record`); the factory then leaves it alone.

**Pending real runs:** the first real Web3Forms submission (manual, with the owner's own access key from web3forms.com, on a custom domain: a `*.pages.dev` preview may not deliver; also read the free plan's monthly limit there; see `docs/forms.md`), the first real revision round (`npm run revise`). The first `--directions` run is done (casavela: $16.75 for 3 directions, about $5.60 each, well above the $1 to $1.50 estimate). A sync of `personal-brand` (2026-10-27, `--no-brief`) changed nothing, as expected right after its refresh.

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

**Product plan steps 11 and 12** (`docs/product-plan.md`): handoff, preview and revise are merged and archived; the channels decision is recorded (`docs/channels.md`) and building it waits for 3 to 5 customers recorded in `docs/customer-runs.md`.

## The owner's personal-brand landing (merged, PR #28)

- **Inputs:** `sites/personal-brand/brief.json` (from `/brief-intake personal-brand`: personal brand, `languages: ["en", "es"]`, tone "like himself, a touch of humor, professional", free palette, no market so no legal pages, no call to action and no email by his choice; LinkedIn `https://www.linkedin.com/in/willians-nieves` is the only access link, GitHub in the footer), `CONTENT.md` (facts from his CV and the old Vue site; phone and email left out on purpose), the pattern sheets `product-inc`, `sankar-work`, `sebg-ch` (owner's references, robots checked), his `{W}` logo SVG and his ChatGPT portrait.
- **Design:** concept "Two halves": the half-human, half-machine portrait guides a dark, glowing page with a color field per section; sections hero, about, a pinned AI-engineering stage, career path (Glintt 2025 back to Teravision 2015, CV dates), skills (incl. "JEV, a System 1 decision model", owner wording), beyond the code, education; 404 in the same design. English at `/`, Spanish at `/es/`.
- **AI images (all recorded in `assets.json`):** the owner portrait (`--subject owner`, ChatGPT, GPT-6 per the owner, his recalled prompt, exact date unknown) and three backgrounds he made in ChatGPT (GPT-6) from prompts written for the palette (hero, AI stage, beyond the code), shown through `src/components/sections/Backdrop.astro` with a dark veil. Footer disclosure in both languages.
- **Results:** QA passed, Lighthouse 98/100/100/100 on `/` and `/es/`; report 0 fail (warns: legal requirements unknown, mobile LCP); live report 0 fail, 0 warn; check-landing passed incl. `i18n`, `ai-provenance`, `brief-facts`. Cost: proposal $0.69, build $4.85.
- **Moved:** now lives in https://github.com/williamsnieves/personal-brand and deploys to Vercel at https://williansnieves.com (see "Resume here"); the factory keeps the folder as the record (`EXPORTED.json`) and its CI no longer builds it. Changes to the landing now happen in that repository.
- **Open:** native readers for the English and Spanish copy; a smaller portrait for phones would help mobile LCP.

## Factory follow-ups (found 2026-10-25)

- Found 2026-10-31 (tupathdigital handoff): `check-landing` `brief-facts` compares `goal.primary.url` with an exact `href`, so the landing keeps one untagged link (footer "Etsy shop") beside the UTM-tagged ones; accept a query suffix there. The `/landing-handoff` skill's step 6 says to copy the export into the clone by hand: an exclude of every `qa` folder dropped `scripts/qa/` and the first CI run failed; copy with anchored excludes (`/qa/`) or let a script do it.
- `claude -p` runs: the new-landing skill called `node /home/user/landing-factory/scripts/ai-images.mjs ...` with an absolute path, which the `--allowedTools` patterns (relative `node scripts/...`) do not match, so AI generation was blocked during the personal-brand build; also `node scripts/deploy/config.mjs --from-brief --write` is not in the allow list, so a run cannot set a non-Cloudflare target. Fix: make the skill use relative script paths (or allow both forms) and add the deploy config command.
- CI live report on a brand-new Cloudflare Pages project: it runs right after the first deploy, before Cloudflare issues the TLS certificate for the deployment hostname (about two minutes), so `live-tls` fails once. Fix: wait (bounded) for the URL to answer over TLS before the live checks.
- QA full-page screenshots with motion on repeat the top of the page after a pinned section (capture artifact; the real page and the reduced-motion capture are correct). Fix in `scripts/qa.mjs` (capture full pages with reduced motion, or refresh ScrollTrigger first).
- Prompt policy: fixed in PR #28 (short exclusion clauses such as "No people, no logos." are skipped by the word rules; the brand rule still reads the whole prompt).
- samurai mobile performance is near the limit on CI runners (86 in one CI run, 93 locally); a lighter hero poster would give margin.

## tupathdigital (owner's landing) facts

- Brief: `sites/tupathdigital/brief.json` (English page; 20 listings, 3 sold in both stores, so 17 cards; prices in USD; coupons removed 2026-10-31 (they expired); downloads instant, some via a Google Drive link; about 9 sales, not shown; no domain yet; legal markets US and EU, holder name `tupathdigital`, legal and privacy email tupathdigital@gmail.com (not `contact.email`), analytics Cloudflare Web Analytics (cookieless), no forms or embeds; Cloudflare Pages on tupathdigital.com). Product data: Gumroad public pages, Etsy from the owner's CSV export (Etsy listing pages answer with a bot challenge; never bypassed).
- Has `/privacy/`, a 404 page, the starter's script CSP, HSTS and COOP. Report warns only on image savings and "no rule set for US".
- References: `patterns/craftsman-contractor-21st-app.md`, `patterns/crypgo-21st-app.md`. No 3D models (owner).
- Coupons: removed on 2026-10-31. When the owner sends new ones, they need a coupon wording again in `catalog.ts`, the hero, the tiles and the FAQ (git history of `change/tupathdigital-handoff` has the old design); a `coupon` field in the brief schema would make this data-driven (candidate for a later change).

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

- Cloudflare Pages projects: starter `landing-factory-71t`, `panaderia-a3o`, `clinica-dental-9pd`, `samurai-1v4`, `tupathdigital`, `personal-brand-8i7`, `casavela-4bm` (and the archetype pilot sites). A new project's TLS certificate takes about two minutes after its first deploy. CI creates a new site's project on its first deploy. Preview aliases: `https://<branch-alias>.<project>.pages.dev`.
- GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are repository secrets.
- Cloud session network: `williansnieves.com`, `www.williansnieves.com` and `*.vercel.app` are blocked by the proxy (403 on CONNECT) unless the owner adds them. The Claude GitHub App answers 403 to `create_repository` and to `workflow_dispatch`/re-runs; `add_repo` with push access works for repositories in the app's installation (the owner's covers all repositories). Allowed domains include the bakery and pilot reference sites and CDNs, `*.pages.dev`, Met and Commons hosts, `api.openai.com`, and (added 2026-10-25 for the personal-brand references) `www.product.inc`, `product.inc`, `sankar.work`, `www.sankar.work`, `www.sebg.ch`, `sebg.ch`; a newly added domain worked without a new session. `api.vercel.com` is not allowed. New reference sites need their domains added by the user.
- `OPENAI_API_KEY` is set in the environment and works in this session (only the `claude -p` allow list blocked it during a build). Sessions lack `rsync` and `ssh` by default (`apt-get install -y rsync openssh-client`). The `claude` CLI is at `/opt/node22/bin/claude`.
- Chromium for Playwright: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. In scratch scripts outside the repo, load Playwright with `createRequire(process.cwd() + '/')('playwright')` from the repo root.
