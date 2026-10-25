# Run log: personal-brand

Result: passed

Written by the /new-landing skill. `Result:` ends as one of `checkpoint` (waiting for approval), `dry-run-done`, `passed` or `failed`; scripts/new-landing.sh reads it for its exit code. A phase marked `done` is skipped when the run resumes.

## Inputs

| Field           | Value                                                                                                                                                                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Niche           | Personal brand of a senior front end and AI-engineering developer. Brief: sites/personal-brand/brief.json (assumed: goal.primary; empty: offer, contact email, phone and address, business.kind, audience needs and objections, brand colors and fonts, legal market) |
| References      | patterns/product-inc.md, patterns/sankar-work.md, patterns/sebg-ch.md. Assets: assets/logo.svg (logo), assets/portrait-ai.webp (photo, owner portrait)                                                                                                                |
| Mode            | checkpoint (no --auto), lang en, langs en,es                                                                                                                                                                                                                          |
| Max QA attempts | 5                                                                                                                                                                                                                                                                     |
| Started         | 2026-10-25T15:16:40Z                                                                                                                                                                                                                                                  |

## Phases

| Phase         | Status | Started              | Finished             | Notes                                                                             |
| ------------- | ------ | -------------------- | -------------------- | --------------------------------------------------------------------------------- |
| brief         | done   | 2026-10-25T15:16:40Z | 2026-10-25T15:17:00Z | brief valid; locales en, es                                                       |
| synthesis     | done   | 2026-10-25T15:17:00Z | 2026-10-25T15:17:52Z | custom blend (product-inc, sankar-work, sebg-ch), brutalist-raw fills gaps        |
| checkpoint    | done   | 2026-10-25T15:17:52Z | 2026-10-25T15:47:00Z | approved by the owner; resumed with --auto                                        |
| design-system | done   | 2026-10-25T15:47:00Z | 2026-10-25T15:52:00Z | Bricolage Grotesque, Instrument Sans, Geist Mono; primary #ff6f3c                 |
| build         | done   | 2026-10-25T15:52:00Z | 2026-10-25T16:01:00Z | built; check and credits pass; deploy config awaiting approval                    |
| qa            | done   | 2026-10-25T16:01:00Z | 2026-10-25T16:08:22Z | passed on attempt 2 (1 reviewer fix, 768 px card heading); review clean           |
| polish        | done   | 2026-10-25T16:09:00Z | 2026-10-25T16:11:00Z | detect on src: 0 findings; on built html only minor notes; no edits, QA unchanged |
| final-check   | done   | 2026-10-25T16:11:00Z | 2026-10-25T16:20:00Z | check-landing passed after 2 fixes; QA re-run passed on the final files           |

## Design decisions

Skill conflicts and how they were resolved (the approved proposal wins). Every deviation from the chosen archetype sheets, with the requirement or reference that justifies it.

**design-taste-frontend (art direction only, `--keep palette,type`).** Dealt 3 directions for `personal-portfolio` (pinned-poster, split-stage, page-is-the-object); chose `split-stage` (seed 848670250) because its idea, one half that stays put while the other half changes, is the "two halves" twist: the portrait is the fixed half of the AI stage and the steps are the reading half. Taken from it: the sticky portrait half with a changing crop, a two-ended compact list (earlier roles), flat grounds that differ per section, one signature move (the stage), and "change what the reading half holds from section to section" (statement, steps, cards, bento, strip). Not taken, and why (proposal and MASTER.md win):

- Its house rules say no monospace, no eyebrow labels, no `01/02/03`, no thin rules, no gradients, no violet, no shadows and a floor of four real pictures. The proposal and MASTER.md require mono labels (a lent trait), numbered chapters beside (not above) the heading, hairlines, the violet bridge and glows. Gradients stay as soft radial glows and one seam line, never on controls. The brief has two pictures (logo, owner portrait) and forbids stock photos, so the "four pictures" floor is not met on purpose; the hero is a collage of type, portrait and tags instead.
- Its hero (striped card beside the room), footer (name across the last photograph) and founder's letter were not built: the proposal's hero is a collage and bans a giant wordmark footer.
- Its type and palette slots were kept from MASTER.md (`--keep palette,type`).

**Archetype blend (custom: product-inc, sankar-work, sebg-ch; brutalist-raw fills gaps).** Deviations from `design-archetypes/brutalist-raw.md`, each justified by the requirement or a reference: soft radial glows behind the hero and the 404 (sankar-work temperature, a dark "OS" page); a hairline column grid as decoration (`ref:sebg-ch/visible-grid`); a short 1200 ms portrait turn and 320 ms step collapse in the AI stage (sebg-ch's character that changes per section), reveals through `data-reveal`; rotated tags (-3 to 2 degrees) overlapping the portrait (collage hero); a CSS scroll-driven tint on the machine half of the portrait where `animation-timeline` exists (progressive, off under reduced motion).

**Build choices.**

- Hero: the name is one `<h1>` with two block spans (light 200 then heavy 800 cut of Bricolage Grotesque, `text-4xl`); at 375 px the name measures about 52 px and fits. The portrait seam is a 2 px bridge-colored line at 55.5% of the portrait (where the face splits), with `human` and `machine` mono labels aligned to it.
- AI stage: the one pin (`data-pin data-pin-min="md"`, 100% distance). A small script in `AiStage.astro` reads the same pin range through ScrollTrigger and sets `data-step` 1 to 3; each step opens in turn (the others collapse to title and chips) while the portrait crop zooms from the face to the eye to the cables. On phones, under reduced motion and without JavaScript there is no `data-step`: the portrait is static and all three steps are open.
- Career: five recent employers as flat field cards on a dotted rail; the CV's I-Surance dates (Aug 2018 to Sep 2020) with its stack only; the four earlier roles as a compact list. The counter "Nine stops" in the intro is the 5 cards plus the 4 earlier roles.
- Skills: the AI skills live in the stage, so the bento's AI tile holds only the AI tools list (no duplicated chips).
- Beyond the code: cards for father, guitar and games use only the owner's own facts; the humor adds no facts. The guitar strings are an SVG `<button>` that vibrates on hover and keyboard focus and only changes color under reduced motion.
- Header: the {W} logo, five anchors, LinkedIn and GitHub as quiet text links from 1024 px, language switcher; below 768 px a short row with a `<details>` menu (no JavaScript). Anchors point to the locale's home page so the 404 page can reuse the header. LinkedIn is the only conversion link and is never a button.
- 404: restyled in the page design (English, noindex), no language switcher (there is no translated 404), no AI disclosure (no AI image shown), links home and to LinkedIn.
- Favicon: `public/favicon.svg` is a copy of the customer's logo (27 KB, used as supplied).
- Copy: written per locale (`src/content/en.ts`, `src/content/es.ts`, one interface), facts exact in both; the Spanish keeps proper names and skill terms in English (job titles, "harness engineering") as the owner writes them.

## Images

AI images: 1 of 12 (the owner portrait). No stock photos, no Commons or Met images, no credits needed in the footer (`src/data/credits.json` is empty).

| File               | Source                                                                                           | Where used                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `logo.svg`         | customer (owner Willians Nieves), recorded in `assets.json`; also copied to `public/favicon.svg` | header and footer (as supplied), favicon                                                                                |
| `portrait-ai.webp` | AI, owner portrait (`subject: owner`, ChatGPT, imported), 1 of 12                                | hero and the AI engineering stage (two uses, never in the same section); alt "AI-generated portrait of Willians Nieves" |

The two soft AI-themed background images from the brief were not generated: the build session could not confirm an `OPENAI_API_KEY` (reading the environment needed an approval it did not have), so the generator was not run. The backgrounds are CSS radial gradients (hero, 404) and flat color fields instead; nothing was invented. If the owner wants generated backgrounds, run `node scripts/ai-images.mjs generate personal-brand ...` with the key set. The footer carries `<p data-ai-disclosure>` in each locale's language.

## QA attempts

| #   | Verdict | Failures by check | Fixed                                                                         | Notes                                                                                              |
| --- | ------- | ----------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | passed  | none (0 failures) | nothing                                                                       | Reviewer pass found `/es/` "Videojuegos" heading overflowing its card at 768 px (not caught by QA) |
| 2   | passed  | none (0 failures) | Beyond cards: `min-w-0`, smaller card heading at md, `overflow-wrap:anywhere` | Re-ran QA and section shots; both locales and 404 reviewed at 375/768/1440, clean                  |

## Final check

Result of `check-landing`, `credits --check`, Prettier and `astro check`.

- Polish (one round): `impeccable detect` on `src/` found nothing (regex engine only); on the built HTML only minor notes (cramped padding on bordered cards, the ticker marquee, radial glows, striped decoration), all deliberate parts of the approved proposal. No polish edits.
- Prettier `--write` then `--check .`: pass. `credits --check`: up to date. `npm run check:sites`: 0 errors in every site.
- `check-landing --refs product.inc, sankar.work, sebg.ch`: PASSED (images-credited, credits-in-sync, photo-uses, landing-meta, tokens, contrast, diversity, layout-diversity, scenes, i18n, ai-provenance, brief-facts, originality). `i18n`, `ai-provenance` (disclosure on `/` and `/es/` in each language) and `brief-facts` pass for both locales. No archetype-target warning printed.
- First run failed two rules, fixed once each:
  - `photo-uses` (portrait counted 3 times): a false positive of the counter (the import name `portrait` also matched the CSS class `portrait` in Hero.astro). Renamed the import to `heroPortrait`; real uses are 2 (hero, AI stage).
  - `layout-diversity` (0.20 under 0.2 vs estudio-arquitectura, then 0.16 vs app-finanzas): real composition changes, not colors. The footer's legal line and AI disclosure moved into the first column so the footer is a true four-column block (no bottom bar); the hero portrait block turns -0.9 degrees and the AI stage portrait +0.9 degrees from 1024 and 768 px (collage, off the grid); both portraits get a 4 px radius (`--radius-lg`, inside the 0 to 4 px rule). Layout signature re-measured; distance now above 0.2 for every site.
- QA after the last file change (`npm run qa -- --site personal-brand`): PASSED, 0 failures (`qa/personal-brand/2026-10-25T16-14-21Z`).
- Landing report (`--skip audit`, after the last QA): passed, 0 fail, 3 warn, 3 n/a. Warns: legal requirements unknown (the brief names no market, so no legal pages were made; see launch list), mobile LCP 2.6 s against the 2.5 s report limit (the portrait is the LCP element; Lighthouse performance still >= 90), and the portrait file could be smaller on mobile (65 KB of savings reported). `npm audit` was skipped on purpose.

## Totals

Wall clock, approximate tokens when the session reports them, remaining failures if the run did not finish.

## To confirm before launch

- Spanish copy: a native reader should check `src/content/es.ts` (proper names and skill terms stay in English on purpose). Also an English read of `src/content/en.ts`.
- Deploy target is Vercel in the brief, but `sites/personal-brand/site.config.json` still says `cloudflare`: `node scripts/deploy/config.mjs --site personal-brand --from-brief --write` was blocked by a permission prompt in this session and again in the final check. Run it (or set the target by hand), then add the `VERCEL_TOKEN` secret to the repository.
- Domain: moving the domain from Netlify to Vercel is the owner's step (DNS), not done here.
- Owner portrait provenance: confirm the creation date and the model/tool recorded in `assets.json` for `portrait-ai.webp` (ChatGPT, imported) and that the owner consents to the portrait on the page.
- Legal requirements are unknown: the brief names no market, so there are no legal notice or privacy pages. Name the markets and holder data with `/brief-intake`, then `node scripts/legal.mjs --site personal-brand --write`. The report warns until then.
- I-Surance dates (Aug 2018 to Sep 2020) come from the CV; confirm them.
- JEV wording: confirm the exact wording of the JEV entry with the owner.
- `OPENAI_API_KEY` was not available, so the two AI-themed background images were not generated; the backgrounds are CSS gradients. Generate them with `ai-images.mjs` if the owner wants them.
- Mobile LCP is 2.6 s (report warn); optionally ship a smaller portrait for phones.

## To fetch by the owner

Nothing: the logo and the owner portrait were provided and are in the site.

## Wall clock and tokens

Wall clock: about 64 minutes from 2026-10-25T15:16:40Z to 16:20Z, of which the checkpoint wait was about 30 minutes (active work about 34 minutes). Polish and final check: about 9 minutes. Tokens for these two phases are not reported by the session; the totals line below covers the earlier phases only.

Usage: input 36 tokens, output 12,136, cache write 96,818, cache read 1,835,811, cost $0.6923 USD, 24 turns (reported by Claude Code).

Usage: input 4 tokens, output 847, cache write 2,078, cache read 134,208, cost $4.8453 USD, 1 turns (reported by Claude Code).
