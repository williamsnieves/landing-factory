# Visual directions: casavela

Three draft directions for Casavela Inmobiliaria (Valencia), built from `brief.json` before the full build. Each one is a `noindex` page with a hero and one section, served from the same build: `/directions/a/`, `/directions/b/`, `/directions/c/`, and an index at `/`. Record: `directions.json` (`choice: null` until the customer picks). Business name, contact data, WhatsApp and phone numbers and the offer are `assumed` in the brief: every page marks them as sample data to confirm.

Palette and fonts of every direction come from ui-ux-pro-max only; the tokens are scoped to the page under `[data-direction="<id>"]` in `src/styles/directions/<id>.css`, and `src/styles/tokens.css` stays the neutral default.

## a: Claridad

**Blend:** `custom` (reference-led), traits `ref:framer-com/split-sticky`, `ref:stripe-com/stat-strip`; `data-and-proof` fills gaps. **Hero:** split.

A light, product-like page framed by hairline vertical rails, with one saturated violet used only for actions. The split hero pairs a two-tone headline (first sentence in ink, the continuation muted) and the WhatsApp and phone buttons with an HTML card that previews the free valuation visit; a strip of figures that are brief facts follows (0 €, 3 services, 4 municipalities). The one section is the customer's own request from the Framer reference: a sticky split where four short educational blocks scroll beside a CSS-sticky mortgage calculator, with the brief's notice under the result and a server-rendered example when JavaScript is off.

```text
primary           #6d28d9
primary-contrast  #ffffff
accent            #a78bfa
ink               #1b1940
ink-soft          #4b5468
paper             #fbfbfe
surface           #f1f0fb
line              #dedcf0
display / body    DM Sans (@fontsource-variable/dm-sans)
radii             0.375 / 0.625 / 1 rem
contrast          ink/paper 16.2, ink-soft/paper 7.3, white/primary 7.1, ink/surface 14.8
```

## b: Sin letra pequeña

**Blend:** `brutalist-raw+data-and-proof`, traits `stat-strip`, `comparison-table`. **Hero:** typographic.

A raw, structural page that answers the audience's objections (distrust of agencies, unclear fees, fear of low appraisals) with structure instead of promises: 1 px ink rules around every cell, small monospaced labels, square corners, and a vermilion red used only for the main action and one word of the headline. The hero is a huge flush-left condensed headline beside a narrow label column, followed by a ruled strip of three figures that cite where they come from (0 €, 3 services, 4 municipalities). The one section is a real table of the three services (for whom, what it includes, price, how to start) that stacks into one ruled block per service on phones; every price carries a "dato de ejemplo" tag and the fees row says "pendientes de confirmar".

```text
primary           #d02020
primary-contrast  #ffffff
accent            #f4cfc8 (tag background, ink text only)
ink               #121212
ink-soft          #464646
paper             #f0f0ec
surface           #e2e2dc
line              #121212
display           Barlow Condensed 800 (@fontsource/barlow-condensed)
body              Barlow 400/600 (@fontsource/barlow)
mono              Space Mono 400/700 (@fontsource/space-mono)
radii             0 / 0 / 2 px
contrast          ink/paper 16.4, ink-soft/paper 8.3, white/primary 5.4, ink/surface 14.4, primary/paper 4.7
```

## c: De barrio

**Blend:** `warm-local-service+data-and-proof`, trait `stat-strip`. **Hero:** full-bleed-photo.

A warm neighbourhood-agency look: a full-bleed photo of sunlit Valencia balconies (Commons, CC BY-SA 4.0, credited in the footer) with the headline and the WhatsApp action on a solid cream panel, so the text never depends on the photo. Deep huerta olive for actions, terracotta only as decoration, Calistoga headings and Nunito Sans text. Under the hero, a practical strip says where, when and how to reach the agency (each value tagged "dato de ejemplo"), then an olive stat strip (0 €, 3 services, 4 municipalities); the one section shows the three services as rounded cards beside the service-area chips and an hours card, and closes with the call to action.

```text
primary           #4f5d2f
primary-contrast  #fffdf7
accent            #c4693f (decoration only)
ink               #2a2118
ink-soft          #5a4d3e
paper             #f6f0e3
surface           #eadfc8
line              #d6c8ac
display           Calistoga 400 (@fontsource/calistoga)
body              Nunito Sans (@fontsource-variable/nunito-sans)
radii             6 / 10 / 20 px
contrast          ink/paper 13.9, ink-soft/paper 7.2, primary-contrast/primary 6.6, ink/surface 12.0, primary/paper 5.9
```

## Quality

QA passed on the first run (`npm run qa -- --site casavela`): no overflow or clipped text at 375, 768 and 1440 px, reduced motion respected, Lighthouse worst of mobile and desktop at least 96 in performance and 100 in accessibility and SEO on every page. `node scripts/directions.mjs check --site casavela`: 3 directions ok. Static report: no failing item.

## Cost

Three direction subagents of about 146k to 156k tokens each, plus the orchestration. The `Usage:` line that `scripts/new-landing.sh` appends to `RUN.md` has the measured total and cost of the run.

## Next step

Send the customer the preview URLs of `/directions/a/`, `/directions/b/` and `/directions/c/` with the idea lines above, ask which one is closest and what to change, and record the answer in their words:

```bash
node scripts/directions.mjs choose --site casavela --direction <a|b|c> --notes "..."
```

Then run the full build with `scripts/new-landing.sh casavela --brief sites/casavela/brief.json --resume --auto`.
