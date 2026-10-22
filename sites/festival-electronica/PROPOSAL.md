# Proposal: festival-electronica

Status: **proposed**. Automatic run (`--auto`): the checkpoint is passed without review.

## Brief

- **Niche:** three-day electronic music festival in a former factory in Bilbao.
- **Brand (fictional or real):** TALLER 303, a fictional festival held in a disused factory hall in Bilbao (placeholder dates, address and contact data).
- **Goal of the page:** primary action: buy tickets (external link, opens the ticketing site). Secondary: read the line-up and schedule, find the venue.
- **Audience:** 20-40 year olds looking for club music and visual arts.
- **Tone:** loud, nocturnal, experimental.
- **Signals:** bold, experimental, conversion-first, few-assets, playful
- **Language:** Spanish (es).
- **Site location:** `sites/festival-electronica/`, its own Cloudflare Pages project.

## References used

| Sheet                                    | What we take                                                                                               | What we leave                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `patterns/experience2026-funtech-inc.md` | The terminal voice: monospace status lines, counters and meters as content, a pared-back dark ground       | The boot-sequence preloader, the museum-like scene names, the green glow                               |
| `patterns/crazy-studio.md`               | Chaptered overlays: short statements centered over a dark scene, thin corner brackets framing the viewport | The consent-style entry gate, the fixed full-viewport canvas (our page is a normal scrolling document) |

**Direction in one line:** a night-shift factory manual turned up to eleven: hard grid lines, giant condensed type, mono labels and one slow field of points that reacts to the scroll.

## Archetype blend

Chosen from `node scripts/pick-archetypes.mjs --site festival-electronica --refs experience2026-funtech-inc,crazy-studio`. The archetype sheets in `design-archetypes/` are a starting grammar, not a template: any deviation goes in RUN.md "Design decisions".

- **Primary:** brutalist-raw
- **Secondary:** typographic-poster
- **Lent traits:** `marquee-type`, `giant-numerals`; plus `ref:crazy-studio/chaptered-overlay` for the scene section.
- **Why:** signals bold, experimental, few-assets, playful, conversion-first. The second candidate was taken over the reference-led `custom` blend because both references only showed their first screen (recon gap), so they cannot own a whole layout grammar; the archetype pair covers the missing sections.
- **Twist from the requirement:** the page is built like a factory's shift board: each festival day is a numbered "turno" (shift) with a giant numeral, and the schedule reads as a production log with start times as the leading column.
- **Planned deviations:** a dark nocturnal ground and an acid accent instead of the sheet's default light paper; a single 3D scene (poster first) as a chaptered backdrop; the primary button is a hard rectangle, never a pill.

## Page map

| #   | Section                        | Height     | Purpose                                        | Layout idea                                                                                                                     |
| --- | ------------------------------ | ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Header and hero                | 100svh     | Name, dates, place, tickets action             | Typographic hero: giant condensed wordmark, mono date line, visible grid lines, header with text links and a rectangular button |
| 2   | Marquee                        | 14svh      | Energy and the three days at a glance          | Marquee-type strip of day and stage names; static under reduced motion                                                          |
| 3   | Line-up por turnos             | 140-180svh | Who plays each day                             | Three columns with giant numerals 01/02/03, hard borders, stacked artist names, fictional acts                                  |
| 4   | Escenarios                     | 100svh     | The three stages                               | Dense mono table (stage, capacity, sound, what happens) plus one credited industrial photo with parallax                        |
| 5   | La nave (3D)                   | 160svh     | The factory hall as an experience              | Scene backdrop with chaptered overlays: three short statements over a field of points that shifts with the scroll               |
| 6   | Horarios                       | 120svh     | Timetable per day                              | Three tables with aria-labels: time, act, stage; mono labels                                                                    |
| 7   | Entradas (mid-page conversion) | 80svh      | Sell tickets                                   | Three ticket types as hard-edged rows with sample prices, one external link per row and one primary                             |
| 8   | Cómo llegar                    | 90svh      | Reach the venue                                | Split of text and credited photo; practical strip: metro, tram, bus, bike, taxi, with sample distances                          |
| 9   | Normas                         | 70svh      | House rules                                    | Numbered list in two columns, plain language                                                                                    |
| 10  | Closing and footer             | 80svh      | Last call to buy, sample contact data, credits | Giant "Entradas" link, columns footer with photo credits and a sample-data note                                                 |

One conversion action (ticket purchase, external link) in the header, section 7 and section 10.

## Motion plan

| Moment                    | Trigger     | Type                       | Notes                                            |
| ------------------------- | ----------- | -------------------------- | ------------------------------------------------ |
| Section headings and rows | scroll      | reveal (`data-reveal`)     | Staggered with `data-reveal-delay`               |
| Stage photo               | scroll      | parallax (`data-parallax`) | Oversized layer in an overflow-hidden wrapper    |
| Marquee                   | load        | CSS keyframe loop          | Playful moment; static under reduced motion      |
| Scene section             | scroll      | scene scrub (`scrub`)      | The only scroll-linked effect; no pinned section |
| Artist names              | hover/focus | CSS shift and invert       | Keyboard focus gives the same state              |

Reduced motion: no pin, no scrub, no parallax, no smooth scroll, no marquee movement; all content visible in its final state. Without JavaScript the page reads top to bottom with every section visible and the scene shows its poster.

## Visual direction

- **Type:** a condensed-to-wide variable grotesque for display at giant sizes (width axis), a monospace for labels, times and body. Fonts are fixed by the design system step.
- **Palette:** near-black blue-black ground, off-white ink, one acid lime accent for the action and highlights; no red, teal or blue primaries (taken by other sites).
- **Hero type:** typographic.
- **Imagery:** few photos (3 to 4) from Commons: industrial interiors and Bilbao transport or riverside, treated in grayscale with CSS; each recorded in `assets.json` and `CREDITS.md`. Representative stock, never presented as the festival's own photos. No images from the references.

## 3D

One scene, built from code.

| Scene   | Purpose                                                                | Poster                                                   | Scroll behavior                                                    | Reduced-motion fallback                                                 |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `field` | A grid of points over the factory floor that ripples like a sound wave | Rendered from the scene with `scripts/render-poster.mjs` | `scrub`: wave amplitude and camera drift follow the section scroll | The poster (no canvas without JS, without WebGL or with reduced motion) |

## Quality targets

Lighthouse >= 90 (performance, accessibility, SEO), no overflow at 375/768/1440, reduced motion respected, content visible without JS, no major impeccable findings.

## Out of scope

Online shop, cart, payments, backend forms, CMS, multiple languages. Tickets are an external link.

## Decisions

1. Assumed: the festival name TALLER 303, artist names, stage names, dates, prices, capacities, address and contact data are fictional placeholders (confirm at the checkpoint).
2. The page uses stock photos and sample data to replace before launch.
3. Assumed: the ticket link points to a placeholder external URL (`https://example.com/entradas`) to replace with the real ticketing site.
4. Assumed: no real artists are named; the line-up is invented.
5. The copy makes no health, substance or safety promises; the rules section stays practical (ID, bag, hearing protection advice, re-entry).
