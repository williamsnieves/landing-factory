# Proposal: personal-brand

Status: **proposed**. Review it, edit anything, then continue with `scripts/new-landing.sh personal-brand --brief sites/personal-brand/brief.json --refs product-inc,sankar-work,sebg-ch --lang en --langs en,es --resume --auto`.

## Brief

- **Source:** `sites/personal-brand/brief.json` (the owner's requirement; `goal.primary` is listed in `assumed`) and `CONTENT.md` (his CV and the old Vue site, the only source of facts).
- **Niche:** personal brand of a senior front end and AI-engineering developer; the entry point to who he is and what he can do.
- **Brand (real):** Willians Nieves, Madrid, Spain. Logo: the {W} code-brace mark, used as supplied. Portrait: the owner's AI-generated portrait of himself (half human, half machine), with his consent.
- **Goal of the page:** to be seen and understood: who he is, what he does, the path that got him here. No call to action for now. The quiet primary link is his LinkedIn profile (assumed, owner to confirm), next to GitHub, in the header and the footer; it is a text link, never a big button.
- **Audience:** anyone who wants to see his site: recruiters, peers, collaborators, curious visitors.
- **Tone:** like himself, in his own words, a touch of humor, professional.
- **Signals:** technical, playful, experimental, storytelling, bold, few-assets
- **Language:** multi-locale: en, es (default en, no URL prefix; Spanish under /es/). The copy is written for each locale as natural text, same sections in each.
- **Site location:** `sites/personal-brand/`, deployed to Vercel (`site.config.json`), domain williansnieves.com.

## References used

| Sheet                     | What we take                                                                                                                                                                                                            | What we leave                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `patterns/product-inc.md` | The concept (the owner's reason): a person presented as a small product, honest and self-aware humor; a status ticker; a tab-like nav that is also a table of contents; a dotted-rail resume timeline; a bento of facts | The globe, the corner brackets, nine nav items, the humor itself, dashed inline links as credibility                              |
| `patterns/sankar-work.md` | A cool, glowing dark palette with one warm highlight; project and skill presented in several formats (cards with status tags, segmented skill bars)                                                                     | Thirty sections, emoji as icons, gradients and glows everywhere, fixed side badges and overlays on mobile, the overflow at 375 px |
| `patterns/sebg-ch.md`     | The character as the narrative thread: the portrait follows the reader and changes state per section; one sticky stage; a flat saturated color per section; statement-sized type with one weight contrast               | The dither look, the cartoon style, the bubble jokes, audio, a seven-viewport pin, scroll hijacking at 375 px                     |

**Direction in one line:** a dark, glowing personal "operating system" where one half-human, half-machine portrait walks the reader through the sections, and each chapter owns a saturated color field.

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site personal-brand --refs product-inc,sankar-work,sebg-ch`. The top candidate is `custom`; the best archetypes to fill the gaps are `brutalist-raw` and `typographic-poster`.

- **Primary:** `custom` (the three references give the grammar: product-inc the page concept and navigation, sebg-ch the character and the color-per-section rhythm, sankar-work the palette temperature and how work is shown)
- **Secondary:** `brutalist-raw` fills gaps only (mono labels for tags, dates and the ticker; hairline structure)
- **Lent traits:** `mono-labels`, `ref:product-inc/marquee-type` (the status ticker), `ref:sebg-ch/visible-grid` (faint column lines as decoration)
- **Why:** the owner named three references that inspire together and said none is a template; signals bold, experimental, playful, technical and few-assets (one portrait, one logo) all point at a page where type, color and one character carry everything. The only brutalist-raw+typographic-poster pairing is already used by another site, so the references lead and the archetype only fills gaps.
- **Twist from the requirement:** **"Two halves."** His portrait is literally split down the middle. A vertical seam runs through the page: the human half (father, guitar, games, the person) is warm and the machine half (AI engineering, harness, agents) is cool. In each section the seam moves, and the portrait changes which half faces the reader. Scrolling shifts the page from one half to the other.
- **Planned deviations:** no pill buttons or giant wordmark footer (shared grammar); the hero is a collage of the portrait, giant type and overlapping tags, not a rounded photo beside text; headings are not under a small uppercase eyebrow (labels sit in mono beside the number, not over the heading); the page has no big call to action (owner's decision).

## Page map

Same seven sections plus footer in both locales, same order and components. Navigation is a sticky header with the {W} logo, five anchors (About, AI, Path, Skills, Beyond code), a LinkedIn and GitHub text link pair and the language switcher; it collapses to a short row on mobile.

| #   | Section                 | Height         | Purpose                                                                                 | Layout idea                                                                                                                                                                  |
| --- | ----------------------- | -------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Hero                    | 1 vp           | Who he is in one look                                                                   | Dark field with glows; giant name two lines (one light, one bold cut); portrait collaged bottom right with the seam; role line; status ticker strip above the header         |
| 2   | About, "Two halves"     | 1.3 vp         | Who he is in his own words: front end dev, father, guitar player, plays and makes games | Large statement paragraph on columns 6 to 12, a warm color field and a mono fact column on the left (no photo: the portrait is used twice at most); one phrase in the accent |
| 3   | AI engineering stage    | 2 vp (one pin) | What he does now: context and harness engineering, SDD with OpenSpec, agents, LangChain | The one pinned stage: the portrait turns to the machine half; the 12 AI skills and tools come in as mono chips per step; falls back to a plain block                         |
| 4   | Career path             | 1.8 vp         | Eight jobs, Glintt 2025 back to Teravision 2015, with real stacks                       | Vertical dotted rail; each employer card has its own flat color field; role, place, dates, two or three bullets, stack as chips; earlier roles grouped in a compact list     |
| 5   | Skills                  | 1.2 vp         | The full skill set in groups (AI, frameworks, frontend, principles, workflow, soft)     | Bento of mixed 1x and 2x tiles; chips, no invented proficiency bars (the CV gives no levels)                                                                                 |
| 6   | Beyond the code         | 0.8 vp         | The human half: father, guitar, games he plays and makes                                | Three short cards; one playful moment: a row of guitar strings (SVG) that vibrates on hover or focus                                                                         |
| 7   | Education and languages | 0.4 vp         | Humboldt University 2008 to 2011; Spanish native, English B2                            | A compact strip                                                                                                                                                              |
| 8   | Footer                  | 0.4 vp         | Links: LinkedIn, GitHub; language switcher; AI disclosure; photo credits                | Columns footer, not a wordmark; no blog link, no email, no phone                                                                                                             |

The 404 page is restyled in the same design (own voice, links home and to LinkedIn).

## Motion plan

| Moment                 | Trigger       | Type             | Notes                                                                                                          |
| ---------------------- | ------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| Hero name and portrait | load          | reveal           | Short offset and fade, once                                                                                    |
| Status ticker          | idle          | marquee (CSS)    | Pauses on hover; a static line under reduced motion                                                            |
| Section content        | scroll        | reveal           | `data-reveal`                                                                                                  |
| Portrait seam          | scroll        | parallax / scrub | The seam and the facing half change between hero and AI stage, through the motion primitives, once per section |
| AI engineering stage   | scroll        | pin              | The one pinned section; each step shows a chip group while the portrait turns                                  |
| Employer cards         | scroll        | reveal           | Background tint changes per card                                                                               |
| Guitar strings         | hover / focus | playful moment   | CSS or SVG animation, one moment only                                                                          |

Reduced motion: no pin, no scrub, no parallax, no smooth scroll, no marquee; all content visible in its final state, the portrait static with the seam centered. Without JavaScript the page reads top to bottom with every section visible and the language switcher works as plain links.

## Visual direction

- **Type:** a distinctive grotesque display with two clearly different cuts (light and heavy) in one headline, a neutral humanist body, a mono face for labels, dates and chips. The design system step fixes the families; all open-licensed `@fontsource` packages. Display and body must differ from the other sites (Archivo, Manrope, Schibsted, Space Grotesk, Fraunces, Figtree, Newsreader).
- **Palette:** near-black ink with a cool navy tint as the base (sankar-work's temperature), the portrait's warm coral-orange as the primary accent (human half) and the {W} logo blue as the cool accent (machine half), one violet bridge between them (the portrait gradient). Per-section flat color fields from this family (sebg-ch's rhythm), kept dark enough for light text. The logo keeps its own colors. Primary family: coral-orange, which no other site uses.
- **Hero type:** `collage` (portrait, giant type, chips and a ticker overlapping on one dark field).
- **Imagery:** the customer's portrait and logo (`source: customer`, owner and permission from the brief; the portrait is recorded with `ai-images.mjs import --subject owner`, with its generator, model and terms to confirm with the owner, see Decisions). Two soft, AI-themed background images are allowed (`brand.aiImages: allowed`): generated with `ai-images.mjs` when `OPENAI_API_KEY` is set, otherwise drawn with CSS gradients and SVG. No stock photos. No images from the references.

## 3D

None. The portrait and CSS carry the page.

| Scene | Purpose | Poster | Scroll behavior | Reduced-motion fallback |
| ----- | ------- | ------ | --------------- | ----------------------- |
| none  |         |        |                 |                         |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440 in either locale, reduced motion respected, content visible without JS, no major impeccable findings, `check-landing` passing including the `i18n` rule and `brief-facts`.

## Out of scope

Online shop, cart, payments, backend forms, CMS, a blog (dropped by the owner), a contact form, a contact email or phone on the page (owner's decision), a browser-language redirect (static output), legal pages (see Decisions).

## Decisions

1. **Locales:** en (default, at `/`) and es (at `/es/`), natural copy in each, same sections. A native speaker of Spanish and of English should read the copy before launch. The old site had both languages.
2. **Assumed (confirm at the checkpoint):** `goal.primary` is his LinkedIn profile (`https://www.linkedin.com/in/willians-nieves`, the CV's address, not the old site's with the numeric suffix), shown as a quiet text link, because the owner wants no call to action for now.
3. **Empty fields and what the page does:** no offer (no products or prices, so none are shown), no email, phone or address (owner's decision, nothing is invented), no `business.kind`, `audience.needs` or `objections`, no brand colors or fonts (free, creative). No testimonials, ratings, awards or figures that are not in `CONTENT.md`.
4. **Facts come only from `CONTENT.md` and the brief.** Open points to confirm: the I-Surance dates (CV: Aug 2018 to Sep 2020; old site: Aug 2018 to Feb 2020; the page uses the CV's); the skill the owner wrote as "jev" is shown as JEV, "a System 1 decision model" in his wording, to be confirmed; the CV repeats the Instaply bullets for I-Surance, so only its stack is used.
5. **AI images:** `brand.aiImages` and `brand.ownerPortrait` are `allowed`. The portrait is the one permitted AI portrait of a person (alt: "AI-generated portrait of Willians Nieves", never "photo"; it is not a testimonial). Its provenance (generator ChatGPT, model, prompt, creation date, terms link) is needed for `ai-images.mjs import`; if the owner does not have the model and prompt, the page cannot ship it and the run lists it under "To fetch by the owner". The footer carries `data-ai-disclosure` in each locale's language.
6. **Legal:** the brief names no market and the owner asked to skip legal pages ("legal requirements unknown"): no notice or privacy page is added, the report will warn. No cookies, no analytics, no embeds, no third-party hosts (fonts self-hosted), so no banner is needed.
7. **Deploy:** the brief asks for Vercel; `node scripts/deploy/config.mjs --site personal-brand --from-brief --write` completes `site.config.json`, and `site` in `astro.config.mjs` is `https://williansnieves.com` (absolute canonical and hreflang). Secrets (`VERCEL_TOKEN`) are set in the repository by the owner; the live domain move from Netlify is the owner's step.
8. **Customer assets:** `assets/logo.svg` (header, footer, favicon candidate, used as supplied) and `assets/portrait-ai.webp` (hero and the AI stage only: at most twice in the page, never twice in one section).
