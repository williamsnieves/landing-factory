# Run log: fisioterapia-ribera

Result: passed

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field                    | Value                                                                                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Niche                    | Neighbourhood physiotherapy clinic in Zaragoza (from `business.description`)                                                                                                                                |
| Brief                    | `sites/fisioterapia-ribera/brief.json` (valid; prospect brief, `prospect.status: prospect`, no sources: every fact is assumed)                                                                              |
| Assumed fields           | business.name, business.city, business.country, offer[0..2].name, offer[0..2].price, goal.primary.url, contact.phone, contact.email, contact.address, contact.hours, audience.awareness, seo.primaryKeyword |
| Empty recommended fields | proof, contact.social, legal.markets, references.liked, references.disliked, deploy.domain                                                                                                                  |
| Customer assets          | none (prospect brief: no brand assets allowed)                                                                                                                                                              |
| References               | none in the brief or `--refs`; no generic sheet fits a health clinic (the existing sheets are bakeries, SaaS, studios and a contractor), so none is used                                                    |
| Language                 | es (single language)                                                                                                                                                                                        |
| Image sources            | commons (prospect: Commons and The Met only; no AI images)                                                                                                                                                  |
| Mode                     | first run interactive (stopped at the checkpoint 2026-11-03); resumed 2026-11-04T19:49:16Z with `--auto --resume` after the owner approved the proposal                                                     |
| Max QA attempts          | 5                                                                                                                                                                                                           |
| Started                  | 2026-11-03T18:57:14Z                                                                                                                                                                                        |

## Phases

| Phase         | Status | Started              | Finished             | Notes                                                                                                                                                                |
| ------------- | ------ | -------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| brief         | done   | 2026-11-03T18:57:14Z | 2026-11-03T18:58:30Z | Brief valid; prospect, regulated health niche, no proof, no market, no refs                                                                                          |
| synthesis     | done   | 2026-11-03T18:58:30Z | 2026-11-03T18:59:50Z | PROPOSAL.md proposed: swiss-grid-minimal+warm-local-service (practical-strip, hours-card), PAS, trust+calm, split hero, no 3D, no legal pages                        |
| checkpoint    | done   | 2026-11-03T18:59:50Z | 2026-11-04T19:49:16Z | Owner approved the proposal as proposed (2026-11-04); resumed with `--resume --auto`                                                                                 |
| design-system | done   | 2026-11-04T19:49:16Z | 2026-11-04T19:54:19Z | MASTER.md: primary #166534 (reed green), Atkinson Hyperlegible Next 400/600, radii 0 (button 2 px), split hero; tokens, contrast, landing-meta, diversity ok         |
| build         | done   | 2026-11-04T19:54:19Z | 2026-11-04T20:12:27Z | 11 sections + 404, split-stage direction (design-taste-frontend), 2 Commons photos, astro check 0 errors, credits in sync                                            |
| qa            | done   | 2026-11-04T20:12:27Z | 2026-11-04T20:13:30Z | Passed on attempt 1 (Lighthouse 100/100/100, no overflow, 0 impeccable findings); section review clean; conversion review: no findings to act on                     |
| polish        | done   | 2026-11-04T20:13:30Z | 2026-11-04T20:14:13Z | impeccable detect on src 0 findings; dist scan 30 `cramped-padding` false positives (static read without CSS) and 1 advisory (flat type scale, deliberate); no edits |
| final-check   | done   | 2026-11-04T20:14:13Z | 2026-11-04T20:23:00Z | Layers pruned, lint ok; layout-diversity fixed (text-link action, two-column footer); check-landing passed; report 0 fail; final QA passed                           |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins). Every deviation from the chosen archetype sheets, with the requirement or reference that justifies it.

**Copy.** Framework PAS, as in the Copy plan, with the chosen headline "Fisioterapeuta en Zaragoza: 50 minutos con la misma persona, sin prisas". Awareness `problem-aware` (stated in the brief but listed in `assumed`: to confirm). The Agitate stage is one calm question (leaving a consultation unsure, or "junto a un aparato"), with no comparison to other centres. The FAQ "no tengo tiempo…" uses only the hours and the home exercises, states no session frequency, and says the number of sessions is decided at the first assessment. One FAQ answer adds "Esta página no puede decirte qué tienes; si tienes dudas, consulta también con tu médico" (regulated niche, no medical advice). No proof anywhere.

**Design system (ui-ux-pro-max vs the proposal, proposal won; details in MASTER.md section 2).** The skill led with medical cyan/teal; the primary is its "natural green" one step darker (`#166534`, the skill's `#15803D` was 4.45:1 on the surface colour). Mint ground became a near-neutral off-white with the green tint only on the hours card. Cyan secondary and pink/bright accents dropped (one primary). Inter replaced by Atkinson Hyperlegible Next (humanist sans asked by the proposal; Figtree is the other clinic's). The skill's proof and quote-form sections after the hero were not used (no proof; no forms for a prospect). Corners 0; no pill token. Atkinson's zero is slashed, so prices, hours and the phone look a little technical; kept because it is the MASTER.md font.

**Art direction (design-taste-frontend, direction "split-stage", seed 1216048297, `--keep palette,type`; proposal won each time).** 1) No sticky full-height photo half; a normal 7+5 hero and only the `#sesion` label is sticky. 2) Its hero blueprint (12 px radius, giant lowercase wordmark across the photo, blend mode) replaced by radius 0, a 32–40 px `h1` and no wordmark. 3) It bans thin rules; the proposal's rules between cells and sections stay. 4) It bans index numbering; the numbers in Qué tratamos and La primera visita stay, inside real `<ol>`s. 5) It wants headlines of two lines or fewer; the `h1` runs three lines on desktop and four on phones (small heading contrast of the Swiss sheet). 6) It wants at least four pictures; the plan allows three and two are used. 7) Its "one live thing" is absent (a "today" marker on the hours card would need JavaScript). 8) Its richer motion layer (signature scaling wordmark, moving picture) not used: fade-and-rise reveals and the ruler draw only. 9) Its plain-sentence closing and one-line footer replaced by the proposal's colour field and the footer below. 10) Its FAQ beside a tall photo and contact card on a full-bleed photo not used.

**Archetype deviations.** Planned in the proposal: the sticky header with the phone and the action, and the colour field for the closing section (Swiss prefers space over colour bands). Added in the build: the hours card has no "today" highlight (static page, no JavaScript); Prices and Contact repeat the action beside the header's (bends the Swiss "one main action per screen"); in `#sesion` the ruler sits below the sticky label block, so the label stays put only a short distance on desktop; below 1024 px the hours card and contact data stack. `archetype-target` warning `cols1Share 0.56` (Swiss range 0.1 to 0.5): the practical strip, the ruler section and the first-visit block measure as one column; accepted as a deliberate deviation, since those sections are the practical-strip trait and the twist.

**Final-check changes for `layout-diversity`.** The first measure failed against app-finanzas (distance 0.06) and estudio-arquitectura (0.19; minimum 0.2): same rectangular filled buttons, 0 image radius, no eyebrows and a column footer as app-finanzas. Two composition changes, both inside the Swiss sheet's own grammar: 1) the primary action became the sheet's "plain text link with an arrow" (semibold, primary colour, 2 px underline, arrow; white on the closing field), replacing the proposal's planned filled 2 px button; 2) the footer went from four columns to two (business, contact and hours on the left; photo credits on the right; the prospect line below). The off-screen skip link in this site's `BaseLayout` now gets its dark background only on focus (no visible change), so it is not measured as a filled button. Result: `buttonShape text`, `footerType minimal`, both distances above 0.2. Owner to confirm: the action is still the most prominent link on every screen (green, larger, arrow), but less heavy than the approved filled button.

**Other.** No `site` in `astro.config.mjs` (no `deploy.domain`). `site.config.json` already targets `cloudflare`, which is what the brief's `cloudflare-pages` maps to; `node scripts/deploy/config.mjs --from-brief --write` was not run (not on this headless run's allow list) and would change nothing. The phone-width header uses the shorter label "Reservar valoración" (same URL).

## Images

- Count: 2 photos, both Wikimedia Commons (prospect: Commons and The Met only), each captioned "Foto ilustrativa" and never presented as the clinic, its team or its patients.
  - `hero-tratamiento-pierna.jpg`: "Leg treatment in physiatry closeup", Shixart1985, CC BY 2.0 (footer credit). Hero. Cropped with `object-position` to the hands on the thigh: the branded socks and a blurred background person stay outside the crop.
  - `tratamos-rodilla.jpg`: "The fastest route is acute with JBER Hospital Acute Care Clinic" (151014-F-WT808-026), Airman 1st Class Christopher Morales, public domain. "Qué tratamos". Cropped toward the left so the uniform sleeve stays out.
- Dropped: `banda-elastica.png` ("Strength band", CC BY-SA 4.0): a transparent cut-out in neon green that clashed with the reed green and the rectangular-photo rule; file deleted and its `assets.json` entry removed.
- Searches with no usable result: "physiotherapy back massage" (only an uncredited Wellcome item), "running knee injury", "runner legs road", "jogging shoes" (unrelated or faces), "physiotherapist examining neck shoulder" (nothing). Commons rate limit: about 6 waits of 10 to 57 s.
- The proposal planned up to three photos; the third (a home exercise) is covered by the ruler section's text instead.
- AI images: none (prospect: nobody can consent).

## QA attempts

| #   | Verdict | Failures by check | Fixed          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------- | ----------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | passed  | none              | nothing to fix | Full run (`npm run qa -- --site fisioterapia-ribera`): 375/768/1440 no overflow or clipping, reduced motion pass (43 reveals visible), Lighthouse worst 100/100/100 (best-practices 100), impeccable 0 findings. The build subagent's earlier fast layout runs (`--skip lighthouse,impeccable`) fixed two clipped screen-reader-only labels and the hours table wrapping at 375 px. Section screenshots (`section-shots --include-404`) reviewed: no repeated photo, photos match their text, notice visible, 404 restyled and readable at 375 px. |

## Conversion review

- Audit (`node scripts/conversion-audit.mjs --site fisioterapia-ribera`): 0 warnings, 1 info: `legal-linked` on `/` (footer: no legal page), expected because the brief names no market.
- Review against the section screenshots (cro questions): the value proposition and keyword are in the `h1`; one primary action, "Pide tu primera valoración", in the header, hero, first-visit block, highlighted price, contact block and closing field; "Llámanos" with the phone stays visually weaker; prices visible with what each includes; no proof shown (none in the brief).
- Changed: nothing.
- For a person: the phone-width header shortens the button label to "Reservar valoración" (same URL) to fit 375 px; confirm the wording. Legal pages need a market and holder data after a sale.
- Conversion plan items the page could not honor: none.

## Sales kit

`SALES.md` was written after the run by the reviewing session (`node scripts/prospect.mjs kit --site fisioterapia-ribera`, 2026-11-04): the run ended with `Result: passed` without the kit step the skill asks for. Its "What was built" copies the proposal's planned filled button, which the final check replaced with a text link (see Design decisions).

## Final check

All on the last build (2026-11-04T20:20Z):

- Layers: `site-layers prune` removed the unused 3D layer (`three`, `@types/three`), the legal components and the lead forms components; `npm install` run; `npm run lint` passes (ESLint, knip, layer check).
- `npx prettier --check .`: clean. `credits --check`: up to date. `npm run check:sites`: 0 errors in all 11 sites.
- `layout-signature --write` then `check-landing`: PASSED (images-credited, credits-in-sync, photo-uses, landing-meta, tokens, contrast, diversity, layout-diversity, scenes, copy-claims, dark-patterns, prospect, brief-facts; originality skipped, no reference sheets). One warning: `archetype-target` cols1Share 0.56 (recorded under Design decisions). `layout-diversity` failed once and was fixed by changing the composition (see Design decisions).
- `copy-claims`: no failure and no warning. `dark-patterns`: ok (the page has no form, no timer).
- `npm run report -- --site fisioterapia-ribera --only static --skip audit`: passed, 0 fail, 2 warn: a 128 KB JPEG (the Open Graph crop of the hero; social cards need JPEG or PNG) and "the brief names no market" (legal requirements unknown). Every `seo-*` item is n/a because every page is `noindex` while the business is a prospect.
- `legal.mjs --check`: not applicable (no market, no `legal.json`).
- Final `npm run qa -- --site fisioterapia-ribera` after the last edit: passed, 0 failures (Lighthouse 100 on every category, no overflow, reduced motion pass, impeccable 0).

## To confirm before launch

- A person must read the whole copy before publishing.
- This is a prospect page: every page is `noindex` with the visible prospect notice. It cannot be published as the business's site until the business has bought it (`node scripts/prospect.mjs sold`), and a rebuild with its own data and assets follows.
- Every business fact is assumed and shown as example data: name, city, the three services and prices (45 €, 40 €, 180 €), the booking URL (`reservas.example.com`), phone, email, address and hours. `audience.awareness` and `seo.primaryKeyword` are assumed too.
- The FAQ answer to "no tengo tiempo para ir dos veces por semana" states no session frequency (the brief gives none); confirm with the business.
- The primary action is a text link with an arrow, not the filled button the proposal approved (changed for `layout-diversity`); the phone header label is "Reservar valoración".
- Legal requirements unknown: no market in the brief, so no legal notice or privacy page. After a sale: markets and holder data in the brief, then `node scripts/legal.mjs`.
- No `deploy.domain`: canonical and Open Graph URLs stay relative until `site` is set.
- Photos are illustrative Commons stock (credited in the footer and `CREDITS.md`); replace them with the business's own photos, with permission, after a sale.
- `SALES.md` was not written: `node scripts/prospect.mjs kit --site fisioterapia-ribera` needs approval in this headless run. Run it by hand.

## To fetch by the owner

- Nothing behind a login: the brief names no assets or links.

## CI follow-up (2026-11-04)

The first CI run's live report failed `live-headers-baseline`: the prospect step of `seoFiles()` appended a second `/*` block to `dist/_headers`, and Cloudflare Pages served only that one, so the deployed page lost its CSP `frame-ancestors`, HSTS, COOP and Permissions-Policy. Fixed in the starter and this site's `astro.config.mjs`: the `X-Robots-Tag` line now joins the existing `/*` block. The CI wait for the new project's certificate (`--wait-tls`) worked: 13 attempts, about two minutes.

## Totals

Wall clock, approximate tokens when the session reports them, remaining failures if the run did not finish.

- First run: stopped at the checkpoint after about 3 minutes (2026-11-03T18:57:14Z to 2026-11-03T18:59:50Z).
- Resumed run: 2026-11-04T19:49:16Z to 2026-11-04T20:23Z, about 34 minutes (design system 5 min, build 18 min, QA, polish and final check 11 min). Remaining failures: none.

Usage: input 36 tokens, output 19,012, cache write 133,049, cache read 2,346,192, cost $1.9140 USD, 34 turns (reported by Claude Code).

Usage: input 100 tokens, output 26,467, cache write 79,813, cache read 11,282,243, cost $12.7285 USD, 77 turns (reported by Claude Code).
